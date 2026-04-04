import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

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
  return message.includes('automod_rules') && (message.includes('does not exist') || message.includes('no such table') || message.includes('table'));
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

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(max, Math.max(min, rounded));
}

function normalizeActions(raw: any): Record<string, unknown> {
  const source = (raw && typeof raw === 'object') ? raw : {};
  const hasMute = Boolean(source.mute);
  const hasWarn = Boolean(source.warn);
  const muteDurationMinutes = hasMute
    ? clampInt(source.muteDurationMinutes ?? (Number(source.muteDurationMs) / 60_000), 10, 1, 40_320)
    : undefined;

  return {
    delete: Boolean(source.delete),
    warn: hasWarn,
    mute: hasMute,
    kick: Boolean(source.kick),
    ban: Boolean(source.ban),
    ...(typeof source.warnMessage === 'string' && source.warnMessage.trim().length > 0 ? { warnMessage: source.warnMessage.trim() } : {}),
    ...(muteDurationMinutes !== undefined ? {
      muteDurationMinutes,
      muteDurationMs: muteDurationMinutes * 60_000,
    } : {}),
  };
}

function normalizeSettings(ruleType: unknown, raw: any): Record<string, unknown> {
  const source = (raw && typeof raw === 'object') ? raw : {};
  const type = String(ruleType || '');
  if (type !== 'links') {
    return source;
  }

  const allowlist = [
    ...(Array.isArray(source.allowlist) ? source.allowlist : []),
    ...(Array.isArray(source.domains) ? source.domains : []),
  ]
    .map((v) => String(v).trim())
    .filter(Boolean);

  return {
    ...source,
    allowlist,
  };
}

async function ensureGuildAccess(request: NextRequest, session: any, guildId: string) {
  if (isLocalBypass(request)) return null;

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

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });

    const guildId = resolveGuildId(request);
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const accessError = await ensureGuildAccess(request, session, guildId);
    if (accessError) return accessError;

    const rules = await (prismaBot as any).autoModRule.findMany({
      where: { guild_id: guildId },
      orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('automod rules GET error', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({ rules: [] });
    }
    if (isDbUnavailableError(error)) {
      return NextResponse.json({
        rules: [],
        warning: 'AutoMod database is unavailable. Showing empty rules list.',
        reason: 'DB_UNAVAILABLE',
      });
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? String((error as any)?.message || error) : undefined,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });

    const body = await request.json();
    const guildId = resolveGuildId(request, body);
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const accessError = await ensureGuildAccess(request, session, guildId);
    if (accessError) return accessError;

    const rule = await (prismaBot as any).autoModRule.create({
      data: {
        guild_id: guildId,
        name: String(body.name || 'New Rule'),
        type: String(body.type || 'bad_words'),
        enabled: body.enabled !== false,
        priority: Number(body.priority ?? 100),
        stop_on_trigger: body.stop_on_trigger !== false,
        settings: normalizeSettings(body.type, body.settings ?? {}),
        actions: normalizeActions(body.actions ?? { delete: true, warn: true }),
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error('automod rules POST error', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'AutoMod tables are not created in database yet. Run Prisma migration for omegle_web.' }, { status: 503 });
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });

    const body = await request.json();
    const guildId = resolveGuildId(request, body);
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const accessError = await ensureGuildAccess(request, session, guildId);
    if (accessError) return accessError;

    if (!body.id) return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });

    const existing = await (prismaBot as any).autoModRule.findFirst({
      where: { id: String(body.id), guild_id: guildId },
      select: { id: true, type: true },
    });
    if (!existing) return NextResponse.json({ error: 'Rule not found for guild' }, { status: 404 });

    const rule = await (prismaBot as any).autoModRule.update({
      where: { id: String(body.id) },
      data: {
        ...(body.name !== undefined && { name: String(body.name) }),
        ...(body.type !== undefined && { type: String(body.type) }),
        ...(body.enabled !== undefined && { enabled: Boolean(body.enabled) }),
        ...(body.priority !== undefined && { priority: Number(body.priority) }),
        ...(body.stop_on_trigger !== undefined && { stop_on_trigger: Boolean(body.stop_on_trigger) }),
        ...(body.settings !== undefined && { settings: normalizeSettings(body.type ?? existing.type, body.settings) }),
        ...(body.actions !== undefined && { actions: normalizeActions(body.actions) }),
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error('automod rules PUT error', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'AutoMod tables are not created in database yet. Run Prisma migration for omegle_web.' }, { status: 503 });
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });

    const id = request.nextUrl.searchParams.get('id');
    const guildId = resolveGuildId(request);
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const accessError = await ensureGuildAccess(request, session, guildId);
    if (accessError) return accessError;

    if (!id) return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });

    const existing = await (prismaBot as any).autoModRule.findFirst({
      where: { id, guild_id: guildId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Rule not found for guild' }, { status: 404 });

    await (prismaBot as any).autoModRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('automod rules DELETE error', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'AutoMod tables are not created in database yet. Run Prisma migration for omegle_web.' }, { status: 503 });
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
