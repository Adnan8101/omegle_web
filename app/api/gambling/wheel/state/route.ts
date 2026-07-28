

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { getChances } from '@/lib/gambling/chances';
import { WHEEL_GAME_KEY } from '@/lib/gambling/constants';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json({ error: 'You must be logged in to play' }, { status: 401 });
    }

    const [config, economyConfig, economyUser, chances] = await Promise.all([
      prismaBot.wheelConfig.findUnique({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyConfig.findUnique({
        where: { guild_id: GUILD_ID },
        select: { currency_name: true, currency_emoji: true },
      }),
      prismaBot.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
        select: { total_points: true },
      }),
      getChances(userId, WHEEL_GAME_KEY),
    ]);

    const enabled = config?.enabled ?? false;
    const currencyName = economyConfig?.currency_name || 'Ozy';
    const currencyEmoji = economyConfig?.currency_emoji || '🪙';

    if (!enabled) {
      return NextResponse.json(
        { enabled: false, disabled: true, currencyName, currencyEmoji },
        { headers: NO_STORE },
      );
    }

    const segments = await prismaBot.wheelSegment.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { position: 'asc' },
      select: { position: true, label: true, reward_amount: true, color: true, icon: true },
    });

    return NextResponse.json(
      {
        enabled,
        entryCost: config?.entry_cost ?? 50,
        segmentCount: config?.segment_count ?? segments.length,
        segments: segments.map((s) => ({
          position: s.position,
          label: s.label,
          reward: s.reward_amount,
          color: s.color,
          icon: s.icon,
        })),
        balance: economyUser?.total_points ?? 0,
        chances,
        currencyName,
        currencyEmoji,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('Error fetching wheel state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
