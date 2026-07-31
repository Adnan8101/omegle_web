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
  const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  const formattedDate = targetDate 
    ? targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }) + ' 12:00 AM'
    : '';

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-24">
      <RevealGroup mount stagger={0.1} className="w-full max-w-lg text-center">
        <Item dir="none" scale={0.9} className="flex justify-center">
          <CartMascot size={250} />
        </Item>
        <Item>
          <h1 className="sx-display mt-1 text-[clamp(30px,6vw,44px)] font-extrabold text-[var(--sx-ink)]">
            <Words text="The shop is closed" mount delay={0.2} />
          </h1>
        </Item>
        <Item blur>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-[var(--sx-ink-2)]">
            We&apos;ve pulled the shutters down for a bit of maintenance. Your {currencyName} is safe.
            {mounted && targetDate && (
              <span className="block mt-2">
                The shop will be open on <strong className="text-[var(--sx-ink)]">{formattedDate}</strong>.
              </span>
            )}
          </p>
        </Item>
        {mounted && targetDate && (
          <Item blur className="mt-6 flex justify-center">
            <div className="flex flex-col items-center p-4 rounded-2xl border bg-white shadow-sm" style={{ borderColor: 'var(--sx-hair)' }}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--sx-ink-3)] mb-1">Opening In</span>
              <span className="text-3xl font-black text-[#5865F2] tabular-nums tracking-tight">{timeString}</span>
            </div>
          </Item>
        )}
        <Item className="mt-8 flex justify-center" scale={0.94}>
          <Magnetic strength={0.24} max={10}>
            <Link
              href="/"
              className="sx-focus group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[14px] font-bold text-black transition-colors hover:bg-[#eceaff]"
            >
              <FiArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Back to Omeglee
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
