'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'square' | 'circle';
}

interface SlotParticlesProps {
  /** Bump this counter each time a burst should fire. */
  trigger: number;
  big?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#f43f5e', '#fbbf24'];

/** Canvas confetti/coin burst used for slot-machine win celebrations. */
export default function SlotParticles({ trigger, big = false, reducedMotion = false, className }: SlotParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animFrame: number;
    const particles: Particle[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = big ? 260 : 140;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (big ? 12 : 9) + 4;
      particles.push({
        x: cx,
        y: cy - 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        size: Math.random() * 8 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.006,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: Math.random() > 0.6 ? 'square' : 'circle',
      });
    }

    const run = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.vx *= 0.98;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (particles.length > 0) {
        animFrame = requestAnimationFrame(run);
      }
    };
    run();
    return () => cancelAnimationFrame(animFrame);
  }, [trigger, big, reducedMotion]);

  if (!trigger || reducedMotion) return null;
  return <canvas key={trigger} ref={canvasRef} className={className ?? 'pointer-events-none fixed inset-0 z-[70]'} />;
}
