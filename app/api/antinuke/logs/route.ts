import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const guildId   = params.get('guildId') || '';
    const limitStr  = params.get('limit') || '50';
    const eventType = params.get('eventType') || '';

    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 50));

    const logs = await prismaBot.antiNukeLog.findMany({
      where: {
        guild_id: guildId,
        ...(eventType ? { event_type: eventType } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[antinuke/logs] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
