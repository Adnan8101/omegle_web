'use client';

import * as THREE from 'three';
import { forwardRef } from 'react';
import { MAT } from '../layout';

interface LeverKnobProps {
  active: boolean;
  onPointerDown: (e: any) => void;
  onPointerOver: (e: any) => void;
  onPointerOut: (e: any) => void;
}

/** Heavy red acrylic ball on a gold collar. Glows when the machine is ready to spin. */
const LeverKnob = forwardRef<THREE.Group, LeverKnobProps>(function LeverKnob(
  { active, onPointerDown, onPointerOver, onPointerOut },
  ref,
) {
  return (
    <group ref={ref}>
      {/* gold collar where the ball meets the rod */}
      <mesh position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.18, 20]} />
        <meshStandardMaterial color={MAT.gold} metalness={1} roughness={0.25} />
      </mesh>
      {/* acrylic ball */}
      <mesh
        castShadow
        onPointerDown={onPointerDown}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[0.42, 40, 40]} />
        <meshPhysicalMaterial
          color={MAT.ruby}
          metalness={0}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transmission={0.25}
          thickness={0.6}
          ior={1.5}
          emissive={MAT.ruby}
          emissiveIntensity={active ? 0.55 : 0.12}
        />
      </mesh>
    </group>
  );
});

export default LeverKnob;
