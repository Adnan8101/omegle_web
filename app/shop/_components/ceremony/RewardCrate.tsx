'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { CeremonyPhase } from './types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface RewardCrateProps {
  phase: CeremonyPhase;
  accent?: string;
}

/**
 * A stylised crate built entirely from gradients and motion — no image asset.
 * It reads the phase directly: off-screen during `focus`, a fast spring-drop
 * into `anticipate`'s gentle shake + seam glow, then the lid lifts and fades
 * for `opening`/`reveal` while a light burst blooms behind it.
 */
export default function RewardCrate({ phase, accent = '#ffd77a' }: RewardCrateProps) {
  const reduce = useReducedMotion();
  const dropped = reduce || phase !== 'focus';
  const shaking = !reduce && phase === 'anticipate';
  const opening = phase === 'opening' || phase === 'reveal';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220, perspective: 900 }}>
      {/* bloom behind the crate */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-70px] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}59 0%, ${accent}22 38%, transparent 72%)` }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: opening ? 1 : 0, scale: opening ? 1.2 : 0.6 }}
        transition={{ duration: 0.7, ease: EASE }}
      />

      {/* rotating light rays */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-110px] rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${accent}2e 10deg, transparent 20deg, transparent 70deg, ${accent}2e 80deg, transparent 90deg, transparent 140deg, ${accent}2e 150deg, transparent 160deg, transparent 210deg, ${accent}2e 220deg, transparent 230deg, transparent 280deg, ${accent}2e 290deg, transparent 300deg)`,
        }}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: opening ? 0.85 : 0, rotate: opening ? 60 : 0 }}
        transition={{ opacity: { duration: 0.6, ease: EASE }, rotate: { duration: 5, ease: 'linear', repeat: opening ? Infinity : 0 } }}
      />

      {/* drop + shake */}
      <motion.div
        className="relative"
        initial={reduce ? { y: 0, opacity: 1 } : { y: -300, opacity: 0 }}
        animate={
          dropped
            ? shaking
              ? { y: 0, opacity: 1, x: [0, -3, 3, -2, 2, 0], rotate: [0, -1.1, 1.1, -0.7, 0.7, 0] }
              : { y: 0, opacity: 1, x: 0, rotate: 0 }
            : { y: -300, opacity: 0 }
        }
        transition={
          shaking
            ? { duration: 0.55, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }
            : { type: 'spring', stiffness: 260, damping: 15, mass: 0.9 }
        }
      >
        {/* body */}
        <div
          className="relative h-[142px] w-[184px] overflow-hidden rounded-b-[16px] rounded-t-[6px]"
          style={{
            background: 'linear-gradient(160deg, #1c1c26 0%, #0c0c11 58%, #050506 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 34px 60px -22px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="absolute inset-x-0 top-1/2 h-[2px]"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}99, transparent)` }}
          />
          <div
            className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2"
            style={{ background: `linear-gradient(180deg, transparent, ${accent}55, transparent)` }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-x-3 top-0 h-[6px] rounded-full blur-[3px]"
            style={{ background: accent }}
            animate={{ opacity: shaking ? [0.15, 0.85, 0.15] : 0 }}
            transition={{ duration: 1.05, repeat: shaking ? Infinity : 0, ease: 'easeInOut' }}
          />
        </div>

        {/* lid */}
        <motion.div
          className="absolute left-0 top-0 h-[60px] w-[184px] origin-bottom rounded-t-[13px]"
          style={{
            background: 'linear-gradient(160deg, #272733 0%, #121218 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderBottom: 'none',
            boxShadow: `0 -6px 20px -8px ${accent}55`,
          }}
          animate={
            reduce
              ? { rotateX: 0, y: 0, opacity: 1 }
              : opening
                ? { rotateX: -108, y: -16, opacity: phase === 'reveal' ? 0.25 : 1 }
                : { rotateX: 0, y: 0, opacity: 1 }
          }
          transition={{ duration: 0.65, ease: EASE }}
        />
      </motion.div>
    </div>
  );
}
