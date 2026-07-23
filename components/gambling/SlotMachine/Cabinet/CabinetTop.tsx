'use client';

import { BACK_Z, BODY_TOP, CAB_W, FRONT_Z, MAT, MARQUEE_Y, MARQUEE_H } from '../layout';

/** Rounded crown that houses the marquee and caps the cabinet with a curved top edge. */
export default function CabinetTop() {
  const top = MARQUEE_Y + MARQUEE_H / 2;
  const h = top - BODY_TOP;
  const cy = (top + BODY_TOP) / 2;
  const depth = FRONT_Z - BACK_Z;
  const cz = (FRONT_Z + BACK_Z) / 2;
  const w = CAB_W - 0.2;

  return (
    <group>
      {/* housing block */}
      <mesh position={[0, cy, cz]} castShadow receiveShadow>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial color={MAT.aluminum} metalness={0.82} roughness={0.4} />
      </mesh>
      {/* curved top cap (horizontal cylinder along X) */}
      <mesh position={[0, top, cz]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, w, 32]} />
        <meshStandardMaterial color={MAT.aluminumDark} metalness={0.85} roughness={0.35} />
      </mesh>
      {/* gold seam between crown and body */}
      <mesh position={[0, BODY_TOP + 0.02, FRONT_Z - 0.2]}>
        <boxGeometry args={[w, 0.1, 0.2]} />
        <meshStandardMaterial color={MAT.gold} metalness={1} roughness={0.25} />
      </mesh>
    </group>
  );
}
