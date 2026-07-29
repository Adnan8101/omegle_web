'use client';

import { Item, Reveal, RevealGroup } from '@/components/motion';
import MemberCard from './MemberCard';
import { sectionDomId } from './DepartmentRail';
import type { Department, TeamMember } from '../types';

interface DepartmentSectionProps {
  department: Department;
  members: TeamMember[];
  onOpenMember: (member: TeamMember) => void;
}

export default function DepartmentSection({
  department,
  members,
  onOpenMember,
}: DepartmentSectionProps) {
  if (members.length === 0) return null;

  const feature = department.layout === 'feature';

  return (
    <section
      id={sectionDomId(department.id)}
      aria-labelledby={`${sectionDomId(department.id)}-title`}
      className="scroll-mt-[150px]"
    >
      {/* Header — anchored by an oversized ghost numeral rather than a centred pill */}
      <Reveal dir="up" distance={22} className="mb-9">
        <div className="flex items-start gap-5 sm:gap-8">
          <span aria-hidden className="fx-ghost hidden shrink-0 sm:block">
            {department.index}
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <span
                className="text-[11.5px] font-extrabold uppercase tracking-[0.16em]"
                style={{ color: department.accent }}
              >
                {department.label}
              </span>
              <span aria-hidden className="h-3 w-px bg-[var(--fx-hairline-strong)]" />
              <span className="fx-num text-[11.5px] font-semibold text-[var(--fx-ink-3)]">
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </span>
            </div>

            <h2
              id={`${sectionDomId(department.id)}-title`}
              className="text-[clamp(26px,4.2vw,38px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[rgb(var(--color-text-primary))]"
            >
              {department.title}
            </h2>

            <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-[var(--fx-ink-2)]">
              {department.blurb}
            </p>

            <hr className="fx-rule mt-6" />
          </div>
        </div>
      </Reveal>

      {/* Flex-wrap rather than a fixed grid: department sizes vary a lot, and a
          lone member shouldn't stretch across a full 3-column track. */}
      <RevealGroup stagger={0.075} className="flex flex-wrap gap-5">
        {members.map((member) => (
          <Item
            key={member.id}
            distance={22}
            scale={0.97}
            className={
              feature
                ? 'w-full max-w-[560px] sm:w-[calc(50%-10px)]'
                : 'w-full max-w-[360px] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-13.34px)]'
            }
          >
            <MemberCard
              member={member}
              variant={feature ? 'feature' : 'grid'}
              onOpen={onOpenMember}
            />
          </Item>
        ))}
      </RevealGroup>
    </section>
  );
}
