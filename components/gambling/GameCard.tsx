'use client';

import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import { renderEmoji } from '@/lib/gambling/renderEmoji';

export interface GameCardTheme {
  /** primary accent (rgb string body, e.g. "139,92,246") */
  accent: string;
  /** background gradient for the art panel */
  art: string;
}

export const GAME_THEMES: Record<string, GameCardTheme> = {
  wheel: {
    accent: '139,92,246',
    art: 'radial-gradient(120% 120% at 20% 0%, rgba(139,92,246,0.35) 0%, rgba(76,29,149,0.15) 45%, transparent 72%)',
  },
  slots: {
    accent: '245,197,66',
    art: 'radial-gradient(120% 120% at 80% 0%, rgba(245,197,66,0.32) 0%, rgba(180,83,9,0.14) 45%, transparent 72%)',
  },
};

interface GameCardProps {
  name: string;
  tagline: string;
  href: string;
  icon: string;
  /** honest, non-fabricated descriptor, e.g. "Single spin · Jackpot segment" */
  meta: string;
  balance: number;
  currencyName: string;
  currencyEmoji: string;
  themeKey: string;
}

/**
 * A premium, game-launcher-style card. Real data only — balance + a live status derived from the
 * lobby (only enabled games are ever passed in). No fabricated RTP / player counts / winners.
 */
export default function GameCard({
  name,
  tagline,
  href,
  icon,
  meta,
  balance,
  currencyName,
  currencyEmoji,
  themeKey,
}: GameCardProps) {
  const theme = GAME_THEMES[themeKey] ?? GAME_THEMES.wheel;
  const a = theme.accent;

  return (
    <Link
      href={href}
      className="game-card group relative flex flex-col overflow-hidden rounded-[26px] outline-none"
      style={{
        background: 'linear-gradient(180deg,#12131a 0%,#0a0b10 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 60px -24px rgba(0,0,0,0.8)',
      }}
    >
      {/* ── Art panel ─────────────────────────────────────── */}
      <div className="relative h-44 sm:h-48 overflow-hidden" style={{ background: theme.art }}>
        {/* soft grid texture */}
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
            maskImage: 'radial-gradient(120% 90% at 50% 0%, #000 0%, transparent 75%)',
          }}
        />
        {/* giant ghosted glyph */}
        <div
          className="absolute -right-4 -bottom-8 text-[180px] leading-none select-none transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
          style={{ filter: `drop-shadow(0 12px 30px rgba(${a},0.4))` }}
          aria-hidden
        >
          {icon}
        </div>
        {/* live badge */}
        <span
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', backdropFilter: 'blur(6px)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
        {/* hover glow bloom */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `rgba(${a},0.35)` }}
        />
        {/* bottom fade into body */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0b10] to-transparent pointer-events-none" />
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-extrabold text-white tracking-tight">{name}</h3>
        </div>
        <span
          className="self-start mb-3 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide"
          style={{ background: `rgba(${a},0.12)`, border: `1px solid rgba(${a},0.28)`, color: `rgb(${a})` }}
        >
          {meta}
        </span>
        <p className="text-sm text-white/55 leading-relaxed mb-6">{tagline}</p>

        <div className="mt-auto flex items-center justify-between gap-3">
          {/* real balance chip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {renderEmoji(currencyEmoji, 'w-4 h-4')}
            <span className="text-sm font-bold text-white tabular-nums">{balance.toLocaleString()}</span>
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">{currencyName}</span>
          </div>

          {/* CTA */}
          <span
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-transform duration-200 group-hover:gap-2.5 group-active:scale-95"
            style={{ background: `linear-gradient(180deg, rgba(${a},1), rgba(${a},0.78))`, boxShadow: `0 8px 22px -6px rgba(${a},0.6)` }}
          >
            Play Now
            <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* outer hover ring */}
      <div
        className="absolute inset-0 rounded-[26px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `inset 0 0 0 1px rgba(${a},0.5)` }}
      />
    </Link>
  );
}
