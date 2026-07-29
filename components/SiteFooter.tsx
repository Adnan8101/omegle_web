'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Reveal, RevealGroup, Item, ScrollParallax } from '@/components/motion';

/* ── Main component ───────────────────────────────────────────── */
export default function SiteFooter() {
  const pages = [
    { label: 'Home', href: '/' },
    { label: 'Membership', href: '/memberships' },
    { label: 'Shop', href: '/shop' },
    { label: 'Team', href: '/team' },
    { label: 'Contact', href: '/#contact' },
  ];

  const forms = [
    { label: 'Staff Application', href: '/staff-application' },
    { label: 'Economy Leaderboard', href: '/economy-leaderboard' },
    { label: 'Gambling Hub', href: '/gambling' },
    { label: 'Wheel of Fortune', href: '/wheel' },
    { label: 'My Purchases', href: '/purchases' },
  ];

  return (
    <footer style={{ position: 'relative', background: '#000000', overflow: 'hidden' }}>

      {/* ── Styles ───────────────────────────────────────────── */}
      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: clamp(220px,38%,360px) 1fr 1fr;
          gap: clamp(28px,5vw,72px);
        }
        .crew-img { filter: drop-shadow(0 -8px 40px rgba(139,92,246,0.30)); }
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; }
          .crew-img { max-width: 560px !important; }
        }
        .footer-link {
          font-size: 17px;
          color: #8A8A95;
          text-decoration: none;
          display: inline-block;
          transition: color 0.2s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .footer-link:hover { color: #ffffff; transform: translateX(4px); }
        @media (prefers-reduced-motion: reduce) {
          .footer-link { transition: color 0.2s ease !important; }
          .footer-link:hover { transform: none !important; }
        }
      `}</style>

      {/* ── Crew band — illustrated Omeglee crew standing on the footer ── */}
      <div
        className="crew-band"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          marginBottom: '-1px',
        }}
      >
        {/* soft purple ground glow behind the crew */}
        <div
          aria-hidden
          style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: 'min(90%, 900px)', height: 180,
            background: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.35) 0%, transparent 70%)',
            filter: 'blur(30px)', pointerEvents: 'none',
          }}
        />
        <Reveal dir="up" distance={44} duration={0.9} scale={0.97} className="relative z-[1] w-full flex justify-center">
          <ScrollParallax distance={18} className="w-full flex justify-center">
            <img
              src="/footer_icon.png"
              alt="The Omeglee crew"
              className="crew-img"
              draggable={false}
              style={{
                width: '100%',
                maxWidth: 1060,
                height: 'auto',
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </ScrollParallax>
        </Reveal>
      </div>

      {/* ── Footer panel ──────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 5,
        background: '#15151C',
        borderRadius: '28px 28px 0 0',
        padding: 'clamp(44px,5.5vw,68px) clamp(20px,6vw,80px) clamp(150px,16vw,230px)',
        overflow: 'hidden',
      }}>
        {/* Top gradient glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 160,
          background: 'linear-gradient(180deg, rgba(123,63,228,0.07) 0%, transparent 100%)',
          borderRadius: '28px 28px 0 0',
          pointerEvents: 'none',
        }} />

        {/* 3-column grid */}
        <RevealGroup stagger={0.12} className="footer-grid relative z-[2]">

          {/* Col 1 — Brand */}
          <Item>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7B3FE4, #4A2FB0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(123,63,228,0.5)',
                flexShrink: 0, overflow: 'hidden', position: 'relative',
              }}>
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omeglee" fill className="object-cover" unoptimized
                />
              </div>
              <span style={{
                fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em',
                backgroundImage: 'linear-gradient(120deg, #7CC4FF 0%, #3B9EFF 45%, #FF8C00 115%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                WebkitTextFillColor: 'transparent', color: 'transparent',
              }}>
                Omeglee
              </span>
            </Link>

            <p style={{ fontSize: 17, color: '#8A8A95', lineHeight: 1.65, maxWidth: 320, margin: 0 }}>
              Where connections become conversations. Join the Omeglee Community — a vibrant space with thousands of active members.
            </p>
          </div>
          </Item>

          {/* Col 2 — Pages */}
          <Item>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 22px', letterSpacing: '-0.01em' }}>
              Pages
            </h3>
            <RevealGroup stagger={0.055} delay={0.12} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {pages.map((p) => (
                <Item key={p.label} dir="left" distance={14} duration={0.45}>
                  <Link href={p.href} className="footer-link">{p.label}</Link>
                </Item>
              ))}
            </RevealGroup>
          </div>
          </Item>

          {/* Col 3 — Forms & Applications */}
          <Item>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 22px', letterSpacing: '-0.01em' }}>
              Forms &amp; Applications
            </h3>
            <RevealGroup stagger={0.055} delay={0.18} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {forms.map((f) => (
                <Item key={f.label} dir="left" distance={14} duration={0.45}>
                  <Link href={f.href} className="footer-link">{f.label}</Link>
                </Item>
              ))}
            </RevealGroup>
          </div>
          </Item>
        </RevealGroup>

        {/* Divider + copyright */}
        <Reveal style={{
          position: 'relative', zIndex: 2,
          marginTop: 52,
          borderTop: '1px solid rgba(255,255,255,0.09)',
          paddingTop: 22, paddingBottom: 26,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 15, color: '#8A8A95' }}>© 2026 Omeglee. All rights reserved.</span>
          <span style={{ fontSize: 15, color: '#8A8A95' }}>Designed with ❤️ by the Omeglee Community</span>
        </Reveal>

        {/* Giant outlined OMEGLEE wordmark — thin elegant stroke, AUI-style.
            Lives in the reserved bottom padding zone, fully below the divider line. */}
        <div style={{
          position: 'absolute', bottom: 'clamp(-30px,-1.5vw,-14px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
        }}>
        <Reveal dir="up" distance={30} duration={1} blur style={{ position: 'relative' }}>
          {/* faint orange under-stroke, offset a touch for a two-tone edge */}
          <span aria-hidden style={{
            position: 'absolute', left: '1px', top: '1px',
            fontSize: 'clamp(96px,17vw,244px)', fontWeight: 800, letterSpacing: '-0.045em',
            lineHeight: 0.86, display: 'block',
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(255,138,24,0.14)',
          }}>
            OMEGLEE
          </span>
          <span style={{
            position: 'relative',
            fontSize: 'clamp(96px,17vw,244px)',
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 0.86,
            display: 'block',
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(80,130,255,0.30)',
          }}>
            OMEGLEE
          </span>
        </Reveal>
        </div>
      </div>
    </footer>
  );
}