import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD = 0x0000000000000020n;
function isLocalBypass(request: NextRequest): boolean {
  return process.env.AUTOMOD_DEV_BYPASS === 'true';
}
function hasAccess(session: any, request: NextRequest): boolean {
  if (isLocalBypass(request)) return true;
  return Boolean(session?.user?.id);
}
async function getGuildAccess(session: any, guildId: string): Promise<{ ok: boolean; reason?: 'USER_NOT_IN_GUILD' | 'MISSING_GUILD_PERMISSION' }> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return { ok: false, reason: 'MISSING_GUILD_PERMISSION' };
  const userId = String(session?.user?.id || '');
  if (!userId) return { ok: false, reason: 'USER_NOT_IN_GUILD' };
  const [guildRes, memberRes, rolesRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    }),
  ]);
  if (!guildRes.ok) return { ok: false, reason: 'MISSING_GUILD_PERMISSION' };
  if (!memberRes.ok) return { ok: false, reason: 'USER_NOT_IN_GUILD' };
  const guild = await guildRes.json().catch(() => null);
  const member = await memberRes.json().catch(() => null);
  const roles = rolesRes.ok ? await rolesRes.json().catch(() => []) : [];
  if (String(guild?.owner_id || '') === userId) return { ok: true };
  const roleMap = new Map<string, bigint>();
  if (Array.isArray(roles)) {
    for (const role of roles) {
      try {
        roleMap.set(String(role.id), BigInt(role.permissions || '0'));
      } catch {
        roleMap.set(String(role.id), 0n);
      }
    }
  }
  let effective = 0n;
  for (const roleId of Array.isArray(member?.roles) ? member.roles : []) {
    effective |= roleMap.get(String(roleId)) || 0n;
  }
  const canManage = (effective & ADMINISTRATOR) !== 0n || (effective & MANAGE_GUILD) !== 0n;
  return canManage ? { ok: true } : { ok: false, reason: 'MISSING_GUILD_PERMISSION' };
}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });
    const guildId = String(request.nextUrl.searchParams.get('guildId') || '');
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });
    if (!isLocalBypass(request)) {
      const guildAccess = await getGuildAccess(session, guildId);
      if (!guildAccess.ok) {
        return NextResponse.json({
          error: 'Forbidden',
          reason: guildAccess.reason,
          details: guildAccess.reason === 'USER_NOT_IN_GUILD'
            ? 'You are not a member of this guild.'
            : 'You need Manage Server or Administrator permission in this guild.',
        }, { status: 403 });
      }
    }
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    const [guildRes, channelsRes, rolesRes, membersRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }),
    ]);
    if (guildRes.status === 403 || guildRes.status === 404) {
      return NextResponse.json({
        error: 'Forbidden',
        reason: 'BOT_NOT_IN_GUILD',
        details: 'Bot is not added to this guild. Add the bot first, then try again.',
      }, { status: 403 });
    }
    const guild = guildRes.ok ? await guildRes.json() : null;
    const channels = channelsRes.ok ? await channelsRes.json() : [];
    const roles = rolesRes.ok ? await rolesRes.json() : [];
    const members = membersRes.ok ? await membersRes.json() : [];
    const textChannels = (Array.isArray(channels) ? channels : [])
      .filter((ch: any) => ch.type === 0)
      .map((ch: any) => ({ id: String(ch.id), name: String(ch.name), type: 'text' }));
    const rolesList = (Array.isArray(roles) ? roles : [])
      .filter((r: any) => r.name !== '@everyone')
      .map((r: any) => {
        const raw = Number(r.color || 0);
        const color = raw > 0 ? `#${raw.toString(16).padStart(6, '0')}` : null;
        return {
          id: String(r.id),
          name: String(r.name),
          position: Number(r.position || 0),
          color,
        };
      })
      .sort((a: any, b: any) => b.position - a.position);
    const usersList = (Array.isArray(members) ? members : [])
      .map((m: any) => {
        const user = m.user || {};
        const username = user.global_name || user.username;
        const fallbackAvatarIndex = Number(BigInt(String(user.id || '0')) % 6n);
        const avatar = user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${fallbackAvatarIndex}.png`;
        return {
          id: String(user.id || ''),
          name: String(username || '').trim(),
          username: String(user.username || '').trim(),
          avatar,
        };
      })
      .filter((u: any) => u.id && u.name)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    return NextResponse.json({
      guild: guild ? {
        id: String(guild.id),
        name: String(guild.name),
        description: typeof guild.description === 'string' ? guild.description : '',
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256` : null,
      } : { id: guildId, name: guildId, description: '', icon: null },
      channels: textChannels,
      roles: rolesList,
      users: usersList,
    });
  } catch (error) {
    console.error('automod guild context GET error', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? String((error as any)?.message || error) : undefined,
    }, { status: 500 });
  }
}