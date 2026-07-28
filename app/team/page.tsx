'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiShield, FiCode, FiUserCheck, FiUsers } from 'react-icons/fi';
import { Reveal, RevealGroup, Item, HoverLift, Magnetic, Words } from '@/components/motion';

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

export default function TeamPage() {
  const { theme } = useTheme();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const response = await fetch('/api/team', { cache: 'no-store' });
        const resData = await response.json();
        if (response.ok && resData.success) {
          setTeam(resData.data);
        }
      } catch (err) {
        console.error('Error fetching team data:', err);
      } flex: {
        setLoading(false);
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
        return { boxShadow: `0 12px 35px -10px ${color}40` };
      case 'bg':
        return { backgroundColor: color };
      default:
        return {};
    }
  };

  const renderMemberCard = (member: TeamMember) => {
    const { profile, designation } = member;
    const accentColor = profile.accentColor || '#3b82f6';

    const isFounder = designation === 'Founder';
    const isBotDev = designation === 'Bot Developer';
    
    // Determine thematic colors based on role
    const themeColor = isFounder ? 'amber-500' : isBotDev ? 'cyan-400' : 'purple-400';
    const bgGlow = isFounder ? 'bg-amber-500' : isBotDev ? 'bg-cyan-400' : 'bg-purple-400';

    return (
      <Item key={member.id} distance={20} scale={0.96} className="w-full max-w-[220px]">
        <HoverLift className="w-full">
          <div
            className={`glass-blue rounded-[24px] overflow-hidden border border-white/5 shadow-apple-lg hover:shadow-apple-xl transition-all duration-500 ease-out flex flex-col group relative w-full min-h-[240px] ${
              isFounder ? 'hover:border-amber-500/40 shadow-[0_8px_30px_rgba(245,158,11,0.08)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.15)]' :
              isBotDev ? 'hover:border-cyan-400/40 shadow-[0_8px_30px_rgba(34,211,238,0.08)] hover:shadow-[0_12px_40px_rgba(34,211,238,0.15)]' :
              'hover:border-purple-400/40 shadow-[0_8px_30px_rgba(192,132,252,0.08)] hover:shadow-[0_12px_40px_rgba(192,132,252,0.15)]'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Card Banner */}
            <div className="relative w-full h-20 bg-[rgb(var(--color-bg-secondary))] overflow-hidden">
              <div className={`absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity duration-500 mix-blend-overlay`} style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #000 100%)` }} />
              {profile.banner && (
                <img
                  src={profile.banner}
                  alt="Banner"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes('.gif')) {
                      target.src = target.src.replace('.gif', '.webp');
                    }
                  }}
                />
              )}
              {/* Fade out bottom of banner into card */}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[rgb(var(--color-bg-primary))]/80 to-transparent" />
            </div>

            {/* Avatar */}
            <div className="relative px-4 -mt-10 flex justify-start z-10">
              <div className="relative group/avatar">
                <div className={`absolute inset-0 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-500 ${bgGlow}`} />
                <div className={`relative w-16 h-16 border-[3px] rounded-full overflow-hidden border-[rgb(var(--color-bg-primary))] bg-[rgb(var(--color-bg-secondary))] flex-shrink-0 shadow-lg transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3`}>
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
                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-lg font-bold text-white/50">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Status indicator */}
                <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[rgb(var(--color-bg-primary))]"></span>
                </span>
              </div>
            </div>

            {/* Member info */}
            <div className="flex-grow flex flex-col justify-between p-4 pt-3 relative z-10 bg-[rgb(var(--color-bg-primary))]/30 backdrop-blur-sm">
              <div>
                <h3 className={`font-bold text-lg text-[rgb(var(--color-text-primary))] group-hover:text-${themeColor} transition-colors tracking-tight truncate`}>
                  {profile.displayName}
                </h3>
                <p className="text-xs font-medium text-[rgb(var(--color-text-tertiary))] tracking-tight truncate mt-0.5">
                  @{profile.username}
                </p>
              </div>

              <div className="mt-4">
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase rounded-md border shadow-sm ${
                    isFounder
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : isBotDev
                      ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      : 'bg-purple-400/10 text-purple-400 border-purple-400/30 shadow-[0_0_10px_rgba(192,132,252,0.2)]'
                  }`}
                >
                  {designation}
                </span>
              </div>
            </div>
          </div>
        </HoverLift>
      </Item>
    );
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center pb-24">
      {/* Deep Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full filter blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full filter blur-[120px] opacity-30" />
      </div>

      <div className="relative w-full max-w-6xl z-10 px-4 sm:px-6 pt-12 sm:pt-16">
        
        {/* Back Link */}
        <Reveal mount dir="down" distance={10} className="mb-8">
          <Magnetic strength={0.3} max={10} className="inline-block">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-12 h-12 glass-blue rounded-2xl border border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5 apple-transition shadow-lg shadow-black/20"
            >
              <FiArrowLeft className="w-5 h-5 text-white/80" />
            </Link>
          </Magnetic>
        </Reveal>

        {/* Page Header */}
        <Reveal mount dir="up" distance={20} className="text-center space-y-4 mb-20">
          <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2">
            <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">
              Meet Our Team
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">
            <Words text="Behind the Scenes" stagger={0.06} />
          </h1>

          <p className="text-sm sm:text-lg text-[rgb(var(--color-text-secondary))] max-w-xl mx-auto leading-relaxed mt-4">
            The founders, developers, and management teams maintaining and advancing our community portal.
          </p>
        </Reveal>

        {/* Team Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))] font-bold tracking-wide">Loading profiles...</p>
          </div>
        ) : !team || (team.founders.length === 0 && team.developers.length === 0 && team.management.length === 0) ? (
          <Reveal mount dir="up" scale={0.95} className="glass-blue rounded-[32px] p-16 text-center border border-[rgb(var(--color-border))]/50 shadow-2xl backdrop-blur-xl relative overflow-hidden max-w-xl mx-auto">
            <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mb-6 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <FiUsers className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-extrabold text-[rgb(var(--color-text-primary))] mb-3 tracking-tight">No Team Members Found</h3>
            <p className="text-[rgb(var(--color-text-secondary))]">Check back soon for team member updates.</p>
          </Reveal>
        ) : (
          <div className="space-y-24">
            
            {/* Founders Section */}
            {team.founders.length > 0 && (
              <section className="space-y-8">
                <Reveal mount dir="left" distance={20} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-b border-[rgb(var(--color-border))]/40 pb-5">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex-shrink-0">
                    <FiShield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">Founders & Leadership</h2>
                    <p className="text-sm font-medium text-[rgb(var(--color-text-tertiary))] mt-1">Visionaries leading the Omeglee community.</p>
                  </div>
                </Reveal>

                <RevealGroup mount stagger={0.08} className="flex flex-wrap justify-center sm:justify-start gap-6">
                  {team.founders.map(renderMemberCard)}
                </RevealGroup>
              </section>
            )}

            {/* Developers Section */}
            {team.developers.length > 0 && (
              <section className="space-y-8">
                <Reveal mount dir="left" distance={20} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-b border-[rgb(var(--color-border))]/40 pb-5">
                  <div className="p-3.5 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.15)] flex-shrink-0">
                    <FiCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">Bot Developers</h2>
                    <p className="text-sm font-medium text-[rgb(var(--color-text-tertiary))] mt-1">Architects of our custom bot features & economy.</p>
                  </div>
                </Reveal>

                <RevealGroup mount stagger={0.08} className="flex flex-wrap justify-center sm:justify-start gap-6">
                  {team.developers.map(renderMemberCard)}
                </RevealGroup>
              </section>
            )}

            {/* Management Section */}
            {team.management.length > 0 && (
              <section className="space-y-8">
                <Reveal mount dir="left" distance={20} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-b border-[rgb(var(--color-border))]/40 pb-5">
                  <div className="p-3.5 rounded-2xl bg-purple-400/10 text-purple-400 border border-purple-400/20 shadow-[0_0_20px_rgba(192,132,252,0.15)] flex-shrink-0">
                    <FiUserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">Management Team</h2>
                    <p className="text-sm font-medium text-[rgb(var(--color-text-tertiary))] mt-1">Ensuring smooth daily server operations and community support.</p>
                  </div>
                </Reveal>

                <RevealGroup mount stagger={0.08} className="flex flex-wrap justify-center sm:justify-start gap-6">
                  {team.management.map(renderMemberCard)}
                </RevealGroup>
              </section>
            )}

          </div>
        )}

      </div>
    </main>
  );
}
