'use client';

import { MAT } from '../layout';

/** Gold hinge + mounting bracket bolted to the cabinet side. Static (the arm pivots on it). */
export default function LeverMount() {
  return (
    <group>
      {/* bracket plate against the cabinet */}
      <mesh position={[-0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.36, 0.7, 0.5]} />
        <meshStandardMaterial color={MAT.aluminumDark} metalness={0.8} roughness={0.4} />
      </mesh>
      {/* gold hinge barrel along X (the pivot axis) */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.6, 24]} />
        <meshStandardMaterial
          color={MAT.gold}
          metalness={1}
          roughness={0.25}
          emissive={MAT.goldDeep}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* hinge end caps */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.06, 24]} />
          <meshStandardMaterial color={MAT.goldDeep} metalness={1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
