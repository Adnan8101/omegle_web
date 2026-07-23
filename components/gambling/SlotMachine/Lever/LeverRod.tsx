'use client';

import { MAT } from '../layout';

interface LeverRodProps {
  length: number;
}

/** Chromed steel rod. Extends below the pivot so it disappears into the cabinet. */
export default function LeverRod({ length }: LeverRodProps) {
  const lower = 0.5; // extends this far below the pivot (into the mount/cabinet)
  const total = length + lower;
  return (
    <mesh position={[0, (length - lower) / 2, 0]} castShadow>
      <cylinderGeometry args={[0.085, 0.1, total, 20]} />
      <meshStandardMaterial color={MAT.chrome} metalness={1} roughness={0.12} />
    </mesh>
  );
}
