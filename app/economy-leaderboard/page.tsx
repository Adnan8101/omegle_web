'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiClock, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { Reveal, RevealGroup, Item, HoverLift, Magnetic, Words, CountUp } from '@/components/motion';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar: string | null;
  total_points: number;
  leaderboard_points: number;
  isTempBlocked?: boolean;
}
export default function EconomyLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [currencyName, setCurrencyName] = useState('Ozy');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const getEmojiDisplay = (emoji: string, size: string = 'w-6 h-6') => {
    const match = emoji.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      const [, name, id] = match;
      const isAnimated = emoji.startsWith('<a:');
      const extension = isAnimated ? 'gif' : 'png';
      const sizeMap: { [key: string]: number } = {
        'w-5 h-5': 40,
        'w-6 h-6': 48,
        'w-8 h-8': 64,
      };
      const imgSize = sizeMap[size] || 48;
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${extension}?size=${imgSize}&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    }
    return <span className="inline-block text-2xl">{emoji}</span>;
  };
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/economy-leaderboard');
      const data = await res.json();
      if (res.ok) {
        setEntries(data.leaderboard || []);
        setCurrencyEmoji(data.currencyEmoji || '🪙');
        setCurrencyName(data.currencyName || 'Ozy');
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 via-yellow-500 to-amber-600 shadow-[0_0_30px_rgba(234,179,8,0.4)]';
      case 2:
        return 'from-slate-300 via-gray-400 to-gray-500 shadow-[0_0_20px_rgba(156,163,175,0.3)]';
      case 3:
        return 'from-orange-400 via-orange-500 to-red-600 shadow-[0_0_20px_rgba(249,115,22,0.3)]';
      default:
        return 'from-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
    }
  };
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl drop-shadow-md">🥇</span>;
      case 2:
        return <span className="text-xl drop-shadow-md">🥈</span>;
      case 3:
        return <span className="text-xl drop-shadow-md">🥉</span>;
      default:
        return <span className="text-sm font-black tracking-widest text-white/90">#{rank}</span>;
    }
  };
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };
  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center pb-24">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-500/10 rounded-full filter blur-[100px] opacity-40 animate-pulse" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-blue-500/10 rounded-full filter blur-[100px] opacity-30" />
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 relative z-10 pt-8 sm:pt-12">
        {/* Header Section */}
        <Reveal mount dir="down" distance={20} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Magnetic strength={0.3} max={10} className="self-start sm:self-auto">
              <Link
                href="/"
                className="flex items-center justify-center w-12 h-12 glass-blue rounded-2xl border border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5 apple-transition shadow-lg shadow-black/20"
              >
                <FiArrowLeft className="w-5 h-5 text-white/80" />
              </Link>
            </Magnetic>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight flex items-center gap-3 leading-tight">
                <FiTrendingUp className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                <Words text="Economy Leaderboard" />
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <FiClock className="w-3 h-3 text-blue-400" />
                </div>
                <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                  Updated <span className="text-white/80">{formatTimeAgo(lastUpdated)}</span> <span className="text-white/20 mx-1">•</span> Auto-syncs every 30m
                </p>
              </div>
            </div>
          </div>
          <Magnetic strength={0.2} max={5} className="self-start sm:self-auto">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="group flex items-center gap-2.5 px-5 py-3 glass-blue rounded-2xl border border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5 apple-transition disabled:opacity-50 shadow-lg shadow-black/20 cursor-pointer"
            >
              <FiRefreshCw className={`w-4 h-4 text-white/70 group-hover:text-white transition-colors ${loading ? 'animate-spin text-blue-400' : ''}`} />
              <span className="text-sm font-bold tracking-wide text-white/90 group-hover:text-white">Refresh</span>
            </button>
          </Magnetic>
        </Reveal>

        {/* Content Section */}
        {loading && entries.length === 0 ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-24 bg-[rgb(var(--color-bg-secondary))]/40 backdrop-blur-md rounded-[24px] border border-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Reveal mount dir="up" scale={0.95} className="glass-blue rounded-[32px] p-16 text-center border border-[rgb(var(--color-border))]/50 shadow-2xl backdrop-blur-xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
            <div className="w-24 h-24 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mb-6 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <FiTrendingUp className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))] mb-3 tracking-tight">
              Awaiting Legends
            </h2>
            <p className="text-lg text-[rgb(var(--color-text-secondary))] max-w-md mx-auto leading-relaxed">
              The leaderboard is currently empty. Start earning {currencyName} to claim your spot at the top!
            </p>
          </Reveal>
        ) : (
          <RevealGroup mount stagger={0.06} className="space-y-4 relative z-10">
            {entries.map((entry, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              
              return (
                <Item key={entry.user_id} distance={20} scale={0.98} className="w-full">
                  <HoverLift className="w-full">
                    <div
                      className={`relative overflow-hidden group rounded-[24px] p-1 glass-blue border transition-all duration-500 ease-out ${
                        isFirst ? 'border-yellow-500/40 hover:border-yellow-400/80 shadow-[0_8px_30px_rgba(234,179,8,0.15)] hover:shadow-[0_12px_40px_rgba(234,179,8,0.25)]' :
                        isSecond ? 'border-gray-400/40 hover:border-gray-300/80 shadow-[0_8px_30px_rgba(156,163,175,0.1)]' :
                        isThird ? 'border-orange-500/40 hover:border-orange-400/80 shadow-[0_8px_30px_rgba(249,115,22,0.1)]' :
                        'border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      {/* Inner ambient glow for top 3 */}
                      {isFirst && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />}
                      {isSecond && <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />}
                      {isThird && <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />}

                      <div className={`relative flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-[20px] bg-[rgb(var(--color-bg-primary))]/40 backdrop-blur-md`}>
                        
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-[18px] bg-gradient-to-br ${getRankColor(entry.rank)} flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/20 shadow-lg`}>
                          {getRankBadge(entry.rank)}
                        </div>

                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                          <div className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-500 ${isFirst ? 'bg-yellow-500' : isSecond ? 'bg-gray-400' : isThird ? 'bg-orange-500' : 'bg-blue-500'}`} />
                          <img
                            src={entry.avatar || `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 6)}.png`}
                            alt={entry.username}
                            className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-[3px] transition-colors duration-300 ${
                              isFirst ? 'border-yellow-500/80' :
                              isSecond ? 'border-gray-400/80' :
                              isThird ? 'border-orange-500/80' :
                              'border-[rgb(var(--color-border))] group-hover:border-white/30'
                            }`}
                          />
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-3">
                            <h3 className={`font-bold text-lg sm:text-xl truncate tracking-tight transition-colors ${
                              isFirst ? 'text-yellow-400' :
                              isSecond ? 'text-gray-200' :
                              isThird ? 'text-orange-400' :
                              'text-white group-hover:text-white/90'
                            }`}>
                              {entry.username}
                            </h3>
                            {entry.isTempBlocked && (
                              <span className="flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                Blocked
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-[rgb(var(--color-text-tertiary))] mt-0.5">
                            Rank <span className="text-white/60">#{entry.rank}</span> out of {entries.length}
                          </p>
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0 text-right pr-2">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <div className="transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                              {getEmojiDisplay(currencyEmoji, 'w-5 h-5 sm:w-6 sm:h-6')}
                            </div>
                            <span className={`font-black text-xl sm:text-3xl tracking-tight transition-all duration-300 ${
                              isFirst ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                              isSecond ? 'text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400' :
                              isThird ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-orange-600' :
                              'text-yellow-500'
                            }`}>
                              <CountUp value={entry.total_points} />
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[rgb(var(--color-text-tertiary))]">
                            {currencyName}
                          </p>
                        </div>
                      </div>
                    </div>
                  </HoverLift>
                </Item>
              );
            })}
          </RevealGroup>
        )}
      </div>
    </main>
  );
}