

export interface CachedUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null; 
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
  avatar: string; 
  tag: string;
  inGuild: boolean;
}

export function buildAvatarUrl(userId: string, avatarHash: string | null, discriminator: string = '0', size: number = 128): string {
  if (avatarHash) {
    
    if (avatarHash.startsWith('https://cdn.discordapp.com/')) {
      
      if (avatarHash.includes('?size=')) {
        return avatarHash.replace(/\?size=\d+/, `?size=${size}`);
      }
      return avatarHash;
    }
    
    
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
  
  
  
  
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

export function getUserDisplay(cachedUser: CachedUser | null, userId: string, size: number = 128): UserDisplay {
  if (cachedUser) {
    return cachedUserToDisplay(cachedUser, size);
  }
  
  
  return {
    id: userId,
    username: 'Unknown User',
    displayName: 'Unknown User',
    avatar: buildAvatarUrl(userId, null, '0', size),
    tag: `Unknown#${userId.slice(-4)}`,
    inGuild: false,
  };
}

export function getDisplayName(user: CachedUser): string {
  return user.nickname || user.display_name || user.global_name || user.username;
}

export function getUserTag(user: CachedUser): string {
  return user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`;
}
