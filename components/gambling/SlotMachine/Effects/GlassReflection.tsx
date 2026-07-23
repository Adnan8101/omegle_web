'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { GLASS_Z } from '../layout';
import { WINDOW_H, WINDOW_W } from '../Reels/ReelPhysics';

/** A soft diagonal glare that drifts across the glass so the window always looks "alive". */
export default function GlassReflection() {
  const mesh = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  const texture = useMemo(() => {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.58, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }, []);

  useFrame((_, delta) => {
    t.current += delta;
    if (mesh.current) {
      const m = mesh.current.material as THREE.MeshBasicMaterial;
      // slow horizontal drift of the glare
      m.opacity = 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(t.current * 0.4));
      mesh.current.position.x = Math.sin(t.current * 0.25) * WINDOW_W * 0.25;
    }
  });

  return (
    <mesh ref={mesh} position={[0, 0, GLASS_Z + 0.02]}>
      <planeGeometry args={[WINDOW_W * 1.1, WINDOW_H]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
