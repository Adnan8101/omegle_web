'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiUser, FiDollarSign, FiMic, FiMessageSquare, FiTrendingUp, FiClock, FiAward } from 'react-icons/fi';

interface UserStats {
  economy: {
    coins: number;
    rank: number;
    totalUsers: number;
  };
  voiceChannel: {
    totalTime: number;
    sessions: Array<{
      id: string;
      channelName: string;
      joinedAt: string;
      leftAt: string | null;
      duration: number;
      peakMemberCount: number;
      messagesSent: number;
      muteCount: number;
      unmuteCount: number;
      deafCount: number;
      undeafCount: number;
    }>;
    stats: {
      totalSessions: number;
      uniqueChannels: number;
      avgDuration: number;
      longestSession: number;
      totalMutes: number;
      totalUnmutes: number;
    };
  };
  chatStats: {
    totalMessages: number;
    uniqueChannels: number;
    recentMessages: Array<{
      id: string;
      content: string;
      channelName: string;
      timestamp: string;
      inVoiceChat: boolean;
      contentLength: number;
    }>;
  };
  liveTracking: {
    currentVc: string | null;
    currentStatus: string;
    coinsEarnedToday: number;
    vcTimeToday: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'economy' | 'voice' | 'chat'>('overview');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUserStats();
      // Refresh stats every 30 seconds for live tracking
      const interval = setInterval(fetchUserStats, 30000);
      return () => clearInterval(interval);
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, session]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/profile/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading your profile...</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20">
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omegle Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
              Your Profile
            </h1>
            <p className="text-[rgb(var(--color-text-secondary))]">
              Sign in to view your stats and activity
            </p>
          </div>

          <div className="glass-blue rounded-2xl p-8 border border-blue-500/20">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-blue-500/10 rounded-full">
                <FiUser className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <button
              onClick={() => signIn('discord', { callbackUrl: '/profile' })}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
              </svg>
              Sign in with Discord
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {session?.user?.image && (
              <Image
                src={session.user.image}
                alt="Profile"
                width={64}
                height={64}
                className="rounded-full border-2 border-blue-500"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">
                {session?.user?.name || 'User'}
              </h1>
              <p className="text-[rgb(var(--color-text-secondary))]">
                Your Omeglee Statistics
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Live Status Banner */}
        {stats?.liveTracking && (
          <div className="glass-blue rounded-xl p-6 mb-6 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[rgb(var(--color-text-secondary))]">
                    {stats.liveTracking.currentVc ? `In ${stats.liveTracking.currentVc}` : 'Offline'}
                  </span>
                </div>
                <div className="text-sm text-[rgb(var(--color-text-tertiary))]">
                  {stats.liveTracking.currentStatus}
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {formatNumber(stats.liveTracking.coinsEarnedToday)}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">Coins Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {formatDuration(stats.liveTracking.vcTimeToday)}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">VC Time Today</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: FiUser },
            { id: 'economy', label: 'Economy', icon: FiDollarSign },
            { id: 'voice', label: 'Voice Activity', icon: FiMic },
            { id: 'chat', label: 'Chat History', icon: FiMessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Economy Card */}
            <div className="glass-blue rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <FiDollarSign className="w-6 h-6 text-yellow-500" />
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Economy</h3>
              </div>
              <div className="text-3xl font-bold text-yellow-500 mb-2">
                {formatNumber(stats.economy.coins)}
              </div>
              <div className="text-sm text-[rgb(var(--color-text-tertiary))]">
                Rank #{stats.economy.rank} of {formatNumber(stats.economy.totalUsers)}
              </div>
            </div>

            {/* Voice Time Card */}
            <div className="glass-blue rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <FiMic className="w-6 h-6 text-purple-500" />
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Voice Time</h3>
              </div>
              <div className="text-3xl font-bold text-purple-500 mb-2">
                {formatDuration(stats.voiceChannel.totalTime)}
              </div>
              <div className="text-sm text-[rgb(var(--color-text-tertiary))]">
                {stats.voiceChannel.sessions.length} sessions
              </div>
            </div>

            {/* Chat Stats Card */}
            <div className="glass-blue rounded-xl p-6 border border-green-500/20">
              <div className="flex items-center gap-3 mb-4">
                <FiMessageSquare className="w-6 h-6 text-green-500" />
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Messages</h3>
              </div>
              <div className="text-3xl font-bold text-green-500 mb-2">
                {formatNumber(stats.chatStats.totalMessages)}
              </div>
              <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Total messages sent</div>
            </div>

            {/* Activity Card */}
            <div className="glass-blue rounded-xl p-6 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-4">
                <FiTrendingUp className="w-6 h-6 text-orange-500" />
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Activity</h3>
              </div>
              <div className="text-3xl font-bold text-orange-500 mb-2">
                Active
              </div>
              <div className="text-sm text-[rgb(var(--color-text-tertiary))]">
                Last seen recently
              </div>
            </div>
          </div>
        )}

        {activeTab === 'economy' && stats && (
          <div className="space-y-6">
            {/* Economy Overview */}
            <div className="glass-blue rounded-xl p-8 border border-yellow-500/20">
              <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-6">
                Your Economy Stats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2">Total Coins</div>
                  <div className="text-4xl font-bold text-yellow-500">
                    {formatNumber(stats.economy.coins)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2">Your Rank</div>
                  <div className="text-4xl font-bold text-blue-500">
                    #{stats.economy.rank}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2">Total Users</div>
                  <div className="text-4xl font-bold text-purple-500">
                    {formatNumber(stats.economy.totalUsers)}
                  </div>
                </div>
              </div>
            </div>

            {/* Earning Sources */}
            <div className="glass-blue rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">
                Earning Sources
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg">
                  <span className="text-[rgb(var(--color-text-secondary))]">Voice Channel Time</span>
                  <span className="text-green-500 font-semibold">Active</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg">
                  <span className="text-[rgb(var(--color-text-secondary))]">Chat Messages</span>
                  <span className="text-green-500 font-semibold">Active</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg">
                  <span className="text-[rgb(var(--color-text-secondary))]">Daily Bonus</span>
                  <span className="text-yellow-500 font-semibold">Available</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'voice' && stats && (
          <div className="space-y-6">
            {/* Voice Stats Overview */}
            <div className="glass-blue rounded-xl p-6 border border-purple-500/20">
              <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-4">
                Voice Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg">
                  <FiClock className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Total Time</div>
                    <div className="text-2xl font-bold text-purple-500">
                      {formatDuration(stats.voiceChannel.totalTime)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg">
                  <FiAward className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Sessions</div>
                    <div className="text-2xl font-bold text-blue-500">
                      {stats.voiceChannel.stats.totalSessions}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg">
                  <FiMic className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Avg Duration</div>
                    <div className="text-2xl font-bold text-green-500">
                      {formatDuration(stats.voiceChannel.stats.avgDuration)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-500">{stats.voiceChannel.stats.uniqueChannels}</div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">Unique Channels</div>
                </div>
                <div className="p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                  <div className="text-2xl font-bold text-cyan-500">{formatDuration(stats.voiceChannel.stats.longestSession)}</div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">Longest Session</div>
                </div>
                <div className="p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-400">{stats.voiceChannel.stats.totalMutes}</div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">Total Mutes</div>
                </div>
                <div className="p-3 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.voiceChannel.stats.totalUnmutes}</div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">Total Unmutes</div>
                </div>
              </div>

              {/* Session Details */}
              <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-3">
                Session History
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.voiceChannel.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg hover:bg-[rgb(var(--color-hover))] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-[rgb(var(--color-text-primary))] mb-1">
                          {session.channelName}
                        </div>
                        <div className="text-sm text-[rgb(var(--color-text-tertiary))]">
                          {new Date(session.joinedAt).toLocaleString()}
                          {session.leftAt && ` - ${new Date(session.leftAt).toLocaleTimeString()}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-500 font-semibold text-lg">
                          {formatDuration(session.duration)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1 text-[rgb(var(--color-text-tertiary))]">
                        <FiUsers className="w-3 h-3" />
                        <span>Peak: {session.peakMemberCount} members</span>
                      </div>
                      <div className="flex items-center gap-1 text-[rgb(var(--color-text-tertiary))]">
                        <FiMessageSquare className="w-3 h-3" />
                        <span>{session.messagesSent} messages</span>
                      </div>
                      {session.muteCount > 0 && (
                        <div className="flex items-center gap-1 text-red-400">
                          <span>🔇 {session.muteCount} mutes</span>
                        </div>
                      )}
                      {session.unmuteCount > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <span>🔊 {session.unmuteCount} unmutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {stats.voiceChannel.sessions.length === 0 && (
                  <div className="text-center py-8 text-[rgb(var(--color-text-tertiary))]">
                    No voice sessions yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && stats && (
          <div className="glass-blue rounded-xl p-6 border border-green-500/20">
            <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-4">
              Chat Activity
            </h2>
            
            {/* Chat Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                <div className="text-4xl font-bold text-green-500">
                  {formatNumber(stats.chatStats.totalMessages)}
                </div>
                <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Total Messages</div>
              </div>
              <div className="p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                <div className="text-4xl font-bold text-blue-500">
                  {stats.chatStats.uniqueChannels}
                </div>
                <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Unique Channels</div>
              </div>
              <div className="p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg text-center">
                <div className="text-4xl font-bold text-purple-500">
                  {stats.chatStats.recentMessages.filter(m => m.inVoiceChat).length}
                </div>
                <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Messages in VC</div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-3">
              Recent Messages
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {stats.chatStats.recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 bg-[rgb(var(--color-bg-secondary))] rounded-lg hover:bg-[rgb(var(--color-hover))] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-blue-500">#{message.channelName}</div>
                      {message.inVoiceChat && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                          In VC
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[rgb(var(--color-text-tertiary))]">
                      {new Date(message.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[rgb(var(--color-text-primary))] break-words">
                    {message.content}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                    {message.contentLength} characters
                  </div>
                </div>
              ))}
              {stats.chatStats.recentMessages.length === 0 && (
                <div className="text-center py-8 text-[rgb(var(--color-text-tertiary))]">
                  No messages yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
