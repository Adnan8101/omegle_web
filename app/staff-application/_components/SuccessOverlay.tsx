'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function SuccessOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        >
          <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Application submitted"
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0f] p-8 text-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 320, damping: 26, mass: 0.8 }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.22) 0%, transparent 70%)' }}
            />

            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
              <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden>
                <motion.path
                  d="M8 16.8 13.4 22 24 11"
                  stroke="#34D399"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
                />
              </svg>
            </div>

            <h2 className="relative text-[22px] font-extrabold tracking-[-0.02em] text-white">Application submitted</h2>
            <p className="relative mt-2.5 text-[13.5px] leading-relaxed text-white/50">
              We&apos;ve received it. If you&apos;re shortlisted, expect a message within two weeks.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="fx-focus relative mt-7 w-full rounded-full bg-white py-3.5 text-[13.5px] font-extrabold text-black transition-colors hover:bg-slate-100"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
