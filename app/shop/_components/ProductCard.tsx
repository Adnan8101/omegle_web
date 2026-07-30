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
  onBuy: (item: ShopItem) => void;
  /** The one card that gets two columns and a horizontal read. */
  featured?: boolean;
}

const CTA_TONES: Record<string, { background: string; color: string; border: string }> = {
  buy: { background: '#F6B93B', color: '#1c1406', border: 'transparent' },
  signin: { background: '#5865F2', color: '#ffffff', border: 'transparent' },
  warn: { background: 'rgba(251,146,60,0.13)', color: '#fdba74', border: 'rgba(251,146,60,0.28)' },
  poor: { background: 'rgba(255,255,255,0.045)', color: 'rgba(240,240,252,0.42)', border: 'rgba(255,255,255,0.08)' },
  dead: { background: 'rgba(255,255,255,0.03)', color: 'rgba(240,240,252,0.34)', border: 'rgba(255,255,255,0.07)' },
};

/** Clean, restrained product tile — one border, one hover lift, no ambient effects. */
function ProductCard({
  item,
  isLoggedIn,
  userBalance,
  budget,
  currencyEmoji,
  purchasing,
  onBuy,
  featured = false,
}: ProductCardProps) {
  const state = availabilityOf(item, { isLoggedIn, userBalance, budget, purchasing });
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
      className="sx-lift group relative flex h-full flex-col overflow-hidden border"
      style={{
        borderRadius: 'var(--sx-r-lg)',
        borderColor: 'var(--sx-hair)',
        background: 'rgba(255,255,255,0.03)',
        opacity: dimmed ? 0.8 : 1,
      }}
    >
      <div
        className={
          featured
            ? 'flex flex-1 flex-col sm:flex-row sm:items-stretch'
            : 'flex flex-1 flex-col'
        }
      >
        {/* ══ Art window ═══════════════════════════════════════════ */}
        <div className={featured ? 'p-[6px] sm:w-[52%] sm:flex-shrink-0' : 'p-[6px]'}>
          <div
            className="relative h-full w-full overflow-hidden"
            style={{
              borderRadius: 'calc(var(--sx-r-lg) - 7px)',
              background: 'rgba(255,255,255,0.03)',
              aspectRatio: featured ? undefined : '5 / 4',
              minHeight: featured ? 230 : undefined,
            }}
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ease-[var(--sx-ease)] group-hover:scale-[1.03]"
                style={{ filter: dimmed ? 'grayscale(1) brightness(0.55)' : 'none' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <FiPackage className="h-10 w-10 text-[var(--sx-ink-4)]" />
              </div>
            )}

            {/* ── Chips ─────────────────────────────────────────── */}
            {state.stockLeft !== null && (
              <span
                className="sx-num absolute right-2.5 top-2.5 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-md"
                style={
                  state.stockLeft <= 5
                    ? { color: '#ffb1a0', borderColor: 'rgba(251,113,133,0.36)', background: 'rgba(20,10,12,0.6)' }
                    : { color: 'var(--sx-ink-2)', borderColor: 'var(--sx-hair-2)', background: 'rgba(0,0,0,0.55)' }
                }
              >
                {state.stockLeft} left
              </span>
            )}

            {state.daysLeft !== null && (
              <span
                className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-md"
                style={{ color: '#ffb1a0', borderColor: 'rgba(251,113,133,0.32)', background: 'rgba(0,0,0,0.6)' }}
              >
                <FiClock className="h-2.5 w-2.5" />
                {state.daysLeft}d left
              </span>
            )}

            {/* ── Blocked plate ─────────────────────────────────── */}
            {blockedReason && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.11em] backdrop-blur-md"
                  style={{ color: '#ffd7cf', borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.7)' }}
                >
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
            className={`font-extrabold tracking-[-0.022em] text-[var(--sx-ink)] ${
              featured ? 'text-[22px] leading-[1.16] sm:text-[26px]' : 'line-clamp-2 text-[16px] leading-[1.25]'
            }`}
          >
            {item.name}
          </h3>

          {item.description && (
            <p
              className={`mt-2 text-[13px] leading-[1.55] text-[var(--sx-ink-3)] ${
                featured ? 'max-w-[46ch] line-clamp-4' : 'line-clamp-2'
              }`}
            >
              {item.description}
            </p>
          )}

          {item.income_amount && item.time_hours ? (
            <span
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={{ color: '#6ee7b7', borderColor: 'rgba(52,211,153,0.28)', background: 'rgba(52,211,153,0.1)' }}
            >
              <FiZap className="h-3 w-3" />
              <span className="sx-num flex items-center gap-1">
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
                  className={`sx-num font-extrabold leading-none text-[var(--sx-ink)] ${
                    featured ? 'text-[28px]' : 'text-[21px]'
                  }`}
                >
                  {formatNumber(item.price)}
                </span>
              </span>

              {item.price_inr !== undefined && item.price_inr !== null && (
                <span className="sx-num text-[11px] font-bold text-[#6ee7b7]" title="Real-world value of this reward">
                  worth ₹{formatNumber(item.price_inr)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onBuy(item)}
              disabled={state.blocked}
              className="sx-focus mt-4 flex h-11 w-full items-center justify-center gap-2 text-[13.5px] font-extrabold transition-[filter] duration-200 enabled:hover:brightness-[1.08] enabled:active:scale-[0.985] disabled:cursor-not-allowed"
              style={{
                borderRadius: 'var(--sx-r-sm)',
                background: cta.background,
                color: cta.color,
                border: `1px solid ${cta.border}`,
              }}
            >
              {purchasing ? (
                <>
                  <FiRefreshCw className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                state.cta
              )}
            </button>

            {/* ── Requirements ─────────────────────────────────── */}
            {isLoggedIn && item.required_balance && userBalance < item.required_balance && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-snug text-[#fdba74]">
                <FiAlertCircle className="mt-[2px] h-3 w-3 flex-shrink-0" />
                <span className="sx-num flex flex-wrap items-center gap-1">
                  Needs a minimum balance of
                  <CurrencyMark emoji={currencyEmoji} size={12} />
                  {formatNumber(item.required_balance)}
                </span>
              </p>
            )}

            {isLoggedIn && state.missingRole && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-snug text-[#fdba74]">
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
