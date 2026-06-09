'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiUsers, FiCheckCircle, FiAlertCircle, FiDollarSign, FiUserPlus,
  FiRefreshCw, FiSave, FiTrendingUp, FiUserCheck, FiUserX, FiSearch,
  FiChevronLeft, FiChevronRight, FiArrowUp, FiArrowDown,
  FiClock, FiAward, FiActivity, FiSettings
} from 'react-icons/fi';
interface InviteConfig {
  invites_enabled: boolean;
  coins_per_invite: number;
}
interface InviteOverview {
  total_invites: number;
  active_invites: number;
  left_invites: number;
  total_inviters: number;
  total_coins_distributed: number;
}
interface InviterStat {
  user_id: string;
  username: string;
  avatar: string | null;
  total_invites: number;
  active_invites: number;
  left_invites: number;
  bonus_invites: number;
  fake_invites: number;
  coins_earned: number;
}
interface RecentInvite {
  id: string;
  inviter_id: string;
  inviter_username: string;
  inviter_avatar: string | null;
  invited_user_id: string;
  invited_username: string;
  invited_avatar: string | null;
  invite_code: string;
  joined_at: string;
  left_at: string | null;
  active: boolean;
  coins_earned: number;
}
interface SearchResult {
  user_id: string;
  username: string;
  avatar: string | null;
  total_invites: number;
  coins_earned: number;
}
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export default function InvitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<InviteConfig>({
    invites_enabled: true,
    coins_per_invite: 100,
  });
  const [overview, setOverview] = useState<InviteOverview>({
    total_invites: 0,
    active_invites: 0,
    left_invites: 0,
    total_inviters: 0,
    total_coins_distributed: 0,
  });
  const [leaderboard, setLeaderboard] = useState<InviterStat[]>([]);
  const [recentInvites, setRecentInvites] = useState<RecentInvite[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState('coins_earned');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'left'>('all');
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/signin');
    }
    if (status === 'authenticated' && session?.user) {
      const perms = (session.user as any).permissions;
      if (!perms?.hasFullAccess) {
        router.push('/admin/casino');
      }
    }
  }, [status, session, router]);
  const fetchInvites = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      const response = await fetch(`/api/economy/invites?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setConfig(data.config);
      setOverview(data.overview);
      setLeaderboard(data.leaderboard);
      setRecentInvites(data.recent_invites);
      setPagination(data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setMessage({ type: 'error', text: 'Failed to load invites' });
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, filterStatus]);
  useEffect(() => {
    if (status === 'authenticated') {
      fetchInvites();
    }
  }, [status, fetchInvites]);
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const response = await fetch(`/api/economy/invites/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    };
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/economy/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins_per_invite: config.coins_per_invite,
          invites_enabled: config.invites_enabled,
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      const data = await response.json();
      setConfig(data.config);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };
  if (status === 'loading' || loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading invite system...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <FiUserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              </div>
              Invite Tracking
            </h1>
            <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
              Monitor invite performance, track contributions, and manage rewards
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition touch-manipulation"
            >
              <FiSettings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={fetchInvites}
              className="flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition touch-manipulation"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        {}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-500'
                : 'bg-red-500/10 border border-red-500/30 text-red-500'
            }`}
          >
            {message.type === 'success' ? (
              <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
        {}
        {showSettings && (
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-[var(--shadow-md)]">
            <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-6 flex items-center gap-2">
              <FiSettings className="w-5 h-5" />
              Invite Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[rgb(var(--color-text-secondary))] font-medium mb-3">Enable Invites</label>
                <button
                  onClick={() => setConfig({ ...config, invites_enabled: !config.invites_enabled })}
                  className={`w-full px-4 py-3 rounded-xl font-medium apple-transition shadow-lg ${
                    config.invites_enabled
                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                      : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] hover:bg-[rgb(var(--color-hover))]'
                  }`}
                >
                  {config.invites_enabled ? (
                    <span className="flex items-center justify-center gap-2">
                      <FiCheckCircle className="w-5 h-5" />
                      Enabled
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FiAlertCircle className="w-5 h-5" />
                      Disabled
                    </span>
                  )}
                </button>
              </div>
              <div>
                <label className="block text-[rgb(var(--color-text-secondary))] font-medium mb-3">Reward Per Invite</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={config.coins_per_invite}
                    onChange={(e) => setConfig({ ...config, coins_per_invite: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:border-purple-500 focus:outline-none apple-transition"
                  />
                  <span className="px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl text-[rgb(var(--color-text-primary))] flex items-center justify-center min-w-[60px]">🪙</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="mt-6 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 disabled:opacity-50 apple-transition shadow-lg shadow-purple-500/20 flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
        {}
        <div className="relative mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
            <input
              type="text"
              placeholder="Search by username or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full pl-12 pr-4 py-4 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl text-[rgb(var(--color-text-primary))] focus:border-purple-500 focus:outline-none apple-transition text-lg"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
              </div>
            )}
          </div>
          {}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl shadow-xl overflow-hidden">
              {searchResults.map((result) => (
                <Link
                  key={result.user_id}
                  href={`/admin/casino/economy/invites/${result.user_id}`}
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-4 p-4 hover:bg-[rgb(var(--color-hover))] apple-transition border-b border-[rgb(var(--color-border))] last:border-b-0"
                >
                  {result.avatar ? (
                    <Image
                      src={result.avatar}
                      alt={result.username}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-purple-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-[rgb(var(--color-text-primary))]">{result.username}</p>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))]">{result.total_invites} invites</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))]">{result.coins_earned.toLocaleString()} 🪙</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-blue-500/50 apple-transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FiUsers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <span className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">Total Invites</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{overview.total_invites.toLocaleString()}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-green-500/50 apple-transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <FiUserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <span className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">Active</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-500">{overview.active_invites.toLocaleString()}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-red-500/50 apple-transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <FiUserX className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              </div>
              <span className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">Left</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-500">{overview.left_invites.toLocaleString()}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FiAward className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              </div>
              <span className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">Inviters</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{overview.total_inviters.toLocaleString()}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-yellow-500/50 apple-transition col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              </div>
              <span className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">Rewards</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-yellow-500">{overview.total_coins_distributed.toLocaleString()} 🪙</p>
          </div>
        </div>
        {}
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-[var(--shadow-md)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5" />
              Top Inviters
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg text-sm text-[rgb(var(--color-text-primary))] focus:outline-none focus:border-purple-500"
              >
                <option value="coins_earned">Rewards</option>
                <option value="total_invites">Total Invites</option>
                <option value="active_invites">Active Invites</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg hover:border-purple-500/50 apple-transition"
              >
                {sortOrder === 'desc' ? <FiArrowDown className="w-4 h-4" /> : <FiArrowUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {leaderboard.length > 0 ? (
              leaderboard.map((inviter, idx) => (
                <Link
                  key={inviter.user_id}
                  href={`/admin/casino/economy/invites/${inviter.user_id}`}
                  className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-2xl hover:bg-[rgb(var(--color-hover))] apple-transition group"
                >
                  {}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                    idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                    'bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-tertiary))]'
                  }`}>
                    {idx + 1 + (pagination.page - 1) * pagination.limit}
                  </div>
                  {}
                  {inviter.avatar ? (
                    <Image
                      src={inviter.avatar}
                      alt={inviter.username}
                      width={44}
                      height={44}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <FiUsers className="w-5 h-5 text-purple-500" />
                    </div>
                  )}
                  {}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">{inviter.username}</p>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                      {inviter.total_invites} total • {inviter.active_invites} active • {inviter.left_invites} left
                    </p>
                  </div>
                  {}
                  <div className="text-right">
                    <p className="font-bold text-[rgb(var(--color-text-primary))]">{inviter.coins_earned.toLocaleString()} 🪙</p>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">earned</p>
                  </div>
                  {}
                  <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] group-hover:text-purple-500 apple-transition" />
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <FiUserX className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-4" />
                <p className="text-[rgb(var(--color-text-tertiary))]">No inviters found</p>
              </div>
            )}
          </div>
          {}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[rgb(var(--color-border))]">
              <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="p-2 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg hover:border-purple-500/50 disabled:opacity-50 disabled:hover:border-[rgb(var(--color-border))] apple-transition"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg hover:border-purple-500/50 disabled:opacity-50 disabled:hover:border-[rgb(var(--color-border))] apple-transition"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        {}
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] shadow-[var(--shadow-md)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
              <FiActivity className="w-5 h-5" />
              Recent Invite Activity
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium apple-transition ${
                  filterStatus === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium apple-transition ${
                  filterStatus === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('left')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium apple-transition ${
                  filterStatus === 'left'
                    ? 'bg-red-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                Left
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {recentInvites.length > 0 ? (
              recentInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-2xl"
                >
                  {}
                  <div className="relative">
                    {invite.invited_avatar ? (
                      <Image
                        src={invite.invited_avatar}
                        alt={invite.invited_username}
                        width={44}
                        height={44}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FiUsers className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[rgb(var(--color-bg-tertiary))] ${
                      invite.active ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  {}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">
                      {invite.invited_username}
                    </p>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                      Invited by <Link href={`/admin/casino/economy/invites/${invite.inviter_id}`} className="text-purple-500 hover:underline">{invite.inviter_username}</Link>
                    </p>
                  </div>
                  {}
                  <div className="text-right">
                    <code className="text-xs bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded">{invite.invite_code}</code>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1 flex items-center justify-end gap-1">
                      <FiClock className="w-3 h-3" />
                      {formatDate(invite.joined_at)}
                    </p>
                  </div>
                  {}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      invite.active
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {invite.active ? 'Active' : 'Left'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FiUserPlus className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-4" />
                <p className="text-[rgb(var(--color-text-tertiary))]">No recent invite activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}