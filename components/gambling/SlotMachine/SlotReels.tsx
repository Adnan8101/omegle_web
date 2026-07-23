'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';
import SlotReel, { SlotReelHandle } from './SlotReel';
import { GLASS } from './theme';

export interface SlotReelsHandle {
  spinTo: (reels: PublicSymbol[]) => Promise<void>;
}

interface SlotReelsProps {
  symbols: PublicSymbol[];
  tileH: number;
  reelCount?: number;
  reducedMotion?: boolean;
  onReelStop?: () => void;
}

// Each reel finishes later than the last — never together — with the final
// reel landing at 10.2s so the whole reveal clears the 10-second minimum.
const DURATIONS = [6800, 8600, 10200];

const SlotReels = forwardRef<SlotReelsHandle, SlotReelsProps>(function SlotReels(
  { symbols, tileH, reelCount = 3, reducedMotion = false, onReelStop },
  ref,
) {
  const pool = useMemo<PublicSymbol[]>(
    () => (symbols.length > 0 ? symbols : [{ label: '?', icon: '🎰' }]),
    [symbols],
  );
  const reelRefs = useRef<(SlotReelHandle | null)[]>([]);

  useImperativeHandle(
    ref,
    () => ({
      spinTo: async (reels: PublicSymbol[]) => {
        const targets = reels.slice(0, reelCount);
        while (targets.length < reelCount) {
          targets.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        await Promise.all(
          targets.map((t, i) => reelRefs.current[i]?.spinTo(t, DURATIONS[i] ?? DURATIONS[DURATIONS.length - 1])),
        );
      },
    }),
    [reelCount, pool],
  );

  const viewportH = tileH * 3;

  return (
    <div
      className="relative flex gap-2 sm:gap-3 rounded-2xl p-2 sm:p-3 overflow-hidden"
      style={{ background: GLASS.panel, boxShadow: GLASS.innerShadow }}
    >
      {Array.from({ length: reelCount }).map((_, i) => (
        <div key={i} className="relative flex items-center">
          <SlotReel
            ref={(el) => {
              reelRefs.current[i] = el;
            }}
            pool={pool}
            tileH={tileH}
            reducedMotion={reducedMotion}
            onStop={onReelStop}
          />
          {i < reelCount - 1 && (
            <div
              className="absolute -right-1.5 sm:-right-2 top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(180deg,transparent,rgba(255,255,255,0.12) 15%,rgba(255,255,255,0.12) 85%,transparent)' }}
            />
          )}
        </div>
      ))}

      {/* payline */}
      <div
        className="pointer-events-none absolute left-2 right-2 sm:left-3 sm:right-3 rounded-lg"
        style={{
          top: `calc(50% - ${tileH / 2}px)`,
          height: tileH,
          boxShadow: '0 0 0 2px rgba(250,204,21,0.55), 0 0 26px rgba(250,204,21,0.3)',
          background: 'linear-gradient(90deg,rgba(250,204,21,0.05),rgba(239,68,68,0.05))',
        }}
      />
      <div
        className="pointer-events-none absolute left-2 right-2 sm:left-3 sm:right-3"
        style={{ top: '50%', height: 1, background: 'rgba(250,204,21,0.5)' }}
      />
    </div>
  );
});

export default SlotReels;
