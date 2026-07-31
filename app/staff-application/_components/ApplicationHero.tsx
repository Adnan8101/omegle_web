'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { Item, Magnetic, Reveal, RevealGroup, Tilt, Words } from '@/components/motion';
import { APPLICATION_HERO_IMAGE } from '@/lib/staffApplicationForm';

interface ApplicationHeroProps {
  openCount: number;
  totalCount: number;
}

const ACCENT = '#A78BFA';

export default function ApplicationHero({ openCount, totalCount }: ApplicationHeroProps) {
  return (
    <section className="relative z-10 w-full overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pt-28 sm:px-8 sm:pt-32">
        <Reveal mount dir="down" distance={12} className="mb-9">
          <Magnetic strength={0.3} max={10} className="inline-flex">
            <Link
              href="/"
              aria-label="Back to home"
              className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-[12.5px] font-bold text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Magnetic>
        </Reveal>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
          <RevealGroup mount stagger={0.11} className="order-2 lg:order-1">
            <Item dir="none" scale={0.9}>
              <span
                className="inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em]"
                style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}14`, color: ACCENT }}
              >
                Now Recruiting
              </span>
            </Item>

            <Item>
              <h1 className="mt-4 text-[clamp(38px,7vw,64px)] font-extrabold leading-[1.03] tracking-[-0.035em] text-white">
                <Words text="Help Run" mount delay={0.15} distance={22} />{' '}
                <Words text="Omeglee" mount delay={0.26} distance={22} style={{ color: ACCENT }} />
              </h1>
            </Item>

            <Item blur>
              <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-white/50">
                Moderation, gaming patrol, media, or events — pick the role that fits you, answer a
                short form, and submit it through your Discord account.
              </p>
            </Item>

            <Item className="mt-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[12px] font-semibold text-white/60">
                    {openCount} of {totalCount} roles open
                  </span>
                </span>

                <Magnetic strength={0.24} max={10}>
                  <a
                    href="#roles"
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[13px] font-bold text-black transition-colors hover:bg-slate-100"
                  >
                    View open roles
                    <FiArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </a>
                </Magnetic>
              </div>
            </Item>
          </RevealGroup>

          <Reveal dir="right" distance={36} blur scale={0.96} className="relative order-1 lg:order-2">
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{ inset: '-10%', background: `radial-gradient(ellipse at center, ${ACCENT}29 0%, transparent 70%)`, filter: 'blur(50px)' }}
            />
            <Tilt max={5} scale={1.012} perspective={1400} className="relative w-full">
              <Image
                src={APPLICATION_HERO_IMAGE}
                alt="Apply to join the Omeglee staff team"
                width={550}
                height={426}
                priority
                className="h-auto w-full select-none"
                draggable={false}
              />
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
