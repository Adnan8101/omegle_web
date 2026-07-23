// Spin-the-Wheel outcome engine. This is the SINGLE SOURCE OF TRUTH for who
// wins — it runs server-side only. The frontend never sees segment weights and
// never decides the result; it merely animates the wheel to the index this
// function returns. This is what prevents client-side manipulation.

export interface SegmentLike {
  weight: number;
}

/**
 * Pick a winning segment index using cumulative-weight weighted random.
 * Segments MUST be passed ordered by `position` so the returned index maps
 * directly to the visual slot.
 *
 * - Negative/NaN weights are clamped to 0.
 * - A weight of 0 means the segment can never be hit.
 * - If every weight is 0 (or the list is degenerate) we fall back to a uniform
 *   pick so a spin can never hang.
 */
export function pickWinningIndex(segments: SegmentLike[]): number {
  if (!segments || segments.length === 0) return 0;

  const weights = segments.map((s) => {
    const w = Math.floor(Number(s.weight));
    return Number.isFinite(w) && w > 0 ? w : 0;
  });
  const total = weights.reduce((a, b) => a + b, 0);

  if (total <= 0) {
    return Math.floor(Math.random() * segments.length);
  }

  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1; // floating-point safety net
}

/** Compute each segment's win probability (0..1) from its weight, for display. */
export function computeProbabilities(weights: number[]): number[] {
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? Math.floor(w) : 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    // even split when no weights are set
    return weights.map(() => 1 / (weights.length || 1));
  }
  return safe.map((w) => w / total);
}
