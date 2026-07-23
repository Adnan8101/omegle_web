'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { FRONT_Z, MARQUEE_H, MARQUEE_W, MARQUEE_Y } from '../layout';
import { WINDOW_H, WINDOW_W } from '../Reels/ReelPhysics';
import type { SlotController } from '../controller';

interface DecorativeLightsProps {
  controller: SlotController;
  reducedMotion?: boolean;
}

interface Bulb {
  pos: [number, number, number];
  /** 0..1 order along the chase path */
  t: number;
}

const WARM = new THREE.Color('#ffd27a');
const HOT = new THREE.Color('#fff2c8');

/** Illuminated bulbs framing the marquee and the reel window. */
export default function DecorativeLights({ controller, reducedMotion }: DecorativeLightsProps) {
  const bulbs = useMemo<Bulb[]>(() => {
    const list: Bulb[] = [];
    // marquee perimeter
    const mw = MARQUEE_W + 0.25;
    const mh = MARQUEE_H + 0.25;
    const nX = 12;
    const nY = 3;
    for (let i = 0; i <= nX; i++) {
      const x = -mw / 2 + (mw * i) / nX;
      list.push({ pos: [x, MARQUEE_Y + mh / 2, FRONT_Z + 0.12], t: 0 });
      list.push({ pos: [x, MARQUEE_Y - mh / 2, FRONT_Z + 0.12], t: 0 });
    }
    for (let i = 1; i < nY; i++) {
      const y = MARQUEE_Y - mh / 2 + (mh * i) / nY;
      list.push({ pos: [-mw / 2, y, FRONT_Z + 0.12], t: 0 });
      list.push({ pos: [mw / 2, y, FRONT_Z + 0.12], t: 0 });
    }
    // vertical runs beside the reel window
    const ww = WINDOW_W / 2 + 0.7;
    const nW = 5;
    for (let i = 0; i <= nW; i++) {
      const y = -WINDOW_H / 2 + (WINDOW_H * i) / nW;
      list.push({ pos: [-ww, y, FRONT_Z + 0.05], t: 0 });
      list.push({ pos: [ww, y, FRONT_Z + 0.05], t: 0 });
    }
    // assign chase order by angle around center
    list.forEach((b) => {
      b.t = (Math.atan2(b.pos[1] - MARQUEE_Y * 0.3, b.pos[0]) + Math.PI) / (Math.PI * 2);
    });
    return list;
  }, []);

  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += delta;
    const time = clock.current;
    const mode = controller.mode;
    for (let i = 0; i < bulbs.length; i++) {
      const m = mats.current[i];
      if (!m) continue;
      const b = bulbs[i];
      let lit: number;
      if (reducedMotion) {
        lit = 0.7;
      } else if (mode === 'win') {
        lit = Math.sin(time * 20 + i) > 0 ? 1 : 0.2;
      } else if (mode === 'spin') {
        const phase = (b.t - time * 0.5) % 1;
        lit = 0.3 + 0.7 * Math.pow((Math.cos(phase * Math.PI * 2) + 1) / 2, 3);
      } else {
        lit = 0.4 + 0.35 * Math.sin(time * 1.4 + b.t * 6);
      }
      m.opacity = 0.5 + 0.5 * lit;
      m.color.copy(WARM).lerp(HOT, lit);
    }
  });

  return (
    <group>
      {bulbs.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial
            ref={(el) => {
              mats.current[i] = el;
            }}
            color={WARM}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
