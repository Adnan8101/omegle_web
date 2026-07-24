'use client';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { useState } from 'react';
import { FiArrowRight, FiDisc, FiTrendingUp, FiLayers, FiTarget, FiAward } from 'react-icons/fi';
import DevAccessButton from '@/components/gambling/DevAccessButton';

export default function Home() {
  const { theme } = useTheme();
  const [showSubscriptionOverlay, setShowSubscriptionOverlay] = useState(true);
  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center">
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
      <section className="relative w-full z-10 flex flex-col items-center pt-16 sm:pt-20 pb-0">
        
        {/* Text + CTA */}
        <div className="w-full max-w-4xl px-4 sm:px-6 text-center flex flex-col items-center gap-5">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            <span className="block text-white">Welcome to</span>
            <span className="block">
              <span style={{ color: '#3B9EFF' }}>Omeglee</span>{' '}
              <span style={{ color: '#FF8C00' }}>Community</span>
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Where connections become conversations. Explore our vibrant server activity, earn Ozy currency, play gambling games, and claim exclusive community rewards!
          </p>

          <div className="pt-1">
            <a
              href="https://discord.gg/omegle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-9 py-3.5 bg-white hover:bg-slate-100 text-black font-bold rounded-full text-base transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.4)' }}
            >
              Join the Server
            </a>
          </div>
        </div>

        {/* ─── 3D Phone Showcase · AUI Composition ─────────────────── */}
        <div
          className="relative w-full mt-4"
          style={{ height: '500px', overflow: 'hidden' }}
        >
          {/* Darkened vignette behind phone area */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,0.3) 0%, transparent 60%)',
            }}
          />

          {/* Ambient blue glow behind center phone */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(59,158,255,0.2) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* 3D Stage — wide-angle perspective camera */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              height: '100%',
              margin: '0 auto',
              perspective: '1400px',
              perspectiveOrigin: '50% 25%',
              transformStyle: 'preserve-3d',
            }}
          >

            {/* ── LEFT PHONE ─────────────────────── */}
            <div style={{ position: 'absolute', left: '5%', bottom: '-140px', width: '270px', zIndex: 5 }}>
              <div className="hero-float-left" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                  transform: 'rotateY(25deg) rotateZ(4deg) translateZ(-120px) scale(0.9)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img
                    src="/Iphone.png"
                    alt="Omeglee Discord Chat"
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
            </div>

            {/* ── CENTER PHONE ────────────────────── */}
            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: '-50px',
              width: '320px',
              zIndex: 20,
              marginLeft: '-160px',
            }}>
              {/* Center glow */}
              <div
                className="absolute pointer-events-none"
                style={{
                  bottom: '40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '300px',
                  height: '250px',
                  background: 'radial-gradient(ellipse at 50% 60%, rgba(59,158,255,0.25) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  zIndex: -1,
                }}
              />
              <div className="hero-float-center" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                  transform: 'rotateY(-2deg) rotateZ(-2deg) translateZ(80px)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img
                    src="/Iphone.png"
                    alt="Omeglee Discord Chat"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      filter: 'drop-shadow(0 60px 100px rgba(0,0,0,0.7))',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            {/* ── RIGHT PHONE ────────────────────── */}
            <div style={{ position: 'absolute', right: '5%', bottom: '-140px', width: '270px', zIndex: 5 }}>
              <div className="hero-float-right" style={{ transformStyle: 'preserve-3d' }}>
                <div style={{
                  transform: 'rotateY(-25deg) rotateZ(-4deg) translateZ(-120px) scale(0.9)',
                  transformStyle: 'preserve-3d',
                }}>
                  <img
                    src="/Iphone.png"
                    alt="Omeglee Discord Chat"
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
            </div>

          </div>

          {/* Bottom gradient — phones emerge from below */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '160px',
              zIndex: 30,
              background: 'linear-gradient(to top, rgb(var(--color-bg-primary)) 25%, transparent)',
            }}
          />
        </div>

      </section>
      {}
      <section className="relative w-full max-w-6xl z-10 py-12">
        <div className="w-full px-4 sm:px-6">
          <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">Introducing Ozy</span>
              </div>
              <h2 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))] leading-tight">
                Omeglee's Own Digital Currency
              </h2>
              <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed text-sm">
                Ozy is the heart of the Omeglee economy. Earn tokens dynamically through interactions, server activity, and contributions, then claim and redeem them for exclusive benefits and premium rewards.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <img
                      src="https://cdn.discordapp.com/emojis/1525594143135633539.gif"
                      alt="Ozy"
                      className="w-5 h-5 object-contain select-none"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-[rgb(var(--color-text-primary))]">How to Earn</h4>
                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">Automatically added while active in server text chats and voice channels.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm0 0H4v13a2 2 0 002 2h12a2 2 0 002-2V8H12z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-[rgb(var(--color-text-primary))]">How to Claim</h4>
                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">Redeem and claim your earned rewards directly in our rewards shop.</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all text-xs shadow-lg shadow-blue-500/20 group hover:gap-3"
                >
                  <span>Visit Rewards Shop</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src="https://cdn.discordapp.com/emojis/1525594143135633539.gif?size=256"
                alt="Ozy Coin"
                className="w-20 h-20 sm:w-24 h-24 object-contain select-none animate-bounce duration-[1500ms]"
              />
            </div>
          </div>
        </div>
      </section>
      {}
      <section className="relative w-full max-w-6xl z-10 py-6">
        <div className="w-full px-4 sm:px-6">
          <div className="relative group overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 shadow-[0_10px_40px_rgba(168,85,247,0.25)] transition-all duration-500 hover:border-purple-400/60 hover:shadow-[0_15px_50px_rgba(168,85,247,0.4)]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <div className="inline-flex items-center justify-center px-3 py-1 bg-purple-500/20 rounded-full border border-purple-400/30">
                    <span className="text-purple-300 font-bold text-[10px] uppercase tracking-wider">Under Development</span>
                  </div>
                  <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/20 rounded-full border border-amber-400/30">
                    <span className="text-amber-300 font-bold text-[10px] uppercase tracking-wider">Coming Soon</span>
                  </div>
                </div>
                
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  Omeglee Gambling
                </h2>
                
                <p className="text-slate-200 text-sm leading-relaxed max-w-2xl">
                  Get ready for the ultimate risk-and-reward experience directly integrated with the Ozy virtual economy! Double down in blackjack, spin the slots, test your luck in roulette, and challenge the community on the high-roller leaderboards. Under active development, launching soon.
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                  <div className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors">
                    <FiLayers className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-200">Slots & Casino Games</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors">
                    <FiTarget className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-200">Spin the Wheel</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors">
                    <FiAward className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span className="text-xs font-semibold text-purple-200">High Roller Leaderboards</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center md:justify-start">
                  <DevAccessButton />
                </div>
              </div>

              <div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-lg animate-pulse" />
                <span className="text-6xl select-none filter drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-bounce duration-[2000ms]">🎲</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="relative w-full max-w-6xl z-10 py-12">
        <div className="w-full px-4 sm:px-6">
          <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl relative overflow-hidden">
            {}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="text-center space-y-2 mb-10">
              <div className="inline-flex items-center justify-center px-4 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 mb-2">
                <span className="text-amber-500 font-bold text-xs uppercase tracking-wider">Coming Soon</span>
              </div>
              <h2 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">Subscription Plans</h2>
              <p className="text-xs text-[rgb(var(--color-text-secondary))] max-w-md mx-auto">
                Gain premium perks, multipliers, custom profile customizations, and support the community.
              </p>
            </div>
            {}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40 blur-[1px] pointer-events-none select-none">
              {}
              <div className="border border-[rgb(var(--color-border))]/65 rounded-2xl p-6 flex flex-col justify-between h-48 bg-black/5 dark:bg-white/5">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase text-slate-400">Silver Supporter</span>
                    <FiLayers className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">$4.99 <span className="text-[10px] font-normal text-[rgb(var(--color-text-tertiary))]">/mo</span></h3>
                </div>
                <div className="text-[10px] text-[rgb(var(--color-text-tertiary))] space-y-1">
                  <p>• 1.5x Ozy multiplier</p>
                  <p>• Custom name color role</p>
                </div>
              </div>
              {}
              <div className="border border-blue-500/30 rounded-2xl p-6 flex flex-col justify-between h-48 bg-blue-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500 text-white text-[8px] font-bold uppercase rounded-bl-lg">Popular</div>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase text-blue-400">Gold Elite</span>
                    <FiTrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">$9.99 <span className="text-[10px] font-normal text-[rgb(var(--color-text-tertiary))]">/mo</span></h3>
                </div>
                <div className="text-[10px] text-[rgb(var(--color-text-tertiary))] space-y-1">
                  <p>• 2.5x Ozy multiplier</p>
                  <p>• Premium emoji badge</p>
                  <p>• Priority server support</p>
                </div>
              </div>
              {}
              <div className="border border-amber-500/30 rounded-2xl p-6 flex flex-col justify-between h-48 bg-amber-500/5">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase text-amber-500">Diamond Sponsor</span>
                    <FiDisc className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">$19.99 <span className="text-[10px] font-normal text-[rgb(var(--color-text-tertiary))]">/mo</span></h3>
                </div>
                <div className="text-[10px] text-[rgb(var(--color-text-tertiary))] space-y-1">
                  <p>• 5x Ozy multiplier</p>
                  <p>• Custom profile badge</p>
                  <p>• Exclusive access to private lounges</p>
                </div>
              </div>
            </div>
            {}
            {showSubscriptionOverlay && (
              <div className="absolute inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[1.5px] flex items-center justify-center transition-all duration-500 z-20">
                <div className="glass-blue border border-white/20 p-3 rounded-lg max-w-[180px] w-full text-center shadow-lg transform transition-all">
                  <h4 className="text-[11px] font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight">Launching Soon</h4>
                  <button
                    onClick={() => setShowSubscriptionOverlay(false)}
                    className="w-full py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-[9px] font-semibold transition-all shadow-md active:scale-95"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      {}
      <section className="relative w-full max-w-6xl z-10 py-12">
        <div className="w-full px-4 sm:px-6">
          <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))]">Join Our Discord</h2>
              <p className="text-xs text-[rgb(var(--color-text-secondary))] leading-relaxed max-w-md mx-auto">
                Connect with thousands of members, participate in events, claim reward coins, and level up with our community.
              </p>
              <div>
                <a
                  href="https://discord.gg/omegle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl font-bold transition-all text-xs shadow-lg shadow-indigo-500/20 group hover:gap-3"
                >
                  <span>Connect to Discord</span>
                  <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}