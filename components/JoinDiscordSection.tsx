'use client';
import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { Item, Magnetic, Reveal, RevealGroup, Tilt, Words } from '@/components/motion';

/**
 * A compact closing banner, not another full-height chapter — one card,
 * the mascot on one side, the pitch and button on the other. The render is
 * shot on black, and so is the card, so it needs no crop or mask trick: the
 * canvas just disappears into the surface it's sitting on.
 */
export default function JoinDiscordSection() {
  return (
    <section className="relative w-full z-10 overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '-10%',
          left: '-8%',
          width: 560,
          height: 560,
          background: 'radial-gradient(ellipse at center, rgba(88,101,242,0.18) 0%, rgba(59,158,255,0.08) 45%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-14 sm:px-10 sm:py-16">
        <Reveal scale={0.97}>
          <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03]">
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.05fr_1fr]">
              {/* ── Artwork ─────────────────────────────────────────── */}
              <Reveal
                dir="right"
                distance={28}
                blur
                scale={0.96}
                className="order-1 flex justify-center pt-8 sm:order-2 sm:justify-end sm:pt-0"
              >
                <Tilt max={4} scale={1.015} perspective={1400} className="relative w-[210px] sm:w-[240px] lg:w-[280px]">
                  <Image
                    src="/omegle_join.png"
                    alt="Omeglee mascot inviting you to join the Discord server"
                    width={1536}
                    height={1024}
                    className="h-auto w-full select-none"
                    draggable={false}
                  />
                </Tilt>
              </Reveal>

              {/* ── Content ─────────────────────────────────────────── */}
              <RevealGroup
                stagger={0.1}
                className="order-2 flex flex-col items-start px-8 pb-10 pt-4 sm:order-1 sm:px-10 sm:py-12 lg:px-12"
              >
                <Item dir="none" scale={0.9}>
                  <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#9aa5ff]">
                    2,600+ members
                  </span>
                </Item>
                <Item>
                  <h2 className="mb-3 text-[28px] font-bold leading-[1.1] tracking-tight text-white sm:text-[34px] lg:text-[40px]">
                    <Words text="Join Our Discord" stagger={0.06} />
                  </h2>
                </Item>
                <Item blur>
                  <p className="mb-7 max-w-[34ch] text-[14.5px] leading-relaxed text-white/55">
                    Events, rewards, and a community that never sleeps — come see what you&apos;ve been
                    missing.
                  </p>
                </Item>
                <Item scale={0.92}>
                  <Magnetic strength={0.3} max={12}>
                    <a
                      href="https://discord.gg/omegle"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 transition-all duration-300 hover:gap-3 hover:bg-[#4752c4] hover:shadow-xl hover:shadow-[#5865F2]/40 active:scale-[0.97]"
                    >
                      <span>Connect to Discord</span>
                      <FiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                  </Magnetic>
                </Item>
              </RevealGroup>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
