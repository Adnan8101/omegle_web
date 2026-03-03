'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Invite System Management</h1>
          <p className="text-slate-400">Track and manage user invitations and referral rewards</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-200 border border-green-500/30'
                : 'bg-red-500/20 text-red-200 border border-red-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Configuration Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enable/Disable */}
            <div>
              <label className="block text-slate-300 font-medium mb-2">Enable Invites</label>
              <button
                onClick={() => setConfig({ ...config, invites_enabled: !config.invites_enabled })}
                className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                  config.invites_enabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {config.invites_enabled ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>

            {/* Coins Per Invite */}
            <div>
              <label className="block text-slate-300 font-medium mb-2">Coins Per Invite</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={config.coins_per_invite}
                  onChange={(e) => setConfig({ ...config, coins_per_invite: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="px-3 py-2 bg-slate-700 rounded-lg text-slate-300">🪙</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Invites</p>
            <p className="text-3xl font-bold text-white">{invites.length}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Active Invites</p>
            <p className="text-3xl font-bold text-white">{invites.filter((i) => i.active).length}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Coins Distributed</p>
            <p className="text-3xl font-bold text-white">{stats.reduce((sum, s) => sum + s.coins_earned, 0)}</p>
          </div>
        </div>

        {/* Top Inviters */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Top Inviters</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">User ID</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Total Invites</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Active Invites</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold">Coins Earned</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.length > 0 ? (
                  stats.map((stat, idx) => (
                    <tr key={stat.user_id} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 text-white">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded">{stat.user_id}</code>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{stat.total_invites}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`${stat.active_invites > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                          {stat.active_invites}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">{stat.coins_earned} 🪙</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/casino/economy/invites/${stat.user_id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-slate-400">
                      No invites yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invites */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Invitations</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">Inviter</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">Invited User</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Code</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Coins</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {invites.length > 0 ? (
                  invites.slice(0, 20).map((invite) => (
                    <tr key={invite.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 text-white">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded">{invite.inviter_id.slice(0, 8)}</code>
                      </td>
                      <td className="px-4 py-3 text-white">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded">{invite.invited_user_id.slice(0, 8)}</code>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded">{invite.invite_code}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            invite.active
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {invite.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white font-medium">{invite.coins_earned}</td>
                      <td className="px-4 py-3 text-right text-slate-300 text-sm">
                        {new Date(invite.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-slate-400">
                      No invitations yet
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
