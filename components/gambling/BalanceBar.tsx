'use client';

import React, { useEffect, useRef, useState } from 'react';
import { renderEmoji } from '@/lib/gambling/renderEmoji';

interface BalanceBarProps {
  balance: number;
  currencyName: string;
  currencyEmoji: string;
  /** Extra stat tiles (e.g. Spin Chances, Bet) to appear right of the balance chip. */
  stats?: { label: string; value: string | number; accent?: boolean }[];
  /** Pulse animation whenever balance changes externally */
  animate?: boolean;
}

export default function BalanceBar({
  balance,
  currencyName,
  currencyEmoji,
  stats = [],
  animate = true,
}: BalanceBarProps) {
  const prevBalance = useRef(balance);
  const [flash, setFlash] = useState<'gain' | 'loss' | null>(null);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const countRef = useRef<NodeJS.Timeout>();

  /* ── Counting animation when balance changes ───────────────────────────── */
  useEffect(() => {
    if (!animate || balance === prevBalance.current) {
      setDisplayBalance(balance);
      return;
    }
    const diff = balance - prevBalance.current;
    setFlash(diff > 0 ? 'gain' : 'loss');
    const duration = 800;
    const steps = 40;
    const stepMs = duration / steps;
    const start = prevBalance.current;
    let i = 0;
    clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      i++;
      const p = i / steps;
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplayBalance(Math.round(start + diff * eased));
      if (i >= steps) {
        clearInterval(countRef.current);
        setDisplayBalance(balance);
        setTimeout(() => setFlash(null), 600);
      }
    }, stepMs);
    prevBalance.current = balance;
    return () => clearInterval(countRef.current);
  }, [balance, animate]);

  const flashClass =
    flash === 'gain'
      ? 'shadow-[0_0_30px_rgba(52,211,153,0.6)]'
      : flash === 'loss'
      ? 'shadow-[0_0_30px_rgba(239,68,68,0.5)]'
      : '';

  return (
    <div className="w-full flex flex-wrap items-stretch justify-center gap-3">
      {/* ── Main Balance Chip ─────────────────────────────────────────────── */}
      <div
        className={`relative group flex items-center gap-4 px-6 py-3.5 rounded-2xl
          transition-all duration-500 select-none overflow-hidden
          ${flashClass}`}
        style={{
          background: 'linear-gradient(135deg, #0d1117 0%, #161b22 40%, #0d1117 100%)',
          border: '1px solid rgba(255,60,60,0.25)',
          boxShadow:
            '0 2px 0 rgba(255,80,80,0.12) inset, 0 -2px 0 rgba(0,0,0,0.5) inset, 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,38,0.18)',
        }}
      >
        {/* 3-D top-edge — vivid red */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent pointer-events-none" />
        {/* Red top glow bloom */}
        <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-red-600/30 to-transparent rounded-t-2xl pointer-events-none" />
        {/* 3-D bottom-edge shadow */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/60 to-transparent pointer-events-none" />
        {/* Ambient gold glow sweep on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(255,215,0,0.08) 0%, transparent 70%)' }} />

        {/* Coin icon — orbiting glow ring */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full animate-spin-slow pointer-events-none"
            style={{ background: 'conic-gradient(from 0deg, rgba(255,215,0,0.5) 0%, transparent 40%, rgba(255,215,0,0.5) 60%, transparent 100%)', filter: 'blur(4px)' }} />
          <div className="relative w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ffe87c, #d4a017 55%, #7a5800 100%)',
              boxShadow: '0 2px 0 rgba(255,255,255,0.3) inset, 0 -3px 0 rgba(0,0,0,0.4) inset, 0 0 12px rgba(255,215,0,0.6), 0 4px 12px rgba(0,0,0,0.6)',
            }}>
            {renderEmoji(currencyEmoji, 'w-7 h-7')}
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col leading-none">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] mb-1"
            style={{ color: 'rgba(255,215,0,0.6)' }}>
            Balance
          </span>
          <span
            className={`text-2xl font-black tabular-nums tracking-tight transition-colors duration-300 ${
              flash === 'gain' ? 'text-emerald-400' : flash === 'loss' ? 'text-red-400' : 'text-white'
            }`}
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.15)' }}
          >
            {displayBalance.toLocaleString()}
          </span>
          <span className="text-[10px] font-semibold mt-0.5"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            {currencyName}
          </span>
        </div>

        {/* Delta flash badge */}
        {flash && (
          <div className={`absolute top-2 right-3 text-[10px] font-black animate-ping-once ${
            flash === 'gain' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {flash === 'gain' ? '▲' : '▼'}
          </div>
        )}
      </div>

      {/* ── Extra Stat Tiles ──────────────────────────────────────────────── */}
      {stats.map((s, i) => (
        <StatTile key={i} label={s.label} value={s.value} accent={s.accent} />
      ))}
    </div>
  );
}

/* ── Reusable stat tile ──────────────────────────────────────────────────── */
function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center px-6 py-3.5 rounded-2xl overflow-hidden"
      style={{
        background: accent
          ? 'linear-gradient(135deg, #1a1000 0%, #2a1d00 50%, #1a1000 100%)'
          : 'linear-gradient(135deg, #0d1117 0%, #161b22 40%, #0d1117 100%)',
        border: accent ? '1px solid rgba(255,180,0,0.2)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: accent
          ? '0 2px 0 rgba(255,200,0,0.08) inset, 0 -2px 0 rgba(0,0,0,0.5) inset, 0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(255,180,0,0.08)'
          : '0 2px 0 rgba(255,255,255,0.04) inset, 0 -2px 0 rgba(0,0,0,0.5) inset, 0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <span className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
        style={{ color: accent ? 'rgba(255,180,0,0.6)' : 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
      <span
        className="text-2xl font-black tabular-nums"
        style={{
          color: accent ? '#fbbf24' : '#ffffff',
          textShadow: accent
            ? '0 2px 8px rgba(0,0,0,0.8), 0 0 16px rgba(251,191,36,0.4)'
            : '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
