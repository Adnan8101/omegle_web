'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserInvite {
  id: string;
  invited_user_id: string;
  invite_code: string;
  joined_at: string;
  left_at: string | null;
  active: boolean;
  coins_earned: number;
}

interface UserStats {
  total_invites: number;
  active_invites: number;
  coins_earned: number;
}

export default function UserInviteDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total_invites: 0,
    active_invites: 0,
    coins_earned: 0,
  });

  // Check permissions
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/signin');
    }
    if (status === 'authenticated' && session?.user) {
      const perms = (session.user as any).permissions;
      if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
        router.push('/admin');
      }
    }
  }, [status, session, router]);

  // Fetch user's invites
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserInvites();
      const interval = setInterval(fetchUserInvites, 5000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const fetchUserInvites = async () => {
    try {
      const response = await fetch(`/api/economy/invites/${params.userId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setInvites(data.invites);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user invites:', error);
      setLoading(false);
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/casino/economy/invites" className="text-blue-400 hover:text-blue-300 mb-4 block">
            ← Back to Invites
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Inviter Details</h1>
          <p className="text-slate-400">
            User ID: <code className="bg-slate-900 px-2 py-1 rounded">{params.userId}</code>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Invites</p>
            <p className="text-3xl font-bold text-white">{stats.total_invites}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Active Invites</p>
            <p className="text-3xl font-bold text-green-400">{stats.active_invites}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Coins Earned</p>
            <p className="text-3xl font-bold text-white">{stats.coins_earned} 🪙</p>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">All Invitations</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold">Invited User</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Invite Code</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Coins Earned</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold">Joined Date</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold">Left Date</th>
                </tr>
              </thead>
              <tbody>
                {invites.length > 0 ? (
                  invites.map((invite) => (
                    <tr key={invite.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3 text-white">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded">{invite.invited_user_id}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <code className="text-sm bg-slate-900 px-2 py-1 rounded text-slate-300">
                          {invite.invite_code}
                        </code>
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
                      <td className="px-4 py-3 text-center text-slate-300 text-sm">
                        {new Date(invite.joined_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 text-sm">
                        {invite.left_at ? new Date(invite.left_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-slate-400">
                      No invitations
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
