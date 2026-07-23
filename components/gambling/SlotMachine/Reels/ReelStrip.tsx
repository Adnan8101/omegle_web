'use client';

import * as THREE from 'three';
import { useMemo } from 'react';
import { FACE_W, TWO_PI } from './ReelPhysics';

interface ReelStripProps {
  /** ring symbol textures; ring index i shows textures[i % textures.length] */
  textures: THREE.CanvasTexture[];
  ringLen: number;
  radius: number;
  faceH: number;
  clippingPlanes?: THREE.Plane[];
}

/**
 * The ring of symbol faces for one reel. Each face is a plane pushed out to the cylinder
 * surface and rotated to sit flush, so scene lighting curves the strip for free. The parent
 * group's rotation.x selects which face lands on the payline.
 */
export default function ReelStrip({ textures, ringLen, radius, faceH, clippingPlanes }: ReelStripProps) {
  const faces = useMemo(() => {
    const step = TWO_PI / ringLen;
    return Array.from({ length: ringLen }, (_, i) => ({
      key: i,
      angle: -i * step,
      texture: textures[i % textures.length],
    }));
  }, [textures, ringLen]);

  return (
    <>
      {faces.map((f) => (
        <group key={f.key} rotation={[f.angle, 0, 0]}>
          <mesh position={[0, 0, radius]}>
            <planeGeometry args={[FACE_W, faceH * 1.04]} />
            <meshStandardMaterial
              map={f.texture}
              roughness={0.55}
              metalness={0.05}
              toneMapped={false}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
