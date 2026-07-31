'use client';

import { useCallback, useEffect, useRef } from 'react';

type Cue = 'impact' | 'open' | 'rise' | 'chime';

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

      if (cue === 'impact') {
        // A heavier landing thud than a simple drop — two layered low tones.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.26);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        const thock = ctx.createOscillator();
        const thockGain = ctx.createGain();
        thock.type = 'triangle';
        thock.frequency.setValueAtTime(210, now);
        thock.frequency.exponentialRampToValueAtTime(90, now + 0.08);
        thockGain.gain.setValueAtTime(0.18, now);
        thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        thock.connect(thockGain).connect(ctx.destination);
        thock.start(now);
        thock.stop(now + 0.14);
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

      if (cue === 'rise') {
        // A slow ascending shimmer under the item lifting out of the crate.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 1.1);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.35);
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
