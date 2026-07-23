'use client';

import type { RefObject } from 'react';
import type { PublicSymbol, SlotSpinResult } from '@/lib/gambling/types';
import SlotMachine, { type SlotMachineHandle } from './SlotMachine';
import CabinetControls from './CabinetControls';
import SlotWinOverlay from './SlotWinOverlay';

interface SlotMachinePageProps {
  machineRef: RefObject<SlotMachineHandle | null>;
  symbols: PublicSymbol[];
  balance: number;
  bet: number;
  win: number;
  spinning: boolean;
  canSpin: boolean;
  betError: string | null;
  minBet: number;
  maxBet: number;
  quickBets: number[];
  currencyName: string;
  currencyEmoji: string;
  reducedMotion: boolean;
  result: SlotSpinResult | null;
  showReveal: boolean;
  onBetChange: (next: number) => void;
  clampBet: (n: number) => number;
  onSpin: () => void;
  onReelStop: () => void;
  onCloseReveal: () => void;
  onSpinAgain: () => void;
}

/**
 * Presentational composition of the whole machine as one object: the 3D cabinet (with its
 * integrated LED HUD) sitting directly on the control deck, plus the win overlay. Holds no
 * API or wallet logic — everything arrives as props from app/slots/page.tsx.
 */
export default function SlotMachinePage({
  machineRef,
  symbols,
  balance,
  bet,
  win,
  spinning,
  canSpin,
  betError,
  minBet,
  maxBet,
  quickBets,
  currencyName,
  currencyEmoji,
  reducedMotion,
  result,
  showReveal,
  onBetChange,
  clampBet,
  onSpin,
  onReelStop,
  onCloseReveal,
  onSpinAgain,
}: SlotMachinePageProps) {
  const statusText = spinning
    ? 'Spinning…'
    : canSpin
      ? 'Pull the lever to spin'
      : betError || 'Set a bet to play';

  return (
    <div className="w-full flex flex-col items-center">
      <SlotMachine
        ref={machineRef}
        symbols={symbols}
        canSpin={canSpin}
        reducedMotion={reducedMotion}
        balance={balance}
        bet={bet}
        lastWin={win}
        currencyName={currencyName}
        onSpinClick={onSpin}
        onReelStop={onReelStop}
      />

      <CabinetControls
        bet={bet}
        minBet={minBet}
        maxBet={maxBet}
        balance={balance}
        quickBets={quickBets}
        spinning={spinning}
        canSpin={canSpin}
        statusText={statusText}
        currencyEmoji={currencyEmoji}
        onBetChange={onBetChange}
        clampBet={clampBet}
      />

      {showReveal && result && (
        <SlotWinOverlay
          outcome={result.outcome}
          bet={result.reward - result.profit}
          reward={result.reward}
          profit={result.profit}
          currencyName={currencyName}
          currencyEmoji={currencyEmoji}
          newBalance={balance}
          isBig={result.outcome === 'THREE'}
          reducedMotion={reducedMotion}
          canSpinAgain={bet <= balance && !betError}
          onClose={onCloseReveal}
          onSpinAgain={onSpinAgain}
        />
      )}
    </div>
  );
}
