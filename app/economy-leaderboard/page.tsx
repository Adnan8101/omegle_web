'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { FiArrowLeft,FiClock,FiRefreshCw,FiTrendingUp } from 'react-icons/fi';
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
        return 'from-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-400 to-gray-500';
      case 3:
        return 'from-orange-600 to-orange-700';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
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
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight flex items-center gap-2">
                <FiTrendingUp className="w-8 h-8 text-yellow-500" />
                Economy Leaderboard
              </h1>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-2 mt-1">
                <FiClock className="w-4 h-4" />
                Last updated: {formatTimeAgo(lastUpdated)} • Auto-updates every 30 minutes
              </p>
            </div>
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        {}
        {loading && entries.length === 0 ? (
          <div className="space-y-3">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="h-20 bg-[rgb(var(--color-bg-secondary))] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-blue rounded-3xl p-12 text-center border border-[rgb(var(--color-border))]">
            <FiTrendingUp className="w-16 h-16 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
              No Data Yet
            </h2>
            <p className="text-[rgb(var(--color-text-secondary))]">
              The leaderboard will populate as users earn {currencyName}!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]/50 apple-transition ${
                  index < 3 ? 'ring-2 ring-offset-2 ring-offset-[rgb(var(--color-bg-primary))]' : ''
                } ${
                  index === 0 ? 'ring-yellow-500/50' :
                  index === 1 ? 'ring-gray-400/50' :
                  index === 2 ? 'ring-orange-600/50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {}
                  <div className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${getRankColor(entry.rank)} flex items-center justify-center font-bold text-white shadow-lg`}>
                    <span className="text-lg sm:text-xl">{getRankBadge(entry.rank)}</span>
                  </div>
                  {}
                  <div className="flex-shrink-0">
                    <img
                      src={entry.avatar || `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 6)}.png`}
                      alt={entry.username}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[rgb(var(--color-border))]"
                    />
                  </div>
                  {}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg text-[rgb(var(--color-text-primary))] truncate flex items-center gap-2">
                      <span>{entry.username}</span>
                      {entry.isTempBlocked && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 font-semibold uppercase tracking-wider">
                          Blocked
                        </span>
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
                      Rank #{entry.rank} of {entries.length}
                    </p>
                  </div>
                  {}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      {getEmojiDisplay(currencyEmoji, 'w-5 h-5')}
                      <span className="font-bold text-lg sm:text-2xl text-yellow-500">
                        {entry.total_points.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                      {currencyName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-[rgb(var(--color-text-secondary))] text-center">
            💡 Leaderboard automatically refreshes every 30 minutes to show the latest rankings
          </p>
        </div>
      </div>
    </div>
  );
}