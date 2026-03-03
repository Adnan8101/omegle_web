import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb } from '@/lib/botDb';

const GUILD_ID = "910043773130661918";

// GET - Fetch live economy status data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - require full access only
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get economy config directly from DB to avoid Prisma type issues
    const configResult = await queryBotDb(`
      SELECT * FROM economy_config WHERE guild_id = $1
    `, [GUILD_ID]);
    
    const config = configResult[0] || null;

    // Get users currently in VC (from voice_tracking table where left_at is null)
    const activeVcSessions = await queryBotDb(`
      SELECT 
        vt.user_id,
        vt.channel_id,
        vt.joined_at,
        vt.was_muted,
        vt.was_deafened,
        dcc.name as channel_name,
        dcc.parent_id as category_id,
        dcc.parent_name as category_name,
        duc.username,
        duc.display_name,
        duc.avatar_url,
        duc.nickname
      FROM voice_tracking vt
      LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vt.channel_id
      LEFT JOIN discord_user_cache duc ON duc.user_id = vt.user_id
      WHERE vt.guild_id = $1 AND vt.left_at IS NULL
      ORDER BY vt.joined_at ASC
    `, [GUILD_ID]);

    // Get VC progress for active users
    const activeUserIds = activeVcSessions.map((s: any) => s.user_id);
    let vcProgress: any[] = [];
    if (activeUserIds.length > 0) {
      vcProgress = await queryBotDb(`
        SELECT 
          user_id,
          category_id,
          accumulated_seconds,
          today_earned,
          last_date
        FROM economy_vc_progress
        WHERE guild_id = $1 AND user_id = ANY($2)
      `, [GUILD_ID, activeUserIds]);
    }

    // Get category rewards for advanced mode
    let categoryRewards: any[] = [];
    if (config?.advanced_mode) {
      categoryRewards = await queryBotDb(`
        SELECT 
          category_id,
          category_name,
          vc_enabled,
          vc_minutes_per_point,
          vc_ozy_amount,
          vc_daily_limit,
          vc_min_members
        FROM economy_category_rewards
        WHERE guild_id = $1
      `, [GUILD_ID]);
    }

    // Get blacklisted channels and roles
    const blacklistedChannels = await queryBotDb(`
      SELECT channel_id, channel_type
      FROM economy_blacklist_channels
      WHERE guild_id = $1 AND channel_type = 'voice'
    `, [GUILD_ID]);

    const blacklistedRoles = await queryBotDb(`
      SELECT role_id
      FROM economy_blacklist_roles
      WHERE guild_id = $1
    `, [GUILD_ID]);

    // Get recent coin awards (last 50)
    const recentAwards = await queryBotDb(`
      SELECT 
        epl.user_id,
        epl.amount,
        epl.reason,
        epl.source,
        epl.created_at,
        duc.username,
        duc.display_name,
        duc.avatar_url
      FROM economy_point_logs epl
      LEFT JOIN discord_user_cache duc ON duc.user_id = epl.user_id
      WHERE epl.guild_id = $1
      ORDER BY epl.created_at DESC
      LIMIT 50
    `, [GUILD_ID]);

    // Get today's top earners
    const today = new Date().toISOString().split('T')[0];
    const todayEarners = await queryBotDb(`
      SELECT 
        epl.user_id,
        SUM(epl.amount) as total_earned,
        duc.username,
        duc.display_name,
        duc.avatar_url
      FROM economy_point_logs epl
      LEFT JOIN discord_user_cache duc ON duc.user_id = epl.user_id
      WHERE epl.guild_id = $1 
        AND epl.created_at >= $2::date 
        AND epl.amount > 0
      GROUP BY epl.user_id, duc.username, duc.display_name, duc.avatar_url
      ORDER BY total_earned DESC
      LIMIT 20
    `, [GUILD_ID, today]);

    // Get overall statistics
    const stats = await queryBotDb(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        SUM(total_points) as total_points_distributed,
        AVG(total_points) as avg_points_per_user
      FROM economy_users
      WHERE guild_id = $1
    `, [GUILD_ID]);

    // Get VC progress stats (accumulated time waiting for rewards)
    const vcProgressStats = await queryBotDb(`
      SELECT 
        COUNT(*) as users_with_progress,
        SUM(accumulated_seconds) as total_accumulated_seconds,
        SUM(today_earned) as total_earned_today
      FROM economy_vc_progress
      WHERE guild_id = $1 AND last_date = $2
    `, [GUILD_ID, today]);

    // Get message progress stats
    const msgProgressStats = await queryBotDb(`
      SELECT 
        COUNT(*) as users_with_progress,
        SUM(accumulated_msgs) as total_accumulated_msgs,
        SUM(today_earned) as total_earned_today
      FROM economy_message_progress
      WHERE guild_id = $1 AND last_date = $2
    `, [GUILD_ID, today]);

    // Format active VC users with earning status
    const activeVcUsers = activeVcSessions.map((session: any) => {
      const userProgress = vcProgress.find((p: any) => 
        p.user_id === session.user_id && 
        (p.category_id === session.category_id || p.category_id === 'global')
      );
      
      const catReward = categoryRewards.find((c: any) => c.category_id === session.category_id);
      const isBlacklisted = blacklistedChannels.some((c: any) => c.channel_id === session.channel_id);
      
      // Determine earning mode
      let earningMode = 'normal';
      let minutesPerPoint = config?.minutes_per_point || 1;
      let ozyAmount = config?.vc_ozy_amount || 1;
      let dailyLimit = config?.daily_voice_cap || 100;
      let minMembers = config?.require_two_members || 2;
      
      if (config?.advanced_mode && catReward) {
        earningMode = 'advanced';
        minutesPerPoint = catReward.vc_minutes_per_point;
        ozyAmount = catReward.vc_ozy_amount || 1;
        dailyLimit = catReward.vc_daily_limit || 100;
        minMembers = catReward.vc_min_members || 2;
      }

      const sessionDuration = Math.floor((Date.now() - new Date(session.joined_at).getTime()) / 1000);
      const accumulatedSeconds = (userProgress?.accumulated_seconds || 0) + sessionDuration;
      const todayEarned = userProgress?.today_earned || 0;
      const thresholdSeconds = minutesPerPoint * 60;
      const progressPercent = Math.min(100, (accumulatedSeconds % thresholdSeconds) / thresholdSeconds * 100);
      
      return {
        userId: session.user_id,
        username: session.display_name || session.nickname || session.username || session.user_id,
        avatarUrl: session.avatar_url,
        channelId: session.channel_id,
        channelName: session.channel_name || 'Unknown Channel',
        categoryId: session.category_id,
        categoryName: session.category_name,
        joinedAt: session.joined_at,
        sessionDuration,
        isMuted: session.was_muted,
        isDeafened: session.was_deafened,
        isBlacklisted,
        isEarning: !isBlacklisted && (catReward?.vc_enabled ?? true),
        earningMode,
        settings: {
          minutesPerPoint,
          ozyAmount,
          dailyLimit,
          minMembers
        },
        progress: {
          accumulatedSeconds,
          thresholdSeconds,
          progressPercent: Math.round(progressPercent),
          todayEarned,
          remainingDaily: Math.max(0, dailyLimit - todayEarned),
          nextRewardIn: thresholdSeconds - (accumulatedSeconds % thresholdSeconds)
        }
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      economyEnabled: config?.enabled ?? false,
      advancedMode: config?.advanced_mode ?? false,
      config: {
        currencyName: config?.currency_name || 'Ozy',
        currencyEmoji: config?.currency_emoji || '🪙',
        minutesPerPoint: config?.minutes_per_point || 1,
        vcOzyAmount: config?.vc_ozy_amount || 1,
        dailyVoiceCap: config?.daily_voice_cap || 100,
        requireTwoMembers: config?.require_two_members || 2,
        messagesPerPoint: config?.messages_per_point || 25,
        msgOzyAmount: config?.msg_ozy_amount || 1,
        dailyMessageCap: config?.daily_message_cap || 100
      },
      activeVcUsers,
      categoryRewards: categoryRewards.map((c: any) => ({
        categoryId: c.category_id,
        categoryName: c.category_name,
        vcEnabled: c.vc_enabled,
        vcMinutesPerPoint: c.vc_minutes_per_point,
        vcOzyAmount: c.vc_ozy_amount,
        vcDailyLimit: c.vc_daily_limit,
        vcMinMembers: c.vc_min_members
      })),
      blacklists: {
        channels: blacklistedChannels.map((c: any) => c.channel_id),
        roles: blacklistedRoles.map((r: any) => r.role_id)
      },
      recentAwards: recentAwards.map((a: any) => ({
        userId: a.user_id,
        username: a.display_name || a.username || a.user_id,
        avatarUrl: a.avatar_url,
        amount: a.amount,
        reason: a.reason,
        source: a.source,
        createdAt: a.created_at
      })),
      todayEarners: todayEarners.map((e: any) => ({
        userId: e.user_id,
        username: e.display_name || e.username || e.user_id,
        avatarUrl: e.avatar_url,
        totalEarned: parseInt(e.total_earned)
      })),
      stats: {
        totalUsers: parseInt(stats[0]?.total_users || '0'),
        totalPointsDistributed: parseInt(stats[0]?.total_points_distributed || '0'),
        avgPointsPerUser: parseFloat(stats[0]?.avg_points_per_user || '0').toFixed(2),
        vcProgress: {
          usersWithProgress: parseInt(vcProgressStats[0]?.users_with_progress || '0'),
          totalAccumulatedSeconds: parseInt(vcProgressStats[0]?.total_accumulated_seconds || '0'),
          totalEarnedToday: parseInt(vcProgressStats[0]?.total_earned_today || '0')
        },
        msgProgress: {
          usersWithProgress: parseInt(msgProgressStats[0]?.users_with_progress || '0'),
          totalAccumulatedMsgs: parseInt(msgProgressStats[0]?.total_accumulated_msgs || '0'),
          totalEarnedToday: parseInt(msgProgressStats[0]?.total_earned_today || '0')
        }
      }
    });
  } catch (error) {
    console.error('Error fetching live economy status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
