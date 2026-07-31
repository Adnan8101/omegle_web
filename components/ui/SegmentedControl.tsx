'use client';

import { motion, useReducedMotion } from 'framer-motion';

export interface SegmentedOption {
  id: string;
  label: string;
  title?: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  /** Distinct layoutId per instance so two controls on the same page don't share a sliding pill. */
  layoutId: string;
  size?: 'md' | 'lg';
  /** `dark` — forced-black pages (Shop). `surface` — theme-aware pages riding the `fx-` tokens (Team, Leaderboard). */
  variant?: 'dark' | 'surface';
  className?: string;
}

const TRACK_CLASS = {
  dark: 'border-white/10 bg-white/[0.03]',
  surface: 'border-[var(--fx-hairline-strong)] bg-[var(--fx-surface-raised)]',
};

const INACTIVE_INK = {
  dark: 'rgba(255,255,255,0.65)',
  surface: 'var(--fx-ink-3)',
};

/**
 * One shared pill-tab primitive — an Apple-style segmented control with a
 * single white pill that physically slides to whichever segment is active.
 * Reused across the shop nav, the product sort bar, the team filter, and the
 * leaderboard metric toggle so every tab control on the site reads as the
 * same widget.
 */
export default function SegmentedControl({
  options,
  value,
  onChange,
  layoutId,
  size = 'md',
  variant = 'dark',
  className = '',
}: SegmentedControlProps) {
  const reduce = useReducedMotion();
  const pad = size === 'lg' ? 'px-4 py-2.5 text-[13px]' : 'px-3.5 py-1.5 text-[12px]';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-0.5 rounded-full border p-1 ${TRACK_CLASS[variant]} ${className}`}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            onClick={() => onChange(option.id)}
            className={`relative whitespace-nowrap rounded-full font-bold transition-colors duration-200 ${pad}`}
            style={{ color: active ? '#0a0a0d' : INACTIVE_INK[variant] }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-white shadow-lg shadow-black/20"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36, mass: 0.55 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
