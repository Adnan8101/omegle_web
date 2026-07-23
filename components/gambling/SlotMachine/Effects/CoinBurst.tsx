'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { GLASS_Z, MAT } from '../layout';
import type { SlotController } from '../controller';

const MAX = 120;
const GRAVITY = -9;
const LIFETIME = 2.2;

interface Coin {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vr: number;
  life: number;
}

/** Instanced gold-coin burst launched from the window on a win. */
export default function CoinBurst({ controller }: { controller: SlotController }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const coins = useRef<Coin[]>(
    Array.from({ length: MAX }, () => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, vr: 0, life: 0,
    })),
  );
  const seen = useRef(controller.burstToken);

  const spawn = (big: boolean) => {
    const n = big ? MAX : Math.floor(MAX * 0.5);
    for (let i = 0; i < MAX; i++) {
      const c = coins.current[i];
      if (i < n) {
        const ang = Math.random() * Math.PI * 2;
        const spread = 2 + Math.random() * 3.5;
        c.x = (Math.random() - 0.5) * 4;
        c.y = -1 + Math.random() * 0.5;
        c.z = GLASS_Z + 0.2;
        c.vx = Math.cos(ang) * spread;
        c.vy = 4 + Math.random() * (big ? 7 : 4);
        c.vz = Math.random() * 2;
        c.rot = Math.random() * Math.PI;
        c.vr = (Math.random() - 0.5) * 12;
        c.life = LIFETIME * (0.7 + Math.random() * 0.3);
      } else {
        c.life = 0;
      }
    }
  };

  useFrame((_, delta) => {
    if (controller.burstToken !== seen.current) {
      seen.current = controller.burstToken;
      spawn(controller.bigBurst);
    }
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    let anyAlive = false;
    for (let i = 0; i < MAX; i++) {
      const c = coins.current[i];
      if (c.life > 0) {
        anyAlive = true;
        c.life -= dt;
        c.vy += GRAVITY * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        c.rot += c.vr * dt;
        dummy.position.set(c.x, c.y, c.z);
        dummy.rotation.set(Math.PI / 2, c.rot, c.rot * 0.5);
        const s = Math.min(1, c.life) * 0.18;
        dummy.scale.setScalar(s);
      } else {
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.visible = anyAlive;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} visible={false}>
      <cylinderGeometry args={[1, 1, 0.18, 20]} />
      <meshStandardMaterial color={MAT.gold} metalness={1} roughness={0.25} emissive={MAT.goldDeep} emissiveIntensity={0.3} />
    </instancedMesh>
  );
}
