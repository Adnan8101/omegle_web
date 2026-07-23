// Player: current Slot Machine state — public config (NO odds/payouts), the
// enabled cosmetic symbol pool, and the viewer's OZY balance. Requires login.

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { DEV_ACCESS_HEADER, isDevPassword } from '@/lib/gambling/devAccess';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in to play' }, { status: 401 });
    }
    const userId = session.user.id;
    const devBypass = isDevPassword(request.headers.get(DEV_ACCESS_HEADER));

    const [config, economyConfig, economyUser] = await Promise.all([
      prismaBot.slotConfig.findUnique({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyConfig.findUnique({
        where: { guild_id: GUILD_ID },
        select: { currency_name: true, currency_emoji: true },
      }),
      prismaBot.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
        select: { total_points: true },
      }),
    ]);

    const enabled = config?.enabled ?? false;
    const currencyName = economyConfig?.currency_name || 'Ozy';
    const currencyEmoji = economyConfig?.currency_emoji || '🪙';

    // Game off + not a developer → tell the client to show "Game Currently Disabled".
    if (!enabled && !devBypass) {
      return NextResponse.json(
        { enabled: false, disabled: true, currencyName, currencyEmoji },
        { headers: NO_STORE },
      );
    }

    const symbols = await prismaBot.slotSymbol.findMany({
      where: { guild_id: GUILD_ID, enabled: true },
      orderBy: { position: 'asc' },
      // NOTE: no odds/probabilities exist on symbols — they are purely cosmetic.
      select: { label: true, icon: true },
    });

    return NextResponse.json(
      {
        enabled,
        devBypass: devBypass && !enabled,
        minBet: config?.min_bet ?? 10,
        maxBet: config?.max_bet ?? 1000,
        defaultBet: config?.default_bet ?? 50,
        quickBets: config?.quick_bets ?? [10, 25, 50, 100],
        symbols: symbols.map((s) => ({ label: s.label, icon: s.icon })),
        balance: economyUser?.total_points ?? 0,
        currencyName,
        currencyEmoji,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('Error fetching slot state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
