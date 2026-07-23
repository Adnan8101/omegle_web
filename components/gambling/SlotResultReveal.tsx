'use client';

import { useEffect, useRef } from 'react';
import type { SlotOutcome } from '@/lib/gambling/types';
import { renderEmoji } from '@/lib/gambling/renderEmoji';

interface SlotResultRevealProps {
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

export default function SlotResultReveal({
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
}: SlotResultRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const won = reward > 0;

  useEffect(() => {
    if (!won || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animFrame: number;
    const particles: any[] = [];
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f43f5e', '#fbbf24'];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = isBig ? 260 : 140;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isBig ? 12 : 9) + 4;
      particles.push({
        x: cx,
        y: cy - 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.006,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: Math.random() > 0.6 ? 'square' : 'circle',
      });
    }

    const run = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.vx *= 0.98;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (particles.length > 0) {
        animFrame = requestAnimationFrame(run);
      }
    };
    run();
    return () => cancelAnimationFrame(animFrame);
  }, [won, isBig, reducedMotion]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      {won && !reducedMotion && <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />}

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
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              Spin Again
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
