'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiClock, FiLock, FiPackage, FiRefreshCw, FiShield, FiZap } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatNumber, type ShopItem } from '../_lib/types';

interface PurchaseModalProps {
  item: ShopItem | null;
  currencyEmoji: string;
  currencyName: string;
  userBalance: number;
  purchasing: boolean;
  /** Shown as a heads-up only — buying while already on cooldown is blocked earlier in the flow. */
  cooldownHours: number | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The checkout moment. One column, three beats: what you're getting, what it
 * does to your balance, and the commitment. Mirrors the home page's card
 * language — rounded-[20px], border-white/10, white CTA pill — nothing this
 * component invents on its own.
 */
export default function PurchaseModal({
  item,
  currencyEmoji,
  currencyName,
  userBalance,
  purchasing,
  cooldownHours,
  onCancel,
  onConfirm,
}: PurchaseModalProps) {
  const reduce = useReducedMotion();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const after = item ? userBalance - item.price : 0;

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => confirmRef.current?.focus(), 260);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !purchasing) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [item, purchasing, onCancel]);

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Cancel purchase"
            onClick={() => !purchasing && onCancel()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-confirm-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 36, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 330, damping: 30, mass: 0.8 }}
            className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d12]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3B9EFF]/60 to-transparent" />

            <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
              {/* ══ 1 · What you're getting ═════════════════════════ */}
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Confirm purchase</p>

              <div className="mt-4 flex items-start gap-4">
                <div className="relative h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:h-[86px] sm:w-[86px]">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <FiPackage className="h-7 w-7 text-white/25" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="shop-confirm-title"
                    className="text-[19px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white"
                  >
                    {item.name}
                  </h2>
                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-white/45">{item.description}</p>
                  )}
                </div>
              </div>

              {/* meta chips — only what's actually true for this item */}
              {(item.stock !== null && item.stock !== -1) ||
              item.expires_at ||
              (item.income_amount && item.time_hours) ||
              item.price_inr ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.stock !== null && item.stock !== -1 && (
                    <Chip>
                      <FiPackage className="h-2.5 w-2.5" />
                      {formatNumber(item.stock)} in stock
                    </Chip>
                  )}
                  {item.income_amount && item.time_hours ? (
                    <Chip tint="text-emerald-300 border-emerald-400/25 bg-emerald-400/10">
                      <FiZap className="h-2.5 w-2.5" />
                      +{formatNumber(item.income_amount)} / {item.time_hours}h
                    </Chip>
                  ) : null}
                  {item.price_inr ? (
                    <Chip tint="text-emerald-300 border-emerald-400/25 bg-emerald-400/10">
                      ₹{formatNumber(item.price_inr)} value
                    </Chip>
                  ) : null}
                  {item.expires_at && (
                    <Chip>
                      <FiClock className="h-2.5 w-2.5" />
                      Listed until{' '}
                      {new Date(item.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Chip>
                  )}
                  {item.role_required_names?.length ? (
                    <Chip>
                      <FiLock className="h-2.5 w-2.5" />
                      {item.role_required_names.join(', ')}
                    </Chip>
                  ) : null}
                </div>
              ) : null}

              {/* ══ 2 · What it costs you ═══════════════════════════ */}
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/8">
                <Row label={`Your ${currencyName}`} emoji={currencyEmoji} value={formatNumber(userBalance)} />
                <Row label="This purchase" emoji={currencyEmoji} value={`− ${formatNumber(item.price)}`} tint="text-red-300" />
                <div className="flex items-center justify-between gap-4 border-t border-white/8 bg-emerald-400/10 px-4 py-3.5">
                  <span className="text-[13px] font-bold text-emerald-300">Balance afterwards</span>
                  <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-emerald-300 tabular-nums">
                    <CurrencyMark emoji={currencyEmoji} size={15} />
                    {formatNumber(after)}
                  </span>
                </div>
              </div>

              {/* ── Cooldown heads-up ────────────────────────────── */}
              {cooldownHours !== null && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-orange-400/25 bg-orange-400/10 px-3.5 py-3">
                  <FiClock className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-orange-300" />
                  <p className="text-[12px] leading-snug text-orange-200">
                    Buying this starts a <span className="font-bold text-orange-300">{cooldownHours}h</span> cooldown
                    — you won&apos;t be able to buy anything else on the shop until it lapses.
                  </p>
                </div>
              )}

              {/* ══ 3 · Commit ══════════════════════════════════════ */}
              <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={purchasing}
                  className="h-12 flex-1 rounded-xl border border-white/10 text-[13.5px] font-bold text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-45"
                >
                  Not now
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={onConfirm}
                  disabled={purchasing}
                  className="flex h-12 flex-[1.45] items-center justify-center gap-2 rounded-xl bg-[#F6B93B] text-[13.5px] font-extrabold text-[#1c1406] transition-all duration-200 hover:brightness-[1.06] active:scale-[0.99] disabled:cursor-wait"
                >
                  {purchasing ? (
                    <>
                      <FiRefreshCw className="h-4 w-4 animate-spin" />
                      Completing…
                    </>
                  ) : (
                    <>
                      Buy for
                      <CurrencyMark emoji={currencyEmoji} size={15} />
                      <span className="tabular-nums">{formatNumber(item.price)}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3.5 flex items-start gap-2 text-[11.5px] leading-snug text-white/30">
                <FiShield className="mt-[1px] h-3 w-3 flex-shrink-0" />
                Your redeem code is generated instantly and sent to your Discord DMs. Codes stay valid for a
                month.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Chip({ children, tint }: { children: React.ReactNode; tint?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${
        tint ?? 'border-white/10 bg-white/[0.03] text-white/65'
      }`}
    >
      {children}
    </span>
  );
}

function Row({ label, value, emoji, tint }: { label: string; value: string; emoji: string; tint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white/[0.02] px-4 py-3">
      <span className="text-[12.5px] font-semibold text-white/45">{label}</span>
      <span className={`flex items-center gap-1.5 text-[13.5px] font-bold tabular-nums ${tint ?? 'text-white'}`}>
        <CurrencyMark emoji={emoji} size={14} />
        {value}
      </span>
    </div>
  );
}
