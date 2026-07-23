// Admin: read/write Slot Machine configuration (game settings, betting limits,
// outcome probabilities, payout multipliers, and cosmetic symbols). Gated by
// casino access. Odds/payouts live here (server-only) and never reach players.

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { canAccessCasino } from '@/lib/apiAuth';
import { prismaBot } from '@/lib/prismaBot';
import { DEFAULT_SLOT_SYMBOLS } from '@/lib/gambling/slots/constants';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function defaultSymbols() {
  return DEFAULT_SLOT_SYMBOLS.map((s, i) => ({
    position: i,
    label: s.label,
    icon: s.icon,
    enabled: true,
  }));
}

const DEFAULT_CONFIG = {
  enabled: false,
  min_bet: 10,
  max_bet: 1000,
  default_bet: 50,
  quick_bets: [10, 25, 50, 100] as number[],
  prob_three: 15,
  prob_two: 35,
  prob_none: 50,
  payout_three: 3,
  payout_two: 1,
  payout_none: 0,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canAccessCasino(session.user.permissions)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const [config, symbols] = await Promise.all([
      prismaBot.slotConfig.findUnique({ where: { guild_id: GUILD_ID } }),
      prismaBot.slotSymbol.findMany({
        where: { guild_id: GUILD_ID },
        orderBy: { position: 'asc' },
      }),
    ]);

    return NextResponse.json(
      {
        config: config
          ? {
              enabled: config.enabled,
              min_bet: config.min_bet,
              max_bet: config.max_bet,
              default_bet: config.default_bet,
              quick_bets: config.quick_bets,
              prob_three: config.prob_three,
              prob_two: config.prob_two,
              prob_none: config.prob_none,
              payout_three: config.payout_three,
              payout_two: config.payout_two,
              payout_none: config.payout_none,
            }
          : DEFAULT_CONFIG,
        symbols:
          symbols.length > 0
            ? symbols.map((s) => ({
                position: s.position,
                label: s.label,
                icon: s.icon,
                enabled: s.enabled,
              }))
            : defaultSymbols(),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('Error fetching slot config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canAccessCasino(session.user.permissions)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      enabled,
      min_bet,
      max_bet,
      default_bet,
      quick_bets,
      prob_three,
      prob_two,
      prob_none,
      payout_three,
      payout_two,
      payout_none,
      symbols,
    } = body;

    // --- Betting limits ---
    const minBet = Math.floor(Number(min_bet));
    const maxBet = Math.floor(Number(max_bet));
    const defBet = Math.floor(Number(default_bet));
    if (!Number.isInteger(minBet) || minBet < 1) {
      return NextResponse.json({ error: 'min_bet must be an integer >= 1' }, { status: 400 });
    }
    if (!Number.isInteger(maxBet) || maxBet < minBet) {
      return NextResponse.json({ error: 'max_bet must be an integer >= min_bet' }, { status: 400 });
    }
    if (!Number.isInteger(defBet) || defBet < minBet || defBet > maxBet) {
      return NextResponse.json(
        { error: 'default_bet must be between min_bet and max_bet' },
        { status: 400 },
      );
    }

    // --- Quick bets ---
    if (!Array.isArray(quick_bets)) {
      return NextResponse.json({ error: 'quick_bets must be an array' }, { status: 400 });
    }
    const cleanQuickBets = Array.from(
      new Set(
        quick_bets
          .map((q: any) => Math.floor(Number(q)))
          .filter((q: number) => Number.isInteger(q) && q > 0),
      ),
    ).sort((a, b) => a - b);

    // --- Outcome probabilities: each 0..100, must total 100 ---
    const pThree = Math.floor(Number(prob_three));
    const pTwo = Math.floor(Number(prob_two));
    const pNone = Math.floor(Number(prob_none));
    for (const [name, v] of [
      ['prob_three', pThree],
      ['prob_two', pTwo],
      ['prob_none', pNone],
    ] as const) {
      if (!Number.isInteger(v) || v < 0 || v > 100) {
        return NextResponse.json({ error: `${name} must be an integer 0..100` }, { status: 400 });
      }
    }
    if (pThree + pTwo + pNone !== 100) {
      return NextResponse.json(
        { error: 'Outcome probabilities must total exactly 100%' },
        { status: 400 },
      );
    }

    // --- Payout multipliers: non-negative integers ---
    const payThree = Math.floor(Number(payout_three));
    const payTwo = Math.floor(Number(payout_two));
    const payNone = Math.floor(Number(payout_none));
    for (const [name, v] of [
      ['payout_three', payThree],
      ['payout_two', payTwo],
      ['payout_none', payNone],
    ] as const) {
      if (!Number.isInteger(v) || v < 0) {
        return NextResponse.json(
          { error: `${name} must be a non-negative integer` },
          { status: 400 },
        );
      }
    }

    // --- Symbols ---
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'At least one symbol is required' }, { status: 400 });
    }
    const cleanSymbols = symbols.map((s: any, i: number) => {
      const label = typeof s?.label === 'string' ? s.label.slice(0, 40) : '';
      const icon = typeof s?.icon === 'string' && s.icon.trim() ? s.icon.trim().slice(0, 200) : null;
      const symEnabled = s?.enabled !== false; // default true
      return { guild_id: GUILD_ID, position: i, label, icon, enabled: symEnabled };
    });
    // A symbol must have something to render.
    if (cleanSymbols.some((s) => !s.label && !s.icon)) {
      return NextResponse.json(
        { error: 'Each symbol must have a label or an icon' },
        { status: 400 },
      );
    }

    // Enough ENABLED symbols must exist to realise every configured outcome,
    // otherwise the engine cannot draw the required distinct symbols.
    const enabledCount = cleanSymbols.filter((s) => s.enabled).length;
    if (enabledCount < 1) {
      return NextResponse.json({ error: 'At least one symbol must be enabled' }, { status: 400 });
    }
    if (pTwo > 0 && enabledCount < 2) {
      return NextResponse.json(
        { error: 'At least 2 enabled symbols are required when Two-Matching probability is above 0%' },
        { status: 400 },
      );
    }
    if (pNone > 0 && enabledCount < 3) {
      return NextResponse.json(
        { error: 'At least 3 enabled symbols are required when No-Match probability is above 0%' },
        { status: 400 },
      );
    }

    await prismaBot.$transaction(async (tx) => {
      await tx.slotConfig.upsert({
        where: { guild_id: GUILD_ID },
        create: {
          guild_id: GUILD_ID,
          enabled: Boolean(enabled),
          min_bet: minBet,
          max_bet: maxBet,
          default_bet: defBet,
          quick_bets: cleanQuickBets,
          prob_three: pThree,
          prob_two: pTwo,
          prob_none: pNone,
          payout_three: payThree,
          payout_two: payTwo,
          payout_none: payNone,
        },
        update: {
          enabled: Boolean(enabled),
          min_bet: minBet,
          max_bet: maxBet,
          default_bet: defBet,
          quick_bets: cleanQuickBets,
          prob_three: pThree,
          prob_two: pTwo,
          prob_none: pNone,
          payout_three: payThree,
          payout_two: payTwo,
          payout_none: payNone,
        },
      });
      // Replace the full symbol set to match the desired configuration.
      await tx.slotSymbol.deleteMany({ where: { guild_id: GUILD_ID } });
      await tx.slotSymbol.createMany({ data: cleanSymbols });
    });

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error updating slot config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
