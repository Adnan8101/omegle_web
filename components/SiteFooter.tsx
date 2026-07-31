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
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; }
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

      {/* ── Ambient light — the one background the whole footer shares ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: '-6%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(1100px, 130%)', height: 520,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.2) 0%, rgba(88,101,242,0.07) 46%, transparent 74%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }}
      />

      {/* ── Crew artwork — painted straight onto the footer surface ──────
          Shot on black, so its own floor dissolves into the footer's canvas
          via the fade below rather than sitting on a separate coloured
          panel. Pulled down with a negative margin so the crew's feet
          overlap the content band instead of stopping flush above it. */}
      <div
        aria-hidden
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1180, margin: '0 auto',
          marginBottom: 'clamp(-72px, -8vw, -38px)',
        }}
      >
        <Reveal mount dir="up" distance={44} duration={0.9} scale={0.97} className="w-full">
          <ScrollParallax distance={18} className="w-full">
            <img
              src="/omeglee_footer.webp"
              alt="The Omeglee crew"
              width={1825}
              height={862}
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          </ScrollParallax>
        </Reveal>

        {/* fades the crew's own floor into the footer's black canvas */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 62%, #000000 97%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Footer content — same surface, no separate panel colour ──── */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'clamp(28px,4vw,44px) clamp(20px,6vw,80px) clamp(150px,16vw,230px)',
      }}>

        {/* 3-column grid */}
        <RevealGroup mount stagger={0.12} className="footer-grid relative z-[2]">

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
            <RevealGroup mount stagger={0.055} delay={0.12} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
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
            <RevealGroup mount stagger={0.055} delay={0.18} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
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
        <Reveal mount style={{
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

        {/* Giant OMEGLEE wordmark — a soft, fully-filled background flourish
            (not an outline), scaled purely off viewport width so it always
            fits edge-to-edge instead of hitting a fixed-px floor and
            overflowing on narrow phones. Lives in the reserved bottom
            padding zone, fully below the divider line. */}
        <div style={{
          position: 'absolute', inset: 'auto 0 clamp(-30px,-1.5vw,-14px) 0',
          zIndex: 1, display: 'flex', justifyContent: 'center',
          overflow: 'hidden', padding: '0 16px',
          pointerEvents: 'none', userSelect: 'none',
        }}>
        <Reveal mount dir="up" distance={30} duration={1} blur>
          <span aria-hidden style={{
            display: 'block',
            fontSize: 'clamp(40px,19vw,230px)',
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 0.86,
            whiteSpace: 'nowrap',
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(151,110,246,0.32) 55%, rgba(124,63,228,0.24) 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
          }}>
            OMEGLEE
          </span>
        </Reveal>
        </div>
      </div>
    </footer>
  );
}