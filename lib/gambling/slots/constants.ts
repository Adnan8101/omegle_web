// Shared constants for the Slot Machine game. Reuses the gambling module's
// wallet/economy services — players bet OZY directly (no purchased chances).

export const SLOTS_GAME_KEY = 'slots';

// Ledger `source` written to EconomyPointLog for all slot debits/credits so the
// existing economy tooling/audits can see slot activity distinctly from 'wheel'.
export const SLOTS_SOURCE = 'slots';

// The machine has exactly three vertical reels (spec §4).
export const REEL_COUNT = 3;

// Per-user rate limit (spec §13): reject a spin if the user's previous spin was
// less than this many milliseconds ago. DB-backed (last SlotSpin.created_at) so
// it works on serverless where in-memory state is not shared.
export const MIN_SPIN_INTERVAL_MS = 800;

// Starter symbol pool used when generating a fresh config in the admin UI.
// The OZY coin reuses the site's bundled coin image; the rest are emoji.
export const DEFAULT_SLOT_SYMBOLS: Array<{ label: string; icon: string }> = [
  { label: 'Cherry', icon: '🍒' },
  { label: 'Lemon', icon: '🍋' },
  { label: 'Watermelon', icon: '🍉' },
  { label: 'Star', icon: '⭐' },
  { label: 'Diamond', icon: '💎' },
  { label: 'Bell', icon: '🔔' },
  { label: 'Clover', icon: '🍀' },
  { label: 'OZY Coin', icon: '🪙' },
];
