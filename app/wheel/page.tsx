'use client';

import SpinWheel, { SpinWheelHandle } from '@/components/gambling/SpinWheel';
import WinReveal from '@/components/gambling/WinReveal';
import BalanceBar from '@/components/gambling/BalanceBar';
import { WheelAudioSynth } from '@/lib/gambling/audioSynth';
import { DEV_ACCESS_HEADER, DEV_ACCESS_STORAGE_KEY } from '@/lib/gambling/devAccess';
import { renderEmoji } from '@/lib/gambling/renderEmoji';
import type { PublicSegment, SpinResult, WheelState } from '@/lib/gambling/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiArrowLeft, FiLoader, FiPlusCircle } from 'react-icons/fi';

export default function WheelPage() {
  const { status } = useSession();
  const wheelRef = useRef<SpinWheelHandle>(null);
  const audioRef = useRef<WheelAudioSynth | null>(null);

  const [state, setState] = useState<WheelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [chances, setChances] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wheelSize, setWheelSize] = useState(360);
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
    audioRef.current = new WheelAudioSynth();
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  
  useEffect(() => {
    const resize = () => {
      const w = Math.min(window.innerWidth - 48, 460);
      setWheelSize(Math.max(260, w));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gambling/wheel/state', { headers: authHeaders(), cache: 'no-store' });
      if (res.status === 401) {
        setState(null);
        setError('AUTH');
        return;
      }
      const data: WheelState = await res.json();
      setState(data);
      setBalance(data.balance ?? 0);
      setChances(data.chances ?? 0);
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

  const segments: PublicSegment[] = state?.segments ?? [];
  const maxReward = useMemo(() => segments.reduce((m, s) => Math.max(m, s.reward), 0), [segments]);

  const purchase = useCallback(async () => {
    if (purchasing || spinning) return;
    setPurchasing(true);
    setError(null);
    try {
      const res = await fetch('/api/gambling/wheel/purchase', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Purchase failed.');
        return;
      }
      audioRef.current?.init();
      setBalance(data.balance);
      setChances(data.chances);
    } catch {
      setError('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [authHeaders, purchasing, spinning]);

  const spin = useCallback(async () => {
    if (spinning || chances < 1) return;
    setError(null);
    setSpinning(true);
    setChances((c) => Math.max(0, c - 1)); 
    audioRef.current?.init();
    audioRef.current?.playSpinStart();
    try {
      const res = await fetch('/api/gambling/wheel/spin', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Spin failed.');
        setSpinning(false);
        loadState();
        return;
      }
      const spinResult: SpinResult = data;
      await wheelRef.current?.spinTo(spinResult.winningIndex);
      
      setBalance(spinResult.balance);
      setChances(spinResult.chances);
      setResult(spinResult);
      if (spinResult.reward > 0) {
        audioRef.current?.playWin(maxReward > 0 && spinResult.reward >= maxReward);
      } else {
        audioRef.current?.playNoWin();
      }
      setShowReveal(true);
    } catch {
      setError('Spin failed. Please try again.');
      loadState();
    } finally {
      setSpinning(false);
    }
  }, [spinning, chances, authHeaders, maxReward, loadState]);

  

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
            You need to be logged in to spin the wheel.
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
            Spin the Wheel is not available right now. Check back soon!
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-medium transition-colors">
            <FiArrowLeft className="w-4 h-4" /> Back Home
          </Link>
        </div>
      </div>
    );
  }

  const currencyName = state?.currencyName || 'Ozy';
  const currencyEmoji = state?.currencyEmoji || '🪙';
  const entryCost = state?.entryCost ?? 0;

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] relative overflow-hidden">
      {}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
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
          Spin the Wheel
        </h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6 text-center">
          Buy a spin, then try your luck for {currencyName} rewards.
        </p>

        <div className="mb-8 w-full flex justify-center">
          <BalanceBar
            balance={balance}
            currencyName={currencyName}
            currencyEmoji={currencyEmoji}
            stats={[
              { label: 'Spin Chances', value: chances, accent: true },
            ]}
          />
        </div>

        {}
        {segments.length > 0 ? (
          <SpinWheel
            ref={wheelRef}
            segments={segments.map((s) => ({ label: s.label, reward: s.reward, color: s.color, icon: s.icon }))}
            size={wheelSize}
            currencyEmoji={currencyEmoji}
            canSpin={chances > 0}
            spinning={spinning}
            onSpinClick={spin}
            onTick={() => audioRef.current?.playTick()}
            reducedMotion={reducedMotion}
            centerLabel={chances > 0 ? 'SPIN' : ''}
          />
        ) : (
          <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] text-center">
            <p className="text-[rgb(var(--color-text-secondary))]">The wheel has not been configured yet.</p>
          </div>
        )}

        {}
        <div className="mt-8 w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={purchase}
            disabled={purchasing || spinning}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {purchasing ? (
              <FiLoader className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <FiPlusCircle className="w-5 h-5" />
                Purchase Spin — {entryCost.toLocaleString()} {renderEmoji(currencyEmoji, 'w-4 h-4')} {currencyName}
              </span>
            )}
          </button>

          {chances > 0 ? (
            <button
              onClick={spin}
              disabled={spinning}
              className="w-full px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {spinning ? 'Spinning…' : `Spin Now (${chances})`}
            </button>
          ) : (
            <p className="text-center text-xs text-[rgb(var(--color-text-tertiary))]">
              Purchase a spin chance to play.
            </p>
          )}

          {error && error !== 'AUTH' && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {showReveal && result && (
        <WinReveal
          reward={result.reward}
          currencyName={currencyName}
          currencyEmoji={currencyEmoji}
          newBalance={balance}
          chancesLeft={chances}
          isBig={maxReward > 0 && result.reward >= maxReward}
          reducedMotion={reducedMotion}
          canSpinAgain={chances > 0}
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
