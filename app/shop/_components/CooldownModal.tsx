'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';

interface CooldownModalProps {
  open: boolean;
  user: { name?: string | null; image?: string | null; id?: string | null } | null;
  label: string;
  availableAt: string | null;
  onClose: () => void;
}

/**
 * Shown when a member tries to buy while the shop-wide purchase cooldown is
 * still active. One clear number — how long is left — and when it lifts.
 */
export default function CooldownModal({ open, user, label, availableAt, onClose }: CooldownModalProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 330, damping: 30 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d12] p-6 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-400/15">
              <FiClock className="h-8 w-8 text-orange-300" />
            </div>
            <h3 className="text-xl font-bold text-white">Purchase cooldown active</h3>
            <p className="mt-1 text-sm text-white/50">You can buy your next item once the cooldown ends.</p>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-left">
              <img
                src={user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt=""
                className="h-11 w-11 rounded-full border border-white/10"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{user?.name || 'Discord user'}</p>
                <p className="truncate text-[11px] text-white/35">ID: {user?.id || ''}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-400/25 bg-orange-400/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300/80">Time remaining</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-orange-300">{label}</p>
              <p className="mt-1 text-[11px] text-white/35">HH:MM</p>
              {availableAt && (
                <p className="mt-2 text-[11px] text-white/45">
                  Unlocks at{' '}
                  {new Date(availableAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
