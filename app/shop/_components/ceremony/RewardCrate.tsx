'use client';

import { useEffect, useId, useRef } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import type { CeremonyPhase } from './types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface RewardCrateProps {
  phase: CeremonyPhase;
  accent?: string;
}

/** Crate geometry, in SVG viewBox units — a flat, front-facing chest, not a 3D box. */
const VB_W = 240;
const VB_H = 222;
const BODY = { x: 20, y: 92, w: 200, h: 110, r: 12 };
const LID = { x: 8, y: 34, w: 224, h: 60, r: 16 };
const CENTER_X = BODY.x + BODY.w / 2; // 120
const BAND_Y = BODY.y + BODY.h * 0.46;

const BODY_CORNERS = [
  { x: BODY.x, y: BODY.y, flip: 1 },
  { x: BODY.x + BODY.w, y: BODY.y, flip: -1 },
  { x: BODY.x, y: BODY.y + BODY.h, flip: 1 },
  { x: BODY.x + BODY.w, y: BODY.y + BODY.h, flip: -1 },
];

const RIVET_XS = [BODY.x + 22, BODY.x + 62, CENTER_X + 20, BODY.x + BODY.w - 62, BODY.x + BODY.w - 22];
const LID_RIVET_XS = [LID.x + 20, LID.x + 58, LID.x + 96, LID.x + LID.w - 96, LID.x + LID.w - 58, LID.x + LID.w - 20];

/** A small metal L-bracket + rivet, reused at every corner. */
function CornerBracket({ x, y, flip, gradientId }: { x: number; y: number; flip: number; gradientId: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <path d="M0 0 H22 V7 H7 V22 H0 Z" fill={`url(#${gradientId})`} stroke="rgba(0,0,0,0.35)" strokeWidth={0.6} />
      <circle cx={7} cy={7} r={3.1} fill="rgba(20,14,4,0.55)" />
      <circle cx={6.3} cy={6.3} r={1.6} fill="rgba(255,255,255,0.55)" />
    </g>
  );
}

function Rivet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.4} fill="rgba(20,14,4,0.55)" />
      <circle cx={x - 0.8} cy={y - 0.8} r={1.5} fill="rgba(255,255,255,0.55)" />
    </g>
  );
}

/**
 * A flat, front-facing 2D crate — no perspective, no fake 3D skew. Detail
 * comes from layered gradients, plank seams, riveted metal bands and corner
 * brackets, the way a loot-chest icon is drawn rather than modelled.
 *
 * It reads the phase directly: hidden in the sky during `focus`, a
 * gravity-driven fall with a light trail through `fall`, a squash + shockwave
 * landing at `impact`, an idle shake through `anticipate`, and the lid
 * popping clean off with the interior flooding with light at `opening` —
 * staying open and glowing through `emerge`/`reveal` while the item takes
 * over the scene above it.
 */
export default function RewardCrate({ phase, accent = '#ffd77a' }: RewardCrateProps) {
  const reduce = useReducedMotion();
  const squash = useAnimation();
  const prevPhase = useRef(phase);
  const uid = useId().replace(/[:]/g, '');

  const dropped = reduce || phase !== 'focus';
  const falling = !reduce && phase === 'fall';
  const shaking = !reduce && phase === 'anticipate';
  const open = phase === 'opening' || phase === 'emerge' || phase === 'reveal';
  const freshlyOpen = phase === 'opening';

  useEffect(() => {
    if (!reduce && prevPhase.current === 'fall' && phase === 'impact') {
      squash.set({ scaleX: 1.26, scaleY: 0.66 });
      squash.start({ scaleX: 1, scaleY: 1 }, { type: 'spring', stiffness: 300, damping: 9, mass: 0.8 });
    }
    prevPhase.current = phase;
  }, [phase, reduce, squash]);

  const woodGrad = `wood-${uid}`;
  const woodLidGrad = `woodLid-${uid}`;
  const metalGrad = `metal-${uid}`;
  const gemGrad = `gem-${uid}`;
  const interiorGrad = `interior-${uid}`;

  return (
    <div
      className="relative flex items-end justify-center"
      style={{ width: VB_W + 60, height: VB_H + 70 }}
    >
      {/* ── Falling light trail ─────────────────────────────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: 66,
          width: 30,
          height: 260,
          transformOrigin: 'bottom center',
          background: `linear-gradient(180deg, transparent 0%, ${accent}00 8%, ${accent}55 55%, ${accent}b0 100%)`,
          filter: 'blur(7px)',
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={falling ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.3 }}
        transition={{ duration: falling ? 0.5 : 0.25, ease: EASE }}
      />

      {/* ── Ground contact shadow ───────────────────────────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[54px] rounded-[50%] blur-md"
        style={{ width: BODY.w * 0.92, height: 20, background: 'rgba(0,0,0,0.6)' }}
        animate={{ opacity: dropped ? 1 : 0, scaleX: dropped ? 1 : 0.3 }}
        transition={{ duration: 0.35, ease: EASE }}
      />

      {/* ── Impact shockwave ring ───────────────────────────────────── */}
      {phase === 'impact' && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-[58px] rounded-full border-2"
          style={{ width: 40, height: 40, borderColor: `${accent}aa` }}
          initial={{ opacity: 0.9, scale: 0.3 }}
          animate={{ opacity: 0, scale: 5.5 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      )}

      {/* ── Bloom + god rays behind the crate once open ────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-90px] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}66 0%, ${accent}26 38%, transparent 72%)` }}
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: open ? 1 : 0, scale: open ? 1.3 : 0.55 }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-150px] rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${accent}42 8deg, transparent 18deg, transparent 60deg, ${accent}42 68deg, transparent 78deg, transparent 120deg, ${accent}42 128deg, transparent 138deg, transparent 180deg, ${accent}42 188deg, transparent 198deg, transparent 240deg, ${accent}42 248deg, transparent 258deg, transparent 300deg, ${accent}42 308deg, transparent 318deg)`,
        }}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: open ? 0.9 : 0, rotate: open ? 90 : 0 }}
        transition={{
          opacity: { duration: 0.5, ease: EASE },
          rotate: { duration: 7, ease: 'linear', repeat: open ? Infinity : 0 },
        }}
      />

      {/* ── Screen-flash pop at the exact opening beat ─────────────── */}
      {freshlyOpen && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-20"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{ background: `radial-gradient(circle at 50% 42%, #fff 0%, ${accent}66 32%, transparent 70%)` }}
        />
      )}

      {/* ── The fall ────────────────────────────────────────────────── */}
      <motion.div
        className="relative"
        initial={reduce ? { y: 0, opacity: 1 } : { y: -520, opacity: 0 }}
        animate={
          dropped
            ? shaking
              ? { y: 0, opacity: 1, x: [0, -3, 3, -2, 2, 0], rotate: [0, -1.1, 1.1, -0.7, 0.7, 0] }
              : { y: 0, opacity: 1, x: 0, rotate: 0 }
            : { y: -520, opacity: 0 }
        }
        transition={
          shaking
            ? { duration: 0.55, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }
            : phase === 'focus'
              ? { duration: 0.3 }
              : { type: 'tween', duration: 0.62, ease: [0.5, 0, 1, 1] }
        }
      >
        <motion.div animate={squash} style={{ transformOrigin: 'bottom center' }}>
          <svg
            width={VB_W}
            height={VB_H}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={woodGrad} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3a2c22" />
                <stop offset="45%" stopColor="#241a14" />
                <stop offset="100%" stopColor="#120d0a" />
              </linearGradient>
              <linearGradient id={woodLidGrad} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#463527" />
                <stop offset="50%" stopColor="#2b2018" />
                <stop offset="100%" stopColor="#150f0b" />
              </linearGradient>
              <linearGradient id={metalGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f2e6c8" />
                <stop offset="45%" stopColor={accent} />
                <stop offset="100%" stopColor="#8a6a1e" />
              </linearGradient>
              <radialGradient id={gemGrad} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fff8e6" />
                <stop offset="55%" stopColor={accent} />
                <stop offset="100%" stopColor="#a5760f" />
              </radialGradient>
              <radialGradient id={interiorGrad} cx="50%" cy="15%" r="90%">
                <stop offset="0%" stopColor="#fffbe9" />
                <stop offset="45%" stopColor={accent} />
                <stop offset="100%" stopColor="#3a2a05" />
              </radialGradient>
            </defs>

            {/* ══ Interior glow — revealed once the lid is gone ═══════ */}
            <motion.rect
              x={BODY.x + 6}
              y={BODY.y + 4}
              width={BODY.w - 12}
              height={38}
              rx={8}
              fill={`url(#${interiorGrad})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: open ? (freshlyOpen ? 1 : 0.72) : 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            />

            {/* ══ Body ═════════════════════════════════════════════════ */}
            <rect
              x={BODY.x}
              y={BODY.y}
              width={BODY.w}
              height={BODY.h}
              rx={BODY.r}
              fill={`url(#${woodGrad})`}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1.5}
            />
            {/* plank seams */}
            {[0.34, 0.68].map((f) => (
              <line
                key={f}
                x1={BODY.x + 6}
                x2={BODY.x + BODY.w - 6}
                y1={BODY.y + BODY.h * f}
                y2={BODY.y + BODY.h * f}
                stroke="rgba(0,0,0,0.45)"
                strokeWidth={1.4}
              />
            ))}
            {/* faint grain */}
            {[0.18, 0.5, 0.82].map((f) => (
              <line
                key={f}
                x1={BODY.x + BODY.w * f}
                x2={BODY.x + BODY.w * f}
                y1={BODY.y + 4}
                y2={BODY.y + BODY.h - 4}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            ))}
            {/* top highlight */}
            <rect x={BODY.x + 4} y={BODY.y + 2} width={BODY.w - 8} height={5} rx={2.5} fill="rgba(255,255,255,0.06)" />

            {/* vertical metal strap (behind horizontal) */}
            <rect x={CENTER_X - 8} y={BODY.y} width={16} height={BODY.h} fill={`url(#${metalGrad})`} opacity={0.96} />
            {/* horizontal metal strap */}
            <rect x={BODY.x} y={BAND_Y - 8} width={BODY.w} height={16} fill={`url(#${metalGrad})`} />
            <rect x={BODY.x} y={BAND_Y - 8} width={BODY.w} height={3} fill="rgba(255,255,255,0.35)" />
            <rect x={BODY.x} y={BAND_Y + 6} width={BODY.w} height={2} fill="rgba(0,0,0,0.35)" />
            {RIVET_XS.map((x) => (
              <Rivet key={x} x={x} y={BAND_Y} />
            ))}

            {/* gem / emblem at the strap intersection */}
            <motion.g
              style={{ transformOrigin: `${CENTER_X}px ${BAND_Y}px` }}
              animate={{
                scale: shaking ? [1, 1.14, 1] : open ? 1.35 : 1,
                opacity: phase === 'emerge' || phase === 'reveal' ? 0.35 : 1,
              }}
              transition={{ duration: shaking ? 0.9 : 0.4, repeat: shaking ? Infinity : 0, ease: 'easeInOut' }}
            >
              <circle cx={CENTER_X} cy={BAND_Y} r={13} fill={`${accent}33`} />
              <rect
                x={CENTER_X - 8}
                y={BAND_Y - 8}
                width={16}
                height={16}
                rx={3}
                fill={`url(#${gemGrad})`}
                stroke="#3a2a05"
                strokeWidth={0.8}
                transform={`rotate(45 ${CENTER_X} ${BAND_Y})`}
              />
            </motion.g>

            {/* body corner brackets */}
            {BODY_CORNERS.map((c, i) => (
              <CornerBracket key={i} x={c.x} y={c.y} flip={c.flip} gradientId={metalGrad} />
            ))}

            {/* ══ Lid — pops straight off, no hinge-rotate needed ═══════ */}
            <motion.g
              initial={{ y: 0, opacity: 1 }}
              animate={
                reduce
                  ? { y: 0, opacity: 1 }
                  : open
                    ? { y: -196, x: [0, 5, -3, 0], opacity: [1, 1, 1, 0] }
                    : { y: 0, x: 0, opacity: 1 }
              }
              transition={
                open ? { duration: 0.7, ease: EASE, times: [0, 0.3, 0.7, 1] } : { duration: 0.4, ease: EASE }
              }
            >
              <rect
                x={LID.x}
                y={LID.y}
                width={LID.w}
                height={LID.h}
                rx={LID.r}
                fill={`url(#${woodLidGrad})`}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={1.5}
              />
              <rect x={LID.x + 4} y={LID.y + 2} width={LID.w - 8} height={5} rx={2.5} fill="rgba(255,255,255,0.07)" />
              {/* lid corner brackets */}
              {[
                { x: LID.x, y: LID.y, flip: 1 },
                { x: LID.x + LID.w, y: LID.y, flip: -1 },
              ].map((c, i) => (
                <CornerBracket key={i} x={c.x} y={c.y} flip={c.flip} gradientId={metalGrad} />
              ))}
              {/* front hinge-seam rivets */}
              <rect x={LID.x + 6} y={LID.y + LID.h - 10} width={LID.w - 12} height={10} fill={`url(#${metalGrad})`} opacity={0.9} />
              {LID_RIVET_XS.map((x) => (
                <Rivet key={x} x={x} y={LID.y + LID.h - 5} />
              ))}
              {/* latch / clasp */}
              <motion.g
                style={{ transformOrigin: `${CENTER_X}px ${LID.y + LID.h}px` }}
                animate={{ opacity: freshlyOpen || open ? [1, 1, 0] : 1, scale: freshlyOpen ? [1, 1.15, 0.6] : 1 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <rect x={CENTER_X - 11} y={LID.y + LID.h - 6} width={22} height={14} rx={4} fill={`url(#${metalGrad})`} stroke="#3a2a05" strokeWidth={0.8} />
                <circle cx={CENTER_X} cy={LID.y + LID.h + 1} r={3.2} fill="#241a08" />
              </motion.g>
            </motion.g>
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
