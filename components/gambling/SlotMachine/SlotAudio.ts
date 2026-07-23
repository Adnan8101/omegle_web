'use client';

import { useRef } from 'react';
import { SlotAudioSynth } from '@/lib/gambling/slotAudioSynth';

/** Owns the single Web Audio synth instance for the machine and exposes a stable API. */
export function useSlotAudio() {
  const ref = useRef<SlotAudioSynth | null>(null);
  if (!ref.current && typeof window !== 'undefined') {
    ref.current = new SlotAudioSynth();
  }

  return {
    init: () => ref.current?.init(),
    playLeverPull: () => ref.current?.playLeverPull(),
    playLeverReturn: () => ref.current?.playLeverReturn(),
    playSpinLoop: () => ref.current?.playSpinLoop() ?? (() => {}),
    playReelStop: () => ref.current?.playReelStop(),
    playWin: (big: boolean) => ref.current?.playWin(big),
    playLose: () => ref.current?.playLose(),
  };
}
