import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getDiscordUser, getDiscordUserAvatar } from '@/lib/discord';

const GUILD_ID = "1507458872225566811";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return NextResponse.json({ error: 'Insufficient permissions - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'coins_earned';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const status = searchParams.get('status'); 
    const search = searchParams.get('search') || '';

    
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    
    const inviteWhere: any = { guild_id: GUILD_ID };
    if (status === 'active') inviteWhere.active = true;
    if (status === 'left') inviteWhere.active = false;

    
    const totalInvites = await prismaBot.economyInvite.count({
      where: { guild_id: GUILD_ID }
    });
    const activeInvites = await prismaBot.economyInvite.count({
      where: { guild_id: GUILD_ID, active: true }
    });
    const leftInvites = await prismaBot.economyInvite.count({
      where: { guild_id: GUILD_ID, active: false }
    });

    
    const invites = await prismaBot.economyInvite.findMany({
      where: inviteWhere,
      orderBy: { created_at: 'desc' },
      take: 50
    });

    
    const statsOrderBy: any = {};
    if (sortBy === 'total_invites') statsOrderBy.total_invites = sortOrder;
    else if (sortBy === 'active_invites') statsOrderBy.active_invites = sortOrder;
    else statsOrderBy.coins_earned = sortOrder;

    const totalStats = await prismaBot.economyInviteStats.count({
      where: { guild_id: GUILD_ID }
    });

    const stats = await prismaBot.economyInviteStats.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: statsOrderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    
    const statsWithUsers = await Promise.all(
      stats.map(async (stat) => {
        const discordUser = await getDiscordUser(stat.user_id);
        const avatar = discordUser ? getDiscordUserAvatar(discordUser.user) : null;
        
        
        const leftCount = await prismaBot.economyInvite.count({
          where: {
            guild_id: GUILD_ID,
            inviter_id: stat.user_id,
            active: false
          }
        });

        return {
          user_id: stat.user_id,
          username: discordUser?.nick || discordUser?.user?.global_name || discordUser?.user?.username || `User ${stat.user_id.slice(0, 8)}`,
          avatar: avatar,
          total_invites: stat.total_invites,
          active_invites: stat.active_invites,
          left_invites: leftCount,
          bonus_invites: 0, 
          fake_invites: 0, 
          coins_earned: stat.coins_earned,
        };
      })
    );

    
    const invitesWithUsers = await Promise.all(
      invites.slice(0, 20).map(async (invite) => {
        const inviterUser = await getDiscordUser(invite.inviter_id);
        const invitedUser = await getDiscordUser(invite.invited_user_id);
        
        return {
          id: invite.id,
          inviter_id: invite.inviter_id,
          inviter_username: inviterUser?.nick || inviterUser?.user?.global_name || inviterUser?.user?.username || `User ${invite.inviter_id.slice(0, 8)}`,
          inviter_avatar: inviterUser ? getDiscordUserAvatar(inviterUser.user) : null,
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

    
    const totalCoinsDistributed = stats.reduce((sum, s) => sum + s.coins_earned, 0);

    return NextResponse.json({
      config: {
        invites_enabled: config?.invites_enabled ?? true,
        coins_per_invite: config?.coins_per_invite ?? 100,
      },
      overview: {
        total_invites: totalInvites,
        active_invites: activeInvites,
        left_invites: leftInvites,
        total_inviters: totalStats,
        total_coins_distributed: totalCoinsDistributed,
      },
      leaderboard: statsWithUsers,
      recent_invites: invitesWithUsers,
      pagination: {
        page,
        limit,
        total: totalStats,
        totalPages: Math.ceil(totalStats / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
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
      return NextResponse.json({ error: 'Insufficient permissions - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { coins_per_invite, invites_enabled } = body;

    
    if (coins_per_invite !== undefined && (typeof coins_per_invite !== 'number' || coins_per_invite < 0)) {
      return NextResponse.json({ error: 'Invalid coins_per_invite' }, { status: 400 });
    }

    
    const config = await prismaBot.economyConfig.upsert({
      where: { guild_id: GUILD_ID },
      create: {
        guild_id: GUILD_ID,
        coins_per_invite: coins_per_invite ?? 100,
        invites_enabled: invites_enabled ?? true,
      },
      update: {
        ...(coins_per_invite !== undefined && { coins_per_invite }),
        ...(invites_enabled !== undefined && { invites_enabled }),
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        invites_enabled: config.invites_enabled,
        coins_per_invite: config.coins_per_invite,
      },
    });
  } catch (error) {
    console.error('[API] Error updating invites config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
