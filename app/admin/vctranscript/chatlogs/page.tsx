'use client';
import DateRangeFilter from '@/components/DateRangeFilter';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback,useEffect,useState } from 'react';
import { FiActivity,FiChevronLeft,FiMessageSquare,FiSearch,FiTrendingUp,FiUsers } from 'react-icons/fi';
import { Area,AreaChart,CartesianGrid,Cell,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
interface ChatMessage {
  id: string;
  user_id: string;
  channel_id: string;
  channel_name: string;
  content_length: number;
  created_at: string;
  in_voice_chat: boolean;
  replied_to_id: string | null;
}
interface DiscordUserInfo {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  inGuild: boolean;
  nickname: string | null;
}
export default function ChatLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<Map<string, DiscordUserInfo>>(new Map());
  const [channels, setChannels] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'vc' | 'text'>('all');
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setIsRedirecting(true);
      router.replace('/admin');
      return;
    }
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      const canAccess = perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasViewOnlyAccess;
      if (!canAccess) {
        setHasPermission(false);
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
      fetchChatData();
    }
  }, [status, session, router]);
  const fetchChatData = useCallback(async (range?: { startDate: string | null; endDate: string | null }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const r = range || dateRange;
      if (r.startDate) params.set('startDate', r.startDate);
      if (r.endDate) params.set('endDate', r.endDate);
      const messagesRes = await fetch(`/api/vctranscript/chatlogs?${params}`);
      const messagesData = await messagesRes.json();
      setMessages(messagesData.messages || []);
      const uniqueUserIds = Array.from(new Set((messagesData.messages || []).map((m: ChatMessage) => m.user_id))) as string[];
      const uniqueChannelIds = Array.from(new Set((messagesData.messages || []).map((m: ChatMessage) => m.channel_id))) as string[];
      if (uniqueUserIds.length > 0) {
        const userRes = await fetch('/api/discord/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: uniqueUserIds }),
        });
        const userData = await userRes.json();
        const userMap = new Map<string, DiscordUserInfo>();
        for (const [uid, info] of Object.entries(userData.users || {})) {
          const user = info as any;
          userMap.set(uid, {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            inGuild: user.inGuild,
            nickname: user.nickname,
          });
        }
        setUsers(userMap);
      }
      if (uniqueChannelIds.length > 0) {
        const chRes = await fetch('/api/discord/cached-channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelIds: uniqueChannelIds }),
        });
        const chData = await chRes.json();
        const chMap = new Map<string, { id: string; name: string }>();
        for (const [cid, info] of Object.entries(chData.channels || {})) {
          chMap.set(cid, info as { id: string; name: string });
        }
        setChannels(chMap);
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = searchTerm === '' ||
      users.get(msg.user_id)?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.channel_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
        filter === 'vc' ? msg.in_voice_chat :
          !msg.in_voice_chat;
    return matchesSearch && matchesFilter;
  });
  const totalMessages = messages.length;
  const vcMessages = messages.filter(m => m.in_voice_chat).length;
  const uniqueUsers = new Set(messages.map(m => m.user_id)).size;
  const uniqueChannels = new Set(messages.map(m => m.channel_id)).size;
  const userStats = Array.from(
    messages.reduce((acc, msg) => {
      const count = acc.get(msg.user_id) || 0;
      acc.set(msg.user_id, count + 1);
      return acc;
    }, new Map<string, number>())
  )
    .map(([userId, count]) => ({
      userId,
      count,
      user: users.get(userId)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const messagesByHour = messages.reduce((acc, msg) => {
    const hour = new Date(msg.created_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    messages: messagesByHour[i] || 0
  }));
  const messagesByChannel = Array.from(
    messages.reduce((acc, msg) => {
      const count = acc.get(msg.channel_id) || 0;
      acc.set(msg.channel_id, count + 1);
      return acc;
    }, new Map<string, number>())
  )
    .map(([channelId, count]) => ({
      name: channels.get(channelId)?.name || channelId,
      value: count
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316'];
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
                You do not have permission to access Chat Logs.
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
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-[rgb(var(--color-bg-secondary))] rounded"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-[rgb(var(--color-bg-secondary))] rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-8">
          <Link
            href="/admin/vctranscript"
            className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-4 transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
            Back to VC Transcripts
          </Link>
          <h1 className="text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
            Chat Logs & Analytics
          </h1>
          <p className="text-[rgb(var(--color-text-secondary))] text-lg mb-4">
            Comprehensive message history and data visualization
          </p>
          <DateRangeFilter onChange={(r) => { setDateRange(r); fetchChatData(r); }} initialRange={dateRange} />
        </div>
        {}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            icon={<FiMessageSquare className="w-6 h-6 text-blue-500" />}
            title="Total Messages"
            value={totalMessages.toLocaleString()}
            subtitle={totalMessages > 0 ? `${((vcMessages / totalMessages) * 100).toFixed(1)}% in VC` : '0% in VC'}
          />
          <StatCard
            icon={<FiUsers className="w-6 h-6 text-purple-500" />}
            title="Active Users"
            value={uniqueUsers.toString()}
            subtitle="Unique chatters"
          />
          <StatCard
            icon={<FiTrendingUp className="w-6 h-6 text-green-500" />}
            title="Channels"
            value={uniqueChannels.toString()}
            subtitle="With activity"
          />
          <StatCard
            icon={<FiActivity className="w-6 h-6 text-orange-500" />}
            title="Avg/User"
            value={uniqueUsers > 0 ? (totalMessages / uniqueUsers).toFixed(1) : '0'}
            subtitle="Messages per user"
          />
        </div>
        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {}
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h3 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">
              Messages by Hour
            </h3>
            <div className="h-[250px] sm:h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--color-bg-tertiary))',
                      border: '1px solid rgb(var(--color-border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="messages" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMessages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {}
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h3 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">
              Messages by Channel
            </h3>
            <div className="h-[250px] sm:h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={messagesByChannel}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {messagesByChannel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--color-bg-tertiary))',
                      border: '1px solid rgb(var(--color-border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {}
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
          <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">
            Top Chatters
          </h3>
          <div className="space-y-3">
            {userStats.map((stat, idx) => (
              <div key={stat.userId} className="flex items-center gap-4 p-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors">
                <div className="flex-shrink-0 w-8 text-center font-bold text-[rgb(var(--color-text-tertiary))]">
                  #{idx + 1}
                </div>
                {stat.user?.avatar && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image src={stat.user.avatar} alt={stat.user.displayName} fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-[rgb(var(--color-text-primary))]">
                    {stat.user?.displayName || 'Unknown User'}
                  </p>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                    @{stat.user?.username || stat.userId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
                    {stat.count}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))]">messages</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {}
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))]">
              Recent Messages ({filteredMessages.length})
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('vc')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'vc'
                    ? 'bg-green-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                    }`}
                >
                  In VC
                </button>
                <button
                  onClick={() => setFilter('text')}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${filter === 'text'
                    ? 'bg-purple-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                    }`}
                >
                  Text Only
                </button>
              </div>
              {}
              <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[rgb(var(--color-text-tertiary))]" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-lg text-sm text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMessages.slice(0, 200).map((msg) => {
              const user = users.get(msg.user_id);
              const channel = channels.get(msg.channel_id);
              return (
                <div key={msg.id} className="flex items-start gap-3 p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors">
                  {user?.avatar && (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={user.avatar} alt={user.displayName} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[rgb(var(--color-text-primary))]">
                        {user?.displayName || 'Unknown User'}
                      </span>
                      {msg.in_voice_chat && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          In VC
                        </span>
                      )}
                      <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                        #{channel?.name || msg.channel_id}
                      </span>
                      <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                      {msg.content_length > 0 ? `${msg.content_length} chars` : 'Empty message'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
function StatCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--color-border))] shadow-apple-sm flex flex-col justify-center">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="scale-75 sm:scale-100 origin-left">
          {icon}
        </div>
        <p className="text-xs sm:text-sm font-medium text-[rgb(var(--color-text-tertiary))] truncate">{title}</p>
      </div>
      <p className="text-xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-1 truncate">{value}</p>
      <p className="text-[10px] sm:text-sm text-[rgb(var(--color-text-tertiary))] truncate">{subtitle}</p>
    </div>
  );
}