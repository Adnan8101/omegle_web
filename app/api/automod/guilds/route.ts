import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';

const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD = 0x0000000000000020n;

const guildCache = new Map<string, { value: any[]; expiresAt: number }>();
const CACHE_TTL_MS = 20_000;

let cachedBotGuildIds: Set<string> | null = null;
let botGuildsCacheExpiresAt = 0;
const BOT_GUILDS_CACHE_TTL_MS = 5 * 60 * 1000;

function isLocalBypass(request: Request): boolean {
  void request;
  return process.env.AUTOMOD_DEV_BYPASS === 'true';
}

function hasAccess(session: any, request: Request): boolean {
  if (isLocalBypass(request)) return true;
  return Boolean(session?.user?.id);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasAccess(session, request)) return NextResponse.json({ error: 'Insufficient panel permissions for AutoMod.' }, { status: 403 });

    const cacheKey = String(session.user.id);
    const cached = guildCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ guilds: cached.value });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({
        guilds: [],
        error: 'Bot token is missing in environment variables.',
      });
    }

    let botGuildIds = cachedBotGuildIds;
    if (!botGuildIds || Date.now() > botGuildsCacheExpiresAt) {
      const botGuildRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }).catch(() => null);

      if (botGuildRes && botGuildRes.ok) {
        const botGuilds = await botGuildRes.json();
        botGuildIds = new Set((Array.isArray(botGuilds) ? botGuilds : []).map((g: any) => String(g.id)));
        cachedBotGuildIds = botGuildIds;
        botGuildsCacheExpiresAt = Date.now() + BOT_GUILDS_CACHE_TTL_MS;
      } else {
        botGuildIds = new Set();
      }
    }

    const token = session?.accessToken;
    let manageableGuilds: any[] = [];
    if (token) {
      const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }).catch(() => null);

      if (res && res.ok) {
        const guilds = await res.json();
        manageableGuilds = (Array.isArray(guilds) ? guilds : []).filter((g: any) => {
          try {
            const bits = BigInt(g.permissions || '0');
            return (bits & ADMINISTRATOR) !== 0n || (bits & MANAGE_GUILD) !== 0n || Boolean(g.owner) || String(g.id) === GUILD_ID;
          } catch {
            return Boolean(g.owner) || String(g.id) === GUILD_ID;
          }
        });
      }
    }

    const filtered = manageableGuilds
      .filter((g: any) => botGuildIds!.has(String(g.id)))
      .map((g: any) => ({
        id: String(g.id),
        name: String(g.name),
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` : null,
        description: typeof g.description === 'string' ? g.description : '',
      }));

    if (botGuildIds.has(GUILD_ID) && !filtered.some((g: any) => g.id === GUILD_ID)) {
      try {
        const primaryGuildRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
          headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (primaryGuildRes.ok) {
          const pg = await primaryGuildRes.json();
          filtered.push({
            id: String(pg.id),
            name: String(pg.name),
            icon: pg.icon ? `https://cdn.discordapp.com/icons/${pg.id}/${pg.icon}.png?size=256` : null,
            description: typeof pg.description === 'string' ? pg.description : '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch primary guild details for AutoMod:', err);
      }
    }

    filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));

    guildCache.set(cacheKey, {
      value: filtered,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ guilds: filtered });
  } catch (error) {
    console.error('automod guilds GET error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
