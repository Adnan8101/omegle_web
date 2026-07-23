'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { GLASS_Z } from '../layout';
import { WINDOW_W } from '../Reels/ReelPhysics';
import type { SlotController } from '../controller';

const DURATION = 1.4;

/** Emissive laser line that sweeps across the payline after a win, then glows and fades. */
export default function WinLine({ controller }: { controller: SlotController }) {
  const group = useRef<THREE.Group>(null);
  const bar = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const seen = useRef(controller.winLineToken);
  const elapsed = useRef(Infinity);

  useFrame((_, delta) => {
    if (controller.winLineToken !== seen.current) {
      seen.current = controller.winLineToken;
      elapsed.current = 0;
    }
    if (elapsed.current === Infinity) {
      if (group.current) group.current.visible = false;
      return;
    }
    elapsed.current += delta;
    const p = elapsed.current / DURATION;
    if (p >= 1) {
      elapsed.current = Infinity;
      if (group.current) group.current.visible = false;
      return;
    }
    if (group.current) group.current.visible = true;
    const mat = bar.current?.material as THREE.MeshBasicMaterial | undefined;
    if (bar.current && mat) {
      // slide in (0..0.35), hold+glow, fade out (0.7..1)
      const slide = Math.min(1, p / 0.35);
      bar.current.scale.x = slide;
      const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      mat.opacity = 0.9 * fade;
      const haloMat = halo.current?.material as THREE.MeshBasicMaterial | undefined;
      if (halo.current && haloMat) {
        halo.current.scale.x = slide;
        haloMat.opacity = 0.9 * fade * 0.4;
      }
    }
  });

  return (
    <group ref={group} position={[0, 0, GLASS_Z + 0.03]} visible={false}>
      <mesh ref={bar}>
        <planeGeometry args={[WINDOW_W * 0.98, 0.12]} />
        <meshBasicMaterial
          color="#fff2a0"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* soft glow halo */}
      <mesh ref={halo} position={[0, 0, -0.01]} scale={[1, 3.5, 1]}>
        <planeGeometry args={[WINDOW_W * 0.98, 0.12]} />
        <meshBasicMaterial
          color="#ffcc33"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
