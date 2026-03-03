import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb } from '@/lib/botDb';

const GUILD_ID = "910043773130661918";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fetchLiveData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Get economy config
  const configResult = await queryBotDb(`
    SELECT * FROM economy_config WHERE guild_id = $1
  `, [GUILD_ID]);
  const config = configResult[0] || null;

  // Get active VC sessions
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

  const activeUserIds = activeVcSessions.map((s: any) => s.user_id);
  
  // Get member counts per channel (non-bot members only)
  const channelMemberCounts = await queryBotDb(`
    SELECT vt.channel_id, COUNT(DISTINCT vt.user_id) as member_count
    FROM voice_tracking vt
    LEFT JOIN discord_user_cache duc ON duc.user_id = vt.user_id
    WHERE vt.guild_id = $1 AND vt.left_at IS NULL AND (duc.bot IS NULL OR duc.bot = false)
    GROUP BY vt.channel_id
  `, [GUILD_ID]);
  
  const memberCountMap = new Map(channelMemberCounts.map((c: any) => [c.channel_id, Number(c.member_count)]));
  
  // Get VC progress
  let vcProgress: any[] = [];
  if (activeUserIds.length > 0) {
    vcProgress = await queryBotDb(`
      SELECT user_id, category_id, accumulated_seconds
      FROM economy_vc_progress
      WHERE guild_id = $1 AND user_id = ANY($2)
    `, [GUILD_ID, activeUserIds]);
  }

  // Get category rewards
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

  // Recent VC awards (live - last 1 hour for real-time feel)
  const recentVcAwards = await queryBotDb(`
    SELECT epl.user_id, epl.amount, epl.created_at, epl.reason, duc.username, duc.display_name, duc.avatar_url
    FROM economy_point_logs epl
    LEFT JOIN discord_user_cache duc ON duc.user_id = epl.user_id
    WHERE epl.guild_id = $1 AND epl.source = 'voice' 
      AND epl.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY epl.created_at DESC
    LIMIT 50
  `, [GUILD_ID]);

  // Recent message awards (live - last 1 hour)
  const recentMsgAwards = await queryBotDb(`
    SELECT epl.user_id, epl.amount, epl.created_at, epl.reason, duc.username, duc.display_name, duc.avatar_url
    FROM economy_point_logs epl
    LEFT JOIN discord_user_cache duc ON duc.user_id = epl.user_id
    WHERE epl.guild_id = $1 AND epl.source = 'message'
      AND epl.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY epl.created_at DESC
    LIMIT 50
  `, [GUILD_ID]);

  // Message progress
  const activeMsgProgress = await queryBotDb(`
    SELECT emp.user_id, emp.accumulated_msgs,
           duc.username, duc.display_name, duc.avatar_url
    FROM economy_message_progress emp
    LEFT JOIN discord_user_cache duc ON duc.user_id = emp.user_id
    WHERE emp.guild_id = $1 AND emp.accumulated_msgs > 0
    ORDER BY emp.accumulated_msgs DESC
    LIMIT 100
  `, [GUILD_ID]);

  // Staged VC progress (not in VC) - aggregate by user to avoid duplicates
  const stagedVcProgress = await queryBotDb(`
    SELECT evp.user_id,
           SUM(evp.accumulated_seconds) as total_seconds,
           duc.username, duc.display_name, duc.avatar_url,
           STRING_AGG(DISTINCT COALESCE(ecr.category_name, evp.category_id), ', ' ORDER BY COALESCE(ecr.category_name, evp.category_id)) as categories
    FROM economy_vc_progress evp
    LEFT JOIN discord_user_cache duc ON duc.user_id = evp.user_id
    LEFT JOIN economy_category_rewards ecr ON ecr.guild_id = evp.guild_id AND ecr.category_id = evp.category_id
    WHERE evp.guild_id = $1 
      AND evp.accumulated_seconds > 0
      AND evp.user_id != ALL($2)
    GROUP BY evp.user_id, duc.username, duc.display_name, duc.avatar_url
    ORDER BY total_seconds DESC
    LIMIT 100
  `, [GUILD_ID, activeUserIds.length > 0 ? activeUserIds : ['__none__']]);

  // Today's stats - use UTC date for consistency
  const todayStats = await queryBotDb(`
    SELECT 
      COUNT(DISTINCT CASE WHEN source = 'voice' THEN user_id END) as vc_users,
      COUNT(DISTINCT CASE WHEN source = 'message' THEN user_id END) as msg_users,
      COALESCE(SUM(CASE WHEN source = 'voice' THEN amount ELSE 0 END), 0) as vc_earned,
      COALESCE(SUM(CASE WHEN source = 'message' THEN amount ELSE 0 END), 0) as msg_earned,
      COUNT(*) as total_transactions
    FROM economy_point_logs
    WHERE guild_id = $1 AND created_at >= CURRENT_DATE AND amount > 0
  `, [GUILD_ID]);

  // Format VC users
  const vcUsers = activeVcSessions.map((session: any) => {
    const categoryId = session.category_id || 'global';
    const userProg = vcProgress.find((p: any) => 
      p.user_id === session.user_id && p.category_id === categoryId
    );
    
    const catReward = categoryRewards.find((c: any) => c.category_id === categoryId);
    const isBlacklisted = blacklistedChannelIds.has(session.channel_id);
    
    const isAdvanced = config?.advanced_mode && catReward;
    const minutesPerPoint = isAdvanced ? catReward.vc_minutes_per_point : (config?.minutes_per_point || 5);
    const ozyAmount = isAdvanced ? (catReward.vc_ozy_amount || 1) : (config?.vc_ozy_amount || 1);
    const vcEnabled = isAdvanced ? catReward.vc_enabled : true;
    const minMembers = isAdvanced ? (catReward.vc_min_members || 1) : (config?.require_two_members || 1);

    const sessionDuration = Math.floor((Date.now() - new Date(session.joined_at).getTime()) / 1000);
    const thresholdSeconds = minutesPerPoint * 60;
    
    // Check member count
    const currentMemberCount = memberCountMap.get(session.channel_id) || 1;
    const hasEnoughMembers = currentMemberCount >= minMembers;
    
    // The DB accumulated_seconds is the current cycle progress
    // Bot updates it every 10s: adds elapsed time, awards complete cycles, saves remainder
    // So we just use it directly as the cycle progress
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
      isEarning: !isBlacklisted && vcEnabled && (config?.enabled ?? false) && hasEnoughMembers,
      isBlacklisted,
      memberCount: currentMemberCount,
      minMembers: minMembers,
      trackingDisabled: !hasEnoughMembers,
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

  return {
    config,
    vc: {
      settings: {
        enabled: config?.enabled ?? false,
        advancedMode: config?.advanced_mode ?? false,
        minutesPerPoint: config?.minutes_per_point || 5,
        ozyAmount: config?.vc_ozy_amount || 1,
        minMembers: config?.require_two_members || 1
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
        seconds: p.total_seconds,
        categories: p.categories || 'Unknown'
      }))
    },
    messages: {
      settings: {
        messagesPerPoint: config?.messages_per_point || 25,
        ozyAmount: config?.msg_ozy_amount || 1,
        minLength: config?.min_message_length || 5,
        cooldown: config?.message_cooldown || 5
      },
      active: msgActivity,
      recentAwards: recentMsgAwards.map((a: any) => ({
        id: a.user_id,
        name: a.display_name || a.username || a.user_id,
        avatar: a.avatar_url,
        reason: a.reason,
        amount: a.amount,
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
    },
    currency: {
      name: config?.currency_name || 'Ozy',
      emoji: config?.currency_emoji || '🪙'
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return new Response('Forbidden', { status: 403 });
    }

    // Set up SSE headers
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendData = async () => {
          try {
            const data = await fetchLiveData();
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error('SSE error:', error);
          }
        };

        // Send initial data
        await sendData();

        // Send updates every 3 seconds
        const interval = setInterval(sendData, 3000);

        // Clean up on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in live stream:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
