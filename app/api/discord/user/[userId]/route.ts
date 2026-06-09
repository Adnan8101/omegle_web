import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserDisplay } from '@/lib/botDb';
import { getDiscordUser, getAvatarUrl, getDisplayName, getUserTag } from '@/lib/discord';
import { getErrorMessage } from '@/lib/constants';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId || !/^\d{5,25}$/.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const cachedUser = await getUserDisplay(userId, 256);
    if (cachedUser && cachedUser.inGuild) {
      return NextResponse.json(cachedUser);
    }
    const member = await getDiscordUser(userId);
    if (!member) {
      return NextResponse.json(cachedUser);
    }
    const inGuild = member._fromGuild !== false;
    return NextResponse.json({
      id: member.user.id,
      username: member.user.username,
      displayName: getDisplayName(member),
      avatar: getAvatarUrl(member.user, 256),
      tag: getUserTag(member.user),
      nickname: member.nick,
      roles: member.roles,
      joinedAt: member.joined_at,
      inGuild,
    });
  } catch (error: unknown) {
    console.error('Error fetching Discord user:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}