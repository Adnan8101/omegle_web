'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiArrowUpRight, FiPackage, FiRefreshCw } from 'react-icons/fi';
import { Item, Magnetic, Reveal, RevealGroup, ScrollParallax, Words } from '@/components/motion';
import { formatRelativeTime } from '@/lib/time';
import PurchaseCard from './_components/PurchaseCard';
import PurchaseFeedSkeleton from './_components/PurchaseFeedSkeleton';
import type { RecentPurchase } from './types';
import { highestPriceIn, tierFor } from './utils';

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

  // Poll while the tab is visible; stop entirely when it isn't.
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

  const highestPrice = useMemo(() => highestPriceIn(purchases), [purchases]);

  return (
    <main className="relative min-h-screen bg-[rgb(var(--color-bg-primary))] pb-28">
      {/* Ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1000px] overflow-hidden">
        <div
          className="absolute left-1/2 top-[-12%] h-[560px] w-[920px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(59,158,255,0.16) 0%, rgba(124,58,237,0.09) 45%, transparent 72%)',
            filter: 'blur(64px)',
          }}
        />
        <ScrollParallax distance={50} className="absolute -right-[8%] top-[40%]">
          <div
            className="h-[500px] w-[500px]"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.10) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
        </ScrollParallax>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[880px] px-5 pt-28 sm:px-8 sm:pt-32">
        {/* ── Back ─────────────────────────────────────────────────── */}
        <Reveal mount dir="down" distance={12} className="mb-8">
          <Magnetic strength={0.3} max={10} className="inline-flex">
            <Link
              href="/"
              aria-label="Back to home"
              className="fx-surface fx-focus flex h-11 w-11 items-center justify-center rounded-[var(--fx-r-sm)] transition-colors hover:border-[var(--fx-hairline-strong)]"
            >
              <FiArrowLeft className="h-[18px] w-[18px] text-[var(--fx-ink-2)]" />
            </Link>
          </Magnetic>
        </Reveal>

        {/* ── Header ───────────────────────────────────────────────── */}
        <RevealGroup mount stagger={0.1} className="mb-10">
          <Item dir="none" scale={0.9}>
            <span className="fx-eyebrow">Live shop activity</span>
          </Item>

          <Item>
            <h1 className="mt-3 text-[clamp(36px,7vw,58px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-[rgb(var(--color-text-primary))]">
              <Words text="Recent" mount delay={0.15} distance={22} />{' '}
              <Words text="Purchases" mount delay={0.26} distance={22} style={{ color: '#3B9EFF' }} />
            </h1>
          </Item>

          <Item blur>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--fx-ink-2)]">
              The latest items members have redeemed with their {currencyName}. This feed updates on
              its own — every purchase shows up here the moment it clears.
            </p>
          </Item>

          <Item>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <span className="fx-surface inline-flex items-center gap-2 rounded-full px-3.5 py-2">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduce && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[12px] font-semibold text-[var(--fx-ink-2)]">
                  {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated)}` : 'Loading feed…'}
                </span>
              </span>

              <Magnetic strength={0.2} max={6}>
                <button
                  type="button"
                  onClick={load}
                  disabled={refreshing}
                  className="fx-surface fx-focus group inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors hover:border-[var(--fx-hairline-strong)] disabled:opacity-60"
                >
                  <FiRefreshCw
                    className={`h-3.5 w-3.5 text-[var(--fx-ink-2)] transition-colors group-hover:text-[rgb(var(--color-text-primary))] ${
                      refreshing ? 'animate-spin text-blue-400' : ''
                    }`}
                  />
                  <span className="text-[12.5px] font-bold text-[rgb(var(--color-text-primary))]">
                    Refresh
                  </span>
                </button>
              </Magnetic>

              <Magnetic strength={0.2} max={6}>
                <Link
                  href="/shop"
                  className="fx-focus group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-bold text-black transition-colors hover:bg-slate-100"
                >
                  Visit the shop
                  <FiArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
            </div>
          </Item>
        </RevealGroup>

        {/* ── Feed ─────────────────────────────────────────────────── */}
        {state === 'loading' && <PurchaseFeedSkeleton />}

        {state === 'error' && (
          <Reveal dir="up" scale={0.97}>
            <div className="fx-surface rounded-[var(--fx-r-xl)] px-8 py-16 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
                <FiAlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
                Feed unavailable
              </h2>
              <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
                We couldn&apos;t reach the shop service just now. It should recover on its own in a
                moment.
              </p>
              <button
                type="button"
                onClick={load}
                className="fx-focus mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-slate-100"
              >
                <FiRefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </Reveal>
        )}

        {state === 'ready' && purchases.length === 0 && (
          <Reveal dir="up" scale={0.97}>
            <div className="fx-surface rounded-[var(--fx-r-xl)] px-8 py-16 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
                <FiPackage className="h-7 w-7 text-blue-400" />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
                Nothing bought yet
              </h2>
              <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
                Once members start redeeming {currencyName} in the shop, their purchases will appear
                here in real time.
              </p>
              <Link
                href="/shop"
                className="fx-focus mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-slate-100"
              >
                Browse the shop
                <FiArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        )}

        {state === 'ready' && purchases.length > 0 && (
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {purchases.map((purchase, index) => (
                <motion.li
                  key={purchase.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                          // Stagger only the first screenful; later rows arrive instantly.
                          delay: Math.min(index, 6) * 0.055,
                        }
                  }
                >
                  <PurchaseCard
                    purchase={purchase}
                    tier={tierFor(purchase.pricePaid, highestPrice)}
                    currencyEmoji={currencyEmoji}
                    currencyName={currencyName}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </main>
  );
}
