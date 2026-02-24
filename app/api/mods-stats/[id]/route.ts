import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb, getUsersDisplay } from '@/lib/botDb';
import { getErrorMessage, GUILD_ID } from '@/lib/constants';

/**
 * GET - Fetch individual moderator details with filtered actions
 * Query params:
 * - actionType: MUTE | BAN | KICK | WARN | all (default)
 * - page: number (default 1)
 * - limit: number (default 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moderatorId = params.id;
    const actionType = searchParams.get('actionType') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get moderator user data
    const userMap = await getUsersDisplay([moderatorId], 128);
    const moderator = userMap.get(moderatorId);

    if (!moderator) {
      return NextResponse.json({ error: 'Moderator not found' }, { status: 404 });
    }

    // Build where clause for action type filter
    let actionFilter = '';
    if (actionType !== 'all') {
      actionFilter = `AND action = $4`;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id = $2 ${actionFilter}
    `;
    const countParams = actionType !== 'all' 
      ? [GUILD_ID, moderatorId, actionType]
      : [GUILD_ID, moderatorId];
    
    const countResult = await queryBotDb(countQuery, countParams);
    const totalCases = parseInt(countResult[0]?.count || '0');

    // Get filtered moderation cases
    const casesQuery = `
      SELECT 
        id,
        case_number,
        user_id,
        action,
        reason,
        created_at,
        duration_seconds,
        expires_at,
        status
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id = $2 ${actionFilter}
      ORDER BY created_at DESC
      LIMIT $3 OFFSET ${offset}
    `;
    const casesParams = actionType !== 'all'
      ? [GUILD_ID, moderatorId, actionType, limit]
      : [GUILD_ID, moderatorId, limit];

    const cases = await queryBotDb(casesQuery, casesParams);

    // Get user data for all targets in the cases
    const targetUserIds = [...new Set(cases.map((c: any) => c.user_id))];
    const targetUsersMap = await getUsersDisplay(targetUserIds, 64);

    // Enrich cases with user data
    const enrichedCases = cases.map((c: any) => {
      const targetUser = targetUsersMap.get(c.user_id);
      return {
        ...c,
        target: targetUser ? {
          id: c.user_id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          avatar: targetUser.avatar,
        } : {
          id: c.user_id,
          username: 'Unknown User',
          displayName: 'Unknown User',
          avatar: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(c.user_id) >> 22n) % 6}.png`,
        },
      };
    });

    // Get summary stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_cases,
        COUNT(CASE WHEN action = 'MUTE' THEN 1 END) as mutes,
        COUNT(CASE WHEN action = 'BAN' THEN 1 END) as bans,
        COUNT(CASE WHEN action = 'KICK' THEN 1 END) as kicks,
        COUNT(CASE WHEN action = 'WARN' THEN 1 END) as warns,
        COUNT(CASE WHEN action = 'UNBAN' THEN 1 END) as unbans,
        COUNT(CASE WHEN action = 'UNMUTE' THEN 1 END) as unmutes,
        MAX(created_at) as last_action
      FROM moderation_cases
      WHERE guild_id = $1 AND moderator_id = $2
    `;
    const stats = await queryBotDb(statsQuery, [GUILD_ID, moderatorId]);

    // Get manual cases count
    const manualStats = await queryBotDb(`
      SELECT COUNT(*) as total_manuals
      FROM manuals
      WHERE guild_id = $1 AND moderator_id = $2
    `, [GUILD_ID, moderatorId]);

    return NextResponse.json({
      success: true,
      moderator: {
        id: moderatorId,
        username: moderator.username,
        displayName: moderator.displayName,
        avatar: moderator.avatar,
        inGuild: moderator.inGuild,
      },
      stats: {
        total_cases: parseInt(stats[0]?.total_cases || '0'),
        mutes: parseInt(stats[0]?.mutes || '0'),
        bans: parseInt(stats[0]?.bans || '0'),
        kicks: parseInt(stats[0]?.kicks || '0'),
        warns: parseInt(stats[0]?.warns || '0'),
        unbans: parseInt(stats[0]?.unbans || '0'),
        unmutes: parseInt(stats[0]?.unmutes || '0'),
        total_manuals: parseInt(manualStats[0]?.total_manuals || '0'),
        last_action: stats[0]?.last_action,
      },
      cases: enrichedCases,
      pagination: {
        page,
        limit,
        total: totalCases,
        totalPages: Math.ceil(totalCases / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching mod details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
