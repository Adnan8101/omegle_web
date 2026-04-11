import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedUsers } from '@/lib/botDb';
import { GUILD_ID, getErrorMessage } from '@/lib/constants';

interface UserData {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  discriminator: string;
  globalName: string | null;
  bot: boolean;
  inGuild: boolean;
  nickname: string | null;
  roles: string[];
  joinedAt: string | null;
}

function buildAvatarUrl(userId: string, avatarHash: string | null, size: number = 128): string {
  if (avatarHash) {
    // Check if it's already a full URL (legacy data)
    if (avatarHash.startsWith('https://cdn.discordapp.com/')) {
      if (avatarHash.includes('?size=')) {
        return avatarHash.replace(/\?size=\d+/, `?size=${size}`);
      }
      return avatarHash;
    }
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
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

/**
 * Centralized user data fetching
 * Strategy: Cache first, Discord API fallback for missing users
 * POST body: { userIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds } = await request.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
    }

    const limitedIds = [...new Set(
      userIds
        .map((id) => (typeof id === 'string' ? id.trim() : String(id ?? '').trim()))
        .filter((id) => /^\d{5,25}$/.test(id))
    )].slice(0, 500); // Limit to 500 users per request

    if (limitedIds.length === 0) {
      return NextResponse.json({ users: {} }, { status: 200 });
    }
    const results: Record<string, UserData> = {};

    // Step 1: Try to get users from cache first (fast and reliable)
    try {
      const cachedUsers = await getCachedUsers(limitedIds);

      for (const cached of cachedUsers) {
        if (cached && cached.username) {
          // Parse roles if stored as JSON string
          let roles: string[] = [];
          if (cached.roles) {
            try {
              roles = JSON.parse(cached.roles);
            } catch {
              roles = [];
            }
          }

          results[cached.user_id] = {
            id: cached.user_id,
            username: cached.username,
            displayName: cached.nickname || cached.display_name || cached.global_name || cached.username,
            avatar: buildAvatarUrl(cached.user_id, cached.avatar_url, 128),
            discriminator: cached.discriminator || '0',
            globalName: cached.global_name || null,
            bot: false,
            inGuild: cached.in_guild ?? false,
            nickname: cached.nickname || null,
            roles,
            joinedAt: cached.joined_at || null,
          };
        }
      }
    } catch (cacheError) {
      console.error('[user-data] Cache query failed:', getErrorMessage(cacheError));
      // Continue to API fallback
    }

    // Step 2: Find missing users and fetch from Discord API
    const missingIds = limitedIds.filter(id => !results[id]);

    if (missingIds.length > 0) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        // Fetch guild members for those who might be in guild
        const guildMembers = new Map<string, any>();
        try {
          const memberPromises = missingIds.slice(0, 100).map(async (userId) => {
            try {
              const res = await fetch(
                `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
                {
                  headers: { Authorization: `Bot ${botToken}` },
                  cache: 'no-store',
                }
              );
              if (res.ok) {
                const member = await res.json();
                return { userId, member };
              }
            } catch {
              // Ignore individual failures
            }
            return null;
          });

          const memberResults = await Promise.allSettled(memberPromises);
          memberResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              guildMembers.set(result.value.userId, result.value.member);
            }
          });
        } catch {
          // Ignore batch member fetch errors
        }

        // Fetch user profiles from Discord API
        const batchSize = 10;
        for (let i = 0; i < missingIds.length && i < 100; i += batchSize) {
          const batch = missingIds.slice(i, i + batchSize);
          
          const promises = batch.map(async (userId) => {
            try {
              const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
                headers: { Authorization: `Bot ${botToken}` },
                cache: 'no-store',
              });
              
              if (res.ok) {
                const user = await res.json();
                const member = guildMembers.get(userId);
                const inGuild = !!member;
                
                return {
                  id: userId,
                  username: user.username,
                  displayName: member?.nick || user.global_name || user.username,
                  avatar: buildAvatarUrl(userId, user.avatar, 128),
                  discriminator: user.discriminator || '0',
                  globalName: user.global_name || null,
                  bot: user.bot || false,
                  inGuild,
                  nickname: member?.nick || null,
                  roles: member?.roles || [],
                  joinedAt: member?.joined_at || null,
                };
              }
            } catch {
              // Ignore individual fetch errors
            }
            return null;
          });

          const batchResults = await Promise.allSettled(promises);
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              results[result.value.id] = result.value;
            }
          });

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < missingIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // Fill in defaults for any remaining missing users
      for (const userId of missingIds) {
        if (!results[userId]) {
          results[userId] = {
            id: userId,
            username: 'Unknown User',
            displayName: 'Unknown User',
            avatar: buildAvatarUrl(userId, null, 128),
            discriminator: '0',
            globalName: null,
            bot: false,
            inGuild: false,
            nickname: null,
            roles: [],
            joinedAt: null,
          };
        }
      }
    }

    return NextResponse.json({ users: results }, { status: 200 });
  } catch (error: unknown) {
    console.error('[user-data] Error:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}
