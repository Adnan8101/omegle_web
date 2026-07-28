'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiAward, FiUsers, FiZap } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import { Reveal, RevealGroup, Item, Words, Magnetic, Tilt, CountUp } from '@/components/motion';

// ─── PAST EVENTS — the "memory book" ─────────────────────────────────────────
interface PastEvent {
  id: string;
  title: string;
  game: string;
  date: string;
  format: string;
  prize: string;
  meta: string; // teams / host / extra
  banner: string | null;
  accent: string; // gradient used for fallback + glow
  blurb: string;
  highlights: string[];
}

const EVENTS: PastEvent[] = [
  {
    id: 'ctf-5v5',
    title: 'Smash Karts CTF Tournament',
    game: 'Smash Karts',
    date: 'Feb 2026',
    format: '5v5 Capture the Flag',
    prize: '₹4,000',
    meta: '12 Teams',
    banner: '/events/smashkarts-ctf-5v5.webp',
    accent: 'linear-gradient(135deg,#3B82F6,#1E3A8A)',
    blurb:
      'Grab your kart and rally your squad. Our biggest 5v5 Capture the Flag showdown pitted twelve teams against each other for a ₹4,000 prize pool.',
    highlights: ['5v5 CTF format', '₹4,000 prize pool', '12-team bracket'],
  },
  {
    id: 'byt-ctf-s1',
    title: 'Bring Your Team CTF · Season 1',
    game: 'Smash Karts',
    date: 'Mar 2026',
    format: '4v4 Capture the Flag',
    prize: '₹1,500',
    meta: 'Bring your squad',
    banner: '/events/bring-your-team-ctf.webp',
    accent: 'linear-gradient(135deg,#F97316,#B45309)',
    blurb:
      'A fast-paced 4v4 Capture the Flag where strategy, speed, and aim decided the winner. Veterans and fresh teams locked in their spots before slots filled up.',
    highlights: ['4v4 CTF format', '1st ₹1,000 · 2nd ₹500', 'Team-based entry'],
  },
  {
    id: 'auction-s2',
    title: 'Smash Karts Auction · Season 2',
    game: 'Smash Karts',
    date: '12 Apr 2026',
    format: 'Auction Draft',
    prize: '₹2,500',
    meta: 'Captain draft',
    banner: '/events/smashkarts-ctf-auction.png',
    accent: 'linear-gradient(135deg,#8B5CF6,#4C1D95)',
    blurb:
      'Season 2 came back bigger and bolder. Captains strategised, bid, and built their dream teams on auction night — then battled through clutch moments for the crown.',
    highlights: ['Live auction draft', '₹2,500 prize pool', 'Captain-built teams'],
  },
  {
    id: 'bingo-night',
    title: 'Bingo & Gaming Night',
    game: 'Community',
    date: '15 May 2026',
    format: 'Bingo · Mini-games',
    prize: 'Giveaways',
    meta: 'Hosted by Rashika',
    banner: '/events/bingo-night.png',
    accent: 'linear-gradient(135deg,#EC4899,#7C3AED)',
    blurb:
      'An evening of mini-games, live Bingo rounds, giveaways, and a proper opening ceremony — all run through our custom bot and website so everyone could play and win.',
    highlights: ['Live Bingo rounds', 'Mini-games & giveaways', 'Hosted by Rashika'],
  },
];

export default function GamblingHubSection() {
  const [index, setIndex] = useState(0);
  const count = EVENTS.length;
  const ev = EVENTS[index];

  const go = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <section
      style={{ position: 'relative', width: '100%', zIndex: 10, background: '#000000', padding: 'clamp(56px,9vw,80px) 0' }}
    >
      <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', padding: '0 clamp(20px,5vw,48px)' }}>
        <div className="events-grid">

          {/* ─── LEFT COLUMN — intro + stats ─────────────────────── */}
          <RevealGroup
            stagger={0.1}
            className="w-full"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <Item dir="none" scale={0.85}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', padding: '5px 14px', borderRadius: '999px',
                  background: 'rgba(59,158,255,0.10)', border: '1px solid rgba(59,158,255,0.28)',
                  color: '#7CC4FF', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', marginBottom: '20px',
                }}
              >
                Our Event Legacy
              </span>
            </Item>

            <Item>
              <h2
                style={{
                  fontSize: 'clamp(30px,5.6vw,48px)', fontWeight: 800, color: '#ffffff',
                  lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 20px 0',
                }}
              >
                <Words text="Every Tournament" style={{ display: 'block' }} />
                <Words text="We've Hosted" style={{ display: 'block' }} delay={0.16} />
              </h2>
            </Item>

            <Item blur>
              <p style={{ color: '#9a9aa8', fontSize: '15px', lineHeight: 1.65, maxWidth: '420px', margin: '0 0 28px 0' }}>
                From high-stakes Smash Karts CTF battles to community Bingo nights — flip through the events Omeglee has run,
                the prizes we&apos;ve given out, and the champions we&apos;ve crowned.
              </p>
            </Item>

            {/* stat pills — each counts up as the section lands */}
            <Item>
              <RevealGroup stagger={0.09} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
                {[
                  { value: count, suffix: ' events', sub: 'hosted', plain: false },
                  { value: 8000, prefix: '₹', suffix: '+', sub: 'in prizes', plain: false },
                  { value: 2026, sub: 'season', plain: true },
                ].map((s) => (
                  <Item key={s.sub} distance={14} scale={0.9}>
                    <div
                      className="events-stat"
                      style={{
                        padding: '10px 16px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                      }}
                    >
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                        <CountUp
                          value={s.value}
                          prefix={s.prefix}
                          suffix={s.suffix}
                          format={s.plain ? (n) => String(Math.round(n)) : undefined}
                        />
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.sub}</div>
                    </div>
                  </Item>
                ))}
              </RevealGroup>
            </Item>

            <Item scale={0.9}>
              <Magnetic strength={0.25} max={10}>
                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '13px 26px', borderRadius: '999px',
                    background: '#ffffff', color: '#0a0a0f', fontSize: '15px', fontWeight: 700,
                    textDecoration: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                  }}
                  className="events-cta"
                >
                  <FaDiscord style={{ width: 18, height: 18 }} />
                  Join Discord
                </a>
              </Magnetic>
            </Item>
          </RevealGroup>

          {/* ─── RIGHT COLUMN — the flip-through event card ───────── */}
          <Reveal dir="left" distance={36} delay={0.08} scale={0.96} className="w-full">
          <div style={{ position: 'relative', width: '100%' }}>
            {/* ambient glow tinted to the current event */}
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: '-10% -6%', borderRadius: '32px', zIndex: 0,
                background: ev.accent, opacity: 0.18, filter: 'blur(60px)', transition: 'background 0.5s ease',
              }}
            />

            <Tilt max={5} scale={1.008} perspective={1400} style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                position: 'relative', borderRadius: '22px', overflow: 'hidden',
                background: 'linear-gradient(180deg,#14141b,#0a0a0f)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
              }}
            >
              {/* Banner */}
              <div key={ev.id} className="event-banner" style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
                {ev.banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.banner}
                    alt={ev.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: ev.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiAward style={{ width: 64, height: 64, color: 'rgba(255,255,255,0.85)' }} />
                  </div>
                )}
                {/* bottom fade */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.15) 45%, transparent 70%)' }} />

                {/* status + date */}
                <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', backdropFilter: 'blur(6px)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} /> Completed
                  </span>
                </div>
                <span style={{ position: 'absolute', top: 14, right: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(6px)' }}>
                  <FiCalendar style={{ width: 12, height: 12 }} /> {ev.date}
                </span>

                {/* title on banner */}
                <div style={{ position: 'absolute', left: 20, right: 20, bottom: 16 }}>
                  <div style={{ color: '#7CC4FF', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{ev.game}</div>
                  <h3 style={{ color: '#fff', fontSize: 'clamp(20px,3.2vw,26px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>{ev.title}</h3>
                </div>

                {/* nav arrows over banner */}
                <button onClick={() => go(-1)} aria-label="Previous event" className="event-arrow" style={{ left: 12 }}>
                  <FiChevronLeft style={{ width: 20, height: 20 }} />
                </button>
                <button onClick={() => go(1)} aria-label="Next event" className="event-arrow" style={{ right: 12 }}>
                  <FiChevronRight style={{ width: 20, height: 20 }} />
                </button>
              </div>

              {/* Body */}
              <div key={`${ev.id}-body`} className="event-body" style={{ padding: 'clamp(18px,3vw,26px)' }}>
                {/* meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[
                    { icon: <FiZap style={{ width: 13, height: 13 }} />, label: ev.format },
                    { icon: <FiAward style={{ width: 13, height: 13 }} />, label: ev.prize },
                    { icon: <FiUsers style={{ width: 13, height: 13 }} />, label: ev.meta },
                  ].map((c, i) => (
                    <span key={i} className="event-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: 600, animationDelay: `${0.1 + i * 0.07}s` }}>
                      <span style={{ color: '#7CC4FF' }}>{c.icon}</span>{c.label}
                    </span>
                  ))}
                </div>

                <p style={{ color: '#9a9aa8', fontSize: 14.5, lineHeight: 1.62, margin: '0 0 16px 0' }}>{ev.blurb}</p>

                {/* highlights */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {ev.highlights.map((h, i) => (
                    <li key={h} className="event-chip" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.78)', fontSize: 13.5, fontWeight: 500, animationDelay: `${0.26 + i * 0.07}s` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B9EFF', flexShrink: 0, boxShadow: '0 0 8px rgba(59,158,255,0.7)' }} />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer nav — prev/next controls + dots + counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 clamp(18px,3vw,26px) 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => go(-1)} aria-label="Previous event" className="event-nav-btn">
                    <FiChevronLeft style={{ width: 20, height: 20 }} />
                  </button>
                  <button onClick={() => go(1)} aria-label="Next event" className="event-nav-btn">
                    <FiChevronRight style={{ width: 20, height: 20 }} />
                  </button>
                  <div style={{ display: 'flex', gap: 7, marginLeft: 6 }}>
                    {EVENTS.map((e, i) => (
                      <button
                        key={e.id}
                        onClick={() => setIndex(i)}
                        aria-label={`Go to ${e.title}`}
                        style={{
                          width: i === index ? 26 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0,
                          background: i === index ? 'linear-gradient(90deg,#3B9EFF,#2563EB)' : 'rgba(255,255,255,0.18)',
                          transition: 'width 0.3s ease, background 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>
                  {String(index + 1).padStart(2, '0')} <span style={{ color: 'rgba(255,255,255,0.28)' }}>/ {String(count).padStart(2, '0')}</span>
                </span>
              </div>
            </div>
            </Tilt>
          </div>
          </Reveal>

        </div>
      </div>

      <style>{`
        .events-grid {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 56px;
          align-items: center;
        }
        @media (max-width: 1024px) {
          .events-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
        .event-arrow {
          position: absolute; top: 42%; transform: translateY(-50%);
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10,10,15,0.78); border: 1px solid rgba(255,255,255,0.28);
          color: #fff; cursor: pointer; backdrop-filter: blur(8px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.5);
          transition: background 0.2s ease, transform 0.2s ease; z-index: 4;
        }
        .event-arrow:hover { background: rgba(37,99,235,0.95); transform: translateY(-50%) scale(1.08); }
        .event-arrow:active { transform: translateY(-50%) scale(0.94); }
        .event-nav-btn {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16);
          color: #fff; cursor: pointer; padding: 0;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .event-nav-btn:hover { background: rgba(59,158,255,0.9); border-color: rgba(59,158,255,0.9); }
        .event-nav-btn:active { transform: scale(0.92); }
        /* movement is handled by the <Magnetic> wrapper — keep the shadow bloom here only */
        .events-cta { transition: box-shadow 0.25s ease; }
        .events-cta:hover { box-shadow: 0 14px 34px rgba(0,0,0,0.45); }
        .events-stat {
          transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), background 0.25s ease, border-color 0.25s ease;
        }
        .events-stat:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.07);
          border-color: rgba(59,158,255,0.35);
        }
        @keyframes eventFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes eventChipIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .event-banner { animation: eventFade 0.45s ease both; }
        .event-body { animation: eventFade 0.45s ease 0.05s both; }
        .event-chip { animation: eventChipIn 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .event-banner, .event-body, .event-chip { animation: none !important; }
          .event-arrow, .events-cta, .events-stat { transition: none !important; }
        }
      `}</style>
    </section>
  );
}
