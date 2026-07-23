'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import LeverMount from './LeverMount';
import LeverRod from './LeverRod';
import LeverKnob from './LeverKnob';
import { LeverAnimator } from './LeverAnimator';
import { CAB_W, FRONT_Z } from '../layout';

interface LeverProps {
  canSpin: boolean;
  reducedMotion: boolean;
  onPull: () => void;
  onImpact: () => void;
  onSettle: () => void;
}

const ROD_LEN = 2.4;
const MOUNT_POS: [number, number, number] = [CAB_W / 2 + 0.25, -0.3, FRONT_Z - 0.15];

/**
 * Mechanically attached pull lever: a static gold hinge with a chrome rod + red acrylic ball
 * that pivots about the hinge. Heavy pull → impact → bounce → slow return via LeverAnimator.
 */
export default function Lever({ canSpin, reducedMotion, onPull, onImpact, onSettle }: LeverProps) {
  const arm = useRef<THREE.Group>(null);
  const knob = useRef<THREE.Group>(null);
  const animator = useMemo(() => new LeverAnimator(), []);
  const [hovered, setHovered] = useState(false);
  const time = useRef(0);

  const active = canSpin || animator.isActive;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    time.current += dt;

    if (animator.isActive) {
      const r = animator.tick(dt);
      if (r.firePull) onPull();
      if (r.fireImpact) onImpact();
      if (r.finished) onSettle();
    } else if (canSpin && !reducedMotion) {
      animator.idle(time.current);
    } else {
      animator.angle += (0 - animator.angle) * Math.min(1, dt * 8);
    }

    if (arm.current) arm.current.rotation.x = animator.angle;
    if (knob.current) {
      const target = hovered && canSpin ? 1.08 : 1;
      const s = knob.current.scale.x + (target - knob.current.scale.x) * Math.min(1, dt * 12);
      knob.current.scale.setScalar(s);
    }
  });

  const startPull = (e: any) => {
    e.stopPropagation();
    if (!canSpin || animator.isActive) return;
    if (reducedMotion) {
      onPull();
      onImpact();
      onSettle();
      return;
    }
    animator.start();
  };

  const setCursor = (c: string) => {
    if (typeof document !== 'undefined') document.body.style.cursor = c;
  };

  return (
    <group position={MOUNT_POS}>
      <LeverMount />
      <group ref={arm}>
        <LeverRod length={ROD_LEN} />
        <group position={[0, ROD_LEN, 0]}>
          <LeverKnob
            ref={knob}
            active={active}
            onPointerDown={startPull}
            onPointerOver={() => {
              setHovered(true);
              setCursor(canSpin ? 'grab' : 'not-allowed');
            }}
            onPointerOut={() => {
              setHovered(false);
              setCursor('auto');
            }}
          />
        </group>
      </group>
    </group>
  );
}
