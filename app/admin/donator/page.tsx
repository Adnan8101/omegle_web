'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bold, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EntityDropdown, { EntityDropdownOption } from '@/components/ui/entity-dropdown';

interface Plan {
  id: string;
  guild_id: string;
  title: string;
  description: string;
  price: number;
  perks: string[];
  linked_role_id: string | null;
  enabled: boolean;
  paused: boolean;
  crypto_enabled?: boolean;
  price_crypto?: number | null;
  ozy_enabled?: boolean;
  price_ozy?: number | null;
  created_at: string;
  _count?: {
    subscriptions: number;
  };
}

interface GuildInfo {
  id: string;
  name: string;
}

interface RoleSearchResult {
  id: string;
  name: string;
  color?: number;
}

interface FormData {
  title: string;
  description: string;
  price: string;
  perks: string[];
  linked_role_id: string;
  enabled: boolean;
  crypto_enabled: boolean;
  price_crypto: string;
  ozy_enabled: boolean;
  price_ozy: string;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  price: '',
  perks: [''],
  linked_role_id: '',
  enabled: true,
  crypto_enabled: true,
  price_crypto: '',
  ozy_enabled: false,
  price_ozy: '',
};

const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function DonatorAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const GUILDS_CACHE_KEY = 'admin_guilds_cache_v1';
  const GUILDS_CACHE_TTL_MS = 60_000;
  const plansCacheKey = (selectedGuildId: string) => `donator_plans_cache_v1:${selectedGuildId}`;
  const PLANS_CACHE_TTL_MS = 30_000;

  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [guildId, setGuildId] = useState('');
  const [loadingGuilds, setLoadingGuilds] = useState(true);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [activePerkIndex, setActivePerkIndex] = useState<number | null>(0);
  const [fontSize, setFontSize] = useState('3');
  const [saving, setSaving] = useState(false);
  const perkEditorRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [roleLookup, setRoleLookup] = useState<Record<string, EntityDropdownOption>>({});
  const [selectedRoleOption, setSelectedRoleOption] = useState<EntityDropdownOption | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    if (!guildId) {
      setPlans([]);
      return;
    }

    fetchPlans(guildId);
  }, [guildId]);

  const activePlans = useMemo(() => plans.filter((p) => p.enabled && !p.paused).length, [plans]);
  const pausedPlans = useMemo(() => plans.filter((p) => p.paused).length, [plans]);
  const totalSubs = useMemo(() => plans.reduce((sum, p) => sum + (p._count?.subscriptions || 0), 0), [plans]);

  const fetchPlans = async (selectedGuildId: string) => {
    try {
      try {
        const cachedRaw = sessionStorage.getItem(plansCacheKey(selectedGuildId));
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { timestamp: number; plans: Plan[] };
          if (Date.now() - cached.timestamp < PLANS_CACHE_TTL_MS) {
            setPlans(Array.isArray(cached.plans) ? cached.plans : []);
            setLoadingPlans(false);
          }
        }
      } catch {
        
      }

      setLoadingPlans(true);
      setError('');

      const response = await fetch(`/api/donator/plans?guild_id=${encodeURIComponent(selectedGuildId)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch plans');
      }

      const nextPlans = Array.isArray(data?.data) ? data.data : [];
      setPlans(nextPlans);
      try {
        sessionStorage.setItem(
          plansCacheKey(selectedGuildId),
          JSON.stringify({ timestamp: Date.now(), plans: nextPlans })
        );
      } catch {
        
      }
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Failed to load plans');
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData(initialFormData);
    setSelectedRoleOption(null);
    setShowModal(true);
    setError('');
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      price: (plan.price / 100).toString(),
      perks: plan.perks?.length ? [...plan.perks] : [''],
      linked_role_id: plan.linked_role_id || '',
      enabled: plan.enabled,
      crypto_enabled: plan.crypto_enabled ?? true,
      price_crypto: plan.price_crypto != null ? (plan.price_crypto / 100).toString() : '',
      ozy_enabled: plan.ozy_enabled ?? false,
      price_ozy: plan.price_ozy != null ? String(plan.price_ozy) : '',
    });
    setSelectedRoleOption(
      plan.linked_role_id
        ? { id: plan.linked_role_id, name: plan.linked_role_id }
        : null
    );
    setActivePerkIndex(0);
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingPlan(null);
    setSelectedRoleOption(null);
    setActivePerkIndex(0);
    setFontSize('3');
  };

  const fetchRoleOptions = useCallback(async (query: string): Promise<EntityDropdownOption[]> => {
    if (!guildId) return [];

    return [{ id: query.trim(), name: query.trim() }];
  }, [guildId]);

  const resetFlashMessage = () => {
    setTimeout(() => setSuccess(''), 2600);
  };

  const handleSave = async () => {
    if (!guildId) {
      setError('Select a server first.');
      return;
    }

    const currentPerks = formData.perks.map((perk, index) => {
      const editor = perkEditorRefs.current[index];
      return editor ? editor.innerHTML : perk;
    });

    const parsedPrice = Number.parseFloat(formData.price);
    if (!formData.title.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !formData.linked_role_id.trim()) {
      setError('Title, valid price, and linked role ID are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        guild_id: guildId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Math.round(parsedPrice * 100),
        perks: currentPerks
          .map((item) => item.trim())
          .filter((item) => item !== ''),
        linked_role_id: formData.linked_role_id.trim(),
        enabled: formData.enabled,
        crypto_enabled: formData.crypto_enabled,
        price_crypto: formData.price_crypto.trim() ? Math.round(Number.parseFloat(formData.price_crypto) * 100) : null,
        ozy_enabled: formData.ozy_enabled,
        price_ozy: formData.price_ozy.trim() ? Math.round(Number.parseFloat(formData.price_ozy)) : null,
      };

      const response = editingPlan
        ? await fetch('/api/donator/plans', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, id: editingPlan.id }),
          })
        : await fetch('/api/donator/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save plan');
      }

      setSuccess(editingPlan ? 'Plan updated successfully.' : 'Plan created successfully.');
      closeModal();
      await fetchPlans(guildId);
      resetFlashMessage();
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const runPerkCommand = (command: 'bold' | 'italic' | 'underline' | 'fontSize', value?: string) => {
    document.execCommand(command, false, value);
  };

  const updatePerk = (index: number) => {
    const editor = perkEditorRefs.current[index];
    if (!editor) return;
    const html = editor.innerHTML;
    setFormData((prev) => {
      const nextPerks = [...prev.perks];
      nextPerks[index] = html;
      return { ...prev, perks: nextPerks };
    });
  };

  const addPerk = () => {
    setFormData((prev) => ({ ...prev, perks: [...prev.perks, ''] }));
    setActivePerkIndex(formData.perks.length);
  };

  const removePerk = (index: number) => {
    setFormData((prev) => {
      const next = prev.perks.filter((_, i) => i !== index);
      return { ...prev, perks: next.length ? next : [''] };
    });
    setActivePerkIndex((prev) => {
      if (prev === null) return 0;
      if (index === prev) return 0;
      return prev > index ? prev - 1 : prev;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan and linked subscriptions?')) return;

    try {
      setSaving(true);
      setError('');

      const response = await fetch(`/api/donator/plans?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete plan');
      }

      setSuccess('Plan deleted successfully.');
      await fetchPlans(guildId);
      resetFlashMessage();
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Failed to delete plan');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async (plan: Plan) => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/donator/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, paused: !plan.paused }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update plan');
      }

      setSuccess(plan.paused ? 'Plan resumed.' : 'Plan paused.');
      await fetchPlans(guildId);
      resetFlashMessage();
    } catch (toggleError: any) {
      setError(toggleError?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loadingGuilds) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-4" />
          <p className="text-[rgb(var(--color-text-secondary))] text-base font-medium">Loading donator plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Donator Plans</h1>
          <p className="text-base text-[rgb(var(--color-text-secondary))] mt-1">Manage plans, linked roles, and subscription lifecycle.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              href="/admin/donator/subscriptions"
              prefetch
              className="inline-flex items-center px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-semibold apple-transition"
            >
              Subscriptions
            </Link>
            <Link
              href="/admin/donator/payments"
              prefetch
              className="inline-flex items-center px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] font-semibold apple-transition"
            >
              Payments
            </Link>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition"
        >
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Active Plans</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">{activePlans}</p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Paused Plans</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">{pausedPlans}</p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Active Subscriptions</p>
          <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">{totalSubs}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg space-y-3">
        <label className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] block">Select Server</label>
        <EntityDropdown
          options={guilds.map((guild) => ({ id: guild.id, name: guild.name }))}
          selectedIds={guildId ? [guildId] : []}
          onChange={(values) => setGuildId(values[0] || '')}
          multiple={false}
          placeholder="Choose a mutual server"
          searchPlaceholder="Search servers"
        />
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">
          Only mutual servers where your account and bot both exist are shown.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30">
          {error}
        </div>
      )}

      {!guildId ? (
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-6 bg-[rgb(var(--color-bg-secondary))] text-center text-[rgb(var(--color-text-secondary))]">
          Select a server to view and manage donator plans.
        </div>
      ) : loadingPlans ? (
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-8 text-center bg-[rgb(var(--color-bg-secondary))]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--color-accent))] border-t-transparent mx-auto mb-3" />
          <p className="text-[rgb(var(--color-text-secondary))]">Loading plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-8 text-center bg-[rgb(var(--color-bg-secondary))]">
          <p className="text-[rgb(var(--color-text-secondary))] mb-3">No plans found for this server.</p>
          <button
            onClick={openCreateModal}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2"
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-2xl border border-[rgb(var(--color-border))] p-5 bg-[rgb(var(--color-bg-secondary))]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))]">{plan.title}</h3>
                    <p className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mt-2">{formatUsd(plan.price)}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.paused
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : plan.enabled
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-gray-500/20 text-[rgb(var(--color-text-secondary))]'
                    }`}
                  >
                    {plan.paused ? 'Paused' : plan.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-3">{plan.description}</p>
                )}

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Perks</p>
                  <ul className="space-y-2 text-sm text-[rgb(var(--color-text-secondary))]">
                    {(plan.perks || []).slice(0, 4).map((perk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-400">✓</span>
                        <span dangerouslySetInnerHTML={{ __html: perk }} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] px-3 py-2 text-sm text-[rgb(var(--color-text-secondary))]">
                  Active subscriptions: <span className="font-semibold text-[rgb(var(--color-text-primary))]">{plan._count?.subscriptions || 0}</span>
                </div>
                {(plan.ozy_enabled || plan.price_ozy != null) && (
                  <div className="mt-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] px-3 py-2 text-sm text-[rgb(var(--color-text-secondary))]">
                    Ozy checkout: <span className="font-semibold text-[rgb(var(--color-text-primary))]">{plan.ozy_enabled ? 'Enabled' : 'Disabled'}</span>
                    {plan.price_ozy != null && (
                      <span className="ml-2 text-[rgb(var(--color-text-primary))]">({plan.price_ozy.toLocaleString()} Ozy)</span>
                    )}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 apple-transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleTogglePause(plan)}
                    className={`rounded-xl text-sm font-semibold py-2 ${
                      plan.paused ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    }`}
                  >
                    {plan.paused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 apple-transition"
                  >
                    Delete
                  </button>
                </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center" onClick={closeModal}>
            <div
              className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="px-6 py-5 border-b border-[rgb(var(--color-border))] flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                  Configure title, pricing, role, and perks for this donator plan.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 rounded-xl border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-primary))] inline-flex items-center justify-center"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="space-y-4 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Plan Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm"
                    placeholder="Premium Supporter"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm"
                    rows={4}
                    placeholder="Plan description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Price (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Crypto Price USD (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_crypto}
                      onChange={(event) => setFormData((prev) => ({ ...prev, price_crypto: event.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm"
                      placeholder="Leave blank to use base price"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Ozy Price (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price_ozy}
                    onChange={(event) => setFormData((prev) => ({ ...prev, price_ozy: event.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm"
                    placeholder="Example: 5000"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Linked Role ID</label>
                  <EntityDropdown
                    options={[]}
                    selectedIds={formData.linked_role_id ? [formData.linked_role_id] : []}
                    selectedOptions={selectedRoleOption ? [selectedRoleOption] : []}
                    onChange={(values) => {
                      const roleId = values[0] || '';
                      setFormData((prev) => ({ ...prev, linked_role_id: roleId }));
                      setSelectedRoleOption(roleId ? (roleLookup[roleId] || { id: roleId, name: roleId }) : null);
                    }}
                    multiple={false}
                    placeholder="Search and select linked role"
                    searchPlaceholder="Search roles"
                    fetchOptions={fetchRoleOptions}
                    disabled={!guildId}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4">
                <label className="block text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Perks Editor</label>

                <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-3 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="icon" onClick={() => runPerkCommand('bold')} title="Bold">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => runPerkCommand('italic')} title="Italic">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => runPerkCommand('underline')} title="Underline">
                      <Underline className="h-4 w-4" />
                    </Button>
                    <div className="w-36">
                      <EntityDropdown
                        options={[
                          { id: '1', name: 'XS' },
                          { id: '2', name: 'SM' },
                          { id: '3', name: 'Base' },
                          { id: '4', name: 'LG' },
                          { id: '5', name: 'XL' },
                        ]}
                        selectedIds={[fontSize]}
                        onChange={(values) => {
                          const next = values[0] || '3';
                          setFontSize(next);
                          runPerkCommand('fontSize', next);
                        }}
                        multiple={false}
                        placeholder="Font size"
                        searchPlaceholder="Search size"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {formData.perks.map((perk, index) => (
                      <div key={`perk-${index}`} className="flex items-start gap-2">
                        <div className="w-6 text-xs text-[rgb(var(--color-text-tertiary))] pt-2">{index + 1}.</div>
                        <div
                          id={`perk-editor-${index}`}
                          contentEditable
                          ref={(element) => {
                            perkEditorRefs.current[index] = element;
                          }}
                          suppressContentEditableWarning
                          onFocus={() => setActivePerkIndex(index)}
                          onBlur={() => updatePerk(index)}
                          dangerouslySetInnerHTML={{ __html: perk }}
                          className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <Button variant="destructive" size="icon" onClick={() => removePerk(index)} title="Remove perk">
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={addPerk}>
                    Add Perk
                  </Button>
                </div>

                <label className="inline-flex items-center gap-3 text-sm text-[rgb(var(--color-text-primary))]">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(event) => setFormData((prev) => ({ ...prev, enabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Plan enabled
                </label>
                <label className="inline-flex items-center gap-3 text-sm text-[rgb(var(--color-text-primary))]">
                  <input
                    type="checkbox"
                    checked={formData.crypto_enabled}
                    onChange={(event) => setFormData((prev) => ({ ...prev, crypto_enabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Enable Crypto Payments (NowPayments)
                </label>
                <label className="inline-flex items-center gap-3 text-sm text-[rgb(var(--color-text-primary))]">
                  <input
                    type="checkbox"
                    checked={formData.ozy_enabled}
                    onChange={(event) => setFormData((prev) => ({ ...prev, ozy_enabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Enable Ozy Balance Purchase
                </label>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                  Price preview: {formData.price && !Number.isNaN(Number.parseFloat(formData.price))
                    ? formatUsd(Math.round(Number.parseFloat(formData.price) * 100))
                    : '$0.00'}
                  {formData.crypto_enabled && (
                    <span className="block mt-1">
                      Crypto price preview: {formData.price_crypto && !Number.isNaN(Number.parseFloat(formData.price_crypto))
                        ? formatUsd(Math.round(Number.parseFloat(formData.price_crypto) * 100))
                        : (formData.price && !Number.isNaN(Number.parseFloat(formData.price)) ? formatUsd(Math.round(Number.parseFloat(formData.price) * 100)) : '$0.00')}
                    </span>
                  )}
                  {formData.ozy_enabled && (
                    <span className="block mt-1">
                      Ozy price preview: {formData.price_ozy && !Number.isNaN(Number.parseFloat(formData.price_ozy))
                        ? `${Math.round(Number.parseFloat(formData.price_ozy)).toLocaleString()} Ozy`
                        : 'Not configured'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[rgb(var(--color-border))] flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={closeModal}
                className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] px-5 py-2.5 font-semibold text-[rgb(var(--color-text-primary))]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-5 py-2.5 font-semibold text-white"
              >
                {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
            </div>
        </div>
      )}
    </div>
  );
}
