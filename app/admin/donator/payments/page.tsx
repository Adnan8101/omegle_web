'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EntityDropdown from '@/components/ui/entity-dropdown';

interface Payment {
  id: string;
  razorpay_id: string | null;
  razorpay_order_id: string;
  user_id: string;
  amount_usd: number;
  amount: number;
  currency?: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'error';
  method: string | null;
  user_profile?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
  };
  plan: {
    title: string;
  };
  created_at: string;
}

interface GuildInfo {
  id: string;
  name: string;
}

const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatInr = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
const formatSettlement = (payment: Payment) => {
  if (payment.currency === 'OZY') return `${Number(payment.amount || 0).toLocaleString()} Ozy`;
  return formatInr(payment.amount);
};

export default function DonatorPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const GUILDS_CACHE_KEY = 'admin_guilds_cache_v1';
  const GUILDS_CACHE_TTL_MS = 60_000;

  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [guildId, setGuildId] = useState('');
  const [loadingGuilds, setLoadingGuilds] = useState(true);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('captured');
  const [searchUserId, setSearchUserId] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
      return;
    }

    if (status !== 'authenticated') return;

    const loadGuilds = async () => {
      try {
        try {
          const cachedRaw = sessionStorage.getItem(GUILDS_CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { timestamp: number; guilds: GuildInfo[] };
            if (Date.now() - cached.timestamp < GUILDS_CACHE_TTL_MS && cached.guilds.length > 0) {
              setGuilds(cached.guilds);
              const sessionGuildId = (session?.user as any)?.guild_id as string | undefined;
              const fallbackGuildId = cached.guilds.find((g) => g.id === sessionGuildId)?.id || cached.guilds[0]?.id || '';
              setGuildId((prev) => prev || fallbackGuildId);
              setLoadingGuilds(false);
            }
          }
        } catch {
          
        }

        setLoadingGuilds(true);
        const response = await fetch('/api/automod/guilds');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load servers');
        }

        const items: GuildInfo[] = Array.isArray(data?.guilds) ? data.guilds : [];
        setGuilds(items);
        try {
          sessionStorage.setItem(
            GUILDS_CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), guilds: items })
          );
        } catch {
          
        }

        const sessionGuildId = (session?.user as any)?.guild_id as string | undefined;
        const fallbackGuildId = items.find((g) => g.id === sessionGuildId)?.id || items[0]?.id || '';
        setGuildId((prev) => prev || fallbackGuildId);
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load servers');
      } finally {
        setLoadingGuilds(false);
      }
    };

    loadGuilds();
  }, [status, session, router]);

  useEffect(() => {
    if (!guildId) return;
    fetchPayments();
  }, [guildId, statusFilter, offset]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        guild_id: guildId,
        limit: String(limit),
        offset: String(offset),
      });

      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchUserId.trim()) params.set('user_id', searchUserId.trim());

      const response = await fetch(`/api/donator/payments?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch payments');
      }

      setPayments(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.pagination?.total || 0));
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    const term = searchUserId.trim();
    if (!term) return payments;
    return payments.filter((payment) => payment.user_id.includes(term));
  }, [payments, searchUserId]);

  const stats = useMemo(() => {
    const totalUsdCents = filteredPayments.reduce((sum, payment) => sum + payment.amount_usd, 0);
    const totalInrPaise = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const count = filteredPayments.length;

    return {
      totalUsd: totalUsdCents / 100,
      totalInr: totalInrPaise / 100,
      count,
      avgUsd: count ? totalUsdCents / count / 100 : 0,
    };
  }, [filteredPayments]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;

  const getStatusBadge = (paymentStatus: Payment['status']) => {
    if (paymentStatus === 'captured') return 'bg-green-500/20 text-green-300';
    if (paymentStatus === 'authorized') return 'bg-blue-500/20 text-blue-300';
    if (paymentStatus === 'created') return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  };

  if (status === 'loading' || loadingGuilds) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-4" />
          <p className="text-[rgb(var(--color-text-secondary))]">Loading payment dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
        <div className="mb-7">
          <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">Donator Payments</h1>
          <p className="text-[rgb(var(--color-text-secondary))] mt-2">Track all Razorpay transactions and payment health.</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
            <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Total USD</p>
            <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">${stats.totalUsd.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
            <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Total INR</p>
            <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">₹{stats.totalInr.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
            <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Transactions</p>
            <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">{stats.count}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
            <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Avg USD</p>
            <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">${stats.avgUsd.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--color-text-primary))] mb-2">Select Server</label>
              <EntityDropdown
                options={guilds.map((guild) => ({ id: guild.id, name: guild.name }))}
                selectedIds={guildId ? [guildId] : []}
                onChange={(values) => {
                  setGuildId(values[0] || '');
                  setOffset(0);
                }}
                multiple={false}
                placeholder="Choose a mutual server"
                searchPlaceholder="Search servers"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--color-text-primary))] mb-2">Status</label>
              <EntityDropdown
                options={[
                  { id: 'captured', name: 'Captured' },
                  { id: 'authorized', name: 'Authorized' },
                  { id: 'created', name: 'Created' },
                  { id: 'failed', name: 'Failed' },
                  { id: 'error', name: 'Error' },
                  { id: 'all', name: 'All' },
                ]}
                selectedIds={[statusFilter]}
                onChange={(values) => {
                  setStatusFilter(values[0] || 'all');
                  setOffset(0);
                }}
                multiple={false}
                placeholder="Select status"
                searchPlaceholder="Search status"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--color-text-primary))] mb-2">Search User ID</label>
              <input
                value={searchUserId}
                onChange={(event) => {
                  setSearchUserId(event.target.value);
                  setOffset(0);
                }}
                placeholder="Discord user id"
                className="w-full rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] px-4 py-3 text-[rgb(var(--color-text-primary))]"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-300 dark:border-red-700 bg-red-100/70 dark:bg-red-900/30 px-4 py-3 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-apple-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-3" />
              <p className="text-[rgb(var(--color-text-secondary))]">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-10 text-center text-[rgb(var(--color-text-secondary))]">
              No payments found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead className="bg-[rgb(var(--color-bg-secondary))] border-b border-[rgb(var(--color-border))]">
                    <tr className="text-left">
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Order</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">User</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Plan</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Amount</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Status</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Method</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[rgb(var(--color-border))] last:border-b-0">
                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] font-mono">
                          {payment.razorpay_order_id.slice(0, 14)}...
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            {payment.user_profile?.avatar ? (
                              <img src={payment.user_profile.avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-[rgb(var(--color-bg-tertiary))]" />
                            )}
                            <div>
                              <p className="text-[rgb(var(--color-text-primary))] font-semibold">{payment.user_profile?.displayName || payment.user_profile?.username || 'Discord User'}</p>
                              <p className="text-[rgb(var(--color-text-secondary))] font-mono text-xs">{payment.user_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-primary))]">{payment.plan?.title || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-semibold text-[rgb(var(--color-text-primary))]">{formatUsd(payment.amount_usd)}</p>
                          <p className="text-[rgb(var(--color-text-tertiary))]">{formatSettlement(payment)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">{payment.method || '-'}</td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">
                          {new Date(payment.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
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
    </div>
  );
}
