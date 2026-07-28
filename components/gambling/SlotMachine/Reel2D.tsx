'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { renderEmoji } from '@/lib/gambling/renderEmoji';
import type { PublicSymbol } from '@/lib/gambling/types';

export interface Reel2DHandle {
  /** Begin an endless cruise (called the instant a spin is requested). */
  startSpin: () => void;
  /** Decelerate and land the payline (center row) on `target`. Resolves once settled. */
  land: (target: PublicSymbol, duration: number, spins: number) => Promise<void>;
  /** Snap instantly to show `target` in the center with no animation. */
  set: (target: PublicSymbol) => void;
}

interface Reel2DProps {
  pool: PublicSymbol[];
  /** cruise speed in cells per second */
  cruiseSpeed?: number;
  onStop?: () => void;
  reducedMotion?: boolean;
}

/** cubic-bezier-ish overshoot — the reel drifts a hair past the stop then settles back (real slot bounce). */
function easeOutBack(t: number): number {
  const c1 = 1.7;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * One vertical reel. The symbol pool is rendered three times back-to-back so the strip can wrap
 * seamlessly; a single rAF driver handles cruise (endless scroll) and land (eased deceleration onto
 * the payline). All motion is imperative — nothing random happens during render, so SSR is stable.
 */
const Reel2D = forwardRef<Reel2DHandle, Reel2DProps>(function Reel2D(
  { pool, cruiseSpeed = 26, onStop, reducedMotion = false },
  ref,
) {
  const L = Math.max(1, pool.length);
  const stripRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const posRef = useRef(0); // current position in cell units, kept within [0, L)
  const cellHRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef(0);
  const modeRef = useRef<'idle' | 'cruise' | 'land'>('idle');
  const landRef = useRef<{
    from: number;
    total: number;
    rest: number;
    dur: number;
    start: number;
    resolve: () => void;
  } | null>(null);

  // Render the pool 3× so any wrap offset always has cells above & below the window.
  const cells = useMemo(() => [...pool, ...pool, ...pool], [pool]);

  const measure = () => {
    const h = windowRef.current?.clientHeight ?? 0;
    cellHRef.current = h / 3; // window shows exactly 3 rows
  };

  const paint = (blurPx = 0) => {
    const strip = stripRef.current;
    if (!strip) return;
    const cellH = cellHRef.current;
    const y = -(posRef.current % L) * cellH;
    strip.style.transform = `translate3d(0, ${y}px, 0)`;
    strip.style.filter = blurPx > 0.15 ? `blur(${blurPx}px)` : 'none';
  };

  const stopRaf = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const tick = (t: number) => {
    const cellH = cellHRef.current;
    const dt = lastTRef.current ? Math.min(0.05, (t - lastTRef.current) / 1000) : 0;
    lastTRef.current = t;
    const prev = posRef.current;

    if (modeRef.current === 'cruise') {
      posRef.current = (posRef.current + cruiseSpeed * dt) % L;
      const dCells = Math.abs(posRef.current - prev);
      paint(Math.min(12, dCells * cellH * 0.9 + cruiseSpeed * 0.12));
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (modeRef.current === 'land' && landRef.current) {
      const l = landRef.current;
      const e = Math.min(1, (t - l.start) / l.dur);
      // ease mostly with quart for the long travel, blend the back-overshoot near the end
      const k = e < 0.82 ? easeOutQuart(e) * 0.92 : 0.92 * easeOutQuart(e) + 0.08 * easeOutBack((e - 0.82) / 0.18);
      const abs = l.from + l.total * k;
      posRef.current = ((abs % L) + L) % L;
      const dCells = Math.abs(posRef.current - prev);
      const blur = e < 0.9 ? Math.min(14, (dCells > L / 2 ? cruiseSpeed * dt : dCells) * cellH * 0.9) : 0;
      paint(blur);
      if (e >= 1) {
        posRef.current = l.rest;
        paint(0);
        modeRef.current = 'idle';
        landRef.current = null;
        stopRaf();
        lastTRef.current = 0;
        onStop?.();
        l.resolve();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      startSpin: () => {
        if (reducedMotion) return;
        if (modeRef.current === 'cruise') return;
        measure();
        modeRef.current = 'cruise';
        lastTRef.current = 0;
        stopRaf();
        rafRef.current = requestAnimationFrame(tick);
      },
      land: (target, duration, spins) =>
        new Promise<void>((resolve) => {
          measure();
          const idx = Math.max(
            0,
            pool.findIndex((s) => s.label === target.label && (s.icon ?? '') === (target.icon ?? '')),
          );
          const rest = (((idx - 1) % L) + L) % L; // center row === target
          const from = posRef.current;
          const forward = (((rest - from) % L) + L) % L;
          if (reducedMotion) {
            posRef.current = rest;
            paint(0);
            onStop?.();
            resolve();
            return;
          }
          const total = spins * L + forward;
          modeRef.current = 'land';
          landRef.current = { from, total, rest, dur: duration, start: performance.now(), resolve };
          lastTRef.current = 0;
          stopRaf();
          rafRef.current = requestAnimationFrame(tick);
        }),
      set: (target) => {
        stopRaf();
        modeRef.current = 'idle';
        measure();
        const idx = Math.max(
          0,
          pool.findIndex((s) => s.label === target.label && (s.icon ?? '') === (target.icon ?? '')),
        );
        posRef.current = (((idx - 1) % L) + L) % L;
        paint(0);
      },
    }),
    [pool, L, reducedMotion, cruiseSpeed],
  );

  useLayoutEffect(() => {
    measure();
    paint(0);
    const ro = new ResizeObserver(() => {
      measure();
      paint(0);
    });
    if (windowRef.current) ro.observe(windowRef.current);
    return () => {
      ro.disconnect();
      stopRaf();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopRaf(), []);

  return (
    <div ref={windowRef} className="slot2d-reel-window">
      <div ref={stripRef} className="slot2d-reel-strip" style={{ willChange: 'transform, filter' }}>
        {cells.map((s, i) => (
          <div key={i} className="slot2d-cell">
            <span className="slot2d-symbol">
              {s.icon ? renderEmoji(s.icon, 'slot2d-symbol-img') : <span>{s.label.slice(0, 2)}</span>}
            </span>
          </div>
        ))}
      </div>
      {/* payline glass sheen + inner shadow live in CSS via ::before/::after on the window */}
    </div>
  );
});

export default Reel2D;
