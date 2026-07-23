'use client';

import type { SlotOutcome } from '@/lib/gambling/types';
import { renderEmoji } from '@/lib/gambling/renderEmoji';
import SlotParticles from './SlotParticles';

interface SlotWinOverlayProps {
  outcome: SlotOutcome;
  bet: number;
  reward: number;
  profit: number;
  currencyName: string;
  currencyEmoji: string;
  newBalance: number;
  isBig: boolean;
  reducedMotion?: boolean;
  canSpinAgain: boolean;
  onClose: () => void;
  onSpinAgain?: () => void;
}

const TITLE: Record<SlotOutcome, string> = {
  THREE: 'Jackpot — Three Matching!',
  TWO: 'Two Matching — Bet Refunded',
  NONE: 'No Match',
};

export default function SlotWinOverlay({
  outcome,
  bet,
  reward,
  profit,
  currencyName,
  currencyEmoji,
  newBalance,
  isBig,
  reducedMotion = false,
  canSpinAgain,
  onClose,
  onSpinAgain,
}: SlotWinOverlayProps) {
  const won = reward > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      {won && <SlotParticles trigger={1} big={isBig} reducedMotion={reducedMotion} />}

      <div className="relative glass-blue rounded-3xl border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-2xl p-8 max-w-sm w-full text-center animate-scale-in">
        <div className="text-6xl mb-3 animate-float">{outcome === 'THREE' ? '🎉' : won ? '🔄' : '🎰'}</div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[rgb(var(--color-text-primary))] mb-1">
          {TITLE[outcome]}
        </h2>

        {won ? (
          <>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">You won</p>
            <div className="text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent mb-1 drop-shadow">
              {reward.toLocaleString()}
            </div>
            <div className="text-base font-semibold text-[rgb(var(--color-text-primary))] mb-2 flex items-center justify-center gap-1">
              {renderEmoji(currencyEmoji)} {currencyName}
            </div>
            <p
              className={`text-sm font-semibold mb-6 ${profit > 0 ? 'text-green-500' : 'text-[rgb(var(--color-text-tertiary))]'}`}
            >
              {profit > 0 ? `+${profit.toLocaleString()} profit` : 'Bet returned'}
            </p>
          </>
        ) : (
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6">
            You lost {bet.toLocaleString()} {currencyName}. Spin again for the win!
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="rounded-2xl bg-[rgb(var(--color-bg-tertiary))] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Bet</p>
            <p className="text-base font-bold text-[rgb(var(--color-text-primary))]">{bet.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--color-bg-tertiary))] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Reward</p>
            <p className="text-base font-bold text-[rgb(var(--color-text-primary))]">{reward.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--color-bg-tertiary))] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Balance</p>
            <p className="text-base font-bold text-[rgb(var(--color-text-primary))]">{newBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {canSpinAgain && onSpinAgain && (
            <button
              onClick={onSpinAgain}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold transition-all shadow-lg shadow-red-500/20"
            >
              Pull Again
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full px-5 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
