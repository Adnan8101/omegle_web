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
  return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${extension}?size=512`;
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
        cache.set(userId, { profile: data.user, expiresAt: Date.now() + CACHE_TTL_MS });
        return data.user;
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