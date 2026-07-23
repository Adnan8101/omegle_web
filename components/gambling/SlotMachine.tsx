'use client';
// Slot Machine — three independent vertical reels. The BACKEND decides the
// outcome; this component only animates the reels to the symbols it is handed
// via the imperative `spinTo(reels)` handle. GPU-friendly (transform:
// translate3d), physics-inspired ease-out with staggered per-reel stops and
// motion blur while spinning (spec §4, §9). Never influences the result.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';

export interface SlotMachineHandle {
  /** Animate all three reels to the given symbols (left→right). Resolves when
   *  the last reel has stopped. */
  spinTo: (reels: PublicSymbol[]) => Promise<void>;
}

interface SlotMachineProps {
  symbols: PublicSymbol[]; // cosmetic pool used for the spinning filler tiles
  size?: number; // tile height in px (reel width matches)
  spinning?: boolean;
  canSpin?: boolean;
  onSpinClick?: () => void;
  onReelStop?: () => void;
  reducedMotion?: boolean;
}

const REEL_COUNT = 3;
const SPIN_TILES = 28; // filler tiles scrolled past before landing
const DURATIONS = [1500, 2000, 2500]; // per-reel stop stagger (ms)

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Render a symbol's icon (emoji or Discord emoji markup) with a label fallback. */
function SymbolTile({ symbol, tileH }: { symbol: PublicSymbol; tileH: number }) {
  const icon = symbol.icon || '';
  const match = icon.match(/<a?:(\w+):(\d+)>/);
  const content = match ? (
    <img
      src={`https://cdn.discordapp.com/emojis/${match[2]}.${icon.startsWith('<a:') ? 'gif' : 'png'}?size=96&quality=lossless`}
      alt={match[1]}
      className="object-contain"
      style={{ width: tileH * 0.6, height: tileH * 0.6 }}
    />
  ) : icon ? (
    <span style={{ fontSize: tileH * 0.55, lineHeight: 1 }}>{icon}</span>
  ) : (
    <span className="text-[rgb(var(--color-text-secondary))] font-bold" style={{ fontSize: tileH * 0.22 }}>
      {symbol.label || '?'}
    </span>
  );
  return (
    <div className="flex items-center justify-center select-none" style={{ height: tileH }}>
      {content}
    </div>
  );
}

const SlotMachine = forwardRef<SlotMachineHandle, SlotMachineProps>(function SlotMachine(
  { symbols, size = 96, canSpin = false, onSpinClick, onReelStop, reducedMotion = false },
  ref,
) {
  const tileH = size;
  const pool = useMemo<PublicSymbol[]>(
    () => (symbols.length > 0 ? symbols : [{ label: '?', icon: '🎰' }]),
    [symbols],
  );

  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRefs = useRef<number[]>([]);
  // The symbol currently shown in each reel's centre row (for seamless restarts).
  const centersRef = useRef<PublicSymbol[]>([]);
  // Rendered strip contents per reel.
  const [strips, setStrips] = useState<PublicSymbol[][]>(() =>
    Array.from({ length: REEL_COUNT }, () => {
      const s = symbols.length > 0 ? symbols : [{ label: '?', icon: '🎰' }];
      return [pickFrom(s), pickFrom(s), pickFrom(s)];
    }),
  );

  function pickFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Initialise centres and idle offsets once mounted / when the pool changes.
  useEffect(() => {
    centersRef.current = strips.map((s) => s[1] ?? pool[0]);
    stripRefs.current.forEach((el) => {
      if (el) el.style.transform = 'translate3d(0,0,0)';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => rafRefs.current.forEach((r) => cancelAnimationFrame(r));
  }, []);

  function buildStrip(target: PublicSymbol, reelIndex: number): PublicSymbol[] {
    const filler: PublicSymbol[] = [];
    // Seamless restart: begin at the symbol currently shown.
    filler.push(centersRef.current[reelIndex] ?? pickFrom(pool));
    for (let i = 1; i < SPIN_TILES; i++) filler.push(pickFrom(pool));
    const bottomNeighbor = pickFrom(pool);
    // strip = [...filler, target, bottomNeighbor]; target sits at index length-2.
    return [...filler, target, bottomNeighbor];
  }

  function animateReel(
    reelIndex: number,
    strip: PublicSymbol[],
    duration: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const el = stripRefs.current[reelIndex];
      const targetK = strip.length - 3; // centre row lands on the target
      const finalY = -targetK * tileH;
      if (!el) return resolve();

      if (reducedMotion) {
        el.style.transform = `translate3d(0,${finalY}px,0)`;
        el.style.filter = 'none';
        onReelStop?.();
        return resolve();
      }

      el.style.transform = 'translate3d(0,0,0)';
      el.style.willChange = 'transform, filter';
      const start = performance.now();
      const maxBlur = Math.min(14, tileH * 0.14);

      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(p);
        const y = finalY * eased;
        el.style.transform = `translate3d(0,${y}px,0)`;
        // Blur tracks remaining velocity (derivative of easeOutCubic ∝ (1-p)^2).
        el.style.filter = `blur(${(maxBlur * Math.pow(1 - p, 2)).toFixed(2)}px)`;
        if (p < 1) {
          rafRefs.current[reelIndex] = requestAnimationFrame(step);
        } else {
          el.style.filter = 'none';
          el.style.willChange = 'auto';
          onReelStop?.();
          resolve();
        }
      };
      rafRefs.current[reelIndex] = requestAnimationFrame(step);
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      spinTo: async (reels: PublicSymbol[]) => {
        const targets = reels.slice(0, REEL_COUNT);
        while (targets.length < REEL_COUNT) targets.push(pickFrom(pool));

        const newStrips = targets.map((t, i) => buildStrip(t, i));

        // Commit the new strips to the DOM before animating so refs read fresh
        // heights. (flushSync avoids a one-frame flash of stale tiles.)
        const { flushSync } = await import('react-dom');
        flushSync(() => setStrips(newStrips));

        await Promise.all(newStrips.map((s, i) => animateReel(i, s, DURATIONS[i])));

        // Record the resting centre symbol for the next seamless restart.
        centersRef.current = targets.slice();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, tileH, reducedMotion],
  );

  const viewportH = tileH * 3; // three visible rows, centre is the payline
  const frameW = tileH * REEL_COUNT + 24;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Metallic frame + glassmorphism + neon glow */}
      <div
        className="relative rounded-3xl p-3 sm:p-4"
        style={{
          background: 'linear-gradient(145deg,#3a3f4b,#14161c 55%,#2a2e38)',
          boxShadow:
            '0 0 0 2px rgba(255,255,255,0.06) inset, 0 20px 60px -12px rgba(0,0,0,0.7), 0 0 48px -6px rgba(99,102,241,0.35)',
          maxWidth: '100%',
        }}
      >
        <div
          className="relative flex gap-2 sm:gap-3 rounded-2xl p-2 sm:p-3 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg,rgba(10,12,18,0.95),rgba(20,24,34,0.95))',
            boxShadow: 'inset 0 2px 24px rgba(0,0,0,0.8)',
          }}
        >
          {Array.from({ length: REEL_COUNT }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl bg-black/40 border border-white/5"
              style={{ width: tileH, height: viewportH }}
            >
              <div
                ref={(el) => {
                  stripRefs.current[i] = el;
                }}
                className="will-change-transform"
                style={{ transform: 'translate3d(0,0,0)' }}
              >
                {strips[i]?.map((sym, j) => (
                  <SymbolTile key={j} symbol={sym} tileH={tileH} />
                ))}
              </div>
              {/* top/bottom fade for depth */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0"
                style={{ height: tileH, background: 'linear-gradient(180deg,rgba(0,0,0,0.75),transparent)' }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{ height: tileH, background: 'linear-gradient(0deg,rgba(0,0,0,0.75),transparent)' }}
              />
            </div>
          ))}

          {/* Centre payline highlight */}
          <div
            className="pointer-events-none absolute left-2 right-2 sm:left-3 sm:right-3 rounded-lg"
            style={{
              top: `calc(50% - ${tileH / 2}px)`,
              height: tileH,
              boxShadow: '0 0 0 2px rgba(99,102,241,0.5), 0 0 24px rgba(99,102,241,0.35)',
              background: 'linear-gradient(90deg,rgba(99,102,241,0.06),rgba(168,85,247,0.06))',
            }}
          />
        </div>
      </div>

      {/* Spin lever / button */}
      {onSpinClick && (
        <button
          onClick={onSpinClick}
          disabled={!canSpin}
          style={{ minWidth: Math.min(frameW, 320) }}
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold tracking-wide text-lg transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canSpin ? 'SPIN' : '···'}
        </button>
      )}
    </div>
  );
});

export default SlotMachine;
