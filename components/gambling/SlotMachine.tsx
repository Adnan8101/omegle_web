'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';

export interface SlotMachineHandle {
  

  spinTo: (reels: PublicSymbol[]) => Promise<void>;
}

interface SlotMachineProps {
  symbols: PublicSymbol[]; 
  size?: number;           
  spinning?: boolean;
  canSpin?: boolean;
  onSpinClick?: () => void;
  onReelStop?: () => void;
  reducedMotion?: boolean;
}

const REEL_COUNT = 3;
const SPIN_TILES = 80; 

const DURATIONS = [6_000, 8_000, 10_000];

// ─── Velocity-continuous 3-phase physics ─────────────────────────────────────
//
// Phase boundaries chosen so that d(progress)/dt is equal on both sides:
//   a = 0.20  (end of acceleration, 20% of total time)
//   b = 0.50  (end of constant-speed coasting, 50% of total time)
//
// With f1=1/7 of distance in phase 1, f2=4.5/7 in phase 2, f3=1.5/7 in phase 3
// the peak velocity (2.14 /unit-t) matches exactly at both transitions.
// Result: perfectly smooth, zero velocity jumps.

const _A = 0.20;          // acceleration ends at 20% elapsed time
const _B = 0.50;          // coast ends at 50%  (deceleration fills last 50%)
const _F1 = 1 / 7;        // fraction of total distance covered in phase 1
const _F2 = 4.5 / 7;      // fraction covered in phase 2
const _F3 = 1.5 / 7;      // fraction covered in phase 3

function physicsProgress(t: number): number {
  if (t <= _A) {
    // Phase 1: ease-in cubic
    const lt = t / _A;
    return _F1 * (lt * lt * lt);
  } else if (t <= _B) {
    // Phase 2: constant velocity (linear)
    return _F1 + _F2 * ((t - _A) / (_B - _A));
  } else {
    // Phase 3: ease-out quintic — silky smooth deceleration
    const lt = (t - _B) / (1 - _B);
    return _F1 + _F2 + _F3 * (1 - Math.pow(1 - lt, 5));
  }
}

// ─── Blur schedule ────────────────────────────────────────────────────────────
//   0  → 0.10 t  : blur builds up to max          (first ~1 s at 10 s duration)
//   0.10 → 0.30 t : max blur — symbols invisible   (2 s of heavy blur)
//   0.30 → 0.50 t : blur fades to 0               (2 s fade-out)
//   0.50 → 1.00 t : ZERO blur — symbols fully visible for the last 5 s

function blurAmount(t: number, maxPx: number): number {
  const BUILD = 0.10;
  const PEAK  = 0.30;
  const CLEAR = 0.50;
  if (t < BUILD) return (t / BUILD) * maxPx;
  if (t < PEAK)  return maxPx;
  if (t < CLEAR) return ((CLEAR - t) / (CLEAR - PEAK)) * maxPx;
  return 0;
}

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

function CasinoLever({
  canSpin,
  onPull,
  tileH,
}: {
  canSpin: boolean;
  onPull: () => void;
  tileH: number;
}) {
  const armRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pullingRef = useRef(false);

  const RAIL_H = tileH * 3 + 16; 
  const KNOB_SIZE = Math.round(tileH * 0.55);
  const ARM_W = Math.round(tileH * 0.12);

  const pull = () => {
    if (!canSpin || pullingRef.current) return;
    pullingRef.current = true;

    const arm = armRef.current;
    const knob = knobRef.current;
    if (!arm || !knob) return;

    
    arm.style.transition = 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)';
    arm.style.transform = 'rotate(105deg)';
    knob.style.transition = 'background 300ms ease';
    knob.style.background = 'radial-gradient(circle at 35% 30%,#ef4444,#b91c1c 70%)';

    
    setTimeout(() => {
      onPull();
    }, 280);

    
    setTimeout(() => {
      arm.style.transition = 'transform 450ms cubic-bezier(0.34,1.56,0.64,1)';
      arm.style.transform = 'rotate(0deg)';
      knob.style.transition = 'background 450ms ease';
      knob.style.background = '';
    }, 480);

    
    setTimeout(() => {
      pullingRef.current = false;
    }, 950);
  };

  return (
    <div
      className="flex flex-col items-center justify-start select-none"
      style={{ width: KNOB_SIZE + 8, height: RAIL_H + KNOB_SIZE }}
      aria-label="Slot machine lever"
    >
      {}
      <div
        className="relative rounded-full mx-auto"
        style={{
          width: ARM_W,
          height: RAIL_H,
          background: 'linear-gradient(90deg,#4a4f5c 0%,#9ca3af 40%,#6b7280 60%,#374151 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.5), inset -2px 0 4px rgba(255,255,255,0.08)',
        }}
      >
        {}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: Math.round(RAIL_H * 0.28) }}
        >
          {}
          <div
            ref={armRef}
            style={{
              width: ARM_W,
              height: Math.round(RAIL_H * 0.5),
              background: 'linear-gradient(180deg,#6b7280,#9ca3af 50%,#4b5563)',
              borderRadius: ARM_W / 2,
              transformOrigin: 'center top',
              transform: 'rotate(0deg)',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.4)',
              marginLeft: -ARM_W / 2 + ARM_W / 2, 
              position: 'relative',
            }}
          >
            {}
            <div
              ref={knobRef}
              onClick={pull}
              className={`absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center cursor-pointer transition-shadow ${
                canSpin
                  ? 'hover:scale-105 active:scale-95 cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={{
                width: KNOB_SIZE,
                height: KNOB_SIZE,
                bottom: -(KNOB_SIZE / 2),
                background: canSpin
                  ? 'radial-gradient(circle at 35% 30%,#f87171,#dc2626 70%,#7f1d1d)'
                  : 'radial-gradient(circle at 35% 30%,#6b7280,#374151)',
                boxShadow: canSpin
                  ? '0 4px 16px rgba(220,38,38,0.55), inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.4)'
                  : '0 2px 8px rgba(0,0,0,0.4)',
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
                zIndex: 10,
              }}
            >
              {}
              <div
                className="rounded-full pointer-events-none"
                style={{
                  width: KNOB_SIZE * 0.3,
                  height: KNOB_SIZE * 0.3,
                  background: 'rgba(255,255,255,0.45)',
                  position: 'absolute',
                  top: '20%',
                  left: '22%',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  const centersRef = useRef<PublicSymbol[]>([]);
  const [strips, setStrips] = useState<PublicSymbol[][]>(() =>
    Array.from({ length: REEL_COUNT }, () => {
      const s = symbols.length > 0 ? symbols : [{ label: '?', icon: '🎰' }];
      return [pickFrom(s), pickFrom(s), pickFrom(s)];
    }),
  );

  
  useEffect(() => {
    centersRef.current = strips.map((s) => s[1] ?? pool[0]);
    stripRefs.current.forEach((el) => {
      if (el) el.style.transform = 'translate3d(0,0,0)';
    });
    
  }, []);

  useEffect(() => {
    return () => rafRefs.current.forEach((r) => cancelAnimationFrame(r));
  }, []);

  function buildStrip(target: PublicSymbol, reelIndex: number): PublicSymbol[] {
    const filler: PublicSymbol[] = [];
    filler.push(centersRef.current[reelIndex] ?? pickFrom(pool));
    for (let i = 1; i < SPIN_TILES; i++) filler.push(pickFrom(pool));
    const bottomNeighbor = pickFrom(pool);
    return [...filler, target, bottomNeighbor];
  }

  function animateReel(
    reelIndex: number,
    strip: PublicSymbol[],
    duration: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const el = stripRefs.current[reelIndex];
      const targetK = strip.length - 3; 
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
      const maxBlur = Math.min(18, tileH * 0.18);

      const step = (now: number) => {
        const rawT = Math.min(1, (now - start) / duration);
        const progress = physicsProgress(rawT);
        const y = finalY * progress;
        el.style.transform = `translate3d(0,${y}px,0)`;

        const blur = blurAmount(rawT, maxBlur);
        el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';

        if (rawT < 1) {
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

        
        const { flushSync } = await import('react-dom');
        flushSync(() => setStrips(newStrips));

        
        
        await Promise.all(newStrips.map((s, i) => animateReel(i, s, DURATIONS[i])));

        centersRef.current = targets.slice();
      },
    }),
    
    [pool, tileH, reducedMotion],
  );

  const viewportH = tileH * 3;
  const reelContainerW = tileH * REEL_COUNT + (REEL_COUNT - 1) * 8 + 24; 

  return (
    <div className="flex items-center gap-4">
      {}
      <div className="flex flex-col items-center gap-6">
        {}
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
                {}
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

            {}
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
      </div>

      {}
      {onSpinClick && (
        <div className="flex-shrink-0 mt-2">
          <CasinoLever
            canSpin={canSpin}
            onPull={onSpinClick}
            tileH={tileH}
          />
        </div>
      )}
    </div>
  );
});

export default SlotMachine;
