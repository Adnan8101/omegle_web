'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

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
}

interface ParticleFieldProps {
  /** `burst` fires `count` particles once and stops; `ambient` keeps a steady drifting population alive. */
  mode: 'burst' | 'ambient';
  count?: number;
  colors?: string[];
  /** Vertical origin for burst particles, as a fraction of the canvas height (0 = top, 1 = bottom). */
  originY?: number;
  className?: string;
}

/**
 * A tiny self-contained canvas particle sim. No dependency, no asset — just
 * requestAnimationFrame physics that clean up after themselves. Two modes
 * cover every beat of the reveal: `burst` for the dust-impact / explosion
 * moments, `ambient` for the slow floating motes behind the crate.
 */
export default function ParticleField({ mode, count, colors, originY = 0.55, className }: ParticleFieldProps) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const palette = colors ?? ['#ffd77a', '#ffffff', '#7cc4ff'];
    const target = mode === 'burst' ? count ?? 60 : count ?? 24;

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
      const originX = width / 2 + (Math.random() - 0.5) * (mode === 'burst' ? 26 : width);
      const oy = mode === 'burst' ? height * originY : Math.random() * height;
      const angle = Math.random() * Math.PI * 2;
      const speed = mode === 'burst' ? 1.6 + Math.random() * 4.4 : 0.12 + Math.random() * 0.3;
      particles.push({
        x: originX,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: mode === 'burst' ? Math.sin(angle) * speed - 2.2 : Math.sin(angle) * speed,
        life: 0,
        maxLife: mode === 'burst' ? 650 + Math.random() * 500 : 4200 + Math.random() * 3200,
        size: mode === 'burst' ? 1.4 + Math.random() * 2.4 : 0.9 + Math.random() * 1.6,
        color: palette[Math.floor(Math.random() * palette.length)],
        gravity: mode === 'burst' ? 0.09 : 0,
        drag: mode === 'burst' ? 0.95 : 0.999,
      });
    };

    if (mode === 'burst') {
      for (let i = 0; i < target; i++) spawnOne();
    } else {
      for (let i = 0; i < target; i++) spawnOne();
    }

    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      ctx.clearRect(0, 0, width, height);

      particles = particles.filter((p) => p.life < p.maxLife);
      for (const p of particles) {
        p.life += dt;
        const step = dt / 16.67;
        p.vy += p.gravity * step;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * step;
        p.y += p.vy * step;
        if (mode === 'ambient') {
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }
        const lifeRatio = p.life / p.maxLife;
        const alpha = mode === 'burst' ? Math.max(0, 1 - lifeRatio) : Math.sin(Math.min(1, lifeRatio) * Math.PI);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (mode === 'ambient' && particles.length < target) spawnOne();

      if (mode === 'burst' && particles.length === 0) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      particles = [];
    };
  }, [reduce, mode, count, originY, colors]);

  if (reduce) return null;

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
