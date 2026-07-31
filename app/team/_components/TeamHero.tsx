'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiArrowUpRight } from 'react-icons/fi';
import { CountUp, Item, Magnetic, Reveal, RevealGroup, Tilt, Words } from '@/components/motion';

interface TeamHeroProps {
  headcount: number;
  departments: number;
  /** Earliest team join year, derived from real `created_at` data. */
  since: number | null;
}

/**
 * The crew portrait carries the section — large, tilted, lit from behind —
 * with the stats and CTA sitting underneath it rather than the headline
 * alone. Mirrors the shop hero's rhythm: title, one line, then the art.
 */
export default function TeamHero({ headcount, departments, since }: TeamHeroProps) {
  const stats = [
    { value: headcount, label: headcount === 1 ? 'Crew member' : 'Crew members' },
    { value: departments, label: departments === 1 ? 'Department' : 'Departments' },
    ...(since ? [{ value: since, label: 'Building since', plain: true }] : []),
  ];

  return (
    <section className="relative z-10 w-full overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pt-28 sm:px-8 sm:pt-32">
        <Reveal mount dir="down" distance={12} className="mb-9">
          <Magnetic strength={0.3} max={10} className="inline-flex">
            <Link
              href="/"
              aria-label="Back to home"
              className="fx-surface fx-focus flex h-11 w-11 items-center justify-center rounded-[var(--fx-r-sm)] transition-colors hover:border-[var(--fx-hairline-strong)]"
            >
              <FiArrowLeft className="h-[18px] w-[18px] text-[var(--fx-ink-2)]" />
            </Link>
          </Magnetic>
        </Reveal>

        <div className="mx-auto max-w-2xl text-center">
          <RevealGroup mount stagger={0.11} className="flex flex-col items-center gap-5">
            <Item dir="none" scale={0.9}>
              <span className="fx-eyebrow">The people behind Omeglee</span>
            </Item>

            <Item>
              <h1 className="text-[clamp(38px,7.5vw,68px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[rgb(var(--color-text-primary))]">
                <Words text="Meet the" mount delay={0.16} distance={22} />{' '}
                <Words text="Crew" mount delay={0.3} distance={22} style={{ color: '#A78BFA' }} />
              </h1>
            </Item>

            <Item blur>
              <p className="mx-auto max-w-md text-[15px] leading-relaxed text-[var(--fx-ink-2)]">
                The people who build, moderate, and run Omeglee day to day.
              </p>
            </Item>
          </RevealGroup>
        </div>

        {/* ── Portrait — sits directly on the page's own black, no glow
              behind it, so the art's baked-in black background disappears
              into the page instead of reading as a floating rectangle ── */}
        <Reveal mount dir="up" distance={36} duration={0.95} delay={0.32} scale={0.97} className="relative mt-10 sm:mt-14">
          <Tilt max={4} scale={1.012} perspective={1500} className="relative mx-auto w-full max-w-[640px]">
            <Image
              src="/Omeglee_Team.png"
              alt="Illustration of the Omeglee crew"
              width={1554}
              height={1012}
              priority
              draggable={false}
              className="pointer-events-none w-full select-none"
            />
          </Tilt>
        </Reveal>

        {/* ── Stats + CTA ──────────────────────────────────────────── */}
        <RevealGroup stagger={0.1} delay={0.1} className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-7 pb-6 sm:mt-10">
          <Item>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {stats.map((stat) => (
                <div key={stat.label} className="fx-surface flex items-baseline gap-2 rounded-[var(--fx-r-xs)] px-3.5 py-2">
                  <span className="fx-num text-[17px] font-extrabold tracking-tight text-[rgb(var(--color-text-primary))]">
                    <CountUp value={stat.value} format={stat.plain ? (n) => String(Math.round(n)) : undefined} />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fx-ink-3)]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </Item>

          <Item scale={0.92}>
            <Magnetic strength={0.24} max={10}>
              <Link
                href="/staff-application"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[15px] font-bold text-black shadow-lg shadow-black/20 transition-colors hover:bg-slate-100"
              >
                Apply to join the team
                <FiArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
          </Item>
        </RevealGroup>
      </div>
    </section>
  );
}
