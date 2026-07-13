'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiAlertCircle,
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
  FiTrendingUp
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

export default function ShopDashboard() {
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
      const [itemsRes, statsRes] = await Promise.all([
        fetch('/api/casino/shop', { cache: 'no-store' }),
        fetch('/api/casino/stats', { cache: 'no-store' })
      ]);

      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();

      if (itemsRes.ok) {
        setItems(itemsData.items || []);
        setCurrencyEmoji(itemsData.currencyEmoji || '🪙');
      } else {
        setError(itemsData.error || 'Failed to load shop items');
      }

      if (statsRes.ok) {
        setStats(statsData.stats || null);
        setTopItems(statsData.topItems || []);
      }
    } catch (err) {
      console.error('Error fetching shop data:', err);
      setError('Failed to load shop data');
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
        fetchData(); // refresh stats
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
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
                You do not have permission to access Casino Shop.
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight">
            Shop Items Management
          </h1>
          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
            Create, update shop items and monitor user redemptions
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
            href="/admin/shop/add"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium apple-transition touch-manipulation shadow-lg shadow-blue-500/20"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Item</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-500">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
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

      {/* Action Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin/shop/purchases"
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

      {/* Top Selling Section (if any) */}
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
                  <div className="font-semibold text-[rgb(var(--color-text-primary))]">{item.purchaseCount} Sales</div>
                  <div className="text-xs text-[rgb(var(--color-text-tertiary))] flex items-center gap-1 justify-end">
                    <span>Total:</span>
                    {getEmojiDisplay(currencyEmoji, 'w-3.5 h-3.5')}
                    <span>{formatNumber(item.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Section */}
      <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Shop Items</h2>
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-tertiary))] w-4 h-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-blue-500 focus:outline-none transition-colors text-sm"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-4" />
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1">No items found</h3>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
              {searchQuery ? 'Try matching another search query' : 'Get started by creating your first shop item'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[rgb(var(--color-bg-tertiary))]/50 border border-[rgb(var(--color-border))] rounded-2xl p-4 flex flex-col justify-between hover:border-[rgb(var(--color-border-hover))] transition-colors"
              >
                <div>
                  <div className="flex items-start gap-4 mb-3">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover border border-[rgb(var(--color-border))]"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold border border-blue-500/20">
                        {item.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[rgb(var(--color-text-primary))] truncate mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))] line-clamp-2">
                        {item.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-3 border-t border-[rgb(var(--color-border))]/50 text-xs text-[rgb(var(--color-text-secondary))]">
                    <div>
                      <span className="text-[rgb(var(--color-text-tertiary))] block">Price:</span>
                      <span className="font-medium flex items-center gap-1 mt-0.5">
                        {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                        {formatNumber(item.price)}
                      </span>
                    </div>
                    {item.price_inr !== undefined && (
                      <div>
                        <span className="text-[rgb(var(--color-text-tertiary))] block">INR Cost:</span>
                        <span className="font-medium mt-0.5 block">₹{formatNumber(item.price_inr)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[rgb(var(--color-text-tertiary))] block">Stock:</span>
                      <span className={`font-medium mt-0.5 block ${item.stock === 0 ? 'text-red-500' : ''}`}>
                        {item.stock === null ? 'Unlimited' : formatNumber(item.stock)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-[rgb(var(--color-border))]/50">
                  <Link
                    href={`/admin/shop/edit/${item.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl text-xs font-semibold text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))] transition-colors"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-semibold border border-red-500/20 transition-colors"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
