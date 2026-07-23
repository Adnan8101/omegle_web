

export interface SegmentLike {
  weight: number;
}

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
  return weights.length - 1; 
}

export function computeProbabilities(weights: number[]): number[] {
  const safe = weights.map((w) => (Number.isFinite(w) && w > 0 ? Math.floor(w) : 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    
    return weights.map(() => 1 / (weights.length || 1));
  }
  return safe.map((w) => w / total);
}
