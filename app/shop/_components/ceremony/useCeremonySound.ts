'use client';

import { useCallback, useEffect, useRef } from 'react';

type Cue = 'drop' | 'open' | 'chime';

/**
 * A few synthesised tones — no audio files. `enabled` is a deliberate opt-in
 * (the ceremony defaults to muted, per browser autoplay etiquette); flipping
 * it on is itself the user gesture that unlocks the AudioContext.
 */
export function useCeremonySound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  const getCtx = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, [enabled]);

  return useCallback(
    (cue: Cue) => {
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (cue === 'drop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      }

      if (cue === 'open') {
        [660, 880, 1320].forEach((freq, i) => {
          const delay = i * 0.05;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.0001, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.55);
        });
      }

      if (cue === 'chime') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      }
    },
    [getCtx]
  );
}
