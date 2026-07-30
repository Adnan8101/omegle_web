'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiSearch, FiSliders, FiX } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { SORT_OPTIONS, type SortMode } from '../_lib/types';

interface BrowseToolbarProps {
  total: number;
  shown: number;
  sort: SortMode;
  onSort: (mode: SortMode) => void;
  query: string;
  onQuery: (value: string) => void;
  affordableOnly: boolean;
  onAffordableOnly: (value: boolean) => void;
  canFilterAffordable: boolean;
  currencyEmoji: string;
}

/**
 * Sticks under the header while you browse. On wide screens sorting is a
 * segmented rail with a pill that slides between options (shared layout, so it
 * physically travels); on phones the same options open as a bottom sheet where
 * the thumb already is.
 */
export default function BrowseToolbar({
  total,
  shown,
  sort,
  onSort,
  query,
  onQuery,
  affordableOnly,
  onAffordableOnly,
  canFilterAffordable,
  currencyEmoji,
}: BrowseToolbarProps) {
  const reduce = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = SORT_OPTIONS.find((option) => option.id === sort) ?? SORT_OPTIONS[0];
  const filtered = shown !== total;

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  return (
    <>
      <div className="sticky top-[74px] z-30 -mx-5 px-5 py-3 sm:-mx-8 sm:px-8 sm:top-[86px]">
        <div
          className="sx-shelf relative flex flex-wrap items-center gap-3 overflow-hidden border px-4 py-3 sm:flex-nowrap sm:px-5"
          style={{
            borderRadius: 'var(--sx-r-lg)',
            borderColor: 'var(--sx-hair)',
            background: 'rgba(8,8,15,0.76)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            boxShadow: '0 22px 50px -34px rgba(0,0,0,1)',
          }}
        >
          {/* ── Count ────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-shrink-0 items-baseline gap-2">
            <span className="text-[14.5px] font-bold tracking-[-0.01em] text-[var(--sx-ink)]">
              {filtered ? `${shown} of ${total}` : total} {total === 1 && !filtered ? 'item' : 'items'}
            </span>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  onQuery('');
                  onAffordableOnly(false);
                }}
                className="sx-focus text-[11.5px] font-semibold text-[#9c8dff] transition-colors hover:text-[#c3b9ff]"
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Search ───────────────────────────────────────────── */}
          <label className="order-3 flex h-10 w-full min-w-0 flex-1 items-center gap-2.5 rounded-full border px-3.5 sm:order-none sm:w-auto"
            style={{ borderColor: 'var(--sx-hair)', background: 'rgba(255,255,255,0.03)' }}
          >
            <FiSearch className="h-3.5 w-3.5 flex-shrink-0 text-[var(--sx-ink-3)]" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search the shelves…"
              aria-label="Search items"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-medium text-[var(--sx-ink)] outline-none placeholder:text-[var(--sx-ink-4)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQuery('')}
                aria-label="Clear search"
                className="sx-focus flex-shrink-0 text-[var(--sx-ink-3)] transition-colors hover:text-[var(--sx-ink)]"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          {/* ── Affordable ───────────────────────────────────────── */}
          {canFilterAffordable && (
            <button
              type="button"
              onClick={() => onAffordableOnly(!affordableOnly)}
              aria-pressed={affordableOnly}
              className="sx-focus hidden h-10 flex-shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors md:inline-flex"
              style={{
                borderColor: affordableOnly ? 'rgba(246,185,59,0.4)' : 'var(--sx-hair)',
                background: affordableOnly ? 'rgba(246,185,59,0.12)' : 'transparent',
                color: affordableOnly ? '#ffd77a' : 'var(--sx-ink-2)',
              }}
            >
              <CurrencyMark emoji={currencyEmoji} size={14} />
              In my budget
            </button>
          )}

          {/* ── Sort · rail ──────────────────────────────────────── */}
          <div
            className="hidden flex-shrink-0 items-center gap-0.5 rounded-full border p-1 lg:flex"
            style={{ borderColor: 'var(--sx-hair)', background: 'rgba(255,255,255,0.025)' }}
            role="group"
            aria-label="Sort items"
          >
            {SORT_OPTIONS.map((option) => {
              const on = option.id === sort;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSort(option.id)}
                  title={option.hint}
                  aria-pressed={on}
                  className="sx-focus relative rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors"
                  style={{ color: on ? '#0a0a12' : 'var(--sx-ink-2)' }}
                >
                  {on && (
                    <motion.span
                      layoutId="sx-sort-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'linear-gradient(120deg,#efeaff,#ffffff)' }}
                      transition={
                        reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.6 }
                      }
                    />
                  )}
                  <span className="relative">{option.short}</span>
                </button>
              );
            })}
          </div>

          {/* ── Sort · sheet trigger ─────────────────────────────── */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="sx-focus inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-bold text-[var(--sx-ink)] lg:hidden"
            style={{ borderColor: 'var(--sx-hair)', background: 'rgba(255,255,255,0.04)' }}
          >
            <FiSliders className="h-3.5 w-3.5" style={{ color: '#9c8dff' }} />
            {active.short}
          </button>
        </div>
      </div>

      {/* ══ Bottom sheet ═════════════════════════════════════════════ */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.button
              type="button"
              aria-label="Close sort options"
              onClick={() => setSheetOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="absolute inset-0 w-full"
              style={{ background: 'rgba(2,2,6,0.62)', backdropFilter: 'blur(8px)' }}
            />

            <motion.div
              initial={reduce ? { opacity: 0 } : { y: '100%' }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              exit={reduce ? { opacity: 0 } : { y: '100%' }}
              transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
              drag={reduce ? false : 'y'}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 520) setSheetOpen(false);
              }}
              className="sx-panel-solid absolute inset-x-0 bottom-0 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5"
              style={{ borderRadius: '28px 28px 0 0' }}
            >
              <span
                aria-hidden
                className="mx-auto mb-3 block h-1 w-10 rounded-full"
                style={{ background: 'var(--sx-hair-2)' }}
              />

              <div className="px-5 pb-1">
                <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-[var(--sx-ink)]">
                  Sort the shelves
                </h2>
                <p className="mt-1 text-[12.5px] text-[var(--sx-ink-3)]">
                  Applies straight away — swipe down to dismiss.
                </p>
              </div>

              <div className="mt-3 px-3">
                {SORT_OPTIONS.map((option) => {
                  const on = option.id === sort;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onSort(option.id);
                        setSheetOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-4 rounded-[var(--sx-r-md)] px-3.5 py-3.5 text-left transition-colors active:bg-white/[0.06]"
                      style={{ background: on ? 'rgba(124,106,245,0.13)' : 'transparent' }}
                    >
                      <span className="min-w-0">
                        <span
                          className="block text-[14px] font-bold"
                          style={{ color: on ? '#c3b9ff' : 'var(--sx-ink)' }}
                        >
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[var(--sx-ink-3)]">{option.hint}</span>
                      </span>
                      {on && <FiCheck className="h-4 w-4 flex-shrink-0" style={{ color: '#9c8dff' }} />}
                    </button>
                  );
                })}
              </div>

              {canFilterAffordable && (
                <div className="mt-2 border-t px-5 pt-4" style={{ borderColor: 'var(--sx-hair)' }}>
                  <button
                    type="button"
                    onClick={() => onAffordableOnly(!affordableOnly)}
                    aria-pressed={affordableOnly}
                    className="flex w-full items-center justify-between gap-4"
                  >
                    <span className="flex items-center gap-2.5 text-[14px] font-bold text-[var(--sx-ink)]">
                      <CurrencyMark emoji={currencyEmoji} size={16} />
                      Only what I can afford
                    </span>
                    <span
                      className="relative block h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                      style={{ background: affordableOnly ? '#7C6AF5' : 'rgba(255,255,255,0.12)' }}
                    >
                      <span
                        className="absolute top-[3px] block h-[18px] w-[18px] rounded-full bg-white transition-transform duration-300 ease-[var(--sx-ease)]"
                        style={{ left: 3, transform: affordableOnly ? 'translateX(20px)' : 'none' }}
                      />
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
