import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb } from '@/lib/botDb';

const GUILD_ID = "910043773130661918";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchUserId = searchParams.get('userId');

    // Get economy config
    const configResult = await queryBotDb(`
      SELECT * FROM economy_config WHERE guild_id = $1
    `, [GUILD_ID]);
    const config = configResult[0] || null;

    const today = new Date().toISOString().split('T')[0];

    // If searching for specific user
    if (searchUserId) {
      return await getUserHistory(searchUserId, config, today);
    }

    // Get active VC sessions with user details
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
        duc.avatar_url
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
        SELECT user_id, category_id, accumulated_seconds
        FROM economy_vc_progress
        WHERE guild_id = $1 AND user_id = ANY($2)
      `, [GUILD_ID, activeUserIds]);
    }

    // Get category rewards for advanced mode
    let categoryRewards: any[] = [];
    if (config?.advanced_mode) {
      categoryRewards = await queryBotDb(`
        SELECT category_id, category_name, vc_enabled, vc_minutes_per_point, 
               vc_ozy_amount, vc_min_members
        FROM economy_category_rewards
        WHERE guild_id = $1
      `, [GUILD_ID]);
    }

    // Get blacklisted channels
    const blacklistedChannels = await queryBotDb(`
      SELECT channel_id FROM economy_blacklist_channels
      WHERE guild_id = $1 AND channel_type = 'voice'
    `, [GUILD_ID]);
    const blacklistedChannelIds = new Set(blacklistedChannels.map((c: any) => c.channel_id));

    // Get recent VC awards (last 24 hours)
    const recentVcAwards = await queryBotDb(`
      SELECT epl.user_id, epl.amount, epl.created_at, epl.reason, duc.username, duc.display_name, duc.avatar_url
      FROM economy_point_logs epl
      LEFT JOIN discord_user_cache duc ON duc.user_id = epl.user_id
      WHERE epl.guild_id = $1 AND epl.source = 'vc' 
        AND epl.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY epl.created_at DESC
      LIMIT 50
    `, [GUILD_ID]);

    // Get recent message awards (last 24 hours)
    const recentMsgAwards = await queryBotDb(`
      SELECT epl.user_id, epl.amount, epl.created_at, epl.reason, duc.username, duc.display_name, duc.avatar_url
      FROM economy_point_logs epl
      LEFT JOIN discord_user_cache duc ON duc.user_id = epl.user_id
      WHERE epl.guild_id = $1 AND epl.source = 'message'
        AND epl.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY epl.created_at DESC
      LIMIT 50
    `, [GUILD_ID]);

    // Get message progress for users actively earning
    const activeMsgProgress = await queryBotDb(`
      SELECT emp.user_id, emp.accumulated_msgs,
             duc.username, duc.display_name, duc.avatar_url
      FROM economy_message_progress emp
      LEFT JOIN discord_user_cache duc ON duc.user_id = emp.user_id
      WHERE emp.guild_id = $1 AND emp.accumulated_msgs > 0
      ORDER BY emp.accumulated_msgs DESC
      LIMIT 100
    `, [GUILD_ID]);

    // Get all users with staged VC time (accumulated but not yet rewarded)
    // Exclude users currently in VC since their credits are already consumed
    const stagedVcProgress = await queryBotDb(`
      SELECT evp.user_id, evp.category_id, evp.accumulated_seconds,
             duc.username, duc.display_name, duc.avatar_url,
             ecr.category_name
      FROM economy_vc_progress evp
      LEFT JOIN discord_user_cache duc ON duc.user_id = evp.user_id
      LEFT JOIN economy_category_rewards ecr ON ecr.guild_id = evp.guild_id AND ecr.category_id = evp.category_id
      WHERE evp.guild_id = $1 
        AND evp.accumulated_seconds > 0
        AND evp.user_id != ALL($2)
      ORDER BY evp.accumulated_seconds DESC
      LIMIT 100
    `, [GUILD_ID, activeUserIds.length > 0 ? activeUserIds : ['__none__']]);

    // Get today's stats
    const todayStats = await queryBotDb(`
      SELECT 
        COUNT(DISTINCT CASE WHEN source = 'vc' THEN user_id END) as vc_users,
        COUNT(DISTINCT CASE WHEN source = 'message' THEN user_id END) as msg_users,
        COALESCE(SUM(CASE WHEN source = 'vc' THEN amount ELSE 0 END), 0) as vc_earned,
        COALESCE(SUM(CASE WHEN source = 'message' THEN amount ELSE 0 END), 0) as msg_earned,
        COUNT(*) as total_transactions
      FROM economy_point_logs
      WHERE guild_id = $1 AND created_at >= $2::date AND amount > 0
    `, [GUILD_ID, today]);

    // Format VC users with detailed earning info
    const vcUsers = activeVcSessions.map((session: any) => {
      const categoryId = session.category_id || 'global';
      const userProg = vcProgress.find((p: any) => 
        p.user_id === session.user_id && p.category_id === categoryId
      );
      
      const catReward = categoryRewards.find((c: any) => c.category_id === categoryId);
      const isBlacklisted = blacklistedChannelIds.has(session.channel_id);
      
      // Get settings based on mode
      const isAdvanced = config?.advanced_mode && catReward;
      const minutesPerPoint = isAdvanced ? catReward.vc_minutes_per_point : (config?.minutes_per_point || 5);
      const ozyAmount = isAdvanced ? (catReward.vc_ozy_amount || 1) : (config?.vc_ozy_amount || 1);
      const vcEnabled = isAdvanced ? catReward.vc_enabled : true;

      const sessionDuration = Math.floor((Date.now() - new Date(session.joined_at).getTime()) / 1000);
      const thresholdSeconds = minutesPerPoint * 60;
      
      // The DB accumulated_seconds is the current cycle progress
      // Bot updates it every 10s: adds elapsed time, awards complete cycles, saves remainder
      const cycleProgress = userProg?.accumulated_seconds || 0;
      const progressPercent = Math.round((cycleProgress / thresholdSeconds) * 100);
      
      return {
        id: session.user_id,
        name: session.display_name || session.username || session.user_id,
        avatar: session.avatar_url,
        channel: session.channel_name || 'Unknown',
        category: session.category_name,
        joinedAt: session.joined_at,
        duration: sessionDuration,
        muted: session.was_muted,
        deafened: session.was_deafened,
        // Earning details
        isEarning: !isBlacklisted && vcEnabled && (config?.enabled ?? false),
        isBlacklisted,
        totalProgress: cycleProgress, // Current cycle progress from DB
        progress: progressPercent,
        threshold: thresholdSeconds,
        nextIn: thresholdSeconds - cycleProgress,
        rate: `${minutesPerPoint}m = ${ozyAmount}`,
        ozyAmount,
        mode: isAdvanced ? 'category' : 'global'
      };
    });

    // Format message activity
    const msgActivity = activeMsgProgress.map((p: any) => ({
      id: p.user_id,
      name: p.display_name || p.username || p.user_id,
      avatar: p.avatar_url,
      staged: p.accumulated_msgs,
      threshold: config?.messages_per_point || 25,
      progress: Math.round((p.accumulated_msgs / (config?.messages_per_point || 25)) * 100)
    }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      economy: {
        enabled: config?.enabled ?? false,
        advancedMode: config?.advanced_mode ?? false,
        currency: config?.currency_name || 'Ozy',
        emoji: config?.currency_emoji || '🪙'
      },
      vc: {
        config: {
          minutesPerPoint: config?.minutes_per_point || 5,
          ozyAmount: config?.vc_ozy_amount || 1,
          minMembers: config?.require_two_members || 2
        },
        active: vcUsers,
        recentAwards: recentVcAwards.map((a: any) => ({
          id: a.user_id,
          name: a.display_name || a.username || a.user_id,
          avatar: a.avatar_url,
          amount: a.amount,
          reason: a.reason,
          time: a.created_at
        })),
        staged: stagedVcProgress.map((p: any) => ({
          id: p.user_id,
          name: p.display_name || p.username || p.user_id,
          avatar: p.avatar_url,
          seconds: p.accumulated_seconds,
          category: p.category_id,
          categoryName: p.category_name || (p.category_id === 'global' ? 'Global' : p.category_id)
        }))
      },
      messages: {
        config: {
          perPoint: config?.messages_per_point || 25,
          ozyAmount: config?.msg_ozy_amount || 1,
          cooldown: config?.message_cooldown || 5
        },
        active: msgActivity,
        recentAwards: recentMsgAwards.map((a: any) => ({
          id: a.user_id,
          name: a.display_name || a.username || a.user_id,
          avatar: a.avatar_url,
          amount: a.amount,
          reason: a.reason,
          time: a.created_at
        }))
      },
      categories: categoryRewards.map((c: any) => ({
        id: c.category_id,
        name: c.category_name,
        vcEnabled: c.vc_enabled,
        rate: `${c.vc_minutes_per_point}m = ${c.vc_ozy_amount || 1}`
      })),
      stats: {
        vcUsers: Number(todayStats[0]?.vc_users || 0),
        msgUsers: Number(todayStats[0]?.msg_users || 0),
        vcEarned: Number(todayStats[0]?.vc_earned || 0),
        msgEarned: Number(todayStats[0]?.msg_earned || 0),
        transactions: Number(todayStats[0]?.total_transactions || 0)
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

// Get user history
async function getUserHistory(userId: string, config: any, today: string) {
  // Get user info
  const userInfo = await queryBotDb(`
    SELECT user_id, username, display_name, avatar_url, in_guild
    FROM discord_user_cache WHERE user_id = $1
  `, [userId]);

  // Get user economy data
  const economyUser = await queryBotDb(`
    SELECT total_points, total_vc_minutes, total_messages
    FROM economy_users WHERE guild_id = $1 AND user_id = $2
  `, [GUILD_ID, userId]);

  // Get VC progress
  const vcProgress = await queryBotDb(`
    SELECT category_id, accumulated_seconds
    FROM economy_vc_progress WHERE guild_id = $1 AND user_id = $2
  `, [GUILD_ID, userId]);

  // Get message progress
  const msgProgress = await queryBotDb(`
    SELECT accumulated_msgs
    FROM economy_message_progress WHERE guild_id = $1 AND user_id = $2
  `, [GUILD_ID, userId]);

  // Get recent earnings history
  const recentHistory = await queryBotDb(`
    SELECT amount, reason, source, created_at
    FROM economy_point_logs
    WHERE guild_id = $1 AND user_id = $2
    ORDER BY created_at DESC
    LIMIT 100
  `, [GUILD_ID, userId]);

  // Check if user is currently in VC
  const activeVc = await queryBotDb(`
    SELECT vt.channel_id, vt.joined_at, dcc.name as channel_name
    FROM voice_tracking vt
    LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vt.channel_id
    WHERE vt.guild_id = $1 AND vt.user_id = $2 AND vt.left_at IS NULL
  `, [GUILD_ID, userId]);

  const user = userInfo[0];
  const economy = economyUser[0];
  const vc = vcProgress[0];
  const msg = msgProgress[0];

  return NextResponse.json({
    user: {
      id: userId,
      name: user?.display_name || user?.username || userId,
      avatar: user?.avatar_url,
      inGuild: user?.in_guild ?? false
    },
    balance: economy?.total_points || 0,
    totalVcMinutes: economy?.total_vc_minutes || 0,
    totalMessages: economy?.total_messages || 0,
    vc: {
      inVc: activeVc.length > 0,
      channel: activeVc[0]?.channel_name,
      joinedAt: activeVc[0]?.joined_at,
      staged: vc?.accumulated_seconds || 0
    },
    messages: {
      staged: msg?.accumulated_msgs || 0
    },
    history: recentHistory.map((h: any) => ({
      amount: h.amount,
      reason: h.reason,
      source: h.source,
      time: h.created_at
    })),
    config: {
      currency: config?.currency_name || 'Ozy',
      emoji: config?.currency_emoji || '🪙'
    }
  });
}
