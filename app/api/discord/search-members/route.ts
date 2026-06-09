import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const GUILD_ID = "1507458872225566811";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to search members' }, { status: 500 });
    }
    const members = await response.json();
    const formattedMembers = members.map((member: any) => ({
      id: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      avatar: member.user.avatar,
      global_name: member.user.global_name,
    }));
    return NextResponse.json({ members: formattedMembers });
  } catch (error: any) {
    console.error('Error searching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}