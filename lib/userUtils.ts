/**
 * Unified User Utilities
 * Handles user data from cache, API, and forms consistently
 */

export interface CachedUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null; // Avatar hash (not full URL)
  global_name: string | null;
  discriminator: string;
  in_guild?: boolean;
  nickname?: string | null;
  roles?: string | null;
  joined_at?: string | null;
}

export interface UserDisplay {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // Full URL
  tag: string;
  inGuild: boolean;
}

/**
 * Build avatar URL from hash
 * Handles both avatar hashes and legacy full URLs that might be stored in the database
 */
export function buildAvatarUrl(userId: string, avatarHash: string | null, discriminator: string = '0', size: number = 128): string {
  if (avatarHash) {
    // Check if it's already a full URL (legacy data)
    if (avatarHash.startsWith('https://cdn.discordapp.com/')) {
      // Replace size parameter if present, otherwise just return
      if (avatarHash.includes('?size=')) {
        return avatarHash.replace(/\?size=\d+/, `?size=${size}`);
      }
      return avatarHash;
    }
    
    // It's a hash - build the URL
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
  
  // Default avatar calculation
  // For new usernames (discriminator = '0'), use user_id >> 22) % 6
  // For legacy users, use discriminator % 5
  if (discriminator === '0' || !discriminator) {
    if (!/^\d+$/.test(userId)) {
      return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    let defaultIndex = 0;
    try {
      defaultIndex = Number(BigInt(userId) >> 22n) % 6;
    } catch {
      defaultIndex = 0;
    }

    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  
  const parsedDiscriminator = parseInt(discriminator, 10);
  const defaultIndex = Number.isNaN(parsedDiscriminator) ? 0 : parsedDiscriminator % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

/**
 * Convert cached user to display format
 */
export function cachedUserToDisplay(user: CachedUser, size: number = 128): UserDisplay {
  return {
    id: user.user_id,
    username: user.username,
    displayName: user.nickname || user.display_name || user.global_name || user.username,
    avatar: buildAvatarUrl(user.user_id, user.avatar_url, user.discriminator, size),
    tag: user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`,
    inGuild: user.in_guild ?? false,
  };
}

/**
 * Get user display from cached user or return fallback
 */
export function getUserDisplay(cachedUser: CachedUser | null, userId: string, size: number = 128): UserDisplay {
  if (cachedUser) {
    return cachedUserToDisplay(cachedUser, size);
  }
  
  // Fallback for unknown user
  return {
    id: userId,
    username: 'Unknown User',
    displayName: 'Unknown User',
    avatar: buildAvatarUrl(userId, null, '0', size),
    tag: `Unknown#${userId.slice(-4)}`,
    inGuild: false,
  };
}

/**
 * Get display name priority: nickname > display_name > global_name > username
 */
export function getDisplayName(user: CachedUser): string {
  return user.nickname || user.display_name || user.global_name || user.username;
}

/**
 * Format user tag
 */
export function getUserTag(user: CachedUser): string {
  return user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`;
}
