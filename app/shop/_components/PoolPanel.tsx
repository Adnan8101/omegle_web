'use client';

import { CountUp, Reveal } from '@/components/motion';
import CurrencyMark from '@/components/ui/CurrencyMark';
import type { ShopBudget } from '../_lib/types';

/**
 * The pool is the one number that governs the whole shop — if it empties,
 * every listing goes unbuyable. A title, a thin meter, and the three figures
 * that matter, laid out as plain label/value pairs rather than a stats wall.
 */
export default function PoolPanel({
  budget,
  currencyEmoji,
  currencyName,
}: {
  budget: ShopBudget;
  currencyEmoji: string;
  currencyName: string;
}) {
  const percent =
    budget.total_added > 0
      ? Math.min(100, Math.max(0, Math.round((budget.available / budget.total_added) * 100)))
      : 0;

  return (
    <Reveal dir="up" distance={18} scale={0.99}>
      <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-white">Community Reward Pool</h2>

        <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[#3B9EFF] transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <span className="text-[11px] font-semibold text-white/40">{currencyName} Remaining</span>
            <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
              <span className="flex items-center gap-1.5 text-[19px] font-extrabold text-white">
                <CurrencyMark emoji={currencyEmoji} size={16} />
                <CountUp value={budget.available} duration={1.1} />
              </span>
              <span className="text-[13px] font-semibold text-white/35">/ {budget.total_added.toLocaleString()}</span>
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-white/40">Spent</span>
            <p className="mt-1 text-[19px] font-extrabold text-white tabular-nums">
              {budget.total_spent.toLocaleString()}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-white/40">Available</span>
            <p className="mt-1 text-[19px] font-extrabold text-white tabular-nums">{percent}%</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
