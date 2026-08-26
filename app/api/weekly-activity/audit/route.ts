import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, Number(searchParams.get('page') || 1));
        const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
        const ruleId = searchParams.get('ruleId');
        const where = { guild_id: GUILD_ID, ...(ruleId ? { rule_id: ruleId } : {}) };
        const [entries, total] = await Promise.all([
            prismaBot.weeklyActivityAuditLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { rule: { select: { name: true, reward_role_id: true } } },
            }),
            prismaBot.weeklyActivityAuditLog.count({ where }),
        ]);
        return NextResponse.json({ entries, total, page, pageSize });
    } catch (error) {
        console.error('[WeeklyActivity] GET /audit error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
