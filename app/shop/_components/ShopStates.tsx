'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiArrowUpRight, FiSearch, FiX } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';
import { Item, Magnetic, Reveal, RevealGroup, Words } from '@/components/motion';

/** The mascot with an empty basket — reused wherever there's nothing to show. */
function CartMascot({ size = 260, className = '' }: { size?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-[8%] ${reduce ? '' : 'sx-halo'}`}
        style={{
          background: 'radial-gradient(circle at 50% 55%, rgba(124,106,245,0.34) 0%, transparent 68%)',
          filter: 'blur(34px)',
        }}
      />
      <Image
        src="/Omegle_cart.png"
        alt=""
        width={size}
        height={size}
        className={`sx-cutout relative select-none ${reduce ? '' : 'sx-bob'}`}
        style={{ width: size, height: size, filter: 'drop-shadow(0 26px 40px rgba(0,0,0,0.6))' }}
        draggable={false}
      />
    </div>
  );
}

/** No listings at all — the shelves themselves are bare. */
export function EmptyShelves({ currencyName }: { currencyName: string }) {
  return (
    <Reveal dir="up" distance={24} scale={0.98}>
      <div
        className="sx-panel sx-shelf relative overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16"
        style={{ borderRadius: 'var(--sx-r-xl)' }}
      >
        <div className="mx-auto flex max-w-md flex-col items-center">
          <CartMascot size={240} />
          <h2 className="sx-display mt-2 text-[26px] font-extrabold text-[var(--sx-ink)] sm:text-[30px]">
            The shelves are bare
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--sx-ink-3)]">
            Nothing is listed right now. New rewards get added regularly — keep earning {currencyName} in
            the server and check back soon.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Magnetic strength={0.22} max={9}>
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="sx-focus inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-bold text-white"
                style={{ background: '#5865F2', boxShadow: '0 14px 32px -18px rgba(88,101,242,0.9)' }}
              >
                <FaDiscord className="h-4 w-4" />
                Open Discord
              </a>
            </Magnetic>
            <Link
              href="/recent-purchases"
              className="sx-focus group inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[13.5px] font-semibold text-[var(--sx-ink)]"
              style={{ borderColor: 'var(--sx-hair)' }}
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
      className="sx-panel px-6 py-14 text-center"
      style={{ borderRadius: 'var(--sx-r-xl)' }}
    >
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border"
        style={{ borderColor: 'var(--sx-hair)', background: 'rgba(255,255,255,0.04)' }}
      >
        <FiSearch className="h-6 w-6 text-[var(--sx-ink-3)]" />
      </span>
      <h2 className="mt-5 text-[19px] font-extrabold tracking-[-0.02em] text-[var(--sx-ink)]">
        Nothing matches {query ? `“${query.trim()}”` : 'those filters'}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--sx-ink-3)]">
        Try a shorter search, or clear the filters to see the whole shop again.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="sx-focus mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-black transition-colors hover:bg-[#eceaff]"
      >
        Show everything
      </button>
    </motion.div>
  );
}

/** Shop toggled off by an admin. */
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

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
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
      {/* Subtle background glow */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5865F2] opacity-10 blur-[120px]" />
      </div>

      <RevealGroup mount stagger={0.12} className="relative z-10 w-full max-w-2xl text-center">
        <Item className="flex justify-center mb-8" scale={0.95}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-b from-[#5865F2]/20 to-transparent blur-2xl" />
            <CartMascot size={200} className="relative z-10 drop-shadow-2xl" />
          </div>
        </Item>

        <Item>
          <h1 className="sx-display text-[clamp(2.2rem,5vw,3.5rem)] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[var(--sx-ink)] to-[var(--sx-ink-3)] drop-shadow-sm pb-1">
            <Words text="The Shop is Resting" mount delay={0.2} />
          </h1>
        </Item>

        <Item blur className="mt-4">
          <div className="mx-auto max-w-lg space-y-2">
            <p className="text-[15px] sm:text-[16px] leading-relaxed text-[var(--sx-ink-2)] font-medium">
              We&apos;re currently doing a little maintenance and restocking our shelves. 
              Don&apos;t worry, your <strong className="font-bold text-[var(--sx-ink)]">{currencyName}</strong> is perfectly safe.
            </p>
            {mounted && targetDate && (
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#5865F2] drop-shadow-sm">
                We will reopen on {formattedDate}.
              </p>
            )}
          </div>
        </Item>

        {mounted && targetDate && (
          <Item blur className="mt-10 flex justify-center">
            <div className="relative flex flex-col items-center">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[rgb(var(--color-bg-primary))] px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sx-ink-3)] z-10 rounded-full">
                Opening In
              </span>
              <div className="flex gap-4 sm:gap-6 rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl" style={{ borderColor: 'var(--sx-hair)', background: 'rgba(255, 255, 255, 0.03)' }}>
                {/* Hours */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-transparent border border-[var(--sx-hair)] shadow-inner">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter text-[var(--sx-ink)]">
                      {pad(hours)}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[var(--sx-ink-3)]">Hours</span>
                </div>

                <div className="flex items-center text-2xl font-black text-[var(--sx-ink-3)] -mt-6">:</div>

                {/* Minutes */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-transparent border border-[var(--sx-hair)] shadow-inner">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter text-[var(--sx-ink)]">
                      {pad(minutes)}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[var(--sx-ink-3)]">Mins</span>
                </div>

                <div className="flex items-center text-2xl font-black text-[var(--sx-ink-3)] -mt-6">:</div>

                {/* Seconds */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-b from-[#5865F2]/10 to-transparent border border-[#5865F2]/30 shadow-inner">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter text-[#5865F2]">
                      {pad(seconds)}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#5865F2]">Secs</span>
                </div>
              </div>
            </div>
          </Item>
        )}

        <Item className="mt-12 flex justify-center" scale={0.96}>
          <Magnetic strength={0.3} max={15}>
            <Link
              href="/"
              className="sx-focus group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-[#5865F2] px-8 py-4 text-[14px] font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-[0_12px_30px_-10px_rgba(88,101,242,0.6)] hover:bg-[#4752C4]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
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
      <div
        className="flex flex-wrap items-center justify-between gap-4 border px-5 py-4"
        style={{
          borderRadius: 'var(--sx-r-lg)',
          borderColor: 'rgba(88,101,242,0.26)',
          background: 'linear-gradient(120deg, rgba(88,101,242,0.13), rgba(88,101,242,0.03) 62%)',
        }}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(88,101,242,0.18)' }}
          >
            <FaDiscord className="h-5 w-5 text-[#aab4ff]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-[var(--sx-ink)]">You&apos;re browsing as a guest</p>
            <p className="mt-0.5 text-[12.5px] text-[var(--sx-ink-3)]">
              Sign in with Discord to see your balance and buy anything here.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="sx-focus inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-bold text-white transition-transform duration-200 active:scale-[0.98]"
          style={{ background: '#5865F2', boxShadow: '0 12px 26px -16px rgba(88,101,242,0.95)' }}
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
          className="fixed inset-x-4 bottom-5 z-[90] mx-auto flex max-w-[520px] items-start gap-3 border p-4 sm:bottom-7"
          style={{
            borderRadius: 'var(--sx-r-md)',
            borderColor: 'rgba(251,113,133,0.3)',
            background: 'rgba(26,8,14,0.9)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: '0 30px 70px -30px rgba(0,0,0,1)',
          }}
        >
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(251,113,133,0.16)' }}
          >
            <FiAlertCircle className="h-4 w-4 text-[#ff9aa6]" />
          </span>
          <p className="flex-1 pt-1 text-[13px] font-medium leading-relaxed text-[#ffd8dd]">{message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="sx-focus mt-1 flex-shrink-0 text-[#ff9aa6] transition-colors hover:text-white"
          >
            <FiX className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
