import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
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
        const [totalRules, enabledRules, totalHolders, failedOperations, recentActions] = await Promise.all([
            prismaBot.weeklyActivityRule.count({ where: { guild_id: GUILD_ID } }),
            prismaBot.weeklyActivityRule.count({ where: { guild_id: GUILD_ID, enabled: true } }),
            prismaBot.weeklyActivityRoleHolder.count({ where: { guild_id: GUILD_ID } }),
            prismaBot.weeklyActivityResult.count({ where: { guild_id: GUILD_ID, role_state: 'failed' } }),
            prismaBot.weeklyActivityAuditLog.findMany({
                where: { guild_id: GUILD_ID },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
        ]);
        return NextResponse.json({
            totalRules,
            enabledRules,
            totalHolders,
            failedOperations,
            recentActions,
        });
    } catch (error) {
        console.error('[WeeklyActivity] GET /stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
