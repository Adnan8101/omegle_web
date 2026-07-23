'use client';

import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';
import type { SlotController } from './controller';

import CabinetShell from './Cabinet/CabinetShell';
import CabinetSides from './Cabinet/CabinetSides';
import CabinetTop from './Cabinet/CabinetTop';
import CabinetBase from './Cabinet/CabinetBase';
import Marquee from './Cabinet/Marquee';
import GlassWindow from './Cabinet/GlassWindow';
import DecorativeLights from './Cabinet/DecorativeLights';
import CabinetHUD from './Cabinet/CabinetHUD';
import ReelViewport from './Reels/ReelViewport';
import Lever from './Lever/Lever';
import Lighting from './Effects/Lighting';
import GlassReflection from './Effects/GlassReflection';
import WinLine from './Effects/WinLine';
import CoinBurst from './Effects/CoinBurst';
import Particles from './Effects/Particles';
import GlowEffects from './Effects/GlowEffects';
import { MachineShake } from './Effects/MachineShake';

export interface SlotSceneProps {
  symbols: PublicSymbol[];
  controller: SlotController;
  reducedMotion: boolean;
  canSpin: boolean;
  hud: { balance: number; bet: number; lastWin: number; currencyName: string };
  onLeverPull: () => void;
  onLeverImpact: () => void;
  onLeverSettle: () => void;
  enableBloom?: boolean;
}

function SceneContents({
  symbols,
  controller,
  reducedMotion,
  canSpin,
  hud,
  onLeverPull,
  onLeverImpact,
  onLeverSettle,
  enableBloom,
}: SlotSceneProps) {
  const machine = useRef<THREE.Group>(null);
  const shake = useMemo(() => new MachineShake(), []);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    shake.poll(controller.shakeToken, controller.shakeMag, 0.5);
    const o = shake.update(delta, time.current);
    if (machine.current) {
      machine.current.position.set(o.x, o.y, 0);
      machine.current.rotation.z = o.rz;
    }
  });

  return (
    <>
      <Lighting controller={controller} />
      <Particles reducedMotion={reducedMotion} />

      <group ref={machine}>
        {/* Reels sit first so the cabinet + glass layer over them */}
        <ReelViewport symbols={symbols} controller={controller} reducedMotion={reducedMotion} />

        <CabinetShell />
        <CabinetSides />
        <CabinetTop />
        <CabinetBase />
        <GlassWindow />
        <GlassReflection />
        <Marquee controller={controller} />
        <DecorativeLights controller={controller} reducedMotion={reducedMotion} />
        <CabinetHUD
          balance={hud.balance}
          bet={hud.bet}
          lastWin={hud.lastWin}
          currencyName={hud.currencyName}
        />

        <Lever
          canSpin={canSpin}
          reducedMotion={reducedMotion}
          onPull={onLeverPull}
          onImpact={onLeverImpact}
          onSettle={onLeverSettle}
        />

        <WinLine controller={controller} />
        <CoinBurst controller={controller} />
      </group>

      {enableBloom && !reducedMotion && <GlowEffects controller={controller} />}
    </>
  );
}

/** The R3F root. Client-only (mounted via next/dynamic ssr:false from SlotMachine.tsx). */
export default function SlotScene(props: SlotSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, -0.3, 15], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
