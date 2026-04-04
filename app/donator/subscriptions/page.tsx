'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

interface Plan {
  id: string;
  title: string;
  description: string | null;
  price: number;
  linked_role_id: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
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

interface Subscription {
  id: string;
  guild_id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  expiry_date: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  plan: Plan;
  user_profile?: UserProfile;
  payment_details?: PaymentDetails | null;
}

const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function StatusPill({ status }: { status: Subscription['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-green-500/20 text-green-300 border border-green-500/40'
      : status === 'cancelled'
      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';

  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

export default function DonatorSubscriptionsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const guildId = searchParams.get('guild_id') || '';

  const fetchSubscriptions = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
      });
      if (guildId) params.set('guild_id', guildId);

      const response = await fetch(`/api/donator/subscriptions?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch subscriptions');

      setSubscriptions(Array.isArray(data?.data) ? data.data : []);
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Failed to load subscriptions');
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [status, guildId]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const activeCount = useMemo(() => subscriptions.filter((s) => s.status === 'active').length, [subscriptions]);

  if (status === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-4" />
          <p className="text-[rgb(var(--color-text-secondary))]">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">Sign in to view subscriptions</h1>
          <p className="text-[rgb(var(--color-text-secondary))] mt-2">You need your Discord account to view payment and role details.</p>
          <button
            onClick={() => signIn('discord')}
            className="mt-5 inline-flex items-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold"
          >
            Sign in with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[rgb(var(--color-text-primary))]">My Subscriptions</h1>
          <p className="text-[rgb(var(--color-text-secondary))] mt-2">Track your donator plans, expiry date, and role access.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/donator"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-semibold"
          >
            Back to Plans
          </Link>
          <button
            onClick={fetchSubscriptions}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg">
        <div className="flex items-center gap-4">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt="Profile"
              className="h-14 w-14 rounded-full border border-[rgb(var(--color-border))] object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))]" />
          )}
          <div>
            <p className="text-base font-semibold text-[rgb(var(--color-text-primary))]">{session?.user?.name || 'Discord User'}</p>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] font-mono">Discord ID: {(session?.user as any)?.id || '-'}</p>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">Active subscriptions: {activeCount}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-apple-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-3" />
            <p className="text-[rgb(var(--color-text-secondary))]">Loading subscriptions...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-10 text-center text-[rgb(var(--color-text-secondary))]">No subscriptions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead className="bg-[rgb(var(--color-bg-secondary))] border-b border-[rgb(var(--color-border))]">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">User</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Plan</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Status</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Started</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Expires</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Role ID</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-[rgb(var(--color-border))] last:border-b-0 hover:bg-[rgb(var(--color-bg-secondary))]/50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        {sub.user_profile?.avatar ? (
                          <img src={sub.user_profile.avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-[rgb(var(--color-bg-tertiary))]" />
                        )}
                        <div>
                          <p className="font-semibold text-[rgb(var(--color-text-primary))]">{sub.user_profile?.displayName || sub.user_profile?.username || 'Discord User'}</p>
                          <p className="text-xs font-mono text-[rgb(var(--color-text-secondary))]">{sub.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-semibold text-[rgb(var(--color-text-primary))]">{sub.plan?.title || '-'}</p>
                      <p className="text-xs text-[rgb(var(--color-text-secondary))]">{formatUsd(sub.plan?.price || 0)} / 30 days</p>
                    </td>
                    <td className="px-4 py-3 text-sm"><StatusPill status={sub.status} /></td>
                    <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">{new Date(sub.start_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">{sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'Lifetime'}</td>
                    <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] font-mono">{sub.plan?.linked_role_id || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={`/api/donator/invoice/${sub.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] hover:bg-[rgb(var(--color-hover))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--color-text-primary))]"
                      >
                        Download PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
