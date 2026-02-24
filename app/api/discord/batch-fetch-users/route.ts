/**
 * @deprecated This endpoint is deprecated. Use /api/discord/user-data instead.
 * This endpoint fetches from cache first which can return stale data.
 * The new /api/discord/user-data endpoint fetches fresh data directly from Discord API.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedUsers } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';

interface UserDisplay {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  inGuild: boolean;
  tag: string;
}

function buildAvatarUrl(userId: string, avatarHash: string | null, size: number = 128): string {
  if (avatarHash) {
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
  const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

/**
 * Batch fetch users - first from cache, then from Discord API for missing users
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

    const limitedIds = userIds.slice(0, 100); // Limit to 100 users
    const results: Record<string, UserDisplay> = {};
    const missingIds: string[] = [];

    // First, try to get from cache
    try {
      const cachedUsers = await getCachedUsers(limitedIds);
      const cachedMap = new Map(cachedUsers.map((u: any) => [u.user_id, u]));

      for (const userId of limitedIds) {
        const cached = cachedMap.get(userId);
        if (cached && cached.username) {
          results[userId] = {
            id: userId,
            username: cached.username,
            displayName: cached.nickname || cached.display_name || cached.global_name || cached.username,
            avatar: buildAvatarUrl(userId, cached.avatar_url, 128),
            inGuild: cached.in_guild ?? false,
            tag: cached.discriminator === '0' ? `@${cached.username}` : `${cached.username}#${cached.discriminator}`,
          };
        } else {
          missingIds.push(userId);
        }
      }
    } catch (error) {
      console.error('Error fetching from cache:', getErrorMessage(error));
      missingIds.push(...limitedIds);
    }

    // Fetch missing users from Discord API
    if (missingIds.length > 0) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        // Fetch in parallel (but limit concurrent requests)
        const batchSize = 10;
        for (let i = 0; i < missingIds.length; i += batchSize) {
          const batch = missingIds.slice(i, i + batchSize);
          const promises = batch.map(async (userId) => {
            try {
              const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
                headers: { Authorization: `Bot ${botToken}` },
                cache: 'no-store',
              });
              if (res.ok) {
                const user = await res.json();
                return {
                  id: userId,
                  username: user.username,
                  displayName: user.global_name || user.username,
                  avatar: buildAvatarUrl(userId, user.avatar, 128),
                  inGuild: true,
                  tag: user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`,
                };
              }
            } catch {
              // Ignore errors
            }
            // Return default for failed fetches
            return {
              id: userId,
              username: 'Unknown User',
              displayName: 'Unknown User',
              avatar: buildAvatarUrl(userId, null, 128),
              inGuild: false,
              tag: `Unknown#${userId.slice(-4)}`,
            };
          });

          const batchResults = await Promise.all(promises);
          for (const user of batchResults) {
            if (user) {
              results[user.id] = user;
            }
          }
        }
      } else {
        // No bot token, return defaults
        for (const userId of missingIds) {
          results[userId] = {
            id: userId,
            username: 'Unknown User',
            displayName: 'Unknown User',
            avatar: buildAvatarUrl(userId, null, 128),
            inGuild: false,
            tag: `Unknown#${userId.slice(-4)}`,
          };
        }
      }
    }

    return NextResponse.json({ users: results });
  } catch (error: unknown) {
    console.error('Error in batch fetch:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
