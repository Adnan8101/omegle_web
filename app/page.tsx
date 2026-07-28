'use client';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowRight, FiArrowUpRight, FiChevronDown, FiPackage, FiServer, FiShield, FiX, FiZap } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import GamblingHubSection from '@/components/GamblingHubSection';
import {
  Reveal,
  RevealGroup,
  Item,
  CountUp,
  Words,
  FloatIn,
  Magnetic,
  Tilt,
  HoverLift,
  ScrollParallax,
  ScrollProgress,
} from '@/components/motion';

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

interface OzyShopItem {
  id: string;
  name: string;
  price: number;
  price_inr?: number | null;
  description: string | null;
  thumbnail: string | null;
}

export default function Home() {
  const { theme } = useTheme();
  const [ozyItems, setOzyItems] = useState<OzyShopItem[]>([]);
  const [exploreEventModalOpen, setExploreEventModalOpen] = useState(false);
  const [ozyLoading, setOzyLoading] = useState(true);
  const [ozyCurrencyEmoji, setOzyCurrencyEmoji] = useState('🪙');
  const [selectedOzyItem, setSelectedOzyItem] = useState<OzyShopItem | null>(null);
  const [ozyBudget, setOzyBudget] = useState<{ available: number; total_added: number } | null>(null);

  useEffect(() => {
    fetch('/api/shop', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.shopDisabled) return;
        setOzyCurrencyEmoji(data?.config?.currencyEmoji || '🪙');
        setOzyItems(
          [...(data?.items || [])]
            .sort((a: OzyShopItem, b: OzyShopItem) => b.price - a.price)
            .slice(0, 12)
        );
        if (data?.budget) setOzyBudget(data.budget);
      })
      .catch((err) => console.error('Error fetching ozy shop preview:', err))
      .finally(() => setOzyLoading(false));
  }, []);

  const formatNumber = (n: number) => n.toLocaleString();
  const renderOzyEmoji = (size: string = 'w-4 h-4') => {
    const emojiMatch = ozyCurrencyEmoji.match(/<a?:([\w_]+):(\d+)>/);
    if (emojiMatch) {
      const [, name, id] = emojiMatch;
      const isAnimated = ozyCurrencyEmoji.startsWith('<a:');
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=48&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
        />
      );
    }
    return <span className={size}>{ozyCurrencyEmoji}</span>;
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center">
      <ScrollProgress />
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <video
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover opacity-20 dark:opacity-10"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/Discord:Omegle.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--color-bg-primary))]/80 via-[rgb(var(--color-bg-primary))]/50 to-[rgb(var(--color-bg-primary))]" />
      </div>
      {theme === 'light' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 -left-4 w-[500px] h-[500px] bg-sky-300/10 rounded-full filter blur-3xl opacity-55 animate-float" />
          <div className="absolute top-0 -right-4 w-[600px] h-[600px] bg-blue-300/10 rounded-full filter blur-3xl opacity-55 animate-float" style={{ animationDelay: '2s' }} />
        </div>
      )}
      {}
      {/* ─── Hero Section ───────────────────────────────────────────── */}
      <section className="relative w-full z-10 flex flex-col items-center pt-20 sm:pt-32 pb-0">
        
        {/* Text + CTA */}
        <div className="w-full max-w-4xl px-4 sm:px-6 text-center flex flex-col items-center gap-5">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            <Words
              text="Welcome to"
              mount
              delay={0.15}
              distance={26}
              className="block text-white"
            />
            <span className="block">
              <Words text="Omeglee" mount delay={0.4} distance={26} style={{ color: '#FF8C00' }} />{' '}
              <Words text="Community" mount delay={0.55} distance={26} style={{ color: '#3B9EFF' }} />
            </span>
          </h1>

          <RevealGroup mount stagger={0.12} delay={0.85} className="flex flex-col items-center gap-5">
            <Item blur>
              <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Where connections become conversations. Join a vibrant, active community with fun events, games, and rewards for everyone!
              </p>
            </Item>

            <Item className="pt-1" scale={0.9}>
              <Magnetic strength={0.25} max={10}>
                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-9 py-3.5 bg-white hover:bg-slate-100 text-black font-bold rounded-full text-base transition-colors duration-300"
                >
                  Join the Server
                </a>
              </Magnetic>
            </Item>
          </RevealGroup>
        </div>

        {/* ─── 3D Phone Showcase · Facing Pair ─────────────────── */}
        <div
          className="relative w-full mt-2 hero-showcase"
          style={{ height: 'clamp(340px, 48vh, 480px)', overflow: 'hidden' }}
        >
          {/* Darkened vignette behind phone area */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,0.3) 0%, transparent 60%)',
            }}
          />

          {/* Ambient blue glow between the two phones */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '420px',
              height: '420px',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(59,158,255,0.22) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Ambient shadow pool grounding the phone cluster */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '620px',
              height: '90px',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.45) 0%, transparent 70%)',
              filter: 'blur(20px)',
              zIndex: 1,
            }}
          />

          {/* ── Decorative corner cards · ambient scene dressing ── */}
          {/* Top-left: glowing screen-edge card */}
          <FloatIn
            rotate={-16}
            opacity={0.55}
            amplitude={11}
            duration={7.5}
            delay={0.7}
            className="absolute pointer-events-none hidden sm:block"
            style={{
              top: '-2%',
              left: '-9%',
              width: '260px',
              height: '160px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(32,34,44,0.9), rgba(8,8,12,0.95))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -6px 40px rgba(59,158,255,0.35), 0 20px 50px rgba(0,0,0,0.5)',
              zIndex: 2,
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '5px',
              background: 'linear-gradient(90deg, transparent, rgba(96,180,255,0.9), transparent)',
              filter: 'blur(1px)',
            }} />
          </FloatIn>

          {/* Top-right: Discord brand card */}
          <FloatIn
            rotate={13}
            opacity={0.6}
            amplitude={13}
            duration={6.5}
            delay={0.85}
            className="absolute pointer-events-none hidden sm:flex flex-col items-center justify-center gap-2"
            style={{
              top: '1%',
              right: '-10%',
              width: '190px',
              height: '230px',
              borderRadius: '26px',
              background: 'linear-gradient(160deg, #5865F2 0%, #3b3fa1 100%)',
              boxShadow: '0 25px 60px rgba(88,101,242,0.35)',
              zIndex: 2,
            }}
          >
            <FaDiscord className="text-white" style={{ width: '56px', height: '56px' }} />
            <span className="text-white font-bold text-xs tracking-wide">Omeglee</span>
          </FloatIn>

          {/* Bottom-right: boost-style gradient card */}
          <FloatIn
            rotate={-11}
            opacity={0.55}
            amplitude={10}
            duration={8}
            delay={1}
            className="absolute pointer-events-none hidden sm:flex flex-col items-center justify-center"
            style={{
              bottom: '8%',
              right: '-9%',
              width: '180px',
              height: '105px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #7c3aed, #4338ca)',
              boxShadow: '0 20px 50px rgba(124,58,237,0.35)',
              zIndex: 2,
            }}
          >
            <span className="text-white font-extrabold text-lg tracking-wide">BOOST</span>
            <span className="text-white/80 font-semibold text-[10px] tracking-widest uppercase">Omeglee</span>
          </FloatIn>

          {/* Bottom-left: community cluster card */}
          <FloatIn
            rotate={11}
            opacity={0.55}
            amplitude={12}
            duration={7}
            delay={0.55}
            className="absolute pointer-events-none hidden sm:flex flex-col items-center justify-center gap-2"
            style={{
              bottom: '4%',
              left: '-8%',
              width: '210px',
              height: '150px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(32,34,44,0.9), rgba(8,8,12,0.95))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              zIndex: 2,
            }}
          >
            <RevealGroup mount stagger={0.07} delay={1.1} style={{ display: 'flex' }}>
              {['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'].map((color, i) => (
                <Item
                  key={color}
                  dir="none"
                  scale={0.4}
                  style={{ marginLeft: i === 0 ? 0 : '-10px' }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: color,
                      border: '2px solid rgba(10,10,14,0.9)',
                    }}
                  />
                </Item>
              ))}
            </RevealGroup>
            <span className="text-white/90 font-semibold text-[11px]">2,600+ members</span>
          </FloatIn>

          {/* 3D Stage — each phone carries its own local perspective */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              height: '100%',
              margin: '0 auto',
            }}
          >

            {/* ── CENTER PHONE (Mobile Only) ─── */}
            <Reveal
              mount
              dir="up"
              distance={44}
              delay={0.5}
              duration={1.1}
              className="hero-phone-center block sm:hidden"
              style={{ position: 'absolute', left: 0, right: 0, margin: '0 auto', top: '0', width: 'min(75%, 280px)', zIndex: 6, perspective: '1200px' }}
            >
              <div className="hero-float-center" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                  transform: 'rotateY(0deg) rotateX(4deg)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img
                    src="/phone_mockup_screenshot2_8K.png"
                    alt="Omeglee Mobile App"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.6))',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </Reveal>

            {/* ── LEFT PHONE (screen faces right, toward center) ─── */}
            <Reveal
              mount
              dir="up"
              distance={44}
              delay={0.5}
              duration={1.1}
              className="hero-phone-left hidden sm:block"
              style={{ position: 'absolute', left: '20%', top: '8px', width: 'min(26%, 250px)', zIndex: 5, perspective: '1200px' }}
            >
              <div className="hero-float-left" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                  transform: 'rotateY(6deg) rotateZ(-2deg)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img
                    src="/phone_mockup_screenshot2_8K.png"
                    alt="Omeglee Discord Server Channels"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      filter: 'drop-shadow(0 50px 80px rgba(0,0,0,0.6))',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </Reveal>

            {/* ── RIGHT PHONE (screen faces left, toward center) ──── */}
            <Reveal
              mount
              dir="up"
              distance={44}
              delay={0.68}
              duration={1.1}
              className="hero-phone-right hidden sm:block"
              style={{ position: 'absolute', right: '20%', top: '8px', width: 'min(26%, 250px)', zIndex: 5, perspective: '1200px' }}
            >
              <div className="hero-float-right" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                  transform: 'rotateY(-6deg) rotateZ(2deg)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img
                    src="/phone_mockup_screenshot1_8K.png"
                    alt="Omeglee Discord Server Welcome"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      filter: 'drop-shadow(0 50px 80px rgba(0,0,0,0.6))',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </Reveal>

          </div>

          {/* Bottom gradient — fades the phone bottom smoothly into the background (premium cut) */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '160px',
              zIndex: 30,
              background: 'linear-gradient(to top, rgb(var(--color-bg-primary)) 18%, transparent 100%)',
            }}
          />
        </div>

      </section>
      {/* ─── "Everything You Need to Compete & Connect" Section ─── */}
      <section className="relative w-full z-10 bg-[#060608] overflow-hidden">
        {/* Global purple ambient glow */}
        <ScrollParallax
          distance={110}
          stiffness={70}
          className="absolute pointer-events-none"
          style={{ top: '50%', left: '28%' }}
        >
          <div
            style={{
              transform: 'translate(-50%, -50%)',
              width: '680px',
              height: '680px',
              background: 'radial-gradient(ellipse at center, rgba(100,40,220,0.28) 0%, rgba(80,20,180,0.12) 40%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </ScrollParallax>

        <div className="w-full max-w-[1300px] mx-auto px-6 sm:px-12 lg:px-16 pt-16 sm:pt-28 lg:pt-36 pb-16 sm:pb-24 lg:pb-32">

          {/* 2-column grid — 56% left / 44% right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.27fr_1fr] gap-0 lg:gap-16 items-start">

            {/* ── LEFT COLUMN */}
            <div className="flex flex-col items-start w-full">
              {/* Headline */}
              <h2 className="text-[32px] sm:text-[40px] lg:text-[46px] font-semibold text-white leading-[1.1] tracking-[-0.03em] mb-6 lg:mb-8 max-w-[480px]">
                <Words text="Everything You Need to" className="block" />
                <Words text="Compete & Connect" className="block" delay={0.18} />
              </h2>

              {/* 3D Device Illustration — full image visible, no bottom crop */}
              <Reveal dir="right" distance={40} delay={0.1} blur scale={0.96} className="relative w-full flex items-start justify-start">
                {/* Ambient glow behind the image */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    bottom: '5%',
                    left: '5%',
                    width: '70%',
                    height: '55%',
                    background: 'radial-gradient(ellipse at center, rgba(88,40,200,0.5) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                  }}
                />
                <ScrollParallax distance={26} className="relative w-full sm:w-[108%] max-w-none ml-0 sm:-ml-[4%] lg:-ml-[2%]">
                  <img
                    src="/newone.webp"
                    alt="Omeglee community on desktop and mobile"
                    className="w-full h-auto object-contain select-none"
                    style={{
                      filter: 'drop-shadow(0 30px 60px rgba(50,20,120,0.55))',
                      transform: 'perspective(1400px) rotateY(2deg) rotateX(1deg)',
                    }}
                    draggable={false}
                  />
                </ScrollParallax>
              </Reveal>
            </div>

            {/* ── RIGHT COLUMN */}
            <RevealGroup stagger={0.1} className="flex flex-col items-start w-full mt-4 lg:mt-10">
              {/* Subtext paragraph */}
              <Item blur>
                <p className="text-[#a0a0b0] text-[15px] leading-[1.6] max-w-[400px] mb-7">
                  From tournaments to 24/7 music, gaming channels to exclusive events—all in one thriving community.
                </p>
              </Item>

              {/* CTA Buttons — pill shape exactly matching AUI */}
              <Item>
                <div className="flex flex-wrap items-center gap-4 mb-14">
                  <Magnetic strength={0.22} max={9}>
                    <a
                      href="https://discord.gg/omegle"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-7 py-[14px] bg-white hover:bg-gray-100 text-black font-semibold rounded-full text-[15px] leading-none transition-colors"
                    >
                      Join Now
                    </a>
                  </Magnetic>
                  <Magnetic strength={0.22} max={9}>
                    <button
                      onClick={() => setExploreEventModalOpen(true)}
                      className="inline-flex items-center justify-center px-7 py-[13px] bg-transparent border border-white/25 hover:border-white/60 text-white font-semibold rounded-full text-[15px] leading-none transition-colors"
                    >
                      Explore Events
                    </button>
                  </Magnetic>
                </div>
              </Item>

              {/* Promo Card — full width, rounded corners */}
              <Item className="w-full" scale={0.95}>
                <Tilt max={6} scale={1.015} className="w-full mb-10">
                  <div className="w-full rounded-[16px] overflow-hidden border border-white/8 shadow-[0_8px_40px_rgba(60,40,160,0.2)]">
                    <img
                      src="/auinew.webp"
                      alt="Wherever you game — hang out on Omeglee"
                      className="w-full h-auto object-cover select-none block"
                      draggable={false}
                    />
                  </div>
                </Tilt>
              </Item>

              {/* Sub-heading */}
              <Item>
                <h3 className="text-[17px] sm:text-[19px] font-semibold text-white leading-[1.25] tracking-[-0.01em] mb-3">
                  Built for Gamers, By Gamers
                </h3>
              </Item>

              {/* Body Paragraph */}
              <Item>
                <p className="text-[#8a8a9a] text-[14px] leading-[1.65] max-w-[380px] mb-6">
                  We understand what drives the gaming community. Tournaments, rankings, real-time achievements, and a culture of competition—all while building genuine friendships.
                </p>
              </Item>

              {/* Join Link */}
              <Item>
                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#7c6af5] hover:text-[#a098ff] font-medium text-[14px] transition-colors group"
                >
                  Join the Competition
                  <FiArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Item>
            </RevealGroup>

          </div>

        </div>
      </section>
      {}
      <section className="relative w-full max-w-6xl z-10 py-16 sm:py-24">
        <div className="w-full px-4 sm:px-6">
          <RevealGroup stagger={0.11} className="text-center space-y-3 mb-8">
            <Item dir="none" scale={0.85} className="flex justify-center">
              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">Introducing Ozy</span>
              </div>
            </Item>
            <Item>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[rgb(var(--color-text-primary))] leading-[1.1] tracking-tight">
                <Words text="Spend Your Ozy in the Rewards Shop" stagger={0.045} />
              </h2>
            </Item>
            <Item blur>
              <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed text-base sm:text-lg max-w-2xl mx-auto">
                Earn Ozy through server activity, then redeem it for exclusive perks. Here's a look at some of the shop's most valuable items.
              </p>
            </Item>
          </RevealGroup>

          <Reveal scale={0.97} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-start md:items-center mb-6 p-6 sm:p-7 rounded-3xl border border-[rgb(var(--color-border))]/60 bg-[rgb(var(--color-bg-secondary))]/50 backdrop-blur-xl">
            <div className="flex flex-row md:flex-col lg:flex-row items-center md:items-start lg:items-center gap-4 md:pr-8 md:border-r md:border-[rgb(var(--color-border))]">
              <img
                src="https://cdn.discordapp.com/emojis/1525594143135633539.gif?size=128"
                alt="Ozy Coin"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain select-none animate-bounce flex-shrink-0"
                style={{ animationDuration: '3.5s' }}
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] block">Total Ozy Pool</span>
                <span className="text-2xl sm:text-3xl font-black text-yellow-500 leading-tight block">
                  {ozyBudget ? <CountUp value={ozyBudget.total_added} /> : '—'}
                </span>
                {ozyBudget && (
                  <span className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] block mt-0.5">
                    <CountUp value={ozyBudget.available} /> left to redeem
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[rgb(var(--color-text-primary))] mb-1.5">How You Earn Ozy</h3>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] leading-relaxed">
                Ozy builds up automatically the more you hang out in the server — chatting, joining voice channels, and showing up for events all add to your balance. Stay active and it keeps stacking. Redeem it anytime for roles, perks, and rewards in the shop below.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05} className="glass-blue rounded-3xl border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl overflow-hidden">
            {ozyLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-[rgb(var(--color-border))]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center gap-2 p-6 animate-pulse">
                    <div className="w-14 h-14 rounded-xl bg-[rgb(var(--color-bg-tertiary))]" />
                    <div className="h-3 w-16 bg-[rgb(var(--color-bg-tertiary))] rounded" />
                    <div className="h-3 w-10 bg-[rgb(var(--color-bg-tertiary))] rounded" />
                  </div>
                ))}
              </div>
            ) : ozyItems.length === 0 ? (
              <div className="text-center py-16">
                <FiPackage className="w-10 h-10 mx-auto text-[rgb(var(--color-text-tertiary))] mb-3" />
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">The shop is empty right now, check back soon!</p>
              </div>
            ) : (
              <RevealGroup
                key={ozyItems.length}
                stagger={0.05}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-[rgb(var(--color-border))]"
              >
                {ozyItems.map((item) => (
                  <Item key={item.id} distance={16} scale={0.94} className="h-full">
                    <button
                      onClick={() => setSelectedOzyItem(item)}
                      className="group relative flex flex-col items-center justify-center gap-2.5 w-full h-full p-6 sm:p-7 text-center transition-colors hover:bg-[rgb(var(--color-hover))] cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[rgb(var(--color-bg-tertiary))] flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 group-active:scale-95">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiPackage className="w-6 h-6 text-[rgb(var(--color-text-tertiary))]" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[rgb(var(--color-text-primary))] line-clamp-1 max-w-full">
                        {item.name}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-yellow-500 transition-transform duration-300 ease-out group-hover:scale-105">
                        {renderOzyEmoji('w-3.5 h-3.5')}
                        {formatNumber(item.price)}
                      </span>
                    </button>
                  </Item>
                ))}
              </RevealGroup>
            )}
          </Reveal>

          <Reveal delay={0.05} className="flex justify-center mt-8">
            <Magnetic strength={0.28} max={11}>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full font-semibold transition-all text-sm shadow-lg shadow-blue-500/25 group hover:gap-3 hover:shadow-xl hover:shadow-blue-500/40"
              >
                <span>Visit Rewards Shop</span>
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>
      {}
      {selectedOzyItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedOzyItem(null)}
        >
          <Reveal mount dir="up" distance={18} scale={0.94} duration={0.4} className="max-w-sm w-full">
          <div
            className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 w-full border border-[rgb(var(--color-border))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">{selectedOzyItem.name}</h3>
              <button onClick={() => setSelectedOzyItem(null)} className="flex-shrink-0 text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[rgb(var(--color-bg-tertiary))] mb-4 flex items-center justify-center">
              {selectedOzyItem.thumbnail ? (
                <img src={selectedOzyItem.thumbnail} alt={selectedOzyItem.name} className="w-full h-full object-cover" />
              ) : (
                <FiPackage className="w-12 h-12 text-[rgb(var(--color-text-tertiary))]" />
              )}
            </div>
            {selectedOzyItem.description && (
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">{selectedOzyItem.description}</p>
            )}
            <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Price</span>
              <span className="flex items-center gap-1.5 text-lg font-extrabold text-yellow-500">
                {renderOzyEmoji('w-4 h-4')}
                {formatNumber(selectedOzyItem.price)}
              </span>
            </div>
            {selectedOzyItem.price_inr != null && (
              <div className="mb-4 text-right">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                  Value: ₹{formatNumber(selectedOzyItem.price_inr)}
                </span>
              </div>
            )}
            <Link
              href="/shop"
              className="block text-center w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all"
            >
              View in Shop
            </Link>
          </div>
          </Reveal>
        </div>
      )}
      {/* ─── "World-Class, Enterprise-Grade Gaming" Casino Section ─── */}
      <section className="relative w-full z-10 bg-[#050607] overflow-hidden">
        {/* Ambient casino glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '20%',
            right: '15%',
            width: '620px',
            height: '620px',
            background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.16) 0%, rgba(245,158,11,0.08) 45%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        <div className="w-full max-w-[1300px] mx-auto px-6 sm:px-12 lg:px-16 py-16 sm:py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* ── LEFT COLUMN — copy ─────────────────────────────── */}
            <RevealGroup stagger={0.1} className="flex flex-col items-start w-full order-2 lg:order-1">
              <Item>
                <h2 className="text-[40px] sm:text-[54px] lg:text-[64px] font-extrabold text-white leading-[1.02] tracking-[-0.035em] mb-6 max-w-[560px]">
                  <Words text="Omeglee Gambling" />
                </h2>
              </Item>

              <Item blur>
                <p className="text-[#a0a0b0] text-[15px] leading-[1.65] max-w-[440px] mb-9">
                  Every spin and every outcome is generated and verified server-side — the same engineering
                  rigor you&apos;d expect from a real-money platform, built entirely around Ozy.
                </p>
              </Item>

              <Item className="w-full">
                <RevealGroup stagger={0.08} className="flex flex-col gap-4 w-full mb-10">
                  {[
                    { icon: <FiShield className="w-4 h-4" />, title: 'Provably Fair', desc: 'Outcomes are settled server-side — the client only plays the animation.' },
                    { icon: <FiServer className="w-4 h-4" />, title: 'Enterprise Infrastructure', desc: 'Runs on the same economy backend that powers the entire server.' },
                    { icon: <FiZap className="w-4 h-4" />, title: 'Instant Payouts', desc: 'Balances update the moment a round settles — no waiting, no delays.' },
                  ].map((f) => (
                    <Item key={f.title} dir="left" distance={16}>
                      <div className="flex items-start gap-3 group">
                        <span className="flex-shrink-0 text-emerald-400 mt-0.5 transition-transform duration-300 group-hover:scale-110">
                          {f.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{f.title}</h3>
                          <p className="text-xs text-white/50 leading-relaxed mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    </Item>
                  ))}
                </RevealGroup>
              </Item>

              <Item scale={0.9}>
                <Magnetic strength={0.25} max={10}>
                  <Link
                    href="/gambling"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white hover:bg-gray-100 text-black font-bold rounded-full text-sm transition-all shadow-lg shadow-black/20 group hover:gap-3"
                  >
                    <span>Enter the Casino</span>
                    <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </Magnetic>
              </Item>
            </RevealGroup>

            {/* ── RIGHT COLUMN — artwork ─────────────────────────── */}
            <Reveal dir="right" distance={40} blur scale={0.96} className="relative w-full order-1 lg:order-2">
              <div
                className="absolute pointer-events-none"
                style={{
                  inset: '-8%',
                  background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.25) 0%, rgba(245,158,11,0.12) 45%, transparent 70%)',
                  filter: 'blur(60px)',
                }}
              />

              {/* Floating dice — ambient gambling flourish, peeking off the card corners */}
              <FloatIn
                rotate={-18}
                amplitude={10}
                duration={6.5}
                delay={0.5}
                className="absolute hidden sm:block pointer-events-none select-none"
                style={{ top: '-8%', left: '-6%', fontSize: '52px', zIndex: 3, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
              >
                🎲
              </FloatIn>
              <FloatIn
                rotate={14}
                amplitude={9}
                duration={7.5}
                delay={0.8}
                className="absolute hidden sm:block pointer-events-none select-none"
                style={{ bottom: '2%', right: '-7%', fontSize: '40px', zIndex: 3, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
              >
                🎲
              </FloatIn>
              <FloatIn
                rotate={-8}
                amplitude={8}
                duration={7}
                delay={1.1}
                className="absolute hidden lg:block pointer-events-none select-none"
                style={{ top: '38%', right: '-5%', fontSize: '30px', zIndex: 3, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}
              >
                🎲
              </FloatIn>

              <Tilt max={6} scale={1.015} perspective={1400} className="relative w-full">
                <div
                  className="relative w-full rounded-[26px] overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px -40px rgba(0,0,0,0.9)' }}
                >
                  <img
                    src="/Gambling.png"
                    alt="Omeglee Casino — enterprise-grade gaming"
                    className="w-full h-auto object-cover select-none block"
                    draggable={false}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(5,6,7,0.55) 0%, transparent 35%)' }} />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                </div>
              </Tilt>
            </Reveal>

          </div>
        </div>
      </section>
      {}
      <GamblingHubSection />
      {}
      <section className="relative w-full max-w-6xl z-10 py-16 sm:py-24">
        <div className="w-full px-4 sm:px-6">
          <Reveal scale={0.97} className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl">
            <RevealGroup stagger={0.1} className="max-w-2xl mx-auto text-center space-y-6">
              <Item className="flex justify-center" dir="none" scale={0.6}>
                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20 transition-transform duration-500 hover:scale-105 hover:rotate-3">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
              </Item>
              <Item>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight leading-[1.1]">
                  <Words text="Join Our Discord" stagger={0.06} />
                </h2>
              </Item>
              <Item blur>
                <p className="text-base sm:text-lg text-[rgb(var(--color-text-secondary))] leading-relaxed max-w-md mx-auto">
                  Connect with thousands of members, participate in events, claim reward coins, and level up with our community.
                </p>
              </Item>
              <Item className="flex justify-center" scale={0.9}>
                <Magnetic strength={0.3} max={12}>
                  <a
                    href="https://discord.gg/omegle"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-full font-bold transition-all text-sm shadow-lg shadow-indigo-500/25 group hover:gap-3 hover:shadow-xl hover:shadow-indigo-500/40"
                  >
                    <span>Connect to Discord</span>
                    <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </a>
                </Magnetic>
              </Item>
            </RevealGroup>
          </Reveal>
        </div>
      </section>
      {/* ─── FAQ Section ────────────────────────────────────────── */}
      <section className="relative w-full z-10 bg-transparent overflow-hidden">
        <div className="w-full max-w-[1200px] mx-auto px-8 sm:px-12 lg:px-16 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">

            {/* ── LEFT COLUMN — mascot ───────────────────────────── */}
            <Reveal dir="left" distance={32} blur className="relative w-full h-full flex justify-center items-center order-2 lg:order-1">
              <img
                src="/omegle_faq.png"
                alt="Omeglee FAQ mascot"
                className="w-full max-w-[450px] h-auto object-contain select-none block drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
            </Reveal>

            {/* ── RIGHT COLUMN — questions ────────────────────────── */}
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

          </div>
        </div>
      </section>
      {/* Explore Event Modal */}
      {exploreEventModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <Reveal mount dir="up" scale={0.9} duration={0.4} className="w-full max-w-md">
            <div className="bg-[#0a0a0f] border border-[rgb(var(--color-border))]/60 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-3xl w-full p-6 sm:p-8 relative overflow-hidden flex flex-col items-center text-center">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50 blur-xl pointer-events-none" />
              
              <button onClick={() => setExploreEventModalOpen(false)} className="absolute top-4 right-4 text-[rgb(var(--color-text-tertiary))] hover:text-white transition-colors z-10 p-2">
                <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 mb-5 sm:mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10 mt-2">
                <FiZap className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 z-10 tracking-tight">
                Want more events?
              </h2>
              
              <p className="text-[rgb(var(--color-text-secondary))] mb-8 z-10 leading-relaxed text-sm sm:text-base">
                Join our Discord server to participate in live tournaments, bingo nights, and claim massive Ozy rewards!
              </p>
              
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 sm:py-4 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 z-10 text-[15px] sm:text-base"
              >
                Join Server
              </a>
            </div>
          </Reveal>
        </div>
      )}
    </main>
  );
}