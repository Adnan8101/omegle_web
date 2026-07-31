'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { CeremonyPhase } from './types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface CrateStageProps {
  phase: CeremonyPhase;
  accent?: string;
}

interface Star {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

/**
 * The room the crate falls into: a night sky above a lit stage floor. Built
 * once and reused for every beat — only the horizon's glow and the floor's
 * light pool react to the phase, so the crate always reads as landing
 * *somewhere* rather than floating on plain black.
 */
export default function CrateStage({ phase, accent = '#ffd77a' }: CrateStageProps) {
  const reduce = useReducedMotion();

  // Fixed once per mount — this stage only exists for the lifetime of the modal.
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 62,
        size: Math.random() < 0.15 ? 2.4 : 1.2,
        delay: Math.random() * 4,
        duration: 2.6 + Math.random() * 3.2,
      })),
    []
  );

  const grounded = phase !== 'focus' && phase !== 'fall';
  const lit = phase === 'opening' || phase === 'emerge' || phase === 'reveal';

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* ── Sky ─────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #05050a 0%, #0a0a14 38%, #100e18 64%, #0c0a10 100%)',
        }}
      />

      {stars.map((star, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size }}
          animate={reduce ? { opacity: 0.5 } : { opacity: [0.15, 0.8, 0.15] }}
          transition={reduce ? undefined : { duration: star.duration, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* ── Horizon glow — brightens once the crate is down and opening ── */}
      <motion.div
        className="absolute inset-x-0"
        style={{
          top: '58%',
          height: 220,
          background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${accent}55 0%, ${accent}18 40%, transparent 75%)`,
          filter: 'blur(40px)',
        }}
        animate={{ opacity: lit ? 1 : grounded ? 0.55 : 0.22 }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-0"
        style={{ top: '61%', height: 2, background: `linear-gradient(90deg, transparent, ${accent}90, transparent)` }}
        animate={{ opacity: grounded ? 0.8 : 0.15 }}
        transition={{ duration: 0.6, ease: EASE }}
      />

      {/* ── Ground plane ────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: '61%',
          background: 'linear-gradient(180deg, #0d0c14 0%, #08070c 40%, #030304 100%)',
        }}
      >
        {/* faint perspective floor lines for depth, no full 3D */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 34px)',
          }}
        />

        {/* the pool of light the crate stands in */}
        <motion.div
          className="absolute left-1/2 top-[18%] -translate-x-1/2 rounded-[50%]"
          style={{
            width: 620,
            height: 130,
            background: `radial-gradient(ellipse at center, ${accent}40 0%, ${accent}16 45%, transparent 75%)`,
            filter: 'blur(18px)',
          }}
          animate={{ opacity: grounded ? (lit ? 1 : 0.7) : 0, scale: grounded ? 1 : 0.6 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>

      {/* ── Vignette — keeps the eye on the stage centre ─────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 62%, transparent 40%, rgba(0,0,0,0.62) 100%)' }}
      />
    </div>
  );
}
