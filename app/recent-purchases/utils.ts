import type { DayGroup, RecentPurchase } from './types';

export function highestPriceIn(purchases: RecentPurchase[]): number {
  return purchases.reduce((max, purchase) => Math.max(max, purchase.pricePaid || 0), 0);
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
export function clockOf(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/* ── Timeline ─────────────────────────────────────────────────────── */

function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dayLabelOf(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dayKeyOf(date) === dayKeyOf(today)) return 'Today';
  if (dayKeyOf(date) === dayKeyOf(yesterday)) return 'Yesterday';

  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Buckets the feed into calendar days, preserving the API's newest-first order. */
export function groupByDay(purchases: RecentPurchase[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();

  for (const purchase of purchases) {
    const date = new Date(purchase.purchasedAt);
    const valid = !Number.isNaN(date.getTime());
    const key = valid ? dayKeyOf(date) : 'unknown';

    let group = index.get(key);
    if (!group) {
      group = { key, label: valid ? dayLabelOf(date) : 'Earlier', rows: [], spent: 0 };
      index.set(key, group);
      groups.push(group);
    }
    group.rows.push(purchase);
    group.spent += purchase.pricePaid || 0;
  }

  return groups;
}

/** Feed-wide figures — all derived from what's on screen, nothing invented. */
export function summarise(purchases: RecentPurchase[]) {
  const spent = purchases.reduce((total, purchase) => total + (purchase.pricePaid || 0), 0);
  const buyers = new Set(purchases.map((purchase) => purchase.user.displayName)).size;
  return { count: purchases.length, spent, buyers, biggest: highestPriceIn(purchases) };
}
