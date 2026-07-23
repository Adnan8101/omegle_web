'use client';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowRight, FiDisc, FiTrendingUp, FiLayers, FiTarget, FiAward } from 'react-icons/fi';
import DevAccessButton from '@/components/gambling/DevAccessButton';
interface TeamMember {
  id: string;
  discord_user_id: string;
  designation: string;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    banner: string | null;
    accentColor: string | null;
  };
}
interface TeamData {
  founders: TeamMember[];
  developers: TeamMember[];
  management: TeamMember[];
}
export default function Home() {
  const { theme } = useTheme();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [showSubscriptionOverlay, setShowSubscriptionOverlay] = useState(true);
  useEffect(() => {
    async function fetchTeam() {
      try {
        const response = await fetch('/api/team', { cache: 'no-store' });
        const resData = await response.json();
        if (response.ok && resData.success) {
          setTeam(resData.data);
        }
      } catch (err) {
        console.error('Error fetching team:', err);
      } finally {
        setTeamLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const getAccentColorStyle = (accentHex: string | null, type: 'border' | 'shadow' | 'bg') => {
    const color = accentHex || '#3b82f6';
    switch (type) {
      case 'border':
        return { borderColor: color };
      case 'shadow':
        return { boxShadow: `0 10px 30px -10px ${color}33` };
      case 'bg':
        return { backgroundColor: color };
      default:
        return {};
    }
  };
  const renderMemberCard = (member: TeamMember) => {
    const { profile, designation } = member;
    const accentColor = profile.accentColor;
    return (
      <div
        key={member.id}
        className="glass-blue rounded-[1.25rem] overflow-hidden border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-md hover:shadow-apple-xl hover:scale-[1.03] hover:border-blue-500/35 transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col group relative w-full max-w-[190px] min-h-[210px]"
        style={{
          ...getAccentColorStyle(accentColor, 'shadow'),
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translate3d(0,0,0)',
        }}
      >
        {}
        <div className="relative w-full h-12 bg-gradient-to-br from-blue-900/40 via-indigo-950/30 to-black/20 overflow-hidden">
          {profile.banner ? (
            <img
              src={profile.banner}
              alt="Banner"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes('.gif')) {
                  target.src = target.src.replace('.gif', '.webp');
                }
              }}
            />
          ) : (
            <div
              className="w-full h-full opacity-60 mix-blend-overlay group-hover:opacity-85 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${accentColor || '#1e3a8a'} 0%, #000 100%)`
              }}
            />
          )}
        </div>
        {}
        <div className="relative px-3.5 -mt-5 flex justify-start z-10">
          <div className="relative group/avatar">
            {}
            <div className="relative w-11 h-11 border-[2.5px] rounded-full overflow-hidden border-[rgb(var(--color-bg-primary))] bg-[rgb(var(--color-bg-secondary))] flex-shrink-0 shadow-apple-md transition-transform duration-500">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes('.gif')) {
                      target.src = target.src.replace('.gif', '.webp');
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-sm font-bold text-blue-500">
                  {profile.username.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {}
            <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-[rgb(var(--color-bg-primary))]"></span>
            </span>
          </div>
        </div>
        {}
        <div className="flex-grow flex flex-col justify-between p-3.5 pt-1.5 relative z-10">
          <div>
            <h3 className="font-[var(--font-display)] font-semibold text-[rgb(var(--color-text-primary))] group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors text-xs truncate">
              {profile.displayName}
            </h3>
            <p className="text-[9px] font-mono text-[rgb(var(--color-text-tertiary))] tracking-tight truncate">
              @{profile.username}
            </p>
          </div>
          <div className="mt-2.5">
            <span
              className={`px-1.5 py-0.5 text-[8px] font-semibold rounded-full border ${
                designation === 'Founder'
                  ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-500 border-amber-500/25'
                  : designation === 'Bot Developer'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-400/20'
              }`}
            >
              {designation}
            </span>
          </div>
        </div>
      </div>
    );
  };
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
      <section className="relative w-full max-w-6xl z-10 flex flex-col items-center justify-center pt-24 pb-12">
        <div className="w-full px-4 sm:px-6 text-center space-y-8 animate-fade-in">
          {}
          <div className="flex justify-center animate-slide-down">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full blur-2xl opacity-60 group-hover:opacity-85 transition-opacity duration-500 animate-pulse" />
              <div
                className="absolute -inset-1.5 bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 rounded-full opacity-95 group-hover:scale-105 transition-all duration-500 shadow-blue-glow"
                style={{ animation: 'spin 12s linear infinite' }}
              />
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 bg-black dark:bg-[rgb(var(--color-bg-secondary))] rounded-full overflow-hidden border-[3px] border-white/90 dark:border-white/15 flex items-center justify-center shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omeglee Community Logo"
                  fill
                  className="object-cover rounded-full scale-102 transform group-hover:scale-110 transition-transform duration-500"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[rgb(var(--color-text-primary))] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white animate-slide-up">
              Omeglee
            </h1>
            <div className="space-y-1">
              <p className="text-lg sm:text-xl md:text-2xl font-medium text-[rgb(var(--color-text-secondary))] tracking-tight">
                Community Portal
              </p>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light max-w-lg mx-auto">
                Where connections become conversations
              </p>
            </div>
          </div>
        </div>
      </section>
      {}
      <section className="relative w-full max-w-6xl z-10 py-12">
        <div className="w-full px-4 sm:px-6">
          <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl">
            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex items-center justify-center px-3.5 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2">
                <span className="text-blue-400 font-bold text-[10px] uppercase tracking-wider">Meet Our Team</span>
              </div>
              <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">Behind the Scenes</h2>
              <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] max-w-xs mx-auto">
                The founders, developers, and management teams maintaining our community portal.
              </p>
            </div>
            {teamLoading ? (
              <div className="py-8 flex justify-center">
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                </div>
              </div>
            ) : !team || (team.founders.length === 0 && team.developers.length === 0 && team.management.length === 0) ? (
              <p className="text-center text-xs text-[rgb(var(--color-text-tertiary))]">No members added yet.</p>
            ) : (
              <div className="space-y-8 flex flex-col items-center">
                {}
                {(team.founders.length > 0 || team.developers.length > 0) && (
                  <div className="w-full flex flex-col items-center">
                    <div className="flex flex-wrap justify-center gap-5">
                      {team.founders.map(renderMemberCard)}
                      {team.developers.map(renderMemberCard)}
                    </div>
                  </div>
                )}
                {}
                {team.management.length > 0 && (
                  <div className="w-full flex flex-col items-center border-t border-[rgb(var(--color-border))]/10 pt-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-4">Management Team</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 justify-items-center w-full max-w-3xl">
                      {team.management.map(renderMemberCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
          <div className="relative group overflow-hidden rounded-3xl border border-purple-500/35 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/40 p-8 shadow-[0_0_50px_-12px_rgba(168,85,247,0.2)] backdrop-blur-xl transition-all duration-500 hover:shadow-[0_0_50px_-6px_rgba(168,85,247,0.35)] hover:border-purple-500/50">
            {}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-500/15 rounded-full filter blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <div className="inline-flex items-center justify-center px-3 py-1 bg-purple-500/15 rounded-full border border-purple-500/25">
                    <span className="text-purple-400 font-bold text-[10px] uppercase tracking-wider">Under Development</span>
                  </div>
                  <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/15 rounded-full border border-amber-500/25">
                    <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider">Coming Soon</span>
                  </div>
                </div>
                
                <h2 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">
                  Omeglee Gambling
                </h2>
                
                <p className="text-[rgb(var(--color-text-secondary))] text-sm leading-relaxed max-w-2xl">
                  Get ready for the ultimate risk-and-reward experience directly integrated with the Ozy virtual economy! Double down in blackjack, spin the slots, test your luck in roulette, and challenge the community on the high-roller leaderboards. Under active development, launching soon.
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2">
                  <div className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))] hover:text-purple-400 transition-colors">
                    <FiLayers className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-semibold text-[rgb(var(--color-text-primary))]">Slots & Casino Games</span>
                  </div>
                  <div className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))] hover:text-purple-400 transition-colors">
                    <FiTarget className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-semibold text-[rgb(var(--color-text-primary))]">Spin the Wheel</span>
                  </div>
                  <div className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))] hover:text-purple-400 transition-colors">
                    <FiAward className="w-4 h-4 text-purple-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[rgb(var(--color-text-primary))]">High Roller Leaderboards</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center md:justify-start">
                  <DevAccessButton />
                </div>
              </div>

              <div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                <span className="text-6xl select-none filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-bounce duration-[2000ms]">🎲</span>
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