'use client';

import { ReactNode } from 'react';

interface CabinetShakeProps {
  /** Bump this counter to replay the shake (0/undefined = idle). */
  trigger: number;
  children: ReactNode;
}

/** Wraps the cabinet so a big win can rattle the whole machine. Remounts the
 * animation via `key` so the same trigger value can never get "stuck". */
export function CabinetShake({ trigger, children }: CabinetShakeProps) {
  return (
    <div key={trigger} className={trigger > 0 ? 'animate-slot-cabinet-shake' : ''}>
      {children}
    </div>
  );
}

interface ScreenFlashProps {
  trigger: number;
  big?: boolean;
}

/** Full-viewport flash used on wins — gold for a normal win, brighter/whiter for a jackpot. */
export function ScreenFlash({ trigger, big = false }: ScreenFlashProps) {
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      className="pointer-events-none fixed inset-0 z-[60] animate-slot-screen-flash"
      style={{
        background: big
          ? 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.9), rgba(250,204,21,0.5) 45%, transparent 75%)'
          : 'radial-gradient(circle at 50% 40%, rgba(250,204,21,0.55), transparent 70%)',
      }}
    />
  );
}
