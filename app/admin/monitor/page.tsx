'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiActivity, FiUsers, FiMic, FiMicOff, FiVolume2, FiVolumeX,
  FiClock, FiRefreshCw, FiArrowLeft, FiAlertCircle, FiCheckCircle,
  FiXCircle, FiZap, FiMessageSquare, FiSearch, FiX, FiCpu, FiBarChart2
} from 'react-icons/fi';
import { buildAvatarUrl } from '@/lib/userUtils';

type TabType = 'vc' | 'messages' | 'search';

export default function LiveMonitorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('vc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

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

  const searchUser = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/economy/live-status?userId=${searchQuery}`);
      const result = await res.json();
      
      if (res.ok) {
        setSearchResult(result);
        setActiveTab('search');
      }
    } catch (err) {
      console.error('Error searching user:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

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

      // Set up Server-Sent Events connection
      const eventSource = new EventSource('/api/economy/live-stream');

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          setData(result);
          setLastUpdate(new Date());
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        setError('Connection lost. Reconnecting...');
        eventSource.close();
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (status === 'authenticated') {
            window.location.reload();
          }
        }, 3000);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [status, session, router]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getEmojiDisplay = (emoji: string) => {
    const match = emoji.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      const [, name, id] = match;
      const ext = emoji.startsWith('<a:') ? 'gif' : 'png';
      return <img src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=20`} alt={name} className="inline-block w-4 h-4" />;
    }
    return <span>{emoji}</span>;
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading monitor...</p>
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
          <button onClick={fetchData} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const vcActive = data?.vc?.active || [];
  const vcEarning = vcActive.filter((u: any) => u.isEarning);
  const msgActive = data?.messages?.active || [];
  const currency = data?.economy?.emoji || '🪙';

  return (
    <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                <FiActivity className="text-green-500" />
                Live Economy Monitor
              </h1>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">Real-time voice & chat earnings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
              data?.config?.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {data?.config?.enabled ? <FiCheckCircle /> : <FiXCircle />}
              {data?.config?.enabled ? 'Economy Active' : 'Economy Disabled'}
            </div>
            
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
              connected ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`} />
              {connected ? 'Live' : 'Connecting...'}
            </div>

            {lastUpdate && (
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-tertiary))]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                placeholder="Search user by ID or username..."
                className="w-full pl-10 pr-10 py-2 bg-[rgb(var(--color-bg-primary))] rounded-lg border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResult(null); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <FiX className="text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))]" />
                </button>
              )}
            </div>
            <button 
              onClick={searchUser} 
              disabled={searchLoading || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={<FiUsers />} label="In VC Now" value={vcActive.length} color="blue" />
          <StatCard icon={<FiZap />} label="Earning (VC)" value={vcEarning.length} color="green" />
          <StatCard icon={<FiMessageSquare />} label="Active Messages" value={msgActive.length} color="purple" />
          <StatCard icon={getEmojiDisplay(currency)} label="VC Today" value={data?.stats?.vcEarned || 0} color="yellow" />
          <StatCard icon={getEmojiDisplay(currency)} label="Msg Today" value={data?.stats?.msgEarned || 0} color="orange" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[rgb(var(--color-border))]">
          <TabButton active={activeTab === 'vc'} onClick={() => setActiveTab('vc')} icon={<FiMic />} label="Voice Channels" count={vcActive.length} />
          <TabButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<FiMessageSquare />} label="Chat Messages" count={msgActive.length} />
          {searchResult && <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={<FiSearch />} label="Search Result" />}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'vc' && <VoiceTab data={data} formatDuration={formatDuration} buildAvatarUrl={buildAvatarUrl} currency={currency} getEmojiDisplay={getEmojiDisplay} />}
            {activeTab === 'messages' && <MessagesTab data={data} buildAvatarUrl={buildAvatarUrl} currency={currency} getEmojiDisplay={getEmojiDisplay} />}
            {activeTab === 'search' && searchResult && <SearchTab result={searchResult} formatDuration={formatDuration} formatTimeAgo={formatTimeAgo} buildAvatarUrl={buildAvatarUrl} currency={searchResult?.config?.emoji || '🪙'} getEmojiDisplay={getEmojiDisplay} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <RecentAwardsPanel title="Recent VC Rewards" awards={data?.vc?.recentAwards || []} formatTimeAgo={formatTimeAgo} buildAvatarUrl={buildAvatarUrl} getEmojiDisplay={getEmojiDisplay} currency={currency} />
            <RecentAwardsPanel title="Recent Message Rewards" awards={data?.messages?.recentAwards || []} formatTimeAgo={formatTimeAgo} buildAvatarUrl={buildAvatarUrl} getEmojiDisplay={getEmojiDisplay} currency={currency} />
            {data?.vc?.staged && data.vc.staged.length > 0 && <StagedPanel users={data.vc.staged} formatDuration={formatDuration} buildAvatarUrl={buildAvatarUrl} />}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400'
  };

  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
      <div className={`flex items-center gap-2 ${colors[color]} mb-2`}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 flex items-center gap-2 transition-colors ${
        active
          ? 'text-blue-400 border-b-2 border-blue-400'
          : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-blue-500/20 text-blue-400' : 'bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-tertiary))]'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function VoiceTab({ data, formatDuration, buildAvatarUrl, currency, getEmojiDisplay }: any) {
  const users = data?.vc?.active || [];

  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))]">
      <div className="px-4 py-3 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
        <h2 className="font-semibold text-[rgb(var(--color-text-primary))]">Active in Voice</h2>
        <span className="text-sm text-[rgb(var(--color-text-tertiary))]">{users.length} users</span>
      </div>
      
      <div className="max-h-[600px] overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-8 text-center text-[rgb(var(--color-text-tertiary))]">
            <FiMicOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No users in voice channels</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgb(var(--color-border))]">
            {users.map((user: any) => (
              <div key={user.id} className="p-4 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                <div className="flex items-start gap-3">
                  <img src={buildAvatarUrl(user.id, user.avatar, '0', 64)} alt={user.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[rgb(var(--color-text-primary))]">{user.name}</span>
                      
                      {user.isBlacklisted ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Blacklisted</span>
                      ) : user.isEarning ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
                          <FiZap className="w-3 h-3" />
                          Earning
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">Not Earning</span>
                      )}
                      
                      {user.muted && <FiMicOff className="w-4 h-4 text-yellow-400" />}
                      {user.deafened && <FiVolumeX className="w-4 h-4 text-red-400" />}
                    </div>
                    
                    <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                      📍 {user.channel}
                      {user.category && <span className="text-[rgb(var(--color-text-tertiary))]"> • {user.category}</span>}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                      <span className="flex items-center gap-1">
                        <FiClock />
                        {formatDuration(user.duration)}
                      </span>
                      <span>Rate: {user.rate}</span>
                      {user.staged > 0 && (
                        <span className="text-yellow-400">
                          ⚡ {formatDuration(user.staged)} credits consumed
                        </span>
                      )}
                    </div>
                    
                    {user.isEarning && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress to next reward</span>
                          <span>{user.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[rgb(var(--color-bg-primary))] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all" style={{ width: `${user.progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs mt-1 text-[rgb(var(--color-text-tertiary))]">
                          <span>Next in: {formatDuration(user.nextIn)}</span>
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
  );
}

function MessagesTab({ data, buildAvatarUrl, currency, getEmojiDisplay }: any) {
  const users = data?.messages?.active || [];
  const config = data?.messages?.config || {};

  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))]">
      <div className="px-4 py-3 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
        <h2 className="font-semibold text-[rgb(var(--color-text-primary))]">Active Message Earners</h2>
        <span className="text-sm text-[rgb(var(--color-text-tertiary))]">{users.length} users</span>
      </div>
      
      <div className="p-4 bg-[rgb(var(--color-bg-primary))] border-b border-[rgb(var(--color-border))]">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[rgb(var(--color-text-tertiary))]">Rate:</span>
            <p className="text-[rgb(var(--color-text-primary))]">{config.perPoint} msgs = {config.ozyAmount} {getEmojiDisplay(currency)}</p>
          </div>
          <div>
            <span className="text-[rgb(var(--color-text-tertiary))]">Daily Limit:</span>
            <p className="text-[rgb(var(--color-text-primary))]">{config.dailyLimit}</p>
          </div>
        </div>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-8 text-center text-[rgb(var(--color-text-tertiary))]">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active message earners</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgb(var(--color-border))]">
            {users.map((user: any) => (
              <div key={user.id} className="p-4 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                <div className="flex items-center gap-3">
                  <img src={buildAvatarUrl(user.id, user.avatar, '0', 64)} alt={user.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium text-[rgb(var(--color-text-primary))]">{user.name}</div>
                    <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                      Staged messages: {user.staged}/{config.perPoint}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{user.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-[rgb(var(--color-bg-primary))] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all" style={{ width: `${user.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchTab({ result, formatDuration, formatTimeAgo, buildAvatarUrl, currency, getEmojiDisplay }: any) {
  const configEmoji = result?.config?.emoji || currency || '🪙';
  
  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] p-6">
        <div className="flex items-center gap-4 mb-4">
          <img src={buildAvatarUrl(result.user.id, result.user.avatar, '0', 80)} alt={result.user.name} className="w-20 h-20 rounded-full" />
          <div>
            <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{result.user.name}</h3>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">ID: {result.user.id}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${result.user.inGuild ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {result.user.inGuild ? 'In Guild' : 'Left Guild'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 p-4 bg-[rgb(var(--color-bg-primary))] rounded-lg">
          <div>
            <div className="text-[rgb(var(--color-text-tertiary))] text-sm">Balance</div>
            <div className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{result.balance} {getEmojiDisplay(configEmoji)}</div>
          </div>
          <div>
            <div className="text-[rgb(var(--color-text-tertiary))] text-sm">VC Time</div>
            <div className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{result.totalVcMinutes} min</div>
          </div>
          <div>
            <div className="text-[rgb(var(--color-text-tertiary))] text-sm">Messages</div>
            <div className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{result.totalMessages}</div>
          </div>
        </div>
      </div>

      {/* Current Activity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] p-4">
          <h4 className="font-semibold text-[rgb(var(--color-text-primary))] mb-3 flex items-center gap-2">
            <FiMic className="text-blue-400" />
            Voice Status
          </h4>
          {result.vc.inVc ? (
            <div>
              <div className="text-sm text-[rgb(var(--color-text-secondary))]">Currently in: <span className="text-[rgb(var(--color-text-primary))]">{result.vc.channel}</span></div>
              <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">Joined: {formatTimeAgo(result.vc.joinedAt)}</div>
              <div className="text-sm text-yellow-400 mt-2">Staged: {formatDuration(result.vc.staged)}</div>
            </div>
          ) : (
            <div className="text-[rgb(var(--color-text-tertiary))]">
              Not in voice
            </div>
          )}
        </div>

        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] p-4">
          <h4 className="font-semibold text-[rgb(var(--color-text-primary))] mb-3 flex items-center gap-2">
            <FiMessageSquare className="text-purple-400" />
            Message Status
          </h4>
          <div>
            <div className="text-sm text-yellow-400">Staged: {result.messages.staged} msgs</div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))]">
        <div className="px-4 py-3 border-b border-[rgb(var(--color-border))]">
          <h4 className="font-semibold text-[rgb(var(--color-text-primary))]">Recent History</h4>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {result.history.length === 0 ? (
            <div className="p-8 text-center text-[rgb(var(--color-text-tertiary))]">No history</div>
          ) : (
            <div className="divide-y divide-[rgb(var(--color-border))]">
              {result.history.map((h: any, i: number) => (
                <div key={i} className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${h.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {h.amount > 0 ? '+' : ''}{h.amount} {getEmojiDisplay(configEmoji)}
                    </span>
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">{formatTimeAgo(h.time)}</span>
                  </div>
                  <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                    {h.reason} <span className="text-[rgb(var(--color-text-tertiary))]">• {h.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentAwardsPanel({ title, awards, formatTimeAgo, buildAvatarUrl, getEmojiDisplay, currency }: any) {
  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))]">
      <div className="px-4 py-3 border-b border-[rgb(var(--color-border))]">
        <h3 className="font-semibold text-[rgb(var(--color-text-primary))] flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs text-[rgb(var(--color-text-tertiary))] font-normal">Last 24h • Top {awards.length}</span>
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {awards.length === 0 ? (
          <div className="p-4 text-center text-[rgb(var(--color-text-tertiary))] text-sm">No recent awards</div>
        ) : (
          <div className="divide-y divide-[rgb(var(--color-border))]">
            {awards.map((award: any, i: number) => (
              <div key={i} className="px-4 py-2 flex items-center gap-2 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                <img src={buildAvatarUrl(award.id, award.avatar, '0', 24)} alt={award.name} className="w-5 h-5 rounded-full" />
                <span className="text-sm truncate flex-1">{award.name}</span>
                <span className="text-sm font-medium text-green-400">+{award.amount} {getEmojiDisplay(currency)}</span>
                <span className="text-xs text-[rgb(var(--color-text-tertiary))]">{formatTimeAgo(award.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StagedPanel({ users, formatDuration, buildAvatarUrl }: any) {
  return (
    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))]">
      <div className="px-4 py-3 border-b border-[rgb(var(--color-border))]">
        <h3 className="font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
          <FiCpu className="text-yellow-400" />
          Credits Available (Not in VC)
        </h3>
      </div>
      <div className="max-h-[250px] overflow-y-auto">
        <div className="divide-y divide-[rgb(var(--color-border))]">
          {users.slice(0, 15).map((user: any) => (
            <div key={user.id} className="px-4 py-2 flex items-center gap-2">
              <img src={buildAvatarUrl(user.id, user.avatar, '0', 24)} alt={user.name} className="w-5 h-5 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{user.name}</div>
                <div className="text-xs text-[rgb(var(--color-text-tertiary))] truncate">
                  {user.categoryName || 'Unknown Category'}
                </div>
              </div>
              <span className="text-sm font-medium text-yellow-400">{formatDuration(user.seconds)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
