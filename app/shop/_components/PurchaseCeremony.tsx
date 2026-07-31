'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation, useReducedMotion } from 'framer-motion';
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiCheck,
  FiClock,
  FiCopy,
  FiEye,
  FiMessageCircle,
  FiPackage,
  FiVolume2,
  FiVolumeX,
  FiX,
} from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatNumber } from '../_lib/types';
import ParticleField from './ceremony/ParticleField';
import RewardCrate from './ceremony/RewardCrate';
import { useCeremonySound } from './ceremony/useCeremonySound';
import type { CeremonyPhase } from './ceremony/types';

interface PurchaseCeremonyProps {
  itemName: string;
  itemThumbnail: string | null;
  itemValueInr?: number | null;
  pricePaid: number;
  currencyEmoji: string;
  redeemCode: string;
  expiresAt: string | null;
  replyMessage: string | null;
  dmSent: boolean;
  userAvatar: string | null;
  onClose: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const SOUND_KEY = 'omeglee:ceremony-sound';

const PHASE_ORDER: CeremonyPhase[] = ['focus', 'drop', 'anticipate', 'opening', 'reveal', 'receipt'];
const PHASE_MS: Record<Exclude<CeremonyPhase, 'receipt'>, number> = {
  focus: 480,
  drop: 550,
  anticipate: 1050,
  opening: 800,
  reveal: 1650,
};

/**
 * The reward moment, in full: background focus → box drop → anticipation →
 * lid opening → item reveal → a fade into the receipt below. Every beat
 * advances itself on a timer; a skip control and Escape both jump straight
 * to the receipt, and `prefers-reduced-motion` starts there outright.
 */
export default function PurchaseCeremony({
  itemName,
  itemThumbnail,
  itemValueInr,
  pricePaid,
  currencyEmoji,
  redeemCode,
  expiresAt,
  replyMessage,
  dmSent,
  userAvatar,
  onClose,
}: PurchaseCeremonyProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<CeremonyPhase>(reduce ? 'receipt' : 'focus');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stage = useAnimation();
  const playCue = useCeremonySound(soundOn);

  useEffect(() => {
    try {
      setSoundOn(window.localStorage.getItem(SOUND_KEY) === '1');
    } catch {
      /* no-op */
    }
  }, []);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('receipt');
  };

  useEffect(() => {
    if (reduce) return;
    let elapsed = 0;
    for (let i = 1; i < PHASE_ORDER.length; i++) {
      const prev = PHASE_ORDER[i - 1] as Exclude<CeremonyPhase, 'receipt'>;
      elapsed += PHASE_MS[prev];
      const target = PHASE_ORDER[i];
      timers.current.push(setTimeout(() => setPhase(target), elapsed));
    }
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduce]);

  useEffect(() => {
    if (phase === 'drop') playCue('drop');
    if (phase === 'opening') playCue('open');
    if (phase === 'reveal') playCue('chime');
    if (phase === 'anticipate' && !reduce) {
      stage.start({ x: [0, -5, 5, -3, 3, -1, 1, 0] }, { duration: 0.36, ease: 'easeOut' });
    }
  }, [phase, playCue, reduce, stage]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (phase !== 'receipt') skip();
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? '1' : '0');
      } catch {
        /* no-op */
      }
      return next;
    });
  };

  const copy = () => {
    navigator.clipboard.writeText(redeemCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const note = replyMessage?.replace(/<@\d+>/g, '').trim();
  const cinematic = phase !== 'receipt';

  return (
    <div
      className="fixed inset-0 z-[95]"
      role="dialog"
      aria-modal="true"
      aria-label={cinematic ? `Opening ${itemName}` : `${itemName} purchased`}
    >
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="fixed inset-0 bg-black/92 backdrop-blur-xl"
      />

      {!reduce && cinematic && (
        <ParticleField
          mode="ambient"
          count={22}
          colors={['#ffd77a40', '#ffffff30', '#7cc4ff30']}
          className="pointer-events-none fixed inset-0"
        />
      )}

      {cinematic && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOn ? 'Mute ceremony sound' : 'Unmute ceremony sound'}
          className="fixed left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 backdrop-blur-md transition-colors hover:text-white"
        >
          {soundOn ? <FiVolume2 className="h-4 w-4" /> : <FiVolumeX className="h-4 w-4" />}
        </button>
      )}

      <AnimatePresence mode="wait">
        {cinematic ? (
          <motion.div
            key="stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-0 flex flex-col items-center justify-center px-6"
          >
            <motion.div animate={stage} className="relative flex flex-col items-center">
              <RewardCrate phase={phase} />

              {phase === 'anticipate' && (
                <ParticleField
                  mode="burst"
                  count={30}
                  originY={0.82}
                  colors={['#d4d4dc', '#8f8f99']}
                  className="pointer-events-none absolute inset-[-40px]"
                />
              )}
              {(phase === 'opening' || phase === 'reveal') && (
                <ParticleField
                  mode="burst"
                  count={64}
                  originY={0.4}
                  colors={['#ffd77a', '#ffffff', '#ffb84d']}
                  className="pointer-events-none absolute inset-[-90px]"
                />
              )}

              <AnimatePresence>
                {phase === 'reveal' && (
                  <motion.div
                    key="reveal-content"
                    initial={{ opacity: 0, y: 26, scale: 0.92 }}
                    animate={{ opacity: 1, y: -18, scale: 1 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="absolute bottom-full mb-2 flex flex-col items-center text-center"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                      className="h-[104px] w-[104px] overflow-hidden rounded-[22px] border border-[#ffd77a]/30 bg-white/[0.04]"
                      style={{ boxShadow: '0 0 40px -8px rgba(255,215,122,0.5)' }}
                    >
                      {itemThumbnail ? (
                        <img src={itemThumbnail} alt={itemName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <FiPackage className="h-10 w-10 text-white/25" />
                        </span>
                      )}
                    </motion.div>
                    <h2 className="mt-4 max-w-[22ch] text-[22px] font-extrabold tracking-[-0.02em] text-white">
                      {itemName}
                    </h2>
                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 tabular-nums">
                        <CurrencyMark emoji={currencyEmoji} size={13} />
                        <span className="text-[#ffd77a]">{formatNumber(pricePaid)}</span>
                      </span>
                      {itemValueInr ? (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-bold text-emerald-300">
                          ₹{formatNumber(itemValueInr)} value
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <button
              type="button"
              onClick={skip}
              className="absolute bottom-8 text-[12px] font-semibold text-white/30 transition-colors hover:text-white/60"
            >
              Skip
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="receipt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="fixed inset-0 overflow-y-auto overscroll-contain"
          >
            <div className="flex min-h-full items-center justify-center px-4 py-8 sm:py-12">
              <div className="relative w-full max-w-[440px]">
                {/* ══ Mark + item ═══════════════════════════════════════ */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={
                      reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 340, damping: 22, mass: 0.7 }
                    }
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15"
                  >
                    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
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
                  </motion.div>

                  <motion.p
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
                    className="mt-3.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-emerald-400"
                  >
                    Purchase complete
                  </motion.p>

                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.14 }}
                    className="mt-5 h-[92px] w-[92px] overflow-hidden rounded-[20px] border border-white/15 bg-white/[0.04]"
                  >
                    {itemThumbnail ? (
                      <img src={itemThumbnail} alt={itemName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <FiPackage className="h-9 w-9 text-white/25" />
                      </span>
                    )}
                  </motion.div>

                  <motion.h2
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE, delay: 0.28 }}
                    className="mt-4 max-w-[19ch] text-center text-[23px] font-extrabold tracking-[-0.02em] text-white"
                  >
                    {itemName}
                  </motion.h2>

                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.38 }}
                    className="mt-2.5 flex flex-wrap items-center justify-center gap-2"
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/45 tabular-nums">
                      Paid <CurrencyMark emoji={currencyEmoji} size={13} />
                      <span className="text-[#ffd77a]">{formatNumber(pricePaid)}</span>
                    </span>
                    {itemValueInr ? (
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-bold text-emerald-300">
                        ₹{formatNumber(itemValueInr)} value
                      </span>
                    ) : null}
                  </motion.div>
                </div>

                {/* ══ Receipt ═══════════════════════════════════════════ */}
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.3 }}
                  className="relative mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d12]"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
                  >
                    <FiX className="h-4 w-4" />
                  </button>

                  <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                    {/* ── Code ─────────────────────────────────────────── */}
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Redeem code</p>
                    <div className="relative mt-2.5 flex h-[56px] items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] px-4">
                      <code
                        className={`select-all font-mono text-[20px] font-black tracking-[0.18em] text-[#ffd77a] transition-all duration-500 ${
                          revealed ? 'opacity-100 blur-0' : 'select-none opacity-30 blur-[6px]'
                        }`}
                      >
                        {redeemCode}
                      </code>

                      {!revealed ? (
                        <button
                          type="button"
                          onClick={() => setRevealed(true)}
                          className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-[12px] font-extrabold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-white"
                        >
                          <FiEye className="h-3.5 w-3.5" />
                          Reveal code
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={copy}
                          aria-label="Copy redeem code"
                          className="absolute right-2.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-black/50 transition-colors hover:bg-white/[0.07]"
                        >
                          {copied ? (
                            <FiCheck className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <FiCopy className="h-4 w-4 text-white/45" />
                          )}
                        </button>
                      )}
                    </div>

                    {expiresAt && (
                      <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-white/30">
                        <FiClock className="h-3 w-3" />
                        Expires{' '}
                        {new Date(expiresAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}

                    {/* ── DM status ────────────────────────────────────── */}
                    <div
                      className={`mt-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
                        dmSent ? 'border-emerald-400/25 bg-emerald-400/10' : 'border-red-400/25 bg-red-400/10'
                      }`}
                    >
                      {dmSent ? (
                        <FiCheck className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                      ) : (
                        <FiAlertCircle className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-red-300" />
                      )}
                      <p
                        className={`text-[12.5px] font-semibold leading-snug ${dmSent ? 'text-emerald-300' : 'text-red-200'}`}
                      >
                        {dmSent
                          ? 'Receipt sent to your Discord DMs.'
                          : 'We couldn’t DM you — open your DMs, and keep this code somewhere safe.'}
                      </p>
                    </div>

                    {note && (
                      <p className="mt-3 border-l-2 border-[#3B9EFF]/50 pl-3.5 text-[12.5px] leading-relaxed text-white/65">
                        {note}
                      </p>
                    )}

                    {/* ── How to claim ─────────────────────────────────── */}
                    <div className="mt-4 rounded-xl border border-white/8 p-3.5">
                      <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-white/45">
                        <FiMessageCircle className="h-3.5 w-3.5 text-[#7cc4ff]" />
                        How to claim it
                      </p>
                      <ol className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-white/65">
                        <li className="flex gap-2.5">
                          <span className="text-white/30">1</span>
                          <span>
                            Open Discord and DM <span className="font-bold text-[#7cc4ff]">Omeglee Bot</span>
                          </span>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="text-white/30">2</span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            Send
                            <code className="rounded bg-black/45 px-1.5 py-0.5 font-mono text-[11.5px] font-bold text-[#ffd77a]">
                              /redeem {redeemCode}
                            </code>
                          </span>
                        </li>
                      </ol>
                    </div>

                    {/* ── Account + actions ────────────────────────────── */}
                    <div className="mt-5 flex items-center gap-2.5">
                      <img
                        src={userAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt=""
                        className="h-6 w-6 rounded-full border border-white/15 object-cover"
                      />
                      <span className="text-[11.5px] font-medium text-white/30">Delivered to your connected account</span>
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={onClose}
                        className="h-12 flex-[1.4] rounded-xl bg-white text-[13.5px] font-extrabold text-black transition-all duration-200 hover:bg-gray-100 active:scale-[0.98]"
                      >
                        Keep shopping
                      </button>
                      <Link
                        href="/purchases"
                        className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 text-[13.5px] font-bold text-white transition-all duration-200 hover:bg-white/[0.05] active:scale-[0.98]"
                      >
                        My stuff
                        <FiArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
