'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CountUp } from '@/components/motion';
import BlockedBadge from './BlockedBadge';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { TIERS, type RankedEntry } from '../types';

interface ChampionProps {
  entry: RankedEntry;
  runnerUpScore: number | null;
  poolTotal: number;
  currencyEmoji: string;
  currencyName: string;
}

const GOLD = TIERS[1];

export default function Champion({
  entry,
  runnerUpScore,
  poolTotal,
  currencyEmoji,
  currencyName,
}: ChampionProps) {
  const reduce = useReducedMotion();

  const share = poolTotal > 0 ? (entry.score / poolTotal) * 100 : 0;
  const lead = runnerUpScore !== null ? entry.score - runnerUpScore : null;

  return (
    <div
      className="fx-surface relative overflow-hidden rounded-[var(--fx-r-xl)]"
      style={{ boxShadow: `0 40px 90px -46px ${GOLD.glow}, var(--fx-shadow)` }}
    >
      {/* Ambient gold wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 150% at 12% 0%, rgba(251,191,36,0.16) 0%, transparent 58%), radial-gradient(90% 120% at 95% 100%, rgba(249,115,22,0.10) 0%, transparent 60%)',
        }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.8), transparent)' }}
      />

      <div className="relative flex flex-col items-center gap-7 px-6 py-9 text-center sm:px-10 sm:py-11 lg:flex-row lg:items-center lg:gap-10 lg:text-left">
        {/* Portrait */}
        <div className="relative flex-shrink-0">
          <motion.div
            aria-hidden
            className="absolute -inset-3 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${GOLD.ink}00 40deg, ${GOLD.ink}cc 140deg, ${GOLD.ink}00 240deg, transparent 360deg)`,
              filter: 'blur(9px)',
            }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={reduce ? undefined : { duration: 13, repeat: Infinity, ease: 'linear' }}
          />
          <div
            aria-hidden
            className="absolute -inset-6 rounded-full opacity-60 blur-2xl"
            style={{ background: GOLD.glow }}
          />
          <motion.span
            aria-hidden
            className="absolute -top-9 left-1/2 -translate-x-1/2 select-none text-[34px]"
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={reduce ? undefined : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            👑
          </motion.span>

          <img
            src={entry.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt={entry.username}
            width={132}
            height={132}
            className="relative h-[112px] w-[112px] rounded-full border-[3px] object-cover shadow-2xl sm:h-[132px] sm:w-[132px]"
            style={{ borderColor: GOLD.ring }}
          />
        </div>

        {/* Identity + score */}
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em]"
              style={{
                color: GOLD.ink,
                borderColor: 'rgba(251,191,36,0.35)',
                background: 'rgba(251,191,36,0.10)',
              }}
            >
              Champion
            </span>
            {entry.isTempBlocked && (
              <BlockedBadge reason={entry.tempBlockReason} until={entry.tempBlockedUntil} />
            )}
          </div>

          <h2 className="truncate text-[clamp(28px,5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-[rgb(var(--color-text-primary))]">
            {entry.username}
          </h2>

          <div className="mt-4 flex items-center justify-center gap-2.5 lg:justify-start">
            <CurrencyMark emoji={currencyEmoji} size={30} />
            <span
              className="fx-num text-[clamp(32px,6vw,52px)] font-black leading-none tracking-[-0.04em]"
              style={{
                background: 'linear-gradient(100deg, #FDE68A, #F59E0B)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              <CountUp value={entry.score} duration={1.6} />
            </span>
            <span className="self-end pb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--fx-ink-3)]">
              {currencyName}
            </span>
          </div>
        </div>

        {/* Readings */}
        <dl className="grid w-full shrink-0 grid-cols-2 gap-px overflow-hidden rounded-[var(--fx-r-md)] border border-[var(--fx-hairline)] bg-[var(--fx-hairline)] lg:w-[260px]">
          <Reading label="Of pool" value={`${share.toFixed(1)}%`} />
          <Reading
            label="Lead over #2"
            value={lead === null ? '—' : `+${lead.toLocaleString()}`}
          />
        </dl>
      </div>
    </div>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[rgb(var(--color-bg-primary))] px-4 py-3.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--fx-ink-3)]">
        {label}
      </dt>
      <dd className="fx-num mt-1 text-[16px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
        {value}
      </dd>
    </div>
  );
}
