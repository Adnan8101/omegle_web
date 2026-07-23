// Pure math for reel motion. No Three / React imports so it stays trivially testable.

export const TWO_PI = Math.PI * 2;

// ── Reel layout (world units) ──────────────────────────────────────────────
// Radius is FIXED so the cabinet geometry never depends on symbol count; face height is
// derived from the ring length instead (more symbols → shorter faces, denser drum).
export const REEL_RADIUS = 2.4;
export const FACE_W = 1.55; // horizontal size of one symbol face
export const REEL_GAP = 1.95; // centre-to-centre spacing between reels on X
export const MIN_FACES = 15; // minimum faces around a reel for a dense strip

// Visible reel band (half-height) and the glass window opening the cabinet must match.
export const BAND_HALF = 1.3;
export const WINDOW_W = REEL_GAP * 2 + FACE_W + 0.5;
export const WINDOW_H = BAND_HALF * 2 + 0.3;

/** X position of reel `i` (0..2) for a 3-reel machine. */
export function reelX(i: number): number {
  return (i - 1) * REEL_GAP;
}

/** Ring length that tiles the symbol set seamlessly and is at least MIN_FACES. */
export function ringLengthFor(symbolCount: number): number {
  if (symbolCount <= 0) return MIN_FACES;
  const reps = Math.max(1, Math.ceil(MIN_FACES / symbolCount));
  return symbolCount * reps;
}

/** Arc height of one face for the fixed radius and given ring length. */
export function faceHeightFor(ringLen: number): number {
  return (TWO_PI * REEL_RADIUS) / ringLen;
}

export interface ReelTiming {
  /** seconds of acceleration from rest to max speed */
  accel: number;
  /** peak angular velocity, radians / second */
  maxSpeed: number;
  /** seconds spent easing to a dead stop (and landing on target) */
  decel: number;
  /** minimum full revolutions performed during the deceleration phase */
  minSpins: number;
}

export const DEFAULT_TIMING: ReelTiming = {
  accel: 0.85,
  maxSpeed: 22,
  decel: 1.25,
  minSpins: 3,
};

export const REDUCED_TIMING: ReelTiming = {
  accel: 0.12,
  maxSpeed: 10,
  decel: 0.35,
  minSpins: 1,
};

/**
 * Staggered per-reel stop times (seconds from spin start). Preserves the feel of the
 * previous machine's [6.8s, 8.6s, 10.2s] cascade so total spin time stays >= 10s.
 */
export const STOP_TIMES = [6.8, 8.6, 10.2];
export const REDUCED_STOP_TIMES = [0.35, 0.55, 0.75];

/** easeInOutQuad for the acceleration ramp. */
export function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Overshoot-and-settle easing for the landing. Slight back-swing past the target then
 * settles — gives the reel a mechanical "clunk into place" feel. Returns 0..1 that
 * briefly exceeds 1 near ~0.7.
 */
export function easeOutBack(t: number, overshoot = 1.15): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

/**
 * Given the reel's current rotation (radians, monotonically increasing) and the ring index
 * we must land on, return the absolute rotation to settle at. `frontIndex = round(rot/step) mod ringLen`,
 * so a rotation of `k*step` with `k ≡ target (mod ringLen)` shows `target` on the payline.
 */
export function solveLandingRotation(
  currentRotation: number,
  targetIndex: number,
  ringLen: number,
  minSpins: number,
): number {
  const step = TWO_PI / ringLen;
  const minRotation = currentRotation + minSpins * TWO_PI;
  // smallest k with k*step >= minRotation and k ≡ targetIndex (mod ringLen)
  let k = Math.ceil(minRotation / step);
  const rem = ((k % ringLen) + ringLen) % ringLen;
  k += ((targetIndex - rem) % ringLen + ringLen) % ringLen;
  return k * step;
}

/** Symbol index currently centered on the payline for a given rotation. */
export function frontIndex(rotation: number, ringLen: number): number {
  const step = TWO_PI / ringLen;
  return ((Math.round(rotation / step) % ringLen) + ringLen) % ringLen;
}
