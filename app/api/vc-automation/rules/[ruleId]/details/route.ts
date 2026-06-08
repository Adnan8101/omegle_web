import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { GUILD_ID } from '@/lib/constants';

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

        
        const allUsers = await prismaBot.discordUserCache.findMany({
            select: { user_id: true, username: true, display_name: true, avatar_url: true, roles: true },
        });
        
        const roleHolders = allUsers
            .filter(u => {
                try {
                    const roles = JSON.parse(u.roles || '[]');
                    return roles.includes(rule.reward_role_id);
                } catch {
                    return false;
                }
            })
            .map(u => ({
                user_id: u.user_id,
                username: u.username,
                display_name: u.display_name,
                avatar_url: u.avatar_url,
            }));

        const roleHolderIds = new Set(roleHolders.map(u => u.user_id));

        
        let eligibleChannelIds: string[] = [];
        if (rule.target_type === 'category') {
            const channels = await prismaBot.discordChannelCache.findMany({
                where: { guild_id: GUILD_ID, parent_id: rule.target_id, is_deleted: false, type: { in: [2, 13] } },
            });
            eligibleChannelIds = channels.map(c => c.channel_id);
        } else {
            eligibleChannelIds = [rule.target_id];
        }
        eligibleChannelIds = eligibleChannelIds.filter(id => !rule.excluded_channel_ids.includes(id));

        
        const cutoffDate = new Date(Date.now() - rule.rolling_days * 24 * 60 * 60 * 1000);
        
        const voiceTracks = await prismaBot.voiceTracking.findMany({
            where: {
                guild_id: GUILD_ID,
                channel_id: { in: eligibleChannelIds },
                joined_at: { gte: cutoffDate },
            },
            select: {
                user_id: true,
                channel_id: true,
                time_speaking: true,
                time_listening: true,
                time_muted: true,
                time_deafened: true,
            }
        });

        
        const userStats = new Map<string, { total_time: number, channel_times: Map<string, number> }>();
        
        for (const track of voiceTracks) {
            
            if (roleHolderIds.has(track.user_id)) continue;

            const time = track.time_speaking + track.time_listening + track.time_muted + (rule.count_deafened ? track.time_deafened : 0);
            if (time <= 0) continue;

            if (!userStats.has(track.user_id)) {
                userStats.set(track.user_id, { total_time: 0, channel_times: new Map() });
            }
            
            const stats = userStats.get(track.user_id)!;
            stats.total_time += time;
            
            const currentChannelTime = stats.channel_times.get(track.channel_id) || 0;
            stats.channel_times.set(track.channel_id, currentChannelTime + time);
        }

        
        const channelCache = await prismaBot.discordChannelCache.findMany({
            where: { channel_id: { in: eligibleChannelIds } },
            select: { channel_id: true, name: true }
        });
        const channelMap = new Map(channelCache.map(c => [c.channel_id, c.name]));

        
        const grindingUserIds = Array.from(userStats.keys());
        const grindingUsersCache = allUsers.filter(u => grindingUserIds.includes(u.user_id));
        const grindingUserMap = new Map(grindingUsersCache.map(u => [u.user_id, u]));

        const grindingUsers = Array.from(userStats.entries()).map(([user_id, stats]) => {
            
            let topChannelId = '';
            let maxTime = -1;
            for (const [chId, time] of stats.channel_times.entries()) {
                if (time > maxTime) {
                    maxTime = time;
                    topChannelId = chId;
                }
            }

            const userInfo = grindingUserMap.get(user_id);

            return {
                user_id,
                username: userInfo?.username || 'Unknown User',
                display_name: userInfo?.display_name || 'Unknown User',
                avatar_url: userInfo?.avatar_url || null,
                total_time_seconds: stats.total_time,
                progress_percentage: Math.min(100, (stats.total_time / (rule.required_hours * 3600)) * 100),
                top_channel_name: channelMap.get(topChannelId) || 'Unknown Channel'
            };
        });

        
        grindingUsers.sort((a, b) => b.total_time_seconds - a.total_time_seconds);

        return NextResponse.json({
            rule,
            roleHolders,
            grindingUsers
        });
    } catch (error) {
        console.error('[VCAutomation] GET /rules/[ruleId]/details error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
