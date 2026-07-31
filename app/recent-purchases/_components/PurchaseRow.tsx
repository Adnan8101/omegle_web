'use client';

import { FiCheckCircle, FiClock, FiPackage } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatRelativeTime } from '@/lib/time';
import type { RecentPurchase } from '../types';
import { clockOf, initialsOf, statusLabel } from '../utils';

interface PurchaseRowProps {
  purchase: RecentPurchase;
  currencyEmoji: string;
  currencyName: string;
}

/**
 * One entry in the timeline. The rail (time + node) is a desktop affordance;
 * on phones it collapses and the time moves into the card's chip row.
 * Rendered inside the feed's own <li>, which owns the positioning context.
 */
export default function PurchaseRow({ purchase, currencyEmoji, currencyName }: PurchaseRowProps) {
  const status = statusLabel(purchase.status);
  const { user } = purchase;

  return (
    <>
      {/* ── Rail ────────────────────────────────────────────────── */}
      <span className="absolute left-0 top-[26px] hidden w-[58px] text-right text-[12px] font-bold tabular-nums text-white/30 sm:block">
        {clockOf(purchase.purchasedAt)}
      </span>
      <span
        aria-hidden
        className="absolute left-[79px] top-[30px] hidden h-2.5 w-2.5 rounded-full bg-[#3B9EFF]/70 sm:block"
        style={{ boxShadow: '0 0 0 4px rgba(59,158,255,0.14)' }}
      />

      {/* ── Card ────────────────────────────────────────────────── */}
      <div className="group relative overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15">
        <div className="flex items-stretch gap-4 p-4 sm:gap-5 sm:p-5">
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            {/* who */}
            <div className="flex items-center gap-2.5">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  width={30}
                  height={30}
                  loading="lazy"
                  decoding="async"
                  className="h-[30px] w-[30px] flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-extrabold text-white/50">
                  {initialsOf(user.displayName)}
                </span>
              )}

              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-bold leading-tight text-white">
                  {user.displayName}
                </span>
                {user.username && (
                  <span className="block truncate text-[10.5px] leading-tight text-white/30">
                    @{user.username}
                  </span>
                )}
              </span>
            </div>

            {/* what */}
            <h3 className="mt-3.5 truncate text-[17px] font-extrabold tracking-[-0.02em] text-white sm:text-[19px]">
              {purchase.itemName}
            </h3>
            <p className="mt-1 line-clamp-1 text-[12.5px] text-white/40">
              {purchase.itemDescription?.trim() ||
                (purchase.itemDelisted ? 'No longer listed in the shop' : 'Bought from the rewards shop')}
            </p>

            {/* facts */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1"
                title={`${purchase.pricePaid.toLocaleString()} ${currencyName}`}
              >
                <CurrencyMark emoji={currencyEmoji} size={13} />
                <span className="text-[12px] font-extrabold text-[#ffd77a] tabular-nums">
                  {purchase.pricePaid.toLocaleString()}
                </span>
              </span>

              {status.redeemed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.11em] text-emerald-300">
                  <FiCheckCircle className="h-2.5 w-2.5" />
                  {status.label}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-white/30 sm:hidden">
                <FiClock className="h-2.5 w-2.5" />
                <time dateTime={purchase.purchasedAt}>{formatRelativeTime(purchase.purchasedAt)}</time>
              </span>
            </div>
          </div>

          {/* art */}
          <div className="flex-shrink-0 self-center">
            <div className="relative h-[84px] w-[84px] overflow-hidden rounded-[16px] border border-white/8 bg-white/[0.03] sm:h-[104px] sm:w-[104px]">
              {purchase.itemThumbnail ? (
                <img
                  src={purchase.itemThumbnail}
                  alt={purchase.itemName}
                  width={104}
                  height={104}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <FiPackage className="h-7 w-7 text-white/20" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
