'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiActivity, FiUsers, FiMic, FiMicOff, FiVolume2, FiVolumeX,
  FiTrendingUp, FiClock, FiDollarSign, FiRefreshCw, FiArrowLeft,
  FiAlertCircle, FiCheckCircle, FiXCircle, FiZap, FiLayers,
  FiMessageSquare, FiHeadphones, FiAward, FiBarChart2
} from 'react-icons/fi';

interface ActiveVcUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
  channelId: string;
  channelName: string;
  categoryId: string | null;
  categoryName: string | null;
  joinedAt: string;
  sessionDuration: number;
  isMuted: boolean;
  isDeafened: boolean;
  isBlacklisted: boolean;
  isEarning: boolean;
  earningMode: 'normal' | 'advanced';
  settings: {
    minutesPerPoint: number;
    ozyAmount: number;
    dailyLimit: number;
    minMembers: number;
  };
  progress: {
    accumulatedSeconds: number;
    thresholdSeconds: number;
    progressPercent: number;
    todayEarned: number;
    remainingDaily: number;
    nextRewardIn: number;
  };
}

interface CategoryReward {
  categoryId: string;
  categoryName: string | null;
  vcEnabled: boolean;
  vcMinutesPerPoint: number;
  vcOzyAmount: number;
  vcDailyLimit: number;
  vcMinMembers: number;
}

interface RecentAward {
  userId: string;
  username: string;
  avatarUrl: string | null;
  amount: number;
  reason: string;
  source: string;
  createdAt: string;
}

interface TodayEarner {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalEarned: number;
}

interface LiveStatusData {
  success: boolean;
  timestamp: string;
  economyEnabled: boolean;
  advancedMode: boolean;
  config: {
    currencyName: string;
    currencyEmoji: string;
    minutesPerPoint: number;
    vcOzyAmount: number;
    dailyVoiceCap: number;
    requireTwoMembers: number;
    messagesPerPoint: number;
    msgOzyAmount: number;
    dailyMessageCap: number;
  };
  activeVcUsers: ActiveVcUser[];
  categoryRewards: CategoryReward[];
  blacklists: {
    channels: string[];
    roles: string[];
  };
  recentAwards: RecentAward[];
  todayEarners: TodayEarner[];
  stats: {
    totalUsers: number;
    totalPointsDistributed: number;
    avgPointsPerUser: string;
    vcProgress: {
      usersWithProgress: number;
      totalAccumulatedSeconds: number;
      totalEarnedToday: number;
    };
    msgProgress: {
      usersWithProgress: number;
      totalAccumulatedMsgs: number;
      totalEarnedToday: number;
    };
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Function to convert Discord emoji to CDN URL
function getEmojiDisplay(emoji: string, size: string = 'w-5 h-5') {
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
  return <span className="inline-block">{emoji}</span>;
}

function getAvatarUrl(avatarUrl: string | null, userId: string, size: number = 64): string {
  if (avatarUrl) return avatarUrl;
  const defaultAvatar = parseInt(userId) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png?size=${size}`;
}

export default function LiveMonitorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LiveStatusData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/live-status');
      const result = await res.json();
      
      if (!res.ok) {
        setError(result.error || 'Failed to fetch data');
        return;
      }
      
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching live status:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Permission check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/admin');
      return;
    }
    
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      if (!perms?.hasFullAccess) {
        router.push('/admin');
        return;
      }
      fetchData();
    }
  }, [status, session, router, fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || status !== 'authenticated') return;
    
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData, status]);

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading live monitor...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Error</h1>
          <p className="text-[rgb(var(--color-text-secondary))] mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-[rgb(var(--color-text-secondary))]" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                <FiActivity className="text-green-500" />
                Live Economy Monitor
              </h1>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                Real-time view of coins distribution and VC activity
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Economy Status */}
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
              data?.economyEnabled 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {data?.economyEnabled ? <FiCheckCircle /> : <FiXCircle />}
              Economy {data?.economyEnabled ? 'Active' : 'Disabled'}
            </div>
            
            {/* Mode Badge */}
            {data?.advancedMode && (
              <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 flex items-center gap-2">
                <FiLayers />
                Advanced Mode
              </div>
            )}

            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-2 bg-[rgb(var(--color-bg-secondary))] rounded-lg px-3 py-1.5">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-1.5 rounded ${autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
              >
                <FiRefreshCw className={autoRefresh ? 'animate-spin' : ''} />
              </button>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-sm text-[rgb(var(--color-text-secondary))] outline-none"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            {lastUpdate && (
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <FiUsers className="w-5 h-5" />
              <span className="text-sm">In VC Now</span>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {data?.activeVcUsers.length || 0}
            </p>
          </div>
          
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <FiZap className="w-5 h-5" />
              <span className="text-sm">Earning Now</span>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {data?.activeVcUsers.filter(u => u.isEarning && !u.isBlacklisted).length || 0}
            </p>
          </div>

          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              {getEmojiDisplay(data?.config.currencyEmoji || '🪙', 'w-5 h-5')}
              <span className="text-sm">Earned Today (VC)</span>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {data?.stats.vcProgress.totalEarnedToday || 0}
            </p>
          </div>

          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <FiMessageSquare className="w-5 h-5" />
              <span className="text-sm">Earned Today (Msg)</span>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {data?.stats.msgProgress.totalEarnedToday || 0}
            </p>
          </div>

          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <FiBarChart2 className="w-5 h-5" />
              <span className="text-sm">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {data?.stats.totalUsers || 0}
            </p>
          </div>

          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <FiAward className="w-5 h-5" />
              <span className="text-sm">Total Distributed</span>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {(data?.stats.totalPointsDistributed || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active VC Users */}
          <div className="lg:col-span-2 bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
              <h2 className="font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                <FiHeadphones className="text-blue-400" />
                Active Voice Users
              </h2>
              <span className="text-sm text-[rgb(var(--color-text-secondary))]">
                {data?.activeVcUsers.length || 0} users
              </span>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {data?.activeVcUsers.length === 0 ? (
                <div className="p-8 text-center text-[rgb(var(--color-text-tertiary))]">
                  <FiMicOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No users currently in voice channels</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgb(var(--color-border))]">
                  {data?.activeVcUsers.map((user) => (
                    <div key={user.userId} className="p-4 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                      <div className="flex items-start gap-3">
                        <img
                          src={getAvatarUrl(user.avatarUrl, user.userId)}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[rgb(var(--color-text-primary))] truncate">
                              {user.username}
                            </span>
                            
                            {/* Status badges */}
                            {user.isBlacklisted ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                                Blacklisted
                              </span>
                            ) : user.isEarning ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
                                <FiZap className="w-3 h-3" />
                                Earning
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">
                                Not Earning
                              </span>
                            )}
                            
                            {user.earningMode === 'advanced' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                                Advanced
                              </span>
                            )}
                            
                            {user.isMuted && (
                              <FiMicOff className="w-4 h-4 text-yellow-400" title="Muted" />
                            )}
                            {user.isDeafened && (
                              <FiVolumeX className="w-4 h-4 text-red-400" title="Deafened" />
                            )}
                          </div>
                          
                          <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                            📍 {user.channelName}
                            {user.categoryName && (
                              <span className="text-[rgb(var(--color-text-tertiary))]"> • {user.categoryName}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                            <span className="flex items-center gap-1">
                              <FiClock />
                              {formatDuration(user.sessionDuration)}
                            </span>
                            <span>
                              {user.settings.minutesPerPoint}min = {user.settings.ozyAmount} {data?.config.currencyName}
                            </span>
                            <span>
                              Min members: {user.settings.minMembers}
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          {user.isEarning && !user.isBlacklisted && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-[rgb(var(--color-text-tertiary))] mb-1">
                                <span>Progress to next reward</span>
                                <span>{user.progress.progressPercent}%</span>
                              </div>
                              <div className="w-full h-2 bg-[rgb(var(--color-bg-primary))] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                                  style={{ width: `${user.progress.progressPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                                <span>
                                  Today: {user.progress.todayEarned}/{user.settings.dailyLimit} {data?.config.currencyName}
                                </span>
                                <span>
                                  Next in: {formatDuration(user.progress.nextRewardIn)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Today's Top Earners */}
            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
              <div className="px-4 py-3 border-b border-[rgb(var(--color-border))]">
                <h2 className="font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                  <FiTrendingUp className="text-yellow-400" />
                  Today's Top Earners
                </h2>
              </div>
              
              <div className="max-h-[250px] overflow-y-auto">
                {data?.todayEarners.length === 0 ? (
                  <div className="p-4 text-center text-[rgb(var(--color-text-tertiary))]">
                    No earnings recorded today
                  </div>
                ) : (
                  <div className="divide-y divide-[rgb(var(--color-border))]">
                    {data?.todayEarners.slice(0, 10).map((earner, index) => (
                      <div key={earner.userId} className="px-4 py-2 flex items-center gap-3">
                        <span className={`w-6 text-center font-bold ${
                          index === 0 ? 'text-yellow-400' : 
                          index === 1 ? 'text-gray-400' : 
                          index === 2 ? 'text-orange-400' : 
                          'text-[rgb(var(--color-text-tertiary))]'
                        }`}>
                          #{index + 1}
                        </span>
                        <img
                          src={getAvatarUrl(earner.avatarUrl, earner.userId, 32)}
                          alt={earner.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="flex-1 truncate text-sm text-[rgb(var(--color-text-primary))]">
                          {earner.username}
                        </span>
                        <span className="text-sm font-medium text-green-400 flex items-center gap-1">
                          +{earner.totalEarned}
                          {getEmojiDisplay(data?.config.currencyEmoji || '🪙', 'w-4 h-4')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Awards */}
            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
              <div className="px-4 py-3 border-b border-[rgb(var(--color-border))]">
                <h2 className="font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                  <FiDollarSign className="text-green-400" />
                  Recent Awards
                </h2>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto">
                {data?.recentAwards.length === 0 ? (
                  <div className="p-4 text-center text-[rgb(var(--color-text-tertiary))]">
                    No recent awards
                  </div>
                ) : (
                  <div className="divide-y divide-[rgb(var(--color-border))]">
                    {data?.recentAwards.slice(0, 20).map((award, index) => (
                      <div key={`${award.userId}-${award.createdAt}-${index}`} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={getAvatarUrl(award.avatarUrl, award.userId, 24)}
                            alt={award.username}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm text-[rgb(var(--color-text-primary))] truncate flex-1">
                            {award.username}
                          </span>
                          <span className={`text-sm font-medium ${
                            award.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {award.amount > 0 ? '+' : ''}{award.amount}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-[rgb(var(--color-text-tertiary))] mt-1 ml-7">
                          <span className="truncate max-w-[150px]">{award.reason}</span>
                          <span>{formatTimeAgo(award.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category Rewards (if advanced mode) */}
            {data?.advancedMode && data?.categoryRewards.length > 0 && (
              <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
                <div className="px-4 py-3 border-b border-[rgb(var(--color-border))]">
                  <h2 className="font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                    <FiLayers className="text-purple-400" />
                    Category Rewards
                  </h2>
                </div>
                
                <div className="max-h-[200px] overflow-y-auto">
                  <div className="divide-y divide-[rgb(var(--color-border))]">
                    {data?.categoryRewards.map((cat) => (
                      <div key={cat.categoryId} className="px-4 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[rgb(var(--color-text-primary))]">
                            {cat.categoryName || cat.categoryId}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            cat.vcEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {cat.vcEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        {cat.vcEnabled && (
                          <div className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                            {cat.vcMinutesPerPoint}min = {cat.vcOzyAmount} {data?.config.currencyName} • 
                            Min: {cat.vcMinMembers} • Cap: {cat.vcDailyLimit}/day
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Config Summary */}
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] p-4">
          <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-3">Current Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-[rgb(var(--color-text-tertiary))]">Currency:</span>
              <p className="text-[rgb(var(--color-text-primary))] flex items-center gap-1">
                {getEmojiDisplay(data?.config.currencyEmoji || '🪙', 'w-4 h-4')}
                {data?.config.currencyName}
              </p>
            </div>
            <div>
              <span className="text-[rgb(var(--color-text-tertiary))]">VC Rate:</span>
              <p className="text-[rgb(var(--color-text-primary))]">
                {data?.config.minutesPerPoint}min = {data?.config.vcOzyAmount} {data?.config.currencyName}
              </p>
            </div>
            <div>
              <span className="text-[rgb(var(--color-text-tertiary))]">VC Daily Cap:</span>
              <p className="text-[rgb(var(--color-text-primary))]">{data?.config.dailyVoiceCap}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--color-text-tertiary))]">Min Members:</span>
              <p className="text-[rgb(var(--color-text-primary))]">{data?.config.requireTwoMembers}</p>
            </div>
            <div>
              <span className="text-[rgb(var(--color-text-tertiary))]">Msg Rate:</span>
              <p className="text-[rgb(var(--color-text-primary))]">
                {data?.config.messagesPerPoint}msg = {data?.config.msgOzyAmount} {data?.config.currencyName}
              </p>
            </div>
            <div>
              <span className="text-[rgb(var(--color-text-tertiary))]">Msg Daily Cap:</span>
              <p className="text-[rgb(var(--color-text-primary))]">{data?.config.dailyMessageCap}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
