'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, RefreshCw, ShieldX } from 'lucide-react';

interface GuildInfo {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
}

interface RoleDetails {
  id: string;
  name: string | null;
}

interface PaymentDetails {
  payment_id: string;
  order_id: string;
  amount: number;
  amount_usd: number;
  currency: string;
  status: string;
  method: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  guild_id: string;
  title: string;
  description: string | null;
  price: number;
  perks: string[];
  linked_role_id: string | null;
  enabled: boolean;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  guild_id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  expiry_date: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  plan: Plan;
  user_profile?: UserProfile;
  role_details?: RoleDetails | null;
  payment_details?: PaymentDetails | null;
}

type StatusFilter = 'all' | 'active' | 'cancelled' | 'revoked' | 'expired';

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const inr = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

const dateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

function StatusPill({ status, revoked }: { status: Subscription['status']; revoked: boolean }) {
  if (revoked) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40">revoked</span>;
  }
  if (status === 'active') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/40">active</span>;
  }
  if (status === 'expired') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">expired</span>;
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/40">cancelled</span>;
}

export default function DonatorSubscriptionsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [guildId, setGuildId] = useState('');
  const [loadingGuilds, setLoadingGuilds] = useState(true);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<Subscription | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const loadGuilds = async () => {
      try {
        setLoadingGuilds(true);
        setError('');

        const response = await fetch('/api/automod/guilds');
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load servers');
        }

        const items: GuildInfo[] = Array.isArray(data?.guilds) ? data.guilds : [];
        setGuilds(items);
        setGuildId((prev) => prev || items[0]?.id || '');
      } catch (guildError: any) {
        setError(guildError?.message || 'Failed to load servers');
      } finally {
        setLoadingGuilds(false);
      }
    };

    loadGuilds();
  }, [status]);

  const fetchSubscriptions = useCallback(async () => {
    if (!guildId) {
      setSubscriptions([]);
      setTotal(0);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        guild_id: guildId,
        limit: String(limit),
        offset: String(offset),
      });

      if (statusFilter === 'active') params.set('status', 'active');
      if (statusFilter === 'cancelled' || statusFilter === 'revoked') params.set('status', 'cancelled');
      if (statusFilter === 'expired') params.set('status', 'expired');

      const trimmed = search.trim();
      if (trimmed) {
        params.set('user_search', trimmed);
        params.set('plan', trimmed);
      }

      const response = await fetch(`/api/donator/subscriptions?${params.toString()}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch subscriptions');
      }

      const rows: Subscription[] = Array.isArray(data?.data) ? data.data : [];
      setSubscriptions(rows);
      setTotal(Number(data?.pagination?.total || rows.length));
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Failed to load subscriptions');
      setSubscriptions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [guildId, limit, offset, statusFilter, search]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchSubscriptions();
  }, [status, fetchSubscriptions]);

  const isRevoked = (item: Subscription) => item.status === 'cancelled' && Boolean(item.cancelled_by);

  const visibleSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return subscriptions.filter((item) => {
      if (statusFilter === 'cancelled' && isRevoked(item)) return false;
      if (statusFilter === 'revoked' && !isRevoked(item)) return false;

      if (!term) return true;

      const haystack = [
        item.id,
        item.user_id,
        item.plan_id,
        item.payment_id || '',
        item.plan?.title || '',
        item.user_profile?.displayName || '',
        item.user_profile?.username || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [subscriptions, search, statusFilter]);

  const stats = useMemo(() => {
    const active = subscriptions.filter((item) => item.status === 'active').length;
    const cancelled = subscriptions.filter((item) => item.status === 'cancelled' && !isRevoked(item)).length;
    const revoked = subscriptions.filter((item) => isRevoked(item)).length;
    const expired = subscriptions.filter((item) => item.status === 'expired').length;

    return { active, cancelled, revoked, expired };
  }, [subscriptions]);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const setFilter = (next: StatusFilter) => {
    setStatusFilter(next);
    setOffset(0);
  };

  const handleRevoke = async (subscription: Subscription) => {
    if (subscription.status === 'cancelled') return;

    try {
      setRevokingId(subscription.id);
      setError('');
      setNotice('');

      const response = await fetch('/api/donator/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscription.id,
          reason: revokeReason.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to revoke subscription');
      }

      setNotice('Subscription revoked successfully.');
      setRevokeReason('');
      await fetchSubscriptions();

      if (selected?.id === subscription.id) {
        setSelected(null);
      }
    } catch (revokeError: any) {
      setError(revokeError?.message || 'Failed to revoke subscription');
    } finally {
      setRevokingId(null);
    }
  };

  if (status === 'loading' || loadingGuilds) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto" />
          <p className="text-[rgb(var(--color-text-secondary))]">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[rgb(var(--color-text-primary))]">Donator Subscriptions</h1>
          <p className="mt-2 text-[rgb(var(--color-text-secondary))]">Review active, cancelled, and revoked subscriptions with full database details.</p>
        </div>
        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] disabled:opacity-60 px-4 py-2 text-sm font-semibold text-[rgb(var(--color-text-primary))]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Active</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-1">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Cancelled</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-1">{stats.cancelled}</p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Revoked</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-1">{stats.revoked}</p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Expired</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-1">{stats.expired}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[rgb(var(--color-text-primary))] mb-2">Select Server</label>
            <select
              value={guildId}
              onChange={(event) => {
                setGuildId(event.target.value);
                setOffset(0);
              }}
              className="w-full rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] px-4 py-3 text-[rgb(var(--color-text-primary))]"
            >
              <option value="">Choose a mutual server</option>
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[rgb(var(--color-text-primary))] mb-2">Search User / Plan / IDs</label>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder="username, display name, user id, plan, payment id"
              className="w-full rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] px-4 py-3 text-[rgb(var(--color-text-primary))]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'cancelled', 'revoked', 'expired'] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilter(filter)}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-hover))]'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-700 dark:text-green-300">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-apple-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-3" />
            <p className="text-[rgb(var(--color-text-secondary))]">Loading subscriptions...</p>
          </div>
        ) : visibleSubscriptions.length === 0 ? (
          <div className="p-10 text-center text-[rgb(var(--color-text-secondary))]">No subscriptions found for this selection.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="border-b border-[rgb(var(--color-border))]">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">User</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Plan</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Status</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Role</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Start</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Expiry</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Payment</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubscriptions.map((item) => {
                    const revoked = isRevoked(item);
                    const canRevoke = item.status !== 'cancelled';

                    return (
                      <tr key={item.id} className="border-b border-[rgb(var(--color-border))] last:border-b-0">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            {item.user_profile?.avatar ? (
                              <img src={item.user_profile.avatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-[rgb(var(--color-bg-tertiary))]" />
                            )}
                            <div>
                              <p className="font-semibold text-[rgb(var(--color-text-primary))]">
                                {item.user_profile?.displayName || item.user_profile?.username || 'Discord User'}
                              </p>
                              <p className="text-xs font-mono text-[rgb(var(--color-text-secondary))]">{item.user_id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <p className="font-semibold text-[rgb(var(--color-text-primary))]">{item.plan?.title || '-'}</p>
                          <p className="text-xs text-[rgb(var(--color-text-secondary))]">{usd(item.plan?.price || 0)}</p>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <StatusPill status={item.status} revoked={revoked} />
                        </td>

                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">
                          {item.role_details?.name || item.role_details?.id || item.plan?.linked_role_id || '-'}
                        </td>

                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">{dateTime(item.start_date)}</td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">{dateTime(item.expiry_date)}</td>

                        <td className="px-4 py-3 text-sm">
                          {item.payment_details ? (
                            <div>
                              <p className="text-[rgb(var(--color-text-primary))] font-semibold">{usd(item.payment_details.amount_usd)} / {inr(item.payment_details.amount)}</p>
                              <p className="text-xs text-[rgb(var(--color-text-secondary))]">{item.payment_details.status}</p>
                            </div>
                          ) : (
                            <span className="text-[rgb(var(--color-text-secondary))]">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelected(item)}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))]"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleRevoke(item)}
                              disabled={!canRevoke || revokingId === item.id}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ShieldX className="h-4 w-4" />
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-4 border-t border-[rgb(var(--color-border))] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                Showing {Math.min(offset + 1, total)} - {Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                  disabled={offset === 0}
                  className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] disabled:opacity-50 px-4 py-2 text-sm font-semibold text-[rgb(var(--color-text-primary))]"
                >
                  Previous
                </button>
                <span className="text-sm text-[rgb(var(--color-text-secondary))]">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setOffset((prev) => prev + limit)}
                  disabled={page >= totalPages}
                  className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] disabled:opacity-50 px-4 py-2 text-sm font-semibold text-[rgb(var(--color-text-primary))]"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-apple-xl">
            <div className="px-5 py-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Subscription Details</h2>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">Clean review view with all available details in plain language.</p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setRevokeReason('');
                }}
                className="rounded-lg px-3 py-2 border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))]"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              <div className="flex items-center gap-4">
                {selected.user_profile?.avatar ? (
                  <img src={selected.user_profile.avatar} alt="avatar" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-[rgb(var(--color-bg-tertiary))]" />
                )}
                <div>
                  <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">
                    {selected.user_profile?.displayName || selected.user_profile?.username || 'Discord User'}
                  </p>
                  <p className="text-sm text-[rgb(var(--color-text-secondary))]">@{selected.user_profile?.username || 'unknown'}</p>
                  <p className="font-mono text-xs text-[rgb(var(--color-text-tertiary))]">User ID: {selected.user_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[rgb(var(--color-border))] p-4">
                  <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-3">Subscription Fields</p>
                  <div className="space-y-2 text-sm text-[rgb(var(--color-text-secondary))]">
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">id:</span> {selected.id}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">guild_id:</span> {selected.guild_id}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">user_id:</span> {selected.user_id}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">plan_id:</span> {selected.plan_id}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">status:</span> {selected.status}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">start_date:</span> {dateTime(selected.start_date)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">expiry_date:</span> {dateTime(selected.expiry_date)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">cancelled_at:</span> {dateTime(selected.cancelled_at)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">cancelled_by:</span> {selected.cancelled_by || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">payment_id:</span> {selected.payment_id || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">created_at:</span> {dateTime(selected.created_at)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">updated_at:</span> {dateTime(selected.updated_at)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[rgb(var(--color-border))] p-4">
                  <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-3">Plan Fields</p>
                  <div className="space-y-2 text-sm text-[rgb(var(--color-text-secondary))]">
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">id:</span> {selected.plan?.id || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">guild_id:</span> {selected.plan?.guild_id || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">title:</span> {selected.plan?.title || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">description:</span> {selected.plan?.description || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">price:</span> {selected.plan?.price ? `${usd(selected.plan.price)} (${selected.plan.price} cents)` : '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">linked_role_id:</span> {selected.plan?.linked_role_id || '-'}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">enabled:</span> {String(selected.plan?.enabled)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">paused:</span> {String(selected.plan?.paused)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">created_at:</span> {dateTime(selected.plan?.created_at)}</p>
                    <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">updated_at:</span> {dateTime(selected.plan?.updated_at)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[rgb(var(--color-border))] p-4 shadow-sm bg-[rgb(var(--color-bg-primary))]">
                  <p className="text-xs uppercase tracking-wider font-semibold text-[rgb(var(--color-text-tertiary))] mb-4">User Details</p>
                  {selected.user_profile ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {selected.user_profile.avatar ? (
                          <img src={selected.user_profile.avatar} alt="Avatar" className="h-12 w-12 rounded-full object-cover shadow-sm ring-1 ring-[rgb(var(--color-border))]" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-[rgb(var(--color-bg-tertiary))] shadow-sm ring-1 ring-[rgb(var(--color-border))]" />
                        )}
                        <div>
                          <p className="text-base font-bold text-[rgb(var(--color-text-primary))]">
                            {selected.user_profile.displayName || 'No Display Name'}
                          </p>
                          <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">@{selected.user_profile.username || 'unknown'}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[rgb(var(--color-border))]">
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Discord ID</p>
                        <p className="font-mono text-sm text-[rgb(var(--color-text-primary))] bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded inline-block">{selected.user_profile.id}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24">
                      <p className="text-sm text-[rgb(var(--color-text-secondary))]">No extra user details available.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[rgb(var(--color-border))] p-4 shadow-sm bg-[rgb(var(--color-bg-primary))]">
                  <p className="text-xs uppercase tracking-wider font-semibold text-[rgb(var(--color-text-tertiary))] mb-4">Transaction Hub</p>
                  {selected.payment_details ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          selected.payment_details.status === 'captured' || selected.payment_details.status === 'successful' || selected.payment_details.status === 'active'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {selected.payment_details.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Method</p>
                        <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))] uppercase bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded inline-block">{selected.payment_details.method || 'UNKNOWN'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Amount Paid</p>
                        <p className="text-base font-bold text-[rgb(var(--color-text-primary))]">{usd(selected.payment_details.amount_usd)} <span className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] ml-1">({inr(selected.payment_details.amount)})</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Date</p>
                        <p className="text-sm font-medium text-[rgb(var(--color-text-primary))]">{new Date(selected.payment_details.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="col-span-2 pt-3 border-t border-[rgb(var(--color-border))] space-y-2">
                        <div>
                          <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Payment ID</p>
                          <p className="font-mono text-xs text-[rgb(var(--color-text-primary))] bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded truncate" title={selected.payment_details.payment_id}>{selected.payment_details.payment_id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-1">Order ID</p>
                          <p className="font-mono text-xs text-[rgb(var(--color-text-primary))] bg-[rgb(var(--color-bg-secondary))] px-2 py-1 rounded truncate" title={selected.payment_details.order_id}>{selected.payment_details.order_id}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24">
                      <p className="text-sm text-[rgb(var(--color-text-secondary))]">No payment transaction linked.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[rgb(var(--color-border))] p-4">
                <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-3">Plan Perks</p>
                {selected.plan?.perks?.length ? (
                  <ul className="space-y-2 text-sm text-[rgb(var(--color-text-secondary))] list-disc pl-5">
                    {selected.plan.perks.map((perk, index) => (
                      <li key={`${selected.id}-perk-${index}`}>{perk.replace(/<[^>]*>/g, '').trim() || perk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[rgb(var(--color-text-secondary))]">No perks configured.</p>
                )}
              </div>

              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-300">Revoke This Subscription</p>
                <textarea
                  value={revokeReason}
                  onChange={(event) => setRevokeReason(event.target.value)}
                  placeholder="Optional reason shown to the user in DM"
                  rows={3}
                  className="w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] px-4 py-3 text-sm text-[rgb(var(--color-text-primary))]"
                />
                <button
                  onClick={() => handleRevoke(selected)}
                  disabled={selected.status === 'cancelled' || revokingId === selected.id}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-red-500/40 text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <ShieldX className="h-4 w-4" />
                  {selected.status === 'cancelled' ? 'Already Cancelled' : revokingId === selected.id ? 'Revoking...' : 'Revoke Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
