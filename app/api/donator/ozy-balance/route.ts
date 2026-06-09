import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const guildId = request.nextUrl.searchParams.get('guild_id')?.trim();
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
    }
    const [config, economyUser] = await Promise.all([
      (prismaBot as any).economyConfig.findUnique({
        where: { guild_id: guildId },
        select: { currency_name: true, currency_emoji: true, enabled: true },
      }),
      (prismaBot as any).economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: guildId, user_id: session.user.id } },
        select: { total_points: true },
      }),
    ]);
    return NextResponse.json({
      data: {
        balance: Number(economyUser?.total_points || 0),
        currency_name: config?.currency_name || 'Ozy',
        currency_emoji: config?.currency_emoji || '🪙',
        economy_enabled: Boolean(config?.enabled),
      },
    });
  } catch (error) {
    console.error('Error loading Ozy balance:', error);
    return NextResponse.json({ error: 'Failed to load Ozy balance' }, { status: 500 });
  }
}