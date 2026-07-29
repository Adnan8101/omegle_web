'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { FiArrowLeft, FiAward, FiClock, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import {
  Reveal,
  RevealGroup,
  Item,
  HoverLift,
  Magnetic,
  Tilt,
  Words,
  CountUp,
  FloatIn,
  ScrollParallax,
} from '@/components/motion';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar: string | null;
  total_points: number;
  leaderboard_points: number;
  isTempBlocked?: boolean;
}

const RANK_THEME: Record<number, { text: string; from: string; ring: string; glow: string; chip: string }> = {
  1: {
    text: 'text-yellow-400',
    from: 'from-yellow-300 via-yellow-500 to-amber-600',
    ring: 'border-yellow-400/70',
    glow: 'shadow-[0_0_40px_rgba(234,179,8,0.35)]',
    chip: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400',
  },
  2: {
    text: 'text-slate-200',
    from: 'from-slate-200 via-slate-400 to-gray-500',
    ring: 'border-slate-300/70',
    glow: 'shadow-[0_0_30px_rgba(203,213,225,0.25)]',
    chip: 'bg-slate-400/10 border-slate-400/40 text-slate-200',
  },
  3: {
    text: 'text-orange-400',
    from: 'from-orange-300 via-orange-500 to-red-600',
    ring: 'border-orange-400/70',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.3)]',
    chip: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
  },
};

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
        'w-4 h-4': 32,
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

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const topThree = entries.length >= 3 ? [entries[1], entries[0], entries[2]] : [];
  const rest = entries.length >= 3 ? entries.filter((e) => e.rank > 3) : entries;

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden flex flex-col items-center pb-28">
      {/* ── Ambient background glows ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <ScrollParallax distance={60} className="absolute" style={{ top: '-8%', left: '-10%' }}>
          <div
            style={{
              width: 620,
              height: 620,
              background: 'radial-gradient(ellipse at center, rgba(234,179,8,0.16) 0%, rgba(234,179,8,0.05) 45%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </ScrollParallax>
        <ScrollParallax distance={50} className="absolute" style={{ top: '18%', right: '-8%' }}>
          <div
            style={{
              width: 500,
              height: 500,
              background: 'radial-gradient(ellipse at center, rgba(59,158,255,0.14) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </ScrollParallax>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 relative z-10 pt-28 sm:pt-32">
        {/* ── Header ────────────────────────────────────────────── */}
        <RevealGroup mount stagger={0.1} className="flex flex-col items-center text-center gap-5 mb-16 sm:mb-20">
          <div className="w-full flex items-center justify-between">
            <Item dir="left">
              <Magnetic strength={0.3} max={10}>
                <Link
                  href="/"
                  className="flex items-center justify-center w-12 h-12 glass-blue rounded-2xl border border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5 apple-transition shadow-lg shadow-black/20"
                >
                  <FiArrowLeft className="w-5 h-5 text-white/80" />
                </Link>
              </Magnetic>
            </Item>
            <Item dir="right">
              <Magnetic strength={0.2} max={5}>
                <button
                  onClick={fetchLeaderboard}
                  disabled={loading}
                  className="group flex items-center gap-2.5 px-5 py-3 glass-blue rounded-2xl border border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5 apple-transition disabled:opacity-50 shadow-lg shadow-black/20 cursor-pointer"
                >
                  <FiRefreshCw className={`w-4 h-4 text-white/70 group-hover:text-white transition-colors ${loading ? 'animate-spin text-yellow-400' : ''}`} />
                  <span className="text-sm font-bold tracking-wide text-white/90 group-hover:text-white hidden sm:inline">Refresh</span>
                </button>
              </Magnetic>
            </Item>
          </div>

          <Item dir="none" scale={0.85}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">
              <FiTrendingUp className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Live Economy Rankings</span>
            </div>
          </Item>

          <Item>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[rgb(var(--color-text-primary))] tracking-tight leading-[1.05]">
              <Words text="Economy Leaderboard" />
            </h1>
          </Item>

          <Item blur>
            <p className="text-[rgb(var(--color-text-secondary))] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              The top {currencyName} earners across the entire server — ranked by everything they&apos;ve stacked up.
            </p>
          </Item>

          <Item>
            <div className="flex items-center gap-2 mt-1 px-3.5 py-1.5 rounded-full glass-blue border border-[rgb(var(--color-border))]/60">
              <FiClock className="w-3 h-3 text-blue-400" />
              <p className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">
                Updated <span className="text-[rgb(var(--color-text-primary))]/80 font-semibold">{formatTimeAgo(lastUpdated)}</span>
                <span className="text-[rgb(var(--color-text-tertiary))] mx-1.5">•</span>
                Auto-syncs every 30m
              </p>
            </div>
          </Item>
        </RevealGroup>

        {/* ── Content ───────────────────────────────────────────── */}
        {loading && entries.length === 0 ? (
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-[rgb(var(--color-bg-secondary))]/40 backdrop-blur-md rounded-[24px] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Reveal mount dir="up" scale={0.95} className="glass-blue rounded-[32px] p-16 text-center border border-[rgb(var(--color-border))]/50 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none" />
            <div className="w-24 h-24 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 mb-6 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
              <FiTrendingUp className="w-10 h-10 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))] mb-3 tracking-tight">Awaiting Legends</h2>
            <p className="text-lg text-[rgb(var(--color-text-secondary))] max-w-md mx-auto leading-relaxed">
              The leaderboard is currently empty. Start earning {currencyName} to claim your spot at the top!
            </p>
          </Reveal>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* ── Podium (Top 3) ──────────────────────────────────── */}
            {topThree.length === 3 && (
              <div className="relative w-full flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 mb-24 mt-4 px-2">
                {/* Ambient glow behind the champion */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: '-10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 420,
                    height: 420,
                    background: 'radial-gradient(ellipse at center, rgba(234,179,8,0.22) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                  }}
                />
                {topThree.map((entry, i) => {
                  const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                  return <PodiumCard key={entry.user_id} entry={entry} rank={rank} currencyEmoji={currencyEmoji} getEmojiDisplay={getEmojiDisplay} />;
                })}
              </div>
            )}

            {/* ── Rank 4+ list ────────────────────────────────────── */}
            <RevealGroup mount stagger={0.06} className="space-y-4 relative z-10 w-full">
              {rest.map((entry) => {
                const isTop3 = entry.rank <= 3;
                const theme = RANK_THEME[entry.rank];
                return (
                  <Item key={entry.user_id} distance={20} scale={0.98} className="w-full">
                    <HoverLift className="w-full">
                      <div
                        className={`relative overflow-hidden group rounded-[24px] p-1 glass-blue border transition-all duration-500 ease-out ${
                          isTop3
                            ? `${theme.ring} ${theme.glow}`
                            : 'border-[rgb(var(--color-border))]/60 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        {isTop3 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
                        )}
                        <div className="relative flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-[20px] bg-[rgb(var(--color-bg-primary))]/40 backdrop-blur-md">
                          {/* Rank badge */}
                          <div
                            className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-[18px] bg-gradient-to-br ${
                              theme ? theme.from : 'from-blue-500 to-indigo-600'
                            } flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/20 shadow-lg`}
                          >
                            <span className="text-sm font-black tracking-widest text-white/90">#{entry.rank}</span>
                          </div>

                          {/* Avatar */}
                          <div className="flex-shrink-0 relative">
                            <div
                              className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-500 ${
                                isTop3 ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                            />
                            <img
                              src={entry.avatar || `https://cdn.discordapp.com/embed/avatars/${entry.rank % 6}.png`}
                              alt={entry.username}
                              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-[3px] transition-colors duration-300 ${
                                isTop3 ? 'border-yellow-500/80' : 'border-[rgb(var(--color-border))] group-hover:border-white/30'
                              }`}
                            />
                          </div>

                          {/* User info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-3">
                              <h3
                                className={`font-bold text-lg sm:text-xl truncate tracking-tight transition-colors ${
                                  isTop3 ? theme.text : 'text-[rgb(var(--color-text-primary))] group-hover:text-[rgb(var(--color-text-primary))]/90'
                                }`}
                              >
                                {entry.username}
                              </h3>
                              {entry.isTempBlocked && (
                                <span className="flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-[rgb(var(--color-text-tertiary))] mt-0.5">
                              Rank <span className="text-[rgb(var(--color-text-primary))]/60">#{entry.rank}</span> out of {entries.length}
                            </p>
                          </div>

                          {/* Score */}
                          <div className="flex-shrink-0 text-right pr-2">
                            <div className="flex items-center gap-2 justify-end mb-1">
                              <div className="transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                                {getEmojiDisplay(currencyEmoji, 'w-5 h-5 sm:w-6 sm:h-6')}
                              </div>
                              <span
                                className={`font-black text-xl sm:text-3xl tracking-tight transition-all duration-300 ${
                                  isTop3
                                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                                    : 'text-yellow-500'
                                }`}
                              >
                                <CountUp value={entry.total_points} />
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[rgb(var(--color-text-tertiary))]">{currencyName}</p>
                          </div>
                        </div>
                      </div>
                    </HoverLift>
                  </Item>
                );
              })}
            </RevealGroup>
          </div>
        )}
      </div>
    </main>
  );
}

function PodiumCard({
  entry,
  rank,
  currencyEmoji,
  getEmojiDisplay,
}: {
  entry: LeaderboardEntry;
  rank: number;
  currencyEmoji: string;
  getEmojiDisplay: (emoji: string, size?: string) => ReactNode;
}) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const theme = RANK_THEME[rank];

  const heightClass = isFirst ? 'h-64 sm:h-72' : isSecond ? 'h-52 sm:h-60' : 'h-44 sm:h-52';
  const bgClass = isFirst
    ? 'from-yellow-500/20 via-yellow-900/10 to-black/40 border-yellow-500/40'
    : isSecond
    ? 'from-slate-400/20 via-slate-800/10 to-black/40 border-slate-400/40'
    : 'from-orange-500/20 via-orange-900/10 to-black/40 border-orange-500/40';

  return (
    <Reveal
      mount
      dir="up"
      delay={isFirst ? 0 : isSecond ? 0.1 : 0.2}
      className={`relative w-full max-w-[240px] sm:max-w-[280px] ${isFirst ? 'z-20 sm:-translate-y-8' : 'z-10'}`}
    >
      <HoverLift className="w-full h-full flex flex-col justify-end">
        <Tilt max={isFirst ? 5 : 3} scale={1.01} perspective={1200}>
          <div
            className={`relative flex flex-col items-center p-6 glass-blue rounded-t-[32px] rounded-b-xl border-t border-l border-r border-b-0 bg-gradient-to-b ${bgClass} ${theme.glow} transition-all duration-500 hover:brightness-110`}
          >
            {/* Crown for #1 */}
            {isFirst && (
              <FloatIn
                amplitude={5}
                duration={4}
                delay={0.3}
                className="absolute -top-14 pointer-events-none select-none text-4xl"
              >
                👑
              </FloatIn>
            )}

            <div className="absolute -top-6">
              <div
                className={`relative flex items-center justify-center rounded-full bg-gradient-to-b ${theme.from} border-2 ${theme.ring} ${theme.glow} ${
                  isFirst ? 'w-12 h-12' : 'w-10 h-10'
                }`}
              >
                <FiAward className={isFirst ? 'w-6 h-6 text-black/70' : 'w-5 h-5 text-black/70'} />
              </div>
            </div>

            <div className={`relative mt-4 mb-4 ${isFirst ? 'w-24 h-24' : 'w-20 h-20'}`}>
              <div className={`absolute inset-0 rounded-full blur-md opacity-60 ${isFirst ? 'bg-yellow-500' : isSecond ? 'bg-slate-400' : 'bg-orange-500'}`} />
              <img
                src={entry.avatar || `https://cdn.discordapp.com/embed/avatars/${rank % 6}.png`}
                alt={entry.username}
                className={`relative w-full h-full rounded-full object-cover border-[3px] shadow-2xl ${
                  isFirst ? 'border-yellow-400' : isSecond ? 'border-slate-300' : 'border-orange-400'
                }`}
              />
            </div>

            <h3 className={`font-extrabold text-lg sm:text-xl truncate tracking-tight text-center w-full ${theme.text}`}>{entry.username}</h3>

            <div className="flex items-center justify-center gap-1.5 mt-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 w-full">
              {getEmojiDisplay(currencyEmoji, 'w-4 h-4 sm:w-5 sm:h-5')}
              <span className={`font-black text-sm sm:text-base ${theme.text}`}>
                <CountUp value={entry.total_points} />
              </span>
            </div>
          </div>
        </Tilt>

        <div className={`w-full ${heightClass} bg-gradient-to-b ${bgClass} border-x border-t-0 rounded-b-[24px] opacity-80 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md`}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <span className={`text-6xl sm:text-8xl font-black opacity-10 ${theme.text}`}>{rank}</span>
        </div>
      </HoverLift>
    </Reveal>
  );
}
