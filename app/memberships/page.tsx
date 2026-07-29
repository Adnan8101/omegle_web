'use client';
import Link from 'next/link';
import { FiArrowLeft, FiBell, FiGift, FiShield, FiZap } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import { Reveal, RevealGroup, Item, Words, Magnetic, FloatIn, ScrollParallax } from '@/components/motion';

const PERKS = [
  { icon: <FiShield className="w-4 h-4" />, label: 'Exclusive Roles' },
  { icon: <FiZap className="w-4 h-4" />, label: 'Priority Perks' },
  { icon: <FiGift className="w-4 h-4" />, label: 'Member Rewards' },
];

export default function MembershipsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 py-28 sm:py-32">
      {/* ── Ambient background glows ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <ScrollParallax distance={40} className="absolute" style={{ top: '-12%', left: '-8%' }}>
          <div
            style={{
              width: 560,
              height: 560,
              background: 'radial-gradient(ellipse at center, rgba(59,158,255,0.20) 0%, rgba(59,158,255,0.06) 45%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
        </ScrollParallax>
        <ScrollParallax distance={30} className="absolute" style={{ bottom: '-15%', right: '-10%' }}>
          <div
            style={{
              width: 600,
              height: 600,
              background: 'radial-gradient(ellipse at center, rgba(255,140,0,0.16) 0%, rgba(124,58,237,0.08) 45%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
        </ScrollParallax>
      </div>

      {/* Back link */}
      <Reveal mount dir="down" distance={16} className="absolute top-20 sm:top-24 left-4 sm:left-8 z-20">
        <Magnetic strength={0.3} max={10}>
          <Link
            href="/"
            className="flex items-center justify-center w-12 h-12 glass-blue rounded-2xl border border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5 apple-transition shadow-lg shadow-black/20"
          >
            <FiArrowLeft className="w-5 h-5 text-white/80" />
          </Link>
        </Magnetic>
      </Reveal>

      {/* ── Floating decorative badges — ambient scene dressing ──── */}
      <FloatIn
        rotate={-14}
        opacity={0.6}
        amplitude={11}
        duration={7}
        delay={0.4}
        className="absolute pointer-events-none hidden md:flex flex-col items-center justify-center gap-1.5"
        style={{
          top: '16%',
          left: '9%',
          width: 132,
          height: 132,
          borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(59,158,255,0.16), rgba(10,10,15,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        <FiShield className="w-8 h-8 text-blue-400" />
        <span className="text-white/70 font-semibold text-[11px]">Exclusive</span>
      </FloatIn>

      <FloatIn
        rotate={12}
        opacity={0.6}
        amplitude={13}
        duration={8}
        delay={0.6}
        className="absolute pointer-events-none hidden md:flex flex-col items-center justify-center gap-1.5"
        style={{
          top: '14%',
          right: '10%',
          width: 132,
          height: 132,
          borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(255,140,0,0.16), rgba(10,10,15,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        <FiGift className="w-8 h-8 text-orange-400" />
        <span className="text-white/70 font-semibold text-[11px]">Rewards</span>
      </FloatIn>

      <FloatIn
        rotate={-9}
        opacity={0.55}
        amplitude={10}
        duration={7.5}
        delay={0.8}
        className="absolute pointer-events-none hidden lg:flex flex-col items-center justify-center gap-1.5"
        style={{
          bottom: '18%',
          left: '14%',
          width: 116,
          height: 116,
          borderRadius: 26,
          background: 'linear-gradient(145deg, rgba(124,58,237,0.18), rgba(10,10,15,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        <FiZap className="w-7 h-7 text-purple-400" />
        <span className="text-white/70 font-semibold text-[10px]">Priority</span>
      </FloatIn>

      <FloatIn
        rotate={10}
        opacity={0.55}
        amplitude={9}
        duration={6.5}
        delay={1}
        className="absolute pointer-events-none hidden lg:flex flex-col items-center justify-center gap-2"
        style={{
          bottom: '16%',
          right: '13%',
          width: 150,
          height: 92,
          borderRadius: 20,
          background: 'linear-gradient(160deg, #5865F2 0%, #3b3fa1 100%)',
          boxShadow: '0 25px 60px rgba(88,101,242,0.35)',
          zIndex: 1,
        }}
      >
        <FaDiscord className="text-white w-7 h-7" />
      </FloatIn>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center text-center">
        <RevealGroup mount stagger={0.12} className="flex flex-col items-center gap-6">
          <Item dir="none" scale={0.7}>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl scale-150" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 shadow-[0_0_50px_rgba(59,158,255,0.35)]">
                <FiBell className="w-9 h-9 text-blue-300" />
              </div>
            </div>
          </Item>

          <Item dir="none" scale={0.85}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">Coming Soon</span>
            </div>
          </Item>

          <Item>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
              <Words text="Omeglee" mount delay={0.2} distance={26} style={{ color: '#FF8C00' }} />{' '}
              <Words text="Memberships" mount delay={0.35} distance={26} className="text-white" />
            </h1>
          </Item>

          <Item blur>
            <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              We&apos;re crafting a brand-new membership experience — exclusive roles, priority perks, and
              rewards built just for our most dedicated members. Stay tuned.
            </p>
          </Item>

          <Item>
            <RevealGroup mount stagger={0.08} delay={0.6} className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {PERKS.map((p) => (
                <Item key={p.label} dir="up" distance={14} scale={0.92}>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-blue border border-[rgb(var(--color-border))]/60 text-white/80 text-xs font-semibold">
                    <span className="text-blue-400">{p.icon}</span>
                    {p.label}
                  </div>
                </Item>
              ))}
            </RevealGroup>
          </Item>

          <Item className="pt-3" scale={0.9}>
            <Magnetic strength={0.28} max={11}>
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white hover:bg-slate-100 text-black font-bold rounded-full text-base transition-colors duration-300 shadow-lg shadow-black/20"
              >
                <FaDiscord className="w-4.5 h-4.5" />
                Join Discord for Updates
              </a>
            </Magnetic>
          </Item>

          <Item>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm font-medium transition-colors group mt-2"
            >
              <FiArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to Home
            </Link>
          </Item>
        </RevealGroup>
      </div>
    </main>
  );
}
