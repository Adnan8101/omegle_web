'use client';

import { BACK_Z, BASE_H, BASE_W, BASE_Y, BODY_BOTTOM, FRONT_Z, MAT } from '../layout';

/** Bottom pedestal the machine stands on; slightly wider than the body, matte rubber feet. */
export default function CabinetBase() {
  const depth = FRONT_Z - BACK_Z + 0.6;
  const cz = (FRONT_Z + BACK_Z) / 2;

  return (
    <group>
      {/* transition skirt from body down to pedestal */}
      <mesh position={[0, (BODY_BOTTOM + BASE_Y) / 2 + 0.2, cz]} castShadow>
        <boxGeometry args={[BASE_W - 0.4, BODY_BOTTOM - BASE_Y + 0.4, depth - 0.4]} />
        <meshStandardMaterial color={MAT.aluminumDark} metalness={0.75} roughness={0.5} />
      </mesh>
      {/* pedestal slab */}
      <mesh position={[0, BASE_Y, cz]} castShadow receiveShadow>
        <boxGeometry args={[BASE_W, BASE_H, depth]} />
        <meshStandardMaterial color={MAT.piano} metalness={0.4} roughness={0.35} />
      </mesh>
      {/* gold plinth line */}
      <mesh position={[0, BASE_Y + BASE_H / 2 + 0.02, FRONT_Z]}>
        <boxGeometry args={[BASE_W, 0.08, 0.1]} />
        <meshStandardMaterial color={MAT.gold} metalness={1} roughness={0.25} />
      </mesh>
      {/* rubber feet */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (BASE_W / 2 - 0.6), BASE_Y - BASE_H / 2 - 0.1, cz]}>
          <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
          <meshStandardMaterial color={MAT.rubber} metalness={0} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
