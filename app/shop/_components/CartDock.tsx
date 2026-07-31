'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiArrowUpRight, FiCheck, FiClock, FiCopy, FiX } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatNumber, type PendingPurchase } from '../_lib/types';

interface CartDockProps {
  pending: PendingPurchase[];
  currencyEmoji: string;
  copiedCode: string | null;
  onCopy: (code: string) => void;
}

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * The mascot wheels your unredeemed codes around at the bottom-right of the
 * page. He leans out of his dock (the render is shot on black, so `screen`
 * blending drops the backdrop entirely), carries a live count, and opens a
 * panel with every code still waiting to be claimed.
 *
 * Only rendered for signed-in members — a guest has nothing in the basket.
 */
export default function CartDock({ pending, currencyEmoji, copiedCode, onCopy }: CartDockProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = pending.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed z-[60] right-4 sm:right-6"
      style={{ bottom: 'max(18px, env(safe-area-inset-bottom))' }}
    >
      {/* ══ Panel ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 340, damping: 30, mass: 0.75 }}
            className="absolute bottom-[calc(100%+14px)] right-0 w-[min(360px,calc(100vw-32px))] origin-bottom-right overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d12] shadow-2xl"
            role="dialog"
            aria-label="Codes waiting to be redeemed"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3B9EFF]/50 to-transparent" />

            <div className="flex items-start justify-between gap-3 px-5 pb-3.5 pt-4">
              <div>
                <h2 className="text-[14.5px] font-extrabold tracking-[-0.015em] text-white">
                  {count > 0 ? 'Waiting to be redeemed' : 'Nothing waiting'}
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-white/45">
                  {count > 0
                    ? 'DM the Omeglee bot with a code to claim it.'
                    : 'Everything you own has been claimed already.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>

            {count > 0 && (
              <ul className="max-h-[46vh] overflow-y-auto px-2.5 pb-1">
                {pending.map((purchase, index) => (
                  <motion.li
                    key={purchase.id}
                    initial={reduce ? false : { opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: index * 0.045 }}
                    className="mb-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5 transition-colors hover:border-white/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{purchase.itemName}</p>
                      <span className="flex flex-shrink-0 items-center gap-1 text-[12px] font-bold text-[#ffd77a]">
                        <CurrencyMark emoji={currencyEmoji} size={12} />
                        {formatNumber(purchase.pricePaid)}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-lg border border-white/8 bg-black/45 px-2.5 py-1.5 font-mono text-[12.5px] font-bold tracking-[0.14em] text-[#ffd77a]">
                        {purchase.redeemCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => onCopy(purchase.redeemCode)}
                        aria-label={`Copy code for ${purchase.itemName}`}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/8 transition-colors hover:bg-white/[0.07]"
                      >
                        {copiedCode === purchase.redeemCode ? (
                          <FiCheck className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <FiCopy className="h-3.5 w-3.5 text-white/45" />
                        )}
                      </button>
                    </div>

                    {purchase.expiresAt && (
                      <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-medium text-white/30">
                        <FiClock className="h-2.5 w-2.5" />
                        Expires {new Date(purchase.expiresAt).toLocaleString('en-US', dateFormat)}
                      </p>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}

            <div className="border-t border-white/8 p-2.5">
              <Link
                href="/purchases"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-white/[0.06]"
              >
                Open my stuff
                <FiArrowUpRight className="h-3.5 w-3.5 text-white/45 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Dock ════════════════════════════════════════════════════ */}
      <div className="relative flex justify-end">
        <motion.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          aria-label={count > 0 ? `${count} codes waiting to be redeemed` : 'Your purchases'}
          aria-expanded={open}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className={`relative flex h-[62px] items-center overflow-visible rounded-full border pl-[56px] pr-0 backdrop-blur-2xl sm:pl-[60px] ${
            count > 0 ? 'border-[#3B9EFF]/30' : 'border-white/10'
          }`}
          style={{ background: 'rgba(11,11,20,0.9)', boxShadow: '0 26px 54px -26px rgba(0,0,0,1)' }}
        >
          {/* the mascot leans out of the dock, idling with a gentle bob */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute bottom-[-6px] left-[-14px] block"
            style={{ width: 90, height: 90 }}
            animate={reduce ? undefined : { y: hovered ? -8 : [0, -6, 0] }}
            transition={
              reduce
                ? undefined
                : hovered
                ? { duration: 0.28, ease: 'easeOut' }
                : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <Image
              src="/Omegle_cart.png"
              alt=""
              width={90}
              height={90}
              className="select-none"
              style={{
                width: 90,
                height: 90,
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.75))',
                transform: hovered && !reduce ? 'scale(1.05)' : 'none',
                transition: 'transform 320ms ease-out',
              }}
              draggable={false}
            />
          </motion.span>

          {/* label reveals itself on hover / while open */}
          <motion.span
            initial={false}
            animate={{ width: hovered || open ? 'auto' : 0, opacity: hovered || open ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden whitespace-nowrap"
          >
            <span className="block pr-5 text-left">
              <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.15em] text-white/35">
                {count > 0 ? 'Unredeemed' : 'My stuff'}
              </span>
              <span className="mt-0.5 block text-[13px] font-extrabold text-white">
                {count > 0 ? `${count} code${count === 1 ? '' : 's'} waiting` : 'All claimed'}
              </span>
            </span>
          </motion.span>

          {/* count badge */}
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                initial={reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#3B9EFF] px-1 text-[11px] font-black tabular-nums text-white"
                style={{ boxShadow: '0 0 0 2px rgba(11,11,20,0.9)' }}
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>

          {!(hovered || open) && <span aria-hidden style={{ width: 6 }} />}
        </motion.button>
      </div>
    </div>
  );
}
