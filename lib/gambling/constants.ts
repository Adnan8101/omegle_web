// Shared constants for the gambling module. New games register their own
// game_key and reuse the shared wallet/chances services.

export const WHEEL_GAME_KEY = 'wheel';

// Ledger `source` value written to EconomyPointLog for all wheel debits/credits
// so existing economy tooling/audits can see gambling activity.
export const WHEEL_SOURCE = 'wheel';

// Allowed wheel segment counts (spec §2). The wheel renders dynamically from
// whichever value the admin selects — nothing is hardcoded per-count.
export const SEGMENT_COUNT_OPTIONS = [4, 5, 6, 7, 8, 10, 12] as const;
export type SegmentCount = (typeof SEGMENT_COUNT_OPTIONS)[number];

// Sensible starter palette used when generating fresh segments in the admin UI.
export const DEFAULT_SEGMENT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#a855f7', // purple
  '#14b8a6', // teal
  '#eab308', // yellow
  '#6366f1', // indigo
];
