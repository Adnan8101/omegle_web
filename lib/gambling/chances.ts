// Shared per-game "spin chance" ledger for the gambling module.
//
// Chances are stored per (guild, user, game_key) in GambleChance, so every
// game tracks its own purchasable attempts without colliding. Players buy
// chances (addChance) and consume them when they play (consumeChance).

import type { Prisma } from '@prisma/client';
import { prismaBot } from '@/lib/prismaBot';
import { GUILD_ID } from '@/lib/constants';

export class NoChancesError extends Error {
  constructor() {
    super('NO_CHANCES');
    this.name = 'NoChancesError';
  }
}

/** Read the current chance count for a user + game (non-transactional). */
export async function getChances(userId: string, gameKey: string): Promise<number> {
  const row = await prismaBot.gambleChance.findUnique({
    where: {
      guild_id_user_id_game_key: { guild_id: GUILD_ID, user_id: userId, game_key: gameKey },
    },
    select: { chances: true },
  });
  return row?.chances ?? 0;
}

/** Grant `amount` chances (default 1). Returns the new total. */
export async function addChance(
  tx: Prisma.TransactionClient,
  userId: string,
  gameKey: string,
  amount: number = 1,
): Promise<number> {
  const row = await tx.gambleChance.upsert({
    where: {
      guild_id_user_id_game_key: { guild_id: GUILD_ID, user_id: userId, game_key: gameKey },
    },
    create: { guild_id: GUILD_ID, user_id: userId, game_key: gameKey, chances: amount },
    update: { chances: { increment: amount } },
    select: { chances: true },
  });
  return row.chances;
}

/**
 * Atomically consume one chance. Uses a conditional updateMany so a user can
 * never spend a chance they do not have (even under concurrent spins).
 * Returns the remaining count. Throws NoChancesError if none are available.
 */
export async function consumeChance(
  tx: Prisma.TransactionClient,
  userId: string,
  gameKey: string,
): Promise<number> {
  const updated = await tx.gambleChance.updateMany({
    where: { guild_id: GUILD_ID, user_id: userId, game_key: gameKey, chances: { gte: 1 } },
    data: { chances: { decrement: 1 } },
  });
  if (updated.count === 0) {
    throw new NoChancesError();
  }
  const row = await tx.gambleChance.findUnique({
    where: {
      guild_id_user_id_game_key: { guild_id: GUILD_ID, user_id: userId, game_key: gameKey },
    },
    select: { chances: true },
  });
  return row?.chances ?? 0;
}
