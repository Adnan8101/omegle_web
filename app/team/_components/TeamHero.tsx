'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiArrowUpRight } from 'react-icons/fi';
import { CountUp, Item, Magnetic, Reveal, RevealGroup, ScrollParallax, Words } from '@/components/motion';

interface TeamHeroProps {
  headcount: number;
  departments: number;
  /** Earliest team join year, derived from real `created_at` data. */
  since: number | null;
}

/**
 * Cinematic opener. Mirrors the home page's hero grammar — type above,
 * illustration bottom-anchored, gradient dissolve into the next section — so
 * the two pages read as one product.
 */
export default function TeamHero({ headcount, departments, since }: TeamHeroProps) {
  const stats = [
    { value: headcount, label: headcount === 1 ? 'Crew member' : 'Crew members' },
    { value: departments, label: departments === 1 ? 'Department' : 'Departments' },
    ...(since ? [{ value: since, label: 'Building since', plain: true }] : []),
  ];

  return (
    <section className="relative w-full overflow-hidden">
      {/* Ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[-10%] h-[560px] w-[900px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.22) 0%, rgba(59,158,255,0.10) 42%, transparent 72%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pt-28 sm:px-8 sm:pt-32">
        <Reveal mount dir="down" distance={12} className="mb-10">
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

        <div className="mx-auto max-w-3xl text-center">
          <RevealGroup mount stagger={0.11} className="flex flex-col items-center gap-6">
            <Item dir="none" scale={0.9}>
              <span className="fx-eyebrow">The people behind Omeglee</span>
            </Item>

            <Item>
              <h1 className="text-[clamp(40px,8vw,76px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[rgb(var(--color-text-primary))]">
                <Words text="Meet the" mount delay={0.18} distance={24} />{' '}
                <Words text="Crew" mount delay={0.32} distance={24} style={{ color: '#A78BFA' }} />
              </h1>
            </Item>

            <Item blur>
              <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-[var(--fx-ink-2)] sm:text-base">
                A small group running a very large community — engineering the bot and economy,
                moderating around the clock, and hosting the events that keep everyone coming back.
              </p>
            </Item>

            <Item>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="fx-surface flex items-baseline gap-2 rounded-[var(--fx-r-xs)] px-3.5 py-2"
                  >
                    <span className="fx-num text-[17px] font-extrabold tracking-tight text-[rgb(var(--color-text-primary))]">
                      <CountUp
                        value={stat.value}
                        format={stat.plain ? (n) => String(Math.round(n)) : undefined}
                      />
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
      </div>

      {/* Crew illustration — grounded with a glow pool, dissolved into the page */}
      <div className="relative mt-4 sm:mt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 h-[180px] w-[min(92%,980px)] -translate-x-1/2"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.34) 0%, transparent 70%)',
            filter: 'blur(34px)',
          }}
        />
        <Reveal mount dir="up" distance={40} duration={1} delay={0.45} scale={0.98}>
          <ScrollParallax distance={22} className="flex w-full justify-center">
            <Image
              src="/team-crew.webp"
              alt="Illustration of the Omeglee crew"
              width={2200}
              height={832}
              priority
              draggable={false}
              className="pointer-events-none w-full max-w-[1180px] select-none"
            />
          </ScrollParallax>
        </Reveal>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{
            background: 'linear-gradient(to top, rgb(var(--color-bg-primary)) 12%, transparent 100%)',
          }}
        />
      </div>
    </section>
  );
}
