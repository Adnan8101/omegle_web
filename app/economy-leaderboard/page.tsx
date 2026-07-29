'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { Item, Magnetic, Reveal, RevealGroup, ScrollParallax, Words } from '@/components/motion';
import Champion from './_components/Champion';
import LadderRow from './_components/LadderRow';
import LeaderboardSkeleton from './_components/LeaderboardSkeleton';
import MetricToggle from './_components/MetricToggle';
import PoolStats from './_components/PoolStats';
import { formatRelativeTime } from '@/lib/time';
import type { LeaderboardEntry, Metric } from './types';
import { hasDistinctSeasonData, poolSummary, rankEntries } from './utils';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const CLOCK_TICK_MS = 60 * 1000;

type LoadState = 'loading' | 'ready' | 'error';

export default function EconomyLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [currencyName, setCurrencyName] = useState('Ozy');
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [metric, setMetric] = useState<Metric>('total');
  const reduce = useReducedMotion();

  // Re-render once a minute so the "updated 4m ago" label stays honest between fetches.
  const [, setClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClock((n) => n + 1), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/economy-leaderboard');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Request failed');

      setEntries(payload.leaderboard || []);
      setCurrencyEmoji(payload.currencyEmoji || '🪙');
      setCurrencyName(payload.currencyName || 'Ozy');
      setLastUpdated(new Date());
      setState('ready');
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setState((current) => (current === 'ready' ? current : 'error'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const seasonAvailable = useMemo(() => hasDistinctSeasonData(entries), [entries]);

  // Fall back to lifetime totals if the season metric stops being meaningful.
  useEffect(() => {
    if (!seasonAvailable && metric === 'season') setMetric('total');
  }, [seasonAvailable, metric]);

  const ranked = useMemo(() => rankEntries(entries, metric), [entries, metric]);
  const summary = useMemo(() => poolSummary(ranked), [ranked]);

  const [champion, ...ladder] = ranked;

  return (
    <main className="relative min-h-screen bg-[rgb(var(--color-bg-primary))] pb-28">
      {/* Ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] overflow-hidden">
        <div
          className="absolute left-1/2 top-[-14%] h-[620px] w-[1000px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.16) 0%, rgba(124,58,237,0.08) 45%, transparent 72%)',
            filter: 'blur(70px)',
          }}
        />
        <ScrollParallax distance={55} className="absolute -right-[8%] top-[42%]">
          <div
            className="h-[520px] w-[520px]"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(59,158,255,0.12) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
        </ScrollParallax>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1080px] px-5 pt-28 sm:px-8 sm:pt-32">
        {/* ── Header ───────────────────────────────────────────────── */}
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

        <RevealGroup
          mount
          stagger={0.1}
          className="mb-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-xl">
            <Item dir="none" scale={0.9}>
              <span className="fx-eyebrow">Live standings</span>
            </Item>
            <Item>
              <h1 className="mt-3 text-[clamp(36px,7vw,60px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-[rgb(var(--color-text-primary))]">
                <Words text="The" mount delay={0.15} distance={22} />{' '}
                <Words text={`${currencyName} Ladder`} mount delay={0.26} distance={22} style={{ color: '#FBBF24' }} />
              </h1>
            </Item>
            <Item blur>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--fx-ink-2)]">
                Everyone who&apos;s earned their way up. Rankings are computed from the same economy
                backend the bot settles against, and refresh automatically every 30 minutes.
              </p>
            </Item>
          </div>

          <Item dir="right" className="flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="fx-surface inline-flex items-center gap-2 rounded-full px-3.5 py-2">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduce && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[12px] font-semibold text-[var(--fx-ink-2)]">
                  {lastUpdated ? `Synced ${formatRelativeTime(lastUpdated)}` : 'Syncing…'}
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
                      refreshing ? 'animate-spin text-amber-400' : ''
                    }`}
                  />
                  <span className="text-[12.5px] font-bold text-[rgb(var(--color-text-primary))]">
                    Refresh
                  </span>
                </button>
              </Magnetic>
            </div>
          </Item>
        </RevealGroup>

        {/* ── Body ─────────────────────────────────────────────────── */}
        {state === 'loading' && <LeaderboardSkeleton />}

        {state === 'error' && (
          <Reveal dir="up" scale={0.97} className="mx-auto max-w-xl">
            <div className="fx-surface rounded-[var(--fx-r-xl)] px-8 py-16 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
                <FiAlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
                Standings unavailable
              </h2>
              <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
                We couldn&apos;t reach the economy service. The ladder will be back as soon as it
                responds.
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

        {state === 'ready' && ranked.length === 0 && (
          <Reveal dir="up" scale={0.97} className="mx-auto max-w-xl">
            <div className="fx-surface rounded-[var(--fx-r-xl)] px-8 py-16 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
                <FiTrendingUp className="h-7 w-7 text-amber-400" />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
                Nobody on the board yet
              </h2>
              <p className="mx-auto mt-2.5 max-w-sm text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
                The ladder fills up as members earn {currencyName}. Spend some time in the server and
                the first name here could be yours.
              </p>
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="fx-focus mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-black transition-colors hover:bg-slate-100"
              >
                Start earning
              </a>
            </div>
          </Reveal>
        )}

        {state === 'ready' && ranked.length > 0 && (
          <div className="space-y-10">
            {seasonAvailable && (
              <Reveal dir="up" distance={14} className="flex justify-center lg:justify-start">
                <MetricToggle value={metric} onChange={setMetric} currencyName={currencyName} />
              </Reveal>
            )}

            <PoolStats
              total={summary.total}
              leader={summary.leader}
              average={summary.average}
              tracked={summary.tracked}
              currencyEmoji={currencyEmoji}
              currencyName={currencyName}
            />

            {champion && (
              <Reveal dir="up" distance={26} scale={0.98}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${champion.user_id}-${metric}`}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -12 }}
                    transition={{ duration: reduce ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Champion
                      entry={champion}
                      runnerUpScore={ladder[0]?.score ?? null}
                      poolTotal={summary.total}
                      currencyEmoji={currencyEmoji}
                      currencyName={currencyName}
                    />
                  </motion.div>
                </AnimatePresence>
              </Reveal>
            )}

            {ladder.length > 0 && (
              <section aria-label="Full standings">
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--fx-ink-3)]">
                    Chasing the crown
                  </h2>
                  <hr className="fx-rule flex-1" />
                </div>

                <LayoutGroup id="ladder">
                  <motion.ul layout={!reduce} className="space-y-2.5">
                    <AnimatePresence initial={false}>
                      {ladder.map((entry) => (
                        <LadderRow
                          key={entry.user_id}
                          entry={entry}
                          currencyEmoji={currencyEmoji}
                          currencyName={currencyName}
                          metric={metric}
                          showMovement={seasonAvailable}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                </LayoutGroup>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
