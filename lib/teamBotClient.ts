import { getErrorMessage } from './constants';
export interface DiscordUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  banner: string | null;
  accentColor: string | null;
}
const cache = new Map<string, { profile: DiscordUserProfile; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 1000; 
function getAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=256`;
}
function getBannerUrl(userId: string, bannerHash: string | null): string | null {
  if (!bannerHash) return null;
  const extension = bannerHash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${extension}?size=1024`;
}

/**
 * Force a `size` on a Discord CDN asset. Profiles reaching us from the bot's
 * HTTP API are built there, so their banners often arrive at the CDN default —
 * far too small once a banner is stretched across a card. Rewriting the query
 * here means both paths hand the UI the same crisp URL.
 */
function withCdnSize(url: string | null | undefined, size: number): string | null {
  if (!url) return null;
  if (!url.startsWith('https://cdn.discordapp.com/')) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('size', String(size));
    return parsed.toString();
  } catch {
    return url; // Malformed URL — better the original than nothing.
  }
}

/** Banners get stretched wide, avatars stay small: size each accordingly. */
function withSizedAssets(profile: DiscordUserProfile): DiscordUserProfile {
  return {
    ...profile,
    avatar: withCdnSize(profile.avatar, 256),
    banner: withCdnSize(profile.banner, 1024),
  };
}
export async function getLiveUserProfile(userId: string): Promise<DiscordUserProfile | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.profile;
  }
  try {
    const botApiPort = process.env.BOT_API_PORT || '3002';
    const response = await fetch(`http://localhost:${botApiPort}/api/user/${userId}`, {
      signal: AbortSignal.timeout(3000), 
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        const profile = withSizedAssets(data.user);
        cache.set(userId, { profile, expiresAt: Date.now() + CACHE_TTL_MS });
        return profile;
      }
    }
  } catch (error) {
    console.warn(`[teamBotClient] Failed to fetch from bot HTTP API on port ${process.env.BOT_API_PORT || '3002'}, falling back to direct Discord API:`, getErrorMessage(error));
  }
  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken) {
    console.warn('[teamBotClient] No DISCORD_BOT_TOKEN or BOT_TOKEN configured, cannot query Discord API directly.');
    return null;
  }
  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Discord API responded with status ${response.status}`);
    }
    const user = await response.json();
    const profile: DiscordUserProfile = {
      id: user.id,
      username: user.username,
      displayName: user.global_name || user.username,
      avatar: getAvatarUrl(user.id, user.avatar),
      banner: getBannerUrl(user.id, user.banner),
      accentColor: user.accent_color ? `#${user.accent_color.toString(16).padStart(6, '0')}` : null,
    };
    cache.set(userId, { profile, expiresAt: Date.now() + CACHE_TTL_MS });
    return profile;
  } catch (error) {
    console.error(`[teamBotClient] Direct Discord API fallback failed for user ${userId}:`, getErrorMessage(error));
    return null;
  }
}
export async function getLiveUserProfiles(userIds: string[]): Promise<Map<string, DiscordUserProfile | null>> {
  const result = new Map<string, DiscordUserProfile | null>();
  if (userIds.length === 0) return result;
  const profiles = await Promise.all(
    userIds.map(async (id) => {
      const profile = await getLiveUserProfile(id);
      return { id, profile };
    })
  );
  profiles.forEach(({ id, profile }) => {
    result.set(id, profile);
  });
  return result;
}