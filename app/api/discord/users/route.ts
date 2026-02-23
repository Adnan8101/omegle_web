import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDiscordUser, getAvatarUrl, getDisplayName, getUserTag } from '@/lib/discord';
import { getAvatarFallback, getErrorMessage } from '@/lib/constants';

/**
 * Batch resolve Discord users
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

    // Limit to 100 users per batch
    const limitedIds = userIds.slice(0, 100);

    const results: Record<string, { id: string; username: string; displayName: string; avatar: string; tag: string; inGuild: boolean }> = {};
    await Promise.all(
      limitedIds.map(async (userId: string) => {
        try {
          const member = await getDiscordUser(userId);
          if (member) {
            const inGuild = (member as unknown as Record<string, unknown>)._fromGuild !== false;
            results[userId] = {
              id: member.user.id,
              username: member.user.username,
              displayName: getDisplayName(member),
              avatar: getAvatarUrl(member.user, 128),
              tag: getUserTag(member.user),
              inGuild,
            };
          } else {
            results[userId] = {
              id: userId,
              username: 'Unknown User',
              displayName: 'Unknown User',
              avatar: getAvatarFallback(userId),
              tag: `User#${userId.slice(-4)}`,
              inGuild: false,
            };
          }
        } catch {
          results[userId] = {
            id: userId,
            username: 'Unknown User',
            displayName: 'Unknown User',
            avatar: `https://cdn.discordapp.com/embed/avatars/${parseInt(userId.slice(-4)) % 5}.png`,
            tag: `User#${userId.slice(-4)}`,
            inGuild: false,
          };
        }
      })
    );

    return NextResponse.json({ users: results });
  } catch (error: unknown) {
    console.error('Error batch fetching users:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
