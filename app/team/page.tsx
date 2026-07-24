'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiShield, FiCode, FiUserCheck, FiUsers } from 'react-icons/fi';

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
    const accentColor = profile.accentColor;

    return (
      <div
        key={member.id}
        className="glass-blue rounded-2xl overflow-hidden border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-md hover:shadow-apple-xl hover:scale-[1.03] hover:border-blue-500/40 transition-all duration-500 ease-out flex flex-col group relative w-full max-w-[220px] min-h-[240px]"
        style={{
          ...getAccentColorStyle(accentColor, 'shadow'),
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Card Banner */}
        <div className="relative w-full h-16 bg-gradient-to-br from-blue-900/40 via-indigo-950/30 to-black/20 overflow-hidden">
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
                background: `linear-gradient(135deg, ${accentColor || '#1e3a8a'} 0%, #000 100%)`,
              }}
            />
          )}
        </div>

        {/* Avatar */}
        <div className="relative px-4 -mt-7 flex justify-start z-10">
          <div className="relative group/avatar">
            <div className="relative w-14 h-14 border-[3px] rounded-full overflow-hidden border-[rgb(var(--color-bg-primary))] bg-[rgb(var(--color-bg-secondary))] flex-shrink-0 shadow-md transition-transform duration-500">
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
                <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-base font-bold text-blue-500">
                  {profile.username.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {/* Status indicator */}
            <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-[rgb(var(--color-bg-primary))]"></span>
            </span>
          </div>
        </div>

        {/* Member info */}
        <div className="flex-grow flex flex-col justify-between p-4 pt-2 relative z-10">
          <div>
            <h3 className="font-[var(--font-display)] font-semibold text-[rgb(var(--color-text-primary))] group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors text-sm truncate">
              {profile.displayName}
            </h3>
            <p className="text-[10px] font-mono text-[rgb(var(--color-text-tertiary))] tracking-tight truncate mt-0.5">
              @{profile.username}
            </p>
          </div>

          <div className="mt-3">
            <span
              className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${
                designation === 'Founder'
                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-500 border-amber-500/30'
                  : designation === 'Bot Developer'
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400/30'
                  : 'bg-purple-500/15 text-purple-400 border-purple-400/30'
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
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent filter blur-3xl rounded-full" />
      </div>

      <div className="relative w-full max-w-6xl z-10 px-4 sm:px-6 pt-12 sm:pt-16">
        
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center justify-center px-4 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
            <span className="text-blue-500 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
              Meet Our Team
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[rgb(var(--color-text-primary))] dark:text-white tracking-tight">
            Behind the Scenes
          </h1>

          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] max-w-xl mx-auto leading-relaxed">
            The founders, developers, and management teams maintaining and advancing our community portal.
          </p>
        </div>

        {/* Team Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-medium">Loading team profiles...</p>
          </div>
        ) : !team || (team.founders.length === 0 && team.developers.length === 0 && team.management.length === 0) ? (
          <div className="glass-blue rounded-3xl p-12 text-center border border-[rgb(var(--color-border))]/60 dark:border-white/10 max-w-md mx-auto">
            <FiUsers className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))] mb-1">No Team Members Added</h3>
            <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Check back soon for team member updates.</p>
          </div>
        ) : (
          <div className="space-y-16">
            
            {/* Founders Section */}
            {team.founders.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[rgb(var(--color-border))]/40 dark:border-white/10 pb-4">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[rgb(var(--color-text-primary))]">Founders & Leadership</h2>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Visionaries leading the Omeglee community.</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-6">
                  {team.founders.map(renderMemberCard)}
                </div>
              </section>
            )}

            {/* Developers Section */}
            {team.developers.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[rgb(var(--color-border))]/40 dark:border-white/10 pb-4">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                    <FiCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[rgb(var(--color-text-primary))]">Bot Developers</h2>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Architects of our custom bot features & economy.</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-6">
                  {team.developers.map(renderMemberCard)}
                </div>
              </section>
            )}

            {/* Management Section */}
            {team.management.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[rgb(var(--color-border))]/40 dark:border-white/10 pb-4">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-400/20">
                    <FiUserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[rgb(var(--color-text-primary))]">Management Team</h2>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Ensuring smooth daily server operations and community support.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center sm:justify-items-start">
                  {team.management.map(renderMemberCard)}
                </div>
              </section>
            )}

          </div>
        )}

      </div>
    </main>
  );
}
