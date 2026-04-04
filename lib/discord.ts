/**
 * Discord API Integration
 * Fetch user profiles, avatars, channel info, guild data
 */

const GUILD_ID = '910043773130661918';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

import { prismaBot } from '@/lib/prismaBot';

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

export interface DiscordGuildInfo {
  id: string;
  name: string;
  icon: string | null;
}

// Cache to avoid hitting Discord API repeatedly
const userCache = new Map<string, { data: DiscordMember | null; timestamp: number }>();
const channelCache = new Map<string, { data: DiscordChannel | null; timestamp: number }>();
const guildRoleCache = new Map<string, { data: Map<string, string>; timestamp: number }>();
const guildRolePromiseCache = new Map<string, Promise<any>>();
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
  if (!userIds || userIds.length === 0) return new Map();

  const results = new Map<string, DiscordMember | null>();
  const toFetch: string[] = [];

  for (const id of userIds) {
    const cached = userCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results.set(id, cached.data);
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length === 0) return results;

  try {
    const dbUsers = await (prismaBot as any).discordUserCache.findMany({
      where: { user_id: { in: toFetch } }
    });

    const foundInDb = new Set<string>();

    for (const dbU of dbUsers) {
      foundInDb.add(dbU.user_id);
      
      const fakeMember: DiscordMember = {
        user: {
          id: dbU.user_id,
          username: dbU.username,
          discriminator: dbU.discriminator || '0',
          avatar: dbU.avatar_url ? String(dbU.avatar_url).split('?')[0].split('/').pop()?.split('.')[0] || null : null,
          global_name: dbU.global_name || dbU.display_name || null,
        },
        nick: dbU.display_name || null,
        roles: [],
        joined_at: '',
        _fromGuild: false,
      };
      
      userCache.set(dbU.user_id, { data: fakeMember, timestamp: Date.now() });
      results.set(dbU.user_id, fakeMember);
    }

    const missingFromDb = toFetch.filter(id => !foundInDb.has(id));
    
    if (missingFromDb.length > 0) {
      const chunkSize = 5;
      for (let i = 0; i < missingFromDb.length; i += chunkSize) {
        const chunk = missingFromDb.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(
          chunk.map(async (id) => ({ id, member: await getDiscordUser(id) }))
        );
        for (const { id, member } of chunkResults) {
          results.set(id, member);
        }
      }
    }
  } catch (error) {
    console.error('getDiscordUsers DB fallback error:', error);
    for (const id of toFetch) {
      if (!results.has(id)) results.set(id, null);
    }
  }

  return results;
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
 * Get Discord user avatar URL (wrapper for getAvatarUrl)
 */
export function getDiscordUserAvatar(user: DiscordUser | undefined | null, size = 128): string | null {
  if (!user) return null;
  return getAvatarUrl(user, size);
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

/**
 * Send a DM to a user via the bot
 * @param userId The Discord user ID
 * @param content Text content to send
 * @param embed Optional embed to send
 * @returns true if sent successfully, false otherwise
 */
export async function sendDM(
  userId: string,
  options: {
    content?: string;
    embed?: {
      title?: string;
      description?: string;
      color?: number;
      fields?: { name: string; value: string; inline?: boolean }[];
      thumbnail?: { url: string };
      footer?: { text: string };
      timestamp?: string;
    };
  }
): Promise<{ success: boolean; error?: string }> {
  if (!BOT_TOKEN) {
    console.warn('DISCORD_BOT_TOKEN not configured');
    return { success: false, error: 'Bot token not configured' };
  }

  try {
    // Step 1: Create DM channel
    const channelResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
    });

    if (!channelResponse.ok) {
      const errorData = await channelResponse.json().catch(() => ({}));
      console.error('Failed to create DM channel:', errorData);
      return { success: false, error: 'Could not open DM channel - user may have DMs disabled' };
    }

    const channel = await channelResponse.json();

    // Step 2: Send message in the DM channel
    const messagePayload: any = {};
    if (options.content) {
      messagePayload.content = options.content;
    }
    if (options.embed) {
      messagePayload.embeds = [options.embed];
    }

    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      console.error('Failed to send DM:', errorData);
      return { success: false, error: 'Failed to send DM message' };
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error sending DM to ${userId}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function removeGuildMemberRole(userId: string, roleId: string, guildId?: string) {
  if (!BOT_TOKEN) return false;
  const targetGuild = guildId || GUILD_ID;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${targetGuild}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
    return res.ok;
  } catch(e) { return false; }
}

export async function addGuildMemberRole(userId: string, roleId: string, guildId?: string) {
  if (!BOT_TOKEN) return false;
  const targetGuild = guildId || GUILD_ID;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${targetGuild}/members/${userId}/roles/${roleId}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });
    return res.ok;
  } catch(e) { return false; }
}

export async function addGuildRole(guildId: string, userId: string, roleId: string) {
  return addGuildMemberRole(userId, roleId, guildId);
}

export async function sendDirectMessage(userId: string, content: string) {
  const result = await sendDM(userId, { content });
  return result.success;
}

export async function getGuildRoleName(guildId: string, roleId: string): Promise<string | null> {
  if (!BOT_TOKEN || !guildId || !roleId) return null;

  const cached = guildRoleCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.get(roleId) || null;
  }

  let promise = guildRolePromiseCache.get(guildId);
  if (!promise) {
    promise = fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .finally(() => guildRolePromiseCache.delete(guildId));
    guildRolePromiseCache.set(guildId, promise);
  }

  const roles = await promise;
  if (!Array.isArray(roles)) return null;

  const roleMap = new Map<string, string>();
  for (const role of roles) {
    if (role?.id && role?.name) {
      roleMap.set(String(role.id), String(role.name));
    }
  }

  guildRoleCache.set(guildId, { data: roleMap, timestamp: Date.now() });
  return roleMap.get(roleId) || null;
}

export async function getDiscordGuildInfo(guildId: string): Promise<DiscordGuildInfo | null> {
  if (!BOT_TOKEN || !guildId) return null;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const guild = await response.json();
    return {
      id: String(guild?.id || guildId),
      name: String(guild?.name || 'Discord Server'),
      icon: guild?.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
        : null,
    };
  } catch {
    return null;
  }
}
