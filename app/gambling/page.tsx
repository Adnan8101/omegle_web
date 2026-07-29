'use client';

import { GAMBLING_GAMES } from '@/lib/gambling/registry';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiLoader, FiShield } from 'react-icons/fi';
import BalanceBar from '@/components/gambling/BalanceBar';
import GameCard from '@/components/gambling/GameCard';
import { Reveal, RevealGroup, Item } from '@/components/gambling/Motion';

/** Honest one-line descriptor per game — describes how the game works, no fabricated stats. */
const GAME_META: Record<string, string> = {
  wheel: 'Single spin · Jackpot segment',
  slots: '3 reels · Match three to win',
};

interface ActiveGame {
  key: string;
  name: string;
  tagline: string;
  icon: string;
  href: string;
  balance: number;
  currencyName: string;
  currencyEmoji: string;
}

export default function GamblingLobbyPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [games, setGames] = useState<ActiveGame[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setAuthRequired(false);
    try {
      const results = await Promise.all(
        GAMBLING_GAMES.map(async (game) => {
          try {
            const res = await fetch(game.stateUrl, { cache: 'no-store' });
            if (res.status === 401) return { game, unauthenticated: true as const };
            const data = await res.json();
            return { game, data };
          } catch {
            return null;
          }
        }),
      );

      if (results.every((r) => r?.unauthenticated)) {
        setAuthRequired(true);
        setGames([]);
        return;
      }

      const active: ActiveGame[] = [];
      for (const r of results) {
        if (!r || r.unauthenticated) continue;
        const { game, data } = r;
        if (!data?.enabled) continue;
        active.push({
          key: game.key,
          name: game.name,
          tagline: game.tagline,
          icon: game.icon,
          href: game.href,
          balance: data?.balance ?? 0,
          currencyName: data?.currencyName || 'Ozy',
          currencyEmoji: data?.currencyEmoji || '🪙',
        });
      }
      setGames(active);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    load();
  }, [status, load]);

  const balance = games.find((g) => g.balance > 0)?.balance ?? games[0]?.balance ?? 0;
  const currencyName = games[0]?.currencyName || 'Ozy';
  const currencyEmoji = games[0]?.currencyEmoji || '🪙';

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))]">
        <FiLoader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (authRequired || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))] p-4">
        <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-sm w-full text-center">
          <FiAlertCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Sign in to play</h2>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-5">
            You need to be logged in to enter the gambling lobby.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] relative overflow-hidden">
      {/* ── Ambient casino lighting ─────────────────────────── */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[820px] h-[820px] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-8%] w-[420px] h-[420px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[55%] left-[-8%] w-80 h-80 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* top bar */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* ── Hero ──────────────────────────────────────────── */}
        <Reveal className="text-center">
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/25 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-bold text-[10px] uppercase tracking-[0.18em]">Omeglee Casino</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-4">
            The Floor Is <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">Open</span>
          </h1>
          <p className="text-base sm:text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
            Spin, bet, and chase the jackpot in {currencyName}. Every outcome is settled server-side —
            provably fair, every single time.
          </p>
        </Reveal>

        {/* balance overview (real data) */}
        {games.length > 0 && (
          <Reveal delay={0.1} className="mt-8 flex justify-center">
            <BalanceBar balance={balance} currencyName={currencyName} currencyEmoji={currencyEmoji} />
          </Reveal>
        )}

        {games.length === 0 ? (
          <Reveal className="mt-14">
            <div
              className="rounded-3xl p-12 text-center max-w-lg mx-auto"
              style={{ background: 'linear-gradient(180deg,#12131a,#0a0b10)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-5xl mb-4">🎲</div>
              <h2 className="text-xl font-bold text-white mb-2">No Games Are Live Yet</h2>
              <p className="text-sm text-white/55">
                The casino floor is being set up. Check back soon for Spin the Wheel, the Slot Machine, and more.
              </p>
            </div>
          </Reveal>
        ) : (
          <>
            {/* ── Flagship artwork banner ─────────────────────── */}
            <Reveal delay={0.05} className="mt-12">
              <div
                className="group relative overflow-hidden rounded-[30px]"
                style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px -40px rgba(0,0,0,0.9)' }}
              >
                <div className="relative aspect-[16/7] w-full">
                  <Image
                    src="/Gambling.webp"
                    alt="Omeglee Casino"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                  />
                  {/* cinematic gradient wash */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(6,7,12,0.92) 0%, rgba(6,7,12,0.55) 40%, rgba(6,7,12,0.1) 70%, transparent 100%)' }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(6,7,12,0.85) 0%, transparent 45%)' }} />
                  {/* gold top hairline */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

                  {/* overlay copy */}
                  <div className="absolute inset-0 flex flex-col justify-center pl-7 sm:pl-12 pr-6 max-w-2xl">
                    <span className="text-amber-300 font-bold text-[11px] uppercase tracking-[0.2em] mb-3">Featured</span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                      High Stakes, <br className="hidden sm:block" />Higher Rewards
                    </h2>
                    <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-6 max-w-md">
                      Turn your {currencyName} into a fortune across the house&apos;s signature games.
                    </p>
                    <Link
                      href={games[0].href}
                      className="self-start inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm transition-transform hover:scale-[1.03] active:scale-95"
                    >
                      Enter the Floor
                      <FiArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* ── Featured games ──────────────────────────────── */}
            <div className="mt-16">
              <Reveal className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Featured Games</h2>
                  <p className="text-sm text-white/45 mt-1">Live tables on the floor right now.</p>
                </div>
                <span className="text-sm font-bold text-white/40 tabular-nums">
                  {String(games.length).padStart(2, '0')} <span className="text-white/25">live</span>
                </span>
              </Reveal>

              <RevealGroup className="grid sm:grid-cols-2 gap-6" stagger={0.1}>
                {games.map((game) => (
                  <Item key={game.key}>
                    <GameCard
                      name={game.name}
                      tagline={game.tagline}
                      href={game.href}
                      icon={game.icon}
                      meta={GAME_META[game.key] ?? 'Live table'}
                      balance={game.balance}
                      currencyName={game.currencyName}
                      currencyEmoji={game.currencyEmoji}
                      themeKey={game.key}
                    />
                  </Item>
                ))}
              </RevealGroup>
            </div>

            {/* ── Fairness trust strip (real, honest) ─────────── */}
            <Reveal delay={0.05} className="mt-14">
              <div
                className="flex items-center gap-4 rounded-2xl px-6 py-5"
                style={{ background: 'linear-gradient(180deg,#101119,#0a0b10)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl grid place-items-center bg-emerald-500/12 border border-emerald-500/25 text-emerald-400">
                  <FiShield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Provably fair — settled server-side</h3>
                  <p className="text-xs text-white/50 leading-relaxed mt-0.5">
                    Every spin&apos;s outcome is generated and verified on the server. The client only plays the
                    animation — it can never influence the result.
                  </p>
                </div>
              </div>
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}
