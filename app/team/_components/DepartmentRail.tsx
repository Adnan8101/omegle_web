'use client';

import { useEffect, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { Department, DepartmentId } from '../types';

interface DepartmentRailProps {
  departments: (Department & { count: number })[];
}

export const sectionDomId = (id: DepartmentId) => `dept-${id}`;

/**
 * Sticky department switcher with scroll-spy.
 *
 * The active pill is a single shared-layout element, so moving between
 * departments slides one indicator rather than cross-fading three — the
 * detail that separates a real segmented control from three styled buttons.
 */
export default function DepartmentRail({ departments }: DepartmentRailProps) {
  const [active, setActive] = useState<DepartmentId | null>(departments[0]?.id ?? null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const nodes = departments
      .map(({ id }) => document.getElementById(sectionDomId(id)))
      .filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) return;

    // Only the section crossing the viewport's middle band counts as active,
    // which keeps the indicator stable instead of flickering between
    // neighbours as they enter and leave.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id.replace('dept-', '') as DepartmentId);
      },
      { rootMargin: '-38% 0px -55% 0px', threshold: 0 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [departments]);

  if (departments.length < 2) return null;

  const goTo = (id: DepartmentId) => {
    document.getElementById(sectionDomId(id))?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="sticky top-[80px] z-30 mx-auto mb-14 w-full max-w-[1180px] px-5 sm:top-[92px] sm:px-8">
      <div className="flex justify-center">
        <nav
          aria-label="Team departments"
          className="fx-surface no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5"
        >
          <LayoutGroup id="dept-rail">
            {departments.map((dept) => {
              const isActive = dept.id === active;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => goTo(dept.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className="fx-focus relative flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors sm:px-5"
                  style={{ color: isActive ? '#fff' : 'var(--fx-ink-3)' }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="dept-rail-pill"
                      aria-hidden
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${dept.accent}38, ${dept.accent}14)`,
                        border: `1px solid ${dept.accent}55`,
                      }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 420, damping: 38, mass: 0.7 }
                      }
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {dept.label}
                    <span
                      className="fx-num text-[11px] font-bold tabular-nums"
                      style={{ color: isActive ? dept.accent : 'var(--fx-ink-3)' }}
                    >
                      {dept.count}
                    </span>
                  </span>
                </button>
              );
            })}
          </LayoutGroup>
        </nav>
      </div>
    </div>
  );
}
