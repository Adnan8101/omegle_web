'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
import {
FiAlertCircle,
FiCheck,
FiChevronRight,
FiClock,
FiDollarSign,
FiEdit2,
FiPackage,
FiPlus,
FiRefreshCw,
FiSearch,
FiShoppingCart,
FiTrash2,
FiTrendingUp,
FiUsers
} from 'react-icons/fi';
interface ShopItem {
  id: string;
  name: string;
  price: number;
  price_inr?: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  created_at: string;
}
interface Stats {
  totalItems: number;
  totalPurchases: number;
  pendingRedemptions: number;
  totalRevenue: number;
  totalUsers: number;
  totalPoints: number;
}
interface TopItem {
  name: string;
  purchaseCount: number;
  totalRevenue: number;
}
export default function CasinoDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'budget' | 'logs'>('items');
  const [budget, setBudget] = useState<{ available: number; totalAdded: number; totalSpent: number } | null>(null);
  const [budgetLogs, setBudgetLogs] = useState<any[]>([]);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillSuccess, setRefillSuccess] = useState(false);
  const [setAmount, setSetAmount] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [setSuccess, setSetSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const getEmojiDisplay = (emoji: string, size: string = 'w-5 h-5') => {
    const match = emoji.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      const [, name, id] = match;
      const isAnimated = emoji.startsWith('<a:');
      const extension = isAnimated ? 'gif' : 'png';
      const sizeMap: { [key: string]: number } = {
        'w-4 h-4': 32,
        'w-5 h-5': 40,
        'w-6 h-6': 48,
        'w-8 h-8': 64,
      };
      const imgSize = sizeMap[size] || 48;
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${extension}?size=${imgSize}&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    }
    return <span className="inline-block">{emoji}</span>;
  };
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
  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, statsRes, budgetRes] = await Promise.all([
        fetch('/api/casino/shop', { cache: 'no-store' }),
        fetch('/api/casino/stats', { cache: 'no-store' }),
        fetch('/api/casino/budget', { cache: 'no-store' })
      ]);
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      console.log('Items response:', itemsRes.status, itemsData);
      console.log('Stats response:', statsRes.status, statsData);
      if (itemsRes.ok) {
        setItems(itemsData.items || []);
        setCurrencyEmoji(itemsData.currencyEmoji || '🪙');
      } else {
        console.error('Items error:', itemsData);
        setError(itemsData.error || 'Failed to load items');
      }
      if (statsRes.ok) {
        setStats(statsData.stats || null);
        setTopItems(statsData.topItems || []);
      } else {
        console.error('Stats error:', statsData);
      }
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudget(budgetData.budget || null);
        setBudgetLogs(budgetData.logs || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load casino data');
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/casino/shop/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };
  const handleRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillAmount || refillLoading) return;
    setRefillLoading(true);
    setError(null);
    setRefillSuccess(false);
    try {
      const res = await fetch('/api/casino/budget/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(refillAmount), action: 'refill' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to refill budget');
      }
      setRefillSuccess(true);
      setRefillAmount('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to refill budget');
    } finally {
      setRefillLoading(false);
    }
  };
  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setAmount || budgetLoading) return;
    setBudgetLoading(true);
    setError(null);
    setSetSuccess(false);
    try {
      const res = await fetch('/api/casino/budget/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(setAmount), action: 'set' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update budget');
      }
      setSetSuccess(true);
      setSetAmount('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update budget');
    } finally {
      setBudgetLoading(false);
    }
  };
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const formatNumber = (n: number) => n.toLocaleString();
  const statCards = [
    {
      title: 'Total Items',
      value: stats?.totalItems || 0,
      icon: <FiPackage className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Total Purchases',
      value: stats?.totalPurchases || 0,
      icon: <FiShoppingCart className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Pending Redemptions',
      value: stats?.pendingRedemptions || 0,
      icon: <FiClock className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Total Revenue',
      value: formatNumber(stats?.totalRevenue || 0),
      icon: <FiDollarSign className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
      showCurrency: true,
    },
  ];
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
                You do not have permission to access Casino Economy.
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
      <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
        <div className="mb-6 sm:mb-8">
          <div className="h-10 w-64 bg-[rgb(var(--color-bg-tertiary))] rounded-xl animate-pulse mb-2"></div>
          <div className="h-5 w-48 bg-[rgb(var(--color-bg-tertiary))] rounded-lg animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] animate-pulse">
              <div className="h-20 bg-[rgb(var(--color-bg-tertiary))] rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight">
            Casino Economy
          </h1>
          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
            Manage shop items and track purchases
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition touch-manipulation"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/admin/casino/add"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium apple-transition touch-manipulation shadow-lg shadow-blue-500/20"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Item</span>
          </Link>
        </div>
      </div>
      {}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-500">{error}</span>
        </div>
      )}
      {}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] hover:shadow-[var(--shadow-blue)] apple-transition shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 ${card.bgColor} rounded-xl`}>
                <div className={`flex justify-center items-center ${card.iconColor}`}>
                  {card.icon}
                </div>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-1 flex items-center gap-2">
              {card.showCurrency && getEmojiDisplay(currencyEmoji, 'w-6 h-6')}
              {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
            </div>
            <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
              {card.title}
            </div>
          </div>
        ))}
      </div>
      {}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin/casino/economy"
          className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-yellow-500/50 apple-transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <FiDollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Coins Management</h3>
              <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                Configure currency rates
              </p>
            </div>
          </div>
          <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] group-hover:text-yellow-500 group-hover:translate-x-1 apple-transition" />
        </Link>
        {}
        {session?.user?.permissions?.hasFullAccess && (
          <Link
            href="/admin/casino/economy/invites"
            className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <FiUsers className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Invite System</h3>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                  Manage referral rewards (Admin only)
                </p>
              </div>
            </div>
            <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] group-hover:text-purple-500 group-hover:translate-x-1 apple-transition" />
          </Link>
        )}
        <Link
          href="/admin/casino/purchases"
          className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <FiShoppingCart className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">View Purchases</h3>
              <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                {stats?.pendingRedemptions || 0} pending redemptions
              </p>
            </div>
          </div>
          <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] group-hover:text-[rgb(var(--color-accent))] group-hover:translate-x-1 apple-transition" />
        </Link>
        <Link
          href="/shop"
          target="_blank"
          className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <FiTrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Public Shop</h3>
              <p className="text-sm text-[rgb(var(--color-text-tertiary))]">View as users see it</p>
            </div>
          </div>
          <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] group-hover:text-[rgb(var(--color-accent))] group-hover:translate-x-1 apple-transition" />
        </Link>
      </div>
      {}
      {/* Tabs Switcher */}
      <div className="flex border-b border-[rgb(var(--color-border))] mb-6 sm:mb-8">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'items'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
          }`}
        >
          Items
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'budget'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
          }`}
        >
          Budget
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'logs'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
          }`}
        >
          Logs
        </button>
      </div>

      {activeTab === 'items' && (
        <>
          {topItems.length > 0 && (
            <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                Top Selling Items
              </h2>
              <div className="space-y-3">
                {topItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))] rounded-lg font-bold text-sm">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-[rgb(var(--color-text-primary))]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[rgb(var(--color-text-primary))]">
                        {item.purchaseCount} sales
                      </div>
                      <div className="text-sm text-[rgb(var(--color-text-tertiary))] flex items-center justify-end gap-1">
                        {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                        {formatNumber(item.totalRevenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text-primary))]">
                Shop Items ({items.length})
              </h2>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>
            </div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <FiPackage className="w-12 h-12 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
                <h3 className="text-lg font-medium text-[rgb(var(--color-text-primary))] mb-2">
                  {searchQuery ? 'No items found' : 'No shop items yet'}
                </h3>
                <p className="text-[rgb(var(--color-text-tertiary))] mb-4">
                  {searchQuery ? 'Try a different search' : 'Create your first shop item to get started'}
                </p>
                {!searchQuery && (
                  <Link
                    href="/admin/casino/add"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))] text-white rounded-xl font-medium apple-transition"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add First Item
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[rgb(var(--color-bg-tertiary))] rounded-2xl overflow-hidden border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]/50 apple-transition group hover:shadow-lg"
                  >
                    <div className="aspect-[4/3] bg-[rgb(var(--color-bg-secondary))] relative overflow-hidden">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 apple-transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiPackage className="w-12 h-12 text-[rgb(var(--color-text-tertiary))]" />
                        </div>
                      )}
                      {item.price_inr !== undefined && (
                        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold bg-[rgb(var(--color-bg-secondary))]/90 text-[rgb(var(--color-text-primary))] shadow-sm">
                          ₹{formatNumber(item.price_inr)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1 truncate">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-1">
                          {getEmojiDisplay(currencyEmoji, 'w-5 h-5')}
                          {formatNumber(item.price)}
                        </span>
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/casino/edit/${item.id}`}
                            className="p-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-accent))] apple-transition"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] hover:bg-red-500/10 text-[rgb(var(--color-text-secondary))] hover:text-red-500 apple-transition"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'budget' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
              <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] mb-1">Available Reward Budget</div>
              <div className="text-3xl font-extrabold text-blue-400">₹{formatNumber(budget?.available ?? 0)}</div>
            </div>
            <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
              <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] mb-1">Total Refilled</div>
              <div className="text-3xl font-extrabold text-green-400">₹{formatNumber(budget?.totalAdded ?? 0)}</div>
            </div>
            <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
              <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] mb-1">Total Spent</div>
              <div className="text-3xl font-extrabold text-red-400">₹{formatNumber(budget?.totalSpent ?? 0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Refill Form */}
            <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">Refill Reward Budget</h3>
              {refillSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-500 text-sm">
                  <FiCheck className="w-4 h-4" />
                  <span>Budget refilled successfully!</span>
                </div>
              )}
              <form onSubmit={handleRefill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Refill Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g., 5000"
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={refillLoading || !refillAmount}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {refillLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Refill Budget'}
                </button>
              </form>
            </div>

            {/* Set Budget Form */}
            <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">Set Available Budget</h3>
              {setSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-500 text-sm">
                  <FiCheck className="w-4 h-4" />
                  <span>Available budget updated successfully!</span>
                </div>
              )}
              <form onSubmit={handleSetBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    New Budget Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g., 10000"
                    value={setAmount}
                    onChange={(e) => setSetAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={budgetLoading || setAmount === ''}
                  className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {budgetLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Update Available Budget'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] overflow-x-auto animate-fadeIn">
          <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Budget Transaction Logs</h3>
          {budgetLogs.length === 0 ? (
            <p className="text-[rgb(var(--color-text-secondary))] text-center py-8">No budget logs found.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgb(var(--color-border))] text-sm text-[rgb(var(--color-text-tertiary))]">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Item</th>
                  <th className="pb-3 font-semibold">INR Cost</th>
                  <th className="pb-3 font-semibold">Coin Cost</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--color-border))]/50">
                {budgetLogs.map((log) => (
                  <tr key={log.id} className="text-sm text-[rgb(var(--color-text-secondary))]">
                    <td className="py-4 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                        log.type === 'REFILL' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-4">{log.user_name || log.user_id || 'N/A'}</td>
                    <td className="py-4">{log.item_name || 'N/A'}</td>
                    <td className="py-4 font-semibold text-[rgb(var(--color-text-primary))]">
                      {log.type === 'REFILL' ? '+' : '-'}₹{log.inr_cost.toLocaleString()}
                    </td>
                    <td className="py-4">
                      {log.coin_cost ? `${log.coin_cost.toLocaleString()} Coins` : 'N/A'}
                    </td>
                    <td className="py-4">
                      <span className="text-xs text-green-500">{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-blue rounded-3xl p-6 max-w-sm w-full border border-[rgb(var(--color-border))] shadow-[var(--shadow-xl)]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <FiTrash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
                Delete Item?
              </h3>
              <p className="text-[rgb(var(--color-text-secondary))] mb-6">
                This action cannot be undone. The item will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl font-medium apple-transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium apple-transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}