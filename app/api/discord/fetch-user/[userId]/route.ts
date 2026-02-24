import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getErrorMessage } from '@/lib/constants';

/**
 * Fetch user directly from Discord API (not from cache)
 * This is useful when cache doesn't have the user or avatar is broken
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId;
    
    // Fetch directly from Discord API
    const discordRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      // Don't cache this response
      cache: 'no-store',
    });

    if (!discordRes.ok) {
      // Return default user if Discord API fails
      const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
      return NextResponse.json({
        id: userId,
        username: 'Unknown User',
        displayName: 'Unknown User',
        avatar: `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`,
        inGuild: false,
        tag: `Unknown#${userId.slice(-4)}`,
      });
    }

    const discordUser = await discordRes.json();
    
    // Build avatar URL
    let avatarUrl: string;
    if (discordUser.avatar) {
      const extension = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.${extension}?size=128`;
    } else {
      const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    return NextResponse.json({
      id: userId,
      username: discordUser.username,
      displayName: discordUser.global_name || discordUser.username,
      avatar: avatarUrl,
      inGuild: true, // We can't determine this from user endpoint
      tag: discordUser.discriminator === '0' ? `@${discordUser.username}` : `${discordUser.username}#${discordUser.discriminator}`,
    });
  } catch (error: unknown) {
    console.error('Error fetching user from Discord:', getErrorMessage(error));
    const userId = params.userId;
    const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
    return NextResponse.json({
      id: userId,
      username: 'Unknown User',
      displayName: 'Unknown User',
      avatar: `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`,
      inGuild: false,
      tag: `Unknown#${userId.slice(-4)}`,
    });
  }
}
