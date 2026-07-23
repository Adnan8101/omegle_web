'use client';
// Gambling Lobby — the entry point into the Omeglee Gambling System. Fetches
// each registered game's public state and renders a card only for games that
// are currently active (enabled, or accessible via the developer bypass).
// Adding a future game is a one-line addition to lib/gambling/registry.ts.

import { GAMBLING_GAMES } from '@/lib/gambling/registry';
import { DEV_ACCESS_HEADER, DEV_ACCESS_STORAGE_KEY } from '@/lib/gambling/devAccess';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiLoader } from 'react-icons/fi';

interface ActiveGame {
  key: string;
  name: string;
  tagline: string;
  icon: string;
  href: string;
  devBypass: boolean;
  balance: number;
  currencyName: string;
  currencyEmoji: string;
}

export default function GamblingLobbyPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [games, setGames] = useState<ActiveGame[]>([]);

  const devToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(DEV_ACCESS_STORAGE_KEY);
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (devToken) h[DEV_ACCESS_HEADER] = devToken;
    return h;
  }, [devToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setAuthRequired(false);
    try {
      const results = await Promise.all(
        GAMBLING_GAMES.map(async (game) => {
          try {
            const res = await fetch(game.stateUrl, { headers: authHeaders(), cache: 'no-store' });
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
        const isActive = Boolean(data?.enabled) || Boolean(data?.devBypass);
        if (!isActive) continue;
        active.push({
          key: game.key,
          name: game.name,
          tagline: game.tagline,
          icon: game.icon,
          href: game.href,
          devBypass: Boolean(data?.devBypass),
          balance: data?.balance ?? 0,
          currencyName: data?.currencyName || 'Ozy',
          currencyEmoji: data?.currencyEmoji || '🪙',
        });
      }
      setGames(active);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (status === 'loading') return;
    load();
  }, [status, load]);

  const balance = games.find((g) => g.balance > 0)?.balance ?? games[0]?.balance ?? 0;
  const currencyName = games[0]?.currencyName || 'Ozy';
  const currencyEmoji = games[0]?.currencyEmoji || '🪙';
  const anyDev = games.some((g) => g.devBypass);

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
      {/* Ambient casino-felt glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </Link>
          {anyDev && (
            <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
              Developer Access
            </span>
          )}
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center px-3 py-1 bg-emerald-500/15 rounded-full border border-emerald-500/25 mb-4">
            <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">Omeglee Gambling</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight mb-2">
            Casino Lobby
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] max-w-md mx-auto">
            Pick a table. Every outcome is decided server-side — the house never lets the client cheat.
          </p>
          {games.length > 0 && (
            <div className="inline-flex items-center gap-2 mt-5 glass-blue rounded-2xl px-5 py-2.5 border border-[rgb(var(--color-border))]/60">
              <span className="text-[10px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">
                Balance
              </span>
              <span className="text-base font-bold text-[rgb(var(--color-text-primary))]">
                {balance.toLocaleString()} {currencyEmoji} {currencyName}
              </span>
            </div>
          )}
        </div>

        {/* Game cards */}
        {games.length === 0 ? (
          <div className="glass-blue rounded-3xl p-12 border border-[rgb(var(--color-border))] shadow-apple-lg text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">🎲</div>
            <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No Games Are Live Yet</h2>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              The casino floor is being set up. Check back soon for Spin the Wheel, the Slot Machine, and more.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {games.map((game) => (
              <Link
                key={game.key}
                href={game.href}
                className="group relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-emerald-950/40 via-black/40 to-indigo-950/30 p-7 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_20px_50px_-12px_rgba(251,191,36,0.25)]"
              >
                {/* Corner glow on hover */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/0 group-hover:bg-amber-400/15 rounded-full blur-3xl transition-all duration-500 pointer-events-none" />

                <div className="relative flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-black/30 border border-amber-400/25 flex items-center justify-center text-4xl shadow-inner">
                    {game.icon}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                  </span>
                </div>

                <h3 className="relative text-xl font-extrabold text-[rgb(var(--color-text-primary))] mb-1.5">
                  {game.name}
                </h3>
                <p className="relative text-sm text-[rgb(var(--color-text-secondary))] mb-6 leading-relaxed">
                  {game.tagline}
                </p>

                <div className="relative inline-flex items-center gap-2 text-sm font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                  Play Now
                  <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
