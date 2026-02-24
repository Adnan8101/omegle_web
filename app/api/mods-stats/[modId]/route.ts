import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb, getUserDisplay } from '@/lib/botDb';
import { getErrorMessage, GUILD_ID } from '@/lib/constants';

interface DateFilter {
  startDate?: string | null;
  endDate?: string | null;
}

function buildDateClause(
  column: string,
  dateFilter: DateFilter,
  paramOffset: number
): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (dateFilter.startDate) {
    parts.push(`${column} >= $${paramOffset}`);
    params.push(dateFilter.startDate);
    paramOffset++;
  }
  if (dateFilter.endDate) {
    parts.push(`${column} <= $${paramOffset}`);
    params.push(dateFilter.endDate);
  }
  return {
    clause: parts.length ? ' AND ' + parts.join(' AND ') : '',
    params,
  };
}

/**
 * GET - Fetch detailed stats for a specific moderator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { modId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    // Mods stats requires full access (admin/manage server)
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modId = params.modId;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateFilter: DateFilter = { startDate, endDate };

    // Get moderator profile - try cache first, then Discord API
    let modProfile = await getUserDisplay(modId, 256);
    
    // If profile shows Unknown User, try Discord API directly
    if (modProfile.username === 'Unknown User') {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        try {
          const res = await fetch(`https://discord.com/api/v10/users/${modId}`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const discordUser = await res.json();
            let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(modId) >> 22n) % 6}.png`;
            if (discordUser.avatar) {
              const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
              avatarUrl = `https://cdn.discordapp.com/avatars/${modId}/${discordUser.avatar}.${ext}?size=256`;
            }
            modProfile = {
              id: modId,
              username: discordUser.username,
              displayName: discordUser.global_name || discordUser.username,
              avatar: avatarUrl,
              tag: discordUser.discriminator === '0' ? `@${discordUser.username}` : `${discordUser.username}#${discordUser.discriminator}`,
              inGuild: true,
            };
          }
        } catch {
          // Keep cached fallback
        }
      }
    }

    // Get moderator stats from moderation_cases with date filter
    const df = buildDateClause('created_at', dateFilter, 3);
    const modStats = await queryBotDb(`
      SELECT 
        COUNT(*) as total_cases,
        COUNT(CASE WHEN action = 'mute' THEN 1 END) as mutes,
        COUNT(CASE WHEN action = 'ban' THEN 1 END) as bans,
        COUNT(CASE WHEN action = 'kick' THEN 1 END) as kicks,
        COUNT(CASE WHEN action = 'warn' THEN 1 END) as warns,
        COUNT(CASE WHEN action = 'unban' THEN 1 END) as unbans,
        COUNT(CASE WHEN action = 'unmute' THEN 1 END) as unmutes,
        MIN(created_at) as first_action,
        MAX(created_at) as last_action
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id = $2${df.clause}
    `, [GUILD_ID, modId, ...df.params]);

    // Get all moderation cases by this mod (with target user info)
    const casesDf = buildDateClause('mc.created_at', dateFilter, 3);
    const modCases = await queryBotDb(`
      SELECT 
        mc.id,
        mc.case_number,
        mc.action,
        mc.target_id,
        mc.reason,
        mc.duration_seconds,
        mc.created_at,
        mc.active,
        duc.username as target_username,
        duc.display_name as target_display_name,
        duc.avatar_url as target_avatar_url,
        duc.nickname as target_nickname
      FROM moderation_cases mc
      LEFT JOIN discord_user_cache duc ON mc.target_id = duc.user_id
      WHERE mc.guild_id = $1 AND mc.moderator_id = $2${casesDf.clause}
      ORDER BY mc.created_at DESC
      LIMIT 200
    `, [GUILD_ID, modId, ...casesDf.params]);

    // Collect target IDs missing from cache
    const missingTargetIds = [...new Set(
      modCases
        .filter((c: any) => !c.target_username)
        .map((c: any) => c.target_id)
    )].slice(0, 30);

    // Fetch missing target users from Discord API
    const fetchedTargets: Record<string, { username: string; displayName: string; avatar: string }> = {};
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken && missingTargetIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < missingTargetIds.length; i += batchSize) {
        const batch = missingTargetIds.slice(i, i + batchSize);
        const promises = batch.map(async (targetId) => {
          try {
            const res = await fetch(`https://discord.com/api/v10/users/${targetId}`, {
              headers: { Authorization: `Bot ${botToken}` },
              cache: 'no-store',
            });
            if (res.ok) {
              const user = await res.json();
              let avatar = `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(targetId) >> 22n) % 6}.png`;
              if (user.avatar) {
                const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
                avatar = `https://cdn.discordapp.com/avatars/${targetId}/${user.avatar}.${ext}?size=64`;
              }
              fetchedTargets[targetId] = {
                username: user.username,
                displayName: user.global_name || user.username,
                avatar,
              };
            }
          } catch {
            // Ignore errors
          }
        });
        await Promise.all(promises);
      }
    }

    // Build avatar URLs for targets
    const casesWithAvatars = modCases.map((c: any) => {
      // Check if we fetched this target from Discord API
      const fetched = fetchedTargets[c.target_id];
      
      let targetAvatar = null;
      if (c.target_avatar_url) {
        const extension = c.target_avatar_url.startsWith('a_') ? 'gif' : 'png';
        targetAvatar = `https://cdn.discordapp.com/avatars/${c.target_id}/${c.target_avatar_url}.${extension}?size=64`;
      } else if (fetched) {
        targetAvatar = fetched.avatar;
      } else {
        const defaultIndex = Number(BigInt(c.target_id) >> 22n) % 6;
        targetAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }
      
      return {
        ...c,
        target_avatar: targetAvatar,
        target_display_name: c.target_nickname || c.target_display_name || c.target_username || fetched?.displayName || 'Unknown User',
        target_username: c.target_username || fetched?.username || null,
      };
    });

    // Get manual cases by this mod
    const manualsDf = buildDateClause('m.created_at', dateFilter, 3);
    const manualCases = await queryBotDb(`
      SELECT 
        m.id,
        m.manual_number,
        m.target_id,
        m.offense,
        m.action,
        m.advise,
        m.note_proof,
        m.reviewed_by,
        m.created_at,
        duc.username as target_username,
        duc.display_name as target_display_name,
        duc.avatar_url as target_avatar_url,
        duc.nickname as target_nickname
      FROM manuals m
      LEFT JOIN discord_user_cache duc ON m.target_id = duc.user_id
      WHERE m.guild_id = $1 AND m.moderator_id = $2${manualsDf.clause}
      ORDER BY m.created_at DESC
      LIMIT 100
    `, [GUILD_ID, modId, ...manualsDf.params]);

    // Build avatar URLs for manual targets (reuse fetchedTargets from above)
    const manualsWithAvatars = manualCases.map((m: any) => {
      const fetched = fetchedTargets[m.target_id];
      
      let targetAvatar = null;
      if (m.target_avatar_url) {
        const extension = m.target_avatar_url.startsWith('a_') ? 'gif' : 'png';
        targetAvatar = `https://cdn.discordapp.com/avatars/${m.target_id}/${m.target_avatar_url}.${extension}?size=64`;
      } else if (fetched) {
        targetAvatar = fetched.avatar;
      } else {
        const defaultIndex = Number(BigInt(m.target_id) >> 22n) % 6;
        targetAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }
      
      return {
        ...m,
        target_avatar: targetAvatar,
        target_display_name: m.target_nickname || m.target_display_name || m.target_username || fetched?.displayName || 'Unknown User',
      };
    });

    // Get manuals where this mod is mentioned in reviewed_by
    const reviewedManuals = await queryBotDb(`
      SELECT 
        m.id,
        m.manual_number,
        m.target_id,
        m.moderator_id,
        m.offense,
        m.action,
        m.advise,
        m.reviewed_by,
        m.created_at,
        duc.username as target_username,
        duc.display_name as target_display_name,
        duc_mod.username as moderator_username,
        duc_mod.display_name as moderator_display_name
      FROM manuals m
      LEFT JOIN discord_user_cache duc ON m.target_id = duc.user_id
      LEFT JOIN discord_user_cache duc_mod ON m.moderator_id = duc_mod.user_id
      WHERE m.guild_id = $1 AND $2 = ANY(m.reviewed_by)
      ORDER BY m.created_at DESC
      LIMIT 50
    `, [GUILD_ID, modId]);

    // Get VC stats for mod
    const vcDf = buildDateClause('joined_at', dateFilter, 3);
    const vcStats = await queryBotDb(`
      SELECT 
        COUNT(*) as vc_sessions,
        COALESCE(SUM(duration_seconds), 0) as total_vc_time,
        COALESCE(AVG(duration_seconds), 0) as avg_session_duration,
        MAX(duration_seconds) as longest_session,
        COUNT(DISTINCT channel_id) as unique_channels
      FROM voice_logs
      WHERE guild_id = $1 AND user_id = $2 AND left_at IS NOT NULL${vcDf.clause}
    `, [GUILD_ID, modId, ...vcDf.params]);

    // Get VC sessions for mod (for chart/timeline)
    const vcSessions = await queryBotDb(`
      SELECT 
        id,
        channel_id,
        channel_name,
        joined_at,
        left_at,
        duration_seconds
      FROM voice_logs
      WHERE guild_id = $1 AND user_id = $2 AND left_at IS NOT NULL${vcDf.clause}
      ORDER BY joined_at DESC
      LIMIT 100
    `, [GUILD_ID, modId, ...vcDf.params]);

    // Get chat stats for mod
    const chatDf = buildDateClause('created_at', dateFilter, 3);
    const chatStats = await queryBotDb(`
      SELECT 
        COUNT(*) as message_count,
        COUNT(DISTINCT channel_id) as unique_channels,
        COALESCE(SUM(content_length), 0) as total_characters,
        COUNT(CASE WHEN in_voice_chat THEN 1 END) as messages_in_vc
      FROM chat_logs
      WHERE guild_id = $1 AND user_id = $2${chatDf.clause}
    `, [GUILD_ID, modId, ...chatDf.params]);

    // Get activity by day for charts (last 30 days)
    const activityByDay = await queryBotDb(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as case_count,
        COUNT(CASE WHEN action = 'MUTE' THEN 1 END) as mutes,
        COUNT(CASE WHEN action = 'BAN' THEN 1 END) as bans,
        COUNT(CASE WHEN action = 'WARN' THEN 1 END) as warns
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id = $2 
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [GUILD_ID, modId]);

    // Get activity by hour for charts
    const activityByHour = await queryBotDb(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as case_count
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id = $2
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [GUILD_ID, modId]);

    return NextResponse.json({
      success: true,
      mod: {
        id: modId,
        username: modProfile.username,
        display_name: modProfile.displayName,
        avatar_url: modProfile.avatar,
        tag: modProfile.tag,
        in_guild: modProfile.inGuild,
      },
      stats: modStats[0] || {
        total_cases: 0,
        mutes: 0,
        bans: 0,
        kicks: 0,
        warns: 0,
        unbans: 0,
        unmutes: 0,
      },
      cases: casesWithAvatars,
      manuals: {
        created: manualsWithAvatars,
        reviewed: reviewedManuals,
      },
      activity: {
        vc: vcStats[0] || { vc_sessions: 0, total_vc_time: 0 },
        vc_sessions: vcSessions,
        chat: chatStats[0] || { message_count: 0 },
        by_day: activityByDay,
        by_hour: activityByHour,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching mod details:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch mod details' }, { status: 500 });
  }
}
