'use client';

import { ReactNode } from 'react';
import { METAL } from './theme';

interface SlotWindowProps {
  children: ReactNode;
  reducedMotion?: boolean;
}

/** The chrome-bezeled glass viewport that houses the reels. */
export default function SlotWindow({ children, reducedMotion = false }: SlotWindowProps) {
  return (
    <div
      className="relative rounded-3xl p-3 sm:p-4"
      style={{
        background: METAL.bezel,
        boxShadow: METAL.bezelEdge + ', 0 20px 60px -12px rgba(0,0,0,0.75), 0 0 48px -6px rgba(99,102,241,0.3)',
        maxWidth: '100%',
      }}
    >
      {/* brushed-metal texture */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-40" style={{ backgroundImage: METAL.brushed }} />

      <div className="relative">
        {children}

        {/* glass pane over the reels: moving highlight + static sheen */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.05) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.03) 100%)' }}
          />
          {!reducedMotion && (
            <div
              className="absolute -inset-1/2 animate-slot-glass-sweep"
              style={{
                background:
                  'linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0.06) 52%, transparent 60%)',
                width: '60%',
                height: '220%',
              }}
            />
          )}
          <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: 'inset 0 3px 10px rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    </div>
  );
}
