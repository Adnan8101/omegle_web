'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { FRONT_Z, MARQUEE_H, MARQUEE_W, MARQUEE_Y, MAT } from '../layout';
import type { SlotController } from '../controller';

interface MarqueeProps {
  controller: SlotController;
  title?: string;
}

/** Draw the marquee title to a canvas texture (no external font fetch). */
function useTitleTexture(title: string) {
  return useMemo(() => {
    const w = 1024;
    const h = 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.floor(h * 0.5)}px Georgia, "Times New Roman", serif`;
    // gold gradient fill with a red glow underlay
    ctx.shadowColor = 'rgba(255,60,60,0.9)';
    ctx.shadowBlur = 26;
    const grad = ctx.createLinearGradient(0, 40, 0, h - 40);
    grad.addColorStop(0, '#fff4c2');
    grad.addColorStop(0.5, '#f5c542');
    grad.addColorStop(1, '#b9860f');
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, h / 2 + 6);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(120,70,0,0.6)';
    ctx.strokeText(title, w / 2, h / 2 + 6);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [title]);
}

export default function Marquee({ controller, title = 'SLOT MACHINE' }: MarqueeProps) {
  const titleTex = useTitleTexture(title);
  const titleMat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += delta;
    const t = clock.current;
    let intensity: number;
    if (controller.mode === 'win') {
      intensity = 0.7 + 0.3 * Math.sign(Math.sin(t * 22)); // hard flash
    } else if (controller.mode === 'spin') {
      intensity = 0.85 + 0.15 * Math.sin(t * 6);
    } else {
      intensity = 0.55 + 0.2 * Math.sin(t * 1.6); // idle breathe
    }
    if (titleMat.current) titleMat.current.opacity = 0.75 + 0.25 * intensity;
    if (glow.current) glow.current.opacity = 0.15 + 0.35 * intensity;
  });

  return (
    <group position={[0, MARQUEE_Y, FRONT_Z + 0.02]}>
      {/* gold frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[MARQUEE_W + 0.3, MARQUEE_H + 0.3, 0.16]} />
        <meshStandardMaterial color={MAT.gold} metalness={1} roughness={0.28} />
      </mesh>
      {/* frosted glass panel */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[MARQUEE_W, MARQUEE_H]} />
        <meshPhysicalMaterial
          color="#1a1030"
          transmission={0.4}
          roughness={0.6}
          thickness={0.4}
          metalness={0}
          emissive="#3a1e5c"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* red glow wash behind the title */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[MARQUEE_W * 0.96, MARQUEE_H * 0.9]} />
        <meshBasicMaterial ref={glow} color="#ff3355" transparent opacity={0.2} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* title */}
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[MARQUEE_W * 0.92, MARQUEE_H * 0.7]} />
        <meshBasicMaterial ref={titleMat} map={titleTex} transparent opacity={1} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
