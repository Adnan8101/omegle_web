'use client';

import { useEffect } from 'react';
import { renderEmoji } from '@/lib/gambling/renderEmoji';
import type { SlotOutcome } from '@/lib/gambling/types';

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
  onSpinAgain: () => void;
}

export default function SlotWinOverlay({
  outcome,
  reward,
  profit,
  currencyName,
  currencyEmoji,
  newBalance,
  isBig,
  canSpinAgain,
  onClose,
  onSpinAgain,
}: SlotWinOverlayProps) {
  const won = reward > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = isBig ? 'JACKPOT!' : outcome === 'TWO' ? 'Nice Win!' : won ? 'You Won!' : 'No Luck';
  const accent = won ? (isBig ? '#f5c542' : '#37c6ff') : '#8891a3';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {won && (
        <div
          className="absolute inset-0 pointer-events-none animate-slot2-screen-flash"
          style={{ background: `radial-gradient(circle at 50% 40%, ${accent}44, transparent 60%)` }}
        />
      )}

      <div
        className="relative w-full max-w-sm rounded-3xl p-8 text-center animate-slot2-overlay-in"
        style={{
          background: 'linear-gradient(180deg,#171b22,#0b0e13)',
          border: `1px solid ${accent}55`,
          boxShadow: `0 30px 70px rgba(0,0,0,0.6), 0 0 60px ${accent}33`,
        }}
      >
        <div className="text-6xl mb-2">{won ? (isBig ? '🎉' : '✨') : '🎰'}</div>
        <h2
          className={`text-3xl font-extrabold mb-4 tracking-tight ${isBig ? 'animate-slot2-reward-pop' : ''}`}
          style={{ color: accent, textShadow: `0 0 24px ${accent}88` }}
        >
          {title}
        </h2>

        {won ? (
          <div className="mb-6">
            <div className="text-sm text-white/50 uppercase tracking-wider mb-1">Reward</div>
            <div className="flex items-center justify-center gap-2 text-4xl font-black text-white animate-slot2-reward-pop">
              {renderEmoji(currencyEmoji, 'w-8 h-8 inline-block align-middle')}
              <span>{reward.toLocaleString()}</span>
            </div>
            <div className={`mt-1 text-sm font-semibold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : ''}
              {profit.toLocaleString()} {currencyName}
            </div>
          </div>
        ) : (
          <p className="text-white/60 mb-6">Better luck on the next pull.</p>
        )}

        <div className="flex items-center justify-center gap-2 text-sm text-white/60 mb-6">
          <span>Balance</span>
          {renderEmoji(currencyEmoji, 'w-4 h-4 inline-block align-middle')}
          <span className="font-bold text-white">{newBalance.toLocaleString()}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-white/80 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onSpinAgain}
            disabled={!canSpinAgain}
            className="flex-1 py-3 rounded-xl font-bold text-black disabled:opacity-40 transition-transform active:scale-95"
            style={{ background: `linear-gradient(180deg,#ffe08a,${accent})` }}
          >
            Pull Again
          </button>
        </div>
      </div>
    </div>
  );
}
