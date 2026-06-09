import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD = 0x0000000000000020n;
function isLocalBypass(request: NextRequest): boolean {
  return process.env.AUTOMOD_DEV_BYPASS === 'true';
}
function hasAccess(session: any, request: NextRequest): boolean {
  if (isLocalBypass(request)) return true;
  return Boolean(session?.user?.id);
}
function resolveGuildId(request: NextRequest, body?: any): string {
  return String(request.nextUrl.searchParams.get('guildId') || body?.guild_id || '').trim();
}
function splitIgnoredRoles(raw: unknown): { roles: string[]; users: string[] } {
  const list = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
  const users = list.filter((x) => x.startsWith('user:')).map((x) => x.replace(/^user:/, ''));
  const roles = list.filter((x) => !x.startsWith('user:'));
  return { roles, users };
}
function mergeIgnoredRoles(rolesRaw: unknown, usersRaw: unknown): string[] {
  const roles = Array.isArray(rolesRaw) ? rolesRaw.map((x) => String(x)).filter(Boolean) : [];
  const users = Array.isArray(usersRaw) ? usersRaw.map((x) => `user:${String(x)}`).filter((x) => x !== 'user:') : [];
  return [...roles, ...users];
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
async function botHasGuild(guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  return res.ok;
}
function isMissingTableError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('automod_configs') && (message.includes('does not exist') || message.includes('no such table') || message.includes('table'));
}
function isDbUnavailableError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return (
    message.includes('authentication failed against database server') ||
    message.includes('provided database credentials') ||
    message.includes('prismaclientinitializationerror') ||
    message.includes('can\'t reach database server') ||
    message.includes('connection refused')
  );
}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });
    const guildId = resolveGuildId(request);
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });
    if (!isLocalBypass(request)) {
      const [guildAccess, botInGuild] = await Promise.all([
        getGuildAccess(session, guildId),
        botHasGuild(guildId),
      ]);
      if (!guildAccess.ok) {
        return NextResponse.json({
          error: 'Forbidden',
          reason: guildAccess.reason,
          details: guildAccess.reason === 'USER_NOT_IN_GUILD'
            ? 'You are not a member of this guild.'
            : 'You need Manage Server or Administrator permission in this guild.',
        }, { status: 403 });
      }
      if (!botInGuild) {
        return NextResponse.json({
          error: 'Forbidden',
          reason: 'BOT_NOT_IN_GUILD',
          details: 'Bot is not added to this guild. Add the bot first, then try again.',
        }, { status: 403 });
      }
    }
    let config = null;
    try {
      config = await (prismaBot as any).autoModConfig.findUnique({ where: { guild_id: guildId } });
    } catch (dbError) {
      if (!isMissingTableError(dbError)) throw dbError;
    }
    const fallback = {
        guild_id: guildId,
        enabled: false,
        ignore_admins: true,
        ignored_roles: [],
        ignored_users: [],
        ignored_channels: [],
        stop_on_trigger: true,
        log_channel_id: null,
      };
    const sourceConfig = config || fallback;
    const parsed = splitIgnoredRoles(sourceConfig.ignored_roles);
    return NextResponse.json({
      config: {
        ...sourceConfig,
        ignored_roles: parsed.roles,
        ignored_users: parsed.users,
      },
    });
  } catch (error) {
    console.error('automod config GET error', error);
    if (isDbUnavailableError(error)) {
      return NextResponse.json({
        config: {
          guild_id: resolveGuildId(request),
          enabled: false,
          ignore_admins: true,
          ignored_roles: [],
          ignored_users: [],
          ignored_channels: [],
          stop_on_trigger: true,
          log_channel_id: null,
        },
        warning: 'AutoMod database is unavailable. Showing fallback config.',
        reason: 'DB_UNAVAILABLE',
      });
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? String((error as any)?.message || error) : undefined,
    }, { status: 500 });
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });
    const body = await request.json();
    const guildId = resolveGuildId(request, body);
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });
    if (!isLocalBypass(request)) {
      const [guildAccess, botInGuild] = await Promise.all([
        getGuildAccess(session, guildId),
        botHasGuild(guildId),
      ]);
      if (!guildAccess.ok) {
        return NextResponse.json({
          error: 'Forbidden',
          reason: guildAccess.reason,
          details: guildAccess.reason === 'USER_NOT_IN_GUILD'
            ? 'You are not a member of this guild.'
            : 'You need Manage Server or Administrator permission in this guild.',
        }, { status: 403 });
      }
      if (!botInGuild) {
        return NextResponse.json({
          error: 'Forbidden',
          reason: 'BOT_NOT_IN_GUILD',
          details: 'Bot is not added to this guild. Add the bot first, then try again.',
        }, { status: 403 });
      }
    }
    const mergedIgnoredRoles = mergeIgnoredRoles(body.ignored_roles, body.ignored_users);
    const config = await (prismaBot as any).autoModConfig.upsert({
      where: { guild_id: guildId },
      create: {
        guild_id: guildId,
        enabled: Boolean(body.enabled),
        ignore_admins: body.ignore_admins !== false,
        ignored_roles: mergedIgnoredRoles,
        ignored_channels: Array.isArray(body.ignored_channels) ? body.ignored_channels : [],
        stop_on_trigger: body.stop_on_trigger !== false,
        log_channel_id: body.log_channel_id || null,
      },
      update: {
        ...(body.enabled !== undefined && { enabled: Boolean(body.enabled) }),
        ...(body.ignore_admins !== undefined && { ignore_admins: Boolean(body.ignore_admins) }),
        ...((body.ignored_roles !== undefined || body.ignored_users !== undefined) && { ignored_roles: mergedIgnoredRoles }),
        ...(body.ignored_channels !== undefined && { ignored_channels: Array.isArray(body.ignored_channels) ? body.ignored_channels : [] }),
        ...(body.stop_on_trigger !== undefined && { stop_on_trigger: Boolean(body.stop_on_trigger) }),
        ...(body.log_channel_id !== undefined && { log_channel_id: body.log_channel_id || null }),
      },
    });
    const parsed = splitIgnoredRoles(config.ignored_roles);
    return NextResponse.json({
      success: true,
      config: {
        ...config,
        ignored_roles: parsed.roles,
        ignored_users: parsed.users,
      },
    });
  } catch (error) {
    console.error('automod config PATCH error', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({
        error: 'AutoMod tables are not created in database yet. Run Prisma migration for omegle_web.',
      }, { status: 503 });
    }
    if (isDbUnavailableError(error)) {
      return NextResponse.json({
        error: 'AutoMod database is unavailable. Check BOT_DATABASE_URL credentials in omegle_web/.env.local.',
        reason: 'DB_UNAVAILABLE',
      }, { status: 503 });
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? String((error as any)?.message || error) : undefined,
    }, { status: 500 });
  }
}