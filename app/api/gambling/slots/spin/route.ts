// Player: perform a slot spin. The BACKEND is the single source of truth for
// the outcome — it validates the bet, deducts it, picks the outcome by the
// admin-configured probabilities, chooses cosmetic symbols, credits the reward,
// records history and returns the reels. The frontend merely animates to those
// symbols; it can never influence the result (spec §7, §8).
//
// Security (spec §13):
//   - Backend-only CSPRNG (lib/gambling/slots/engine.ts)
//   - Atomic wallet debit/credit inside a single $transaction (no overdraw)
//   - Anti-replay / anti double-click via a per-user client_nonce unique key
//   - Per-user rate limit (MIN_SPIN_INTERVAL_MS) against the last spin
//   - Full server-side validation of the bet

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { spendOzy, awardOzy, InsufficientBalanceError } from '@/lib/gambling/wallet';
import { pickOutcome, generateReels, computeReward } from '@/lib/gambling/slots/engine';
import { SLOTS_SOURCE, MIN_SPIN_INTERVAL_MS } from '@/lib/gambling/slots/constants';
import { DEV_ACCESS_HEADER, isDevPassword } from '@/lib/gambling/devAccess';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in to spin' }, { status: 401 });
    }
    const userId = session.user.id;
    const devBypass = isDevPassword(request.headers.get(DEV_ACCESS_HEADER));

    const body = await request.json().catch(() => ({}));
    const bet = Math.floor(Number(body?.bet));
    const nonce = typeof body?.nonce === 'string' ? body.nonce.slice(0, 100) : '';

    if (!nonce) {
      return NextResponse.json({ error: 'Missing spin token' }, { status: 400 });
    }
    if (!Number.isFinite(bet) || bet <= 0) {
      return NextResponse.json({ error: 'Bet must be a positive amount' }, { status: 400 });
    }

    const config = await prismaBot.slotConfig.findUnique({ where: { guild_id: GUILD_ID } });
    if (!config?.enabled && !devBypass) {
      return NextResponse.json({ error: 'Game Currently Disabled' }, { status: 403 });
    }
    if (!config) {
      return NextResponse.json(
        { error: 'The slot machine has not been configured yet.', code: 'NOT_CONFIGURED' },
        { status: 400 },
      );
    }

    // Bet-bounds validation (balance is enforced atomically below).
    if (bet < config.min_bet) {
      return NextResponse.json(
        { error: `Minimum bet is ${config.min_bet}`, code: 'BELOW_MIN' },
        { status: 400 },
      );
    }
    if (bet > config.max_bet) {
      return NextResponse.json(
        { error: `Maximum bet is ${config.max_bet}`, code: 'ABOVE_MAX' },
        { status: 400 },
      );
    }

    // Rate limit (§13): reject a spin fired too soon after the previous one.
    const lastSpin = await prismaBot.slotSpin.findFirst({
      where: { guild_id: GUILD_ID, user_id: userId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });
    if (lastSpin && Date.now() - lastSpin.created_at.getTime() < MIN_SPIN_INTERVAL_MS) {
      return NextResponse.json(
        { error: 'You are spinning too fast. Slow down.', code: 'RATE_LIMITED' },
        { status: 429 },
      );
    }

    const result = await prismaBot.$transaction(async (tx) => {
      // Read config + enabled symbols fresh inside the tx (server-only odds).
      const cfg = await tx.slotConfig.findUnique({ where: { guild_id: GUILD_ID } });
      if (!cfg) throw new Error('NOT_CONFIGURED');

      const symbols = await tx.slotSymbol.findMany({
        where: { guild_id: GUILD_ID, enabled: true },
        orderBy: { position: 'asc' },
        select: { label: true, icon: true },
      });
      if (symbols.length === 0) throw new Error('NO_SYMBOLS');

      // Balance before any movement.
      const before = await tx.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
        select: { total_points: true },
      });
      const balanceBefore = before?.total_points ?? 0;

      // Deduct the bet atomically — throws InsufficientBalanceError if short.
      await spendOzy(tx, userId, bet, `Slot Machine — bet ${bet} OZY`, SLOTS_SOURCE);

      // Backend decides the outcome, then the cosmetic reels.
      const outcome = pickOutcome(cfg);
      const reels = generateReels(outcome, symbols);
      const reward = computeReward(outcome, bet, cfg);

      const balanceAfter = await awardOzy(
        tx,
        userId,
        reward,
        `Slot Machine — ${outcome} won ${reward} OZY (bet ${bet})`,
        SLOTS_SOURCE,
      );
      const profit = reward - bet;

      // Persisting the spin also enforces anti-replay: a duplicate
      // (guild_id, user_id, client_nonce) throws P2002 and rolls back the
      // whole transaction, so a replayed request can never debit twice.
      const spin = await tx.slotSpin.create({
        data: {
          guild_id: GUILD_ID,
          user_id: userId,
          bet_amount: bet,
          reward_amount: reward,
          profit,
          outcome,
          reels: reels as unknown as Prisma.InputJsonValue,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          client_nonce: nonce,
        },
        select: { id: true },
      });

      return {
        reels: reels.map((r) => ({ label: r.label, icon: r.icon })),
        outcome,
        reward,
        profit,
        balance: balanceAfter,
        spinId: spin.id,
      };
    });

    return NextResponse.json({ success: true, ...result }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: 'Insufficient balance for that bet.', code: 'INSUFFICIENT_BALANCE' },
        { status: 400 },
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Duplicate client_nonce — replayed or double-clicked spin.
      return NextResponse.json(
        { error: 'Duplicate spin ignored.', code: 'DUPLICATE' },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'The slot machine has not been configured yet.', code: 'NOT_CONFIGURED' },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'NO_SYMBOLS') {
      return NextResponse.json(
        { error: 'The slot machine has no enabled symbols.', code: 'NO_SYMBOLS' },
        { status: 400 },
      );
    }
    console.error('Error spinning slot machine:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
