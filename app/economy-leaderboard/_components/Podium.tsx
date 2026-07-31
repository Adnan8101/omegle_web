'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CountUp } from '@/components/motion';
import BlockedBadge from './BlockedBadge';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { TIERS, type RankedEntry } from '../types';

interface PodiumProps {
  /** Exactly the top three, already sorted by position. */
  entries: RankedEntry[];
  currencyEmoji: string;
  currencyName: string;
}

const HEIGHT: Record<number, string> = { 1: 'sm:pb-9', 2: 'sm:pb-4', 3: 'sm:pb-0' };
const AVATAR: Record<number, string> = { 1: 'h-24 w-24 sm:h-28 sm:w-28', 2: 'h-20 w-20', 3: 'h-20 w-20' };
const ORDER: Record<number, string> = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };

/**
 * The top three as a real podium — #1 centred and raised with a crown, #2
 * and #3 flanking at their own heights. A game-like read that a single
 * "champion banner" can't give you.
 */
export default function Podium({ entries, currencyEmoji, currencyName }: PodiumProps) {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-end sm:gap-5">
      {entries.map((entry) => {
        const tier = TIERS[entry.position] ?? TIERS[3];
        const isFirst = entry.position === 1;

        return (
          <motion.div
            key={entry.user_id}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (entry.position - 1) * 0.1 }}
            className={`fx-surface relative flex-1 overflow-hidden rounded-[var(--fx-r-lg)] px-5 pt-8 text-center ${HEIGHT[entry.position] ?? ''} ${ORDER[entry.position] ?? ''}`}
            style={{ boxShadow: isFirst ? `0 34px 70px -40px ${tier.glow}, var(--fx-shadow)` : undefined }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: `radial-gradient(120% 130% at 50% 0%, ${tier.glow} 0%, transparent 62%)` }}
            />
            <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tier.ink}99, transparent)` }} />

            <div className="relative">
              {isFirst && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 select-none text-[26px]"
                  animate={reduce ? undefined : { y: [0, -5, 0] }}
                  transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  👑
                </motion.span>
              )}

              <div className="relative mx-auto mt-3 w-fit">
                <div aria-hidden className="absolute inset-0 rounded-full opacity-55 blur-lg" style={{ background: tier.glow }} />
                <img
                  src={entry.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={entry.username}
                  className={`relative rounded-full border-[3px] object-cover shadow-xl ${AVATAR[entry.position] ?? 'h-20 w-20'}`}
                  style={{ borderColor: tier.ring }}
                />
                <span
                  className="fx-num absolute -bottom-1.5 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[rgb(var(--color-bg-primary))] text-[12px] font-black"
                  style={{ background: tier.ink, color: '#0a0a0f' }}
                >
                  {entry.position}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                {entry.isTempBlocked && <BlockedBadge reason={entry.tempBlockReason} until={entry.tempBlockedUntil} />}
              </div>

              <h3 className="mt-1.5 truncate text-[15px] font-extrabold tracking-[-0.015em] text-[rgb(var(--color-text-primary))] sm:text-[16.5px]">
                {entry.username}
              </h3>

              <div className="mb-1 mt-2 flex items-center justify-center gap-1.5">
                <CurrencyMark emoji={currencyEmoji} size={15} />
                <span className="fx-num text-[17px] font-extrabold tracking-[-0.02em]" style={{ color: tier.ink }}>
                  <CountUp value={entry.score} />
                </span>
              </div>
              <p className="mb-6 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--fx-ink-3)]">
                {currencyName}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
