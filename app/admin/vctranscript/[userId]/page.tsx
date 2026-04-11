'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import SessionModal from '@/components/SessionModal';
import SharedSessionsModal from '@/components/SharedSessionsModal';
import Image from 'next/image';
import {
  FiUsers, FiClock, FiMessageSquare, FiMic, FiTrendingUp, FiActivity,
  FiHash, FiArrowRight, FiHeart, FiRefreshCw, FiChevronLeft
} from 'react-icons/fi';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DateRangeFilter from '@/components/DateRangeFilter';

// Build avatar URL from hash (handles both hash and legacy full URLs)
function buildAvatarUrl(userId: string, avatarHash: string | null, size: number = 128): string {
  if (avatarHash) {
    // Check if it's already a full URL (legacy data)
    if (avatarHash.startsWith('https://cdn.discordapp.com/')) {
      if (avatarHash.includes('?size=')) {
        return avatarHash.replace(/\?size=\d+/, `?size=${size}`);
      }
      return avatarHash;
    }
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }

  if (!/^\d+$/.test(userId)) {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }

  let defaultIndex = 0;
  try {
    defaultIndex = Number(BigInt(userId) >> 22n) % 6;
  } catch {
    defaultIndex = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

interface VCStats {
  total_sessions: number;
  total_duration: number;
  unique_channels: number;
  total_rejoins: number;
  total_messages: number;
  avg_session_duration: number;
  longest_session: number;
  shortest_session: number;
  total_mutes: number;
  total_unmutes: number;
  total_deafs: number;
  total_undeafs: number;
  total_video_ons: number;
  total_video_offs: number;
  total_screen_shares: number;
}

interface VCSession {
  id: string;
  channel_id: string;
  channel_name: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number;
  peak_member_count: number;
  messages_sent: number;
}

interface ChatStats {
  total_messages: number;
  unique_channels: number;
  total_characters: number;
  messages_in_vc: number;
  unique_reply_targets: number;
  messages_with_mentions: number;
}

interface VoiceUserStats {
  total_time_in_vc: number;
  total_time_speaking: number;
  total_time_muted: number;
  total_time_deafened: number;
  total_time_listening: number;
  total_sessions: number;
  last_joined_at: string;
}

interface MutualsData {
  vcMutuals: Array<{
    target_user_id: string;
    mutual_vc_sessions: number;
    mutual_vc_duration: number;
    last_interaction: string;
  }>;
  chatMutuals: Array<{
    target_user_id: string;
    messages_to_target: number;
    mention_count: number;
    messages_in_same_channel: number;
    last_interaction: string;
  }>;
  sharedChannels: Array<{
    other_user_id: string;
    channel_id: string;
    channel_name: string;
    overlap_count: number;
    overlap_seconds: number;
  }>;
}

interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  inGuild: boolean;
}

interface TranscriptData {
  userId: string;
  vcStats: VCStats;
  vcSessions: VCSession[];
  chatStats: ChatStats;
  interactions: any[];
  voiceUserStats: VoiceUserStats | null;
}

const emptyVCStats: VCStats = {
  total_sessions: 0, total_duration: 0, unique_channels: 0, total_rejoins: 0,
  total_messages: 0, avg_session_duration: 0, longest_session: 0, shortest_session: 0,
  total_mutes: 0, total_unmutes: 0, total_deafs: 0, total_undeafs: 0,
  total_video_ons: 0, total_video_offs: 0, total_screen_shares: 0,
};

const emptyChatStats: ChatStats = {
  total_messages: 0, unique_channels: 0, total_characters: 0,
  messages_in_vc: 0, unique_reply_targets: 0, messages_with_mentions: 0,
};

type ActiveTab = 'overview' | 'sessions' | 'mutuals';

export default function UserTranscriptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userIdParam = params?.userId;
  const userId = typeof userIdParam === 'string' ? userIdParam.trim() : '';
  const hasValidUserId = /^\d{5,25}$/.test(userId);

  const [data, setData] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalidUserId, setInvalidUserId] = useState(false);
  const [hasDbError, setHasDbError] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [channelNames, setChannelNames] = useState<Map<string, string>>(new Map());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Mutuals state
  const [mutualsData, setMutualsData] = useState<MutualsData | null>(null);
  const [mutualsUsers, setMutualsUsers] = useState<Map<string, DiscordUser>>(new Map());
  const [mutualsLoading, setMutualsLoading] = useState(false);
  const [mutualsSubTab, setMutualsSubTab] = useState<'vc' | 'chat' | 'channels'>('vc');

  // Chat channel breakdown state
  const [chatChannelData, setChatChannelData] = useState<any[]>([]);

  // Manual refresh state
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Shared sessions modal state
  const [sharedSessionsUserId, setSharedSessionsUserId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });

  const refreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchData(false);
      if (mutualsData) {
        setMutualsData(null); // Force re-fetch on next tab switch
      }
    } finally {
      setIsRefreshing(false);
      setLastRefreshed(new Date());
    }
  }, [isRefreshing, mutualsData]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setIsRedirecting(true);
      router.replace('/admin');
      return;
    }
    
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      // User transcript accessible to: Full Access, Moderator, or Trail Mod/View Only
      const canAccess = perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasViewOnlyAccess;
      
      if (!canAccess) {
        setHasPermission(false);
        // Redirect to appropriate page based on permissions
        if (perms?.hasCasinoAccess) {
          setIsRedirecting(true);
          router.replace('/admin/casino');
        } else {
          setIsRedirecting(true);
          router.replace('/admin');
        }
        return;
      }
      
      setHasPermission(true);
      if (!hasValidUserId) {
        setInvalidUserId(true);
        setLoading(false);
        return;
      }

      setInvalidUserId(false);
      fetchData();
    }
  }, [status, session, router, hasValidUserId]);

  const fetchData = async (silent = false, range?: { startDate: string | null; endDate: string | null }) => {
    if (!hasValidUserId) {
      if (!silent) setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const dateParams = new URLSearchParams();
      const effectiveRange = range || dateRange;
      if (effectiveRange.startDate) dateParams.set('startDate', effectiveRange.startDate);
      if (effectiveRange.endDate) dateParams.set('endDate', effectiveRange.endDate);
      const dateSuffix = dateParams.toString() ? `?${dateParams}` : '';

      const [response, cachedUserRes, chatChRes] = await Promise.all([
        fetch(`/api/vctranscript/${userId}${dateSuffix}`),
        fetch('/api/discord/cached-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [userId] }),
        }),
        fetch(`/api/vctranscript/chat-channels/${userId}${dateSuffix}`),
      ]);

      const result = await response.json();

      // Try cached user first
      let userData: any = null;
      try {
        const cachedData = await cachedUserRes.json();
        if (cachedData.users?.[userId]) {
          userData = cachedData.users[userId];
        }
      } catch { }

      // Fallback to Discord API
      if (!userData) {
        const userResponse = await fetch(`/api/discord/user/${userId}`);
        userData = await userResponse.json();
      }

      setDiscordUser(userData);

      // Parse chat channel breakdown
      try {
        const chatChData = await chatChRes.json();
        if (chatChData.channels) {
          setChatChannelData(chatChData.channels);
        }
      } catch { }

      if (result._error) setHasDbError(true);

      // Calculate duration for active sessions (left_at is null)
      const processedSessions = (result.vcSessions || []).map((session: VCSession) => {
        if (!session.left_at && session.joined_at) {
          const now = new Date();
          const joined = new Date(session.joined_at);
          const durationSeconds = Math.floor((now.getTime() - joined.getTime()) / 1000);
          return { ...session, duration_seconds: durationSeconds };
        }
        return session;
      });

      const transcriptData: TranscriptData = {
        userId: result.userId || userId,
        vcStats: result.vcStats || emptyVCStats,
        vcSessions: processedSessions,
        chatStats: result.chatStats || emptyChatStats,
        interactions: result.interactions || [],
        voiceUserStats: result.voiceUserStats || null,
      };
      setData(transcriptData);

      // Resolve channel names for all unique channel IDs
      if (transcriptData.vcSessions.length > 0) {
        const uniqueChannelIds = [...new Set(transcriptData.vcSessions.map(s => s.channel_id))];

        const knownNames = new Map<string, string>();
        transcriptData.vcSessions.forEach(s => {
          if (s.channel_name && s.channel_name !== s.channel_id) {
            knownNames.set(s.channel_id, s.channel_name);
          }
        });

        // Fetch ALL channel names from bot's channel cache (persistent DB, not Discord API)
        const unknownIds = uniqueChannelIds.filter(id => !knownNames.has(id));
        if (unknownIds.length > 0) {
          try {
            const channelRes = await fetch('/api/discord/cached-channels', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channelIds: unknownIds }),
            });
            const channelResult = await channelRes.json();
            if (channelResult.channels) {
              Object.entries(channelResult.channels).forEach(([id, ch]: [string, any]) => {
                knownNames.set(id, ch.name || id);
              });
            }
          } catch { }

          // Fallback: try Discord API for any still-unresolved channels
          const stillUnknown = unknownIds.filter(id => !knownNames.has(id));
          if (stillUnknown.length > 0) {
            try {
              const channelRes = await fetch('/api/discord/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelIds: stillUnknown }),
              });
              const channelResult = await channelRes.json();
              if (channelResult.channels) {
                Object.entries(channelResult.channels).forEach(([id, ch]: [string, any]) => {
                  if (ch.name && ch.name !== 'Deleted Channel') {
                    knownNames.set(id, ch.name);
                  }
                });
              }
            } catch { }
          }
        }
        setChannelNames(knownNames);

        const channelStats = transcriptData.vcSessions.reduce((acc: any, s: VCSession) => {
          const channelId = s.channel_id;
          if (!acc[channelId]) {
            acc[channelId] = {
              channel_id: channelId,
              channel_name: knownNames.get(channelId) || s.channel_name || channelId,
              sessions: 0, total_duration: 0, messages: 0,
            };
          }
          acc[channelId].sessions += 1;
          acc[channelId].total_duration += s.duration_seconds || 0;
          acc[channelId].messages += s.messages_sent || 0;
          return acc;
        }, {});
        setChannelData(Object.values(channelStats).sort((a: any, b: any) => b.total_duration - a.total_duration));
      }
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      if (!silent) {
        setData({ userId, vcStats: emptyVCStats, vcSessions: [], chatStats: emptyChatStats, interactions: [], voiceUserStats: null });
        setHasDbError(true);
      }
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  const fetchMutuals = async () => {
    if (!hasValidUserId) return;
    if (mutualsData) return;
    setMutualsLoading(true);
    try {
      const res = await fetch(`/api/vctranscript/mutuals/${userId}`);
      const result = await res.json();
      setMutualsData(result);

      // Use server-side resolved users first (returned by the mutuals API)
      if (result.resolvedUsers && Object.keys(result.resolvedUsers).length > 0) {
        setMutualsUsers(new Map(Object.entries(result.resolvedUsers)));
      } else {
        // Fallback: collect all user IDs and resolve client-side
        const userIds = new Set<string>();
        (result.vcMutuals || []).forEach((m: any) => userIds.add(m.target_user_id));
        (result.chatMutuals || []).forEach((m: any) => userIds.add(m.target_user_id));
        (result.sharedChannels || []).forEach((m: any) => userIds.add(m.other_user_id));

        if (userIds.size > 0) {
          try {
            const cachedRes = await fetch('/api/discord/cached-users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds: [...userIds] }),
            });
            const cachedData = await cachedRes.json();
            if (cachedData.users && Object.keys(cachedData.users).length > 0) {
              setMutualsUsers(new Map(Object.entries(cachedData.users)));
            }
          } catch { }
        }
      }
    } catch (error) {
      console.error('Error fetching mutuals:', error);
    } finally {
      setMutualsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mutuals' && !mutualsData) {
      fetchMutuals();
    }
  }, [activeTab]);

  const getChannelName = (channelId: string, fallbackName?: string) => {
    return channelNames.get(channelId) || fallbackName || channelId;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getUserDisplay = (userId: string) => {
    const user = mutualsUsers.get(userId);
    return {
      name: user?.displayName || 'Unknown User',
      avatar: user?.avatar || buildAvatarUrl(userId, null, 128),
      username: user?.username || 'unknown',
      inGuild: user?.inGuild ?? false,
    };
  };

  const hourlyActivity = data?.vcSessions.reduce((acc: any, s: VCSession) => {
    const hour = new Date(s.joined_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {}) || {};
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, sessions: hourlyActivity[i] || 0 }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316'];

  // Show loading state while checking auth/permissions
  if (status === 'loading' || hasPermission === null || isRedirecting) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (hasPermission === false) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-4">
        <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="text-red-500 text-5xl">❌</div>
            <div>
              <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                Access Denied
              </h2>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                You do not have permission to access User Transcripts.
              </p>
            </div>
            <button
              onClick={() => {
                const perms = session?.user?.permissions;
                if (perms?.hasCasinoAccess) {
                  router.replace('/admin/casino');
                } else {
                  router.replace('/admin');
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (invalidUserId) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-4">
        <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="text-yellow-500 text-5xl">⚠️</div>
            <div>
              <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                Invalid User ID
              </h2>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                This transcript link is invalid. Please open a user from the transcript list.
              </p>
            </div>
            <button
              onClick={() => router.replace('/admin/vctranscript')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Transcripts
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-pulse">
            <div className="h-5 w-32 bg-[rgb(var(--color-bg-tertiary))] rounded mb-4"></div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[rgb(var(--color-bg-tertiary))]"></div>
              <div>
                <div className="h-10 w-64 bg-[rgb(var(--color-bg-tertiary))] rounded mb-2"></div>
                <div className="h-5 w-48 bg-[rgb(var(--color-bg-tertiary))] rounded"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-6 border border-[rgb(var(--color-border))] animate-pulse">
                <div className="h-4 w-24 bg-[rgb(var(--color-bg-tertiary))] rounded mb-3"></div>
                <div className="h-8 w-16 bg-[rgb(var(--color-bg-tertiary))] rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasNoData = !data || (
    Number(data.vcStats.total_sessions) === 0 &&
    data.vcSessions.length === 0 &&
    Number(data.chatStats.total_messages) === 0
  );

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/vctranscript" className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-4 transition-colors">
            <FiChevronLeft className="w-5 h-5" />
            Back to Users
          </Link>
          <DateRangeFilter onChange={(r) => { setDateRange(r); setMutualsData(null); fetchData(false, r); }} initialRange={dateRange} className="mb-4" />

          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-blue-500/30 flex-shrink-0">
              <Image
                src={discordUser?.avatar || buildAvatarUrl(userId, null, 256)}
                alt={discordUser?.displayName || 'User'}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[rgb(var(--color-text-primary))]">
                {discordUser?.displayName || `User ${userId}`}
              </h1>
              <p className="text-lg text-[rgb(var(--color-text-secondary))]">
                @{discordUser?.username || 'unknown'}
                {discordUser?.inGuild ? (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">✓ Server Member</span>
                ) : (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">Not in Server</span>
                )}
              </p>
              <p className="text-[rgb(var(--color-text-tertiary))] text-sm mt-1">User ID: {userId}</p>
            </div>
            {/* Manual refresh button */}
            <div className="ml-auto flex items-center gap-3 self-center">
              {lastRefreshed && (
                <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                  <span className="text-[10px] opacity-60">
                    Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <FiRefreshCw className={`w-4 h-4 text-[rgb(var(--color-text-tertiary))] ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {hasDbError && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <span className="text-yellow-500 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">Database Connection Issue</p>
              <p className="text-yellow-600/70 dark:text-yellow-400/70 text-xs mt-1">Could not connect to the bot database.</p>
            </div>
          </div>
        )}

        {hasNoData ? (
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-12 text-center border border-[rgb(var(--color-border))]">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[rgb(var(--color-bg-tertiary))] rounded-full mb-4">
              <FiMessageSquare className="w-8 h-8 text-[rgb(var(--color-text-tertiary))]" />
            </div>
            <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No Activity Found</h2>
            <p className="text-[rgb(var(--color-text-secondary))]">This user has no recorded voice channel activity or chat messages.</p>
          </div>
        ) : (
          <>
            {/* Primary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <TopStatCard title="Total Sessions" value={Number(data?.vcStats.total_sessions)?.toString() || '0'} icon={<FiMic className="w-6 h-6 text-blue-500" />} />
              <TopStatCard title="Total Time" value={formatDuration(Number(data?.vcStats.total_duration) || 0)} icon={<FiClock className="w-6 h-6 text-purple-500" />} />
              <TopStatCard title="Channels" value={Number(data?.vcStats.unique_channels)?.toString() || '0'} icon={<FiHash className="w-6 h-6 text-green-500" />} />
              <TopStatCard title="Messages" value={Number(data?.chatStats?.total_messages)?.toLocaleString() || '0'} icon={<FiMessageSquare className="w-6 h-6 text-orange-500" />} />
            </div>

            {/* Voice Activity Stats */}
            {data?.voiceUserStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {(() => {
                  const stats = data.voiceUserStats;
                  const totalTime = stats.total_time_in_vc || 0;
                  const speakingTime = stats.total_time_speaking || 0;
                  const mutedTime = stats.total_time_muted || 0;
                  const deafenedTime = stats.total_time_deafened || 0;
                  const listeningTime = stats.total_time_listening || 0;
                  
                  const speakingPercent = totalTime > 0 ? ((speakingTime / totalTime) * 100).toFixed(1) : '0.0';
                  const mutedPercent = totalTime > 0 ? ((mutedTime / totalTime) * 100).toFixed(1) : '0.0';
                  const deafPercent = totalTime > 0 ? ((deafenedTime / totalTime) * 100).toFixed(1) : '0.0';
                  const listeningPercent = totalTime > 0 ? ((listeningTime / totalTime) * 100).toFixed(1) : '0.0';

                  return (
                    <>
                      <VoiceActivityCard 
                        title="Speaking Time" 
                        duration={speakingTime}
                        percent={speakingPercent}
                        icon={<FiMic className="w-5 h-5 text-green-400" />}
                        color="green"
                      />
                      <VoiceActivityCard 
                        title="Muted Time" 
                        duration={mutedTime}
                        percent={mutedPercent}
                        icon={<FiActivity className="w-5 h-5 text-gray-400" />}
                        color="gray"
                      />
                      <VoiceActivityCard 
                        title="Deafened Time" 
                        duration={deafenedTime}
                        percent={deafPercent}
                        icon={<FiUsers className="w-5 h-5 text-red-400" />}
                        color="red"
                      />
                      <VoiceActivityCard 
                        title="Active Listening" 
                        duration={listeningTime}
                        percent={listeningPercent}
                        icon={<FiTrendingUp className="w-5 h-5 text-blue-400" />}
                        color="blue"
                      />
                    </>
                  );
                })()}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-[rgb(var(--color-border))] mb-8 overflow-x-auto">
              {([
                { key: 'overview' as const, label: 'Overview', desc: 'Stats & Charts', icon: <FiTrendingUp className="w-4 h-4" /> },
                { key: 'sessions' as const, label: 'Sessions', desc: `${data?.vcSessions.length || 0} sessions`, icon: <FiMic className="w-4 h-4" /> },
                { key: 'mutuals' as const, label: 'Mutuals Relation', desc: 'VC & Chat mutuals', icon: <FiHeart className="w-4 h-4" /> },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.key
                    ? 'text-blue-500'
                    : 'text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))]'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className="ml-1 text-xs opacity-60">{tab.desc}</span>
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === 'overview' && (
              <>
                {/* Voice Activity Stats with Pie Chart */}
                {data?.voiceUserStats && (
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Voice Activity Breakdown</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Pie Chart */}
                      <div className="flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={(() => {
                                const stats = data.voiceUserStats;
                                const totalTime = stats.total_time_in_vc || 0;
                                return [
                                  { name: 'Speaking', value: stats.total_time_speaking || 0, color: '#10b981' },
                                  { name: 'Muted', value: stats.total_time_muted || 0, color: '#6b7280' },
                                  { name: 'Deafened', value: stats.total_time_deafened || 0, color: '#ef4444' },
                                  { name: 'Active Listening', value: stats.total_time_listening || 0, color: '#3b82f6' },
                                ].filter(item => item.value > 0);
                              })()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                            >
                              {[
                                { name: 'Speaking', value: data.voiceUserStats.total_time_speaking || 0, color: '#10b981' },
                                { name: 'Muted', value: data.voiceUserStats.total_time_muted || 0, color: '#6b7280' },
                                { name: 'Deafened', value: data.voiceUserStats.total_time_deafened || 0, color: '#ef4444' },
                                { name: 'Active Listening', value: data.voiceUserStats.total_time_listening || 0, color: '#3b82f6' },
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgb(var(--color-bg-tertiary))',
                                border: '1px solid rgb(var(--color-border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number | undefined) => {
                                if (!value) return '0s';
                                const hours = Math.floor(value / 3600);
                                const minutes = Math.floor((value % 3600) / 60);
                                const seconds = value % 60;
                                if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                                if (minutes > 0) return `${minutes}m ${seconds}s`;
                                return `${seconds}s`;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {(() => {
                          const stats = data.voiceUserStats;
                          const totalTime = stats.total_time_in_vc || 0;
                          const speakingTime = stats.total_time_speaking || 0;
                          const mutedTime = stats.total_time_muted || 0;
                          const deafenedTime = stats.total_time_deafened || 0;
                          const listeningTime = stats.total_time_listening || 0;
                          
                          const speakingPercent = totalTime > 0 ? ((speakingTime / totalTime) * 100).toFixed(1) : '0.0';
                          const mutedPercent = totalTime > 0 ? ((mutedTime / totalTime) * 100).toFixed(1) : '0.0';
                          const deafPercent = totalTime > 0 ? ((deafenedTime / totalTime) * 100).toFixed(1) : '0.0';
                          const listeningPercent = totalTime > 0 ? ((listeningTime / totalTime) * 100).toFixed(1) : '0.0';

                          const formatActivityDuration = (seconds: number) => {
                            if (!seconds) return '0m';
                            const hours = Math.floor(seconds / 3600);
                            const minutes = Math.floor((seconds % 3600) / 60);
                            const secs = seconds % 60;
                            if (hours > 0) return `${hours}h ${minutes}m`;
                            if (minutes > 0) return `${minutes}m`;
                            return `${secs}s`;
                          };

                          return (
                            <>
                              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FiMic className="w-5 h-5 text-green-400" />
                                  <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Speaking</span>
                                </div>
                                <p className="text-2xl font-bold text-green-400 mb-1">{formatActivityDuration(speakingTime)}</p>
                                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{speakingPercent}%</p>
                              </div>
                              <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border border-gray-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FiActivity className="w-5 h-5 text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Muted</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-400 mb-1">{formatActivityDuration(mutedTime)}</p>
                                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{mutedPercent}%</p>
                              </div>
                              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FiUsers className="w-5 h-5 text-red-400" />
                                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Deafened</span>
                                </div>
                                <p className="text-2xl font-bold text-red-400 mb-1">{formatActivityDuration(deafenedTime)}</p>
                                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{deafPercent}%</p>
                              </div>
                              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FiTrendingUp className="w-5 h-5 text-blue-400" />
                                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Listening</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-400 mb-1">{formatActivityDuration(listeningTime)}</p>
                                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{listeningPercent}%</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                    <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                      <FiActivity className="w-5 h-5 text-blue-500" /> Activity by Hour
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--color-bg-tertiary))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px' }} />
                        <Bar dataKey="sessions" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                    <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                      <FiTrendingUp className="w-5 h-5 text-purple-500" /> Top Voice Channels
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={channelData.slice(0, 6)} cx="50%" cy="50%" labelLine={false}
                          label={(entry: any) => `${entry.channel_name}: ${entry.sessions}`}
                          outerRadius={90} fill="#8884d8" dataKey="sessions">
                          {channelData.slice(0, 6).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--color-bg-tertiary))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
                  <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Activity Metrics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <MetricItem label="Mutes" value={data?.vcStats.total_mutes} />
                    <MetricItem label="Unmutes" value={data?.vcStats.total_unmutes} />
                    <MetricItem label="Deafens" value={data?.vcStats.total_deafs} />
                    <MetricItem label="Undeafens" value={data?.vcStats.total_undeafs} />
                    <MetricItem label="Video Ons" value={data?.vcStats.total_video_ons} />
                    <MetricItem label="Video Offs" value={data?.vcStats.total_video_offs} />
                    <MetricItem label="Screen Shares" value={data?.vcStats.total_screen_shares} />
                    <MetricItem label="Rejoins" value={data?.vcStats.total_rejoins} />
                    <MetricItem label="Avg Session" value={formatDuration(Math.round(Number(data?.vcStats.avg_session_duration) || 0))} />
                    <MetricItem label="Longest Session" value={formatDuration(Number(data?.vcStats.longest_session) || 0)} />
                  </div>
                </div>

                {Number(data?.chatStats.total_messages) > 0 && (
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Chat Activity</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <MetricItem label="Total Messages" value={data?.chatStats.total_messages} />
                      <MetricItem label="Unique Channels" value={data?.chatStats.unique_channels} />
                      <MetricItem label="Total Characters" value={data?.chatStats.total_characters} />
                      <MetricItem label="Messages in VC" value={data?.chatStats.messages_in_vc} />
                      <MetricItem label="Users Replied To" value={data?.chatStats.unique_reply_targets} />
                      <MetricItem label="Msgs w/ @Mentions" value={data?.chatStats.messages_with_mentions} />
                    </div>
                  </div>
                )}

                {channelData.length > 0 && (
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-6 flex items-center gap-2">
                      <FiMic className="w-6 h-6 text-blue-500" /> Voice Channel Breakdown
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Channel</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Total Time</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Messages</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Avg Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--color-border))]">
                          {channelData.map((channel: any) => (
                            <tr key={channel.channel_id} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-[rgb(var(--color-text-primary))]">
                                <span className="flex items-center gap-2">
                                  <FiHash className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                                  {channel.channel_name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{channel.sessions}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-[rgb(var(--color-text-primary))]">{formatDuration(channel.total_duration)}</td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{channel.messages}</td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-tertiary))]">{formatDuration(Math.round(channel.total_duration / channel.sessions))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Chat/Message Channel Breakdown */}
                {chatChannelData.length > 0 && (
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
                    <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-6 flex items-center gap-2">
                      <FiMessageSquare className="w-6 h-6 text-purple-500" /> Message Channel Breakdown
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Channel</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Messages</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Characters</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Replies</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">In VC</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Avg Length</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--color-border))]">
                          {chatChannelData.map((ch: any) => (
                            <tr key={ch.channel_id} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-[rgb(var(--color-text-primary))]">
                                <span className="flex items-center gap-2">
                                  <FiHash className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                                  {ch.channel_name || ch.channel_id}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-[rgb(var(--color-text-primary))]">{ch.message_count}</td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{Number(ch.total_characters).toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{ch.reply_count}</td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{ch.in_vc_count}</td>
                              <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-tertiary))]">{Math.round(Number(ch.total_characters) / Number(ch.message_count))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== SESSIONS TAB ===== */}
            {activeTab === 'sessions' && (
              <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
                    Recent Sessions ({data?.vcSessions.length || 0})
                  </h2>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))] mt-1">Click any session to view full details with participants</p>
                </div>
                {data?.vcSessions && data.vcSessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Channel</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Joined</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Left</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Peak</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Msgs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(var(--color-border))]">
                        {data.vcSessions.map((vcSession) => (
                          <tr
                            key={vcSession.id}
                            onClick={() => setSelectedSessionId(vcSession.id)}
                            className="hover:bg-[rgb(var(--color-hover))] transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-primary))] font-medium">
                              <span className="flex items-center gap-1.5">
                                <FiHash className="w-3.5 h-3.5 text-[rgb(var(--color-text-tertiary))]" />
                                {getChannelName(vcSession.channel_id, vcSession.channel_name)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{formatDate(vcSession.joined_at)}</td>
                            <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">
                              {vcSession.left_at ? formatDate(vcSession.left_at) : (
                                <span className="text-red-400 font-medium flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> In Progress</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[rgb(var(--color-text-primary))]">{formatDuration(vcSession.duration_seconds || 0)}</td>
                            <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{vcSession.peak_member_count || 0}</td>
                            <td className="px-6 py-4 text-sm text-[rgb(var(--color-text-secondary))]">{vcSession.messages_sent || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiMic className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
                    <p className="text-[rgb(var(--color-text-secondary))]">No sessions found</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== MUTUALS RELATION TAB ===== */}
            {activeTab === 'mutuals' && (
              <div className="space-y-6">
                {mutualsLoading ? (
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-12 border border-[rgb(var(--color-border))] text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-[rgb(var(--color-text-secondary))]">Loading mutuals data...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 flex-wrap">
                      {([
                        { key: 'vc' as const, label: 'VC Mutuals', count: mutualsData?.vcMutuals?.length || 0, icon: <FiMic className="w-4 h-4" /> },
                        { key: 'chat' as const, label: 'Chat Mutuals', count: mutualsData?.chatMutuals?.length || 0, icon: <FiMessageSquare className="w-4 h-4" /> },
                        { key: 'channels' as const, label: 'Shared Channels', count: mutualsData?.sharedChannels?.length || 0, icon: <FiHash className="w-4 h-4" /> },
                      ]).map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setMutualsSubTab(tab.key)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${mutualsSubTab === tab.key
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]'
                            }`}
                        >
                          {tab.icon} {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>

                    {/* VC Mutuals */}
                    {mutualsSubTab === 'vc' && (
                      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2 flex items-center gap-2">
                          <FiMic className="w-6 h-6 text-blue-500" /> VC Mutuals
                        </h2>
                        <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-6">Users who spent time in voice channels with this user</p>
                        {mutualsData?.vcMutuals && mutualsData.vcMutuals.length > 0 ? (
                          <div className="space-y-2">
                            {mutualsData.vcMutuals.map((mutual, idx) => {
                              const user = getUserDisplay(mutual.target_user_id);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors cursor-pointer group"
                                  onClick={() => setSharedSessionsUserId(mutual.target_user_id)}
                                >
                                  <div className="flex-shrink-0 w-8 text-center font-bold text-[rgb(var(--color-text-tertiary))] text-sm">#{idx + 1}</div>
                                  <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-[rgb(var(--color-border))] flex-shrink-0">
                                    <Image src={user.avatar} alt={user.name} fill className="object-cover" unoptimized />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">{user.name}</p>
                                      {user.inGuild ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">IN SERVER</span>
                                      ) : (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 flex-shrink-0">NOT IN SERVER</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                      @{user.username} • {mutual.mutual_vc_sessions} shared sessions
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xl font-bold text-blue-400">{formatDuration(mutual.mutual_vc_duration)}</p>
                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">together</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSharedSessionsUserId(mutual.target_user_id);
                                      }}
                                      className="flex-shrink-0 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      <FiUsers className="w-3.5 h-3.5" />
                                      View Sessions
                                    </button>
                                    <Link
                                      href={`/admin/vctranscript/${mutual.target_user_id}`}
                                      className="flex-shrink-0 px-3 py-1.5 text-xs bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 rounded-lg transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Profile
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyMutualsState type="VC" />
                        )}
                      </div>
                    )}

                    {/* Chat Mutuals */}
                    {mutualsSubTab === 'chat' && (
                      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2 flex items-center gap-2">
                          <FiMessageSquare className="w-6 h-6 text-purple-500" /> Chat Mutuals
                        </h2>
                        <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-6">Users this person interacted with via messages</p>
                        {mutualsData?.chatMutuals && mutualsData.chatMutuals.length > 0 ? (
                          <div className="space-y-2">
                            {mutualsData.chatMutuals.map((mutual, idx) => {
                              const user = getUserDisplay(mutual.target_user_id);
                              return (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors">
                                  <div className="flex-shrink-0 w-8 text-center font-bold text-[rgb(var(--color-text-tertiary))] text-sm">#{idx + 1}</div>
                                  <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-[rgb(var(--color-border))] flex-shrink-0">
                                    <Image src={user.avatar} alt={user.name} fill className="object-cover" unoptimized />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">{user.name}</p>
                                      {user.inGuild ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">IN SERVER</span>
                                      ) : (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 flex-shrink-0">NOT IN SERVER</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">@{user.username}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0 space-y-1">
                                    <div className="flex items-center gap-2 justify-end">
                                      <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Replies:</span>
                                      <span className="text-sm font-bold text-purple-400">{mutual.messages_to_target}</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                      <span className="text-xs text-[rgb(var(--color-text-tertiary))]">@Mentions:</span>
                                      <span className="text-sm font-bold text-cyan-400">{mutual.mention_count || 0}</span>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/admin/vctranscript/${mutual.target_user_id}`}
                                    className="flex-shrink-0 px-3 py-1.5 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View Profile
                                  </Link>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyMutualsState type="Chat" />
                        )}
                      </div>
                    )}

                    {/* Shared Channels */}
                    {mutualsSubTab === 'channels' && (
                      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2 flex items-center gap-2">
                          <FiHash className="w-6 h-6 text-green-500" /> Shared Channel Activity
                        </h2>
                        <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-6">Channels where this user overlapped with others the most</p>
                        {mutualsData?.sharedChannels && mutualsData.sharedChannels.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">User</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Channel</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Overlaps</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Time Together</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[rgb(var(--color-border))]">
                                {mutualsData.sharedChannels.slice(0, 50).map((item, idx) => {
                                  const user = getUserDisplay(item.other_user_id);
                                  return (
                                    <tr key={idx} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                            <Image src={user.avatar} alt={user.name} fill className="object-cover" unoptimized />
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">{user.name}</p>
                                            <p className="text-xs text-[rgb(var(--color-text-tertiary))]">@{user.username}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">
                                        <span className="flex items-center gap-1">
                                          <FiHash className="w-3.5 h-3.5 text-[rgb(var(--color-text-tertiary))]" />
                                          {getChannelName(item.channel_id, item.channel_name)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-[rgb(var(--color-text-primary))]">{item.overlap_count}</td>
                                      <td className="px-4 py-3 text-sm font-bold text-green-400">{formatDuration(item.overlap_seconds)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <EmptyMutualsState type="Shared channel" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedSessionId && (
        <SessionModal sessionId={selectedSessionId} onClose={() => setSelectedSessionId(null)} />
      )}

      {sharedSessionsUserId && (
        <SharedSessionsModal
          userId={userId}
          targetUserId={sharedSessionsUserId}
          targetUserName={getUserDisplay(sharedSessionsUserId).name}
          targetUserAvatar={getUserDisplay(sharedSessionsUserId).avatar}
          onClose={() => setSharedSessionsUserId(null)}
          onSessionClick={(sessionId) => {
            setSharedSessionsUserId(null);
            setSelectedSessionId(sessionId);
          }}
        />
      )}
    </div>
  );
}

function VoiceActivityCard({ 
  title, 
  duration, 
  percent, 
  icon, 
  color 
}: { 
  title: string; 
  duration: number; 
  percent: string; 
  icon: React.ReactNode; 
  color: 'green' | 'gray' | 'red' | 'blue';
}) {
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const colorClasses = {
    green: 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5',
    gray: 'border-gray-500/30 bg-gradient-to-br from-gray-500/10 to-gray-600/5',
    red: 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5',
    blue: 'border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5',
  };

  const textColorClasses = {
    green: 'text-green-400',
    gray: 'text-gray-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[rgb(var(--color-text-tertiary))] text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${textColorClasses[color]} mb-1`}>{formatDuration(duration)}</p>
      <p className="text-sm text-[rgb(var(--color-text-secondary))]">
        <span className={`font-semibold ${textColorClasses[color]}`}>{percent}%</span> of total time
      </p>
    </div>
  );
}

function TopStatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-6 border border-[rgb(var(--color-border))] hover:border-blue-500/30 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl flex items-center">{icon}</span>
        <p className="text-[rgb(var(--color-text-tertiary))] text-sm font-medium">{title}</p>
      </div>
      <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">{value}</p>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-center p-3 bg-[rgb(var(--color-bg-tertiary))] rounded-lg">
      <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-1">{label}</p>
      <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">{value?.toString() || '0'}</p>
    </div>
  );
}

function EmptyMutualsState({ type }: { type: string }) {
  return (
    <div className="text-center py-12">
      <FiUsers className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
      <p className="text-[rgb(var(--color-text-secondary))]">No {type.toLowerCase()} mutuals found</p>
      <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Data will appear as the bot tracks more activity</p>
    </div>
  );
}
