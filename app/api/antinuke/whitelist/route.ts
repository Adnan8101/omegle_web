import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { verifyAccess, MAIN_OWNER_ID, EDITORS } from '@/lib/verifyAccess';

const ALL_PERMISSIONS = [
  'MANAGE_PERMISSIONS',
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

    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await prismaBot.antiNukeWhitelist.findMany({
      where: { guild_id: guildId },
      orderBy: { created_at: 'asc' },
    });

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const resolvedWhitelist = await Promise.all(rows.map(async r => {
      let name = r.user_id;
      let username = '';
      let avatar = '';
      let isBot = false;

      if (botToken) {
        try {
          const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${r.user_id}`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store',
          });
          if (memberRes.ok) {
            const m = await memberRes.json();
            const u = m.user || {};
            name = String(m.nick || u.global_name || u.username || r.user_id).trim();
            username = String(u.username || '').trim();
            isBot = Boolean(u.bot);
            const fallbackIndex = Number(BigInt(String(u.id || '0')) % 6n);
            avatar = u.avatar
              ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=64`
              : `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
          } else {
            const userRes = await fetch(`https://discord.com/api/v10/users/${r.user_id}`, {
              headers: { Authorization: `Bot ${botToken}` },
              cache: 'no-store',
            });
            if (userRes.ok) {
              const u = await userRes.json();
              name = String(u.global_name || u.username || r.user_id).trim();
              username = String(u.username || '').trim();
              isBot = Boolean(u.bot);
              const fallbackIndex = Number(BigInt(String(u.id || '0')) % 6n);
              avatar = u.avatar
                ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=64`
                : `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
            }
          }
        } catch (e) {
          console.error(`[whitelist/GET] Error resolving ${r.user_id}:`, e);
        }
      }

      return {
        id: r.id,
        guildId: r.guild_id,
        userId: r.user_id,
        permissions: r.permissions as Record<string, boolean>,
        addedBy: r.added_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        user: avatar ? {
          id: r.user_id,
          name,
          username,
          avatar,
          isBot,
        } : null,
      };
    }));

    return NextResponse.json({
      whitelist: resolvedWhitelist,
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

    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!EDITORS.includes(String(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden. Only whitelisted editors can edit the Anti-Nuke configurations.' }, { status: 403 });
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

    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!EDITORS.includes(String(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden. Only whitelisted editors can edit the Anti-Nuke configurations.' }, { status: 403 });
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
