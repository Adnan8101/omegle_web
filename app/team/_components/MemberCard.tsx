'use client';

import type { CSSProperties } from 'react';
import { FiArrowUpRight } from 'react-icons/fi';
import SpotlightCard from '@/components/ui/SpotlightCard';
import { DEFAULT_ACCENT } from '@/lib/color';
import { DEPARTMENT_BY_ID, type Department, type DepartmentId, type TeamMember } from '../types';
import { formatJoined, initialsOf, swapGifForWebp } from '../utils';
import { TIER_ICONS } from './tierIcons';

interface MemberCardProps {
  member: TeamMember;
  /** Which rank this card is being rendered under — drives sizes & banner visibility. */
  tier: DepartmentId;
  onOpen: (member: TeamMember) => void;
}

/**
 * Unified card — same portrait structure for every rank.
 *
 *   Banner area  →  avatar overlapping the seam  →  tag + name + footer
 *
 * Only founders & admins get a real banner image. Core team gets a subtle
 * accent gradient in place of the banner strip.
 *
 * Sizes scale per tier:
 *   founders  → taller banner, larger avatar, bigger text
 *   admins    → standard banner + avatar
 *   core_team → compact banner (accent only) + smaller avatar
 */
export default function MemberCard({ member, tier, onOpen }: MemberCardProps) {
  const department = DEPARTMENT_BY_ID[tier];
  const { profile, designation, created_at } = member;
  const accent = profile.accentColor || DEFAULT_ACCENT;
  const joined = formatJoined(created_at);

  // Whether this tier gets a real banner image
  const showBanner = tier === 'founders' || tier === 'admins';

  // Size tokens per tier
  const sizes = TIER_SIZES[tier];

  return (
    <SpotlightCard
      accent={department.ink}
      className="fx-lift group relative h-full w-full overflow-hidden rounded-[var(--fx-r-lg)]"
      style={{ borderColor: department.ring }}
    >
      <HitArea member={member} onOpen={onOpen} />

      {/* ── Banner area ──────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: sizes.bannerH, background: `linear-gradient(135deg, ${accent}44, transparent 70%)` }}
      >
        {showBanner && profile.banner ? (
          <img
            src={profile.banner}
            alt=""
            aria-hidden
            onError={swapGifForWebp}
            className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.05]"
          />
        ) : showBanner ? (
          <span
            aria-hidden
            className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.05]"
            style={{ background: `radial-gradient(120% 140% at 15% 0%, ${accent}55 0%, transparent 60%)` }}
          />
        ) : (
          /* Core team: subtle department gradient, no real banner */
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${department.glow}, transparent 65%)` }}
          />
        )}
        {/* Bottom fade into card body */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgb(var(--color-bg-primary)) 4%, rgba(0,0,0,0.35) 46%, transparent 100%)',
          }}
        />
        {/* Top accent hairline */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${department.ink}99, transparent)` }}
        />
      </div>

      {/* ── Card body ────────────────────────────────────────────── */}
      <div className="relative z-[2] flex flex-col" style={{ padding: sizes.bodyPadding }}>
        {/* Avatar + Tag row — avatar overlaps the banner */}
        <div className="relative flex items-end justify-between gap-3" style={{ marginTop: sizes.avatarPull }}>
          <Avatar member={member} department={department} size={sizes.avatarSize} border={sizes.avatarBorder} />
          <RankBadge department={department} designation={designation} className="mb-1" />
        </div>

        {/* Name */}
        <h3
          className="mt-3 truncate font-extrabold text-[rgb(var(--color-text-primary))]"
          style={{ fontSize: sizes.nameSize, letterSpacing: '-0.02em' }}
        >
          {profile.displayName}
        </h3>
        <p
          className="mt-0.5 truncate font-medium text-[var(--fx-ink-3)]"
          style={{ fontSize: sizes.usernameSize }}
        >
          @{profile.username}
        </p>

        {/* Footer: tenure + profile hint */}
        <Footer joined={joined} ink={department.ink} className="mt-4" />
      </div>
    </SpotlightCard>
  );
}

/* ── Size tokens per tier ─────────────────────────────────────────────── */

interface TierSizes {
  bannerH: number;
  avatarSize: number;
  avatarBorder: number;
  avatarPull: string;      // negative margin to overlap banner
  bodyPadding: string;     // px py
  nameSize: number;
  usernameSize: number;
}

const TIER_SIZES: Record<DepartmentId, TierSizes> = {
  founders: {
    bannerH: 110,
    avatarSize: 72,
    avatarBorder: 3,
    avatarPull: '-36px',
    bodyPadding: '0 24px 20px',
    nameSize: 20,
    usernameSize: 13,
  },
  admins: {
    bannerH: 96,
    avatarSize: 64,
    avatarBorder: 3,
    avatarPull: '-32px',
    bodyPadding: '0 20px 20px',
    nameSize: 17,
    usernameSize: 12.5,
  },
  core_team: {
    bannerH: 64,
    avatarSize: 52,
    avatarBorder: 2,
    avatarPull: '-26px',
    bodyPadding: '0 16px 16px',
    nameSize: 15,
    usernameSize: 12,
  },
};

/* ── Shared parts ─────────────────────────────────────────────────────── */

/** Stretched hit area — the whole card is clickable and keyboard reachable
    without nesting flow content inside a `<button>`. */
function HitArea({ member, onOpen }: { member: TeamMember; onOpen: (member: TeamMember) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(member)}
      aria-label={`View ${member.profile.displayName}'s profile`}
      className="fx-focus absolute inset-0 z-[3] rounded-[inherit]"
    />
  );
}

/** Avatar ringed in the rank colour, the member's own accent glowing behind
    it. Sizes are inline because each variant wears a different one. */
function Avatar({
  member,
  department,
  size,
  border,
  dot = 13,
}: {
  member: TeamMember;
  department: Department;
  size: number;
  border: number;
  dot?: number;
}) {
  const { profile } = member;
  const accent = profile.accentColor || DEFAULT_ACCENT;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className="absolute -inset-1 rounded-full opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: department.glow }}
      />
      <div
        className="relative h-full w-full overflow-hidden rounded-full bg-[rgb(var(--color-bg-secondary))] shadow-xl transition-transform duration-500 ease-[var(--fx-ease)] group-hover:scale-[1.04]"
        style={{ border: `${border}px solid ${department.ring}` }}
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
            className="flex h-full w-full items-center justify-center font-extrabold"
            style={{ background: `${accent}22`, color: accent, fontSize: Math.round(size / 3.6) }}
          >
            {initialsOf(member)}
          </div>
        )}
      </div>
      <span
        aria-hidden
        className="absolute bottom-0 right-0 rounded-full border-2 bg-emerald-500"
        style={{ width: dot, height: dot, borderColor: 'rgb(var(--color-bg-primary))' }}
      />
    </div>
  );
}

/** Rank label — glyph plus the DB designation, falling back to the rank name.
    Always fully visible, never clipped by the banner area. */
function RankBadge({
  department,
  designation,
  className = '',
}: {
  department: Department;
  designation?: string | null;
  className?: string;
}) {
  const Icon = TIER_ICONS[department.id];

  return (
    <span
      className={`inline-flex w-fit flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] ${className}`}
      style={{
        color: department.ink,
        borderColor: `${department.ink}4d`,
        background: `${department.ink}14`,
      }}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {designation || department.role}
    </span>
  );
}

/** Tenure on the left, hover cue on the right. With no join date on the roster
    row the left side simply stays empty — never a stand-in label. */
function Footer({ joined, ink, className = '' }: { joined: string | null; ink: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-t border-[var(--fx-hairline)] pt-3.5 ${className}`}>
      <span className="truncate text-[11.5px] font-semibold text-[var(--fx-ink-3)]">
        {joined && `Since ${joined}`}
      </span>
      <span
        className="flex flex-shrink-0 items-center gap-1 text-[11.5px] font-bold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ color: ink } as CSSProperties}
      >
        Profile
        <FiArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
