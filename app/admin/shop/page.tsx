'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import EntityDropdown from '@/components/ui/entity-dropdown';
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
  FiToggleLeft,
  FiToggleRight,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiSave,
  FiUpload,
  FiImage,
  FiLoader,
  FiMove
} from 'react-icons/fi';
interface ShopItem {
  id: string;
  name: string;
  price: number;
  price_inr?: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  enabled: boolean;
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
  const [activeTab, setActiveTab] = useState<'items' | 'budget' | 'logs'>('items');
  const [budget, setBudget] = useState<{ available: number; totalAdded: number; totalSpent: number } | null>(null);
  const [budgetLogs, setBudgetLogs] = useState<any[]>([]);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillSuccess, setRefillSuccess] = useState(false);
  const [setAmount, setSetAmount] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [setSuccess, setSetSuccess] = useState(false);
  const [editAvailable, setEditAvailable] = useState('');
  const [editTotalAdded, setEditTotalAdded] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState(false);
  
  const [roles, setRoles] = useState<any[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reorderedItems = [...items];
    const [removed] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, removed);

    setItems(reorderedItems);
    setDraggedIndex(null);

    setIsReordering(true);
    try {
      const orderedIds = reorderedItems.map((item) => item.id);
      const res = await fetch('/api/casino/shop/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save new order');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save new items order');
      fetchData();
    } finally {
      setIsReordering(false);
    }
  };
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({
    name: '',
    price: '',
    description: '',
    thumbnail: '',
    price_inr: '',
    income_amount: '',
    time_hours: '',
    role_required_id: '',
    role_given_id: '',
    role_removed_id: '',
    required_balance: '',
    reply_message: '',
    expires_in_days: '',
  });
  const [selectedRequiredRoles, setSelectedRequiredRoles] = useState<string[]>([]);
  const [savingItem, setSavingItem] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (budget) {
      setEditAvailable(budget.available.toString());
      setEditTotalAdded(budget.totalAdded.toString());
    }
  }, [budget]);
  useEffect(() => {
    setEditFormData((prev: any) => ({ ...prev, role_required_id: selectedRequiredRoles.join(',') }));
  }, [selectedRequiredRoles]);
  const calculatedSpent = Math.max(0, (parseInt(editTotalAdded) || 0) - (parseInt(editAvailable) || 0));
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
      const budgetData = await budgetRes.json();
      if (itemsRes.ok) {
        setItems(itemsData.items || []);
        setRoles(itemsData.roles || []);
        setCurrencyEmoji(itemsData.currencyEmoji || '🪙');
      } else {
        setError(itemsData.error || 'Failed to load shop items');
      }
      if (statsRes.ok) {
        setStats(statsData.stats || null);
        setTopItems(statsData.topItems || []);
      }
      if (budgetRes.ok) {
        setBudget(budgetData.budget || null);
        setBudgetLogs(budgetData.logs || []);
      }
    } catch (err) {
      console.error('Error fetching shop and budget data:', err);
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
        fetchData(); 
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };
  const handleAdjustBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetLoading) return;
    setBudgetLoading(true);
    setError(null);
    setAdjustSuccess(false);
    try {
      const res = await fetch('/api/casino/budget/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          available: parseInt(editAvailable),
          totalAdded: parseInt(editTotalAdded),
          totalSpent: calculatedSpent
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update budget stats');
      }
      setAdjustSuccess(true);
      fetchData();
      setTimeout(() => setAdjustSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update budget stats');
    } finally {
      setBudgetLoading(false);
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
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId ? { ...item, enabled } : item
          )
        );
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to toggle item');
      }
    } catch (err) {
      setError('Failed to toggle item');
    }
  };
  const parseRoleIds = (roleRef: string | null | undefined): string[] => {
    if (!roleRef) return [];
    const unique = new Set<string>();
    const parts = roleRef.split(/[\s,|/]+/).filter(Boolean);
    for (const part of parts) {
      const trimmed = part.trim();
      if (/^\d{17,20}$/.test(trimmed)) unique.add(trimmed);
      else {
        const match = trimmed.match(/^<@&?(\d{17,20})>$/);
        if (match) unique.add(match[1]);
      }
    }
    return Array.from(unique);
  };
  const startEdit = (item: any) => {
    setEditingItem(item);
    const toInput = (value: any) => value === null || value === undefined ? '' : String(value);
    setEditFormData({
      name: item.name || '',
      price: toInput(item.price),
      description: item.description || '',
      thumbnail: item.thumbnail || '',
      price_inr: toInput(item.price_inr),
      income_amount: toInput(item.income_amount),
      time_hours: toInput(item.time_hours),
      role_required_id: item.role_required_id || '',
      role_given_id: item.role_given_id || '',
      role_removed_id: item.role_removed_id || '',
      required_balance: toInput(item.required_balance),
      reply_message: item.reply_message || '',
      expires_in_days: toInput(item.expires_in_days),
    });
    setSelectedRequiredRoles(Array.isArray(item.role_required_ids) ? item.role_required_ids : parseRoleIds(item.role_required_id || ''));
    setItemError(null);
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxSize = 512;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
        ctx!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setItemError('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setItemError('File too large. Maximum size: 10MB');
      return;
    }
    setUploading(true);
    setItemError(null);
    try {
      const compressedFile = await compressImage(file);
      const uploadFormData = new FormData();
      uploadFormData.append('file', compressedFile);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }
      setEditFormData((prev: any) => ({ ...prev, thumbnail: data.url }));
    } catch (err: any) {
      setItemError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const removeImage = async () => {
    if (!editFormData.thumbnail) return;
    if (editFormData.thumbnail.includes('blob.vercel-storage.com')) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: editFormData.thumbnail }),
        });
      } catch (err) {
        console.error('Failed to delete old image:', err);
      }
    }
    setEditFormData((prev: any) => ({ ...prev, thumbnail: '' }));
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingItem(true);
    setItemError(null);
    try {
      const res = await fetch(`/api/casino/shop/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update item');
      }
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                ...data.item,
                role_required_ids: parseRoleIds(data.item.role_required_id),
                created_at: data.item.created_at,
                expires_at: data.item.expires_at || null
              }
            : item
        )
      );
      setEditingItem(null);
    } catch (err: any) {
      setItemError(err.message || 'Failed to update item');
    } finally {
      setSavingItem(false);
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
  const budgetStatCards = [
    {
      title: 'Available Budget',
      value: formatNumber(budget?.available || 0) + ' Ozy',
      icon: <FiDollarSign className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Total Added',
      value: formatNumber(budget?.totalAdded || 0) + ' Ozy',
      icon: <FiPlus className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Total Spent',
      value: formatNumber(budget?.totalSpent || 0) + ' Ozy',
      icon: <FiTrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
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
                You do not have permission to access the Shop.
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
            Shop Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
            Manage shop items, configure coin rates, refill budget, and monitor transaction logs
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin/shop/economy"
          className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))] hover:border-yellow-500/50 apple-transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-xl">
              <FiDollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm">Coins Management</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Configure currency rates</p>
            </div>
          </div>
          <FiChevronRight className="w-4 h-4 text-[rgb(var(--color-text-tertiary))] group-hover:text-yellow-500 group-hover:translate-x-1 apple-transition" />
        </Link>
        {session?.user?.permissions?.hasFullAccess && (
          <Link
            href="/admin/shop/economy/invites"
            className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))] hover:border-purple-500/50 apple-transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <FiUsers className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm">Invite System</h3>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Manage referral rewards</p>
              </div>
            </div>
            <FiChevronRight className="w-4 h-4 text-[rgb(var(--color-text-tertiary))] group-hover:text-purple-500 group-hover:translate-x-1 apple-transition" />
          </Link>
        )}
        <Link
          href="/admin/shop/purchases"
          className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-xl">
              <FiShoppingCart className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm">View Purchases</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">{stats?.pendingRedemptions || 0} pending redemptions</p>
            </div>
          </div>
          <FiChevronRight className="w-4 h-4 text-[rgb(var(--color-text-tertiary))] group-hover:text-[rgb(var(--color-accent))] group-hover:translate-x-1 apple-transition" />
        </Link>
        <Link
          href="/shop"
          target="_blank"
          className="glass-blue rounded-2xl p-4 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <FiTrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm">Public Shop</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">View as users see it</p>
            </div>
          </div>
          <FiChevronRight className="w-4 h-4 text-[rgb(var(--color-text-tertiary))] group-hover:text-[rgb(var(--color-accent))] group-hover:translate-x-1 apple-transition" />
        </Link>
      </div>
      {}
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
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Shop Items</h2>
                {!searchQuery && (
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                    Drag and drop cards to reorder how they display in the shop
                  </p>
                )}
              </div>
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
                {filteredItems.map((item) => {
                  const index = items.findIndex((i) => i.id === item.id);
                  const isDragging = draggedIndex === index;
                  return (
                    <div
                      key={item.id}
                      draggable={!searchQuery && !isReordering}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`bg-[rgb(var(--color-bg-tertiary))]/50 border border-[rgb(var(--color-border))] rounded-2xl p-4 flex flex-col justify-between hover:border-[rgb(var(--color-border-hover))] transition-all duration-200 ${
                        isDragging ? 'opacity-40 border-dashed border-blue-500 scale-95' : ''
                      } ${!searchQuery ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-start gap-4 min-w-0">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.name}
                                className="w-16 h-16 rounded-xl object-cover border border-[rgb(var(--color-border))]"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold border border-blue-500/20 flex-shrink-0">
                                {item.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {!searchQuery && (
                                  <FiMove className="w-3.5 h-3.5 text-[rgb(var(--color-text-tertiary))] cursor-grab flex-shrink-0" />
                                )}
                                <h3 className="font-semibold text-[rgb(var(--color-text-primary))] truncate">
                                  {item.name}
                                </h3>
                              </div>
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))] line-clamp-2">
                                {item.description || 'No description provided'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleShopItem(item.id, !item.enabled)}
                            className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                              item.enabled
                                ? 'bg-green-500/20 text-green-500 border-green-500/30'
                                : 'bg-red-500/20 text-red-500 border-red-500/30'
                            }`}
                            title={item.enabled ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)'}
                          >
                            {item.enabled ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                          </button>
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
                        <button
                          onClick={() => startEdit(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl text-xs font-semibold text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))] transition-colors"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-semibold border border-red-500/20 transition-colors"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'budget' && (
        <div className="space-y-6 animate-fadeIn">
          {}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            {budgetStatCards.map((card, index) => (
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
                  {card.value}
                </div>
                <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
                  {card.title}
                </div>
              </div>
            ))}
          </div>
          <div className="w-full">
            <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">Edit Budget Stats</h3>
              {adjustSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-500 text-sm">
                  <FiCheck className="w-4 h-4" />
                  <span>Budget stats updated successfully!</span>
                </div>
              )}
              <form onSubmit={handleAdjustBudget} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Available Budget (Ozy) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editAvailable}
                      onChange={(e) => setEditAvailable(e.target.value)}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Total Added (Ozy) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editTotalAdded}
                      onChange={(e) => setEditTotalAdded(e.target.value)}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Total Spent (Ozy) (Calculated)
                    </label>
                    <input
                      type="number"
                      disabled
                      value={calculatedSpent}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))]/50 rounded-xl border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-tertiary))] cursor-not-allowed"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={budgetLoading}
                  className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {budgetLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Update Budget Stats'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'logs' && (
        <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] overflow-x-auto animate-fadeIn">
          <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-6">Budget & Coin Transaction Logs</h3>
          {budgetLogs.length === 0 ? (
            <p className="text-[rgb(var(--color-text-secondary))] text-center py-8">No transaction logs found.</p>
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
                        log.type === 'REFILL' ? 'bg-green-500/10 text-green-500' :
                        log.type === 'COIN_ADD' ? 'bg-emerald-500/10 text-emerald-500' :
                        log.type === 'COIN_REMOVE' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-4">{log.user_name || log.user_id || 'N/A'}</td>
                    <td className="py-4">{log.item_name || 'N/A'}</td>
                    <td className="py-4 font-semibold text-[rgb(var(--color-text-primary))]">
                      {log.type === 'REFILL' || log.type === 'EDIT' ? (
                        '—'
                      ) : log.inr_cost !== null && log.inr_cost !== undefined ? (
                        `${log.type === 'REFILL' ? '+' : '-'}₹${log.inr_cost.toLocaleString()}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 font-semibold">
                      {(() => {
                        const cost = log.coin_cost !== null && log.coin_cost !== undefined ? log.coin_cost : ((log.type === 'REFILL' || log.type === 'EDIT') ? log.inr_cost : null);
                        if (cost !== null && cost !== undefined) {
                          return `${log.type === 'COIN_REMOVE' ? '-' : log.type === 'COIN_ADD' || log.type === 'REFILL' || log.type === 'EDIT' ? '+' : ''}${cost.toLocaleString()} Coins`;
                        }
                        return 'N/A';
                      })()}
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
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-blue rounded-3xl p-6 max-w-4xl w-full border border-[rgb(var(--color-border))] shadow-[var(--shadow-2xl)] my-8 max-h-[90vh] overflow-y-auto animate-fadeIn text-left">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgb(var(--color-border))]/50">
              <div>
                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  Edit Item
                </h3>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                  {editingItem.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 hover:bg-[rgb(var(--color-bg-tertiary))] rounded-xl text-[rgb(var(--color-text-secondary))] apple-transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {itemError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 text-sm">{itemError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditChange}
                    required
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                    placeholder="Enter item name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                    Price ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')}) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={editFormData.price}
                    onChange={handleEditChange}
                    required
                    min="1"
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    name="price_inr"
                    value={editFormData.price_inr}
                    onChange={handleEditChange}
                    min="0"
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                    placeholder="e.g., 500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition resize-none"
                    placeholder="Describe the item..."
                  />
                </div>
              </div>

              <div className="border-t border-[rgb(var(--color-border))]/50 pt-6">
                <h4 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                  <FiImage className="w-5 h-5 text-[rgb(var(--color-accent))]" />
                  Thumbnail Image
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Upload Image
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="modal-image-upload"
                      />
                      <label
                        htmlFor="modal-image-upload"
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl border border-dashed border-[rgb(var(--color-border))] cursor-pointer apple-transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploading ? (
                          <>
                            <FiLoader className="w-5 h-5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <FiUpload className="w-5 h-5" />
                            <span>Click to upload image</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[rgb(var(--color-border))]/50"></div>
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">OR</span>
                    <div className="flex-1 h-px bg-[rgb(var(--color-border))]/50"></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      name="thumbnail"
                      value={editFormData.thumbnail}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="https://example.com/image.png"
                    />
                  </div>
                  {editFormData.thumbnail && (
                    <div className="p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Preview</p>
                        <button
                          type="button"
                          onClick={removeImage}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg apple-transition"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-32 h-32 rounded-xl overflow-hidden bg-[rgb(var(--color-bg-secondary))]">
                        <img
                          src={editFormData.thumbnail}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-[rgb(var(--color-border))]/50 pt-6">
                <h4 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                  💰 Passive Income Settings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                      Income Amount ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')})
                    </label>
                    <input
                      type="number"
                      name="income_amount"
                      value={editFormData.income_amount}
                      onChange={handleEditChange}
                      min="0"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="e.g. 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Every X Hours
                    </label>
                    <input
                      type="number"
                      name="time_hours"
                      value={editFormData.time_hours}
                      onChange={handleEditChange}
                      min="1"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="e.g. 24"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[rgb(var(--color-border))]/50 pt-6">
                <h4 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                  🎭 Role Requirements & Actions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Required Role(s)
                    </label>
                    <EntityDropdown
                      options={roles.map((role) => ({ id: role.id, name: role.name, color: role.color }))}
                      selectedIds={selectedRequiredRoles}
                      onChange={setSelectedRequiredRoles}
                      multiple
                      placeholder="Select required roles"
                      searchPlaceholder="Search roles"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Role Given on Redeem
                    </label>
                    <input
                      type="text"
                      name="role_given_id"
                      value={editFormData.role_given_id}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="Role ID to give"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Role Removed on Redeem
                    </label>
                    <input
                      type="text"
                      name="role_removed_id"
                      value={editFormData.role_removed_id}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="Role ID to remove"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[rgb(var(--color-border))]/50 pt-6">
                <h4 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                  ⚙️ Advanced Settings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                      Required Balance ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')})
                    </label>
                    <input
                      type="number"
                      name="required_balance"
                      value={editFormData.required_balance}
                      onChange={handleEditChange}
                      min="0"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="Minimum balance required"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Expires In (days)
                    </label>
                    <input
                      type="number"
                      name="expires_in_days"
                      value={editFormData.expires_in_days}
                      onChange={handleEditChange}
                      min="1"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                      placeholder="Days until expiry"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Reply Message
                    </label>
                    <textarea
                      name="reply_message"
                      value={editFormData.reply_message}
                      onChange={handleEditChange}
                      rows={2}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition resize-none"
                      placeholder="Message shown after purchase..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 border-t border-[rgb(var(--color-border))]/50 pt-6">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-6 py-3 text-center bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl border border-[rgb(var(--color-border))] font-semibold text-[rgb(var(--color-text-secondary))] apple-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem || !editFormData.name || !editFormData.price}
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 apple-transition shadow-lg shadow-blue-500/20"
                >
                  {savingItem ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}