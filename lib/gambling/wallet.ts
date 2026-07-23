// Shared OZY wallet service for the gambling module.
//
// All balance mutations reuse the existing economy tables:
//   - EconomyUser.total_points  (spendable balance)
//   - EconomyUser.leaderboard_points (kept in sync when EconomyConfig.leaderboard_sync)
//   - EconomyPointLog (one signed row per mutation, for audit)
//
// These helpers are the single choke-point every gambling game uses to move
// OZY, so future games (Coin Flip, Dice, …) get consistent, auditable wallet
// behaviour for free. Call them INSIDE a prismaBot.$transaction.

import type { Prisma } from '@prisma/client';
import { GUILD_ID } from '@/lib/constants';
import { WHEEL_SOURCE } from './constants';

export class InsufficientBalanceError extends Error {
  constructor(public required: number, public available: number) {
    super('INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

async function getLeaderboardSync(tx: Prisma.TransactionClient): Promise<boolean> {
  const config = await tx.economyConfig.findUnique({
    where: { guild_id: GUILD_ID },
    select: { leaderboard_sync: true },
  });
  return config?.leaderboard_sync ?? true;
}

/**
 * Atomically deduct `amount` OZY from a user. Uses a conditional updateMany so
 * two concurrent spends can never overdraw. Writes a negative EconomyPointLog.
 * Returns the resulting balance. Throws InsufficientBalanceError if the user
 * lacks funds.
 */
export async function spendOzy(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: string,
  source: string = WHEEL_SOURCE,
): Promise<number> {
  if (amount <= 0) {
    const user = await tx.economyUser.findUnique({
      where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
      select: { total_points: true },
    });
    return user?.total_points ?? 0;
  }

  const leaderboardSync = await getLeaderboardSync(tx);
  const user = await tx.economyUser.findUnique({
    where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
    select: { total_points: true },
  });
  const available = user?.total_points ?? 0;

  const updated = await tx.economyUser.updateMany({
    where: { guild_id: GUILD_ID, user_id: userId, total_points: { gte: amount } },
    data: {
      total_points: { decrement: amount },
      leaderboard_points: leaderboardSync ? { decrement: amount } : undefined,
    },
  });
  if (updated.count === 0) {
    throw new InsufficientBalanceError(amount, available);
  }

  await tx.economyPointLog.create({
    data: { guild_id: GUILD_ID, user_id: userId, amount: -amount, reason, source },
  });

  return available - amount;
}

/**
 * Credit `amount` OZY to a user (mints freely — no budget cap). Creates the
 * economy account if it does not yet exist. Writes a positive EconomyPointLog
 * (skipped for a zero payout). Returns the resulting balance.
 */
export async function awardOzy(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: string,
  source: string = WHEEL_SOURCE,
): Promise<number> {
  const leaderboardSync = await getLeaderboardSync(tx);

  const user = await tx.economyUser.upsert({
    where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
    create: {
      guild_id: GUILD_ID,
      user_id: userId,
      total_points: amount > 0 ? amount : 0,
      leaderboard_points: leaderboardSync && amount > 0 ? amount : 0,
    },
    update:
      amount > 0
        ? {
            total_points: { increment: amount },
            leaderboard_points: leaderboardSync ? { increment: amount } : undefined,
          }
        : {},
    select: { total_points: true },
  });

  if (amount > 0) {
    await tx.economyPointLog.create({
      data: { guild_id: GUILD_ID, user_id: userId, amount, reason, source },
    });
  }

  return user.total_points;
}
