import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getErrorMessage } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const discordRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      
      cache: 'no-store',
    });

    if (!discordRes.ok) {
      
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
      inGuild: true, 
      tag: discordUser.discriminator === '0' ? `@${discordUser.username}` : `${discordUser.username}#${discordUser.discriminator}`,
    });
  } catch (error: unknown) {
    console.error('Error fetching user from Discord:', getErrorMessage(error));
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
