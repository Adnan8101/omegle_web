'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { CountUp } from '@/components/motion';
import BlockedBadge from './BlockedBadge';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { tierFor, type Metric, type RankedEntry } from '../types';

interface LadderRowProps {
  entry: RankedEntry;
  currencyEmoji: string;
  currencyName: string;
  metric: Metric;
  /** Only meaningful when both metrics carry distinct data. */
  showMovement: boolean;
}

const SPRING = { type: 'spring', stiffness: 380, damping: 40, mass: 0.9 } as const;

export default function LadderRow({
  entry,
  currencyEmoji,
  currencyName,
  metric,
  showMovement,
}: LadderRowProps) {
  const reduce = useReducedMotion();
  const tier = tierFor(entry.position);
  const isMedal = entry.position <= 3;

  const movement = entry.alternatePosition - entry.position;
  const otherMetricLabel = metric === 'total' ? 'season points' : `total ${currencyName}`;

  return (
    <motion.li
      layout={reduce ? false : 'position'}
      transition={reduce ? { duration: 0 } : SPRING}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
      className="group"
    >
      <div
        className="fx-surface fx-lift relative grid items-center gap-x-4 gap-y-3 rounded-[var(--fx-r-md)] px-4 py-4 sm:px-5"
        style={{
          gridTemplateColumns: 'auto auto minmax(0,1fr) auto',
          ...(isMedal ? { borderColor: tier.ring } : null),
        }}
      >
        {isMedal && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60"
            style={{ background: `linear-gradient(90deg, ${tier.glow}, transparent 42%)` }}
          />
        )}

        {/* Rank */}
        <div className="relative flex w-9 items-center justify-center sm:w-11">
          <span
            className="fx-num text-[19px] font-black tracking-[-0.04em] sm:text-[23px]"
            style={{ color: isMedal ? tier.ink : 'var(--fx-ink-3)' }}
          >
            {String(entry.position).padStart(2, '0')}
          </span>
        </div>

        {/* Avatar */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-1 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-70"
            style={{ background: tier.glow }}
          />
          <img
            src={entry.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="relative h-11 w-11 rounded-full border-2 object-cover transition-transform duration-500 ease-[var(--fx-ease)] group-hover:scale-[1.06] sm:h-12 sm:w-12"
            style={{ borderColor: isMedal ? tier.ring : 'var(--fx-hairline-strong)' }}
          />
        </div>

        {/* Identity + score bar */}
        <div className="relative min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="truncate text-[15px] font-bold tracking-[-0.015em] text-[rgb(var(--color-text-primary))] sm:text-[16.5px]">
              {entry.username}
            </h3>

            {showMovement && movement !== 0 && (
              <span
                title={`#${entry.alternatePosition} by ${otherMetricLabel}`}
                className={`fx-num inline-flex items-center gap-0.5 rounded text-[10.5px] font-extrabold ${
                  movement > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {movement > 0 ? (
                  <FiChevronUp className="h-3 w-3" />
                ) : (
                  <FiChevronDown className="h-3 w-3" />
                )}
                {Math.abs(movement)}
              </span>
            )}

            {entry.isTempBlocked && (
              <BlockedBadge reason={entry.tempBlockReason} until={entry.tempBlockedUntil} />
            )}
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <div className="fx-bar h-1.5 w-full max-w-[240px]">
              <motion.div
                className="fx-bar-fill"
                style={{ background: tier.fill, width: '100%' }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: Math.max(entry.shareOfLeader, 0.015) }}
                transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="fx-num hidden text-[11px] font-bold text-[var(--fx-ink-3)] sm:inline">
              {Math.round(entry.shareOfLeader * 100)}%
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="relative flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <CurrencyMark emoji={currencyEmoji} size={17} />
            <span
              className="fx-num text-[17px] font-extrabold tracking-[-0.025em] sm:text-[21px]"
              style={{ color: isMedal ? tier.ink : 'rgb(var(--color-text-primary))' }}
            >
              <CountUp value={entry.score} />
            </span>
          </div>
          <span className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.11em] text-[var(--fx-ink-3)]">
            {metric === 'total' ? currencyName : 'Points'}
          </span>
        </div>
      </div>
    </motion.li>
  );
}
