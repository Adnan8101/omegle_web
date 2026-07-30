'use client';

import { CountUp, Reveal } from '@/components/motion';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatNumber, type ShopBudget } from '../_lib/types';

/**
 * The pool is the one number that governs the whole shop — if it empties,
 * every listing goes unbuyable. One flat meter, one accent colour, the two
 * numbers that actually matter. No rainbow health states, no tick grid.
 */
export default function PoolPanel({
  budget,
  currencyEmoji,
}: {
  budget: ShopBudget;
  currencyEmoji: string;
}) {
  const percent =
    budget.total_added > 0
      ? Math.min(100, Math.max(0, Math.round((budget.available / budget.total_added) * 100)))
      : 0;

  return (
    <Reveal dir="up" distance={18} scale={0.99}>
      <div className="sx-panel" style={{ borderRadius: 'var(--sx-r-xl)' }}>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="min-w-0">
            <span className="sx-eyebrow">Community reward pool</span>
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="flex items-center gap-1.5">
                <CurrencyMark emoji={currencyEmoji} size={20} />
                <span className="sx-num text-[26px] font-extrabold text-[var(--sx-ink)]">
                  <CountUp value={budget.available} duration={1.2} />
                </span>
              </span>
              <span className="text-[13px] font-semibold text-[var(--sx-ink-3)]">
                left of {formatNumber(budget.total_added)}
              </span>
            </div>

            <div className="mt-3.5 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-[var(--sx-ease)]"
                style={{ width: `${percent}%`, background: '#8b7cff' }}
              />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-8 border-t pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0" style={{ borderColor: 'var(--sx-hair)' }}>
            <div>
              <span className="sx-eyebrow text-[9.5px]">Spent so far</span>
              <span className="sx-num mt-1.5 flex items-center gap-1.5 text-[16px] font-bold text-[var(--sx-ink)]">
                <CurrencyMark emoji={currencyEmoji} size={13} />
                {formatNumber(budget.total_spent)}
              </span>
            </div>
            <div>
              <span className="sx-eyebrow text-[9.5px]">Available</span>
              <span className="sx-num mt-1.5 text-[16px] font-bold text-[var(--sx-ink)]">{percent}%</span>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
