'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useRef } from 'react';
import type { SlotController } from '../controller';

interface LightingProps {
  controller: SlotController;
}

/**
 * Scene lighting + a synthetic studio environment (built from Lightformers, so no external HDR
 * is fetched — CSP-safe). Warm ambient breathing at idle; brighter, gold-tinted on a win.
 */
export default function Lighting({ controller }: LightingProps) {
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    const mode = controller.mode;
    let amb: number;
    let fillI: number;
    let warm: number; // 0 neutral → 1 gold
    if (mode === 'win') {
      amb = 0.75 + 0.25 * Math.sin(t.current * 18);
      fillI = 3.2;
      warm = 1;
    } else if (mode === 'spin') {
      amb = 0.55;
      fillI = 1.8;
      warm = 0.4;
    } else {
      amb = 0.42 + 0.06 * Math.sin(t.current * 1.5); // breathe
      fillI = 1.2;
      warm = 0.25;
    }
    if (ambient.current) ambient.current.intensity = amb;
    if (fill.current) {
      fill.current.intensity = fillI;
      fill.current.color.setRGB(1, 0.85 - warm * 0.15, 0.7 - warm * 0.35);
    }
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.42} color="#fff4e6" />
      <directionalLight
        ref={key}
        position={[3, 6, 6]}
        intensity={1.6}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight ref={fill} position={[0, 1, 5]} intensity={1.2} distance={30} color="#ffd9a0" />
      <pointLight position={[-5, 2, 3]} intensity={0.5} color="#88aaff" />

      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.4} position={[0, 3, 5]} scale={[8, 6, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-5, 1, 4]} scale={[4, 5, 1]} color="#ffd9a0" />
        <Lightformer intensity={1.4} position={[5, 1, 4]} scale={[4, 5, 1]} color="#a9c4ff" />
        <Lightformer intensity={1} position={[0, -4, 4]} scale={[8, 3, 1]} color="#ffffff" />
      </Environment>
    </>
  );
}
