import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDiscordChannel } from '@/lib/discord';

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { channelId } = params;
    const channel = await getDiscordChannel(channelId);

    if (!channel) {
      return NextResponse.json({
        id: channelId,
        name: 'Deleted Channel',
        type: 2, // Voice channel
        exists: false,
      });
    }

    return NextResponse.json({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parent_id,
      exists: true,
    });
  } catch (error: unknown) {
    console.error('Error fetching Discord channel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel data' },
      { status: 500 }
    );
  }
}
