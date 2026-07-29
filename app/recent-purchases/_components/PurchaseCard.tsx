'use client';

import { FiCheckCircle, FiClock, FiPackage, FiShoppingBag } from 'react-icons/fi';
import SpotlightCard from '@/components/ui/SpotlightCard';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatRelativeTime } from '@/lib/time';
import { TIER_STYLES, type RecentPurchase, type ValueTier } from '../types';
import { initialsOf, statusLabel } from '../utils';

interface PurchaseCardProps {
  purchase: RecentPurchase;
  tier: ValueTier;
  currencyEmoji: string;
  currencyName: string;
}

export default function PurchaseCard({
  purchase,
  tier,
  currencyEmoji,
  currencyName,
}: PurchaseCardProps) {
  const style = TIER_STYLES[tier];
  const status = statusLabel(purchase.status);
  const { user } = purchase;

  return (
    <SpotlightCard
      accent={tier === 'standard' ? null : style.ink}
      className="fx-lift group relative overflow-hidden rounded-[var(--fx-r-lg)]"
    >
      {/* Tier wash — the card's only ambient colour */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(110% 130% at 100% 0%, ${style.glow} 0%, transparent 58%)` }}
      />

      <div className="relative z-[2] flex items-stretch gap-4 p-4 sm:gap-6 sm:p-6">
        {/* ── Left: who bought what ─────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="min-w-0">
            {/* Buyer */}
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="h-8 w-8 rounded-full border border-[var(--fx-hairline-strong)] object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--fx-hairline-strong)] bg-[var(--fx-surface-raised)] text-[10px] font-extrabold text-[var(--fx-ink-3)]">
                    {initialsOf(user.displayName)}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold leading-tight text-[rgb(var(--color-text-primary))]">
                  {user.displayName}
                </p>
                {user.username && (
                  <p className="truncate text-[11px] leading-tight text-[var(--fx-ink-3)]">
                    @{user.username}
                  </p>
                )}
              </div>
            </div>

            {/* Item */}
            <h3 className="truncate text-[18px] font-extrabold tracking-[-0.022em] text-[rgb(var(--color-text-primary))] sm:text-[21px]">
              {purchase.itemName}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--fx-ink-3)]">
              <FiShoppingBag className="h-3.5 w-3.5 flex-shrink-0" />
              {purchase.itemDescription?.trim() || 'Bought from the Rewards Shop'}
            </p>
          </div>

          {/* ── Bottom row: price · time · badges ───────────────── */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--fx-hairline)] bg-[var(--fx-surface-raised)] px-2.5 py-1"
              title={`${purchase.pricePaid.toLocaleString()} ${currencyName}`}
            >
              <CurrencyMark emoji={currencyEmoji} size={14} />
              <span className="fx-num text-[12.5px] font-extrabold text-[rgb(var(--color-text-primary))]">
                {purchase.pricePaid.toLocaleString()}
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--fx-hairline)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--fx-ink-3)]">
              <FiClock className="h-3 w-3" />
              <time dateTime={purchase.purchasedAt}>{formatRelativeTime(purchase.purchasedAt)}</time>
            </span>

            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.09em]"
              style={{ color: style.ink, borderColor: style.border, background: style.background }}
              title="Value tier, based on price relative to other recent purchases"
            >
              {style.label}
            </span>

            {status.redeemed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-emerald-400">
                <FiCheckCircle className="h-3 w-3" />
                {status.label}
              </span>
            )}
          </div>
        </div>

        {/* ── Right: item art ───────────────────────────────────── */}
        <div className="flex-shrink-0 self-center">
          <div
            className="relative h-[88px] w-[88px] overflow-hidden rounded-[var(--fx-r-md)] border border-[var(--fx-hairline)] bg-[var(--fx-surface-raised)] shadow-lg transition-all duration-500 ease-[var(--fx-ease)] group-hover:-translate-y-1 group-hover:shadow-2xl sm:h-[116px] sm:w-[116px]"
            style={{ boxShadow: `0 18px 40px -22px ${style.glow}` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: `linear-gradient(140deg, ${style.glow}, transparent 60%)` }}
            />
            {purchase.itemThumbnail ? (
              <img
                src={purchase.itemThumbnail}
                alt={purchase.itemName}
                width={116}
                height={116}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.08]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <FiPackage className="h-8 w-8 text-[var(--fx-ink-3)]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
