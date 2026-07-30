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
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The checkout moment. One column, three beats: what you're getting, what it
 * does to your balance, and the commitment.
 *
 * The ledger is the point — a member should never be surprised by what they
 * have left afterwards — so it's set in tabular figures with the resulting
 * balance called out on its own line.
 */
export default function PurchaseModal({
  item,
  currencyEmoji,
  currencyName,
  userBalance,
  purchasing,
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
          {/* ── Backdrop: dim and blur arrive together, then hold ──── */}
          <motion.button
            type="button"
            aria-label="Cancel purchase"
            onClick={() => !purchasing && onCancel()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full cursor-default"
            style={{
              background: 'radial-gradient(120% 100% at 50% 0%, rgba(18,10,40,0.82), rgba(2,2,6,0.9))',
              backdropFilter: 'blur(16px) saturate(120%)',
              WebkitBackdropFilter: 'blur(16px) saturate(120%)',
            }}
          />

          {/* ── Sheet ──────────────────────────────────────────────── */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sx-confirm-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.93, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96, filter: 'blur(6px)' }}
            transition={
              reduce
                ? { duration: 0.2 }
                : { type: 'spring', stiffness: 320, damping: 28, mass: 0.8, filter: { duration: 0.3 } }
            }
            className="sx-panel-solid relative w-full max-w-[452px] overflow-hidden"
            style={{ borderRadius: 'var(--sx-r-xl)' }}
          >
            {/* ambient light spilling from behind the product */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[220px]"
              style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgba(124,106,245,0.2), transparent 70%)' }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(124,106,245,0.7), transparent)' }}
            />

            <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
              {/* ══ 1 · What you're getting ═════════════════════════ */}
              <p className="sx-eyebrow">Confirm purchase</p>

              <div className="mt-4 flex items-start gap-4">
                <div
                  className="relative h-[76px] w-[76px] flex-shrink-0 overflow-hidden sm:h-[86px] sm:w-[86px]"
                  style={{
                    borderRadius: 'var(--sx-r-md)',
                    border: '1px solid var(--sx-hair-2)',
                    background: 'rgba(255,255,255,0.05)',
                    boxShadow: '0 18px 36px -20px rgba(124,106,245,0.9)',
                  }}
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <FiPackage className="h-7 w-7 text-[var(--sx-ink-4)]" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="sx-confirm-title"
                    className="text-[19px] font-extrabold leading-[1.2] tracking-[-0.022em] text-[var(--sx-ink)]"
                  >
                    {item.name}
                  </h2>
                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--sx-ink-3)]">
                      {item.description}
                    </p>
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
                    <Chip tint="#6ee7b7">
                      <FiZap className="h-2.5 w-2.5" />
                      +{formatNumber(item.income_amount)} / {item.time_hours}h
                    </Chip>
                  ) : null}
                  {item.price_inr ? <Chip tint="#6ee7b7">₹{formatNumber(item.price_inr)} value</Chip> : null}
                  {item.expires_at && (
                    <Chip>
                      <FiClock className="h-2.5 w-2.5" />
                      Listed until{' '}
                      {new Date(item.expires_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Chip>
                  )}
                  {item.role_required_names?.length ? (
                    <Chip tint="#c3b9ff">
                      <FiLock className="h-2.5 w-2.5" />
                      {item.role_required_names.join(', ')}
                    </Chip>
                  ) : null}
                </div>
              ) : null}

              {/* ══ 2 · What it costs you ═══════════════════════════ */}
              <div
                className="mt-5 overflow-hidden border"
                style={{ borderRadius: 'var(--sx-r-md)', borderColor: 'var(--sx-hair)' }}
              >
                <Row label={`Your ${currencyName}`} emoji={currencyEmoji} value={formatNumber(userBalance)} />
                <Row
                  label="This purchase"
                  emoji={currencyEmoji}
                  value={`− ${formatNumber(item.price)}`}
                  tint="#ff9aa6"
                />
                <div
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                  style={{
                    background: 'linear-gradient(120deg, rgba(52,211,153,0.13), rgba(52,211,153,0.03))',
                    borderTop: '1px solid var(--sx-hair)',
                  }}
                >
                  <span className="text-[13px] font-bold text-[#6ee7b7]">Balance afterwards</span>
                  <span className="sx-num flex items-center gap-1.5 text-[15px] font-extrabold text-[#6ee7b7]">
                    <CurrencyMark emoji={currencyEmoji} size={15} />
                    {formatNumber(after)}
                  </span>
                </div>
              </div>

              {/* ══ 3 · Commit ══════════════════════════════════════ */}
              <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={purchasing}
                  className="sx-focus h-12 flex-1 border text-[13.5px] font-bold text-[var(--sx-ink-2)] transition-colors hover:bg-white/[0.05] hover:text-[var(--sx-ink)] disabled:opacity-45"
                  style={{ borderRadius: 'var(--sx-r-sm)', borderColor: 'var(--sx-hair)' }}
                >
                  Not now
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={onConfirm}
                  disabled={purchasing}
                  className="sx-focus flex h-12 flex-[1.45] items-center justify-center gap-2 text-[13.5px] font-extrabold transition-[filter,transform] duration-200 enabled:hover:brightness-[1.06] enabled:active:scale-[0.99] disabled:cursor-wait"
                  style={{
                    borderRadius: 'var(--sx-r-sm)',
                    background: 'linear-gradient(118deg, #FFDE8C 0%, #F6B93B 58%, #E39B18 100%)',
                    color: '#1c1406',
                    boxShadow: '0 18px 36px -18px rgba(246,185,59,0.9)',
                  }}
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
                      <span className="sx-num">{formatNumber(item.price)}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3.5 flex items-start gap-2 text-[11.5px] leading-snug text-[var(--sx-ink-4)]">
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
      className="sx-num inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold"
      style={{
        color: tint ?? 'var(--sx-ink-2)',
        borderColor: tint ? `${tint}33` : 'var(--sx-hair)',
        background: tint ? `${tint}12` : 'rgba(255,255,255,0.03)',
      }}
    >
      {children}
    </span>
  );
}

function Row({
  label,
  value,
  emoji,
  tint,
}: {
  label: string;
  value: string;
  emoji: string;
  tint?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <span className="text-[12.5px] font-semibold text-[var(--sx-ink-3)]">{label}</span>
      <span
        className="sx-num flex items-center gap-1.5 text-[13.5px] font-bold"
        style={{ color: tint ?? 'var(--sx-ink)' }}
      >
        <CurrencyMark emoji={emoji} size={14} />
        {value}
      </span>
    </div>
  );
}
