'use client';
import Image from 'next/image';
import { useState } from 'react';
import { FiArrowUpRight, FiPlus } from 'react-icons/fi';
import { Item, Reveal, RevealGroup, Tilt } from '@/components/motion';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Omeglee?',
    a: 'Omeglee is a Discord community built around events, games, and rewards — a place to hang out, join tournaments, and earn Ozy just for being active in the server.',
  },
  {
    q: 'How do I join the community?',
    a: 'Hit "Join the Server" anywhere on this page to head to our Discord invite. Once you\'re in, check the welcome channels for how everything works.',
  },
  {
    q: 'What is Ozy and how do I earn it?',
    a: 'Ozy is our server currency. It builds up automatically the more you hang out — chatting, joining voice channels, and showing up for events all add to your balance.',
  },
  {
    q: 'Is the casino / gambling hub fair?',
    a: 'Yes — every spin and every outcome is generated and verified server-side. The client only plays the animation; it can never influence the result.',
  },
  {
    q: 'How do I spend my Ozy?',
    a: 'Visit the Rewards Shop to redeem Ozy for roles, perks, and other items, or use it to play in the Gambling Hub for a shot at bigger rewards.',
  },
  {
    q: 'How do I apply for staff?',
    a: 'Head to the Staff Application page linked in the footer. We review applications regularly and reach out over Discord if you\'re a good fit.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="flex-1 text-[14.5px] font-bold text-white transition-colors group-hover:text-white/80 sm:text-[15.5px]">
          {q}
        </span>
        <FiPlus
          aria-hidden
          className={`h-4 w-4 flex-shrink-0 transition-all duration-300 ${
            open ? 'rotate-45 text-[#3B9EFF]' : 'text-white/40 group-hover:text-white/75'
          }`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="max-w-[52ch] pb-4 pr-8 text-[13.5px] leading-relaxed text-white/50">{a}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Two columns, vertically centered: the mascot on one side, the questions on
 * the other. On mobile the same two blocks simply stack — art, then heading
 * and accordion — so nothing needs a separate mobile layout to feel deliberate.
 *
 * The render is shot on pure black. Now that the section itself is flat
 * black with nothing glowing behind the art, the image's own canvas needs no
 * crop, mask, or blend trick at all — black-on-black is simply invisible, so
 * the full illustration shows uncropped and the "frame" disappears on its own.
 */
export default function FAQSection() {
  return (
    <section className="relative w-full z-10 overflow-hidden bg-black">
      <div className="mx-auto w-full max-w-[1300px] px-6 py-14 sm:px-12 sm:py-20 lg:px-16 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-14">
          {/* ── Artwork ──────────────────────────────────────────── */}
          <Reveal dir="left" distance={36} blur scale={0.96} className="relative flex w-full justify-center lg:justify-start">
            <Tilt max={5} scale={1.02} perspective={1400} className="relative w-full max-w-[340px] lg:max-w-[400px]">
              <Image
                src="/omeglee_faq.png"
                alt="Omeglee mascot holding an FAQ list"
                width={1536}
                height={1024}
                className="h-auto w-full select-none"
                draggable={false}
              />
            </Tilt>
          </Reveal>

          {/* ── Questions ────────────────────────────────────────── */}
          <div className="w-full">
            <RevealGroup stagger={0.1} className="mb-6 flex flex-col items-start">
              <Item>
                <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-[#3B9EFF]">FAQ&apos;s</span>
              </Item>
              <Item>
                <h2 className="mb-3 text-[30px] font-bold leading-[1.12] tracking-tight text-white sm:text-[38px] lg:text-[44px]">
                  Looking for answers?
                </h2>
              </Item>
              <Item blur>
                <p className="max-w-[480px] text-[14.5px] leading-relaxed text-white/55">
                  Everything you need to know about joining, earning Ozy, and getting the most out of the
                  community.
                </p>
              </Item>
            </RevealGroup>

            <Reveal dir="up" distance={16}>
              <div>
                {FAQS.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.1} className="mt-6">
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-white/40 transition-colors hover:text-white/80"
              >
                Still have questions? Ask us on Discord
                <FiArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
