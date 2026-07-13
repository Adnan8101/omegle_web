'use client';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiChevronRight,
  FiDollarSign,
  FiPlus,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';

export default function CasinoDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'budget' | 'logs'>('budget');
  const [budget, setBudget] = useState<{ available: number; totalAdded: number; totalSpent: number } | null>(null);
  const [budgetLogs, setBudgetLogs] = useState<any[]>([]);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillSuccess, setRefillSuccess] = useState(false);
  const [setAmount, setSetAmount] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [setSuccess, setSetSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
      const budgetRes = await fetch('/api/casino/budget', { cache: 'no-store' });
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudget(budgetData.budget || null);
        setBudgetLogs(budgetData.logs || []);
      } else {
        const data = await budgetRes.json();
        setError(data.error || 'Failed to load budget data');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load casino data');
    } finally {
      setLoading(false);
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

  const formatNumber = (n: number) => n.toLocaleString();

  const statCards = [
    {
      title: 'Available Budget',
      value: '₹' + formatNumber(budget?.available || 0),
      icon: <FiDollarSign className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Total Added',
      value: '₹' + formatNumber(budget?.totalAdded || 0),
      icon: <FiPlus className="w-6 h-6 sm:w-8 sm:h-8" />,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Total Spent',
      value: '₹' + formatNumber(budget?.totalSpent || 0),
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {[...Array(3)].map((_, i) => (
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
            Casino Economy
          </h1>
          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
            Manage available budget and track coin transactions
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
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-500">{error}</span>
        </div>
      )}

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
              {card.value}
            </div>
            <div className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))]">
              {card.title}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
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
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[rgb(var(--color-border))] mb-6 sm:mb-8">
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

      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Refill Budget */}
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
            <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-4">Refill INR Budget</h3>
            {refillSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-500 text-sm">
                <FiCheck className="w-4 h-4" />
                <span>INR Budget refilled successfully!</span>
              </div>
            )}
            <form onSubmit={handleRefill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Amount to Add (INR) *
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
                disabled={refillLoading || refillAmount === ''}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {refillLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : 'Refill Budget'}
              </button>
            </form>
          </div>

          {/* Set Available Budget */}
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
                      {log.inr_cost !== null && log.inr_cost !== undefined ? (
                        `${log.type === 'REFILL' ? '+' : '-'}₹${log.inr_cost.toLocaleString()}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 font-semibold">
                      {log.coin_cost !== null && log.coin_cost !== undefined ? (
                        `${log.type === 'COIN_REMOVE' ? '-' : log.type === 'COIN_ADD' ? '+' : ''}${log.coin_cost.toLocaleString()} Coins`
                      ) : (
                        'N/A'
                      )}
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
    </div>
  );
}