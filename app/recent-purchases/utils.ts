import type { RecentPurchase, ValueTier } from './types';

/**
 * Grades a purchase against the most expensive one currently in the feed.
 * Relative rather than absolute so the scale stays meaningful whatever the
 * guild's currency values look like.
 */
export function tierFor(price: number, highestPrice: number): ValueTier {
  if (highestPrice <= 0) return 'standard';
  const ratio = price / highestPrice;
  if (ratio >= 0.75) return 'legendary';
  if (ratio >= 0.45) return 'epic';
  if (ratio >= 0.2) return 'rare';
  return 'standard';
}

export function highestPriceIn(purchases: RecentPurchase[]): number {
  return purchases.reduce((max, purchase) => Math.max(max, purchase.pricePaid), 0);
}

/** Purchases carry a free-text status; only `redeemed` gets a positive read. */
export function statusLabel(status: string): { label: string; redeemed: boolean } {
  const normalised = status?.toLowerCase?.() ?? '';
  if (normalised === 'redeemed') return { label: 'Redeemed', redeemed: true };
  if (normalised === 'pending') return { label: 'Awaiting redemption', redeemed: false };
  return { label: status || 'Unknown', redeemed: false };
}

export function initialsOf(name: string): string {
  return name.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 2).toUpperCase() || '?';
}

/** Compact wall-clock time for the desktop rail, e.g. "3:45 PM". */
export function clockOf(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
