'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  FiArrowLeft, FiShield, FiAlertTriangle, FiSlash, FiUserX, FiActivity,
  FiFilter, FiChevronLeft, FiChevronRight, FiClock, FiCheck, FiX
} from 'react-icons/fi';

interface ModCase {
  id: number;
  case_number: number;
  action: string;
  reason: string | null;
  created_at: string;
  duration_seconds: number | null;
  expires_at: string | null;
  status: string;
  target: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
}

interface ModDetails {
  moderator: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    inGuild: boolean;
  };
  stats: {
    total_cases: number;
    mutes: number;
    bans: number;
    kicks: number;
    warns: number;
    unbans: number;
    unmutes: number;
    total_manuals: number;
    last_action: string | null;
  };
  cases: ModCase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ModDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const modId = params.id as string;

  const [data, setData] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    } else if (status === 'authenticated' && !session?.user?.permissions?.hasFullAccess) {
      router.replace('/admin');
    }
  }, [status, session, router]);

  const fetchModDetails = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URLSearchParams({
        actionType: actionFilter,
        page: page.toString(),
        limit: '50',
      });
      const response = await fetch(`/api/mods-stats/${modId}?${url}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching mod details:', error);
    } finally {
      setLoading(false);
    }
  }, [modId, actionFilter, page]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchModDetails();
    }
  }, [status, fetchModDetails]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BAN': return 'text-red-500 bg-red-500/10';
      case 'MUTE': return 'text-orange-500 bg-orange-500/10';
      case 'KICK': return 'text-yellow-500 bg-yellow-500/10';
      case 'WARN': return 'text-yellow-400 bg-yellow-400/10';
      case 'UNBAN': return 'text-green-500 bg-green-500/10';
      case 'UNMUTE': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BAN': return <FiUserX className="w-4 h-4" />;
      case 'MUTE': return <FiSlash className="w-4 h-4" />;
      case 'KICK': return <FiUserX className="w-4 h-4" />;
      case 'WARN': return <FiAlertTriangle className="w-4 h-4" />;
      case 'UNBAN': return <FiCheck className="w-4 h-4" />;
      case 'UNMUTE': return <FiCheck className="w-4 h-4" />;
      default: return <FiShield className="w-4 h-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Permanent';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading moderator details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors mb-4"
          >
            <FiArrowLeft /> Back
          </button>
          <div className="text-center py-12">
            <p className="text-[rgb(var(--color-text-secondary))]">Moderator not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors mb-6"
      >
        <FiArrowLeft /> Back to Mods Stats
      </button>

      {/* Moderator Header */}
      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-6 border border-[rgb(var(--color-border))] mb-6">
        <div className="flex items-center gap-4">
          <img
            src={data.moderator.avatar}
            alt={data.moderator.displayName}
            className="w-20 h-20 rounded-full"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
              {data.moderator.displayName}
            </h1>
            <p className="text-[rgb(var(--color-text-secondary))]">@{data.moderator.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${data.moderator.inGuild ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                {data.moderator.inGuild ? 'In Server' : 'Left Server'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiShield className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Total</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.total_cases}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiSlash className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Mutes</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.mutes}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiUserX className="w-4 h-4 text-red-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Bans</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.bans}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiUserX className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Kicks</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.kicks}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Warns</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.warns}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Unbans</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.unbans}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiCheck className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Unmutes</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.unmutes}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiActivity className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Manuals</span>
          </div>
          <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">{data.stats.total_manuals}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <FiFilter className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
        <div className="flex flex-wrap gap-2">
          {['all', 'MUTE', 'BAN', 'KICK', 'WARN', 'UNBAN', 'UNMUTE'].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setActionFilter(filter);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg transition-all ${
                actionFilter === filter
                  ? 'bg-blue-500 text-white'
                  : 'bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))]'
              }`}
            >
              {filter === 'all' ? 'All Actions' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {data.cases.length === 0 ? (
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-8 border border-[rgb(var(--color-border))] text-center">
            <p className="text-[rgb(var(--color-text-secondary))]">No cases found</p>
          </div>
        ) : (
          data.cases.map((modCase) => (
            <div
              key={modCase.id}
              className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-5 border border-[rgb(var(--color-border))] hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Target User */}
                <img
                  src={modCase.target.avatar}
                  alt={modCase.target.displayName}
                  className="w-12 h-12 rounded-full"
                />
                
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${getActionColor(modCase.action)}`}>
                      {getActionIcon(modCase.action)}
                      {modCase.action}
                    </span>
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                      Case #{modCase.case_number}
                    </span>
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">•</span>
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                      {formatDate(modCase.created_at)}
                    </span>
                  </div>

                  {/* Target Info */}
                  <p className="font-medium text-[rgb(var(--color-text-primary))] mb-1">
                    {modCase.target.displayName}
                    <span className="text-[rgb(var(--color-text-tertiary))] font-normal ml-2">
                      @{modCase.target.username}
                    </span>
                  </p>

                  {/* Reason */}
                  {modCase.reason && (
                    <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-2">
                      {modCase.reason}
                    </p>
                  )}

                  {/* Duration & Status */}
                  <div className="flex items-center gap-4 text-xs">
                    {modCase.duration_seconds !== null && (
                      <div className="flex items-center gap-1 text-[rgb(var(--color-text-tertiary))]">
                        <FiClock className="w-3 h-3" />
                        Duration: {formatDuration(modCase.duration_seconds)}
                      </div>
                    )}
                    {modCase.status && (
                      <span className={`px-2 py-1 rounded ${
                        modCase.status === 'ACTIVE' 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {modCase.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-[rgb(var(--color-border))]">
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">
            Showing {((page - 1) * 50) + 1} - {Math.min(page * 50, data.pagination.total)} of {data.pagination.total} cases
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-tertiary))] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FiChevronLeft />
            </button>
            <span className="px-4 py-2 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-lg">
              {page} / {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-tertiary))] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
