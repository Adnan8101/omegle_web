'use client';

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { SlotController } from '../controller';

/** Selective bloom for the emissive marquee / bulbs / coins, boosted on a win, plus a vignette. */
export default function GlowEffects({ controller }: { controller: SlotController }) {
  const bloom = useRef<any>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (!bloom.current) return;
    const mode = controller.mode;
    const target =
      mode === 'win' ? 1.1 + 0.5 * Math.abs(Math.sin(t.current * 12)) : mode === 'spin' ? 0.7 : 0.45;
    bloom.current.intensity += (target - bloom.current.intensity) * Math.min(1, delta * 5);
  });

  return (
    <EffectComposer>
      <Bloom
        ref={bloom}
        intensity={0.45}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.25} darkness={0.75} />
    </EffectComposer>
  );
}
