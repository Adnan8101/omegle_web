'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiDollarSign, FiPackage, FiShoppingCart, FiUsers, FiClock,
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw, FiTrendingUp
} from 'react-icons/fi';

interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  time_hours: number | null;
  income_amount: number | null;
  role_required_id: string | null;
  role_given_id: string | null;
  role_removed_id: string | null;
  required_balance: number | null;
  reply_message: string | null;
  expires_in_days: number | null;
  expires_at: string | null;
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
  const [currencyName, setCurrencyName] = useState('points');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      
      if (!itemsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      
      setItems(itemsData.items || []);
      setCurrencyEmoji(itemsData.currencyEmoji || '🪙');
      setCurrencyName(itemsData.currencyName || 'points');
      
      setStats(statsData.stats || null);
      setTopItems(statsData.topItems || []);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load casino data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/casino/shop/${itemId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete item');
      }
      
      setItems(items.filter(item => item.id !== itemId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatNumber = (n: number) => n.toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading casino dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-3">
            <span className="text-4xl">🎰</span>
            Casino Economy Dashboard
          </h1>
          <p className="text-[rgb(var(--color-text-secondary))] mt-1">
            Manage shop items, view statistics, and monitor the economy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
          <Link
            href="/admin/casino/purchases"
            className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors"
          >
            <FiShoppingCart className="w-5 h-5" />
            Purchases
          </Link>
          <Link
            href="/admin/casino/add"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            Add Item
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <FiPackage className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Shop Items</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{stats.totalItems}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <FiShoppingCart className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Total Sales</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{stats.totalPurchases}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <FiClock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Pending</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{stats.pendingRedemptions}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <FiDollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Revenue</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{currencyEmoji}{formatNumber(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <FiUsers className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Users</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{formatNumber(stats.totalUsers)}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-xl">
                <FiTrendingUp className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Circulation</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{currencyEmoji}{formatNumber(stats.totalPoints)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Items */}
      {topItems.length > 0 && (
        <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-yellow-500" />
            Top Selling Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topItems.map((item, index) => (
              <div key={item.name} className="p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-[rgb(var(--color-text-tertiary))]'}`}>
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">{item.name}</span>
                </div>
                <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                  {item.purchaseCount} sales • {currencyEmoji}{formatNumber(item.totalRevenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shop Items */}
      <div className="glass-blue rounded-2xl border border-[rgb(var(--color-border))] overflow-hidden">
        <div className="p-4 border-b border-[rgb(var(--color-border))] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
            <FiPackage className="text-yellow-500" />
            Shop Items ({filteredItems.length})
          </h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none w-full md:w-64 text-sm"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <FiPackage className="w-12 h-12 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <p className="text-[rgb(var(--color-text-secondary))]">
              {searchQuery ? 'No items match your search' : 'No shop items yet'}
            </p>
            {!searchQuery && (
              <Link
                href="/admin/casino/add"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Create First Item
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Income</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--color-border))]">
                {filteredItems.map((item) => {
                  const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
                  const daysLeft = item.expires_at 
                    ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  return (
                    <tr key={item.id} className={`hover:bg-[rgb(var(--color-hover))] transition-colors ${isExpired ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                              <FiPackage className="w-5 h-5 text-yellow-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[rgb(var(--color-text-primary))]">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))] truncate max-w-[200px]">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[rgb(var(--color-text-primary))] font-medium">
                          {currencyEmoji} {formatNumber(item.price)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {item.stock !== null ? (
                          <span className={`font-medium ${item.stock === 0 ? 'text-red-500' : 'text-[rgb(var(--color-text-primary))]'}`}>
                            {item.stock}
                          </span>
                        ) : (
                          <span className="text-green-500">∞</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.income_amount && item.time_hours ? (
                          <span className="text-sm text-[rgb(var(--color-text-secondary))]">
                            {currencyEmoji}{formatNumber(item.income_amount)} / {item.time_hours}h
                          </span>
                        ) : (
                          <span className="text-[rgb(var(--color-text-tertiary))]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {daysLeft !== null ? (
                          <span className={`text-sm ${isExpired ? 'text-red-500' : daysLeft <= 3 ? 'text-orange-500' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                            {isExpired ? 'Expired' : `${daysLeft}d left`}
                          </span>
                        ) : (
                          <span className="text-[rgb(var(--color-text-tertiary))]">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/casino/edit/${item.id}`}
                            className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors text-blue-500"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </Link>
                          {deleteConfirm === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs bg-[rgb(var(--color-bg-tertiary))] rounded-lg hover:bg-[rgb(var(--color-hover))] transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
