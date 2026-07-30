'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiCheck,
  FiClock,
  FiCopy,
  FiEye,
  FiMessageCircle,
  FiPackage,
  FiX,
} from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';
import { formatNumber } from '../_lib/types';

interface SuccessRevealProps {
  itemName: string;
  itemThumbnail: string | null;
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

/**
 * The reward moment, understated: a checkmark draws itself, the item settles
 * into place, and the receipt — code, DM status, how to claim it — follows.
 * No confetti canvas, no multi-ring pulse. The moment reads as earned, not
 * performed.
 */
export default function SuccessReveal({
  itemName,
  itemThumbnail,
  pricePaid,
  currencyEmoji,
  redeemCode,
  expiresAt,
  replyMessage,
  dmSent,
  userAvatar,
  onClose,
}: SuccessRevealProps) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const copy = () => {
    navigator.clipboard.writeText(redeemCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const note = replyMessage?.replace(/<@\d+>/g, '').trim();

  return (
    <div
      className="fixed inset-0 z-[95] flex justify-center overflow-y-auto overscroll-contain px-4 py-8 sm:items-center sm:py-12"
      role="dialog"
      aria-modal="true"
      aria-label={`${itemName} purchased`}
    >
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.36, ease: EASE }}
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* ══ Mark + item ═════════════════════════════════════════════ */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 340, damping: 22, mass: 0.7 }}
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.34)' }}
          >
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
              <path
                d="M8 16.8 13.4 22 24 11"
                stroke="#6ee7b7"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="sx-draw"
              />
            </svg>
          </motion.div>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
            className="mt-3.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-[#6ee7b7]"
          >
            Purchase complete
          </motion.p>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.14 }}
            className="mt-5 h-[92px] w-[92px] overflow-hidden"
            style={{ borderRadius: 20, border: '1px solid var(--sx-hair-2)', background: 'rgba(255,255,255,0.04)' }}
          >
            {itemThumbnail ? (
              <img src={itemThumbnail} alt={itemName} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <FiPackage className="h-9 w-9 text-[var(--sx-ink-4)]" />
              </span>
            )}
          </motion.div>

          <motion.h2
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.28 }}
            className="sx-display mt-4 max-w-[19ch] text-center text-[23px] font-extrabold text-[var(--sx-ink)]"
          >
            {itemName}
          </motion.h2>

          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.38 }}
            className="sx-num mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--sx-ink-3)]"
          >
            Paid <CurrencyMark emoji={currencyEmoji} size={13} />
            <span className="text-[#ffd77a]">{formatNumber(pricePaid)}</span>
          </motion.span>
        </div>

        {/* ══ Receipt ═════════════════════════════════════════════════ */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.3 }}
          className="sx-panel-solid relative mt-6 overflow-hidden"
          style={{ borderRadius: 'var(--sx-r-xl)' }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="sx-focus absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[var(--sx-ink-3)] transition-colors hover:bg-white/[0.07] hover:text-[var(--sx-ink)]"
            style={{ borderColor: 'var(--sx-hair)' }}
          >
            <FiX className="h-4 w-4" />
          </button>

          <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            {/* ── Code ─────────────────────────────────────────────── */}
            <p className="sx-eyebrow">Redeem code</p>
            <div
              className="relative mt-2.5 flex h-[56px] items-center justify-center overflow-hidden px-4"
              style={{ borderRadius: 'var(--sx-r-md)', border: '1px solid var(--sx-hair)', background: 'rgba(255,255,255,0.03)' }}
            >
              <code
                className={`sx-mono select-all text-[20px] font-black tracking-[0.18em] text-[#ffd77a] transition-all duration-500 ${
                  revealed ? 'opacity-100 blur-0' : 'select-none opacity-30 blur-[6px]'
                }`}
              >
                {redeemCode}
              </code>

              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="sx-focus absolute inset-0 flex items-center justify-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--sx-ink-2)] transition-colors hover:text-[var(--sx-ink)]"
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  <FiEye className="h-3.5 w-3.5" />
                  Reveal code
                </button>
              ) : (
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copy redeem code"
                  className="sx-focus absolute right-2.5 flex h-9 w-9 items-center justify-center rounded-[var(--sx-r-xs)] border transition-colors hover:bg-white/[0.07]"
                  style={{ borderColor: 'var(--sx-hair)', background: 'rgba(0,0,0,0.5)' }}
                >
                  {copied ? (
                    <FiCheck className="h-4 w-4 text-[#6ee7b7]" />
                  ) : (
                    <FiCopy className="h-4 w-4 text-[var(--sx-ink-3)]" />
                  )}
                </button>
              )}
            </div>

            {expiresAt && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--sx-ink-4)]">
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

            {/* ── DM status ────────────────────────────────────────── */}
            <div
              className="mt-4 flex items-start gap-2.5 border px-3.5 py-3"
              style={
                dmSent
                  ? { borderRadius: 'var(--sx-r-sm)', borderColor: 'rgba(52,211,153,0.28)', background: 'rgba(52,211,153,0.09)' }
                  : { borderRadius: 'var(--sx-r-sm)', borderColor: 'rgba(251,113,133,0.28)', background: 'rgba(251,113,133,0.09)' }
              }
            >
              {dmSent ? (
                <FiCheck className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-[#6ee7b7]" />
              ) : (
                <FiAlertCircle className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-[#ff9aa6]" />
              )}
              <p className="text-[12.5px] font-semibold leading-snug" style={{ color: dmSent ? '#6ee7b7' : '#ffb1bb' }}>
                {dmSent
                  ? 'Receipt sent to your Discord DMs.'
                  : 'We couldn’t DM you — open your DMs, and keep this code somewhere safe.'}
              </p>
            </div>

            {note && (
              <p
                className="mt-3 border-l-2 pl-3.5 text-[12.5px] leading-relaxed text-[var(--sx-ink-2)]"
                style={{ borderColor: 'rgba(124,106,245,0.5)' }}
              >
                {note}
              </p>
            )}

            {/* ── How to claim ─────────────────────────────────────── */}
            <div className="mt-4 border p-3.5" style={{ borderRadius: 'var(--sx-r-sm)', borderColor: 'var(--sx-hair)' }}>
              <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-[var(--sx-ink-3)]">
                <FiMessageCircle className="h-3.5 w-3.5 text-[#aab4ff]" />
                How to claim it
              </p>
              <ol className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--sx-ink-2)]">
                <li className="flex gap-2.5">
                  <span className="sx-num text-[var(--sx-ink-4)]">1</span>
                  <span>
                    Open Discord and DM <span className="font-bold text-[#aab4ff]">Omeglee Bot</span>
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="sx-num text-[var(--sx-ink-4)]">2</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    Send
                    <code
                      className="sx-mono rounded px-1.5 py-0.5 text-[11.5px] font-bold text-[#ffd77a]"
                      style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid var(--sx-hair)' }}
                    >
                      /redeem {redeemCode}
                    </code>
                  </span>
                </li>
              </ol>
            </div>

            {/* ── Account + actions ────────────────────────────────── */}
            <div className="mt-5 flex items-center gap-2.5">
              <img
                src={userAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
                style={{ boxShadow: '0 0 0 1.5px var(--sx-hair-2)' }}
              />
              <span className="text-[11.5px] font-medium text-[var(--sx-ink-4)]">Delivered to your connected account</span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="sx-focus h-12 flex-[1.4] text-[13.5px] font-extrabold text-black transition-colors hover:bg-[#eceaff]"
                style={{ borderRadius: 'var(--sx-r-sm)', background: '#ffffff' }}
              >
                Keep shopping
              </button>
              <Link
                href="/purchases"
                className="sx-focus group flex h-12 flex-1 items-center justify-center gap-2 border text-[13.5px] font-bold text-[var(--sx-ink)] transition-colors hover:bg-white/[0.05]"
                style={{ borderRadius: 'var(--sx-r-sm)', borderColor: 'var(--sx-hair)' }}
              >
                My stuff
                <FiArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
