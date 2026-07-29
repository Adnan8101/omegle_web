'use client';

import { FiSlash } from 'react-icons/fi';

interface BlockedBadgeProps {
  reason?: string | null;
  until?: string | null;
}

function formatUntil(until?: string | null): string | null {
  if (!until) return null;
  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Temporary economy blocks carry a reason and an expiry the old UI discarded.
 * Both are surfaced here in a hover/focus card.
 */
export default function BlockedBadge({ reason, until }: BlockedBadgeProps) {
  const expires = formatUntil(until);
  const summary = [reason?.trim() || 'No reason recorded', expires && `Until ${expires}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <span className="group/badge relative inline-flex">
      <span
        tabIndex={0}
        role="note"
        aria-label={`Temporarily blocked. ${summary}`}
        className="fx-focus inline-flex cursor-help items-center gap-1 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-red-400"
      >
        <FiSlash className="h-2.5 w-2.5" />
        Blocked
      </span>

      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-max max-w-[240px] -translate-x-1/2 translate-y-1 scale-95 rounded-[var(--fx-r-xs)] border border-[var(--fx-hairline-strong)] bg-[rgb(var(--color-bg-secondary))] px-3 py-2 text-left opacity-0 shadow-xl transition-all duration-200 ease-[var(--fx-ease)] group-hover/badge:translate-y-0 group-hover/badge:scale-100 group-hover/badge:opacity-100 group-focus-within/badge:translate-y-0 group-focus-within/badge:scale-100 group-focus-within/badge:opacity-100"
      >
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-red-400">
          Temporarily blocked
        </span>
        <span className="mt-1 block text-[12px] leading-snug text-[var(--fx-ink-2)]">
          {reason?.trim() || 'No reason recorded.'}
        </span>
        {expires && (
          <span className="mt-1 block text-[11px] font-semibold text-[var(--fx-ink-3)]">
            Until {expires}
          </span>
        )}
      </span>
    </span>
  );
}
