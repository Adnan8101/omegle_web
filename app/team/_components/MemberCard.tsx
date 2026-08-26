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
  /** Which rank this card is being rendered under — drives the entire card shape. */
  tier: DepartmentId;
  onOpen: (member: TeamMember) => void;
}

/**
 * One card, three shapes — position decides which.
 *
 *   founders  → `FeatureCard`  half-width slab, banner behind the whole card
 *   admins    → `StandardCard` portrait card, banner strip + overlapping avatar
 *   core_team → `CompactCard`  single dense row, no banner
 *
 * Rank chrome (label, avatar ring, glow) comes from the department; the
 * member's own Discord banner and accent stay personal inside that frame.
 */
export default function MemberCard({ member, tier, onOpen }: MemberCardProps) {
  const department = DEPARTMENT_BY_ID[tier];

  if (department.variant === 'feature') return <FeatureCard member={member} department={department} onOpen={onOpen} />;
  if (department.variant === 'compact') return <CompactCard member={member} department={department} onOpen={onOpen} />;
  return <StandardCard member={member} department={department} onOpen={onOpen} />;
}

interface VariantProps {
  member: TeamMember;
  department: Department;
  onOpen: (member: TeamMember) => void;
}

/* ── Founders ─────────────────────────────────────────────────────────────
   Two to a row, and the only cards laid out sideways: the banner sits behind
   the whole slab rather than in a strip, and the avatar reads alongside the
   name instead of punching through a header. */
function FeatureCard({ member, department, onOpen }: VariantProps) {
  const { profile, designation, created_at } = member;
  const joined = formatJoined(created_at);

  return (
    <SpotlightCard
      accent={department.ink}
      className="fx-lift group relative h-full w-full overflow-hidden rounded-[var(--fx-r-lg)]"
      style={{
        borderColor: department.ring,
        boxShadow: `0 34px 70px -46px ${department.glow}, var(--fx-shadow)`,
      }}
    >
      <HitArea member={member} onOpen={onOpen} />

      {profile.banner && (
        <img
          src={profile.banner}
          alt=""
          aria-hidden
          onError={swapGifForWebp}
          className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.04]"
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: profile.banner
            ? 'linear-gradient(100deg, rgb(var(--color-bg-primary)) 12%, rgba(0,0,0,0.55) 62%, transparent 105%)'
            : `radial-gradient(120% 130% at 8% 0%, ${department.glow} 0%, transparent 62%)`,
        }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${department.ink}99, transparent)` }}
      />

      <div className="relative z-[2] flex h-full flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
        <Avatar member={member} department={department} size={80} border={3} />

        <div className="flex min-w-0 flex-1 flex-col">
          <RankBadge department={department} designation={designation} />

          <h3 className="mt-3 truncate text-[20px] font-extrabold tracking-[-0.025em] text-[rgb(var(--color-text-primary))] sm:text-[22px]">
            {profile.displayName}
          </h3>
          <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--fx-ink-3)]">@{profile.username}</p>

          <Footer joined={joined} ink={department.ink} className="mt-5" />
        </div>
      </div>
    </SpotlightCard>
  );
}

/* ── Admins ───────────────────────────────────────────────────────────────
   The middle weight, and the one that keeps the familiar portrait shape: a
   banner strip, the avatar breaking the seam, three to a row. */
function StandardCard({ member, department, onOpen }: VariantProps) {
  const { profile, designation, created_at } = member;
  const accent = profile.accentColor || DEFAULT_ACCENT;
  const joined = formatJoined(created_at);

  return (
    <SpotlightCard
      accent={department.ink}
      className="fx-lift group relative h-full w-full overflow-hidden rounded-[var(--fx-r-lg)]"
    >
      <HitArea member={member} onOpen={onOpen} />

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
            className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.05]"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--fx-ease)] group-hover:scale-[1.05]"
            style={{ background: `radial-gradient(120% 140% at 15% 0%, ${accent}55 0%, transparent 60%)` }}
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgb(var(--color-bg-primary)) 4%, rgba(0,0,0,0.35) 46%, transparent 100%)',
          }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${department.ink}99, transparent)` }}
        />
      </div>

      <div className="relative z-[2] flex flex-col px-5 pb-5">
        <div className="relative -mt-9 mb-3.5 flex items-end justify-between gap-3">
          <Avatar member={member} department={department} size={64} border={3} />
          <RankBadge department={department} designation={designation} className="mb-1" />
        </div>

        <h3 className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-[rgb(var(--color-text-primary))]">
          {profile.displayName}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] font-medium text-[var(--fx-ink-3)]">@{profile.username}</p>

        <Footer joined={joined} ink={department.ink} className="mt-4" />
      </div>
    </SpotlightCard>
  );
}

/* ── Core Team ────────────────────────────────────────────────────────────
   The roster reads as a list, not a gallery: one dense row per person with
   an accent edge in place of a banner, so a long crew stays scannable. */
function CompactCard({ member, department, onOpen }: VariantProps) {
  const { profile, created_at } = member;
  const joined = formatJoined(created_at);

  return (
    <SpotlightCard
      accent={department.ink}
      edge={false}
      className="fx-lift group relative h-full w-full overflow-hidden rounded-[var(--fx-r-md)]"
    >
      <HitArea member={member} onOpen={onOpen} />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${department.glow}, transparent 45%)` }}
      />

      <div className="relative z-[2] flex items-center gap-3.5 px-4 py-3.5">
        <Avatar member={member} department={department} size={46} border={2} dot={10} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold tracking-[-0.015em] text-[rgb(var(--color-text-primary))]">
            {profile.displayName}
          </h3>
          <p className="mt-px truncate text-[12px] font-medium text-[var(--fx-ink-3)]">@{profile.username}</p>
        </div>

        {/* Tenure resting, the profile cue on hover — same slot, no shift */}
        <div className="relative h-4 flex-shrink-0">
          {joined && (
            <span className="fx-num text-[11px] font-semibold text-[var(--fx-ink-3)] transition-opacity duration-300 group-hover:opacity-0">
              {joined}
            </span>
          )}
          <span
            className="absolute right-0 top-0 flex items-center gap-1 text-[11px] font-bold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ color: department.ink }}
          >
            Profile
            <FiArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </SpotlightCard>
  );
}

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

/** Rank label — glyph plus the DB designation, falling back to the rank name. */
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
      className={`inline-flex w-fit flex-shrink-0 items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] ${className}`}
      style={{ color: department.ink }}
    >
      <Icon className="h-3 w-3" />
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
