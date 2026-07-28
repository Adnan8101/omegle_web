

export interface PublicSegment {
  position: number;
  label: string;
  reward: number;
  color: string;
  icon: string | null;
}

export interface AdminSegment {
  position: number;
  label: string;
  reward_amount: number;
  weight: number;
  color: string;
  icon: string | null;
}

export interface WheelState {
  enabled: boolean;
  disabled?: boolean;
  entryCost: number;
  segmentCount: number;
  segments: PublicSegment[];
  balance: number;
  chances: number;
  currencyName: string;
  currencyEmoji: string;
}

export interface SpinResult {
  winningIndex: number;
  reward: number;
  spinId: string;
  balance: number;
  chances: number;
}

export interface PublicSymbol {
  label: string;
  icon: string | null;
}

export interface AdminSymbol {
  position: number;
  label: string;
  icon: string | null;
  enabled: boolean;
}

export interface SlotState {
  enabled: boolean;
  disabled?: boolean;
  minBet: number;
  maxBet: number;
  defaultBet: number;
  quickBets: number[];
  symbols: PublicSymbol[]; 
  balance: number;
  currencyName: string;
  currencyEmoji: string;
}

export type SlotOutcome = 'THREE' | 'TWO' | 'NONE';

export interface SlotSpinResult {
  reels: PublicSymbol[]; 
  outcome: SlotOutcome;
  reward: number;
  profit: number; 
  balance: number;
  spinId: string;
}
