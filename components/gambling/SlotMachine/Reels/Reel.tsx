'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import ReelStrip from './ReelStrip';
import { ReelAnimator } from './ReelAnimator';
import { FACE_W, BAND_HALF } from './ReelPhysics';
import type { SlotController } from '../controller';

interface ReelProps {
  reelIndex: number;
  textures: THREE.CanvasTexture[];
  ringLen: number;
  radius: number;
  faceH: number;
  x: number;
  controller: SlotController;
  reducedMotion: boolean;
  clippingPlanes?: THREE.Plane[];
}

/** Horizontal-streak veil texture that reads as vertical motion blur when faded in at speed. */
function useBlurTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    for (let y = 0; y < 128; y++) {
      const a = 0.05 + 0.14 * Math.abs(Math.sin(y * 0.6));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(0, y, 4, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 3);
    return t;
  }, []);
}

export default function Reel({
  reelIndex,
  textures,
  ringLen,
  radius,
  faceH,
  x,
  controller,
  reducedMotion,
  clippingPlanes,
}: ReelProps) {
  const spinGroup = useRef<THREE.Group>(null);
  const veilMat = useRef<THREE.MeshBasicMaterial>(null);
  const animator = useMemo(() => {
    const a = new ReelAnimator(ringLen, reducedMotion);
    // stagger starting offset so the three reels don't look identical at rest
    a.rotation = reelIndex * 0.37;
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringLen]);
  const seenSpinId = useRef(controller.spinId);
  const blur = useBlurTexture();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (controller.spinId !== seenSpinId.current) {
      seenSpinId.current = controller.spinId;
      const plan = controller.plans[reelIndex];
      if (plan) animator.begin(plan.targetIndex, plan.stopTime);
    }

    let speed01 = 0;
    if (animator.isSpinning()) {
      const r = animator.tick(dt);
      speed01 = r.speed01;
      if (r.clicked) controller.onReelClick?.();
      if (r.justStopped) controller.notifyReelStopped();
    } else if (!reducedMotion) {
      animator.idleDrift(dt);
    }

    if (spinGroup.current) spinGroup.current.rotation.x = animator.rotation;
    if (veilMat.current) {
      const target = speed01 * 0.45;
      veilMat.current.opacity += (target - veilMat.current.opacity) * Math.min(1, dt * 12);
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <group ref={spinGroup}>
        <ReelStrip
          textures={textures}
          ringLen={ringLen}
          radius={radius}
          faceH={faceH}
          clippingPlanes={clippingPlanes}
        />
      </group>
      {/* motion-blur veil in front of the reel, over the visible band */}
      <mesh position={[0, 0, radius + 0.08]}>
        <planeGeometry args={[FACE_W * 1.02, BAND_HALF * 2.4]} />
        <meshBasicMaterial
          ref={veilMat}
          map={blur}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          clippingPlanes={clippingPlanes}
        />
      </mesh>
    </group>
  );
}
