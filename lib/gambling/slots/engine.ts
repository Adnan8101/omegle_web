// Slot Machine outcome engine. This is the SINGLE SOURCE OF TRUTH for every
// spin — it runs server-side only. The frontend never sees the outcome
// probabilities or payout multipliers and never decides the result; it merely
// animates the reels to the symbols this module returns. This is what prevents
// client-side manipulation (spec §7, §8, §13).
//
// RNG uses Node's crypto (CSPRNG) rather than Math.random() to satisfy the
// "backend-only RNG" security requirement.

import { randomInt } from 'crypto';

export type SlotOutcome = 'THREE' | 'TWO' | 'NONE';

export interface SlotSymbolLike {
  label: string;
  icon: string | null;
}

export interface OutcomeProbabilities {
  prob_three: number;
  prob_two: number;
  prob_none: number;
}

export interface PayoutMultipliers {
  payout_three: number;
  payout_two: number;
  payout_none: number;
}

/** Uniform random integer in [0, max). Thin wrapper for testability/clarity. */
function rand(max: number): number {
  if (max <= 1) return 0;
  return randomInt(max);
}

/** Pick a uniformly random element of a non-empty array. */
function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)];
}

/**
 * Pick one of the three outcomes using the admin-configured probabilities.
 * The three values are expected to total 100 but we treat them as relative
 * weights and normalise, so the engine can never hang on drift or bad input.
 * If every weight is 0 we fall back to NONE (lose) — the safest default.
 */
export function pickOutcome(probs: OutcomeProbabilities): SlotOutcome {
  const three = Math.max(0, Math.floor(Number(probs.prob_three) || 0));
  const two = Math.max(0, Math.floor(Number(probs.prob_two) || 0));
  const none = Math.max(0, Math.floor(Number(probs.prob_none) || 0));
  const total = three + two + none;
  if (total <= 0) return 'NONE';

  let r = rand(total); // integer in [0, total)
  if (r < three) return 'THREE';
  r -= three;
  if (r < two) return 'TWO';
  return 'NONE';
}

/**
 * Fisher–Yates shuffle (CSPRNG) — returns a new array, does not mutate input.
 * Used to draw distinct symbols for TWO/NONE outcomes without bias.
 */
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate the three reel symbols for a chosen outcome. Symbols are purely
 * cosmetic (spec §7): they are drawn uniformly from the enabled pool and never
 * influence odds. Callers MUST validate the pool is large enough beforehand
 * (>=1 for THREE, >=2 for TWO, >=3 for NONE); as a safety net this degrades
 * gracefully rather than throwing when the pool is too small.
 */
export function generateReels<T extends SlotSymbolLike>(
  outcome: SlotOutcome,
  symbols: T[],
): [T, T, T] {
  if (!symbols || symbols.length === 0) {
    throw new Error('NO_SYMBOLS');
  }

  if (outcome === 'THREE') {
    const s = pick(symbols);
    return [s, s, s];
  }

  if (outcome === 'TWO') {
    // Need two distinct symbols; fall back to THREE-style if only one exists.
    if (symbols.length < 2) {
      const s = pick(symbols);
      return [s, s, s];
    }
    const [pairSym, oddSym] = shuffled(symbols);
    // Randomise which reel shows the odd symbol out.
    const oddPos = rand(3);
    const reels: T[] = [pairSym, pairSym, pairSym];
    reels[oddPos] = oddSym;
    return [reels[0], reels[1], reels[2]];
  }

  // NONE: three distinct symbols. Fall back to as-distinct-as-possible if the
  // pool is smaller than 3 (should be prevented by config validation).
  if (symbols.length >= 3) {
    const [a, b, c] = shuffled(symbols);
    return [a, b, c];
  }
  const shuf = shuffled(symbols);
  return [shuf[0], shuf[1 % shuf.length], shuf[2 % shuf.length]];
}

/** Reward = bet × the configured multiplier for the outcome (spec §6). */
export function computeReward(
  outcome: SlotOutcome,
  bet: number,
  payouts: PayoutMultipliers,
): number {
  const mult =
    outcome === 'THREE'
      ? payouts.payout_three
      : outcome === 'TWO'
        ? payouts.payout_two
        : payouts.payout_none;
  const safeMult = Math.max(0, Math.floor(Number(mult) || 0));
  return Math.max(0, Math.floor(bet * safeMult));
}
