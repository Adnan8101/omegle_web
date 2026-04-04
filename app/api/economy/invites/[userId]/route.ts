import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getDiscordUser, getDiscordUserAvatar } from '@/lib/discord';

const GUILD_ID = "910043773130661918";

// GET - Fetch invites for a specific user with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Full Access only (Server Admin/Owner)
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return NextResponse.json({ error: 'Insufficient permissions - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'active', 'left', 'all'

    // Get user's Discord info
    const discordUser = await getDiscordUser(userId);
    const userInfo = {
      user_id: userId,
      username: discordUser?.nick || discordUser?.user?.global_name || discordUser?.user?.username || `User ${userId.slice(0, 8)}`,
      avatar: discordUser ? getDiscordUserAvatar(discordUser.user) : null,
      joined_at: discordUser?.joined_at || null,
    };

    // Get config for coins per invite
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    // Build invite filter
    const inviteWhere: any = {
      guild_id: GUILD_ID,
      inviter_id: userId,
    };
    if (status === 'active') inviteWhere.active = true;
    if (status === 'left') inviteWhere.active = false;

    // Get total counts for this user
    const totalInvites = await prismaBot.economyInvite.count({
      where: { guild_id: GUILD_ID, inviter_id: userId }
    });
    const activeInvites = await prismaBot.economyInvite.count({
      where: { guild_id: GUILD_ID, inviter_id: userId, active: true }
    });
    const leftInvites = await prismaBot.economyInvite.count({
      where: { guild_id: GUILD_ID, inviter_id: userId, active: false }
    });

    // Get all invites created by this user with pagination
    const invites = await prismaBot.economyInvite.findMany({
      where: inviteWhere,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get stats for this user
    const stats = await prismaBot.economyInviteStats.findUnique({
      where: {
        guild_id_user_id: {
          guild_id: GUILD_ID,
          user_id: userId,
        },
      },
    });

    // Get bonus invites from point logs
    const bonusLogs = await prismaBot.economyPointLog.findMany({
      where: {
        guild_id: GUILD_ID,
        user_id: userId,
        source: 'invite-bonus',
      },
    });
    const bonusCoins = bonusLogs.reduce((sum, log) => sum + log.amount, 0);
    const coinsPerInvite = config?.coins_per_invite || 100;
    const bonusInvites = Math.floor(bonusCoins / coinsPerInvite);

    // Fetch Discord user info for invited users
    const invitesWithUsers = await Promise.all(
      invites.map(async (invite) => {
        const invitedUser = await getDiscordUser(invite.invited_user_id);
        
        return {
          id: invite.id,
          invited_user_id: invite.invited_user_id,
          invited_username: invitedUser?.nick || invitedUser?.user?.global_name || invitedUser?.user?.username || `User ${invite.invited_user_id.slice(0, 8)}`,
          invited_avatar: invitedUser ? getDiscordUserAvatar(invitedUser.user) : null,
          invite_code: invite.invite_code,
          joined_at: invite.joined_at,
          left_at: invite.left_at,
          active: invite.active,
          coins_earned: invite.coins_earned,
        };
      })
    );

    return NextResponse.json({
      user: userInfo,
      stats: {
        total_invites: totalInvites,
        active_invites: activeInvites,
        left_invites: leftInvites,
        bonus_invites: bonusInvites,
        fake_invites: 0, // Not tracked
        coins_earned: stats?.coins_earned || 0,
        coins_per_invite: coinsPerInvite,
      },
      invites: invitesWithUsers,
      pagination: {
        page,
        limit,
        total: status === 'active' ? activeInvites : status === 'left' ? leftInvites : totalInvites,
        totalPages: Math.ceil((status === 'active' ? activeInvites : status === 'left' ? leftInvites : totalInvites) / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching user invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}
