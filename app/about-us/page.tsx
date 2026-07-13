'use client';

import { useEffect, useState } from 'react';

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

export default function AboutUs() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const response = await fetch('/api/team', { cache: 'no-store' });
        const resData = await response.json();
        if (response.ok && resData.success) {
          setTeam(resData.data);
        } else {
          setError(resData.error || 'Failed to load team information');
        }
      } catch (err) {
        console.error('Error fetching team:', err);
        setError('Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const getAccentColorStyle = (accentHex: string | null, type: 'border' | 'shadow' | 'bg' | 'glow') => {
    const color = accentHex || '#3b82f6'; // Fallback to blue-500
    switch (type) {
      case 'border':
        return { borderColor: color };
      case 'shadow':
        return { boxShadow: `0 10px 30px -10px ${color}33` };
      case 'bg':
        return { backgroundColor: color };
      case 'glow':
        return { boxShadow: `0 0 20px 2px ${color}4d` };
      default:
        return {};
    }
  };

  const renderMemberCard = (member: TeamMember, size: 'large' | 'normal' = 'normal') => {
    const { profile, designation } = member;
    const accentColor = profile.accentColor;

    const isLarge = size === 'large';
    const cardSizeClass = isLarge 
      ? 'w-full max-w-sm md:max-w-md min-h-[360px]' 
      : 'w-full max-w-[280px] min-h-[290px]';

    return (
      <div
        key={member.id}
        className={`glass-blue rounded-[2rem] overflow-hidden border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg hover:shadow-apple-xl hover:scale-[1.03] hover:border-blue-500/35 transition-all duration-500 flex flex-col group relative ${cardSizeClass}`}
        style={getAccentColorStyle(accentColor, 'shadow')}
      >
        {/* Card Border Glow on Hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-[2rem] pointer-events-none"
          style={{
            background: `radial-gradient(800px circle at var(--x, 50%) var(--y, 50%), ${accentColor || '#3b82f6'} 0%, transparent 40%)`
          }}
        />

        {/* Discord Banner Section */}
        <div className={`relative w-full ${isLarge ? 'h-32 md:h-36' : 'h-24'} bg-gradient-to-br from-blue-900/40 via-indigo-950/30 to-black/20 overflow-hidden`}>
          {profile.banner ? (
            <img
              src={profile.banner}
              alt="Banner"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div
              className="w-full h-full opacity-60 mix-blend-overlay group-hover:opacity-85 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${accentColor || '#1e3a8a'} 0%, #000 100%)`
              }}
            />
          )}
          {/* Subtle Banner Overlay Grid */}
          <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />
        </div>

        {/* Profile Avatar Container */}
        <div className={`relative ${isLarge ? 'px-8 -mt-16' : 'px-6 -mt-12'} flex justify-start z-10`}>
          <div className="relative group/avatar">
            {/* Accent Glowing Ring */}
            <div 
              className="absolute -inset-0.5 rounded-full blur-md opacity-0 group-hover/avatar:opacity-75 transition-opacity duration-500 animate-pulse"
              style={getAccentColorStyle(accentColor, 'bg')}
            />
            {/* Avatar Border */}
            <div 
              className={`relative ${isLarge ? 'w-24 h-24 md:w-28 md:h-28 border-[4px]' : 'w-20 h-20 border-[3px]'} rounded-full overflow-hidden border-[rgb(var(--color-bg-primary))] bg-[rgb(var(--color-bg-secondary))] flex-shrink-0 shadow-apple-md transition-transform duration-500`}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-xl font-bold text-blue-500">
                  {profile.username.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Live Online Badge Indicator */}
            <span className="absolute bottom-1.5 right-1.5 flex h-4.5 w-4.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-green-500 border-2 border-[rgb(var(--color-bg-primary))]"></span>
            </span>
          </div>
        </div>

        {/* Member Details */}
        <div className={`flex-grow flex flex-col justify-between ${isLarge ? 'p-8 pt-4' : 'p-6 pt-3'} relative z-10`}>
          <div className="space-y-1">
            <h3 
              className={`font-[var(--font-display)] font-semibold text-[rgb(var(--color-text-primary))] group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors ${isLarge ? 'text-xl md:text-2xl' : 'text-lg'}`}
            >
              {profile.displayName}
            </h3>
            <p className="text-xs font-mono text-[rgb(var(--color-text-tertiary))] tracking-tight">
              @{profile.username}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span 
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border ${
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
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden py-16 sm:py-24">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-500/3 rounded-full filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Page Title */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-20 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[rgb(var(--color-text-primary))] font-[var(--font-display)]">
            Meet Our Team
          </h1>
          <p className="text-base sm:text-lg text-[rgb(var(--color-text-secondary))] font-light">
            The developers, designers, and community builders behind the Omeglee platform.
          </p>
          <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto rounded-full mt-4" />
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
              </div>
              <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Loading our team members...</p>
            </div>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto text-center py-12 glass-blue border border-[rgb(var(--color-border))] rounded-3xl p-6">
            <p className="text-red-500 font-semibold mb-2">Failed to load team info</p>
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">{error}</p>
          </div>
        ) : !team || (team.founders.length === 0 && team.developers.length === 0 && team.management.length === 0) ? (
          <div className="text-center py-16 text-[rgb(var(--color-text-secondary))]">
            No team members are currently added.
          </div>
        ) : (
          <div className="space-y-12 flex flex-col items-center">
            {/* Category: Founders */}
            {team.founders.length > 0 && (
              <div className="w-full flex flex-col items-center animate-slide-up">
                <div className="flex flex-col items-center gap-6 w-full">
                  {team.founders.map((founder) => renderMemberCard(founder, 'large'))}
                </div>

                {/* Vertical Line Connector */}
                {(team.developers.length > 0 || team.management.length > 0) && (
                  <div className="w-0.5 h-16 bg-gradient-to-b from-blue-500/50 to-cyan-400/50 my-8 rounded-full shadow-lg" />
                )}
              </div>
            )}

            {/* Category: Bot Developers */}
            {team.developers.length > 0 && (
              <div className="w-full flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex flex-wrap justify-center gap-8 w-full">
                  {team.developers.map((dev) => renderMemberCard(dev, 'large'))}
                </div>

                {/* Vertical Line Connector */}
                {team.management.length > 0 && (
                  <div className="w-0.5 h-16 bg-gradient-to-b from-cyan-400/50 to-indigo-500/50 my-8 rounded-full shadow-lg" />
                )}
              </div>
            )}

            {/* Category: Management Team */}
            {team.management.length > 0 && (
              <div 
                className="w-full animate-slide-up flex flex-col items-center" 
                style={{ animationDelay: '0.3s' }}
              >
                <h2 className="font-[var(--font-display)] text-2xl font-semibold text-center text-[rgb(var(--color-text-primary))] mb-8">
                  Management Team
                </h2>
                
                {/* Dynamically sizing responsive grid based on item counts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center w-full max-w-5xl">
                  {team.management.map((manager) => renderMemberCard(manager, 'normal'))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
