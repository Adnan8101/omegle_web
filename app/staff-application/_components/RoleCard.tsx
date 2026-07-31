'use client';

import Image from 'next/image';
import { FiArrowUpRight, FiLock } from 'react-icons/fi';
import SpotlightCard from '@/components/ui/SpotlightCard';
import type { StaffRoleMeta } from '@/lib/staffApplicationForm';

interface RoleCardProps {
  role: StaffRoleMeta;
  isOpen: boolean;
  onSelect: () => void;
}

/**
 * Each role's artwork already carries its own title and icon, so the card
 * doesn't repeat them — it just frames the illustration and adds what the
 * artwork can't: live status and the action to apply.
 */
export default function RoleCard({ role, isOpen, onSelect }: RoleCardProps) {
  return (
    <SpotlightCard
      accent={isOpen ? role.accent : '#71717a'}
      className="fx-lift group relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03]"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Apply for ${role.label}${isOpen ? '' : ' (closed)'}`}
        className="fx-focus absolute inset-0 z-[3] rounded-[inherit]"
      />

      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={role.image}
          alt={`${role.label} illustration`}
          fill
          className={`object-cover transition-transform duration-700 ease-[var(--fx-ease)] group-hover:scale-[1.04] ${
            isOpen ? '' : 'opacity-40 grayscale'
          }`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

        <span
          className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] backdrop-blur-md"
          style={
            isOpen
              ? { color: '#34D399', borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(16,185,129,0.14)' }
              : { color: '#f87171', borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(239,68,68,0.12)' }
          }
        >
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      <div className="relative z-[2] flex items-center justify-between gap-3 px-5 py-4">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/55">{role.shortDescription}</p>
        {isOpen ? (
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-transform duration-300 ease-[var(--fx-ease)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ borderColor: `${role.accent}45`, background: `${role.accent}18`, color: role.accent }}
          >
            <FiArrowUpRight className="h-4 w-4" />
          </span>
        ) : (
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/30">
            <FiLock className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </SpotlightCard>
  );
}
