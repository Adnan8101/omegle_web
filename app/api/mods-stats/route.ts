import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb, getUsersDisplay } from '@/lib/botDb';
import { getErrorMessage, GUILD_ID } from '@/lib/constants';

// Role IDs for staff and moderators
const STAFF_ROLE_IDS = [
  '1470334572557369384', // Staff/Mod role 1
  '1470334506337828874', // Staff/Mod role 2
];

const MOD_ROLE_IDS = [
  '1470334572557369384', // Mod role 1
  '1470334506337828874', // Mod role 2
];

/**
 * GET - Fetch all mods/staff with their stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Mods stats requires full access (admin/manage server)
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all cached users with staff/mod roles
    const staffUsers = await queryBotDb(`
      SELECT 
        user_id,
        roles
      FROM discord_user_cache
      WHERE in_guild = true AND roles IS NOT NULL
      ORDER BY user_id ASC
    `);

    // Filter users who have staff or mod roles
    const staffMembers = staffUsers.filter((user: any) => {
      if (!user.roles) return false;
      try {
        const roles = JSON.parse(user.roles);
        return roles.some((roleId: string) => STAFF_ROLE_IDS.includes(roleId));
      } catch {
        return false;
      }
    });

    // Get moderation stats for all staff members
    const staffIds = staffMembers.map((u: any) => u.user_id);
    
    if (staffIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        mods: [],
        message: 'No staff members found'
      });
    }

    // Fetch user data from cache (fast and reliable)
    const usersDisplayMap = await getUsersDisplay(staffIds, 128);
    
    const userDataMap = new Map<string, any>();
    
    // Convert to the format expected by the rest of the code
    for (const userId of staffIds) {
      const userDisplay = usersDisplayMap.get(userId);
      if (userDisplay) {
        userDataMap.set(userId, {
          username: userDisplay.username,
          displayName: userDisplay.displayName,
          avatarUrl: userDisplay.avatar,
          inGuild: userDisplay.inGuild,
          nickname: null, // Cache doesn't store this separately
          joinedAt: null,
        });
      } else {
        userDataMap.set(userId, {
          username: 'Unknown User',
          displayName: 'Unknown User',
          avatarUrl: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`,
          inGuild: false,
          nickname: null,
          joinedAt: null,
        });
      }
    }

    // Build placeholders for IN clause
    const placeholders = staffIds.map((_: string, i: number) => `$${i + 2}`).join(', ');

    // Get moderator stats from moderation_cases
    const modStats = await queryBotDb(`
      SELECT 
        moderator_id,
        COUNT(*) as total_cases,
        COUNT(CASE WHEN action = 'MUTE' THEN 1 END) as mutes,
        COUNT(CASE WHEN action = 'BAN' THEN 1 END) as bans,
        COUNT(CASE WHEN action = 'KICK' THEN 1 END) as kicks,
        COUNT(CASE WHEN action = 'WARN' THEN 1 END) as warns,
        COUNT(CASE WHEN action = 'UNBAN' THEN 1 END) as unbans,
        COUNT(CASE WHEN action = 'UNMUTE' THEN 1 END) as unmutes,
        MAX(created_at) as last_action
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id IN (${placeholders})
      GROUP BY moderator_id
    `, [GUILD_ID, ...staffIds]);

    // Get manual cases count
    const manualStats = await queryBotDb(`
      SELECT 
        moderator_id,
        COUNT(*) as total_manuals
      FROM manuals
      WHERE guild_id = $1 AND moderator_id IN (${placeholders})
      GROUP BY moderator_id
    `, [GUILD_ID, ...staffIds]);

    // Get VC stats for mods
    const vcStats = await queryBotDb(`
      SELECT 
        user_id,
        COUNT(*) as vc_sessions,
        COALESCE(SUM(duration_seconds), 0) as total_vc_time
      FROM voice_logs
      WHERE guild_id = $1 AND user_id IN (${placeholders}) AND left_at IS NOT NULL
      GROUP BY user_id
    `, [GUILD_ID, ...staffIds]);

    // Get chat stats for mods
    const chatStats = await queryBotDb(`
      SELECT 
        user_id,
        COUNT(*) as message_count
      FROM chat_logs
      WHERE guild_id = $1 AND user_id IN (${placeholders})
      GROUP BY user_id
    `, [GUILD_ID, ...staffIds]);

    // Build stats maps
    const modStatsMap = new Map(modStats.map((s: any) => [s.moderator_id, s]));
    const manualStatsMap = new Map(manualStats.map((s: any) => [s.moderator_id, s]));
    const vcStatsMap = new Map(vcStats.map((s: any) => [s.user_id, s]));
    const chatStatsMap = new Map(chatStats.map((s: any) => [s.user_id, s]));

    // Combine all data
    const modsWithStats = staffMembers.map((user: any) => {
      const ms = modStatsMap.get(user.user_id) || {};
      const manuals = manualStatsMap.get(user.user_id) || {};
      const vc = vcStatsMap.get(user.user_id) || {};
      const chat = chatStatsMap.get(user.user_id) || {};

      // Parse roles to determine role type
      let userRoles: string[] = [];
      try {
        userRoles = JSON.parse(user.roles || '[]');
      } catch {}

      const isMod = userRoles.some(r => MOD_ROLE_IDS.includes(r));

      // Get user data from our fetched map
      const userData = userDataMap.get(user.user_id) || {
        username: 'Unknown User',
        displayName: 'Unknown User',
        avatarUrl: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.user_id) >> 22n) % 6}.png`,
        inGuild: false,
        nickname: null,
        joinedAt: null,
      };

      return {
        user_id: user.user_id,
        username: userData.username,
        display_name: userData.displayName,
        avatar_url: userData.avatarUrl,
        in_guild: userData.inGuild,
        joined_at: userData.joinedAt,
        is_mod: isMod,
        roles: userRoles,
        stats: {
          total_cases: parseInt(ms.total_cases) || 0,
          mutes: parseInt(ms.mutes) || 0,
          bans: parseInt(ms.bans) || 0,
          kicks: parseInt(ms.kicks) || 0,
          warns: parseInt(ms.warns) || 0,
          unbans: parseInt(ms.unbans) || 0,
          unmutes: parseInt(ms.unmutes) || 0,
          total_manuals: parseInt(manuals.total_manuals) || 0,
          last_action: ms.last_action || null,
        },
        activity: {
          vc_sessions: parseInt(vc.vc_sessions) || 0,
          total_vc_time: parseInt(vc.total_vc_time) || 0,
          message_count: parseInt(chat.message_count) || 0,
        },
      };
    });

    // Sort by total cases (most active mods first)
    modsWithStats.sort((a: any, b: any) => b.stats.total_cases - a.stats.total_cases);

    return NextResponse.json({
      success: true,
      mods: modsWithStats,
      total: modsWithStats.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching mod stats:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch mod stats' }, { status: 500 });
  }
}
