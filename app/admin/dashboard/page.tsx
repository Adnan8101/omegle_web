'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiFileText, FiClock, FiCheckCircle, FiXCircle,
  FiChevronRight, FiLogOut, FiActivity, FiDollarSign
} from 'react-icons/fi';

interface Stats {
  total: number;
  pending: number;
  considered: number;
  denied: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    considered: 0,
    denied: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    } else if (status === 'authenticated' && !session?.user?.permissions?.hasFullAccess) {
      // Dashboard requires full access - redirect to appropriate page
      const perms = session?.user?.permissions;
      if (perms?.hasCasinoAccess && !perms?.hasModeratorAccess && !perms?.hasViewOnlyAccess) {
        router.replace('/admin/casino');
      } else if (perms?.hasModeratorAccess || perms?.hasViewOnlyAccess) {
        router.replace('/admin/vctranscript');
      } else {
        router.replace('/admin');
      }
    } else if (status === 'authenticated' && session?.user?.permissions?.hasFullAccess) {
      fetchStats();
    }
  }, [status, session, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/applications/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.total,
      icon: <FiFileText className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Pending Review',
      value: stats.pending,
      icon: <FiClock className="w-8 h-8" />,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Considered',
      value: stats.considered,
      icon: <FiCheckCircle className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Denied',
      value: stats.denied,
      icon: <FiXCircle className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/20',
    },
  ];

  // Show redirecting message if user doesn't have full access
  if (status === 'authenticated' && !session?.user?.permissions?.hasFullAccess) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-4">
        <div className="glass-blue rounded-3xl p-8 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                Redirecting...
              </h2>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                You don't have access to the dashboard. Taking you to VC Stats.
              </p>
            </div>
            <button
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.replace('/admin');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/30"
            >
              <FiLogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">Monitor and manage staff applications</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] animate-pulse"
            >
              <div className="h-16 sm:h-20 bg-[rgb(var(--color-bg-tertiary))] rounded-apple"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-blue-glow active:scale-95 apple-transition shadow-apple-md hover:shadow-apple-lg touch-manipulation"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-3 ${card.bgColor} rounded-apple`}>
                  <div className={`bg-gradient-to-br ${card.color} bg-clip-text text-transparent flex justify-center items-center scale-75 sm:scale-100 origin-top-left`}>
                    {card.icon}
                  </div>
                </div>
              </div>
              <h3 className="text-[rgb(var(--color-text-tertiary))] text-[10px] sm:text-sm font-medium mb-1 truncate">
                {card.title}
              </h3>
              <p className="text-xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))]">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-blue rounded-3xl p-5 sm:p-6 md:p-8 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-apple-md">
        <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-4 sm:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Link
            href="/admin/dashboard/applications"
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
          >
            <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
              <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">View All Applications</h3>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Review and manage applications</p>
            </div>
          </Link>

          <Link
            href="/admin/dashboard/applications?status=pending"
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
          >
            <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
              <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Pending Applications</h3>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Review applications awaiting decision</p>
            </div>
          </Link>

          <Link
            href="/admin/monitor"
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
          >
            <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
              <FiActivity className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Live Economy Monitor</h3>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Real-time VC coins and activity tracking</p>
            </div>
          </Link>

          <Link
            href="/admin/casino"
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
          >
            <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
              <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Casino / Shop</h3>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Manage economy, shop items, purchases</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-blue rounded-3xl p-5 sm:p-6 md:p-8 border border-[rgb(var(--color-border))] shadow-apple-md">
        <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-4 sm:mb-6">System Information</h2>
        <div className="space-y-3 sm:space-y-4 text-[rgb(var(--color-text-secondary))]">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
            <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm sm:text-base">Database connection: Active</span>
          </div>
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
            <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm sm:text-base">API status: Operational</span>
          </div>
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
            <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm sm:text-base">Application form: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
