'use client';

import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import Reel from './Reel';
import { buildSymbolTextures } from '../util/symbolTexture';
import {
  BAND_HALF,
  REEL_GAP,
  REEL_RADIUS,
  WINDOW_W,
  ringLengthFor,
  faceHeightFor,
  reelX,
} from './ReelPhysics';
import type { PublicSymbol } from '@/lib/gambling/types';
import type { SlotController } from '../controller';

interface ReelViewportProps {
  symbols: PublicSymbol[];
  controller: SlotController;
  reducedMotion: boolean;
}

/** Match a server-returned symbol back to its config index (label + icon). */
export function resolveSymbolIndex(symbols: PublicSymbol[], target: PublicSymbol): number {
  const idx = symbols.findIndex(
    (s) => s.label === target.label && (s.icon ?? '') === (target.icon ?? ''),
  );
  return idx >= 0 ? idx : 0;
}

/**
 * The recessed reel chamber: dark back plate, three cylindrical reels, chrome dividers, and
 * inner top/bottom shadow. Reel faces are clipped to the window band so nothing spills past
 * the glass. Sits behind the cabinet's GlassWindow.
 */
export default function ReelViewport({ symbols, controller, reducedMotion }: ReelViewportProps) {
  const count = symbols.length;
  const ringLen = useMemo(() => ringLengthFor(count), [count]);
  const radius = REEL_RADIUS;
  const faceH = useMemo(() => faceHeightFor(ringLen), [ringLen]);

  const { textures, dispose } = useMemo(() => buildSymbolTextures(symbols), [symbols]);
  useEffect(() => dispose, [dispose]);

  const clippingPlanes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), BAND_HALF),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), BAND_HALF),
    ],
    [],
  );

  return (
    <group>
      {/* Dark recessed back plate, behind the drums */}
      <mesh position={[0, 0, -(radius + 0.5)]}>
        <planeGeometry args={[WINDOW_W + 1.5, BAND_HALF * 2 + 3]} />
        <meshStandardMaterial color="#0a0a12" roughness={0.9} metalness={0.1} />
      </mesh>

      {[0, 1, 2].map((i) => (
        <Reel
          key={i}
          reelIndex={i}
          textures={textures}
          ringLen={ringLen}
          radius={radius}
          faceH={faceH}
          x={reelX(i)}
          controller={controller}
          reducedMotion={reducedMotion}
          clippingPlanes={clippingPlanes}
        />
      ))}

      {/* Chrome dividers between reels */}
      {[-0.5, 0.5].map((s) => (
        <mesh key={s} position={[s * REEL_GAP, 0, radius + 0.05]}>
          <boxGeometry args={[0.06, BAND_HALF * 2 + 0.4, 0.12]} />
          <meshStandardMaterial color="#cfd3da" roughness={0.25} metalness={0.95} />
        </mesh>
      ))}

      {/* Inner top/bottom shadow so reels read as recessed behind the frame */}
      {[1, -1].map((dir) => (
        <mesh key={dir} position={[0, dir * (BAND_HALF - 0.15), radius + 0.09]}>
          <planeGeometry args={[WINDOW_W, 0.7]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
