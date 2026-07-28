'use client';
import { useState } from 'react';
import { FiX, FiZap } from 'react-icons/fi';
import { Magnetic, Reveal } from '@/components/motion';

export default function ExploreEventsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Magnetic strength={0.22} max={9}>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center px-7 py-[13px] bg-transparent border border-white/25 hover:border-white/60 text-white font-semibold rounded-full text-[15px] leading-none transition-colors"
        >
          Explore Events
        </button>
      </Magnetic>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <Reveal mount dir="up" scale={0.9} duration={0.4} className="w-full max-w-md">
            <div className="bg-[#0a0a0f] border border-[rgb(var(--color-border))]/60 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-3xl w-full p-6 sm:p-8 relative overflow-hidden flex flex-col items-center text-center">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50 blur-xl pointer-events-none" />
              
              <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-[rgb(var(--color-text-tertiary))] hover:text-white transition-colors z-10 p-2">
                <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 mb-5 sm:mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10 mt-2">
                <FiZap className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 z-10 tracking-tight">
                Want more events?
              </h2>
              
              <p className="text-[rgb(var(--color-text-secondary))] mb-8 z-10 leading-relaxed text-sm sm:text-base">
                Join our Discord server to participate in live tournaments, bingo nights, and claim massive Ozy rewards!
              </p>
              
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 sm:py-4 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 z-10 text-[15px] sm:text-base"
              >
                Join Server
              </a>
            </div>
          </Reveal>
        </div>
      )}
    </>
  );
}
