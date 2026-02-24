/**
 * @deprecated This endpoint returns cached user data which can be stale.
 * Use /api/discord/user-data instead for fresh data directly from Discord API.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUsersDisplay } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';

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

    // Use getUsersDisplay which returns proper avatar URLs
    const usersMap = await getUsersDisplay(limitedIds, 128);

    const results: Record<string, { id: string; username: string; displayName: string; avatar: string; inGuild: boolean; tag: string }> = {};

    // Convert Map to object
    usersMap.forEach((user, userId) => {
      results[userId] = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar, // Full URL
        inGuild: user.inGuild,
        tag: user.tag,
      };
    });

    return NextResponse.json({ users: results });
  } catch (error: unknown) {
    console.error('Error fetching cached users:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
