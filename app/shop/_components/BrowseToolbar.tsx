'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiSearch, FiSliders, FiX } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { SORT_OPTIONS, type SortMode } from '../_lib/types';
import SegmentedControl from '@/components/ui/SegmentedControl';

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
 * segmented rail with a pill that slides between options; on phones the same
 * options open as a bottom sheet where the thumb already is.
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
  const sortSegments = useMemo(
    () => SORT_OPTIONS.map((option) => ({ id: option.id, label: option.short, title: option.hint })),
    []
  );

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  return (
    <>
      <div className="sticky top-[70px] z-30 -mx-5 px-5 py-3 sm:-mx-8 sm:px-8 sm:top-[82px]">
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-white/8 bg-[#0a0a0d]/85 px-4 py-3 backdrop-blur-2xl sm:flex-nowrap sm:px-5">
          {/* ── Count ────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-shrink-0 items-baseline gap-2">
            <span className="text-[14.5px] font-bold tracking-[-0.01em] text-white">
              {filtered ? `${shown} of ${total}` : total} {total === 1 && !filtered ? 'item' : 'items'}
            </span>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  onQuery('');
                  onAffordableOnly(false);
                }}
                className="text-[11.5px] font-semibold text-[#3B9EFF] transition-colors hover:text-[#7cc4ff]"
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Search ───────────────────────────────────────────── */}
          <label className="order-3 flex h-10 w-full min-w-0 flex-1 items-center gap-2.5 rounded-full border border-white/8 bg-white/[0.03] px-3.5 sm:order-none sm:w-auto">
            <FiSearch className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search the shelves…"
              aria-label="Search items"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-medium text-white outline-none placeholder:text-white/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQuery('')}
                aria-label="Clear search"
                className="flex-shrink-0 text-white/40 transition-colors hover:text-white"
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
              className={`hidden h-10 flex-shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors md:inline-flex ${
                affordableOnly ? 'border-[#F6B93B]/40 bg-[#F6B93B]/10 text-[#ffd77a]' : 'border-white/8 text-white/70'
              }`}
            >
              <CurrencyMark emoji={currencyEmoji} size={14} />
              In my budget
            </button>
          )}

          {/* ── Sort · rail ──────────────────────────────────────── */}
          <div className="hidden flex-shrink-0 lg:block">
            <SegmentedControl
              options={sortSegments}
              value={sort}
              onChange={(id) => onSort(id as SortMode)}
              layoutId="shop-sort-pill"
            />
          </div>

          {/* ── Sort · sheet trigger ─────────────────────────────── */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3.5 text-[12.5px] font-bold text-white lg:hidden"
          >
            <FiSliders className="h-3.5 w-3.5 text-[#3B9EFF]" />
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
              className="absolute inset-0 w-full bg-black/60 backdrop-blur-sm"
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
              className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/10 bg-[#0d0d12] pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5"
            >
              <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/15" />

              <div className="px-5 pb-1">
                <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-white">Sort the shelves</h2>
                <p className="mt-1 text-[12.5px] text-white/45">Applies straight away — swipe down to dismiss.</p>
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
                      className={`flex w-full items-center justify-between gap-4 rounded-2xl px-3.5 py-3.5 text-left transition-colors active:bg-white/[0.06] ${
                        on ? 'bg-[#3B9EFF]/10' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold" style={{ color: on ? '#7cc4ff' : '#ffffff' }}>
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-white/45">{option.hint}</span>
                      </span>
                      {on && <FiCheck className="h-4 w-4 flex-shrink-0 text-[#3B9EFF]" />}
                    </button>
                  );
                })}
              </div>

              {canFilterAffordable && (
                <div className="mt-2 border-t border-white/8 px-5 pt-4">
                  <button
                    type="button"
                    onClick={() => onAffordableOnly(!affordableOnly)}
                    aria-pressed={affordableOnly}
                    className="flex w-full items-center justify-between gap-4"
                  >
                    <span className="flex items-center gap-2.5 text-[14px] font-bold text-white">
                      <CurrencyMark emoji={currencyEmoji} size={16} />
                      Only what I can afford
                    </span>
                    <span
                      className="relative block h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                      style={{ background: affordableOnly ? '#3B9EFF' : 'rgba(255,255,255,0.12)' }}
                    >
                      <span
                        className="absolute top-[3px] block h-[18px] w-[18px] rounded-full bg-white transition-transform duration-300 ease-out"
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
