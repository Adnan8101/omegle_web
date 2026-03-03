'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUsers, FiCheckCircle, FiAlertCircle, FiDollarSign, FiUserPlus, FiRefreshCw, FiSave, FiTrendingUp, FiUserCheck, FiUserX } from 'react-icons/fi';

interface Invite {
  id: string;
  inviter_id: string;
  invited_user_id: string;
  invite_code: string;
  joined_at: string;
  left_at: string | null;
  active: boolean;
  coins_earned: number;
}

interface InviteStat {
  user_id: string;
  total_invites: number;
  active_invites: number;
  coins_earned: number;
}

interface InviteConfig {
  invites_enabled: boolean;
  coins_per_invite: number;
}

export default function InvitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<InviteConfig>({
    invites_enabled: true,
    coins_per_invite: 100,
  });
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStat[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check permissions - Full Access only (Server Admin/Owner)
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

  // Fetch invites data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchInvites();
      const interval = setInterval(fetchInvites, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [status]);

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/economy/invites');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setConfig(data.config);
      setInvites(data.invites);
      setStats(data.stats.sort((a: InviteStat, b: InviteStat) => b.coins_earned - a.coins_earned));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setMessage({ type: 'error', text: 'Failed to load invites' });
      setLoading(false);
    }
  };

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
      setMessage({ type: 'success', text: 'Config saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Failed to save config' });
    } finally {
      setSaving(false);
    }
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

  const totalCoinsDistributed = stats.reduce((sum, s) => sum + s.coins_earned, 0);
  const activeInviteCount = invites.filter((i) => i.active).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <FiUserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              </div>
              Invite System
            </h1>
            <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
              Track and manage user invitations & referral rewards
            </p>
          </div>
          <button
            onClick={fetchInvites}
            className="flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition touch-manipulation"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Message Alert */}
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

        {/* Configuration Card */}
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-[var(--shadow-md)]">
          <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-6 flex items-center gap-2">
            <FiUsers className="w-5 h-5" />
            Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enable/Disable */}
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

            {/* Coins Per Invite */}
            <div>
              <label className="block text-[rgb(var(--color-text-secondary))] font-medium mb-3">Coins Per Invite</label>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-purple-500/50 hover:shadow-[var(--shadow-blue)] apple-transition shadow-[var(--shadow-md)]">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl">
                <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-1">
              {invites.length}
            </div>
            <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
              Total Invites
            </div>
          </div>

          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-green-500/50 hover:shadow-[var(--shadow-blue)] apple-transition shadow-[var(--shadow-md)]">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-xl">
                <FiUserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-1">
              {activeInviteCount}
            </div>
            <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
              Active Invites
            </div>
          </div>

          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-yellow-500/50 hover:shadow-[var(--shadow-blue)] apple-transition shadow-[var(--shadow-md)]">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-xl">
                <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-1 flex items-center gap-2">
              {totalCoinsDistributed.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
              Total Coins Distributed
            </div>
          </div>
        </div>

        {/* Top Inviters */}
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-[var(--shadow-md)]">
          <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-6 flex items-center gap-2">
            <FiTrendingUp className="w-5 h-5" />
            Top Inviters
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgb(var(--color-border))]">
                  <th className="text-left px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">User ID</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Total Invites</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Active Invites</th>
                  <th className="text-right px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Coins Earned</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.length > 0 ? (
                  stats.map((stat, idx) => (
                    <tr key={stat.user_id} className="border-b border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition">
                      <td className="px-4 py-3 text-[rgb(var(--color-text-primary))]">
                        <code className="text-xs sm:text-sm bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded">{stat.user_id}</code>
                      </td>
                      <td className="px-4 py-3 text-center text-[rgb(var(--color-text-primary))] font-medium">{stat.total_invites}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          stat.active_invites > 0 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))]'
                        }`}>
                          {stat.active_invites}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--color-text-primary))] font-semibold">
                        {stat.coins_earned.toLocaleString()} 🪙
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/casino/economy/invites/${stat.user_id}`}
                          className="text-purple-500 hover:text-purple-400 text-sm font-medium apple-transition"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FiUserX className="w-8 h-8 text-[rgb(var(--color-text-tertiary))]" />
                        <span className="text-[rgb(var(--color-text-tertiary))]">No invites yet</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invites */}
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] shadow-[var(--shadow-md)]">
          <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-6 flex items-center gap-2">
            <FiUserPlus className="w-5 h-5" />
            Recent Invitations
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgb(var(--color-border))]">
                  <th className="text-left px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Inviter</th>
                  <th className="text-left px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Invited User</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Code</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Status</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Coins</th>
                  <th className="text-right px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Joined</th>
                </tr>
              </thead>
              <tbody>
                {invites.length > 0 ? (
                  invites.slice(0, 20).map((invite) => (
                    <tr key={invite.id} className="border-b border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition">
                      <td className="px-4 py-3 text-[rgb(var(--color-text-primary))]">
                        <code className="text-xs sm:text-sm bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded">{invite.inviter_id.slice(0, 10)}</code>
                      </td>
                      <td className="px-4 py-3 text-[rgb(var(--color-text-primary))]">
                        <code className="text-xs sm:text-sm bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded">{invite.invited_user_id.slice(0, 10)}</code>
                      </td>
                      <td className="px-4 py-3 text-center text-[rgb(var(--color-text-secondary))]">
                        <code className="text-xs bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded">{invite.invite_code}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                            invite.active
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {invite.active ? (
                            <><FiCheckCircle className="w-3 h-3" /> Active</>
                          ) : (
                            <><FiUserX className="w-3 h-3" /> Inactive</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[rgb(var(--color-text-primary))] font-medium">
                        {invite.coins_earned} 🪙
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--color-text-secondary))] text-xs sm:text-sm">
                        {new Date(invite.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FiUserX className="w-8 h-8 text-[rgb(var(--color-text-tertiary))]" />
                        <span className="text-[rgb(var(--color-text-tertiary))]">No invitations yet</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
