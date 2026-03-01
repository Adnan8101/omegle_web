'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiDollarSign, FiPackage, FiShoppingCart, FiUsers, FiClock,
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw, FiTrendingUp,
  FiChevronRight, FiAlertCircle
} from 'react-icons/fi';

interface ShopItem {
  id: string;
  name: string;
  price: number;
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

  // Function to convert Discord emoji to CDN URL
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
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

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
        fetch('/api/casino/shop'),
        fetch('/api/casino/stats')
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

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatNumber = (n: number) => n.toLocaleString();

  const statCards = [
    {
      title: 'Total Items',
      value: stats?.totalItems || 0,
      icon: <FiPackage className="w-6 h-6 sm:w-8 sm:h-8" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Total Purchases',
      value: stats?.totalPurchases || 0,
      icon: <FiShoppingCart className="w-6 h-6 sm:w-8 sm:h-8" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Pending Redemptions',
      value: stats?.pendingRedemptions || 0,
      icon: <FiClock className="w-6 h-6 sm:w-8 sm:h-8" />,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Total Revenue',
      value: formatNumber(stats?.totalRevenue || 0),
      icon: <FiDollarSign className="w-6 h-6 sm:w-8 sm:h-8" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/20',
      showCurrency: true,
    },
  ];

  if (status === 'loading' || loading) {
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
      {/* Header */}
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

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-500">{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] hover:shadow-[var(--shadow-blue)] apple-transition shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 ${card.bgColor} rounded-xl`}>
                <div className={`bg-gradient-to-br ${card.color} bg-clip-text text-transparent flex justify-center items-center`}>
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
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

      {/* Top Selling Items */}
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

      {/* Shop Items */}
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
                {/* Thumbnail */}
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
                  {item.stock !== null && (
                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium ${
                      item.stock === 0 
                        ? 'bg-red-500/90 text-white' 
                        : item.stock <= 5 
                        ? 'bg-yellow-500/90 text-black' 
                        : 'bg-[rgb(var(--color-bg-secondary))]/90 text-[rgb(var(--color-text-primary))]'
                    }`}>
                      {item.stock === 0 ? 'Sold Out' : `${item.stock} left`}
                    </div>
                  )}
                </div>

                {/* Content */}
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

      {/* Delete Confirmation Modal */}
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
