import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { validateRuleInput } from '@/lib/weeklyActivity/validation';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

async function authorize() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    if (!session.user.permissions?.hasFullAccess) {
        return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
    }
    return { session };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
    try {
        const auth = await authorize();
        if (auth.error) return auth.error;
        const { ruleId } = await params;
        const rule = await prismaBot.weeklyActivityRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        const [holders, recentAudit, failures] = await Promise.all([
            prismaBot.weeklyActivityRoleHolder.findMany({
                where: { guild_id: GUILD_ID, rule_id: rule.id },
                orderBy: { granted_at: 'asc' },
            }),
            prismaBot.weeklyActivityAuditLog.findMany({
                where: { guild_id: GUILD_ID, rule_id: rule.id },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
            prismaBot.weeklyActivityResult.findMany({
                where: { guild_id: GUILD_ID, rule_id: rule.id, role_state: 'failed' },
                orderBy: { updated_at: 'desc' },
                take: 20,
            }),
        ]);
        return NextResponse.json({ rule, holders, recentAudit, failures });
    } catch (error) {
        console.error('[WeeklyActivity] GET /rules/[ruleId] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
    try {
        const auth = await authorize();
        if (auth.error) return auth.error;
        const { ruleId } = await params;
        const existing = await prismaBot.weeklyActivityRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        const body = await request.json();
        const resolvedActivityType = body.activity_type ?? existing.activity_type;
        const needsChat = resolvedActivityType === 'chat' || resolvedActivityType === 'both';
        const needsVoice = resolvedActivityType === 'vc' || resolvedActivityType === 'both';
        const merged = {
            name: body.name ?? existing.name,
            scope: body.scope ?? existing.scope,
            category_id: body.scope === 'all_server'
                ? null
                : body.category_id !== undefined
                    ? body.category_id
                    : existing.category_id,
            activity_type: resolvedActivityType,
            winner_count: Number(body.winner_count ?? existing.winner_count),
            reward_role_id: body.reward_role_id ?? existing.reward_role_id,
            enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing.enabled,
            priority: body.priority !== undefined ? Number(body.priority) : existing.priority,
            // Threshold fields — reset to 0 for activity types that don't use them
            min_chat_messages: needsChat
                ? Math.max(0, Math.trunc(Number(body.min_chat_messages ?? existing.min_chat_messages ?? 0)))
                : 0,
            min_voice_seconds: needsVoice
                ? Math.max(0, Math.trunc(Number(body.min_voice_seconds ?? existing.min_voice_seconds ?? 0)))
                : 0,
        };
        const validation = await validateRuleInput(GUILD_ID, merged);
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
        }
        const rule = await prismaBot.weeklyActivityRule.update({
            where: { id: ruleId },
            data: {
                name: String(merged.name).trim(),
                scope: merged.scope,
                category_id: merged.scope === 'category' ? merged.category_id : null,
                activity_type: merged.activity_type,
                winner_count: merged.winner_count,
                reward_role_id: merged.reward_role_id,
                enabled: merged.enabled,
                priority: merged.priority,
                min_chat_messages: merged.min_chat_messages,
                min_voice_seconds: merged.min_voice_seconds,
            },
        });
        const enabledChanged = existing.enabled !== rule.enabled;
        await prismaBot.weeklyActivityAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                rule_id: rule.id,
                user_id: auth.session!.user.id,
                action: enabledChanged ? (rule.enabled ? 'rule_enabled' : 'rule_disabled') : 'rule_updated',
                reason: `Rule "${rule.name}" updated`,
                meta: {
                    scope: rule.scope,
                    category_id: rule.category_id,
                    activity_type: rule.activity_type,
                    winner_count: rule.winner_count,
                    reward_role_id: rule.reward_role_id,
                    enabled: rule.enabled,
                    priority: rule.priority,
                },
            },
        });
        return NextResponse.json({ success: true, rule });
    } catch (error) {
        console.error('[WeeklyActivity] PATCH /rules/[ruleId] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
    try {
        const auth = await authorize();
        if (auth.error) return auth.error;
        const { ruleId } = await params;
        const existing = await prismaBot.weeklyActivityRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        await prismaBot.weeklyActivityRule.delete({ where: { id: ruleId } });
        await prismaBot.weeklyActivityAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                user_id: auth.session!.user.id,
                action: 'rule_deleted',
                reason: `Rule "${existing.name}" deleted`,
                meta: {
                    rule_id: existing.id,
                    rule_name: existing.name,
                    reward_role_id: existing.reward_role_id,
                },
            },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[WeeklyActivity] DELETE /rules/[ruleId] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
