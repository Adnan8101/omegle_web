'use client';

import SlotMachine, { SlotMachineHandle } from '@/components/gambling/SlotMachine';
import SlotWinOverlay from '@/components/gambling/SlotMachine/SlotWinOverlay';
import SlotDisplay from '@/components/gambling/SlotMachine/SlotDisplay';
import { SlotAudioSynth } from '@/lib/gambling/slotAudioSynth';
import { DEV_ACCESS_HEADER, DEV_ACCESS_STORAGE_KEY } from '@/lib/gambling/devAccess';
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
  const [tileSize, setTileSize] = useState(96);
  const [reducedMotion, setReducedMotion] = useState(false);

  
  
  const devToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(DEV_ACCESS_STORAGE_KEY);
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (devToken) h[DEV_ACCESS_HEADER] = devToken;
    return h;
  }, [devToken]);

  useEffect(() => {
    audioRef.current = new SlotAudioSynth();
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  
  useEffect(() => {
    const resize = () => {
      const w = Math.min(window.innerWidth - 64, 420);
      setTileSize(Math.max(72, Math.floor(w / 3)));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gambling/slots/state', { headers: authHeaders(), cache: 'no-store' });
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
        headers: authHeaders(),
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
      {}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {}
        <div className="w-full flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
            <FiArrowLeft className="w-4 h-4" /> Back
          </Link>
          {state?.devBypass && (
            <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
              Developer Access
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight mb-1 text-center">
          Slot Machine
        </h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6 text-center">
          Place your bet and spin for {currencyName} rewards.
        </p>

        {}
        <div className="mb-8 w-full flex justify-center">
          <SlotDisplay
            balance={balance}
            bet={bet}
            win={win}
            currencyName={currencyName}
            currencyEmoji={currencyEmoji}
            reducedMotion={reducedMotion}
          />
        </div>

        {}
        {symbols.length > 0 ? (
          <SlotMachine
            ref={machineRef}
            symbols={symbols}
            size={tileSize}
            spinning={spinning}
            canSpin={canSpin}
            onSpinClick={spin}
            onReelStop={() => audioRef.current?.playReelStop()}
            reducedMotion={reducedMotion}
          />
        ) : (
          <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] text-center">
            <p className="text-[rgb(var(--color-text-secondary))]">The slot machine has not been configured yet.</p>
          </div>
        )}

        {}
        {symbols.length > 0 && (
          <div className="mt-8 w-full max-w-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBet((b) => clampBet(b - (minBet || 1)))}
                disabled={spinning}
                className="w-11 h-11 shrink-0 rounded-xl bg-[rgb(var(--color-bg-tertiary))] text-xl font-bold text-[rgb(var(--color-text-primary))] disabled:opacity-50"
              >
                −
              </button>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={bet}
                  min={minBet}
                  max={maxBet}
                  disabled={spinning}
                  onChange={(e) => setBet(Math.max(0, parseInt(e.target.value) || 0))}
                  onBlur={() => setBet((b) => (b > 0 ? clampBet(b) : b))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center text-lg font-bold"
                />
              </div>
              <button
                onClick={() => setBet((b) => clampBet(b + (minBet || 1)))}
                disabled={spinning}
                className="w-11 h-11 shrink-0 rounded-xl bg-[rgb(var(--color-bg-tertiary))] text-xl font-bold text-[rgb(var(--color-text-primary))] disabled:opacity-50"
              >
                +
              </button>
            </div>

            {}
            <div className="flex flex-wrap gap-2 justify-center">
              {quickBets.map((q) => (
                <button
                  key={q}
                  onClick={() => setBet(clampBet(q))}
                  disabled={spinning}
                  className="px-4 py-1.5 rounded-lg bg-[rgb(var(--color-bg-tertiary))] text-sm font-semibold text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-50"
                >
                  {q.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => setBet(clampBet(Math.min(balance, maxBet)))}
                disabled={spinning}
                className="px-4 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-sm font-bold text-amber-400 hover:bg-amber-500/25 disabled:opacity-50"
              >
                MAX
              </button>
            </div>

            <p className="text-center text-xs font-medium text-[rgb(var(--color-text-tertiary))] tracking-wide">
              {spinning ? 'Spinning…' : canSpin ? 'Pull the lever to spin' : betError || 'Set a bet to play'}
            </p>

            {(betError && !spinning) || (error && error !== 'AUTH') ? (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error && error !== 'AUTH' ? error : betError}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {showReveal && result && (
        <SlotWinOverlay
          outcome={result.outcome}
          bet={result.reward - result.profit}
          reward={result.reward}
          profit={result.profit}
          currencyName={currencyName}
          currencyEmoji={currencyEmoji}
          newBalance={balance}
          isBig={result.outcome === 'THREE'}
          reducedMotion={reducedMotion}
          canSpinAgain={bet <= balance && !betError}
          onClose={() => setShowReveal(false)}
          onSpinAgain={() => {
            setShowReveal(false);
            setTimeout(() => spin(), 150);
          }}
        />
      )}
    </div>
  );
}
