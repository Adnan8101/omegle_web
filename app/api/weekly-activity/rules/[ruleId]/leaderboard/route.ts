import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { calculateAllRulesWithExclusion, calculateLeaderboard } from '@/lib/weeklyActivity/aggregation';
import { weeklyCycleConfig } from '@/lib/weeklyActivity/config';
import { getCycleBounds, getPreviousCycleBounds } from '@/lib/weeklyActivity/weeklyCycle';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const MAX_ENTRIES = 100;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

/** Fetch a Discord member directly from the API, bypassing all in-memory caches. */
async function fetchDiscordMemberDirect(userId: string): Promise<{
    username: string;
    display_name: string;
    avatar_url: string | null;
} | null> {
    if (!BOT_TOKEN) return null;
    try {
        // Try guild member first (gets nickname + guild avatar)
        const memberRes = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: 'no-store' }
        );
        if (memberRes.ok) {
            const m = await memberRes.json();
            const user = m.user;
            const avatarHash = m.avatar || user?.avatar || null;
            return {
                username: user?.username || userId,
                display_name: m.nick || user?.global_name || user?.username || userId,
                avatar_url: avatarHash
                    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=128`
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`,
            };
        }
        // Fall back to user endpoint
        const userRes = await fetch(
            `https://discord.com/api/v10/users/${userId}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: 'no-store' }
        );
        if (userRes.ok) {
            const user = await userRes.json();
            return {
                username: user.username || userId,
                display_name: user.global_name || user.username || userId,
                avatar_url: user.avatar
                    ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.webp?size=128`
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`,
            };
        }
    } catch {
        // ignore
    }
    return null;
}

async function decorate(userIds: string[]) {
    const unique = Array.from(new Set(userIds)).slice(0, MAX_ENTRIES);
    const cached = await prismaBot.discordUserCache.findMany({
        where: { user_id: { in: unique } },
        select: { user_id: true, username: true, display_name: true, avatar_url: true },
    });
    const map = new Map(cached.map((row) => [row.user_id, row]));

    // Re-fetch users missing from DB cache OR whose avatar_url is null.
    const missing = unique.filter((userId) => !map.has(userId) || !map.get(userId)?.avatar_url);

    const fetched: Array<{ user_id: string; username: string; display_name: string; avatar_url: string | null }> = [];

    await Promise.all(
        missing.slice(0, 50).map(async (userId) => {
            const info = await fetchDiscordMemberDirect(userId);
            if (!info) return;
            const entry = { user_id: userId, ...info };
            map.set(userId, entry);
            fetched.push(entry);
        })
    );

    // Write fetched data back to DB cache so future calls are instant
    if (fetched.length > 0) {
        await Promise.allSettled(
            fetched.map((entry) =>
                prismaBot.discordUserCache.upsert({
                    where: { user_id: entry.user_id },
                    create: {
                        user_id: entry.user_id,
                        username: entry.username,
                        display_name: entry.display_name,
                        avatar_url: entry.avatar_url,
                    },
                    update: {
                        username: entry.username,
                        display_name: entry.display_name,
                        avatar_url: entry.avatar_url,
                    },
                })
            )
        );
    }

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

        // Load all enabled rules to compute cross-exclusion context
        const allRules = await prismaBot.weeklyActivityRule.findMany({
            where: { guild_id: GUILD_ID, enabled: true },
            orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
        });

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

        // Compute cross-rule aware leaderboard for this rule
        const allLeaderboards = await calculateAllRulesWithExclusion(allRules as any, current.start, current.end);
        const thisRuleResult = allLeaderboards.get(rule.id) ?? await calculateLeaderboard(rule as any, current.start, current.end);
        const crossExcludedCount = (allLeaderboards.get(rule.id) as any)?.crossExcludedCount ?? 0;

        const previousResults = previousCycle
            ? await prismaBot.weeklyActivityResult.findMany({
                where: { cycle_id: previousCycle.id, rule_id: rule.id, rank: { gt: 0 } },
                orderBy: { rank: 'asc' },
                take: MAX_ENTRIES,
            })
            : [];

        const userMap = await decorate([
            ...thisRuleResult.entries.slice(0, MAX_ENTRIES).map((entry) => entry.userId),
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
            crossExcludedCount,
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
            projected: thisRuleResult.entries.slice(0, MAX_ENTRIES).map((entry) => ({
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
