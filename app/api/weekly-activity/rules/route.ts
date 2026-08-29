import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { validateRuleInput } from '@/lib/weeklyActivity/validation';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        // Sort by priority ASC, then created_at ASC for deterministic ordering
        const rules = await prismaBot.weeklyActivityRule.findMany({
            where: { guild_id: GUILD_ID },
            orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
        });
        const enriched = await Promise.all(
            rules.map(async (rule) => {
                const [holderCount, failureCount] = await Promise.all([
                    prismaBot.weeklyActivityRoleHolder.count({
                        where: { guild_id: GUILD_ID, rule_id: rule.id },
                    }),
                    prismaBot.weeklyActivityResult.count({
                        where: { guild_id: GUILD_ID, rule_id: rule.id, role_state: 'failed' },
                    }),
                ]);
                return { ...rule, holder_count: holderCount, failure_count: failureCount };
            })
        );
        return NextResponse.json({ rules: enriched });
    } catch (error) {
        console.error('[WeeklyActivity] GET /rules error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const body = await request.json();
        const input = {
            name: body.name,
            scope: body.scope,
            category_id: body.category_id ?? null,
            activity_type: body.activity_type,
            winner_count: Number(body.winner_count),
            reward_role_id: body.reward_role_id,
            enabled: body.enabled ?? true,
            priority: Number(body.priority ?? 0),
        };
        const validation = await validateRuleInput(GUILD_ID, input);
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
        }
        // Determine next priority if not specified
        const priority = Number.isInteger(input.priority) ? input.priority : 0;

        const rule = await prismaBot.weeklyActivityRule.create({
            data: {
                guild_id: GUILD_ID,
                name: String(input.name).trim(),
                scope: input.scope,
                category_id: input.scope === 'category' ? input.category_id : null,
                activity_type: input.activity_type,
                winner_count: input.winner_count,
                reward_role_id: input.reward_role_id,
                enabled: Boolean(input.enabled),
                priority,
                created_by: session.user.id,
            },
        });
        await prismaBot.weeklyActivityAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                rule_id: rule.id,
                user_id: session.user.id,
                action: 'rule_created',
                reason: `Rule "${rule.name}" created`,
                meta: {
                    scope: rule.scope,
                    category_id: rule.category_id,
                    activity_type: rule.activity_type,
                    winner_count: rule.winner_count,
                    reward_role_id: rule.reward_role_id,
                    priority: rule.priority,
                },
            },
        });
        return NextResponse.json({ success: true, rule });
    } catch (error) {
        console.error('[WeeklyActivity] POST /rules error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
