'use client';

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

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeOutQuintic(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

function physicsProgress(t: number): number {
  const P1_END = 0.15;
  const P2_END = 0.75;

  if (t <= P1_END) {
    
    const localT = t / P1_END; 
    const phaseProgress = easeInCubic(localT); 
    
    
    return phaseProgress * 0.20;
  } else if (t <= P2_END) {
    
    const localT = (t - P1_END) / (P2_END - P1_END); 
    
    return 0.20 + localT * 0.60;
  } else {
    
    const localT = (t - P2_END) / (1 - P2_END); 
    const phaseProgress = easeOutQuintic(localT);
    
    return 0.80 + phaseProgress * 0.20;
  }
}

function physicsVelocity(t: number): number {
  const P1_END = 0.15;
  const P2_END = 0.75;
  const eps = 0.001;
  if (t < eps) return 0;
  if (t > 1 - eps) return 0;
  return (physicsProgress(Math.min(1, t + eps)) - physicsProgress(Math.max(0, t - eps))) / (2 * eps);
}

const MIN_DURATION_MS = 10_000; 
const REDUCED_DURATION_MS = 450;
const MIN_FULL_ROTATIONS = 8; 

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
  const rotationRef = useRef(0); 
  const animatingRef = useRef(false);

  const n = Math.max(1, segments.length);
  const segDeg = 360 / n;

  
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

      
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.stroke();

      
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
        
        const jitter = (Math.random() - 0.5) * segDeg * 0.45;
        const targetMod = (((-index * segDeg + jitter) % 360) + 360) % 360;
        const startMod = ((startR % 360) + 360) % 360;
        const segDelta = (((targetMod - startMod) % 360) + 360) % 360;
        
        const totalDeg = MIN_FULL_ROTATIONS * 360 + segDelta;
        const finalR = startR + totalDeg;

        const duration = reducedMotion
          ? REDUCED_DURATION_MS
          : MIN_DURATION_MS + Math.random() * 1000; 

        let lastTickIdx = Math.floor(startR / segDeg);
        let lastR = startR;
        const t0 = performance.now();

        const frame = (now: number) => {
          const rawT = Math.min(1, (now - t0) / duration);
          const progress = reducedMotion ? rawT : physicsProgress(rawT);
          const R = startR + totalDeg * progress;
          rotationRef.current = R;
          canvas.style.transform = `rotate(${R}deg)`;

          
          if (!reducedMotion) {
            const vel = physicsVelocity(rawT); 
            
            const normVel = vel / 1.7;
            const blur = Math.min(10, normVel * 12);
            canvas.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
          }

          
          const tickIdx = Math.floor(R / segDeg);
          if (tickIdx !== lastTickIdx) {
            lastTickIdx = tickIdx;
            onTick?.();
          }
          lastR = R;

          if (rawT < 1) {
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
      {}
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

      {}
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

      {}
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
