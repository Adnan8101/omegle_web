import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { GUILD_ID } from '@/lib/constants';

// GET — stats overview for voice automation
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const perms = session.user.permissions;
        if (!perms?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const [totalRules, enabledRules, totalGrants, recentActions] = await Promise.all([
            prismaBot.voiceAutomationRule.count({ where: { guild_id: GUILD_ID } }),
            prismaBot.voiceAutomationRule.count({ where: { guild_id: GUILD_ID, enabled: true } }),
            prismaBot.voiceAutomationGranted.count({ where: { guild_id: GUILD_ID } }),
            prismaBot.voiceAutomationAuditLog.findMany({
                where: { guild_id: GUILD_ID },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
        ]);

        // Per-rule grant counts
        const rules = await prismaBot.voiceAutomationRule.findMany({
            where: { guild_id: GUILD_ID },
            select: { id: true, name: true, reward_role_id: true, enabled: true, rolling_days: true, required_hours: true },
        });

        const ruleStats = await Promise.all(
            rules.map(async (rule) => {
                const count = await prismaBot.voiceAutomationGranted.count({
                    where: { guild_id: GUILD_ID, rule_id: rule.id },
                });
                return { ...rule, grant_count: count };
            })
        );

        return NextResponse.json({
            totalRules,
            enabledRules,
            totalGrants,
            ruleStats,
            recentActions,
        });
    } catch (error) {
        console.error('[VCAutomation] GET /stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
