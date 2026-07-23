// Player: perform a spin. The BACKEND is the single source of truth for the
// outcome — it consumes a chance, picks the winning segment by weighted random,
// credits the reward, records history, and returns the winning index. The
// frontend merely animates the wheel to that index; it can never influence it.

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { consumeChance, NoChancesError } from '@/lib/gambling/chances';
import { awardOzy } from '@/lib/gambling/wallet';
import { pickWinningIndex } from '@/lib/gambling/wheel/engine';
import { WHEEL_GAME_KEY } from '@/lib/gambling/constants';
import { DEV_ACCESS_HEADER, isDevPassword } from '@/lib/gambling/devAccess';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

    const config = await prismaBot.wheelConfig.findUnique({ where: { guild_id: GUILD_ID } });
    if (!config?.enabled && !devBypass) {
      return NextResponse.json({ error: 'Game Currently Disabled' }, { status: 403 });
    }

    const result = await prismaBot.$transaction(async (tx) => {
      // Segments must be read fresh inside the transaction (server-only weights).
      const segments = await tx.wheelSegment.findMany({
        where: { guild_id: GUILD_ID },
        orderBy: { position: 'asc' },
      });
      if (segments.length === 0) {
        throw new Error('NOT_CONFIGURED');
      }

      // Consume a spin chance atomically — throws if the user has none.
      const remainingChances = await consumeChance(tx, userId, WHEEL_GAME_KEY);

      // Backend decides the winner.
      const winningIndex = pickWinningIndex(segments);
      const winning = segments[winningIndex];
      const reward = Math.max(0, winning.reward_amount);

      // Balance before payout (entry cost was already spent at purchase time).
      const before = await tx.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
        select: { total_points: true },
      });
      const balanceBefore = before?.total_points ?? 0;

      const balanceAfter = await awardOzy(
        tx,
        userId,
        reward,
        `Spin the Wheel — won ${reward} OZY (segment ${winningIndex + 1})`,
        'wheel',
      );

      const spin = await tx.wheelSpin.create({
        data: {
          guild_id: GUILD_ID,
          user_id: userId,
          segment_index: winningIndex,
          reward_amount: reward,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
        select: { id: true },
      });

      return {
        winningIndex,
        reward,
        spinId: spin.id,
        balance: balanceAfter,
        chances: remainingChances,
      };
    });

    return NextResponse.json({ success: true, ...result }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof NoChancesError) {
      return NextResponse.json(
        { error: 'You have no spin chances. Purchase a spin first.', code: 'NO_CHANCES' },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'The wheel has not been configured yet.', code: 'NOT_CONFIGURED' },
        { status: 400 },
      );
    }
    console.error('Error spinning wheel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
