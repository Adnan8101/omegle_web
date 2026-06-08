import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD  = 0x0000000000000020n;
const MAIN_OWNER_ID = '929297205796417597';

async function verifyGuildAccess(session: any, guildId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return { ok: false, reason: 'BOT_TOKEN_MISSING' };

  const userId = String(session?.user?.id || '');
  if (!userId) return { ok: false, reason: 'NO_USER' };

  if (userId === MAIN_OWNER_ID) {
    const [guildRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
      }),
    ]);
    const guild = guildRes.ok ? await guildRes.json().catch(() => null) : null;
    const roles = rolesRes.ok ? await rolesRes.json().catch(() => []) : [];
    return { ok: true, guild, roles };
  }

  const [guildRes, memberRes, rolesRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
  ]);

  if (!guildRes.ok) return { ok: false, reason: 'BOT_NOT_IN_GUILD' };
  if (!memberRes.ok) return { ok: false, reason: 'USER_NOT_IN_GUILD' };

  const guild  = await guildRes.json().catch(() => null);
  const member = await memberRes.json().catch(() => null);
  const roles  = rolesRes.ok ? await rolesRes.json().catch(() => []) : [];

  if (String(guild?.owner_id) === userId) return { ok: true, guild, roles };

  const roleMap = new Map<string, bigint>();
  for (const r of Array.isArray(roles) ? roles : []) {
    try { roleMap.set(String(r.id), BigInt(r.permissions || '0')); } catch { }
  }
  let effective = 0n;
  for (const rid of Array.isArray(member?.roles) ? member.roles : []) {
    effective |= roleMap.get(String(rid)) || 0n;
  }

  const canManage = (effective & ADMINISTRATOR) !== 0n || (effective & MANAGE_GUILD) !== 0n;
  return canManage ? { ok: true, guild, roles } : { ok: false, reason: 'MISSING_GUILD_PERMISSION' };
}

async function fetchAllMembers(guildId: string, botToken: string): Promise<any[]> {
  const all: any[] = [];
  let after = '0';
  const limit = 1000;

  for (let page = 0; page < 10; page++) {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=${limit}&after=${after}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: 'no-store',
    }).catch(() => null);

    if (!res?.ok) break;
    const batch: any[] = await res.json().catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);

    if (batch.length < limit) break;
    const last = batch[batch.length - 1];
    after = String(last?.user?.id || '0');
    if (after === '0') break;
  }

  return all;
}

function formatUser(m: any) {
  const user = m.user || {};
  const fallbackIndex = Number(BigInt(String(user.id || '0')) % 6n);
  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  return {
    id: String(user.id || ''),
    name: String(m.nick || user.global_name || user.username || '').trim(),
    username: String(user.username || '').trim(),
    avatar,
    isBot: Boolean(user.bot),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const guildId = request.nextUrl.searchParams.get('guildId') || '';
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const access = await verifyGuildAccess(session, guildId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden', reason: access.reason }, { status: 403 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN!;

    const [members, channelsRes] = await Promise.all([
      fetchAllMembers(guildId, botToken),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
      }),
    ]);

    const channels = channelsRes.ok ? await channelsRes.json().catch(() => []) : [];
    const roles    = access.roles || [];

    const rolesList = (Array.isArray(roles) ? roles : [])
      .filter((r: any) => r.name !== '@everyone')
      .map((r: any) => {
        const raw = Number(r.color || 0);
        return {
          id:       String(r.id),
          name:     String(r.name),
          color:    raw > 0 ? `#${raw.toString(16).padStart(6, '0')}` : null,
          position: Number(r.position || 0),
        };
      })
      .sort((a: any, b: any) => b.position - a.position);

    const usersList = members
      .map(formatUser)
      .filter((u: any) => u.id && u.name && !u.isBot)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({
      guild: {
        id: guildId,
        name: String(access.guild?.name || guildId),
        icon: access.guild?.icon
          ? `https://cdn.discordapp.com/icons/${guildId}/${access.guild.icon}.png?size=256`
          : null,
        memberCount: Number(access.guild?.member_count || usersList.length),
      },
      roles: rolesList,
      users: usersList,
      channels: (Array.isArray(channels) ? channels : [])
        .filter((ch: any) => ch.type === 0 || ch.type === 4)
        .map((ch: any) => ({ id: String(ch.id), name: String(ch.name) })),
    });
  } catch (error) {
    console.error('[antinuke/guild-context] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
