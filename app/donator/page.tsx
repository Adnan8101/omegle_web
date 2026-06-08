'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiCheck, FiStar, FiShield, FiZap } from 'react-icons/fi';

interface Plan {
  id: string;
  title: string;
  description: string;
  price: number;
  perks: string[];
  enabled: boolean;
  paused: boolean;
  crypto_enabled?: boolean;
  price_crypto?: number | null;
  ozy_enabled?: boolean;
  price_ozy?: number | null;
}

interface GuildInfo {
  id: string;
  name: string;
}

declare global {
  interface Window { Razorpay: any; }
}

const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function ensureRazorpayLoaded(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpay = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(script);
  });
}

export default function DonatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [useMutualServers, setUseMutualServers] = useState(true);
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [guildId, setGuildId] = useState('');
  const [planList, setPlanList] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cryptoMin, setCryptoMin] = useState<string | null>(null);
  const [showMethodModal, setShowMethodModal] = useState<{ plan: Plan } | null>(null);
  const [showOzyConfirmModal, setShowOzyConfirmModal] = useState<{ plan: Plan } | null>(null);
  const [ozyBalance, setOzyBalance] = useState(0);
  const [ozyCurrencyName, setOzyCurrencyName] = useState('Ozy');
  const [ozyCurrencyEmoji, setOzyCurrencyEmoji] = useState('🪙');
  const [loadingOzyBalance, setLoadingOzyBalance] = useState(false);

  useEffect(() => {
    fetch('/api/donator/crypto-min')
      .then(res => res.json())
      .then(data => data?.min_amount && setCryptoMin(data.min_amount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramGuild = params.get('guild');
    if (paramGuild) { setGuildId(paramGuild); setUseMutualServers(false); return; }
    const sessionGuildId = (session?.user as any)?.guild_id as string | undefined;
    if (sessionGuildId) setGuildId(sessionGuildId);
  }, [session]);

  useEffect(() => {
    if (!useMutualServers || status !== 'authenticated') return;
    const fetchMutualGuilds = async () => {
      try {
        setLoadingGuilds(true);
        const response = await fetch('/api/automod/guilds');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Failed to load mutual servers');
        const items: GuildInfo[] = Array.isArray(data?.guilds) ? data.guilds : [];
        setGuilds(items);
        if (!guildId) {
          const sessionGuildId = (session?.user as any)?.guild_id as string | undefined;
          const fallback = items.find((item) => item.id === sessionGuildId)?.id || items[0]?.id || '';
          setGuildId(fallback);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load mutual servers');
      } finally {
        setLoadingGuilds(false);
      }
    };
    fetchMutualGuilds();
  }, [useMutualServers, status, session, guildId]);

  useEffect(() => {
    if (!guildId) { setPlanList([]); return; }
    fetchPlans(guildId);
  }, [guildId]);

  useEffect(() => {
    if (status !== 'authenticated' || !guildId) {
      setOzyBalance(0);
      return;
    }

    const fetchOzyBalance = async () => {
      try {
        setLoadingOzyBalance(true);
        const response = await fetch(`/api/donator/ozy-balance?guild_id=${encodeURIComponent(guildId)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const payload = data?.data || {};
        setOzyBalance(Number(payload.balance || 0));
        setOzyCurrencyName(String(payload.currency_name || 'Ozy'));
        setOzyCurrencyEmoji(String(payload.currency_emoji || '🪙'));
      } catch {
        
      } finally {
        setLoadingOzyBalance(false);
      }
    };

    fetchOzyBalance();
  }, [status, guildId]);

  const plans = useMemo(() => planList.filter((p) => p.enabled && !p.paused), [planList]);

  const fetchPlans = async (guild: string) => {
    try {
      setLoadingPlans(true);
      setError('');
      const response = await fetch(`/api/donator/plans?guild_id=${encodeURIComponent(guild)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch plans');
      setPlanList(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load plans');
      setPlanList([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleBuyClick = (plan: Plan) => {
    if (status !== 'authenticated') { signIn('discord'); return; }
    if (!guildId.trim()) { setError('Select a server before subscribing.'); return; }

     const hasExtraMethod = plan.crypto_enabled !== false || Boolean(plan.ozy_enabled);
     if (hasExtraMethod) {
       setShowMethodModal({ plan });
    } else {
       initiateRazorpay(plan);
    }
  };

  const initiateCrypto = async (plan: Plan) => {
    try {
      setProcessingPlan(plan.id);
      setError('');
      setPaymentSuccess(false);
      const response = await fetch('/api/donator/payments/nowpayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId.trim(), plan_id: plan.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to initialize crypto checkout');
      
      if (data?.data?.invoice_url) {
        window.location.href = data.data.invoice_url;
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to initiate payment');
      setProcessingPlan(null);
    }
  };

  const initiateOzy = async (plan: Plan) => {
    try {
      setProcessingPlan(plan.id);
      setError('');
      setPaymentSuccess(false);

      const response = await fetch('/api/donator/payments/ozy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId.trim(), plan_id: plan.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to process Ozy payment');

      setPaymentSuccess(true);
      if (typeof data?.data?.balance_after === 'number') {
        setOzyBalance(data.data.balance_after);
      }

      const next = guildId ? `/donator/subscriptions?guild_id=${encodeURIComponent(guildId)}` : '/donator/subscriptions';
      const redirectUrl = typeof data?.data?.redirect_url === 'string' ? data.data.redirect_url : next;
      setTimeout(() => router.push(redirectUrl), 800);
      if (guildId) fetchPlans(guildId);
    } catch (e: any) {
      setError(e?.message || 'Failed to process Ozy purchase');
    } finally {
      setProcessingPlan(null);
    }
  };

  const initiateRazorpay = async (plan: Plan) => {
    try {
      setProcessingPlan(plan.id);
      setError('');
      setPaymentSuccess(false);
      const response = await fetch('/api/donator/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId.trim(), plan_id: plan.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to create payment order');
      await ensureRazorpayLoaded();
      const orderData = data.data;
      const options = {
        key: orderData.key,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Omeglee Donator',
        description: `${orderData.planName} — ${orderData.planPrice} / 30 days`,
        prefill: { email: session?.user?.email || '', contact: '' },
        handler: (responsePayload: any) => {
          verifyPayment(
            responsePayload.razorpay_payment_id,
            orderData.orderId,
            responsePayload.razorpay_signature
          );
        },
        theme: { color: '#2563eb' },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (e: any) {
      setError(e?.message || 'Failed to initiate payment');
    } finally {
      setProcessingPlan(null);
    }
  };

  const verifyPayment = async (paymentId: string, orderId: string, signature?: string) => {
    try {
      setError('');
      const response = await fetch('/api/donator/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Payment verification failed');
      setPaymentSuccess(true);
      const next = guildId ? `/donator/subscriptions?guild_id=${encodeURIComponent(guildId)}` : '/donator/subscriptions';
      setTimeout(() => router.push(next), 800);
      if (guildId) fetchPlans(guildId);
    } catch (e: any) {
      setError(e?.message || 'Payment verification error');
    }
  };

  const featureIcons = [
    { icon: <FiShield className="w-6 h-6" />, label: 'Secure Checkout', desc: 'Razorpay-powered with server-side verification.' },
    { icon: <FiZap className="w-6 h-6" />, label: 'Instant Activation', desc: 'Active immediately for cards, or upon blockchain confirmation for crypto.' },
    { icon: <FiStar className="w-6 h-6" />, label: '30-Day Access', desc: 'Every subscription runs for a full 30 days.' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Support Omeglee</h1>
          <p className="text-base text-[rgb(var(--color-text-secondary))] mt-1">Choose a plan and activate your donator role instantly.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-semibold apple-transition"
            >
              Back to Home
            </Link>
            {status !== 'authenticated' && (
              <button
                onClick={() => signIn('discord')}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold apple-transition"
              >
                Sign in with Discord
              </button>
            )}
          </div>
        </div>
      </div>

        {}
        {paymentSuccess && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-green-700 dark:text-green-300 flex items-center gap-3">
            <FiCheck className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Payment successful! Redirecting you to your subscription details.</span>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {}
        {status === 'authenticated' ? (
          <section className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg">
            <h2 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))]">Purchasing As</h2>
            <div className="mt-4 flex items-center gap-4">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Discord avatar"
                  className="h-14 w-14 rounded-full border border-[rgb(var(--color-border))] object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))]" />
              )}
              <div>
                <p className="text-base font-semibold text-[rgb(var(--color-text-primary))]">{session?.user?.name || 'Discord User'}</p>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] font-mono">User ID: {(session?.user as any)?.id || '-'}</p>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                  Ozy Balance: {loadingOzyBalance ? 'Loading...' : `${ozyCurrencyEmoji} ${ozyBalance.toLocaleString()} ${ozyCurrencyName}`}
                </p>
                {session?.user?.email ? (
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">{session.user.email}</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg">
            <h2 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))]">Sign in required</h2>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-2">Please sign in with Discord to continue. We need your Discord account to assign roles and show your subscription details.</p>
            <button
              onClick={() => signIn('discord')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold text-sm apple-transition"
            >
              Sign in with Discord
            </button>
          </section>
        )}

        {}
        <section className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))]">Select Server</h2>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-0.5">Choose which server to activate perks for.</p>
            </div>
            <label className="inline-flex items-center gap-3 text-sm text-[rgb(var(--color-text-primary))] cursor-pointer">
              <div
                onClick={() => status === 'authenticated' && setUseMutualServers(!useMutualServers)}
                className={`relative w-12 h-6 rounded-full apple-transition cursor-pointer ${status !== 'authenticated' ? 'opacity-50 cursor-not-allowed' : ''} ${useMutualServers ? 'bg-blue-600' : 'bg-[rgb(var(--color-bg-tertiary))]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md apple-transition ${useMutualServers ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              My mutual servers
            </label>
          </div>

          {useMutualServers ? (
            status !== 'authenticated' ? (
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-5">
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-3">Sign in to see servers shared with the bot.</p>
                <button
                  onClick={() => signIn('discord')}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold text-sm apple-transition"
                >
                  Sign in with Discord
                </button>
              </div>
            ) : loadingGuilds ? (
              <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent flex-shrink-0" />
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">Loading mutual servers...</p>
              </div>
            ) : (
              <select
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-base"
              >
                <option value="">Choose a mutual server</option>
                {guilds.map((guild) => (
                  <option key={guild.id} value={guild.id}>{guild.name}</option>
                ))}
              </select>
            )
          ) : (
            <div className="space-y-2">
              <input
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                placeholder="Enter Discord server ID"
                className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-base"
              />
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Manual mode — paste a server ID directly.</p>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={() => guildId && fetchPlans(guildId)}
              disabled={!guildId || loadingPlans}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition"
            >
              {loadingPlans ? 'Loading...' : 'Load Plans'}
            </button>
          </div>
        </section>

        {}
        {loadingPlans ? (
          <section className="rounded-2xl border border-[rgb(var(--color-border))] p-10 bg-[rgb(var(--color-bg-secondary))] text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-3" />
            <p className="text-[rgb(var(--color-text-secondary))]">Loading premium plans...</p>
          </section>
        ) : plans.length === 0 && guildId ? (
          <section className="rounded-2xl border border-[rgb(var(--color-border))] p-10 bg-[rgb(var(--color-bg-secondary))] text-center">
            <FiStar className="w-10 h-10 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
            <p className="text-[rgb(var(--color-text-secondary))]">No active plans available for this server.</p>
          </section>
        ) : plans.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 mb-12">
            {plans.map((plan, index) => {
              const isHighlighted = index === Math.floor(plans.length / 2);
              return (
                <article
                  key={plan.id}
                  className={`rounded-2xl border p-6 sm:p-7 apple-transition ${
                    isHighlighted
                      ? 'bg-blue-600 text-white border-blue-500 shadow-apple-md'
                      : 'bg-[rgb(var(--color-bg-secondary))] border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]'
                  }`}
                >
                  {isHighlighted && (
                    <span className="inline-flex items-center gap-1.5 mb-4 text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                      <FiStar className="w-3 h-3" /> Most Popular
                    </span>
                  )}

                  <h2 className="text-2xl font-bold tracking-tight">{plan.title}</h2>
                  {plan.description && (
                    <p className={`mt-2 text-sm ${isHighlighted ? 'text-white/85' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                      {plan.description}
                    </p>
                  )}

                  <div className="mt-5">
                    <p className="text-4xl font-extrabold leading-none">{formatUsd(plan.price)}</p>
                    <p className={`mt-1.5 text-sm ${isHighlighted ? 'text-white/80' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                      per 30 days
                    </p>
                    {plan.ozy_enabled && plan.price_ozy != null && (
                      <p className={`mt-1.5 text-xs ${isHighlighted ? 'text-white/80' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                        Ozy option: {ozyCurrencyEmoji} {plan.price_ozy.toLocaleString()} {ozyCurrencyName}
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className={`text-xs uppercase tracking-wider font-semibold mb-3 ${isHighlighted ? 'text-white/70' : 'text-[rgb(var(--color-text-tertiary))]'}`}>
                      Included Perks
                    </p>
                    <ul className="space-y-2.5">
                      {plan.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <FiCheck className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHighlighted ? 'text-white' : 'text-blue-500'}`} />
                          <span dangerouslySetInnerHTML={{ __html: perk }} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleBuyClick(plan)}
                    disabled={processingPlan === plan.id}
                    className={`mt-7 w-full rounded-2xl font-bold py-3.5 apple-transition active:scale-95 ${
                      isHighlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50 disabled:bg-blue-100'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white shadow-apple-sm hover:shadow-blue-glow'
                    }`}
                  >
                    {processingPlan === plan.id
                      ? 'Processing...'
                      : status === 'authenticated'
                      ? 'Subscribe — 30 Days'
                      : 'Sign in to Subscribe'}
                  </button>
                </article>
              );
            })}
          </section>
        ) : null}

        {}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {featureIcons.map((f, i) => (
            <div key={i} className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 flex items-start gap-4">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-[rgb(var(--color-text-primary))]">{f.label}</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

      {showMethodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-[rgb(var(--color-text-primary))]">Select Payment Method</h3>
            <div className="space-y-3">
              <button 
                onClick={() => { setShowMethodModal(null); initiateRazorpay(showMethodModal.plan); }}
                className="w-full text-left p-4 rounded-xl border border-blue-500/30 hover:border-blue-500 bg-blue-500/10 transition group"
              >
                <div className="font-bold text-[rgb(var(--color-text-primary))] group-hover:text-blue-500 flex justify-between items-center">
                   Razorpay (Card/UPI/Netbanking)
                   <span>{formatUsd(showMethodModal.plan.price)}</span>
                </div>
                <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">Instant activation in INR.</div>
              </button>
              
              {showMethodModal.plan.crypto_enabled !== false && (
                <button 
                  onClick={() => { setShowMethodModal(null); initiateCrypto(showMethodModal.plan); }}
                  className="w-full text-left p-4 rounded-xl border border-orange-500/30 hover:border-orange-500 bg-orange-500/10 transition group"
                >
                  <div className="font-bold text-[rgb(var(--color-text-primary))] group-hover:text-orange-500 flex justify-between items-center">
                     Crypto (BTC, ETH, LTC, USDT)
                     <span>{formatUsd(showMethodModal.plan.price_crypto || showMethodModal.plan.price)}</span>
                  </div>
                  <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                     Via NowPayments. Activation usually within 5-15 mins.
                     {cryptoMin && <p className="text-orange-400/90 text-[11px] mt-1.5 font-semibold">Minimum transaction of ~${cryptoMin} recommended.</p>}
                  </div>
                </button>
              )}

              {showMethodModal.plan.ozy_enabled && showMethodModal.plan.price_ozy != null && (
                <button
                  onClick={() => {
                    const plan = showMethodModal.plan;
                    setShowMethodModal(null);
                    setShowOzyConfirmModal({ plan });
                  }}
                  className="w-full text-left p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 transition group"
                >
                  <div className="font-bold text-[rgb(var(--color-text-primary))] group-hover:text-emerald-500 flex justify-between items-center">
                    Pay from {ozyCurrencyName} Balance
                    <span>{ozyCurrencyEmoji} {showMethodModal.plan.price_ozy.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                    Instant deduction from your account balance and immediate activation.
                  </div>
                </button>
              )}
            </div>
            <button 
              onClick={() => setShowMethodModal(null)}
              className="mt-5 w-full py-3 rounded-xl border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] font-semibold hover:bg-[rgb(var(--color-bg-primary))]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showOzyConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-[rgb(var(--color-text-primary))]">Confirm Ozy Purchase</h3>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">
              You are about to buy <span className="font-semibold text-[rgb(var(--color-text-primary))]">{showOzyConfirmModal.plan.title}</span> using your Ozy balance.
            </p>

            <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--color-text-secondary))]">Current Balance</span>
                <span className="font-semibold text-[rgb(var(--color-text-primary))]">{ozyCurrencyEmoji} {ozyBalance.toLocaleString()} {ozyCurrencyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--color-text-secondary))]">Plan Cost</span>
                <span className="font-semibold text-[rgb(var(--color-text-primary))]">{ozyCurrencyEmoji} {(showOzyConfirmModal.plan.price_ozy || 0).toLocaleString()} {ozyCurrencyName}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[rgb(var(--color-border))] pt-2">
                <span className="text-[rgb(var(--color-text-secondary))]">Balance After</span>
                <span className="font-semibold text-[rgb(var(--color-text-primary))]">
                  {ozyCurrencyEmoji} {Math.max(0, ozyBalance - Number(showOzyConfirmModal.plan.price_ozy || 0)).toLocaleString()} {ozyCurrencyName}
                </span>
              </div>
            </div>

            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-3">
              This action deducts balance instantly and activates your subscription immediately.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowOzyConfirmModal(null)}
                className="py-3 rounded-xl border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] font-semibold hover:bg-[rgb(var(--color-bg-primary))]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const plan = showOzyConfirmModal.plan;
                  setShowOzyConfirmModal(null);
                  initiateOzy(plan);
                }}
                disabled={processingPlan === showOzyConfirmModal.plan.id || ozyBalance < Number(showOzyConfirmModal.plan.price_ozy || 0)}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold"
              >
                {processingPlan === showOzyConfirmModal.plan.id ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
