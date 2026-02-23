import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedUsers } from '@/lib/botDb';
import { getAvatarFallback, getErrorMessage } from '@/lib/constants';

/**
 * Batch resolve users from the bot's discord_user_cache table.
 * This is faster than calling Discord API for each user since the bot
 * pre-caches all profiles on startup.
 * 
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

    const limitedIds = userIds.slice(0, 500);

    const cachedUsers = await getCachedUsers(limitedIds);

    const results: Record<string, { id: string; username: string; displayName: string; avatar: string; inGuild: boolean; nickname: string | null }> = {};

    // Add cached users
    for (const user of cachedUsers) {
      results[user.user_id] = {
        id: user.user_id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url || getAvatarFallback(user.user_id),
        inGuild: user.in_guild,
        nickname: user.nickname,
      };
    }

    // For any IDs not found in cache, return placeholder
    for (const id of limitedIds) {
      if (!results[id]) {
        results[id] = {
          id,
          username: 'Unknown User',
          displayName: 'Unknown User',
          avatar: getAvatarFallback(id),
          inGuild: false,
          nickname: null,
        };
      }
    }

    return NextResponse.json({ users: results });
  } catch (error: unknown) {
    console.error('Error fetching cached users:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
