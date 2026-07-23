

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

function rand(max: number): number {
  if (max <= 1) return 0;
  return randomInt(max);
}

function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)];
}

export function pickOutcome(probs: OutcomeProbabilities): SlotOutcome {
  const three = Math.max(0, Math.floor(Number(probs.prob_three) || 0));
  const two = Math.max(0, Math.floor(Number(probs.prob_two) || 0));
  const none = Math.max(0, Math.floor(Number(probs.prob_none) || 0));
  const total = three + two + none;
  if (total <= 0) return 'NONE';

  let r = rand(total); 
  if (r < three) return 'THREE';
  r -= three;
  if (r < two) return 'TWO';
  return 'NONE';
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
    
    if (symbols.length < 2) {
      const s = pick(symbols);
      return [s, s, s];
    }
    const [pairSym, oddSym] = shuffled(symbols);
    
    const oddPos = rand(3);
    const reels: T[] = [pairSym, pairSym, pairSym];
    reels[oddPos] = oddSym;
    return [reels[0], reels[1], reels[2]];
  }

  
  
  if (symbols.length >= 3) {
    const [a, b, c] = shuffled(symbols);
    return [a, b, c];
  }
  const shuf = shuffled(symbols);
  return [shuf[0], shuf[1 % shuf.length], shuf[2 % shuf.length]];
}

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
