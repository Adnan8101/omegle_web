'use client';

import { useEffect, useMemo, useRef } from 'react';

export type SlotLightsMode = 'idle' | 'spin' | 'win';

interface SlotLightsProps {
  mode: SlotLightsMode;
  count?: number;
  reducedMotion?: boolean;
}

/** Distributes `count` points evenly around a rectangle's perimeter (percent coords). */
function perimeterPoints(count: number, aspect: number): { x: number; y: number }[] {
  const w = aspect;
  const h = 1;
  const perim = 2 * (w + h);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let d = (i / count) * perim;
    let x = 0;
    let y = 0;
    if (d <= w) {
      x = d;
      y = 0;
    } else if (d <= w + h) {
      d -= w;
      x = w;
      y = d;
    } else if (d <= 2 * w + h) {
      d -= w + h;
      x = w - d;
      y = h;
    } else {
      d -= 2 * w + h;
      x = 0;
      y = h - d;
    }
    pts.push({ x: (x / w) * 100, y: (y / h) * 100 });
  }
  return pts;
}

export default function SlotLights({ mode, count = 32, reducedMotion = false }: SlotLightsProps) {
  const points = useMemo(() => perimeterPoints(count, 1.9), [count]);
  const bulbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (mode !== 'spin' || reducedMotion) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const start = performance.now();
    const speed = 1.4; // laps per second
    const tail = 6; // bulbs lit behind the head

    const step = (now: number) => {
      const elapsed = (now - start) / 1000;
      const head = (elapsed * speed * count) % count;
      bulbRefs.current.forEach((el, i) => {
        if (!el) return;
        let dist = head - i;
        if (dist < 0) dist += count;
        const lit = dist < tail ? 1 - dist / tail : 0;
        const brightness = 0.25 + lit * 1.2;
        el.style.opacity = String(0.3 + lit * 0.7);
        el.style.filter = `brightness(${brightness.toFixed(2)})`;
        el.style.transform = `scale(${(0.85 + lit * 0.35).toFixed(2)})`;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, count, reducedMotion]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {points.map((p, i) => {
        const isAmber = i % 2 === 0;
        const base = isAmber
          ? 'radial-gradient(circle at 35% 30%,#fff6cf,#fbbf24 55%,#92400e 100%)'
          : 'radial-gradient(circle at 35% 30%,#ffe3d6,#fb923c 55%,#9a3412 100%)';
        return (
          <div
            key={i}
            ref={(el) => {
              bulbRefs.current[i] = el;
            }}
            className={
              'absolute rounded-full -translate-x-1/2 -translate-y-1/2 ' +
              (mode === 'idle' && !reducedMotion ? 'animate-slot-bulb-breathe' : '') +
              (mode === 'win' && !reducedMotion ? ' animate-slot-bulb-flash' : '')
            }
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: 8,
              height: 8,
              background: base,
              boxShadow: `0 0 6px 1px ${isAmber ? 'rgba(251,191,36,0.8)' : 'rgba(251,146,60,0.8)'}`,
              animationDelay: mode === 'win' ? `${(i % 5) * 30}ms` : `${(i / points.length) * 2.6}s`,
              opacity: mode === 'spin' ? 0.3 : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
