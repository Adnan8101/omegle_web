'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

type Shape = 'dot' | 'spark' | 'confetti';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  shape: Shape;
  rot: number;
  rotSpeed: number;
  w: number;
  h: number;
}

interface ParticleFieldProps {
  /** `burst` fires `count` particles once and stops; `ambient` keeps a steady
   *  drifting population alive; `confetti` drops rotating paper strips from
   *  the top of the canvas once, for the reveal beat. */
  mode: 'burst' | 'ambient' | 'confetti';
  count?: number;
  colors?: string[];
  /** Vertical origin for burst particles, as a fraction of the canvas height (0 = top, 1 = bottom). */
  originY?: number;
  /** Fraction of burst particles drawn as 4-point sparkle stars instead of plain dots. */
  sparkRatio?: number;
  className?: string;
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.rot) ctx.rotate(p.rot);
  ctx.fillStyle = p.color;

  if (p.shape === 'confetti') {
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  } else if (p.shape === 'spark') {
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 2.2);
    ctx.lineTo(s * 0.5, -s * 0.5);
    ctx.lineTo(s * 2.2, 0);
    ctx.lineTo(s * 0.5, s * 0.5);
    ctx.lineTo(0, s * 2.2);
    ctx.lineTo(-s * 0.5, s * 0.5);
    ctx.lineTo(-s * 2.2, 0);
    ctx.lineTo(-s * 0.5, -s * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * A tiny self-contained canvas particle sim. No dependency, no asset — just
 * requestAnimationFrame physics that clean up after themselves. Three modes
 * cover every beat of the reveal: `burst` for dust-impact / explosion / spark
 * moments, `ambient` for slow floating motes, `confetti` for the reveal's
 * falling strips.
 */
export default function ParticleField({
  mode,
  count,
  colors,
  originY = 0.55,
  sparkRatio = 0,
  className,
}: ParticleFieldProps) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const palette = colors ?? ['#ffd77a', '#ffffff', '#7cc4ff'];
    const target = mode === 'burst' ? count ?? 60 : mode === 'confetti' ? count ?? 26 : count ?? 24;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let particles: Particle[] = [];

    const spawnOne = () => {
      if (mode === 'confetti') {
        particles.push({
          x: Math.random() * width,
          y: -20 - Math.random() * height * 0.5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.7 + Math.random() * 0.7,
          life: 0,
          maxLife: 2600 + Math.random() * 1400,
          size: 0,
          color: palette[Math.floor(Math.random() * palette.length)],
          gravity: 0.012,
          drag: 0.999,
          shape: 'confetti',
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.12,
          w: 5 + Math.random() * 4,
          h: 8 + Math.random() * 6,
        });
        return;
      }

      const originX = width / 2 + (Math.random() - 0.5) * (mode === 'burst' ? 30 : width);
      const oy = mode === 'burst' ? height * originY : Math.random() * height;
      const angle = Math.random() * Math.PI * 2;
      const speed = mode === 'burst' ? 1.6 + Math.random() * 4.6 : 0.12 + Math.random() * 0.3;
      const shape: Shape = mode === 'burst' && Math.random() < sparkRatio ? 'spark' : 'dot';
      particles.push({
        x: originX,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: mode === 'burst' ? Math.sin(angle) * speed - 2.3 : Math.sin(angle) * speed,
        life: 0,
        maxLife: mode === 'burst' ? 650 + Math.random() * 550 : 4200 + Math.random() * 3200,
        size: mode === 'burst' ? (shape === 'spark' ? 1.6 + Math.random() * 1.8 : 1.4 + Math.random() * 2.4) : 0.9 + Math.random() * 1.6,
        color: palette[Math.floor(Math.random() * palette.length)],
        gravity: mode === 'burst' ? 0.09 : 0,
        drag: mode === 'burst' ? 0.95 : 0.999,
        shape,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        w: 0,
        h: 0,
      });
    };

    for (let i = 0; i < target; i++) spawnOne();

    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      ctx.clearRect(0, 0, width, height);

      particles = particles.filter((p) => p.life < p.maxLife && p.y < height + 60);
      for (const p of particles) {
        p.life += dt;
        const step = dt / 16.67;
        p.vy += p.gravity * step;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.rot += p.rotSpeed * step;
        if (mode === 'ambient') {
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
        const lifeRatio = p.life / p.maxLife;
        let alpha: number;
        if (mode === 'burst') alpha = Math.max(0, 1 - lifeRatio);
        else if (mode === 'confetti') alpha = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.72 ? Math.max(0, 1 - (lifeRatio - 0.72) / 0.28) : 1;
        else alpha = Math.sin(Math.min(1, lifeRatio) * Math.PI);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        drawParticle(ctx, p);
      }
      ctx.globalAlpha = 1;

      if (mode === 'ambient' && particles.length < target) spawnOne();

      if (mode !== 'ambient' && particles.length === 0) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      particles = [];
    };
  }, [reduce, mode, count, originY, colors, sparkRatio]);

  if (reduce) return null;

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
