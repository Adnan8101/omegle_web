'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Item, Reveal, RevealGroup, Tilt, Words } from '@/components/motion';
import SegmentedControl from '@/components/ui/SegmentedControl';

const NAV_OPTIONS = [
  { id: 'shop', label: 'Shop' },
  { id: 'past', label: 'Past Orders', title: 'What the community has bought' },
  { id: 'purchased', label: 'Purchased', title: 'What you’ve bought' },
];

/**
 * Art-first hero. The copy is two lines, tops — the render and the "Omeglee
 * Shop" title carry the section, not a wall of feature bullets.
 */
export default function ShopHero({ currencyName }: { currencyName: string }) {
  const router = useRouter();

  return (
    <section className="relative w-full z-10 overflow-hidden pt-[104px] sm:pt-[124px]">
      <div className="w-full max-w-[1300px] mx-auto px-6 sm:px-12 lg:px-16 pb-10 sm:pb-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Copy ─────────────────────────────────────────────── */}
          <RevealGroup stagger={0.1} className="flex flex-col items-start w-full order-2 lg:order-1">
            <Item>
              <h1 className="text-[40px] sm:text-[54px] lg:text-[64px] font-extrabold text-white leading-[1.02] tracking-[-0.035em] mb-5 max-w-[560px]">
                <Words text="Omeglee Shop" mount delay={0.1} distance={22} />
              </h1>
            </Item>

            <Item blur>
              <p className="text-[#a0a0b0] text-[15px] leading-[1.65] max-w-[420px] mb-9">
                Redeem your {currencyName} for gift cards, Nitro and server perks.
              </p>
            </Item>

            <Item scale={0.94}>
              <SegmentedControl
                options={NAV_OPTIONS}
                value="shop"
                onChange={(id) => {
                  if (id === 'past') router.push('/recent-purchases');
                  if (id === 'purchased') router.push('/purchases');
                }}
                layoutId="shop-hero-nav"
                size="lg"
              />
            </Item>
          </RevealGroup>

          {/* ── Storefront render ────────────────────────────────── */}
          <Reveal dir="right" distance={40} blur scale={0.96} className="relative w-full order-1 lg:order-2">
            <Tilt max={6} scale={1.015} perspective={1400} className="relative w-full">
              <div
                className="relative w-full rounded-[26px] overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px -40px rgba(0,0,0,0.9)' }}
              >
                <Image
                  src="/Omegle_shop.png"
                  alt="The Omeglee shop — shelves of gift cards, Nitro and in-game credit"
                  width={1536}
                  height={1024}
                  priority
                  className="w-full h-auto object-cover select-none block"
                  draggable={false}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(6,6,8,0.5) 0%, transparent 35%)' }} />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3B9EFF]/50 to-transparent" />
              </div>
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
