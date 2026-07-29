'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiCode, FiShield, FiUserCheck, FiUsers } from 'react-icons/fi';
import { Reveal, RevealGroup, Item, HoverLift, Tilt, Magnetic, Words, FloatIn, ScrollParallax } from '@/components/motion';

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

const GROUPS = [
  {
    key: 'founders' as const,
    icon: <FiShield className="w-6 h-6" />,
    title: 'Founders & Leadership',
    subtitle: 'Visionaries leading the Omeglee community.',
    color: 'amber',
  },
  {
    key: 'developers' as const,
    icon: <FiCode className="w-6 h-6" />,
    title: 'Bot Developers',
    subtitle: 'Architects of our custom bot features & economy.',
    color: 'cyan',
  },
  {
    key: 'management' as const,
    icon: <FiUserCheck className="w-6 h-6" />,
    title: 'Management Team',
    subtitle: 'Ensuring smooth daily server operations and community support.',
    color: 'purple',
  },
];

const COLOR_MAP: Record<
  string,
  { text: string; groupHoverText: string; bg: string; border: string; glow: string; hoverBorder: string; hoverShadow: string; iconGlow: string }
> = {
  amber: {
    text: 'text-amber-500',
    groupHoverText: 'group-hover:text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    hoverBorder: 'hover:border-amber-500/40',
    hoverShadow: 'shadow-[0_8px_30px_rgba(245,158,11,0.08)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.15)]',
    iconGlow: 'bg-amber-500',
  },
  cyan: {
    text: 'text-cyan-400',
    groupHoverText: 'group-hover:text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]',
    hoverBorder: 'hover:border-cyan-400/40',
    hoverShadow: 'shadow-[0_8px_30px_rgba(34,211,238,0.08)] hover:shadow-[0_12px_40px_rgba(34,211,238,0.15)]',
    iconGlow: 'bg-cyan-400',
  },
  purple: {
    text: 'text-purple-400',
    groupHoverText: 'group-hover:text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    glow: 'shadow-[0_0_20px_rgba(192,132,252,0.15)]',
    hoverBorder: 'hover:border-purple-400/40',
    hoverShadow: 'shadow-[0_8px_30px_rgba(192,132,252,0.08)] hover:shadow-[0_12px_40px_rgba(192,132,252,0.15)]',
    iconGlow: 'bg-purple-400',
  },
};

export default function TeamPage() {
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
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const renderMemberCard = (member: TeamMember, color: string) => {
    const { profile, designation } = member;
    const accentColor = profile.accentColor || '#3b82f6';
    const c = COLOR_MAP[color];

    return (
      <Item key={member.id} distance={20} scale={0.96} className="w-full max-w-[220px]">
        <HoverLift className="w-full">
          <Tilt max={6} scale={1.015} perspective={1000} className="w-full">
            <div
              className={`glass-blue rounded-[24px] overflow-hidden border border-white/5 shadow-apple-lg hover:shadow-apple-xl transition-all duration-500 ease-out flex flex-col group relative w-full min-h-[240px] ${c.hoverBorder} ${c.hoverShadow}`}
            >
              {/* Card banner */}
              <div className="relative w-full h-20 bg-[rgb(var(--color-bg-secondary))] overflow-hidden">
                <div
                  className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity duration-500 mix-blend-overlay"
                  style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #000 100%)` }}
                />
                {profile.banner && (
                  <img
                    src={profile.banner}
                    alt="Banner"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes('.gif')) target.src = target.src.replace('.gif', '.webp');
                    }}
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[rgb(var(--color-bg-primary))]/80 to-transparent" />
              </div>

              {/* Avatar */}
              <div className="relative px-4 -mt-10 flex justify-start z-10">
                <div className="relative group/avatar">
                  <div className={`absolute inset-0 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-500 ${c.iconGlow}`} />
                  <div className="relative w-16 h-16 border-[3px] rounded-full overflow-hidden border-[rgb(var(--color-bg-primary))] bg-[rgb(var(--color-bg-secondary))] flex-shrink-0 shadow-lg transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src.includes('.gif')) target.src = target.src.replace('.gif', '.webp');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-lg font-bold text-white/50">
                        {profile.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[rgb(var(--color-bg-primary))]" />
                  </span>
                </div>
              </div>

              {/* Member info */}
              <div className="flex-grow flex flex-col justify-between p-4 pt-3 relative z-10 bg-[rgb(var(--color-bg-primary))]/30 backdrop-blur-sm">
                <div>
                  <h3 className={`font-bold text-lg text-[rgb(var(--color-text-primary))] ${c.groupHoverText} transition-colors tracking-tight truncate`}>
                    {profile.displayName}
                  </h3>
                  <p className="text-xs font-medium text-[rgb(var(--color-text-tertiary))] tracking-tight truncate mt-0.5">@{profile.username}</p>
                </div>
                <div className="mt-4">
                  <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase rounded-md border shadow-sm ${c.bg} ${c.text} ${c.border} ${c.glow}`}>
                    {designation}
                  </span>
                </div>
              </div>
            </div>
          </Tilt>
        </HoverLift>
      </Item>
    );
  };

  const isEmpty = !team || (team.founders.length === 0 && team.developers.length === 0 && team.management.length === 0);

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center pb-28">
      {/* ── Ambient background glows ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <ScrollParallax distance={60} className="absolute" style={{ top: '-10%', left: '-10%' }}>
          <div
            style={{
              width: 620,
              height: 620,
              background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.05) 45%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </ScrollParallax>
        <ScrollParallax distance={50} className="absolute" style={{ top: '22%', right: '-8%' }}>
          <div
            style={{
              width: 520,
              height: 520,
              background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.14) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </ScrollParallax>
      </div>

      {/* Decorative floating role badges */}
      <FloatIn
        rotate={-13}
        opacity={0.5}
        amplitude={10}
        duration={7.5}
        delay={0.5}
        className="absolute pointer-events-none hidden lg:flex flex-col items-center justify-center gap-1.5"
        style={{
          top: '20%',
          left: '6%',
          width: 108,
          height: 108,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(245,158,11,0.16), rgba(10,10,15,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        <FiShield className="w-7 h-7 text-amber-400" />
      </FloatIn>
      <FloatIn
        rotate={11}
        opacity={0.5}
        amplitude={11}
        duration={8}
        delay={0.7}
        className="absolute pointer-events-none hidden lg:flex flex-col items-center justify-center gap-1.5"
        style={{
          top: '18%',
          right: '7%',
          width: 108,
          height: 108,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(34,211,238,0.16), rgba(10,10,15,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        <FiCode className="w-7 h-7 text-cyan-400" />
      </FloatIn>

      <div className="relative w-full max-w-6xl z-10 px-4 sm:px-6 pt-28 sm:pt-32">
        {/* Back link */}
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

        {/* Page header */}
        <RevealGroup mount stagger={0.1} className="flex flex-col items-center text-center gap-4 mb-20">
          <Item dir="none" scale={0.85}>
            <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
              <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">Meet Our Team</span>
            </div>
          </Item>

          <Item>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">
              <Words text="Behind the Scenes" stagger={0.06} />
            </h1>
          </Item>

          <Item blur>
            <p className="text-sm sm:text-lg text-[rgb(var(--color-text-secondary))] max-w-xl mx-auto leading-relaxed">
              The founders, developers, and management teams maintaining and advancing our community portal.
            </p>
          </Item>
        </RevealGroup>

        {/* Team content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))] font-bold tracking-wide">Loading profiles...</p>
          </div>
        ) : isEmpty ? (
          <Reveal mount dir="up" scale={0.95} className="glass-blue rounded-[32px] p-16 text-center border border-[rgb(var(--color-border))]/50 shadow-2xl backdrop-blur-xl relative overflow-hidden max-w-xl mx-auto">
            <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mb-6 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <FiUsers className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-extrabold text-[rgb(var(--color-text-primary))] mb-3 tracking-tight">No Team Members Found</h3>
            <p className="text-[rgb(var(--color-text-secondary))]">Check back soon for team member updates.</p>
          </Reveal>
        ) : (
          <div className="space-y-24">
            {GROUPS.map((group) => {
              const members = team![group.key];
              if (members.length === 0) return null;
              const c = COLOR_MAP[group.color];
              return (
                <section key={group.key} className="space-y-8">
                  <Reveal mount dir="left" distance={20} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-b border-[rgb(var(--color-border))]/40 pb-5">
                    <div className={`p-3.5 rounded-2xl ${c.bg} ${c.text} border ${c.border} ${c.glow} flex-shrink-0`}>{group.icon}</div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight">{group.title}</h2>
                      <p className="text-sm font-medium text-[rgb(var(--color-text-tertiary))] mt-1">{group.subtitle}</p>
                    </div>
                  </Reveal>

                  <RevealGroup mount stagger={0.08} className="flex flex-wrap justify-center sm:justify-start gap-6">
                    {members.map((m) => renderMemberCard(m, group.color))}
                  </RevealGroup>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
