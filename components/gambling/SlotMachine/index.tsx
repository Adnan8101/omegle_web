'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';
import SlotCabinet from './SlotCabinet';
import SlotWindow from './SlotWindow';
import SlotReels, { SlotReelsHandle } from './SlotReels';
import SlotLever from './SlotLever';
import { CabinetShake, ScreenFlash } from './SlotEffects';
import SlotParticles from './SlotParticles';
import { useSlotAudio } from './SlotAudio';
import type { SlotLightsMode } from './SlotLights';

export interface SlotMachineHandle {
  spinTo: (reels: PublicSymbol[], result?: { reward: number; big: boolean }) => Promise<void>;
}

interface SlotMachineProps {
  symbols: PublicSymbol[];
  size?: number;
  spinning?: boolean;
  canSpin?: boolean;
  onSpinClick?: () => void;
  onReelStop?: () => void;
  reducedMotion?: boolean;
}

const SlotMachine = forwardRef<SlotMachineHandle, SlotMachineProps>(function SlotMachine(
  { symbols, size = 96, canSpin = false, onSpinClick, onReelStop, reducedMotion = false },
  ref,
) {
  const reelsRef = useRef<SlotReelsHandle>(null);
  const audio = useSlotAudio();

  const [lightsMode, setLightsMode] = useState<SlotLightsMode>('idle');
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [particlesTrigger, setParticlesTrigger] = useState(0);
  const [particlesBig, setParticlesBig] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout>>();

  useImperativeHandle(
    ref,
    () => ({
      spinTo: async (reels: PublicSymbol[], result?: { reward: number; big: boolean }) => {
        clearTimeout(celebrateTimer.current);
        setLightsMode('spin');
        await reelsRef.current?.spinTo(reels);

        if (result && result.reward > 0) {
          setLightsMode('win');
          setFlashTrigger((n) => n + 1);
          setParticlesBig(result.big);
          setParticlesTrigger((n) => n + 1);
          if (result.big) setShakeTrigger((n) => n + 1);
          celebrateTimer.current = setTimeout(() => setLightsMode('idle'), 1600);
        } else {
          setLightsMode('idle');
        }
      },
    }),
    [],
  );

  const handlePull = () => {
    audio.playLeverPull();
    onSpinClick?.();
  };

  return (
    <div className="relative">
      <ScreenFlash trigger={flashTrigger} big={particlesBig} />
      <SlotParticles
        trigger={particlesTrigger}
        big={particlesBig}
        reducedMotion={reducedMotion}
        className="pointer-events-none fixed inset-0 z-[65]"
      />
      <CabinetShake trigger={shakeTrigger}>
        <SlotCabinet lightsMode={lightsMode} reducedMotion={reducedMotion}
          lever={
            onSpinClick ? (
              <SlotLever
                canSpin={canSpin}
                onPull={handlePull}
                onSettle={audio.playLeverReturn}
                tileH={size}
                reducedMotion={reducedMotion}
              />
            ) : null
          }
        >
          <SlotWindow reducedMotion={reducedMotion}>
            <SlotReels
              ref={reelsRef}
              symbols={symbols}
              tileH={size}
              reducedMotion={reducedMotion}
              onReelStop={onReelStop}
            />
          </SlotWindow>
        </SlotCabinet>
      </CabinetShake>
    </div>
  );
});

export default SlotMachine;
