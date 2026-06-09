import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDiscordChannel } from '@/lib/discord';
import { getErrorMessage } from '@/lib/constants';
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { channelIds } = await request.json();
    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json({ error: 'channelIds array required' }, { status: 400 });
    }
    const limitedIds = [...new Set(channelIds)].slice(0, 100);
    const results: Record<string, { id: string; name: string; type: number; parentId?: string | null; exists: boolean }> = {};
    await Promise.all(
      limitedIds.map(async (channelId: string) => {
        try {
          const channel = await getDiscordChannel(channelId);
          if (channel) {
            results[channelId] = {
              id: channel.id,
              name: channel.name,
              type: channel.type,
              parentId: channel.parent_id,
              exists: true,
            };
          } else {
            results[channelId] = {
              id: channelId,
              name: `Deleted Channel`,
              type: 2,
              exists: false,
            };
          }
        } catch {
          results[channelId] = {
            id: channelId,
            name: `Channel ${channelId.slice(-6)}`,
            type: 2,
            exists: false,
          };
        }
      })
    );
    return NextResponse.json({ channels: results });
  } catch (error: unknown) {
    console.error('Error batch fetching channels:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}