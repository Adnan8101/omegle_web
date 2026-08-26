'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiCopy, FiX } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import { DEFAULT_ACCENT, hexToRgbTriplet } from '@/lib/color';
import type { TeamMember } from '../types';
import { departmentOf, formatJoined, initialsOf, swapGifForWebp } from '../utils';
import { TIER_ICONS } from './tierIcons';

interface MemberSpotlightProps {
  member: TeamMember | null;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MemberSpotlight({ member, onClose }: MemberSpotlightProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  const open = member !== null;

  // Lock scroll, remember what had focus, move focus into the dialog, restore on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open]);

  useEffect(() => setCopied(false), [member?.id]);

  // Esc dismisses; Tab cycles within the dialog.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const copyId = useCallback(async () => {
    if (!member) return;
    try {
      await navigator.clipboard.writeText(member.discord_user_id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked (insecure origin or denied) — the raw ID stays visible below */
    }
  }, [member]);

  const accent = member?.profile.accentColor || DEFAULT_ACCENT;
  const joined = formatJoined(member?.created_at);
  // Rank chrome, so the panel reads as the same tier as the card behind it.
  const department = departmentOf(member?.designation);
  const rank = department?.ink ?? accent;
  const RankIcon = department ? TIER_ICONS[department.id] : null;


  return (
    <AnimatePresence>
      {member && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-spotlight-name"
            className="fx-surface relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[var(--fx-r-xl)] sm:rounded-[var(--fx-r-xl)]"
            style={{ '--fx-accent-rgb': hexToRgbTriplet(accent) } as React.CSSProperties}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 34, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.98 }}
            transition={
              reduce ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 30, mass: 0.8 }
            }
          >
            {/* Banner */}
            <div className="relative h-36 w-full overflow-hidden sm:h-40">
              {member.profile.banner ? (
                <img
                  src={member.profile.banner}
                  alt=""
                  aria-hidden
                  onError={swapGifForWebp}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(120% 140% at 20% 0%, ${accent}66 0%, transparent 62%), radial-gradient(100% 120% at 85% 15%, ${accent}33 0%, transparent 58%)`,
                  }}
                />
              )}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgb(var(--color-bg-secondary)) 2%, rgba(0,0,0,0.45) 50%, transparent 100%)',
                }}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="fx-focus absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pb-7">
              {/* Identity — avatar overlaps the banner, tag sits below both so it's never clipped */}
              <div className="-mt-12 mb-2 flex items-end gap-4">
                <div className="relative flex-shrink-0">
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-full opacity-45 blur-xl"
                    style={{ background: accent }}
                  />
                  <div
                    className="relative h-24 w-24 overflow-hidden rounded-full border-4 bg-[rgb(var(--color-bg-secondary))] shadow-2xl"
                    style={{ borderColor: 'rgb(var(--color-bg-secondary))' }}
                  >
                    {member.profile.avatar ? (
                      <img
                        src={member.profile.avatar}
                        alt={member.profile.displayName}
                        onError={swapGifForWebp}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-2xl font-extrabold"
                        style={{ background: `${accent}22`, color: accent }}
                      >
                        {initialsOf(member)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <h2
                    id="member-spotlight-name"
                    className="truncate text-2xl font-extrabold tracking-[-0.025em] text-[rgb(var(--color-text-primary))]"
                  >
                    {member.profile.displayName}
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--fx-ink-3)]">
                    @{member.profile.username}
                  </p>
                </div>
              </div>

              {/* Rank tag — fully below the banner area, always visible */}
              <span
                className="mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.09em]"
                style={{ color: rank, borderColor: `${rank}4d`, background: `${rank}14` }}
              >
                {RankIcon && <RankIcon className="h-3 w-3 flex-shrink-0" />}
                {member.designation}
              </span>

              {/* Facts */}
              <dl className="mb-5 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--fx-r-sm)] border border-[var(--fx-hairline)] bg-[var(--fx-hairline)] sm:grid-cols-2">
                <Fact label="Discord" value={`@${member.profile.username}`} />
                <Fact label="On the team since" value={joined ?? '—'} />
              </dl>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={copyId}
                  className="fx-focus inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--fx-r-sm)] border border-[var(--fx-hairline)] bg-[var(--fx-surface-raised)] px-4 py-3 text-[13px] font-bold text-[rgb(var(--color-text-primary))] transition-colors hover:border-[var(--fx-hairline-strong)]"
                >
                  {copied ? (
                    <>
                      <FiCheck className="h-4 w-4 text-emerald-400" />
                      Copied ID
                    </>
                  ) : (
                    <>
                      <FiCopy className="h-4 w-4 text-[var(--fx-ink-3)]" />
                      Copy user ID
                    </>
                  )}
                </button>

                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fx-focus inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--fx-r-sm)] bg-[#5865F2] px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-[#4752c4]"
                >
                  <FaDiscord className="h-4 w-4" />
                  Find them on Discord
                </a>
              </div>

              <p className="mt-3 text-center font-mono text-[11px] text-[var(--fx-ink-3)]">
                {member.discord_user_id}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] px-4 py-3">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--fx-ink-3)]">{label}</dt>
      <dd className="mt-1 truncate text-[13.5px] font-semibold text-[rgb(var(--color-text-primary))]">
        {value}
      </dd>
    </div>
  );
}
