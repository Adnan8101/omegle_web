export interface PurchaseUser {
  displayName: string;
  username: string | null;
  avatar: string | null;
}

export interface RecentPurchase {
  id: string;
  itemName: string;
  itemDescription: string | null;
  itemThumbnail: string | null;
  itemDelisted: boolean;
  pricePaid: number;
  status: string;
  purchasedAt: string;
  user: PurchaseUser;
}

/**
 * The shop has no rarity column, so tiers are derived from what a purchase
 * actually cost relative to the rest of the feed — a real signal rather than
 * an invented one.
 */
export type ValueTier = 'legendary' | 'epic' | 'rare' | 'standard';

export interface TierStyle {
  label: string;
  ink: string;
  border: string;
  background: string;
  glow: string;
}

export const TIER_STYLES: Record<ValueTier, TierStyle> = {
  legendary: {
    label: 'Legendary',
    ink: '#FBBF24',
    border: 'rgba(251,191,36,0.4)',
    background: 'rgba(251,191,36,0.12)',
    glow: 'rgba(245,158,11,0.22)',
  },
  epic: {
    label: 'Epic',
    ink: '#C084FC',
    border: 'rgba(192,132,252,0.4)',
    background: 'rgba(192,132,252,0.12)',
    glow: 'rgba(168,85,247,0.20)',
  },
  rare: {
    label: 'Rare',
    ink: '#38BDF8',
    border: 'rgba(56,189,248,0.4)',
    background: 'rgba(56,189,248,0.12)',
    glow: 'rgba(14,165,233,0.18)',
  },
  standard: {
    label: 'Standard',
    ink: 'var(--fx-ink-2)',
    border: 'var(--fx-hairline-strong)',
    background: 'var(--fx-surface-raised)',
    glow: 'rgba(148,163,184,0.14)',
  },
};
