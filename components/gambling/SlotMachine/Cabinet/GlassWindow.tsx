'use client';

import * as THREE from 'three';
import { useMemo } from 'react';
import { roundedRectShape, roundedRectHole } from '../util/shapes';
import { WINDOW_W, WINDOW_H } from '../Reels/ReelPhysics';
import { GLASS_Z, MAT } from '../layout';

/**
 * The reel viewing window: a chrome/gold metal frame, a tempered-glass pane (clearcoat +
 * reflections, see-through so the reels read as *inside* the machine), and a bright edge
 * highlight. The moving glare lives in Effects/GlassReflection.
 */
export default function GlassWindow() {
  const frameGeo = useMemo(() => {
    const shape = roundedRectShape(WINDOW_W + 0.7, WINDOW_H + 0.7, 0.45);
    shape.holes.push(roundedRectHole(WINDOW_W + 0.04, WINDOW_H + 0.04, 0.35));
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 2,
      steps: 1,
    });
  }, []);

  return (
    <group>
      {/* chrome frame with gold inner lip */}
      <mesh geometry={frameGeo} position={[0, 0, GLASS_Z - 0.2]}>
        <meshStandardMaterial color={MAT.chrome} metalness={1} roughness={0.15} />
      </mesh>

      {/* tempered glass pane — lightweight standard material (physical clearcoat shader was
          overkill for a faint tinted pane) */}
      <mesh position={[0, 0, GLASS_Z]}>
        <meshStandardMaterial
          color={MAT.glassTint}
          transparent
          opacity={0.16}
          roughness={0.06}
          metalness={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <planeGeometry args={[WINDOW_W, WINDOW_H]} />
      </mesh>

      {/* bright inner edge highlight */}
      <lineSegments position={[0, 0, GLASS_Z + 0.01]}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(WINDOW_W, WINDOW_H)]}
        />
        <lineBasicMaterial color="#bfe0ff" transparent opacity={0.5} toneMapped={false} />
      </lineSegments>
    </group>
  );
}
