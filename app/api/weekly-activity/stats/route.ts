import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { weeklyCycleConfig } from '@/lib/weeklyActivity/config';
import { getCycleBounds } from '@/lib/weeklyActivity/weeklyCycle';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const config = weeklyCycleConfig();
        const now = new Date();
        const current = getCycleBounds(now, config);
        const cycleLength = current.end.getTime() - current.start.getTime();
        const elapsed = now.getTime() - current.start.getTime();
        const cycleProgress = Math.min(100, Math.max(0, Math.round((elapsed / cycleLength) * 100)));
        const msRemaining = Math.max(0, current.end.getTime() - now.getTime());

        const [totalRules, enabledRules, totalHolders, failedOperations, recentActions, topHolders] = await Promise.all([
            prismaBot.weeklyActivityRule.count({ where: { guild_id: GUILD_ID } }),
            prismaBot.weeklyActivityRule.count({ where: { guild_id: GUILD_ID, enabled: true } }),
            prismaBot.weeklyActivityRoleHolder.count({ where: { guild_id: GUILD_ID } }),
            prismaBot.weeklyActivityResult.count({ where: { guild_id: GUILD_ID, role_state: 'failed' } }),
            prismaBot.weeklyActivityAuditLog.findMany({
                where: { guild_id: GUILD_ID },
                orderBy: { created_at: 'desc' },
                take: 20,
                include: { rule: { select: { name: true, reward_role_id: true } } },
            }),
            // Grab recent role holders to show avatar stack
            prismaBot.weeklyActivityRoleHolder.findMany({
                where: { guild_id: GUILD_ID },
                orderBy: { granted_at: 'desc' },
                take: 10,
            }),
        ]);

        // Enrich top holders with user cache data
        const holderUserIds = topHolders.map((h) => h.user_id);
        const cachedUsers = holderUserIds.length > 0
            ? await prismaBot.discordUserCache.findMany({
                where: { user_id: { in: holderUserIds } },
                select: { user_id: true, username: true, display_name: true, avatar_url: true },
            })
            : [];
        const userMap = new Map(cachedUsers.map((u) => [u.user_id, u]));

        const topWinners = topHolders.map((h) => {
            const info = userMap.get(h.user_id);
            return {
                userId: h.user_id,
                ruleId: h.rule_id,
                grantedAt: h.granted_at.toISOString(),
                username: info?.username ?? null,
                displayName: info?.display_name ?? info?.username ?? null,
                avatarUrl: info?.avatar_url ?? null,
            };
        });

        return NextResponse.json({
            totalRules,
            enabledRules,
            totalHolders,
            failedOperations,
            recentActions,
            topWinners,
            cycleProgress,
            msRemaining,
            cycleStart: current.start.toISOString(),
            cycleEnd: current.end.toISOString(),
        });
    } catch (error) {
        console.error('[WeeklyActivity] GET /stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
