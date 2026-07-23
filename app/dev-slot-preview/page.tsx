'use client';

import { useRef, useState } from 'react';
import SlotMachine, { SlotMachineHandle } from '@/components/gambling/SlotMachine';
import SlotDisplay from '@/components/gambling/SlotMachine/SlotDisplay';
import SlotWinOverlay from '@/components/gambling/SlotMachine/SlotWinOverlay';
import type { PublicSymbol } from '@/lib/gambling/types';

const SYMBOLS: PublicSymbol[] = [
  { label: 'Cherry', icon: '🍒' },
  { label: 'Lemon', icon: '🍋' },
  { label: 'Watermelon', icon: '🍉' },
  { label: 'Star', icon: '⭐' },
  { label: 'Diamond', icon: '💎' },
  { label: 'Bell', icon: '🔔' },
  { label: 'Clover', icon: '🍀' },
  { label: 'OZY Coin', icon: '🪙' },
];

export default function DevSlotPreview() {
  const machineRef = useRef<SlotMachineHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [balance, setBalance] = useState(1000);
  const [win, setWin] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const spin = async (big: boolean) => {
    if (spinning) return;
    setSpinning(true);
    setWin(0);
    const reels = big ? [SYMBOLS[4], SYMBOLS[4], SYMBOLS[4]] : [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]];
    const reward = big ? 500 : 0;
    await machineRef.current?.spinTo(reels, { reward, big });
    setBalance((b) => b + reward);
    setWin(reward);
    setSpinning(false);
    if (reward > 0) setShowOverlay(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center gap-8 p-8">
      <SlotDisplay balance={balance} bet={50} win={win} currencyName="Ozy" currencyEmoji="🪙" />
      <SlotMachine
        ref={machineRef}
        symbols={SYMBOLS}
        size={90}
        spinning={spinning}
        canSpin={!spinning}
        onSpinClick={() => spin(false)}
        reducedMotion={false}
      />
      <div className="flex gap-3">
        <button onClick={() => spin(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          Trigger spin (no win)
        </button>
        <button onClick={() => spin(true)} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold">
          Trigger big win
        </button>
      </div>

      {showOverlay && (
        <SlotWinOverlay
          outcome="THREE"
          bet={50}
          reward={500}
          profit={450}
          currencyName="Ozy"
          currencyEmoji="🪙"
          newBalance={balance}
          isBig
          canSpinAgain
          onClose={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
}
