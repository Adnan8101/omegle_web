import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { GUILD_ID } from '@/lib/constants';
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
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') || '20')));
        const ruleId = searchParams.get('ruleId') || undefined;
        const userId = searchParams.get('userId') || undefined;
        const action = searchParams.get('action') || undefined;
        const startDate = searchParams.get('startDate') || undefined;
        const endDate = searchParams.get('endDate') || undefined;
        const where: any = { guild_id: GUILD_ID };
        if (ruleId) where.rule_id = ruleId;
        if (userId) where.user_id = userId;
        if (action) where.action = action;
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at.gte = new Date(startDate);
            if (endDate) where.created_at.lte = new Date(endDate);
        }
        const [total, entries] = await Promise.all([
            prismaBot.voiceAutomationAuditLog.count({ where }),
            prismaBot.voiceAutomationAuditLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    rule: { select: { name: true, reward_role_id: true } },
                },
            }),
        ]);
        return NextResponse.json({
            entries,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error('[VCAutomation] GET /audit error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}