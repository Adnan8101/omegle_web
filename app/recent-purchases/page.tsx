'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiArrowUpRight, FiRefreshCw } from 'react-icons/fi';
import Atmosphere from '@/components/shop/Atmosphere';
import { Item, Magnetic, Reveal, RevealGroup, Words } from '@/components/motion';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatRelativeTime } from '@/lib/time';
import FeedSkeleton from './_components/FeedSkeleton';
import FeedStats from './_components/FeedStats';
import PurchaseRow from './_components/PurchaseRow';
import type { RecentPurchase } from './types';
import { groupByDay, summarise } from './utils';

const POLL_INTERVAL_MS = 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;

type LoadState = 'loading' | 'ready' | 'error';

export default function RecentPurchasesPage() {
  const [purchases, setPurchases] = useState<RecentPurchase[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [currencyName, setCurrencyName] = useState('Ozy');
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const reduce = useReducedMotion();

  // Keeps the "5m ago" stamps truthful between polls.
  const [, setClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClock((n) => n + 1), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/recent-purchases', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Request failed');

      setPurchases(payload.purchases || []);
      setCurrencyEmoji(payload.currencyEmoji || '🪙');
      setCurrencyName(payload.currencyName || 'Ozy');
      setLastUpdated(new Date());
      setState('ready');
    } catch (error) {
      console.error('Error fetching recent purchases:', error);
      setState((current) => (current === 'ready' ? current : 'error'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    load();
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => loadRef.current(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  const groups = useMemo(() => groupByDay(purchases), [purchases]);
  const totals = useMemo(() => summarise(purchases), [purchases]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-black pb-20 sm:pb-24">
      <Atmosphere />

      <div className="relative z-10 mx-auto w-full max-w-[900px] px-5 pt-28 sm:px-8 sm:pt-32">
        {/* ── Back ─────────────────────────────────────────────────── */}
        <Reveal mount dir="down" distance={12} className="mb-8">
          <Magnetic strength={0.3} max={10} className="inline-flex">
            <Link
              href="/shop"
              aria-label="Back to the shop"
              className="flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-[12.5px] font-bold text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to the shop
            </Link>
          </Magnetic>
        </Reveal>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-8 hidden lg:block"
            style={{ width: 150, height: 150 }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={reduce ? undefined : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/Omegle_cart.png"
                alt=""
                width={150}
                height={150}
                className="select-none"
                style={{ width: 150, height: 150, mixBlendMode: 'screen', opacity: 0.9 }}
                draggable={false}
              />
            </motion.div>
          </div>

          <RevealGroup mount stagger={0.1} className="relative max-w-[560px]">
            <Item dir="none" scale={0.9}>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 py-1.5 pl-2 pr-3.5">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduce && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.17em] text-emerald-300">
                  Live shop activity
                </span>
              </span>
            </Item>

            <Item>
              <h1 className="mt-4 text-[clamp(34px,6vw,52px)] font-extrabold tracking-[-0.03em] text-white">
                <Words text="Recent Purchases" mount delay={0.15} distance={20} />
              </h1>
            </Item>

            <Item blur>
              <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-white/45">
                What the community has redeemed with {currencyName}, newest first.
              </p>
            </Item>

            <Item>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-2">
                  <span className="text-[12px] font-semibold text-white/40">
                    {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated)}` : 'Loading feed…'}
                  </span>
                </span>

                <Magnetic strength={0.2} max={6}>
                  <button
                    type="button"
                    onClick={load}
                    disabled={refreshing}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 transition-colors hover:border-white/20 disabled:opacity-60"
                  >
                    <FiRefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#3B9EFF]' : 'text-white/40'}`} />
                    <span className="text-[12.5px] font-bold text-white">Refresh</span>
                  </button>
                </Magnetic>
              </div>
            </Item>
          </RevealGroup>
        </div>

        {/* ── Figures ──────────────────────────────────────────────── */}
        {state === 'ready' && purchases.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <FeedStats
              count={totals.count}
              spent={totals.spent}
              buyers={totals.buyers}
              biggest={totals.biggest}
              currencyEmoji={currencyEmoji}
              currencyName={currencyName}
            />
          </div>
        )}

        {/* ── Feed ─────────────────────────────────────────────────── */}
        <div className="mt-8 sm:mt-10">
          {state === 'loading' && <FeedSkeleton />}

          {state === 'error' && (
            <Reveal dir="up" scale={0.98}>
              <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-8 py-16 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-400/15">
                  <FiAlertCircle className="h-6 w-6 text-red-300" />
                </span>
                <h2 className="mt-5 text-[20px] font-extrabold tracking-[-0.02em] text-white">Feed unavailable</h2>
                <p className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-white/45">
                  We couldn&apos;t reach the shop service. It should recover on its own shortly.
                </p>
                <button
                  type="button"
                  onClick={load}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-gray-100"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </Reveal>
          )}

          {state === 'ready' && purchases.length === 0 && (
            <Reveal dir="up" scale={0.98}>
              <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-14 text-center sm:px-10">
                <div className="relative mx-auto" style={{ width: 160, height: 160 }}>
                  <motion.div
                    animate={reduce ? undefined : { y: [0, -8, 0] }}
                    transition={reduce ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Image
                      src="/Omegle_cart.png"
                      alt=""
                      width={160}
                      height={160}
                      className="select-none"
                      style={{ width: 160, height: 160, mixBlendMode: 'screen' }}
                      draggable={false}
                    />
                  </motion.div>
                </div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-white">Nothing bought yet</h2>
                <p className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-white/45">
                  Purchases will show up here the moment someone redeems {currencyName} in the shop.
                </p>
                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-gray-100"
                >
                  Browse the shop
                  <FiArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          )}

          {state === 'ready' && purchases.length > 0 && (
            <div className="relative">
              <span
                aria-hidden
                className="absolute bottom-6 left-[83px] top-3 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent sm:block"
              />

              {groups.map((group, groupIndex) => (
                <section key={group.key} className={groupIndex === 0 ? '' : 'mt-9'}>
                  <div className="sticky top-[16px] z-20 mb-4 flex items-center gap-3 py-2 sm:pl-[104px]">
                    <span className="text-[12.5px] font-extrabold uppercase tracking-[0.13em] text-white/55">
                      {group.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-black/80 px-2.5 py-[3px] text-[10.5px] font-bold text-white/45 backdrop-blur-md">
                      {group.rows.length} {group.rows.length === 1 ? 'purchase' : 'purchases'}
                      <span className="text-white/25">·</span>
                      <CurrencyMark emoji={currencyEmoji} size={11} />
                      {group.spent.toLocaleString()}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>

                  <ul className="space-y-3.5">
                    <AnimatePresence initial={false}>
                      {group.rows.map((purchase, index) => (
                        <motion.li
                          key={purchase.id}
                          className="relative sm:pl-[104px]"
                          layout={!reduce}
                          initial={reduce ? false : { opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: groupIndex === 0 ? Math.min(index, 6) * 0.05 : 0 }
                          }
                        >
                          <PurchaseRow purchase={purchase} currencyEmoji={currencyEmoji} currencyName={currencyName} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
