'use client';

import SlotMachinePage from '@/components/gambling/SlotMachine/SlotMachinePage';
import { Reveal } from '@/components/gambling/Motion';
import type { SlotMachineHandle } from '@/components/gambling/SlotMachine/SlotMachine';
import { SlotAudioSynth } from '@/lib/gambling/slotAudioSynth';
import type { SlotSpinResult, SlotState } from '@/lib/gambling/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiLoader } from 'react-icons/fi';

export default function SlotsPage() {
  const { status } = useSession();
  const machineRef = useRef<SlotMachineHandle>(null);
  const audioRef = useRef<SlotAudioSynth | null>(null);

  const [state, setState] = useState<SlotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(0);
  const [win, setWin] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SlotSpinResult | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const authHeaders = useMemo<Record<string, string>>(
    () => ({ 'Content-Type': 'application/json' }),
    [],
  );

  useEffect(() => {
    audioRef.current = new SlotAudioSynth();
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gambling/slots/state', { headers: authHeaders, cache: 'no-store' });
      if (res.status === 401) {
        setState(null);
        setError('AUTH');
        return;
      }
      const data: SlotState = await res.json();
      setState(data);
      setBalance(data.balance ?? 0);
      setBet((prev) => (prev > 0 ? prev : data.defaultBet ?? data.minBet ?? 0));
      setError(null);
    } catch {
      setError('Failed to load the game. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (status === 'loading') return;
    loadState();
  }, [status, loadState]);

  const minBet = state?.minBet ?? 0;
  const maxBet = state?.maxBet ?? 0;
  const currencyName = state?.currencyName || 'Ozy';
  const currencyEmoji = state?.currencyEmoji || '🪙';

  const clampBet = useCallback(
    (v: number) => Math.max(minBet, Math.min(maxBet, Math.floor(v) || 0)),
    [minBet, maxBet],
  );

  const betError = useMemo(() => {
    if (bet <= 0) return 'Enter a bet.';
    if (bet < minBet) return `Minimum bet is ${minBet.toLocaleString()}.`;
    if (bet > maxBet) return `Maximum bet is ${maxBet.toLocaleString()}.`;
    if (bet > balance) return 'Insufficient balance.';
    return null;
  }, [bet, minBet, maxBet, balance]);

  const canSpin = !spinning && !betError;

  const spin = useCallback(async () => {
    if (spinning || betError) return;
    setError(null);
    setSpinning(true);
    setWin(0);
    audioRef.current?.init();
    const stopLoop = audioRef.current?.playSpinLoop();
    const nonce =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${status}-${bet}-${performance.now()}-${Math.random()}`;
    try {
      const res = await fetch('/api/gambling/slots/spin', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ bet, nonce }),
      });
      const data = await res.json();
      if (!res.ok) {
        stopLoop?.();
        setError(data.error || 'Spin failed.');
        setSpinning(false);
        loadState();
        return;
      }
      const spinResult: SlotSpinResult = data;
      const big = spinResult.outcome === 'THREE';
      await machineRef.current?.spinTo(spinResult.reels, { reward: spinResult.reward, big });
      stopLoop?.();
      setBalance(spinResult.balance);
      setWin(spinResult.reward);
      setResult(spinResult);
      if (spinResult.reward > 0) {
        audioRef.current?.playWin(big);
      } else {
        audioRef.current?.playLose();
      }
      setShowReveal(true);
    } catch {
      stopLoop?.();
      setError('Spin failed. Please try again.');
      loadState();
    } finally {
      setSpinning(false);
    }
  }, [spinning, betError, authHeaders, bet, status, loadState]);

  

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))]">
        <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error === 'AUTH' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))] p-4">
        <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-sm w-full text-center">
          <FiAlertCircle className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Sign in to play</h2>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-5">
            You need to be logged in to play the slot machine.
          </p>
          <Link href="/" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (state?.disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-primary))] p-4">
        <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎰</div>
          <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Game Currently Disabled</h2>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6">
            The Slot Machine is not available right now. Check back soon!
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-medium transition-colors">
            <FiArrowLeft className="w-4 h-4" /> Back Home
          </Link>
        </div>
      </div>
    );
  }

  const symbols = state?.symbols ?? [];
  const quickBets = state?.quickBets ?? [];

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] relative overflow-hidden">
      {/* Ambient casino lighting */}
      <div className="absolute top-[-6%] left-1/2 -translate-x-1/2 w-[720px] h-[720px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-6%] w-[420px] h-[420px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[45%] left-[-8%] w-72 h-72 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* top bar */}
        <div className="w-full flex items-center justify-between mb-8">
          <Link href="/gambling" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <FiArrowLeft className="w-4 h-4" /> Lobby
          </Link>
        </div>

        <Reveal className="w-full flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/25 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 font-bold text-[10px] uppercase tracking-[0.18em]">Slot Machine</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-2">
            Match Three, <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">Win Big</span>
          </h1>
          <p className="text-sm sm:text-base text-white/55 mb-7 max-w-md">
            Place your bet and pull the reels for {currencyName} rewards.
          </p>
        </Reveal>

        {}
        {symbols.length > 0 ? (
          <SlotMachinePage
            machineRef={machineRef}
            symbols={symbols}
            balance={balance}
            bet={bet}
            win={win}
            spinning={spinning}
            canSpin={canSpin}
            betError={betError}
            minBet={minBet}
            maxBet={maxBet}
            quickBets={quickBets}
            currencyName={currencyName}
            currencyEmoji={currencyEmoji}
            reducedMotion={reducedMotion}
            result={result}
            showReveal={showReveal}
            onBetChange={(next) => setBet(next)}
            clampBet={clampBet}
            onSpin={spin}
            onReelStop={() => audioRef.current?.playReelStop()}
            onCloseReveal={() => setShowReveal(false)}
            onSpinAgain={() => {
              setShowReveal(false);
              setTimeout(() => spin(), 150);
            }}
          />
        ) : (
          <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] text-center">
            <p className="text-[rgb(var(--color-text-secondary))]">The slot machine has not been configured yet.</p>
          </div>
        )}

        {error && error !== 'AUTH' && (
          <div className="mt-6 w-full max-w-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
