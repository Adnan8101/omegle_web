'use client';

import { ReactNode } from 'react';
import SlotLights, { SlotLightsMode } from './SlotLights';
import { METAL } from './theme';

interface SlotCabinetProps {
  title?: string;
  children: ReactNode;
  lever: ReactNode;
  lightsMode: SlotLightsMode;
  reducedMotion?: boolean;
}

function CornerBolt({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos: Record<string, string> = {
    tl: 'top-2 left-2',
    tr: 'top-2 right-2',
    bl: 'bottom-2 left-2',
    br: 'bottom-2 right-2',
  };
  return (
    <div
      className={`absolute ${pos[corner]} rounded-full`}
      style={{
        width: 10,
        height: 10,
        background: 'radial-gradient(circle at 35% 30%,#f4f6f8,#9aa1ab 55%,#3d4149 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.5)',
      }}
    />
  );
}

export default function SlotCabinet({
  title = 'SLOT MACHINE',
  children,
  lever,
  lightsMode,
  reducedMotion = false,
}: SlotCabinetProps) {
  return (
    <div
      className="relative rounded-[2rem] px-4 pt-4 pb-6 sm:px-6 sm:pt-5 sm:pb-8"
      style={{
        background: METAL.bezel,
        boxShadow:
          METAL.bezelEdge +
          ', 0 30px 80px -16px rgba(0,0,0,0.8), 0 0 0 6px rgba(0,0,0,0.4), 0 0 70px -10px rgba(239,68,68,0.25)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-30" style={{ backgroundImage: METAL.brushed }} />
      <div
        className="pointer-events-none absolute inset-2 rounded-[1.7rem] animate-slot-ambient-pulse"
        style={{ boxShadow: '0 0 40px 4px rgba(239,68,68,0.18) inset' }}
      />

      <SlotLights mode={lightsMode} reducedMotion={reducedMotion} />
      <CornerBolt corner="tl" />
      <CornerBolt corner="tr" />
      <CornerBolt corner="bl" />
      <CornerBolt corner="br" />

      {/* Marquee header */}
      <div className="relative z-10 flex justify-center mb-3 sm:mb-4">
        <div
          className="px-5 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(180deg,#1a1c22,#0a0b0e)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.5)',
          }}
        >
          <span
            className={`text-[11px] sm:text-sm font-black tracking-[0.3em] text-red-400 ${
              reducedMotion ? '' : 'animate-slot-marquee-glow'
            }`}
          >
            {title}
          </span>
        </div>
      </div>

      {/* Body: reel window + lever side by side */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
        {children}
        {lever}
      </div>

      {/* Base plinth */}
      <div className="relative z-10 mt-4 sm:mt-5 flex justify-center">
        <div
          className="px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-[0.25em] text-white/30"
          style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.04),transparent)' }}
        >
          OMEGLEE CASINO
        </div>
      </div>
    </div>
  );
}
