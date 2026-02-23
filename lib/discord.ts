/**
 * Discord API Integration
 * Fetch user profiles, avatars, channel info, guild data
 */

const GUILD_ID = '910043773130661918';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
}

export interface DiscordMember {
  user: DiscordUser;
  nick: string | null;
  roles: string[];
  joined_at: string;
  _fromGuild?: boolean;
}

// Cache to avoid hitting Discord API repeatedly
const userCache = new Map<string, { data: DiscordMember | null; timestamp: number }>();
const channelCache = new Map<string, { data: DiscordChannel | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get Discord user info - tries guild member first, falls back to user API
 */
export async function getDiscordUser(userId: string): Promise<DiscordMember | null> {
  // Check cache
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!BOT_TOKEN) {
    console.warn('DISCORD_BOT_TOKEN not configured');
    return null;
  }

  try {
    // Try guild member first
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
        next: { revalidate: 300 },
      }
    );

    if (memberResponse.ok) {
      const member: DiscordMember = await memberResponse.json();
      member._fromGuild = true;
      userCache.set(userId, { data: member, timestamp: Date.now() });
      return member;
    }

    // Fallback: fetch user directly (works for non-guild users)
    const userResponse = await fetch(
      `https://discord.com/api/v10/users/${userId}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
        next: { revalidate: 300 },
      }
    );

    if (userResponse.ok) {
      const user: DiscordUser = await userResponse.json();
      // Wrap in a DiscordMember-like shape
      const fakeMember: DiscordMember = {
        user,
        nick: null,
        roles: [],
        joined_at: '',
        _fromGuild: false,
      };
      userCache.set(userId, { data: fakeMember, timestamp: Date.now() });
      return fakeMember;
    }

    // Both failed - cache null
    userCache.set(userId, { data: null, timestamp: Date.now() });
    return null;
  } catch (error: any) {
    console.error(`Error fetching Discord user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get multiple Discord users in parallel
 */
export async function getDiscordUsers(userIds: string[]): Promise<Map<string, DiscordMember | null>> {
  const results = await Promise.all(
    userIds.map(async (id) => ({ id, member: await getDiscordUser(id) }))
  );
  return new Map(results.map(({ id, member }) => [id, member]));
}

/**
 * Get Discord channel info
 */
export async function getDiscordChannel(channelId: string): Promise<DiscordChannel | null> {
  // Check cache
  const cached = channelCache.get(channelId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!BOT_TOKEN) {
    console.warn('DISCORD_BOT_TOKEN not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        channelCache.set(channelId, { data: null, timestamp: Date.now() });
        return null;
      }
      throw new Error(`Discord API error: ${response.status}`);
    }

    const channel: DiscordChannel = await response.json();
    channelCache.set(channelId, { data: channel, timestamp: Date.now() });
    return channel;
  } catch (error: any) {
    console.error(`Error fetching Discord channel ${channelId}:`, error.message);
    return null;
  }
}

/**
 * Get multiple Discord channels in parallel
 */
export async function getDiscordChannels(channelIds: string[]): Promise<Map<string, DiscordChannel | null>> {
  const results = await Promise.all(
    channelIds.map(async (id) => ({ id, channel: await getDiscordChannel(id) }))
  );
  return new Map(results.map(({ id, channel }) => [id, channel]));
}

/**
 * Get Discord avatar URL
 */
export function getAvatarUrl(user: DiscordUser, size = 128): string {
  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
  }
  // Default avatar based on discriminator
  const defaultAvatar = parseInt(user.discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
}

/**
 * Get display name (nickname > global_name > username)
 */
export function getDisplayName(member: DiscordMember): string {
  return member.nick || member.user.global_name || member.user.username;
}

/**
 * Format user tag (username#discriminator or @username)
 */
export function getUserTag(user: DiscordUser): string {
  if (user.discriminator === '0') {
    return `@${user.username}`;
  }
  return `${user.username}#${user.discriminator}`;
}
