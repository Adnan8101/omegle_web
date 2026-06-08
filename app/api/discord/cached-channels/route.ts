import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedChannels, getAllCachedChannels } from '@/lib/botDb';
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

    const limitedIds = [...new Set(channelIds)].slice(0, 500);
    const rows = await getCachedChannels(limitedIds);

    const channels: Record<string, any> = {};
    for (const row of rows) {
      channels[row.channel_id] = {
        id: row.channel_id,
        name: row.name,
        type: row.type,
        parentId: row.parent_id,
        parentName: row.parent_name,
        position: row.position,
        isDeleted: row.is_deleted,
        exists: !row.is_deleted,
      };
    }

    return NextResponse.json({ channels });
  } catch (error: unknown) {
    console.error('Error fetching cached channels:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch cached channels' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await getAllCachedChannels();
    const channels: Record<string, any> = {};
    for (const row of rows) {
      channels[row.channel_id] = {
        id: row.channel_id,
        name: row.name,
        type: row.type,
        parentId: row.parent_id,
        parentName: row.parent_name,
        position: row.position,
        isDeleted: row.is_deleted,
      };
    }

    return NextResponse.json({ channels });
  } catch (error: unknown) {
    console.error('Error fetching all cached channels:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}
