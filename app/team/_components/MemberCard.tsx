'use client';

import { FiArrowUpRight } from 'react-icons/fi';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { DEFAULT_ACCENT } from '@/lib/color';
import type { TeamMember } from '../types';
import { formatJoined, initialsOf, swapGifForWebp } from '../utils';

interface MemberCardProps {
  member: TeamMember;
  onOpen: (member: TeamMember) => void;
}

/** One consistent card size for every member — no leadership vs. roster split. */
export default function MemberCard({ member, onOpen }: MemberCardProps) {
  const { profile, designation, created_at } = member;
  const accent = profile.accentColor || DEFAULT_ACCENT;
  const joined = formatJoined(created_at);

  return (
    <SpotlightCard
      accent={accent}
      className="fx-lift group relative h-full w-full overflow-hidden rounded-[var(--fx-r-lg)]"
    >
      {/* Stretched hit area — keeps the whole card clickable and keyboard
          reachable without nesting flow content inside a <button>. */}
      <button
        type="button"
        onClick={() => onOpen(member)}
        aria-label={`View ${profile.displayName}'s profile`}
        className="fx-focus absolute inset-0 z-[3] rounded-[inherit]"
      />
      {/* Banner — the member's own Discord banner, or a wash of their accent */}
      <div
        className="relative h-24 w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent}44, transparent 70%)` }}
      >
        {profile.banner ? (
          <img
            src={profile.banner}
            alt=""
            aria-hidden
            onError={swapGifForWebp}
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-all duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.06] group-hover:opacity-100"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 opacity-80 transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.06]"
            style={{
              background: `radial-gradient(120% 140% at 15% 0%, ${accent}55 0%, transparent 60%), radial-gradient(90% 120% at 90% 10%, ${accent}2e 0%, transparent 55%)`,
            }}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgb(var(--color-bg-primary)) 4%, rgba(0,0,0,0.35) 46%, transparent 100%)',
          }}
        />
      </div>

      {/* Identity */}
      <div className="relative z-[2] flex flex-col px-5 pb-5">
        <div className="relative -mt-9 mb-3.5 flex items-end justify-between gap-3">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full opacity-35 blur-lg transition-opacity duration-500 group-hover:opacity-70"
              style={{ background: accent }}
            />
            <div
              className="relative h-16 w-16 overflow-hidden rounded-full border-[3px] bg-[rgb(var(--color-bg-secondary))] shadow-xl transition-transform duration-500 ease-[var(--fx-ease)] group-hover:-rotate-2 group-hover:scale-[1.04]"
              style={{ borderColor: 'rgb(var(--color-bg-primary))' }}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  onError={swapGifForWebp}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-extrabold"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  {initialsOf(member)}
                </div>
              )}
            </div>
            <span
              aria-hidden
              className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 bg-emerald-500"
              style={{ borderColor: 'rgb(var(--color-bg-primary))' }}
            />
          </div>

          <span
            className="mb-1 inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]"
            style={{ color: accent, borderColor: `${accent}4d`, background: `${accent}14` }}
          >
            {designation}
          </span>
        </div>

        <h3 className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
          {profile.displayName}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] font-medium text-[var(--fx-ink-3)]">@{profile.username}</p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--fx-hairline)] pt-3.5">
          <span className="text-[11.5px] font-semibold text-[var(--fx-ink-3)]">
            {joined ? `Since ${joined}` : 'Core team'}
          </span>
          <span
            className="flex items-center gap-1 text-[11.5px] font-bold opacity-0 transition-all duration-300 ease-[var(--fx-ease)] group-hover:translate-x-0 group-hover:opacity-100 sm:-translate-x-1"
            style={{ color: accent }}
          >
            Profile
            <FiArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </SpotlightCard>
  );
}
