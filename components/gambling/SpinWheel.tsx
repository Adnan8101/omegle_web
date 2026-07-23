'use client';
// Premium canvas Spin-the-Wheel. The wheel face is drawn ONCE to a canvas and
// then rotated via a GPU `transform: rotate()` driven by requestAnimationFrame
// (60fps, no per-frame redraw). The winning index is decided by the backend;
// the parent calls the imperative `spinTo(index)` and the wheel eases to land
// exactly on that segment under the fixed top pointer.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface SpinWheelSegment {
  label: string;
  reward: number;
  color: string;
  icon?: string | null;
}

export interface SpinWheelHandle {
  /** Animate the wheel so `index` lands under the top pointer. Resolves when done. */
  spinTo: (index: number) => Promise<void>;
}

interface SpinWheelProps {
  segments: SpinWheelSegment[];
  size?: number;
  currencyEmoji?: string;
  canSpin?: boolean;
  spinning?: boolean;
  onSpinClick?: () => void;
  onTick?: () => void;
  reducedMotion?: boolean;
  centerLabel?: string;
}

// Relative luminance → pick readable text color for a segment.
function textColorFor(hex: string): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0b0b0f' : '#ffffff';
}

function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp((parseInt(full.slice(0, 2), 16) || 0) + amt);
  const g = clamp((parseInt(full.slice(2, 4), 16) || 0) + amt);
  const b = clamp((parseInt(full.slice(4, 6), 16) || 0) + amt);
  return `rgb(${r},${g},${b})`;
}

const SpinWheel = forwardRef<SpinWheelHandle, SpinWheelProps>(function SpinWheel(
  {
    segments,
    size = 360,
    currencyEmoji = '',
    canSpin = false,
    spinning = false,
    onSpinClick,
    onTick,
    reducedMotion = false,
    centerLabel = 'SPIN',
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0); // current rotation in degrees
  const animatingRef = useRef(false);

  const n = Math.max(1, segments.length);
  const segDeg = 360 / n;

  // Draw the wheel face once (and whenever segments/size change).
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - Math.max(6, size * 0.03);
    const segRad = (Math.PI * 2) / n;
    const TOP = -Math.PI / 2;

    // Segments
    for (let i = 0; i < n; i++) {
      const seg = segments[i];
      const start = TOP + (i - 0.5) * segRad;
      const end = TOP + (i + 0.5) * segRad;
      const mid = TOP + i * segRad;

      const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
      grad.addColorStop(0, shade(seg.color, 34));
      grad.addColorStop(1, shade(seg.color, -22));

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Separator
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.stroke();

      // Labels (radial)
      const txt = textColorFor(seg.color);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = txt;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 2;
      ctx.font = `800 ${Math.round(size * 0.052)}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      ctx.fillText(`${seg.reward}`, radius * 0.9, seg.label ? -size * 0.018 : 0);
      if (seg.label) {
        ctx.font = `600 ${Math.round(size * 0.03)}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
        ctx.globalAlpha = 0.9;
        ctx.fillText(seg.label.slice(0, 14), radius * 0.9, size * 0.026);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // Outer metallic rim
    ctx.shadowColor = 'transparent';
    const rim = ctx.createLinearGradient(0, 0, size, size);
    rim.addColorStop(0, '#e9d8a6');
    rim.addColorStop(0.25, '#b08968');
    rim.addColorStop(0.5, '#f4e3b2');
    rim.addColorStop(0.75, '#9c6644');
    rim.addColorStop(1, '#e9d8a6');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + size * 0.012, 0, Math.PI * 2);
    ctx.lineWidth = size * 0.03;
    ctx.strokeStyle = rim;
    ctx.stroke();

    // Studs around the rim
    const studs = Math.min(24, n * 2);
    for (let s = 0; s < studs; s++) {
      const a = (s / studs) * Math.PI * 2;
      const sx = cx + Math.cos(a) * (radius + size * 0.012);
      const sy = cy + Math.sin(a) * (radius + size * 0.012);
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.008, 0, Math.PI * 2);
      ctx.fillStyle = '#fff7e6';
      ctx.fill();
    }
  }, [segments, size, n]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Keep the wheel visually at its current rotation after a redraw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.transform = `rotate(${rotationRef.current}deg)`;
  }, [draw]);

  useImperativeHandle(ref, () => ({
    spinTo: (index: number) =>
      new Promise<void>((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas || animatingRef.current) {
          resolve();
          return;
        }
        animatingRef.current = true;

        const startR = rotationRef.current;
        const spins = 5 + Math.floor(Math.random() * 3); // 5..7 full turns
        const jitter = (Math.random() - 0.5) * segDeg * 0.55;
        const targetMod = (((-index * segDeg + jitter) % 360) + 360) % 360;
        const startMod = ((startR % 360) + 360) % 360;
        const delta = (((targetMod - startMod) % 360) + 360) % 360;
        const finalR = startR + spins * 360 + delta;

        const duration = reducedMotion ? 450 : 4200 + Math.random() * 1600;
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        let lastTickIdx = Math.floor(startR / segDeg);
        let lastR = startR;
        const t0 = performance.now();

        const frame = (now: number) => {
          const p = Math.min(1, (now - t0) / duration);
          const R = startR + (finalR - startR) * easeOutCubic(p);
          rotationRef.current = R;
          canvas.style.transform = `rotate(${R}deg)`;

          // Motion blur proportional to angular velocity.
          if (!reducedMotion) {
            const v = Math.abs(R - lastR);
            const blur = Math.min(7, v * 0.55);
            canvas.style.filter = blur > 0.5 ? `blur(${blur.toFixed(1)}px)` : 'none';
          }
          lastR = R;

          // Tick as each segment boundary passes the pointer.
          const tickIdx = Math.floor(R / segDeg);
          if (tickIdx !== lastTickIdx) {
            lastTickIdx = tickIdx;
            onTick?.();
          }

          if (p < 1) {
            requestAnimationFrame(frame);
          } else {
            canvas.style.filter = 'none';
            animatingRef.current = false;
            resolve();
          }
        };
        requestAnimationFrame(frame);
      }),
  }));

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size }}
      aria-label="Prize wheel"
    >
      {/* Fixed top pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        style={{ top: -size * 0.02 }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size * 0.045}px solid transparent`,
            borderRight: `${size * 0.045}px solid transparent`,
            borderTop: `${size * 0.09}px solid #fbbf24`,
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
          }}
        />
      </div>

      {/* Rotating wheel face */}
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          willChange: 'transform',
          transformOrigin: 'center center',
          borderRadius: '50%',
          boxShadow: '0 20px 60px -12px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.35)',
        }}
      />

      {/* Center hub / spin button (does not rotate) */}
      <button
        type="button"
        onClick={canSpin && !spinning ? onSpinClick : undefined}
        disabled={!canSpin || spinning}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full flex items-center justify-center font-extrabold tracking-wide transition-transform ${
          canSpin && !spinning ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
        }`}
        style={{
          width: size * 0.24,
          height: size * 0.24,
          background:
            'radial-gradient(circle at 35% 30%, #fef3c7, #f59e0b 55%, #b45309 100%)',
          color: '#3b1d00',
          boxShadow:
            '0 6px 18px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.35)',
          fontSize: size * 0.05,
          border: `${size * 0.01}px solid #fff7e6`,
        }}
      >
        <span className="drop-shadow-sm">{spinning ? '…' : centerLabel}</span>
      </button>
    </div>
  );
});

export default SpinWheel;
