import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const MAIN_OWNER_ID = '929297205796417597';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = params.userId;
    if (userId === MAIN_OWNER_ID) {
      return NextResponse.json({ error: 'Main Owner cannot be modified.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const { guildId, permissions } = body || {};

    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });
    if (typeof permissions !== 'object' || permissions === null) {
      return NextResponse.json({ error: 'permissions object is required' }, { status: 400 });
    }

    const row = await prismaBot.antiNukeWhitelist.update({
      where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
      data: {
        permissions,
        added_by: String(session.user.id),
      },
    });

    return NextResponse.json({ success: true, entry: row });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'User not found in whitelist.' }, { status: 404 });
    }
    console.error('[antinuke/whitelist/[userId]] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
