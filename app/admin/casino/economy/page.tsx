'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiDollarSign, FiSettings, FiToggleLeft, FiToggleRight,
  FiMessageSquare, FiMic, FiLayers, FiSlash, FiShoppingCart,
  FiChevronLeft, FiSave, FiRefreshCw, FiSearch, FiPlus, FiX,
  FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiCheck, FiAlertCircle
} from 'react-icons/fi';

interface EconomyConfig {
  guild_id: string;
  messages_per_point: number;
  min_message_length: number;
  message_cooldown: number;
  daily_message_cap: number;
  minutes_per_point: number;
  daily_voice_cap: number;
  require_two_members: boolean;
  ignore_afk_channel: boolean;
  ignore_self_muted: boolean;
  currency_name: string;
  currency_emoji: string;
  leaderboard_sync: boolean;
  enabled: boolean;
  advanced_mode: boolean;
  shop_enabled: boolean;
  afk_channel_id?: string | null;
}

interface CategoryReward {
  id: string;
  categoryId: string;
  categoryName: string;
  vcEnabled: boolean;
  vcMinutesPerPoint: number;
  messageEnabled: boolean;
  messagesPerPoint: number;
}

interface Category {
  id: string;
  name: string;
  position: number;
}

interface Channel {
  id: string;
  name: string;
  parentId: string | null;
  parentName?: string;
  type: 'text' | 'voice';
}

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface BlacklistedItem {
  id: string;
  name: string;
  type?: string;
  color?: number;
}

interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  enabled: boolean;
}

type TabType = 'basic' | 'advanced' | 'blacklist' | 'shop';

export default function EconomyManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Config state
  const [config, setConfig] = useState<EconomyConfig | null>(null);

  // Categories & rewards state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryRewards, setCategoryRewards] = useState<CategoryReward[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryReward, setNewCategoryReward] = useState<Partial<CategoryReward> | null>(null);

  // Blacklist state
  const [blacklistSearch, setBlacklistSearch] = useState('');
  const [blacklistTab, setBlacklistTab] = useState<'channels' | 'categories' | 'roles'>('channels');
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [blacklistedChannels, setBlacklistedChannels] = useState<BlacklistedItem[]>([]);
  const [blacklistedCategories, setBlacklistedCategories] = useState<BlacklistedItem[]>([]);
  const [blacklistedRoles, setBlacklistedRoles] = useState<BlacklistedItem[]>([]);

  // Shop state
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopEnabled, setShopEnabled] = useState(true);

  // AFK channel state
  const [afkChannels, setAfkChannels] = useState<Channel[]>([]);
  
  // Blacklist modal state
  const [blacklistModal, setBlacklistModal] = useState<{ type: 'channels' | 'categories' | 'roles' } | null>(null);

  // Permission state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Permission check
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setIsRedirecting(true);
      router.push('/admin');
      return;
    }
    
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      const canAccess = perms?.hasFullAccess || perms?.hasCasinoAccess;
      
      if (!canAccess) {
        setHasPermission(false);
        if (perms?.hasModeratorAccess || perms?.hasViewOnlyAccess) {
          setIsRedirecting(true);
          router.push('/admin/vctranscript');
        } else {
          setIsRedirecting(true);
          router.push('/admin');
        }
        return;
      }
      
      setHasPermission(true);
    }
  }, [status, session, router]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/config');
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setCategoryRewards(data.categoryRewards || []);
        // Load AFK channels
        if (data.afkChannels) {
          setAfkChannels(data.afkChannels);
        }
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/categories');
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
        setCategoryRewards(data.categoryRewards || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchBlacklist = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/blacklist');
      const data = await res.json();
      if (res.ok) {
        setAvailableChannels([...data.available.textChannels, ...data.available.voiceChannels]);
        setAvailableCategories(data.available.categories);
        setAvailableRoles(data.available.roles);
        setBlacklistedChannels(data.blacklisted.channels);
        setBlacklistedCategories(data.blacklisted.categories);
        setBlacklistedRoles(data.blacklisted.roles);
      }
    } catch (err) {
      console.error('Error fetching blacklist:', err);
    }
  }, []);

  const fetchShopItems = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/shop-toggle');
      const data = await res.json();
      if (res.ok) {
        setShopItems(data.items || []);
        setShopEnabled(data.shopEnabled);
      }
    } catch (err) {
      console.error('Error fetching shop items:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchConfig(),
        fetchCategories(),
        fetchBlacklist(),
        fetchShopItems()
      ]);
      setLoading(false);
    };
    
    if (status === 'authenticated' && hasPermission) {
      loadData();
    }
  }, [status, hasPermission, fetchConfig, fetchCategories, fetchBlacklist, fetchShopItems]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/economy/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveCategoryReward = async (reward: Partial<CategoryReward>) => {
    try {
      const res = await fetch('/api/economy/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reward)
      });

      if (res.ok) {
        await fetchCategories();
        setEditingCategory(null);
        setNewCategoryReward(null);
        setSuccess('Category reward saved!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save category reward');
    }
  };

  const deleteCategoryReward = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/economy/categories?categoryId=${categoryId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchCategories();
        setSuccess('Category reward removed!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to remove category reward');
    }
  };

  const addToBlacklist = async (type: string, id: string, channelType?: string) => {
    try {
      const res = await fetch('/api/economy/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, channelType })
      });

      if (res.ok) {
        await fetchBlacklist();
        setSuccess('Added to blacklist!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to add to blacklist');
    }
  };

  const removeFromBlacklist = async (type: string, id: string) => {
    try {
      const res = await fetch(`/api/economy/blacklist?type=${type}&id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchBlacklist();
        setSuccess('Removed from blacklist!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to remove from blacklist');
    }
  };

  const toggleShop = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/economy/shop-toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'shop', enabled })
      });

      if (res.ok) {
        setShopEnabled(enabled);
        setSuccess(enabled ? 'Shop enabled!' : 'Shop disabled!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to toggle shop');
    }
  };

  const toggleShopItem = async (itemId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/economy/shop-toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'item', itemId, enabled })
      });

      if (res.ok) {
        setShopItems(items => 
          items.map(item => 
            item.id === itemId ? { ...item, enabled } : item
          )
        );
      }
    } catch (err) {
      setError('Failed to toggle item');
    }
  };

  const filteredAvailableChannels = availableChannels.filter(ch =>
    !blacklistedChannels.find(b => b.id === ch.id) &&
    ch.name.toLowerCase().includes(blacklistSearch.toLowerCase())
  );

  const filteredAvailableCategories = availableCategories.filter(cat =>
    !blacklistedCategories.find(b => b.id === cat.id) &&
    cat.name.toLowerCase().includes(blacklistSearch.toLowerCase())
  );

  const filteredAvailableRoles = availableRoles.filter(role =>
    !blacklistedRoles.find(b => b.id === role.id) &&
    role.name.toLowerCase().includes(blacklistSearch.toLowerCase())
  );

  // Show loading spinner during auth check
  if (status === 'loading' || hasPermission === null || isRedirecting) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (hasPermission === false) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-4">
        <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="text-red-500 text-5xl">❌</div>
            <div>
              <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                Access Denied
              </h2>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                You don&apos;t have permission to access the Casino Economy Dashboard. You need to be a Server Admin or have the Casino Admin role.
              </p>
            </div>
            <button
              onClick={() => {
                const perms = session?.user?.permissions;
                if (perms?.hasModeratorAccess || perms?.hasViewOnlyAccess) {
                  router.replace('/admin/vctranscript');
                } else {
                  router.replace('/admin');
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading for data fetch
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading economy settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/admin/casino"
            className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              Coins Management
            </h1>
            <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
              Configure currency earning rates and restrictions
            </p>
          </div>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 flex items-center gap-2">
            <FiCheck className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))]">
        {[
          { id: 'basic', label: 'Basic Settings', icon: <FiSettings className="w-4 h-4" /> },
          { id: 'advanced', label: 'Category Rewards', icon: <FiLayers className="w-4 h-4" /> },
          { id: 'blacklist', label: 'Blacklist', icon: <FiSlash className="w-4 h-4" /> },
          { id: 'shop', label: 'Shop Settings', icon: <FiShoppingCart className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Basic Settings Tab */}
      {activeTab === 'basic' && config && (
        <div className="space-y-6">
          {/* Economy Toggle */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Economy System</h2>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Enable or disable the economy system</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`p-3 rounded-xl transition-all ${
                  config.enabled
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}
              >
                {config.enabled ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <FiMic className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Voice Chat Rewards</h2>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Configure VC-based currency earning</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Currency per Minutes
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[rgb(var(--color-text-primary))]">1</span>
                  <span className="text-[rgb(var(--color-text-tertiary))]">{config.currency_name} per</span>
                  <input
                    type="number"
                    min="1"
                    value={config.minutes_per_point}
                    onChange={(e) => setConfig({ ...config, minutes_per_point: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                  />
                  <span className="text-[rgb(var(--color-text-tertiary))]">minutes</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Daily Voice Cap
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.daily_voice_cap}
                  onChange={(e) => setConfig({ ...config, daily_voice_cap: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                  placeholder="100"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[rgb(var(--color-bg-tertiary))]">
                <span className="text-[rgb(var(--color-text-secondary))]">Require 2+ members in VC</span>
                <button
                  onClick={() => setConfig({ ...config, require_two_members: !config.require_two_members })}
                  className={`p-2 rounded-lg transition-all ${
                    config.require_two_members ? 'bg-green-500/20 text-green-500' : 'bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-tertiary))]'
                  }`}
                >
                  {config.require_two_members ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[rgb(var(--color-bg-tertiary))]">
                <span className="text-[rgb(var(--color-text-secondary))]">Ignore AFK channel</span>
                <button
                  onClick={() => setConfig({ ...config, ignore_afk_channel: !config.ignore_afk_channel })}
                  className={`p-2 rounded-lg transition-all ${
                    config.ignore_afk_channel ? 'bg-green-500/20 text-green-500' : 'bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-tertiary))]'
                  }`}
                >
                  {config.ignore_afk_channel ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                </button>
              </div>

              {config.ignore_afk_channel && (
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Select AFK Channel
                  </label>
                  <select
                    value={config.afk_channel_id || ''}
                    onChange={(e) => setConfig({ ...config, afk_channel_id: e.target.value || null })}
                    className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                  >
                    <option value="">No AFK Channel Selected</option>
                    {afkChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                    Members in this channel won&apos;t earn currency
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Message Settings */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <FiMessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Message Rewards</h2>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Configure message-based currency earning</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Currency per Messages
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[rgb(var(--color-text-primary))]">1</span>
                  <span className="text-[rgb(var(--color-text-tertiary))]">{config.currency_name} per</span>
                  <input
                    type="number"
                    min="1"
                    value={config.messages_per_point}
                    onChange={(e) => setConfig({ ...config, messages_per_point: parseInt(e.target.value) || 25 })}
                    className="w-20 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                  />
                  <span className="text-[rgb(var(--color-text-tertiary))]">messages</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Min Message Length
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.min_message_length}
                  onChange={(e) => setConfig({ ...config, min_message_length: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Cooldown (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.message_cooldown}
                  onChange={(e) => setConfig({ ...config, message_cooldown: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Daily Message Cap
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.daily_message_cap}
                  onChange={(e) => setConfig({ ...config, daily_message_cap: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Advanced Mode Toggle */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <FiLayers className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Advanced Mode</h2>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                    Set different reward rates per category
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfig({ ...config, advanced_mode: !config.advanced_mode })}
                className={`p-3 rounded-xl transition-all ${
                  config.advanced_mode
                    ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                    : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] border border-[rgb(var(--color-border))]'
                }`}
              >
                {config.advanced_mode ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            {config.advanced_mode && (
              <p className="mt-4 text-sm text-yellow-500/80 bg-yellow-500/10 p-3 rounded-xl">
                Advanced mode is enabled. Go to the "Category Rewards" tab to configure per-category rates.
              </p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? (
                <FiRefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <FiSave className="w-5 h-5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Advanced/Category Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {!config?.advanced_mode ? (
            <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] text-center">
              <FiLayers className="w-16 h-16 mx-auto mb-4 text-[rgb(var(--color-text-tertiary))]" />
              <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Advanced Mode Disabled</h2>
              <p className="text-[rgb(var(--color-text-secondary))] mb-6">
                Enable advanced mode in Basic Settings to configure per-category reward rates.
              </p>
              <button
                onClick={() => {
                  if (config) {
                    setConfig({ ...config, advanced_mode: true });
                    saveConfig();
                  }
                  setActiveTab('basic');
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
              >
                Enable Advanced Mode
              </button>
            </div>
          ) : (
            <>
              {/* Category Rewards List */}
              <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Category Rewards</h2>
                  <button
                    onClick={() => setNewCategoryReward({})}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>

                {/* New Category Form */}
                {newCategoryReward && (
                  <div className="mb-6 p-4 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-green-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">New Category Reward</h3>
                      <button
                        onClick={() => setNewCategoryReward(null)}
                        className="p-1 rounded-lg hover:bg-[rgb(var(--color-bg-primary))]"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={newCategoryReward.categoryId || ''}
                        onChange={(e) => {
                          const cat = categories.find(c => c.id === e.target.value);
                          setNewCategoryReward({
                            ...newCategoryReward,
                            categoryId: e.target.value,
                            categoryName: cat?.name
                          });
                        }}
                        className="px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                      >
                        <option value="">Select Category</option>
                        {categories
                          .filter(cat => !categoryRewards.find(cr => cr.categoryId === cat.id))
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                        }
                      </select>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-[rgb(var(--color-text-tertiary))]">VC min/point</label>
                          <input
                            type="number"
                            min="1"
                            value={newCategoryReward.vcMinutesPerPoint || 1}
                            onChange={(e) => setNewCategoryReward({
                              ...newCategoryReward,
                              vcMinutesPerPoint: parseInt(e.target.value) || 1
                            })}
                            className="w-full px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-[rgb(var(--color-text-tertiary))]">Msgs/point</label>
                          <input
                            type="number"
                            min="1"
                            value={newCategoryReward.messagesPerPoint || 25}
                            onChange={(e) => setNewCategoryReward({
                              ...newCategoryReward,
                              messagesPerPoint: parseInt(e.target.value) || 25
                            })}
                            className="w-full px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => {
                          if (newCategoryReward.categoryId) {
                            saveCategoryReward({
                              ...newCategoryReward,
                              vcEnabled: true,
                              messageEnabled: true
                            });
                          }
                        }}
                        disabled={!newCategoryReward.categoryId}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all disabled:opacity-50"
                      >
                        <FiCheck className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Category Rewards */}
                <div className="space-y-3">
                  {categoryRewards.length === 0 ? (
                    <p className="text-center text-[rgb(var(--color-text-tertiary))] py-8">
                      No category rewards configured. Add one above.
                    </p>
                  ) : (
                    categoryRewards.map(reward => (
                      <div
                        key={reward.id}
                        className="p-4 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <FiLayers className="w-5 h-5 text-purple-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">
                              {reward.categoryName || `Category ${reward.categoryId}`}
                            </h3>
                            <div className="flex gap-4 text-sm text-[rgb(var(--color-text-tertiary))]">
                              <span>VC: 1/{reward.vcMinutesPerPoint}m</span>
                              <span>•</span>
                              <span>Msgs: 1/{reward.messagesPerPoint}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingCategory(reward.categoryId)}
                            className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-primary))] text-blue-500"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCategoryReward(reward.categoryId)}
                            className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-primary))] text-red-500"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Blacklist Tab */}
      {activeTab === 'blacklist' && (
        <div className="space-y-6">
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Blacklist Management</h2>

            {/* Blacklist Sub-tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
              {[
                { id: 'channels', label: 'Channels', count: blacklistedChannels.length },
                { id: 'categories', label: 'Categories', count: blacklistedCategories.length },
                { id: 'roles', label: 'Roles', count: blacklistedRoles.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setBlacklistTab(tab.id as typeof blacklistTab)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    blacklistTab === tab.id
                      ? 'bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))] shadow'
                      : 'text-[rgb(var(--color-text-tertiary))]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-tertiary))]" />
              <input
                type="text"
                placeholder={`Search ${blacklistTab}...`}
                value={blacklistSearch}
                onChange={(e) => setBlacklistSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
              />
            </div>

            {/* Blacklisted Items */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-3">Blacklisted</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blacklistTab === 'channels' && blacklistedChannels.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      {item.type === 'voice' ? <FiMic className="w-4 h-4 text-red-500" /> : <FiMessageSquare className="w-4 h-4 text-red-500" />}
                      <span className="text-[rgb(var(--color-text-primary))]">{item.name}</span>
                    </div>
                    <button
                      onClick={() => removeFromBlacklist('channel', item.id)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <FiX className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {blacklistTab === 'categories' && blacklistedCategories.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <FiLayers className="w-4 h-4 text-red-500" />
                      <span className="text-[rgb(var(--color-text-primary))]">{item.name}</span>
                    </div>
                    <button
                      onClick={() => removeFromBlacklist('category', item.id)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <FiX className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {blacklistTab === 'roles' && blacklistedRoles.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color ? `#${item.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                      />
                      <span className="text-[rgb(var(--color-text-primary))]">{item.name}</span>
                    </div>
                    <button
                      onClick={() => removeFromBlacklist('role', item.id)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <FiX className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
                {((blacklistTab === 'channels' && blacklistedChannels.length === 0) ||
                  (blacklistTab === 'categories' && blacklistedCategories.length === 0) ||
                  (blacklistTab === 'roles' && blacklistedRoles.length === 0)) && (
                  <p className="text-center text-[rgb(var(--color-text-tertiary))] py-4">No items blacklisted</p>
                )}
              </div>
            </div>

            {/* Available Items */}
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-3">Add to Blacklist</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {blacklistTab === 'channels' && filteredAvailableChannels.map(ch => (
                  <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))]">
                    <div className="flex items-center gap-2">
                      {ch.type === 'voice' ? <FiMic className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" /> : <FiMessageSquare className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />}
                      <span className="text-[rgb(var(--color-text-primary))]">{ch.name}</span>
                      {ch.parentName && (
                        <span className="text-xs text-[rgb(var(--color-text-tertiary))]">({ch.parentName})</span>
                      )}
                    </div>
                    <button
                      onClick={() => addToBlacklist('channel', ch.id, ch.type)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <FiPlus className="w-4 h-4 text-[rgb(var(--color-text-secondary))]" />
                    </button>
                  </div>
                ))}
                {blacklistTab === 'categories' && filteredAvailableCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))]">
                    <div className="flex items-center gap-2">
                      <FiLayers className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                      <span className="text-[rgb(var(--color-text-primary))]">{cat.name}</span>
                    </div>
                    <button
                      onClick={() => addToBlacklist('category', cat.id)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <FiPlus className="w-4 h-4 text-[rgb(var(--color-text-secondary))]" />
                    </button>
                  </div>
                ))}
                {blacklistTab === 'roles' && filteredAvailableRoles.map(role => (
                  <div key={role.id} className="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                      />
                      <span className="text-[rgb(var(--color-text-primary))]">{role.name}</span>
                    </div>
                    <button
                      onClick={() => addToBlacklist('role', role.id)}
                      className="p-1 rounded hover:bg-red-500/20"
                    >
                      <FiPlus className="w-4 h-4 text-[rgb(var(--color-text-secondary))]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          {/* Shop Toggle */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <FiShoppingCart className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Shop Status</h2>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                    {shopEnabled ? 'Shop is currently open' : 'Shop is currently closed'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleShop(!shopEnabled)}
                className={`p-3 rounded-xl transition-all ${
                  shopEnabled
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}
              >
                {shopEnabled ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Shop Items */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Individual Item Toggles</h2>
            <div className="space-y-3">
              {shopItems.length === 0 ? (
                <p className="text-center text-[rgb(var(--color-text-tertiary))] py-8">No shop items found</p>
              ) : (
                shopItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      item.enabled
                        ? 'bg-[rgb(var(--color-bg-tertiary))] border-[rgb(var(--color-border))]'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
                            <FiShoppingCart className="w-6 h-6 text-[rgb(var(--color-text-tertiary))]" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">{item.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-tertiary))]">
                            <FiDollarSign className="w-4 h-4" />
                            <span>{item.price.toLocaleString()}</span>
                            {item.stock !== null && (
                              <>
                                <span>•</span>
                                <span>Stock: {item.stock}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleShopItem(item.id, !item.enabled)}
                        className={`p-2 rounded-xl transition-all ${
                          item.enabled
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {item.enabled ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
