import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const MAIN_OWNER_ID = '929297205796417597';

const ALL_PERMISSIONS = [
  'ADD_BOT', 'CREATE_ROLE', 'DELETE_ROLE', 'EDIT_ROLE',
  'CREATE_CHANNEL', 'DELETE_CHANNEL', 'EDIT_CHANNEL',
  'CREATE_CATEGORY', 'DELETE_CATEGORY', 'EDIT_CATEGORY',
  'CREATE_WEBHOOK', 'DELETE_WEBHOOK', 'EDIT_WEBHOOK',
  'UPDATE_MEMBER_ROLE', 'TIMEOUT_MEMBER', 'KICK_MEMBER',
  'BAN_MEMBER', 'PERMISSION_UPDATES',
];

function buildDefaultPermissions(): Record<string, boolean> {
  return Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false]));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const guildId = request.nextUrl.searchParams.get('guildId') || '';
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const rows = await prismaBot.antiNukeWhitelist.findMany({
      where: { guild_id: guildId },
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({
      whitelist: rows.map(r => ({
        id: r.id,
        guildId: r.guild_id,
        userId: r.user_id,
        permissions: r.permissions as Record<string, boolean>,
        addedBy: r.added_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      mainOwnerId: MAIN_OWNER_ID,
    });
  } catch (error) {
    console.error('[antinuke/whitelist] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const { guildId, userId, permissions } = body || {};

    if (!guildId || !userId) {
      return NextResponse.json({ error: 'guildId and userId are required' }, { status: 400 });
    }

    if (userId === MAIN_OWNER_ID) {
      return NextResponse.json({
        error: 'Main Owner cannot be modified through the whitelist.',
      }, { status: 400 });
    }

    const safePermissions = {
      ...buildDefaultPermissions(),
      ...(typeof permissions === 'object' && permissions !== null ? permissions : {}),
    };

    const row = await prismaBot.antiNukeWhitelist.upsert({
      where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
      create: {
        guild_id: guildId,
        user_id: userId,
        permissions: safePermissions,
        added_by: String(session.user.id),
      },
      update: {
        permissions: safePermissions,
        added_by: String(session.user.id),
      },
    });

    return NextResponse.json({ success: true, entry: row }, { status: 201 });
  } catch (error) {
    console.error('[antinuke/whitelist] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const { guildId, userId } = body || {};

    if (!guildId || !userId) {
      return NextResponse.json({ error: 'guildId and userId are required' }, { status: 400 });
    }

    if (userId === MAIN_OWNER_ID) {
      return NextResponse.json({
        error: 'Main Owner cannot be removed from bypass.',
      }, { status: 400 });
    }

    await prismaBot.antiNukeWhitelist.delete({
      where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[antinuke/whitelist] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
