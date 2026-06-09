'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiUsers, FiUserCheck, FiUserX, FiDollarSign, FiUserPlus,
  FiRefreshCw, FiChevronLeft, FiChevronRight, FiClock,
  FiAward, FiArrowLeft, FiGift, FiActivity
} from 'react-icons/fi';
interface UserInfo {
  user_id: string;
  username: string;
  avatar: string | null;
  joined_at: string | null;
}
interface UserStats {
  total_invites: number;
  active_invites: number;
  left_invites: number;
  bonus_invites: number;
  fake_invites: number;
  coins_earned: number;
  coins_per_invite: number;
}
interface InviteRecord {
  id: string;
  invited_user_id: string;
  invited_username: string;
  invited_avatar: string | null;
  invite_code: string;
  joined_at: string;
  left_at: string | null;
  active: boolean;
  coins_earned: number;
}
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export default function UserInviteDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<UserStats>({
    total_invites: 0,
    active_invites: 0,
    left_invites: 0,
    bonus_invites: 0,
    fake_invites: 0,
    coins_earned: 0,
    coins_per_invite: 100,
  });
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'left'>('all');
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/signin');
    }
    if (status === 'authenticated' && session?.user) {
      const perms = (session.user as any).permissions;
      if (!perms?.hasFullAccess && !perms?.hasSrModAccess) {
        router.push('/admin/casino');
      }
    }
  }, [status, session, router]);
  const fetchUserInvites = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      const response = await fetch(`/api/economy/invites/${userId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setUser(data.user);
      setStats(data.stats);
      setInvites(data.invites);
      setPagination(data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user invites:', error);
      setLoading(false);
    }
  }, [userId, pagination.page, pagination.limit, filterStatus]);
  useEffect(() => {
    if (status === 'authenticated' && userId) {
      fetchUserInvites();
    }
  }, [status, userId, fetchUserInvites]);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };
  if (status === 'loading' || loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading inviter details...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {}
        <Link
          href="/admin/casino/economy/invites"
          className="inline-flex items-center gap-2 text-purple-500 hover:text-purple-400 mb-6 apple-transition"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Invite Dashboard
        </Link>
        {}
        <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-[var(--shadow-md)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {}
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.username || 'User'}
                width={96}
                height={96}
                className="rounded-full ring-4 ring-purple-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center ring-4 ring-purple-500/20">
                <FiUsers className="w-10 h-10 text-purple-500" />
              </div>
            )}
            {}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
                {user?.username || 'Unknown User'}
              </h1>
              <p className="text-[rgb(var(--color-text-tertiary))] font-mono text-sm mb-4">
                ID: {userId}
              </p>
              {}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgb(var(--color-bg-tertiary))] rounded-lg">
                  <FiUserPlus className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-[rgb(var(--color-text-secondary))]">{stats.total_invites} total invites</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgb(var(--color-bg-tertiary))] rounded-lg">
                  <FiAward className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-[rgb(var(--color-text-secondary))]">{stats.coins_earned.toLocaleString()} 🪙 earned</span>
                </div>
              </div>
            </div>
            {}
            <button
              onClick={fetchUserInvites}
              className="flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        {}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 mb-2">
              <FiUsers className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Total</span>
            </div>
            <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{stats.total_invites}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 mb-2">
              <FiUserCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Active</span>
            </div>
            <p className="text-xl font-bold text-green-500">{stats.active_invites}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 mb-2">
              <FiGift className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Bonus</span>
            </div>
            <p className="text-xl font-bold text-purple-500">{stats.bonus_invites}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 mb-2">
              <FiActivity className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Fake</span>
            </div>
            <p className="text-xl font-bold text-orange-500">{stats.fake_invites}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 mb-2">
              <FiUserX className="w-4 h-4 text-red-500" />
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Left</span>
            </div>
            <p className="text-xl font-bold text-red-500">{stats.left_invites}</p>
          </div>
          <div className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-2 mb-2">
              <FiDollarSign className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Earned</span>
            </div>
            <p className="text-xl font-bold text-yellow-500">{stats.coins_earned.toLocaleString()} 🪙</p>
          </div>
        </div>
        {}
        <div className="glass-blue rounded-2xl p-4 sm:p-6 border border-[rgb(var(--color-border))] mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
            <FiAward className="w-5 h-5 text-yellow-500" />
            Reward Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4">
              <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-1">Reward per Invite</p>
              <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{stats.coins_per_invite} 🪙</p>
            </div>
            <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4">
              <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-1">From Active Invites</p>
              <p className="text-xl font-bold text-green-500">{(stats.active_invites * stats.coins_per_invite).toLocaleString()} 🪙</p>
            </div>
            <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4">
              <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-1">Total Earned</p>
              <p className="text-xl font-bold text-yellow-500">{stats.coins_earned.toLocaleString()} 🪙</p>
            </div>
          </div>
        </div>
        {}
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] shadow-[var(--shadow-md)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
              <FiUsers className="w-5 h-5" />
              Invited Members
            </h2>
            {}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium apple-transition ${
                  filterStatus === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                All ({stats.total_invites})
              </button>
              <button
                onClick={() => {
                  setFilterStatus('active');
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium apple-transition ${
                  filterStatus === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                Active ({stats.active_invites})
              </button>
              <button
                onClick={() => {
                  setFilterStatus('left');
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium apple-transition ${
                  filterStatus === 'left'
                    ? 'bg-red-500 text-white'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                Left ({stats.left_invites})
              </button>
            </div>
          </div>
          {}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgb(var(--color-border))]">
                  <th className="text-left px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Member</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Invite Code</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Status</th>
                  <th className="text-center px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Reward</th>
                  <th className="text-right px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Joined</th>
                  <th className="text-right px-4 py-3 text-[rgb(var(--color-text-tertiary))] font-semibold text-sm">Left</th>
                </tr>
              </thead>
              <tbody>
                {invites.length > 0 ? (
                  invites.map((invite) => (
                    <tr key={invite.id} className="border-b border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-hover))] apple-transition">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {invite.invited_avatar ? (
                            <Image
                              src={invite.invited_avatar}
                              alt={invite.invited_username}
                              width={36}
                              height={36}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <FiUsers className="w-4 h-4 text-blue-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[rgb(var(--color-text-primary))]">{invite.invited_username}</p>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">{invite.invited_user_id.slice(0, 12)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <code className="text-xs bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded">
                          {invite.invite_code}
                        </code>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            invite.active
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {invite.active ? (
                            <><FiUserCheck className="w-3 h-3" /> Active</>
                          ) : (
                            <><FiUserX className="w-3 h-3" /> Left</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-medium ${invite.active ? 'text-green-500' : 'text-red-500'}`}>
                          {invite.active ? '+' : '-'}{invite.coins_earned} 🪙
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-secondary))]">{formatRelativeDate(invite.joined_at)}</p>
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))]">{formatDate(invite.joined_at)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {invite.left_at ? (
                          <div>
                            <p className="text-sm text-red-400">{formatRelativeDate(invite.left_at)}</p>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))]">{formatDate(invite.left_at)}</p>
                          </div>
                        ) : (
                          <span className="text-[rgb(var(--color-text-tertiary))]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FiUsers className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-4" />
                      <p className="text-[rgb(var(--color-text-tertiary))]">
                        {filterStatus === 'all'
                          ? 'No invites recorded for this user'
                          : filterStatus === 'active'
                          ? 'No active invites'
                          : 'No members have left'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[rgb(var(--color-border))]">
              <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="p-2 bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg hover:border-purple-500/50 disabled:opacity-50 disabled:hover:border-[rgb(var(--color-border))] apple-transition"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-sm text-[rgb(var(--color-text-secondary))]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
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
      </div>
    </div>
  );
}