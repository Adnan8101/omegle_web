'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSearch, FiRefreshCw, FiCheck, FiClock,
  FiChevronLeft, FiChevronRight, FiExternalLink
} from 'react-icons/fi';

interface Purchase {
  id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  price_paid: number;
  redeem_code: string;
  status: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  proof_link: string | null;
  created_at: string;
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [redeemingCode, setRedeemingCode] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPurchases();
    }
  }, [status, statusFilter, page]);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });
      
      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/casino/purchases?${params}`);

      if (!res.ok) {
        throw new Error('Failed to fetch purchases');
      }

      const data = await res.json();
      setPurchases(data.purchases || []);
      setTotal(data.total || 0);
      setCurrencyEmoji(data.currencyEmoji || '🪙');

    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (code: string) => {
    setRedeemingCode(code);
    setError(null);

    try {
      const res = await fetch(`/api/casino/purchases/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to redeem');
      }

      // Refresh the list
      await fetchPurchases();

    } catch (err: any) {
      console.error('Error redeeming:', err);
      setError(err.message || 'Failed to redeem');
    } finally {
      setRedeemingCode(null);
    }
  };

  const filteredPurchases = purchases.filter(p =>
    p.redeem_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.user_id.includes(searchQuery)
  );

  const formatNumber = (n: number) => n.toLocaleString();
  const totalPages = Math.ceil(total / limit);

  if (loading && purchases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/casino"
            className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">Purchase History</h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              View and manage all shop purchases
            </p>
          </div>
        </div>
        <button
          onClick={fetchPurchases}
          className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
          title="Refresh"
        >
          <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="glass-blue p-4 rounded-2xl border border-[rgb(var(--color-border))] flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
          <input
            type="text"
            placeholder="Search by code, item, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="redeemed">Redeemed</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-blue rounded-2xl border border-[rgb(var(--color-border))] overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center">
            <FiClock className="w-12 h-12 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <p className="text-[rgb(var(--color-text-secondary))]">No purchases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Buyer ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--color-border))]">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                    <td className="px-4 py-4">
                      <code className="px-2 py-1 bg-[rgb(var(--color-bg-tertiary))] rounded text-sm font-mono">
                        {purchase.redeem_code}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[rgb(var(--color-text-primary))]">{purchase.item_name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-yellow-500 font-medium">
                        {currencyEmoji} {formatNumber(purchase.price_paid)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono text-[rgb(var(--color-text-secondary))]">
                        {purchase.user_id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {purchase.status === 'redeemed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-500 rounded-lg text-xs">
                          <FiCheck className="w-3 h-3" />
                          Redeemed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-500 rounded-lg text-xs">
                          <FiClock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-[rgb(var(--color-text-secondary))]">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {purchase.status === 'pending' && (
                        <button
                          onClick={() => handleRedeem(purchase.redeem_code)}
                          disabled={redeemingCode === purchase.redeem_code}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {redeemingCode === purchase.redeem_code ? 'Redeeming...' : 'Mark Redeemed'}
                        </button>
                      )}
                      {purchase.proof_link && (
                        <a
                          href={purchase.proof_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors text-blue-500"
                          title="View Proof"
                        >
                          <FiExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[rgb(var(--color-border))] flex items-center justify-between">
            <span className="text-sm text-[rgb(var(--color-text-secondary))]">
              Page {page + 1} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors disabled:opacity-50"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors disabled:opacity-50"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
