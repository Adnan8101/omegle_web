'use client';

import { memo } from 'react';
import { FiAlertCircle, FiClock, FiLock, FiPackage, FiRefreshCw, FiZap } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { availabilityOf, formatNumber, type ShopBudget, type ShopItem } from '../_lib/types';

interface ProductCardProps {
  item: ShopItem;
  isLoggedIn: boolean;
  userBalance: number;
  budget: ShopBudget | null;
  currencyEmoji: string;
  purchasing: boolean;
  onCooldown: boolean;
  cooldownLabel: string;
  onBuy: (item: ShopItem) => void;
  /** The one card that gets two columns and a horizontal read. */
  featured?: boolean;
}

const CTA_TONES: Record<string, { className: string }> = {
  buy: { className: 'bg-[#F6B93B] text-[#1c1406] hover:brightness-[1.08]' },
  signin: { className: 'bg-[#5865F2] text-white hover:bg-[#4752C4]' },
  cooldown: { className: 'bg-white/[0.06] text-white/60 border border-white/10' },
  warn: { className: 'bg-orange-500/10 text-orange-300 border border-orange-500/25' },
  poor: { className: 'bg-white/[0.04] text-white/35 border border-white/8' },
  dead: { className: 'bg-white/[0.03] text-white/30 border border-white/8' },
};

/** Clean, restrained product tile — one border, one hover lift, no ambient effects. */
function ProductCard({
  item,
  isLoggedIn,
  userBalance,
  budget,
  currencyEmoji,
  purchasing,
  onCooldown,
  cooldownLabel,
  onBuy,
  featured = false,
}: ProductCardProps) {
  const state = availabilityOf(item, {
    isLoggedIn,
    userBalance,
    budget,
    purchasing,
    onCooldown,
    cooldownLabel: `Wait ${cooldownLabel}`,
  });
  const cta = CTA_TONES[state.tone] ?? CTA_TONES.dead;
  const dimmed = state.unavailable;

  const blockedReason = state.outOfStock
    ? 'Sold out'
    : state.disabled
    ? 'Off the shelves'
    : state.insufficientBudget
    ? 'Pool can’t cover this yet'
    : null;

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-white/15"
      style={{ opacity: dimmed ? 0.8 : 1 }}
    >
      <div className={featured ? 'flex flex-1 flex-col sm:flex-row sm:items-stretch' : 'flex flex-1 flex-col'}>
        {/* ══ Art window ═══════════════════════════════════════════ */}
        <div className={featured ? 'p-[6px] sm:w-[52%] sm:flex-shrink-0' : 'p-[6px]'}>
          <div
            className="relative h-full w-full overflow-hidden rounded-[16px] bg-white/[0.03]"
            style={{ aspectRatio: featured ? undefined : '5 / 4', minHeight: featured ? 230 : undefined }}
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                style={{ filter: dimmed ? 'grayscale(1) brightness(0.55)' : 'none' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <FiPackage className="h-10 w-10 text-white/20" />
              </div>
            )}

            {/* ── Chips ─────────────────────────────────────────── */}
            {state.stockLeft !== null && (
              <span
                className={`absolute right-2.5 top-2.5 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tabular-nums backdrop-blur-md ${
                  state.stockLeft <= 5
                    ? 'border-red-400/35 bg-black/60 text-red-300'
                    : 'border-white/15 bg-black/55 text-white/75'
                }`}
              >
                {state.stockLeft} left
              </span>
            )}

            {state.daysLeft !== null && (
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-black/60 px-2.5 py-1 text-[10px] font-extrabold text-red-300 backdrop-blur-md">
                <FiClock className="h-2.5 w-2.5" />
                {state.daysLeft}d left
              </span>
            )}

            {/* ── Blocked plate ─────────────────────────────────── */}
            {blockedReason && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.11em] text-white/85 backdrop-blur-md">
                  <FiLock className="h-3 w-3" />
                  {blockedReason}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ══ Detail ═══════════════════════════════════════════════ */}
        <div className={featured ? 'flex flex-1 flex-col p-5 sm:p-7' : 'flex flex-1 flex-col px-5 pb-5 pt-4'}>
          <h3
            className={`font-extrabold tracking-[-0.02em] text-white ${
              featured ? 'text-[22px] leading-[1.16] sm:text-[26px]' : 'line-clamp-2 text-[16px] leading-[1.25]'
            }`}
          >
            {item.name}
          </h3>

          {item.description && (
            <p
              className={`mt-2 text-[13px] leading-[1.55] text-white/45 ${
                featured ? 'max-w-[46ch] line-clamp-4' : 'line-clamp-2'
              }`}
            >
              {item.description}
            </p>
          )}

          {item.income_amount && item.time_hours ? (
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
              <FiZap className="h-3 w-3" />
              <span className="flex items-center gap-1">
                +<CurrencyMark emoji={currencyEmoji} size={12} />
                {formatNumber(item.income_amount)}
              </span>
              every {item.time_hours}h
            </span>
          ) : null}

          {/* price + action pinned to the bottom of every card */}
          <div className="mt-auto pt-5">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
              <span className="flex items-center gap-1.5">
                <CurrencyMark emoji={currencyEmoji} size={featured ? 20 : 17} />
                <span
                  className={`font-extrabold leading-none text-white tabular-nums ${
                    featured ? 'text-[28px]' : 'text-[21px]'
                  }`}
                >
                  {formatNumber(item.price)}
                </span>
              </span>

              {item.price_inr !== undefined && item.price_inr !== null && (
                <span className="text-[11px] font-bold text-emerald-300" title="Real-world value of this reward">
                  worth ₹{formatNumber(item.price_inr)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onBuy(item)}
              disabled={state.blocked}
              className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-extrabold transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed ${cta.className}`}
            >
              {purchasing ? (
                <>
                  <FiRefreshCw className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : state.tone === 'cooldown' ? (
                <>
                  <FiClock className="h-3.5 w-3.5" />
                  {state.cta}
                </>
              ) : (
                state.cta
              )}
            </button>

            {/* ── Requirements ─────────────────────────────────── */}
            {isLoggedIn && item.required_balance && userBalance < item.required_balance && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-snug text-orange-300">
                <FiAlertCircle className="mt-[2px] h-3 w-3 flex-shrink-0" />
                <span className="flex flex-wrap items-center gap-1">
                  Needs a minimum balance of
                  <CurrencyMark emoji={currencyEmoji} size={12} />
                  {formatNumber(item.required_balance)}
                </span>
              </p>
            )}

            {isLoggedIn && state.missingRole && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-snug text-orange-300">
                <FiLock className="mt-[2px] h-3 w-3 flex-shrink-0" />
                <span>
                  Locked to{' '}
                  {item.role_required_names?.length ? item.role_required_names.join(', ') : 'a specific role'}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
