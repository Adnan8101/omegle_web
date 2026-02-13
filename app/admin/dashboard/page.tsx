'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  pending: number;
  considered: number;
  denied: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    considered: 0,
    denied: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Pending Review',
      value: stats.pending,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Considered',
      value: stats.considered,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Denied',
      value: stats.denied,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/20',
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">Monitor and manage staff applications</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] animate-pulse"
            >
              <div className="h-20 bg-[rgb(var(--color-bg-tertiary))] rounded-apple"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="glass-blue rounded-3xl p-5 sm:p-6 border border-[rgb(var(--color-border))] hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-blue-glow active:scale-95 apple-transition shadow-apple-md hover:shadow-apple-lg touch-manipulation"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 sm:p-3 ${card.bgColor} rounded-apple`}>
                  <div className={`bg-gradient-to-br ${card.color} bg-clip-text text-transparent`}>
                    {card.icon}
                  </div>
                </div>
              </div>
              <h3 className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))]">{card.value}</p>
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
            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
          >
            <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">View All Applications</h3>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Review and manage applications</p>
            </div>
          </Link>

          <Link
            href="/admin/dashboard/applications?status=pending"
            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
          >
            <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Pending Applications</h3>
              <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Review applications awaiting decision</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-blue rounded-3xl p-5 sm:p-6 md:p-8 border border-[rgb(var(--color-border))] shadow-apple-md">
        <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-4 sm:mb-6">System Information</h2>
        <div className="space-y-3 sm:space-y-4 text-[rgb(var(--color-text-secondary))]">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm sm:text-base">Database connection: Active</span>
          </div>
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm sm:text-base">API status: Operational</span>
          </div>
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm sm:text-base">Application form: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
