'use client';

import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { Metric } from '../types';

interface MetricToggleProps {
  value: Metric;
  onChange: (metric: Metric) => void;
  currencyName: string;
}

export default function MetricToggle({ value, onChange, currencyName }: MetricToggleProps) {
  const reduce = useReducedMotion();

  const options: { id: Metric; label: string; hint: string }[] = [
    { id: 'total', label: `Total ${currencyName}`, hint: `Rank by lifetime ${currencyName} held` },
    { id: 'season', label: 'Season points', hint: 'Rank by points earned this season' },
  ];

  return (
    <div
      role="group"
      aria-label="Ranking metric"
      className="fx-surface inline-flex gap-1 rounded-full p-1.5"
    >
      <LayoutGroup id="metric-toggle">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              title={option.hint}
              className="fx-focus relative whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-bold transition-colors sm:px-5 sm:text-[13px]"
              style={{ color: active ? '#0a0a0f' : 'var(--fx-ink-3)' }}
            >
              {active && (
                <motion.span
                  layoutId="metric-toggle-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-white shadow-lg shadow-black/25"
                  transition={
                    reduce ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 38, mass: 0.7 }
                  }
                />
              )}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </LayoutGroup>
    </div>
  );
}
