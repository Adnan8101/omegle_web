'use client';

import { CountUp, Item, RevealGroup } from '@/components/motion';
import CurrencyMark from '@/components/ui/CurrencyMark';

interface PoolStatsProps {
  total: number;
  leader: number;
  average: number;
  tracked: number;
  currencyEmoji: string;
  currencyName: string;
}

/**
 * Instrument panel above the ladder — four readings sharing one surface and
 * one hairline grid, rather than four disconnected floating cards.
 */
export default function PoolStats({
  total,
  leader,
  average,
  tracked,
  currencyEmoji,
  currencyName,
}: PoolStatsProps) {
  const stats = [
    { key: 'total', label: `${currencyName} in play`, value: total, mark: true, accent: '#FBBF24' },
    { key: 'leader', label: 'Top holding', value: leader, mark: true, accent: '#F97316' },
    { key: 'average', label: 'Average holding', value: average, mark: true, accent: '#3B9EFF' },
    { key: 'tracked', label: 'Members ranked', value: tracked, mark: false, accent: '#A78BFA' },
  ];

  return (
    <RevealGroup
      stagger={0.07}
      className="fx-surface grid grid-cols-2 gap-px overflow-hidden rounded-[var(--fx-r-lg)] bg-[var(--fx-hairline)] lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <Item key={stat.key} distance={16} className="h-full">
          <div className="relative h-full bg-[rgb(var(--color-bg-primary))] px-5 py-5 sm:px-6 sm:py-6">
            {/* hairline accent — the only colour each tile carries */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${stat.accent}99, transparent)`,
              }}
            />
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fx-ink-3)]">
              {stat.label}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {stat.mark && <CurrencyMark emoji={currencyEmoji} size={18} />}
              <span className="fx-num text-[clamp(20px,3vw,27px)] font-extrabold leading-none tracking-[-0.03em] text-[rgb(var(--color-text-primary))]">
                <CountUp value={stat.value} />
              </span>
            </div>
          </div>
        </Item>
      ))}
    </RevealGroup>
  );
}
