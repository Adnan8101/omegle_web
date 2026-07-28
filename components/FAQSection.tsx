'use client';
import { useState } from 'react';
import { FiChevronDown, FiArrowUpRight } from 'react-icons/fi';
import { Reveal, RevealGroup, Item } from '@/components/motion';

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
    <div className="group border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer"
      >
        <span className="flex-1 text-[15px] sm:text-base font-semibold text-white group-hover:text-white/85 transition-colors">
          {q}
        </span>
        <FiChevronDown
          className={`w-4.5 h-4.5 flex-shrink-0 transition-all duration-300 ${open ? 'rotate-180 text-blue-400' : 'text-white/40 group-hover:text-white/70'}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-white/55 leading-relaxed pb-5 pr-8 max-w-[500px]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  return (
    <div className="w-full order-1 lg:order-2 flex flex-col">
      <RevealGroup stagger={0.1} className="flex flex-col items-start w-full mb-8">
        <Item>
          <span className="block text-[#3B9EFF] font-semibold text-[13px] tracking-wide uppercase mb-2">FAQ&apos;s</span>
        </Item>
        <Item>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-white leading-[1.15] tracking-tight mb-4">
            Looking for answers?
          </h2>
        </Item>
        <Item blur>
          <p className="text-white/60 text-[15px] leading-relaxed max-w-[480px]">
            Everything you need to know about joining, earning Ozy, and getting the most out of the community.
          </p>
        </Item>
      </RevealGroup>

      <RevealGroup stagger={0.06} className="w-full">
        {FAQS.map((item) => (
          <Item key={item.q} distance={14}>
            <FAQItem q={item.q} a={item.a} />
          </Item>
        ))}
      </RevealGroup>

      <Reveal delay={0.1} className="mt-8">
        <a
          href="https://discord.gg/omegle"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/80 text-[14px] font-medium transition-colors group"
        >
          Still have questions? Ask us on Discord
          <FiArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </Reveal>
    </div>
  );
}
