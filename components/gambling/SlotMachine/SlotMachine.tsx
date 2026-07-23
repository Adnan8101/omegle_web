'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';
import { SlotController, type ReelPlan } from './controller';
import { resolveSymbolIndex } from './Reels/ReelViewport';
import { STOP_TIMES, REDUCED_STOP_TIMES } from './Reels/ReelPhysics';
import { useSlotAudio } from './Audio/SlotAudio';

// The R3F scene has no server renderer — load it client-side only.
const SlotScene = dynamic(() => import('./SlotScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
      Warming up the machine…
    </div>
  ),
});

export interface SlotMachineHandle {
  spinTo: (reels: PublicSymbol[], result?: { reward: number; big: boolean }) => Promise<void>;
}

interface SlotMachineProps {
  symbols: PublicSymbol[];
  canSpin?: boolean;
  reducedMotion?: boolean;
  balance: number;
  bet: number;
  lastWin: number;
  currencyName: string;
  /** called when the lever pull fires the spin request */
  onSpinClick?: () => void;
  /** called each time a reel comes to rest (host plays the stop sound) */
  onReelStop?: () => void;
  enableBloom?: boolean;
}

const SlotMachine = forwardRef<SlotMachineHandle, SlotMachineProps>(function SlotMachine(
  {
    symbols,
    canSpin = false,
    reducedMotion = false,
    balance,
    bet,
    lastWin,
    currencyName,
    onSpinClick,
    onReelStop,
    enableBloom = true,
  },
  ref,
) {
  const audio = useSlotAudio();
  const controller = useMemo(() => new SlotController(), []);

  useEffect(() => {
    controller.reducedMotion = reducedMotion;
  }, [controller, reducedMotion]);

  useEffect(() => {
    controller.onReelStop = () => onReelStop?.();
    controller.onReelClick = () => audio.playReelClick();
    return () => {
      controller.onReelStop = undefined;
      controller.onReelClick = undefined;
    };
  }, [controller, onReelStop, audio]);

  useEffect(() => {
    return () => audio.stopAmbientHum();
  }, [audio]);

  useImperativeHandle(
    ref,
    () => ({
      spinTo: async (reels, result) => {
        const stops = reducedMotion ? REDUCED_STOP_TIMES : STOP_TIMES;
        const plans: ReelPlan[] = reels.slice(0, 3).map((r, i) => ({
          targetIndex: resolveSymbolIndex(symbols, r),
          stopTime: stops[i] ?? stops[stops.length - 1],
        }));
        const big = !!result?.big;
        await controller.beginSpin(plans, big);
        if (result && result.reward > 0) {
          controller.showWinLine();
          controller.celebrate(big);
        } else {
          controller.reset();
        }
      },
    }),
    [controller, symbols, reducedMotion],
  );

  const handleLeverPull = () => {
    audio.init();
    audio.playLeverPull();
    audio.startAmbientHum();
    onSpinClick?.();
  };

  const handleLeverImpact = () => {
    controller.requestShake(0.18, 0.4);
  };

  return (
    <div
      className="relative w-full"
      style={{ maxWidth: 540, aspectRatio: '11 / 12', margin: '0 auto' }}
    >
      <SlotScene
        symbols={symbols}
        controller={controller}
        reducedMotion={reducedMotion}
        canSpin={canSpin}
        hud={{ balance, bet, lastWin, currencyName }}
        onLeverPull={handleLeverPull}
        onLeverImpact={handleLeverImpact}
        onLeverSettle={audio.playLeverReturn}
        enableBloom={enableBloom}
      />
    </div>
  );
});

export default SlotMachine;
