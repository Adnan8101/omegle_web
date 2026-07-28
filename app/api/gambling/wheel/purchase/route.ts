

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { addChance } from '@/lib/gambling/chances';
import { spendOzy, InsufficientBalanceError } from '@/lib/gambling/wallet';
import { WHEEL_GAME_KEY } from '@/lib/gambling/constants';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json({ error: 'You must be logged in to purchase a spin' }, { status: 401 });
    }

    const config = await prismaBot.wheelConfig.findUnique({ where: { guild_id: GUILD_ID } });
    if (!config?.enabled) {
      return NextResponse.json({ error: 'Game Currently Disabled' }, { status: 403 });
    }

    const entryCost = config?.entry_cost ?? 50;

    const result = await prismaBot.$transaction(async (tx) => {
      const balance = await spendOzy(tx, userId as string, entryCost, 'Spin the Wheel — spin chance', 'wheel');
      const chances = await addChance(tx, userId as string, WHEEL_GAME_KEY, 1);
      return { balance, chances };
    });

    return NextResponse.json(
      { success: true, balance: result.balance, chances: result.chances, entryCost },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You need ${error.required.toLocaleString()} OZY but only have ${error.available.toLocaleString()}.`,
          code: 'INSUFFICIENT_BALANCE',
        },
        { status: 400 },
      );
    }
    console.error('Error purchasing spin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
