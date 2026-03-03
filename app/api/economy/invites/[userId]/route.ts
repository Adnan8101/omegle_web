import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// GET - Fetch invites for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const userId = params.userId;

    // Get all invites created by this user
    const invites = await prismaBot.economyInvite.findMany({
      where: {
        guild_id: GUILD_ID,
        inviter_id: userId,
      },
      orderBy: { created_at: 'desc' }
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

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        invited_user_id: invite.invited_user_id,
        invite_code: invite.invite_code,
        joined_at: invite.joined_at,
        left_at: invite.left_at,
        active: invite.active,
        coins_earned: invite.coins_earned,
      })),
      stats: stats ? {
        total_invites: stats.total_invites,
        active_invites: stats.active_invites,
        coins_earned: stats.coins_earned,
      } : {
        total_invites: 0,
        active_invites: 0,
        coins_earned: 0,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching user invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}
