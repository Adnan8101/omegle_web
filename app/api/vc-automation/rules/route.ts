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

        const rules = await prismaBot.voiceAutomationRule.findMany({
            where: { guild_id: GUILD_ID },
            orderBy: { created_at: 'asc' },
        });

        
        const enriched = await Promise.all(
            rules.map(async (rule) => {
                const grantCount = await prismaBot.voiceAutomationGranted.count({
                    where: { guild_id: GUILD_ID, rule_id: rule.id },
                });
                return { ...rule, grant_count: grantCount };
            })
        );

        return NextResponse.json({ rules: enriched });
    } catch (error) {
        console.error('[VCAutomation] GET /rules error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const perms = session.user.permissions;
        if (!perms?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            target_type,
            target_id,
            excluded_channel_ids = [],
            rolling_days,
            required_hours,
            reward_role_id,
            count_deafened = false,
        } = body;

        
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Rule name is required' }, { status: 400 });
        }
        if (!['category', 'channel'].includes(target_type)) {
            return NextResponse.json({ error: 'target_type must be "category" or "channel"' }, { status: 400 });
        }
        if (!target_id) {
            return NextResponse.json({ error: 'target_id is required' }, { status: 400 });
        }
        if (!rolling_days || rolling_days < 1) {
            return NextResponse.json({ error: 'rolling_days must be at least 1' }, { status: 400 });
        }
        if (!required_hours || required_hours <= 0) {
            return NextResponse.json({ error: 'required_hours must be greater than 0' }, { status: 400 });
        }
        if (!reward_role_id) {
            return NextResponse.json({ error: 'reward_role_id is required' }, { status: 400 });
        }

        
        const roleConflict = await prismaBot.voiceAutomationRule.findUnique({
            where: { guild_id_reward_role_id: { guild_id: GUILD_ID, reward_role_id } },
        });
        if (roleConflict) {
            return NextResponse.json({
                error: `This role is already used by rule "${roleConflict.name}". Each role can only belong to one automation rule.`,
                conflictRuleId: roleConflict.id,
                conflictRuleName: roleConflict.name,
            }, { status: 409 });
        }

        
        if (target_type === 'channel') {
            const channelInfo = await prismaBot.discordChannelCache.findUnique({
                where: { channel_id: target_id },
            });
            if (channelInfo?.parent_id) {
                const categoryRule = await prismaBot.voiceAutomationRule.findFirst({
                    where: {
                        guild_id: GUILD_ID,
                        target_type: 'category',
                        target_id: channelInfo.parent_id,
                    },
                });
                if (categoryRule && !categoryRule.excluded_channel_ids.includes(target_id)) {
                    return NextResponse.json({
                        error: `This voice channel is already covered by Category Rule "${categoryRule.name}". Remove it from the category rule or add it to the exclusions before creating an individual rule.`,
                        conflictRuleId: categoryRule.id,
                        conflictRuleName: categoryRule.name,
                    }, { status: 409 });
                }
            }
        }

        
        if (target_type === 'category') {
            const channelsInCategory = await prismaBot.discordChannelCache.findMany({
                where: {
                    guild_id: GUILD_ID,
                    parent_id: target_id,
                    is_deleted: false,
                },
            });
            for (const ch of channelsInCategory) {
                if (excluded_channel_ids.includes(ch.channel_id)) continue;
                const channelRule = await prismaBot.voiceAutomationRule.findFirst({
                    where: {
                        guild_id: GUILD_ID,
                        target_type: 'channel',
                        target_id: ch.channel_id,
                    },
                });
                if (channelRule) {
                    return NextResponse.json({
                        error: `The voice channel "${ch.name}" already has an individual automation rule "${channelRule.name}". Remove that individual rule or add the channel to exclusions before adding the category.`,
                        conflictRuleId: channelRule.id,
                        conflictRuleName: channelRule.name,
                        conflictChannelId: ch.channel_id,
                        conflictChannelName: ch.name,
                    }, { status: 409 });
                }
            }
        }

        const rule = await prismaBot.voiceAutomationRule.create({
            data: {
                guild_id: GUILD_ID,
                name: name.trim(),
                target_type,
                target_id,
                excluded_channel_ids,
                rolling_days: Number(rolling_days),
                required_hours: Number(required_hours),
                reward_role_id,
                count_deafened: Boolean(count_deafened),
                created_by: session.user.id,
            },
        });

        
        await prismaBot.voiceAutomationAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                rule_id: rule.id,
                user_id: session.user.id,
                action: 'rule_created',
                reason: `Rule "${rule.name}" created`,
                meta: { rule_name: rule.name, target_type, target_id, reward_role_id },
            },
        });

        return NextResponse.json({ success: true, rule });
    } catch (error) {
        console.error('[VCAutomation] POST /rules error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
