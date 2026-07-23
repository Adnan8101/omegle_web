'use client';

import { useEffect, useRef, useState } from 'react';
import { renderEmoji } from '@/lib/gambling/renderEmoji';

function useCountUp(value: number, animate: boolean) {
  const prev = useRef(value);
  const [display, setDisplay] = useState(value);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!animate || value === prev.current) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const start = prev.current;
    const diff = value - start;
    const steps = 30;
    let i = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      i++;
      const p = i / steps;
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (i >= steps) {
        clearInterval(timer.current);
        setDisplay(value);
      }
    }, 16);
    prev.current = value;
    return () => clearInterval(timer.current);
  }, [value, animate]);

  return display;
}

function HudTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'gold' | 'blue' | 'green';
}) {
  const toneColor =
    tone === 'gold' ? '#fbbf24' : tone === 'green' ? '#34d399' : '#60a5fa';
  const toneGlow =
    tone === 'gold'
      ? 'rgba(251,191,36,0.35)'
      : tone === 'green'
        ? 'rgba(52,211,153,0.35)'
        : 'rgba(96,165,250,0.35)';
  return (
    <div
      className="relative flex flex-col items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl min-w-[86px] sm:min-w-[104px]"
      style={{
        background: 'linear-gradient(180deg,#050608,#0d1016 60%,#050608)',
        boxShadow: `inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 16px -4px ${toneGlow}`,
      }}
    >
      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-1">{label}</span>
      <span
        className="text-lg sm:text-xl font-black tabular-nums"
        style={{ color: toneColor, textShadow: `0 0 10px ${toneGlow}, 0 0 2px ${toneColor}` }}
      >
        {value}
      </span>
    </div>
  );
}

interface SlotDisplayProps {
  balance: number;
  bet: number;
  win: number;
  currencyName: string;
  currencyEmoji: string;
  reducedMotion?: boolean;
}

export default function SlotDisplay({
  balance,
  bet,
  win,
  currencyName,
  currencyEmoji,
  reducedMotion = false,
}: SlotDisplayProps) {
  const animatedBalance = useCountUp(balance, !reducedMotion);
  const animatedWin = useCountUp(win, !reducedMotion);

  return (
    <div className="flex items-stretch justify-center gap-2 sm:gap-3">
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl"
        style={{
          background: 'linear-gradient(180deg,#050608,#0d1016 60%,#050608)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex-shrink-0">{renderEmoji(currencyEmoji, 'w-6 h-6')}</div>
        <div className="flex flex-col leading-none">
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-1">
            {currencyName}
          </span>
          <span
            className="text-lg sm:text-xl font-black tabular-nums text-amber-400"
            style={{ textShadow: '0 0 10px rgba(251,191,36,0.35)' }}
          >
            {animatedBalance.toLocaleString()}
          </span>
        </div>
      </div>

      <HudTile label="Bet" value={bet.toLocaleString()} tone="blue" />
      <HudTile label="Win" value={animatedWin.toLocaleString()} tone="green" />
    </div>
  );
}
