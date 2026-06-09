import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ruleId: string }> }
) {
    try {
        const { ruleId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const perms = session.user.permissions;
        if (!perms?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const rule = await prismaBot.voiceAutomationRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        const grantCount = await prismaBot.voiceAutomationGranted.count({
            where: { guild_id: GUILD_ID, rule_id: rule.id },
        });
        const recentAudit = await prismaBot.voiceAutomationAuditLog.findMany({
            where: { guild_id: GUILD_ID, rule_id: rule.id },
            orderBy: { created_at: 'desc' },
            take: 10,
        });
        return NextResponse.json({ rule: { ...rule, grant_count: grantCount }, recentAudit });
    } catch (error) {
        console.error('[VCAutomation] GET /rules/[ruleId] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ ruleId: string }> }
) {
    try {
        const { ruleId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const perms = session.user.permissions;
        if (!perms?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const existing = await prismaBot.voiceAutomationRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        const body = await request.json();
        const {
            name,
            target_type,
            target_id,
            excluded_channel_ids,
            rolling_days,
            required_hours,
            reward_role_id,
            count_deafened,
            enabled,
        } = body;
        if (reward_role_id && reward_role_id !== existing.reward_role_id) {
            const roleConflict = await prismaBot.voiceAutomationRule.findUnique({
                where: { guild_id_reward_role_id: { guild_id: GUILD_ID, reward_role_id } },
            });
            if (roleConflict && roleConflict.id !== ruleId) {
                return NextResponse.json({
                    error: `This role is already used by rule "${roleConflict.name}".`,
                    conflictRuleId: roleConflict.id,
                    conflictRuleName: roleConflict.name,
                }, { status: 409 });
            }
        }
        const newTargetType = target_type ?? existing.target_type;
        const newTargetId = target_id ?? existing.target_id;
        if (newTargetType === 'channel' && newTargetId !== existing.target_id) {
            const channelInfo = await prismaBot.discordChannelCache.findUnique({
                where: { channel_id: newTargetId },
            });
            if (channelInfo?.parent_id) {
                const categoryRule = await prismaBot.voiceAutomationRule.findFirst({
                    where: {
                        guild_id: GUILD_ID,
                        target_type: 'category',
                        target_id: channelInfo.parent_id,
                    },
                });
                if (categoryRule && !categoryRule.excluded_channel_ids.includes(newTargetId) && categoryRule.id !== ruleId) {
                    return NextResponse.json({
                        error: `This voice channel is already covered by Category Rule "${categoryRule.name}".`,
                        conflictRuleId: categoryRule.id,
                        conflictRuleName: categoryRule.name,
                    }, { status: 409 });
                }
            }
        }
        const updated = await prismaBot.voiceAutomationRule.update({
            where: { id: ruleId },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(target_type !== undefined && { target_type }),
                ...(target_id !== undefined && { target_id }),
                ...(excluded_channel_ids !== undefined && { excluded_channel_ids }),
                ...(rolling_days !== undefined && { rolling_days: Number(rolling_days) }),
                ...(required_hours !== undefined && { required_hours: Number(required_hours) }),
                ...(reward_role_id !== undefined && { reward_role_id }),
                ...(count_deafened !== undefined && { count_deafened: Boolean(count_deafened) }),
                ...(enabled !== undefined && { enabled: Boolean(enabled) }),
            },
        });
        await prismaBot.voiceAutomationAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                rule_id: updated.id,
                user_id: session.user.id,
                action: 'rule_updated',
                reason: `Rule "${updated.name}" updated`,
                meta: { changes: body },
            },
        });
        return NextResponse.json({ success: true, rule: updated });
    } catch (error) {
        console.error('[VCAutomation] PATCH /rules/[ruleId] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ ruleId: string }> }
) {
    try {
        const { ruleId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const perms = session.user.permissions;
        if (!perms?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const existing = await prismaBot.voiceAutomationRule.findFirst({
            where: { id: ruleId, guild_id: GUILD_ID },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }
        await prismaBot.voiceAutomationAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                rule_id: existing.id,
                user_id: session.user.id,
                action: 'rule_deleted',
                reason: `Rule "${existing.name}" deleted`,
                meta: { rule_name: existing.name, reward_role_id: existing.reward_role_id },
            },
        });
        await prismaBot.voiceAutomationGranted.deleteMany({
            where: { guild_id: GUILD_ID, rule_id: ruleId },
        });
        await prismaBot.voiceAutomationAuditLog.deleteMany({
            where: { guild_id: GUILD_ID, rule_id: ruleId },
        });
        await prismaBot.voiceAutomationRule.delete({
            where: { id: ruleId },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[VCAutomation] DELETE /rules/[ruleId] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}