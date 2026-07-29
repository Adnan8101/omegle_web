'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Reveal, RevealGroup, Item, ScrollParallax } from '@/components/motion';

/* ── Social icon SVGs ─────────────────────────────────────────── */
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);
const IconGithub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);
const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const IconYouTube = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

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
    { label: 'Purchases', href: '/purchases' },
  ];

  const socials = [
    { icon: <IconX />, href: 'https://x.com/', label: 'X (Twitter)' },
    { icon: <IconGithub />, href: 'https://github.com/', label: 'GitHub' },
    { icon: <IconLinkedIn />, href: 'https://linkedin.com/', label: 'LinkedIn' },
    { icon: <IconYouTube />, href: 'https://youtube.com/', label: 'YouTube' },
    { icon: <IconInstagram />, href: 'https://instagram.com/', label: 'Instagram' },
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
        .social-icon {
          color: #8A8A95;
          display: flex;
          transition: color 0.2s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .social-icon:hover { color: #ffffff; transform: translateY(-4px) scale(1.12); }
        @media (prefers-reduced-motion: reduce) {
          .footer-link, .social-icon { transition: color 0.2s ease !important; }
          .footer-link:hover, .social-icon:hover { transform: none !important; }
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

            <RevealGroup stagger={0.07} delay={0.15} style={{ display: 'flex', gap: 18, marginTop: 4, flexWrap: 'wrap' }}>
              {socials.map((s) => (
                <Item key={s.label} dir="none" scale={0.6} duration={0.45}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer"
                    aria-label={s.label} className="social-icon">
                    {s.icon}
                  </a>
                </Item>
              ))}
            </RevealGroup>
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