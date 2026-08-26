import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { getDiscordUser } from '@/lib/discord';
import { prismaBot } from '@/lib/prismaBot';
import { calculateLeaderboard } from '@/lib/weeklyActivity/aggregation';
import { weeklyCycleConfig } from '@/lib/weeklyActivity/config';
import { getCycleBounds, getPreviousCycleBounds } from '@/lib/weeklyActivity/weeklyCycle';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const MAX_ENTRIES = 100;

async function decorate(userIds: string[]) {
    const unique = Array.from(new Set(userIds)).slice(0, MAX_ENTRIES);
    const cached = await prismaBot.discordUserCache.findMany({
        where: { user_id: { in: unique } },
        select: { user_id: true, username: true, display_name: true, avatar_url: true },
    });
    const map = new Map(cached.map((row) => [row.user_id, row]));
    const missing = unique.filter((userId) => !map.has(userId));
    await Promise.all(
        missing.slice(0, 25).map(async (userId) => {
            const member = await getDiscordUser(userId);
            if (!member?.user) return;
            map.set(userId, {
                user_id: userId,
                username: member.user.username,
                display_name: member.nick || member.user.global_name || member.user.username,
                avatar_url: member.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${userId}/${member.user.avatar}.png`
                    : null,
            });
        })
    );
    return map;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const { ruleId } = await params;
        const rule = await prismaBot.weeklyActivityRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        const config = weeklyCycleConfig();
        const now = new Date();
        const current = getCycleBounds(now, config);
        const previous = getPreviousCycleBounds(current.start, config);

        const [currentCycle, previousCycle, holders] = await Promise.all([
            prismaBot.weeklyActivityCycle.findUnique({
                where: { guild_id_start_at: { guild_id: GUILD_ID, start_at: current.start } },
            }),
            prismaBot.weeklyActivityCycle.findUnique({
                where: { guild_id_start_at: { guild_id: GUILD_ID, start_at: previous.start } },
            }),
            prismaBot.weeklyActivityRoleHolder.findMany({
                where: { guild_id: GUILD_ID, rule_id: rule.id },
                orderBy: { granted_at: 'asc' },
            }),
        ]);

        const projected = await calculateLeaderboard(rule, current.start, current.end);
        const previousResults = previousCycle
            ? await prismaBot.weeklyActivityResult.findMany({
                where: { cycle_id: previousCycle.id, rule_id: rule.id, rank: { gt: 0 } },
                orderBy: { rank: 'asc' },
                take: MAX_ENTRIES,
            })
            : [];

        const userMap = await decorate([
            ...projected.entries.slice(0, MAX_ENTRIES).map((entry) => entry.userId),
            ...previousResults.map((result) => result.user_id),
            ...holders.map((holder) => holder.user_id),
        ]);

        const describe = (userId: string) => {
            const info = userMap.get(userId);
            return {
                userId,
                username: info?.username || null,
                displayName: info?.display_name || info?.username || null,
                avatarUrl: info?.avatar_url || null,
            };
        };

        return NextResponse.json({
            rule,
            cycle: {
                start: current.start.toISOString(),
                end: current.end.toISOString(),
                status: currentCycle?.status || 'pending',
                msRemaining: Math.max(0, current.end.getTime() - now.getTime()),
                timeZone: config.timeZone,
                weekStartDay: config.weekStartDay,
                weekStartHour: config.weekStartHour,
            },
            previousCycle: previousCycle
                ? {
                    start: previousCycle.start_at.toISOString(),
                    end: previousCycle.end_at.toISOString(),
                    status: previousCycle.status,
                    finalizedAt: previousCycle.finalized_at?.toISOString() || null,
                }
                : null,
            projected: projected.entries.slice(0, MAX_ENTRIES).map((entry) => ({
                ...describe(entry.userId),
                rank: entry.rank,
                activityValue: entry.activityValue,
                activityType: entry.activityType,
                chatMessages: entry.chatMessages,
                voiceSeconds: entry.voiceSeconds,
                qualifies: entry.qualifies,
            })),
            previousWinners: previousResults.map((result) => ({
                ...describe(result.user_id),
                rank: result.rank,
                activityValue: result.activity_value,
                chatMessages: result.chat_messages,
                voiceSeconds: result.voice_seconds,
                isWinner: result.is_winner,
                roleState: result.role_state,
                roleError: result.role_error,
            })),
            roleHolders: holders.map((holder) => ({
                ...describe(holder.user_id),
                grantedAt: holder.granted_at.toISOString(),
            })),
        });
    } catch (error) {
        console.error('[WeeklyActivity] GET /rules/[ruleId]/leaderboard error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
