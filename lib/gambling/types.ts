// Shared types for the gambling module's client/server contract.

/** A segment as exposed to the PLAYER — note: never includes `weight`/odds. */
export interface PublicSegment {
  position: number;
  label: string;
  reward: number;
  color: string;
  icon: string | null;
}

/** A segment as used in the ADMIN editor (includes weight). */
export interface AdminSegment {
  position: number;
  label: string;
  reward_amount: number;
  weight: number;
  color: string;
  icon: string | null;
}

/** Player-facing wheel state (GET /api/gambling/wheel/state). */
export interface WheelState {
  enabled: boolean;
  disabled?: boolean; // true when game is off and viewer is not dev
  devBypass?: boolean;
  entryCost: number;
  segmentCount: number;
  segments: PublicSegment[];
  balance: number;
  chances: number;
  currencyName: string;
  currencyEmoji: string;
}

/** Spin result (POST /api/gambling/wheel/spin). */
export interface SpinResult {
  winningIndex: number;
  reward: number;
  spinId: string;
  balance: number;
  chances: number;
}

// ---------------------------------------------------------------------------
// Slot Machine (Gambling System v2)
// ---------------------------------------------------------------------------

/** A symbol as exposed to the PLAYER — cosmetic only, never any odds. */
export interface PublicSymbol {
  label: string;
  icon: string | null;
}

/** A symbol as used in the ADMIN editor. */
export interface AdminSymbol {
  position: number;
  label: string;
  icon: string | null;
  enabled: boolean;
}

/** Player-facing slot state (GET /api/gambling/slots/state). */
export interface SlotState {
  enabled: boolean;
  disabled?: boolean; // true when game is off and viewer is not dev
  devBypass?: boolean;
  minBet: number;
  maxBet: number;
  defaultBet: number;
  quickBets: number[];
  symbols: PublicSymbol[]; // enabled symbols only, no odds
  balance: number;
  currencyName: string;
  currencyEmoji: string;
}

export type SlotOutcome = 'THREE' | 'TWO' | 'NONE';

/** Slot spin result (POST /api/gambling/slots/spin). */
export interface SlotSpinResult {
  reels: PublicSymbol[]; // exactly three, the symbols to display left→right
  outcome: SlotOutcome;
  reward: number;
  profit: number; // reward - bet (signed)
  balance: number;
  spinId: string;
}
