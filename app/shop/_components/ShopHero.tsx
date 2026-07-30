'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { FiArrowDown, FiArrowUpRight } from 'react-icons/fi';
import Link from 'next/link';
import { Item, Magnetic, Reveal, RevealGroup, Words } from '@/components/motion';

/**
 * Asymmetric hero: editorial copy on the left, the storefront render on the
 * right. One idea per side, nothing decorative competing with either — the
 * budget figures live once, in the pool panel below, not repeated here.
 */
export default function ShopHero({ currencyName }: { currencyName: string }) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: stage, offset: ['start start', 'end start'] });
  const rawScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const scale = useSpring(rawScale, { stiffness: 90, damping: 26, mass: 0.35 });
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.3]);

  return (
    <section className="relative z-10 w-full pt-[104px] sm:pt-[132px]">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-5 pb-14 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:pb-20">
        {/* ══ Copy ═══════════════════════════════════════════════════ */}
        <div className="order-2 lg:order-1">
          <RevealGroup mount stagger={0.085} delay={0.1}>
            <Item dir="none" scale={0.9}>
              <span className="sx-eyebrow">Casino economy store</span>
            </Item>

            <Item>
              <h1 className="sx-display mt-4 text-[clamp(36px,6.2vw,60px)] font-extrabold">
                <Words text="Real rewards," mount delay={0.2} distance={20} className="block text-[var(--sx-ink)]" />
                <Words text="earned by hanging out." mount delay={0.34} distance={20} className="block" style={{ color: '#9c8dff' }} />
              </h1>
            </Item>

            <Item blur>
              <p className="mt-5 max-w-[46ch] text-[15px] leading-[1.65] text-[var(--sx-ink-2)]">
                Gift cards, Nitro, in-game credit, server perks — bought with the{' '}
                <span className="font-semibold text-[var(--sx-ink)]">{currencyName}</span> you earn just by
                being around.
              </p>
            </Item>

            <Item className="mt-7">
              <div className="flex flex-wrap items-center gap-3">
                <Magnetic strength={0.2} max={8}>
                  <a
                    href="#shelves"
                    className="sx-focus group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[14px] font-bold text-black transition-colors hover:bg-[#eceaff]"
                  >
                    Browse the shelves
                    <FiArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                  </a>
                </Magnetic>
                <Magnetic strength={0.18} max={7}>
                  <Link
                    href="/recent-purchases"
                    className="sx-focus group inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-[14px] font-semibold text-[var(--sx-ink)] transition-colors hover:border-[var(--sx-hair-2)]"
                    style={{ borderColor: 'var(--sx-hair)' }}
                  >
                    See what&apos;s selling
                    <FiArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </Magnetic>
              </div>
            </Item>
          </RevealGroup>
        </div>

        {/* ══ Storefront render ══════════════════════════════════════ */}
        <div ref={stage} className="relative order-1 lg:order-2">
          <motion.div style={reduce ? undefined : { scale, opacity }}>
            <Reveal mount dir="up" distance={28} duration={0.9} delay={0.15} blur scale={0.97}>
              <Image
                src="/Omegle_shop.png"
                alt="The Omeglee shop — shelves of gift cards, Nitro and in-game credit"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 1024px) 100vw, 620px"
                className="block h-auto w-full select-none"
                draggable={false}
                style={{ filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.7))' }}
              />
            </Reveal>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
