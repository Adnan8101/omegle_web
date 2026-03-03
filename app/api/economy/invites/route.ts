import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// GET - Fetch all invites with stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Full Access only (Server Admin/Owner)
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return NextResponse.json({ error: 'Insufficient permissions - Admin only' }, { status: 403 });
    }

    // Get config
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    // Get all invites with inviter and invited user info
    const invites = await prismaBot.economyInvite.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { created_at: 'desc' }
    });

    // Get all invite stats
    const stats = await prismaBot.economyInviteStats.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { coins_earned: 'desc' }
    });

    // Group invites by inviter
    const invitesByInviter = new Map<string, typeof invites>();
    invites.forEach((invite) => {
      if (!invitesByInviter.has(invite.inviter_id)) {
        invitesByInviter.set(invite.inviter_id, []);
      }
      invitesByInviter.get(invite.inviter_id)!.push(invite);
    });

    return NextResponse.json({
      config: {
        invites_enabled: config?.invites_enabled ?? true,
        coins_per_invite: config?.coins_per_invite ?? 100,
      },
      invites: invites.map((invite) => ({
        id: invite.id,
        inviter_id: invite.inviter_id,
        invited_user_id: invite.invited_user_id,
        invite_code: invite.invite_code,
        joined_at: invite.joined_at,
        left_at: invite.left_at,
        active: invite.active,
        coins_earned: invite.coins_earned,
      })),
      stats: stats.map((stat) => ({
        user_id: stat.user_id,
        total_invites: stat.total_invites,
        active_invites: stat.active_invites,
        coins_earned: stat.coins_earned,
      })),
    });
  } catch (error) {
    console.error('[API] Error fetching invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST - Update invite config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Full Access only (Server Admin/Owner)
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess) {
      return NextResponse.json({ error: 'Insufficient permissions - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { coins_per_invite, invites_enabled } = body;

    // Validate input
    if (coins_per_invite !== undefined && (typeof coins_per_invite !== 'number' || coins_per_invite < 0)) {
      return NextResponse.json({ error: 'Invalid coins_per_invite' }, { status: 400 });
    }

    // Update config
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
