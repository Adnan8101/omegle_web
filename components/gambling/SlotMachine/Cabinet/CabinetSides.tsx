'use client';

import { BACK_Z, BODY_BOTTOM, BODY_TOP, CAB_W, FRONT_Z, MAT } from '../layout';

/** Thick side panels that wrap the body from front bezel to back wall, with gold edge trim. */
export default function CabinetSides() {
  const depth = FRONT_Z - BACK_Z;
  const cz = (FRONT_Z + BACK_Z) / 2;
  const bodyH = BODY_TOP - BODY_BOTTOM + 0.2;
  const cy = (BODY_TOP + BODY_BOTTOM) / 2;
  const halfW = CAB_W / 2;

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* thick brushed-aluminum side panel */}
          <mesh position={[side * (halfW - 0.25), cy, cz]} castShadow receiveShadow>
            <boxGeometry args={[0.5, bodyH, depth]} />
            <meshStandardMaterial color={MAT.aluminumDark} metalness={0.8} roughness={0.45} />
          </mesh>
          {/* gold trim running down the front edge */}
          <mesh position={[side * (halfW - 0.08), cy, FRONT_Z - 0.15]}>
            <boxGeometry args={[0.12, bodyH * 0.98, 0.18]} />
            <meshStandardMaterial
              color={MAT.gold}
              metalness={1}
              roughness={0.25}
              emissive={MAT.goldDeep}
              emissiveIntensity={0.15}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
