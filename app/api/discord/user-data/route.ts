import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';

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
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
  const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

/**
 * Centralized user data fetching - no caching, fetch on demand from Discord API
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

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const limitedIds = userIds.slice(0, 100); // Limit to 100 users per request
    const results: Record<string, UserData> = {};

    // Fetch guild member data to get nicknames and roles (batch)
    const guildMembers = new Map<string, any>();
    try {
      // Try to fetch members in batches
      const memberPromises = limitedIds.map(async (userId) => {
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
        } catch (err) {
          console.error(`Failed to fetch member ${userId}:`, err);
        }
        return null;
      });

      const memberResults = await Promise.allSettled(memberPromises);
      memberResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          guildMembers.set(result.value.userId, result.value.member);
        }
      });
    } catch (error) {
      console.error('Error fetching guild members:', error);
    }

    // Fetch user data from Discord API
    const batchSize = 10;
    for (let i = 0; i < limitedIds.length; i += batchSize) {
      const batch = limitedIds.slice(i, i + batchSize);
      
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
        } catch (err) {
          console.error(`Failed to fetch user ${userId}:`, err);
        }
        
        // Return default for failed fetches
        return {
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
      });

      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results[result.value.id] = result.value;
        }
      });
    }

    return NextResponse.json({ users: results }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}
