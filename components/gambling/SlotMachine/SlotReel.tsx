'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';

export interface SlotReelHandle {
  spinTo: (target: PublicSymbol, durationMs: number) => Promise<void>;
}

interface SlotReelProps {
  pool: PublicSymbol[];
  tileH: number;
  reducedMotion?: boolean;
  onStop?: () => void;
}

const SPIN_TILES = 80;

// ─── Velocity-continuous 3-phase physics ─────────────────────────────────────
// a = end of acceleration (20% elapsed), b = end of constant-speed coast (50%).
// Distance fractions (1/7, 4.5/7, 1.5/7) make the peak velocity match exactly
// at both phase boundaries, so there are zero velocity jumps.
const _A = 0.2;
const _B = 0.5;
const _F1 = 1 / 7;
const _F2 = 4.5 / 7;
const _F3 = 1.5 / 7;

function physicsProgress(t: number): number {
  if (t <= _A) {
    const lt = t / _A;
    return _F1 * (lt * lt * lt);
  } else if (t <= _B) {
    return _F1 + _F2 * ((t - _A) / (_B - _A));
  } else {
    const lt = (t - _B) / (1 - _B);
    return _F1 + _F2 + _F3 * (1 - Math.pow(1 - lt, 5));
  }
}

function blurAmount(t: number, maxPx: number): number {
  const BUILD = 0.1;
  const PEAK = 0.3;
  const CLEAR = 0.5;
  if (t < BUILD) return (t / BUILD) * maxPx;
  if (t < PEAK) return maxPx;
  if (t < CLEAR) return ((CLEAR - t) / (CLEAR - PEAK)) * maxPx;
  return 0;
}

/** Tiny overshoot-then-settle bounce once the reel reaches its landing spot. */
function overshootSettle(el: HTMLDivElement, finalY: number, tileH: number): Promise<void> {
  const overshoot = Math.min(14, tileH * 0.14);
  const duration = 260;
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const y = finalY + overshoot * Math.sin(t * Math.PI) * (1 - t);
      el.style.transform = `translate3d(0,${y}px,0)`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.style.transform = `translate3d(0,${finalY}px,0)`;
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function SymbolTile({ symbol, tileH }: { symbol: PublicSymbol; tileH: number }) {
  const icon = symbol.icon || '';
  const match = icon.match(/<a?:(\w+):(\d+)>/);
  const content = match ? (
    <img
      src={`https://cdn.discordapp.com/emojis/${match[2]}.${icon.startsWith('<a:') ? 'gif' : 'png'}?size=96&quality=lossless`}
      alt={match[1]}
      className="object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
      style={{ width: tileH * 0.6, height: tileH * 0.6 }}
    />
  ) : icon ? (
    <span style={{ fontSize: tileH * 0.55, lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>{icon}</span>
  ) : (
    <span className="text-white/70 font-bold" style={{ fontSize: tileH * 0.22 }}>
      {symbol.label || '?'}
    </span>
  );
  return (
    <div className="flex items-center justify-center select-none" style={{ height: tileH }}>
      {content}
    </div>
  );
}

const SlotReel = forwardRef<SlotReelHandle, SlotReelProps>(function SlotReel(
  { pool, tileH, reducedMotion = false, onStop },
  ref,
) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>();
  const centerRef = useRef<PublicSymbol>(pool[0] ?? { label: '?', icon: '🎰' });
  const [strip, setStrip] = useState<PublicSymbol[]>(() => [
    pickFrom(pool),
    centerRef.current,
    pickFrom(pool),
  ]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      spinTo: (target: PublicSymbol, durationMs: number) =>
        new Promise<void>((resolve) => {
          const filler: PublicSymbol[] = [centerRef.current];
          for (let i = 1; i < SPIN_TILES; i++) filler.push(pickFrom(pool));
          const bottomNeighbor = pickFrom(pool);
          const newStrip = [...filler, target, bottomNeighbor];
          const targetK = newStrip.length - 3;
          const finalY = -targetK * tileH;

          setStrip(newStrip);

          requestAnimationFrame(() => {
            const el = stripRef.current;
            if (!el) return resolve();

            if (reducedMotion) {
              el.style.transform = `translate3d(0,${finalY}px,0)`;
              el.style.filter = 'none';
              centerRef.current = target;
              onStop?.();
              return resolve();
            }

            el.style.transform = 'translate3d(0,0,0)';
            el.style.willChange = 'transform, filter';
            const start = performance.now();
            const maxBlur = Math.min(18, tileH * 0.18);

            const step = (now: number) => {
              const rawT = Math.min(1, (now - start) / durationMs);
              const progress = physicsProgress(rawT);
              const y = finalY * progress;
              el.style.transform = `translate3d(0,${y}px,0)`;

              const blur = blurAmount(rawT, maxBlur);
              el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';

              if (rawT < 1) {
                rafRef.current = requestAnimationFrame(step);
              } else {
                el.style.filter = 'none';
                overshootSettle(el, finalY, tileH).then(() => {
                  el.style.willChange = 'auto';
                  centerRef.current = target;
                  onStop?.();
                  resolve();
                });
              }
            };
            rafRef.current = requestAnimationFrame(step);
          });
        }),
    }),
    [pool, tileH, reducedMotion, onStop],
  );

  const viewportH = tileH * 3;

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        width: tileH,
        height: viewportH,
        background: 'linear-gradient(180deg,#050608,#0d1016 50%,#050608)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 6px 14px rgba(0,0,0,0.7), inset 0 -6px 14px rgba(0,0,0,0.7)',
      }}
    >
      <div ref={stripRef} className="will-change-transform" style={{ transform: 'translate3d(0,0,0)' }}>
        {strip.map((sym, j) => (
          <SymbolTile key={j} symbol={sym} tileH={tileH} />
        ))}
      </div>
      {/* top / bottom vignette so symbols fade into the housing */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: tileH * 0.85, background: 'linear-gradient(180deg,rgba(0,0,0,0.85),transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: tileH * 0.85, background: 'linear-gradient(0deg,rgba(0,0,0,0.85),transparent)' }}
      />
    </div>
  );
});

export default SlotReel;
