import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const MAIN_OWNER_ID = '929297205796417597';
const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD  = 0x0000000000000020n;

async function verifyAccess(session: any, guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  const userId = String(session?.user?.id || '');
  if (!userId) return false;
  if (userId === MAIN_OWNER_ID) return true;

  const [memberRes, rolesRes, guildRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
  ]);

  if (!memberRes.ok || !guildRes.ok) return false;
  const guild  = await guildRes.json().catch(() => null);
  const member = await memberRes.json().catch(() => null);
  if (String(guild?.owner_id) === userId) return true;

  const roles  = rolesRes.ok ? await rolesRes.json().catch(() => []) : [];
  const roleMap = new Map<string, bigint>();
  for (const r of Array.isArray(roles) ? roles : []) {
    try { roleMap.set(String(r.id), BigInt(r.permissions || '0')); } catch { }
  }
  let effective = 0n;
  for (const rid of Array.isArray(member?.roles) ? member.roles : []) {
    effective |= roleMap.get(String(rid)) || 0n;
  }
  return (effective & ADMINISTRATOR) !== 0n || (effective & MANAGE_GUILD) !== 0n;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId } = await params;
    if (userId === MAIN_OWNER_ID) {
      return NextResponse.json({ error: 'Main Owner cannot be modified.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const { guildId, permissions } = body || {};

    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
