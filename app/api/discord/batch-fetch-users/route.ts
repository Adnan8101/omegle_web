import { authOptions } from '@/lib/auth';
import { getCachedUsers } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
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
    if (avatarHash.startsWith('https://cdn.discordapp.com/')) {
      if (avatarHash.includes('?size=')) {
        return avatarHash.replace(/\?size=\d+/, `?size=${size}`);
      }
      return avatarHash;
    }
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
  const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}
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
    const limitedIds = userIds.slice(0, 100);
    const results: Record<string, UserDisplay> = {};
    const missingIds: string[] = [];
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
    if (missingIds.length > 0) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
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
            }
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