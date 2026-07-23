'use client';

import * as THREE from 'three';
import { useMemo } from 'react';
import { roundedRectShape, roundedRectHole } from '../util/shapes';
import { WINDOW_W, WINDOW_H } from '../Reels/ReelPhysics';
import {
  BACK_Z,
  BEZEL_DEPTH,
  BODY_BOTTOM,
  BODY_TOP,
  CAB_W,
  FRONT_Z,
  MAT,
} from '../layout';

/**
 * The main cabinet body: a thick brushed-aluminum front bezel with the reel window cut out of
 * it, a black piano-finish inner surround, and a back wall. Extruded geometry gives the bezel
 * real depth so the reels sit recessed behind it.
 */
export default function CabinetShell() {
  const bodyH = BODY_TOP - BODY_BOTTOM;
  const bodyCY = (BODY_TOP + BODY_BOTTOM) / 2;

  const bezelGeo = useMemo(() => {
    const shape = roundedRectShape(CAB_W, bodyH, 0.6);
    shape.holes.push(roundedRectHole(WINDOW_W, WINDOW_H, 0.35));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: BEZEL_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 3,
      steps: 1,
    });
    geo.computeVertexNormals();
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyH]);

  // Inner black surround immediately around the window opening (piano finish).
  const surroundGeo = useMemo(() => {
    const shape = roundedRectShape(WINDOW_W + 0.55, WINDOW_H + 0.55, 0.4);
    shape.holes.push(roundedRectHole(WINDOW_W, WINDOW_H, 0.35));
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group>
      {/* Front bezel — brushed aluminum */}
      <mesh
        geometry={bezelGeo}
        position={[0, bodyCY, FRONT_Z - BEZEL_DEPTH]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={MAT.aluminum} metalness={0.85} roughness={0.38} />
      </mesh>

      {/* Piano-black surround around the glass */}
      <mesh geometry={surroundGeo} position={[0, 0, FRONT_Z + 0.005]}>
        <meshStandardMaterial color={MAT.piano} metalness={0.5} roughness={0.15} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, bodyCY, BACK_Z]}>
        <boxGeometry args={[CAB_W - 0.4, bodyH, 0.3]} />
        <meshStandardMaterial color={MAT.piano} metalness={0.2} roughness={0.7} />
      </mesh>
    </group>
  );
}
