export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar: string | null;
  total_points: number;
  leaderboard_points: number;
  isTempBlocked?: boolean;
  tempBlockedUntil?: string | null;
  tempBlockReason?: string | null;
}

/** The API exposes two independent scores; the UI lets you rank by either. */
export type Metric = 'total' | 'season';

export interface RankedEntry extends LeaderboardEntry {
  /** Position under the metric currently being displayed. */
  position: number;
  score: number;
  /** Position under the *other* metric, so we can show movement between them. */
  alternatePosition: number;
  /** Score as a fraction of the leader's, for the ladder bars. */
  shareOfLeader: number;
}

export interface Tier {
  ink: string;
  ring: string;
  fill: string;
  glow: string;
}

/** Medal treatments. Ranks outside the top three fall back to `NEUTRAL_TIER`. */
export const TIERS: Record<number, Tier> = {
  1: {
    ink: '#FBBF24',
    ring: 'rgba(251,191,36,0.75)',
    fill: 'linear-gradient(90deg, #FDE68A, #F59E0B)',
    glow: 'rgba(245,158,11,0.30)',
  },
  2: {
    ink: '#CBD5E1',
    ring: 'rgba(203,213,225,0.7)',
    fill: 'linear-gradient(90deg, #F1F5F9, #94A3B8)',
    glow: 'rgba(148,163,184,0.24)',
  },
  3: {
    ink: '#FB923C',
    ring: 'rgba(251,146,60,0.7)',
    fill: 'linear-gradient(90deg, #FDBA74, #EA580C)',
    glow: 'rgba(234,88,12,0.24)',
  },
};

export const NEUTRAL_TIER: Tier = {
  ink: 'var(--fx-ink-2)',
  ring: 'var(--fx-hairline-strong)',
  fill: 'linear-gradient(90deg, rgba(59,158,255,0.85), rgba(124,106,245,0.85))',
  glow: 'rgba(59,158,255,0.18)',
};

export const tierFor = (position: number): Tier => TIERS[position] ?? NEUTRAL_TIER;
