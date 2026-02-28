'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSearch, FiClock, FiCheckCircle, FiCopy,
  FiRefreshCw, FiCheck, FiX, FiExternalLink, FiUser, FiPackage
} from 'react-icons/fi';

interface Purchase {
  id: string;
  user_id: string;
  item_name: string;
  price_paid: number;
  redeem_code: string;
  status: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  proof_link: string | null;
  created_at: string;
  user?: { username: string; avatar: string | null };
  redeemer?: { username: string; avatar: string | null };
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'redeemed'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPurchases();
    }
  }, [status]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/casino/purchases');
      const data = await res.json();
      
      if (res.ok) {
        setPurchases(data.purchases || []);
        setCurrencyEmoji(data.currencyEmoji || '🪙');
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.redeem_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.user_id.includes(searchQuery);
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'pending' && purchase.status === 'pending') ||
      (statusFilter === 'redeemed' && purchase.status === 'redeemed');

    return matchesSearch && matchesStatus;
  });

  const pendingCount = purchases.filter(p => p.status === 'pending').length;
  const redeemedCount = purchases.filter(p => p.status === 'redeemed').length;

  if (status === 'loading' || loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="h-10 w-48 bg-[rgb(var(--color-bg-tertiary))] rounded-xl animate-pulse mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-[rgb(var(--color-bg-tertiary))] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Link
            href="/admin/casino"
            className="self-start p-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              Purchases
            </h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              {purchases.length} total purchases · {pendingCount} pending
            </p>
          </div>
          <button
            onClick={fetchPurchases}
            className="self-start flex items-center gap-2 px-4 py-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border apple-transition ${
              statusFilter === 'all'
                ? 'bg-[rgb(var(--color-accent))]/10 border-[rgb(var(--color-accent))]'
                : 'glass-blue border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]'
            }`}
          >
            <div className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {purchases.length}
            </div>
            <div className="text-sm text-[rgb(var(--color-text-tertiary))]">All Purchases</div>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-4 rounded-2xl border apple-transition ${
              statusFilter === 'pending'
                ? 'bg-yellow-500/10 border-yellow-500'
                : 'glass-blue border-[rgb(var(--color-border))] hover:border-yellow-500'
            }`}
          >
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
            <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Pending</div>
          </button>
          <button
            onClick={() => setStatusFilter('redeemed')}
            className={`p-4 rounded-2xl border apple-transition ${
              statusFilter === 'redeemed'
                ? 'bg-green-500/10 border-green-500'
                : 'glass-blue border-[rgb(var(--color-border))] hover:border-green-500'
            }`}
          >
            <div className="text-2xl font-bold text-green-500">{redeemedCount}</div>
            <div className="text-sm text-[rgb(var(--color-text-tertiary))]">Redeemed</div>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
            <input
              type="text"
              placeholder="Search by item name, code, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
            />
          </div>
        </div>

        {/* Purchases List */}
        {filteredPurchases.length === 0 ? (
          <div className="glass-blue rounded-3xl p-12 border border-[rgb(var(--color-border))] text-center">
            <FiPackage className="w-12 h-12 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <h3 className="text-lg font-medium text-[rgb(var(--color-text-primary))] mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No purchases found' : 'No purchases yet'}
            </h3>
            <p className="text-[rgb(var(--color-text-tertiary))]">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try a different search or filter'
                : 'Purchases will appear here when users buy items'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="glass-blue rounded-2xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]/50 apple-transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        purchase.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        {purchase.status === 'pending' ? (
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FiCheckCircle className="w-3 h-3" />
                            Redeemed
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-[rgb(var(--color-text-tertiary))]">
                        {formatDate(purchase.created_at)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1 truncate">
                      {purchase.item_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[rgb(var(--color-text-secondary))]">
                        {currencyEmoji}{formatNumber(purchase.price_paid)}
                      </span>
                      <span className="flex items-center gap-1 text-[rgb(var(--color-text-tertiary))]">
                        <FiUser className="w-3 h-3" />
                        {purchase.user?.username || purchase.user_id}
                      </span>
                    </div>
                  </div>

                  {/* Code */}
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                      <code className="text-sm font-mono font-bold text-[rgb(var(--color-accent))]">
                        {purchase.redeem_code}
                      </code>
                    </div>
                    <button
                      onClick={() => copyCode(purchase.redeem_code)}
                      className="p-2 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] apple-transition"
                      title="Copy code"
                    >
                      {copiedCode === purchase.redeem_code ? (
                        <FiCheck className="w-4 h-4 text-green-500" />
                      ) : (
                        <FiCopy className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Redemption Info */}
                {purchase.status === 'redeemed' && (
                  <div className="mt-4 pt-4 border-t border-[rgb(var(--color-border))] flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-[rgb(var(--color-text-tertiary))]">
                      Redeemed by{' '}
                      <span className="text-[rgb(var(--color-text-secondary))]">
                        {purchase.redeemer?.username || purchase.redeemed_by}
                      </span>
                    </span>
                    {purchase.redeemed_at && (
                      <span className="text-[rgb(var(--color-text-tertiary))]">
                        on {formatDate(purchase.redeemed_at)}
                      </span>
                    )}
                    {purchase.proof_link && (
                      <a
                        href={purchase.proof_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[rgb(var(--color-accent))] hover:underline"
                      >
                        <FiExternalLink className="w-3 h-3" />
                        View Proof
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
