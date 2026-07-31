'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiArrowUpRight, FiSearch, FiX } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import { Item, Magnetic, Reveal, RevealGroup, Words } from '@/components/motion';

/** The mascot with an empty basket — reused wherever there's nothing to show. */
function CartMascot({ size = 260, className = '' }: { size?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%]"
        style={{
          background: 'radial-gradient(circle at 50% 55%, rgba(59,158,255,0.28) 0%, transparent 68%)',
          filter: 'blur(34px)',
        }}
      />
      <motion.div
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={reduce ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/Omegle_cart.png"
          alt=""
          width={size}
          height={size}
          className="relative select-none"
          style={{ width: size, height: size, mixBlendMode: 'screen', filter: 'drop-shadow(0 26px 40px rgba(0,0,0,0.6))' }}
          draggable={false}
        />
      </motion.div>
    </div>
  );
}

/** No listings at all — the shelves themselves are bare. */
export function EmptyShelves({ currencyName }: { currencyName: string }) {
  return (
    <Reveal dir="up" distance={24} scale={0.98}>
      <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <CartMascot size={240} />
          <h2 className="mt-2 text-[26px] font-extrabold text-white sm:text-[30px]">The shelves are bare</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/45">
            Nothing is listed right now. New rewards get added regularly — keep earning {currencyName} in
            the server and check back soon.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Magnetic strength={0.22} max={9}>
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-6 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-[#4752C4]"
              >
                <FaDiscord className="h-4 w-4" />
                Open Discord
              </a>
            </Magnetic>
            <Link
              href="/recent-purchases"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[13.5px] font-semibold text-white"
            >
              See past purchases
              <FiArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/** Filters excluded everything. */
export function NoMatches({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-14 text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <FiSearch className="h-6 w-6 text-white/40" />
      </span>
      <h2 className="mt-5 text-[19px] font-extrabold tracking-[-0.02em] text-white">
        Nothing matches {query ? `“${query.trim()}”` : 'those filters'}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/45">
        Try a shorter search, or clear the filters to see the whole shop again.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-black transition-colors hover:bg-gray-100"
      >
        Show everything
      </button>
    </motion.div>
  );
}

/** Shop toggled off by an admin — counts down to the next scheduled reopen. */
export function ShopClosed({ currencyName }: { currencyName: string }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    const currentDate = new Date();
    // Next day at 12:00 AM
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    setTargetDate(nextDay);

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = targetDate ? Math.max(0, targetDate.getTime() - now) : 0;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const formattedDate = targetDate
    ? targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }) + ' at 12:00 AM'
    : '';

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5865F2] opacity-10 blur-[120px]" />
      </div>

      <RevealGroup mount stagger={0.12} className="relative z-10 w-full max-w-2xl text-center">
        <Item className="mb-8 flex justify-center" scale={0.95}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-[#5865F2]/20 to-transparent blur-2xl" />
            <CartMascot size={200} className="relative z-10 drop-shadow-2xl" />
          </div>
        </Item>

        <Item>
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-black tracking-tight text-white">
            <Words text="The Shop is Resting" mount delay={0.2} />
          </h1>
        </Item>

        <Item blur className="mt-4">
          <div className="mx-auto max-w-lg space-y-2">
            <p className="text-[15px] font-medium leading-relaxed text-white/60 sm:text-[16px]">
              We&apos;re currently doing a little maintenance and restocking our shelves. Don&apos;t worry,
              your <strong className="font-bold text-white">{currencyName}</strong> is perfectly safe.
            </p>
            {mounted && targetDate && (
              <p className="text-[14px] font-semibold text-[#7cc4ff] sm:text-[15px]">
                We will reopen on {formattedDate}.
              </p>
            )}
          </div>
        </Item>

        {mounted && targetDate && (
          <Item blur className="mt-10 flex justify-center">
            <div className="relative flex flex-col items-center">
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                Opening in
              </span>
              <div className="flex gap-4 rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-2xl sm:gap-6 sm:p-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-transparent sm:h-20 sm:w-20">
                    <span className="text-3xl font-black tabular-nums tracking-tighter text-white sm:text-4xl">
                      {pad(hours)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 sm:text-[11px]">
                    Hours
                  </span>
                </div>

                <div className="-mt-6 flex items-center text-2xl font-black text-white/30">:</div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-transparent sm:h-20 sm:w-20">
                    <span className="text-3xl font-black tabular-nums tracking-tighter text-white sm:text-4xl">
                      {pad(minutes)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 sm:text-[11px]">
                    Mins
                  </span>
                </div>

                <div className="-mt-6 flex items-center text-2xl font-black text-white/30">:</div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#5865F2]/30 bg-gradient-to-b from-[#5865F2]/10 to-transparent sm:h-20 sm:w-20">
                    <span className="text-3xl font-black tabular-nums tracking-tighter text-[#7cc4ff] sm:text-4xl">
                      {pad(seconds)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7cc4ff] sm:text-[11px]">
                    Secs
                  </span>
                </div>
              </div>
            </div>
          </Item>
        )}

        <Item className="mt-12 flex justify-center" scale={0.96}>
          <Magnetic strength={0.3} max={15}>
            <Link
              href="/"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#5865F2] px-8 py-4 text-[14px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(88,101,242,0.6)] transition-transform hover:scale-105 hover:bg-[#4752C4] active:scale-95"
            >
              <FiArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              Return to Homepage
            </Link>
          </Magnetic>
        </Item>
      </RevealGroup>
    </div>
  );
}

/** Guests can browse everything; they just can't check out. */
export function GuestNote({ onSignIn }: { onSignIn: () => void }) {
  return (
    <Reveal dir="up" distance={14}>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-5 py-4">
        <p className="min-w-0 text-[13px] leading-relaxed text-white/55">
          You&apos;re browsing as a guest. Sign in with Discord to view your balance and purchase rewards.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2.5 text-[12.5px] font-bold text-white transition-transform duration-200 hover:bg-[#4752C4] active:scale-[0.98]"
        >
          <FaDiscord className="h-3.5 w-3.5" />
          Sign in
        </button>
      </div>
    </Reveal>
  );
}

/** Purchase failures and guard messages. */
export function ErrorToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 30, mass: 0.7 }}
          className="fixed inset-x-4 bottom-5 z-[90] mx-auto flex max-w-[520px] items-start gap-3 rounded-2xl border border-red-400/25 bg-[#1a080e]/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-7"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-400/15">
            <FiAlertCircle className="h-4 w-4 text-red-300" />
          </span>
          <p className="flex-1 pt-1 text-[13px] font-medium leading-relaxed text-red-100">{message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="mt-1 flex-shrink-0 text-red-300 transition-colors hover:text-white"
          >
            <FiX className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
