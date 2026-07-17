'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback,useEffect,useState } from 'react';
import {
FiAlertCircle,
FiCheck,
FiChevronLeft,
FiDollarSign,
FiEdit2,
FiLayers,
FiMessageSquare,FiMic,
FiPlus,
FiRefreshCw,
FiSave,
FiSearch,
FiSettings,
FiShoppingCart,
FiSlash,
FiToggleLeft,FiToggleRight,
FiTrash2,
FiX
} from 'react-icons/fi';
interface EconomyConfig {
  guild_id: string;
  messages_per_point: number;
  msg_ozy_amount: number;
  min_message_length: number;
  message_cooldown: number;
  minutes_per_point: number;
  vc_ozy_amount: number;
  require_two_members: number;
  count_bots: boolean;
  ignore_self_muted: boolean;
  ignore_deafened: boolean;
  currency_name: string;
  currency_emoji: string;
  ozy_inr_rate?: number;
  leaderboard_sync: boolean;
  enabled: boolean;
  advanced_mode: boolean;
  shop_enabled: boolean;
  vc_enabled: boolean;
  message_enabled: boolean;
  afk_verify_enabled: boolean;
  afk_verify_min: number;
  afk_verify_max: number;
}
interface CategoryReward {
  id: string;
  categoryId: string;
  categoryName: string;
  vcEnabled: boolean;
  vcMinutesPerPoint: number;
  vcOzyAmount?: number;
  vcMinMembers?: number;
  vcCountBots?: boolean;
  vcIgnoreSelfMuted?: boolean;
  vcIgnoreDeafened?: boolean;
  messageEnabled: boolean;
  messagesPerPoint: number;
  msgOzyAmount?: number;
  msgMinLength?: number;
  msgCooldown?: number;
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
interface Member {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}
interface BlacklistedItem {
  id: string;
  name: string;
  type?: string;
  color?: number;
  username?: string;
  discriminator?: string;
  avatar?: string | null;
}
interface ShopItem {
  id: string;
  name: string;
  price: number;
  price_inr?: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  enabled: boolean;
}
type TabType = 'basic' | 'advanced' | 'blacklist' | 'shop';
export default function EconomyManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<EconomyConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryRewards, setCategoryRewards] = useState<CategoryReward[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryReward, setNewCategoryReward] = useState<Partial<CategoryReward> | null>(null);
  const [textChannels, setTextChannels] = useState<Channel[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<Channel[]>([]);
  const [blacklistSearch, setBlacklistSearch] = useState('');
  const [blacklistTab, setBlacklistTab] = useState<'channels' | 'categories' | 'roles' | 'members'>('channels');
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [blacklistedChannels, setBlacklistedChannels] = useState<BlacklistedItem[]>([]);
  const [blacklistedCategories, setBlacklistedCategories] = useState<BlacklistedItem[]>([]);
  const [blacklistedRoles, setBlacklistedRoles] = useState<BlacklistedItem[]>([]);
  const [blacklistedMembers, setBlacklistedMembers] = useState<BlacklistedItem[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'blacklist') {
      setActiveTab('blacklist');
      setBlacklistTab('members');
    }
  }, [searchParams]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopEnabled, setShopEnabled] = useState(true);
  const [] = useState<{ type: 'channels' | 'categories' | 'roles' } | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setIsRedirecting(true);
      router.push('/admin');
      return;
    }
    if (status === 'authenticated') {
      const checkAccess = async () => {
        try {
          const res = await fetch('/api/casino/access');
          const data = await res.json();
          console.log('[Casino] Access check result:', data);
          if (data.hasAccess) {
            setHasPermission(true);
          } else {
            setHasPermission(false);
            const perms = session?.user?.permissions;
            if (perms?.hasModeratorAccess || perms?.hasViewOnlyAccess) {
              setIsRedirecting(true);
              router.push('/admin/vctranscript');
            } else {
              setIsRedirecting(true);
              router.push('/admin');
            }
          }
        } catch (err) {
          console.error('[Casino] Access check failed:', err);
          const perms = session?.user?.permissions;
          const canAccess = perms?.hasFullAccess || perms?.hasCasinoAccess;
          setHasPermission(canAccess ?? false);
        }
      };
      checkAccess();
    }
  }, [status, session, router]);
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/config');
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  }, []);
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/economy/categories');
      const data = await res.json();
      console.log('Categories API Response:', data);
      if (res.ok) {
        console.log('Setting categories:', data.categories?.length || 0);
        setCategories(data.categories || []);
        setCategoryRewards(data.categoryRewards || []);
        setTextChannels(data.textChannels || []);
        setVoiceChannels(data.voiceChannels || []);
      } else {
        console.error('Categories API error:', data);
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
        setBlacklistedMembers(data.blacklisted.members || []);
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
      {}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/admin/shop"
            className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              Coins Management
            </h1>
            <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
              Configure currency earning rates and restrictions
            </p>
          </div>
          <Link
            href="/admin/shop/economy/invites"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors text-sm"
          >
            🎯 Invites
          </Link>
        </div>
        {}
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
      {}
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
      {}
      {activeTab === 'basic' && config && (
        <div className="space-y-6">
          {/* Economy System */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Economy System</h2>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Enable or disable the economy system</p>
              </div>
              <button
                type="button"
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

          {/* AFK Verification Toggle */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">AFK Verification</h2>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Enable random AFK verification prompt for voice grinders to prevent unattended grinding</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, afk_verify_enabled: !config.afk_verify_enabled })}
                className={`p-3 rounded-xl transition-all ${
                  config.afk_verify_enabled
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}
              >
                {config.afk_verify_enabled ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className={`transition-all duration-300 ${!config.afk_verify_enabled ? 'opacity-40 pointer-events-none select-none h-0 overflow-hidden' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-[rgb(var(--color-border))]/50">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Minimum Active Time (minutes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={config.afk_verify_min ?? 80}
                      onChange={(e) => setConfig({ ...config, afk_verify_min: parseInt(e.target.value) || 80 })}
                      className="w-24 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                    />
                    <span className="text-[rgb(var(--color-text-tertiary))]">minutes before eligible</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Maximum Verification Window (minutes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={config.afk_verify_max ?? 90}
                      onChange={(e) => setConfig({ ...config, afk_verify_max: parseInt(e.target.value) || 90 })}
                      className="w-24 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                    />
                    <span className="text-[rgb(var(--color-text-tertiary))]">minutes window limit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <FiMic className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Voice Chat Rewards</h2>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Configure VC-based currency earning (accumulates across sessions)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, vc_enabled: !config.vc_enabled })}
                className={`p-3 rounded-xl transition-all ${
                  config.vc_enabled
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}
              >
                {config.vc_enabled ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className={`transition-all duration-300 ${!config.vc_enabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Time Required (minutes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={config.minutes_per_point}
                      onChange={(e) => setConfig({ ...config, minutes_per_point: parseInt(e.target.value) || 5 })}
                      className="w-24 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                    />
                    <span className="text-[rgb(var(--color-text-tertiary))]">minutes in VC</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    {config.currency_name} Amount
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={config.vc_ozy_amount || 1}
                      onChange={(e) => setConfig({ ...config, vc_ozy_amount: parseInt(e.target.value) || 1 })}
                      className="w-24 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                    />
                    <span className="text-[rgb(var(--color-text-tertiary))]">{config.currency_name} earned</span>
                  </div>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                    = {config.vc_ozy_amount || 1} {config.currency_name} per {config.minutes_per_point} min
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Minimum Members in VC
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={config.require_two_members}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setConfig({ ...config, require_two_members: value });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Count Bots in Member Count
                  </label>
                  <button
                    onClick={() => setConfig({ ...config, count_bots: !config.count_bots })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      config.count_bots
                        ? 'bg-green-500/10 border-green-500/30 text-green-500'
                        : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.count_bots ? '✓' : '✗'}</span>
                      <div className="text-left">
                        <div className="font-semibold">{config.count_bots ? 'ON' : 'OFF'}</div>
                        <div className="text-xs opacity-80">{config.count_bots ? 'Bots Counted' : 'Bots Not Counted'}</div>
                      </div>
                    </div>
                    {config.count_bots ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
                  </button>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                    {config.count_bots ? 'Bots are included in minimum member requirement' : 'Only real users count toward minimum members'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Ignore Muted Users
                  </label>
                  <button
                    onClick={() => setConfig({ ...config, ignore_self_muted: !config.ignore_self_muted })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      config.ignore_self_muted
                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                        : 'bg-green-500/10 border-green-500/30 text-green-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.ignore_self_muted ? '✓' : '✗'}</span>
                      <div className="text-left">
                        <div className="font-semibold">{config.ignore_self_muted ? 'ON (Ignoring)' : 'OFF (Counting)'}</div>
                        <div className="text-xs opacity-80">{config.ignore_self_muted ? 'Muted users NOT earning' : 'Muted users earning'}</div>
                      </div>
                    </div>
                    {config.ignore_self_muted ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
                  </button>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                    {config.ignore_self_muted ? 'Muted users will NOT earn coins' : 'Muted users will still earn coins'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Ignore Deafened Users
                  </label>
                  <button
                    onClick={() => setConfig({ ...config, ignore_deafened: !config.ignore_deafened })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      config.ignore_deafened
                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                        : 'bg-green-500/10 border-green-500/30 text-green-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.ignore_deafened ? '✓' : '✗'}</span>
                      <div className="text-left">
                        <div className="font-semibold">{config.ignore_deafened ? 'ON (Ignoring)' : 'OFF (Counting)'}</div>
                        <div className="text-xs opacity-80">{config.ignore_deafened ? 'Deafened users NOT earning' : 'Deafened users earning'}</div>
                      </div>
                    </div>
                    {config.ignore_deafened ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
                  </button>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                    {config.ignore_deafened ? 'Deafened users will NOT earn coins' : 'Deafened users will still earn coins'}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <p className="text-sm text-purple-300">
                  <strong>How it works:</strong> Time accumulates across sessions. When a user reaches {config.minutes_per_point} min total (even across multiple joins), they earn {config.vc_ozy_amount || 1} {config.currency_name} and progress continues.
                </p>
              </div>
            </div>
          </div>
          {}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <FiMessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Message Rewards</h2>
                  <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Configure message-based currency earning (accumulates towards threshold)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, message_enabled: !config.message_enabled })}
                className={`p-3 rounded-xl transition-all ${
                  config.message_enabled
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}
              >
                {config.message_enabled ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className={`transition-all duration-300 ${!config.message_enabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Messages Required
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={config.messages_per_point}
                      onChange={(e) => setConfig({ ...config, messages_per_point: parseInt(e.target.value) || 25 })}
                      className="w-24 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                    />
                    <span className="text-[rgb(var(--color-text-tertiary))]">messages to earn</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    {config.currency_name} Amount
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={config.msg_ozy_amount || 1}
                      onChange={(e) => setConfig({ ...config, msg_ozy_amount: parseInt(e.target.value) || 1 })}
                      className="w-24 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                    />
                    <span className="text-[rgb(var(--color-text-tertiary))]">{config.currency_name} earned</span>
                  </div>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                    = {config.msg_ozy_amount || 1} {config.currency_name} per {config.messages_per_point} msgs
                  </p>
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
              </div>
              <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-sm text-blue-300">
                  <strong>How it works:</strong> Messages accumulate. After {config.messages_per_point} valid messages, user earns {config.msg_ozy_amount || 1} {config.currency_name}. Progress persists until reward is earned.
                </p>
              </div>
            </div>
          </div>
          {}
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
          {}
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
      {}
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
              {}
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
                {}
                {newCategoryReward && (
                  <div className="mb-6 p-6 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-green-500/30">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                        {editingCategory ? 'Edit Category Reward' : 'New Category Reward'}
                      </h3>
                      <button
                        onClick={() => {
                          setNewCategoryReward(null);
                          setEditingCategory(null);
                        }}
                        className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))]"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                    {}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                        Select Category
                      </label>
                      <select
                        value={newCategoryReward.categoryId || ''}
                        disabled={!!editingCategory}
                        onChange={(e) => {
                          const cat = categories.find(c => c.id === e.target.value);
                          setNewCategoryReward({
                            ...newCategoryReward,
                            categoryId: e.target.value,
                            categoryName: cat?.name,
                            vcEnabled: true,
                            messageEnabled: true,
                            vcMinutesPerPoint: config?.minutes_per_point || 1,
                            vcMinMembers: config?.require_two_members || 1,
                            vcCountBots: config?.count_bots || false,
                            vcIgnoreSelfMuted: config?.ignore_self_muted || false,
                            vcIgnoreDeafened: config?.ignore_deafened || false,
                            messagesPerPoint: config?.messages_per_point || 25,
                            msgMinLength: config?.min_message_length || 5,
                            msgCooldown: config?.message_cooldown || 5
                          });
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                      >
                        <option value="">-- Select a Category --</option>
                        {categories
                          .filter(cat => !categoryRewards.find(cr => cr.categoryId === cat.id))
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    {newCategoryReward.categoryId && (
                      <>
                        {}
                        <div className="mb-6 p-4 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))]">
                          <div className="flex items-center gap-2 mb-4">
                            <FiLayers className="w-5 h-5 text-green-500" />
                            <h4 className="font-semibold text-[rgb(var(--color-text-primary))]">
                              Channels in &quot;{newCategoryReward.categoryName}&quot;
                            </h4>
                            <span className="text-xs text-[rgb(var(--color-text-tertiary))] ml-2">(Read-only - synced from Discord)</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <FiMic className="w-4 h-4 text-purple-500" />
                                <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                                  Voice Channels ({voiceChannels.filter(ch => ch.parentId === newCategoryReward.categoryId).length})
                                </span>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1 bg-[rgb(var(--color-bg-secondary))] rounded-lg p-2">
                                {voiceChannels.filter(ch => ch.parentId === newCategoryReward.categoryId).length === 0 ? (
                                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] italic">No voice channels</p>
                                ) : (
                                  voiceChannels
                                    .filter(ch => ch.parentId === newCategoryReward.categoryId)
                                    .map(ch => (
                                      <div key={ch.id} className="flex items-center gap-2 px-2 py-1 rounded text-sm text-[rgb(var(--color-text-secondary))]">
                                        <span className="text-purple-400">🔊</span>
                                        <span>{ch.name}</span>
                                      </div>
                                    ))
                                )}
                              </div>
                            </div>
                            {}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <FiMessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                                  Text Channels ({textChannels.filter(ch => ch.parentId === newCategoryReward.categoryId).length})
                                </span>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1 bg-[rgb(var(--color-bg-secondary))] rounded-lg p-2">
                                {textChannels.filter(ch => ch.parentId === newCategoryReward.categoryId).length === 0 ? (
                                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] italic">No text channels</p>
                                ) : (
                                  textChannels
                                    .filter(ch => ch.parentId === newCategoryReward.categoryId)
                                    .map(ch => (
                                      <div key={ch.id} className="flex items-center gap-2 px-2 py-1 rounded text-sm text-[rgb(var(--color-text-secondary))]">
                                        <span className="text-blue-400">#</span>
                                        <span>{ch.name}</span>
                                      </div>
                                    ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {}
                        <div className="mb-6 p-4 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))]">
                          <div className="flex items-center gap-2 mb-4">
                            <FiMic className="w-5 h-5 text-purple-500" />
                            <h4 className="font-semibold text-[rgb(var(--color-text-primary))]">Voice Chat Rewards</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Time Required (min)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newCategoryReward.vcMinutesPerPoint || 5}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  vcMinutesPerPoint: parseInt(e.target.value) || 5
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                {config?.currency_name || 'Ozy'} Earned
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newCategoryReward.vcOzyAmount || 1}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  vcOzyAmount: parseInt(e.target.value) || 1
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Min Members
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newCategoryReward.vcMinMembers || 1}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  vcMinMembers: parseInt(e.target.value) || 1
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Count Bots
                              </label>
                              <button
                                onClick={() => setNewCategoryReward({
                                  ...newCategoryReward,
                                  vcCountBots: !newCategoryReward.vcCountBots
                                })}
                                className={`w-full px-3 py-2 rounded-xl border transition-all ${
                                  newCategoryReward.vcCountBots
                                    ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                    : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                                }`}
                              >
                                {newCategoryReward.vcCountBots ? 'Yes' : 'No'}
                              </button>
                            </div>
                          </div>
                          {}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Ignore Muted Users
                              </label>
                              <button
                                onClick={() => setNewCategoryReward({
                                  ...newCategoryReward,
                                  vcIgnoreSelfMuted: !newCategoryReward.vcIgnoreSelfMuted
                                })}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                  newCategoryReward.vcIgnoreSelfMuted
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                    : 'bg-green-500/10 border-green-500/30 text-green-500'
                                }`}
                              >
                                <span className="font-medium">{newCategoryReward.vcIgnoreSelfMuted ? 'Not Counting Muted' : 'Counting Muted'}</span>
                                {newCategoryReward.vcIgnoreSelfMuted ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                              </button>
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                                {newCategoryReward.vcIgnoreSelfMuted ? 'Muted users will NOT earn coins' : 'Muted users will still earn coins'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Ignore Deafened Users
                              </label>
                              <button
                                onClick={() => setNewCategoryReward({
                                  ...newCategoryReward,
                                  vcIgnoreDeafened: !newCategoryReward.vcIgnoreDeafened
                                })}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                  newCategoryReward.vcIgnoreDeafened
                                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                                    : 'bg-green-500/10 border-green-500/30 text-green-500'
                                }`}
                              >
                                <span className="font-medium">{newCategoryReward.vcIgnoreDeafened ? 'Not Counting Deafened' : 'Counting Deafened'}</span>
                                {newCategoryReward.vcIgnoreDeafened ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                              </button>
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                                {newCategoryReward.vcIgnoreDeafened ? 'Deafened users will NOT earn coins' : 'Deafened users will still earn coins'}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                            Users earn {newCategoryReward.vcOzyAmount || 1} {config?.currency_name || 'Ozy'} after {newCategoryReward.vcMinutesPerPoint || 5} minutes in VC (accumulates across sessions)
                          </p>
                        </div>
                        {}
                        <div className="p-4 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))]">
                          <div className="flex items-center gap-2 mb-4">
                            <FiMessageSquare className="w-5 h-5 text-blue-500" />
                            <h4 className="font-semibold text-[rgb(var(--color-text-primary))]">Message Rewards</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Messages Required
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newCategoryReward.messagesPerPoint || 25}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  messagesPerPoint: parseInt(e.target.value) || 25
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                {config?.currency_name || 'Ozy'} Earned
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newCategoryReward.msgOzyAmount || 1}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  msgOzyAmount: parseInt(e.target.value) || 1
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Min Length
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={newCategoryReward.msgMinLength || 5}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  msgMinLength: parseInt(e.target.value) || 5
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                                Cooldown (sec)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={newCategoryReward.msgCooldown || 5}
                                onChange={(e) => setNewCategoryReward({
                                  ...newCategoryReward,
                                  msgCooldown: parseInt(e.target.value) || 5
                                })}
                                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                            Users earn {newCategoryReward.msgOzyAmount || 1} {config?.currency_name || 'Ozy'} after {newCategoryReward.messagesPerPoint || 25} messages (accumulates)
                          </p>
                        </div>
                        <div className="flex justify-end mt-6 gap-3">
                          <button
                            onClick={() => setNewCategoryReward(null)}
                            className="px-4 py-2 bg-[rgb(var(--color-bg-primary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (newCategoryReward.categoryId) {
                                saveCategoryReward(newCategoryReward);
                              }
                            }}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold"
                          >
                            <FiCheck className="w-4 h-4" />
                            Save Category Reward
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {}
                <div className="space-y-3">
                  {categoryRewards.length === 0 ? (
                    <div className="text-center py-12">
                      <FiLayers className="w-12 h-12 mx-auto mb-3 text-[rgb(var(--color-text-tertiary))]" />
                      <p className="text-[rgb(var(--color-text-tertiary))]">
                        No category rewards configured. Add one above.
                      </p>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mt-1">
                        Category rewards override default settings for users in specific categories
                      </p>
                    </div>
                  ) : (
                    categoryRewards.map(reward => (
                      <div
                        key={reward.id}
                        className="p-5 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] hover:border-purple-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                              <FiLayers className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-lg">
                                {loading ? (
                                  <span className="text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading...</span>
                                ) : (
                                  reward.categoryName || `Category ${reward.categoryId}`
                                )}
                              </h3>
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-0.5">Overrides default settings for this category</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCategory(reward.categoryId);
                                setNewCategoryReward({
                                  categoryId: reward.categoryId,
                                  categoryName: reward.categoryName,
                                  vcEnabled: reward.vcEnabled,
                                  messageEnabled: reward.messageEnabled,
                                  vcMinutesPerPoint: reward.vcMinutesPerPoint,
                                  vcOzyAmount: reward.vcOzyAmount,
                                  vcMinMembers: reward.vcMinMembers,
                                  vcCountBots: reward.vcCountBots,
                                  vcIgnoreSelfMuted: reward.vcIgnoreSelfMuted,
                                  vcIgnoreDeafened: reward.vcIgnoreDeafened,
                                  messagesPerPoint: reward.messagesPerPoint,
                                  msgOzyAmount: reward.msgOzyAmount,
                                  msgMinLength: reward.msgMinLength,
                                  msgCooldown: reward.msgCooldown
                                });
                              }}
                              className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-all"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCategoryReward(reward.categoryId)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
                            <FiMic className="w-4 h-4 text-purple-500" />
                            <span>VC: <strong className="text-[rgb(var(--color-text-primary))]">{reward.vcOzyAmount || 1}</strong> {config?.currency_name || 'Ozy'} per <strong>{reward.vcMinutesPerPoint}</strong> min</span>
                          </div>
                          <div className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
                            <FiMessageSquare className="w-4 h-4 text-blue-500" />
                            <span>Msgs: <strong className="text-[rgb(var(--color-text-primary))]">{reward.msgOzyAmount || 1}</strong> {config?.currency_name || 'Ozy'} per <strong>{reward.messagesPerPoint}</strong> msgs</span>
                          </div>
                        </div>
                        {}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="px-2 py-1 text-xs rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Min {reward.vcMinMembers || 1} members
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-lg border ${reward.vcCountBots ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                            Bots: {reward.vcCountBots ? 'Counted' : 'Not Counted'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-lg border ${reward.vcIgnoreSelfMuted ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                            Muted: {reward.vcIgnoreSelfMuted ? 'Ignored' : 'Counted'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-lg border ${reward.vcIgnoreDeafened ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                            Deafened: {reward.vcIgnoreDeafened ? 'Ignored' : 'Counted'}
                          </span>
                        </div>
                        {}
                        <div className="mt-3 pt-3 border-t border-[rgb(var(--color-border))]">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                              🔊 {voiceChannels.filter(ch => ch.parentId === reward.categoryId).length} VCs
                            </span>
                            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">•</span>
                            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                              # {textChannels.filter(ch => ch.parentId === reward.categoryId).length} text channels
                            </span>
                          </div>
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
      {}
      {activeTab === 'blacklist' && (
        <div className="space-y-6">
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
            <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Blacklist Management</h2>
            {}
            <div className="flex gap-2 mb-6 p-1 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
              {[
                { id: 'channels', label: 'Channels', count: blacklistedChannels.length },
                { id: 'categories', label: 'Categories', count: blacklistedCategories.length },
                { id: 'roles', label: 'Roles', count: blacklistedRoles.length },
                { id: 'members', label: 'Members', count: blacklistedMembers.length },
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
            {}
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
            {}
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
                {blacklistTab === 'members' && blacklistedMembers.map(item => {
                  const avatarUrl = item.avatar
                    ? `https://cdn.discordapp.com/avatars/${item.id}/${item.avatar}.png?size=32`
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(item.discriminator || '0') % 5}.png`;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <img src={avatarUrl} alt={item.name} className="w-6 h-6 rounded-full" />
                        <span className="text-[rgb(var(--color-text-primary))]">{item.name || `User ${item.id}`}</span>
                      </div>
                      <button
                        onClick={() => removeFromBlacklist('member', item.id)}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <FiX className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  );
                })}
                {((blacklistTab === 'channels' && blacklistedChannels.length === 0) ||
                  (blacklistTab === 'categories' && blacklistedCategories.length === 0) ||
                  (blacklistTab === 'roles' && blacklistedRoles.length === 0) ||
                  (blacklistTab === 'members' && blacklistedMembers.length === 0)) && (
                  <p className="text-center text-[rgb(var(--color-text-tertiary))] py-4">No items blacklisted</p>
                )}
              </div>
            </div>
            {}
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
                {blacklistTab === 'members' && (
                  <div className="space-y-4">
                    <p className="text-[rgb(var(--color-text-tertiary))] text-center mb-4">
                      Search by username or paste Discord User ID
                    </p>
                    {}
                    <div className="relative max-w-2xl mx-auto">
                      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-tertiary))]" />
                      <input
                        type="text"
                        placeholder="Search members by username or paste User ID..."
                        value={memberSearchQuery}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setMemberSearchQuery(value);
                          if (value.length >= 2) {
                            setSearchingMembers(true);
                            try {
                              const res = await fetch(`/api/discord/search-members?query=${encodeURIComponent(value)}&limit=10`);
                              const data = await res.json();
                              if (res.ok) {
                                setMemberSearchResults(data.members || []);
                              }
                            } catch (err) {
                              console.error('Error searching members:', err);
                            } finally {
                              setSearchingMembers(false);
                            }
                          } else {
                            setMemberSearchResults([]);
                          }
                        }}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
                      />
                      {searchingMembers && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <FiRefreshCw className="w-4 h-4 animate-spin text-[rgb(var(--color-text-tertiary))]" />
                        </div>
                      )}
                    </div>
                    {}
                    {memberSearchResults.length > 0 && (
                      <div className="max-w-2xl mx-auto space-y-2 max-h-96 overflow-y-auto">
                        {memberSearchResults.map(member => {
                          const avatarUrl = member.avatar
                            ? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=64`
                            : `https://cdn.discordapp.com/embed/avatars/${parseInt(member.discriminator) % 5}.png`;
                          const displayName = member.global_name || member.username;
                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-all border border-[rgb(var(--color-border))]"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={avatarUrl}
                                  alt={displayName}
                                  className="w-10 h-10 rounded-full"
                                />
                                <div>
                                  <div className="font-medium text-[rgb(var(--color-text-primary))]">
                                    {displayName}
                                  </div>
                                  <div className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                    @{member.username} • {member.id}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  await addToBlacklist('member', member.id);
                                  setMemberSearchQuery('');
                                  setMemberSearchResults([]);
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2"
                              >
                                <FiPlus className="w-4 h-4" />
                                Blacklist
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {}
                    {/^\d{17,19}$/.test(memberSearchQuery.trim()) && memberSearchResults.length === 0 && (
                      <div className="max-w-2xl mx-auto">
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                          <p className="text-blue-400 mb-3">Valid User ID detected</p>
                          <button
                            onClick={async () => {
                              await addToBlacklist('member', memberSearchQuery.trim());
                              setMemberSearchQuery('');
                            }}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                          >
                            Blacklist User {memberSearchQuery}
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] text-center mt-4">
                      💡 Tip: Enable Developer Mode in Discord to copy User IDs
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          {}
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
          {}
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
                            {item.price_inr !== undefined && item.price_inr > 0 && (
                              <>
                                <span>•</span>
                                <span>Price: ₹{item.price_inr.toLocaleString()}</span>
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