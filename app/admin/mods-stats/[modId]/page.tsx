'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiShield, FiSlash, FiUserX, FiAlertTriangle, FiClock, 
  FiMic, FiMessageSquare, FiActivity, FiFile, FiCheckCircle, FiXCircle,
  FiUser, FiCalendar, FiHash
} from 'react-icons/fi';
import DateRangeFilter from '@/components/DateRangeFilter';

interface ModDetails {
  mod: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    tag: string;
    in_guild: boolean;
  };
  stats: {
    total_cases: number;
    mutes: number;
    bans: number;
    kicks: number;
    warns: number;
    unbans: number;
    unmutes: number;
    first_action: string | null;
    last_action: string | null;
  };
  cases: Array<{
    id: string;
    case_number: number;
    action: string;
    target_id: string;
    target_username: string;
    target_display_name: string;
    target_avatar: string;
    reason: string | null;
    duration_seconds: number | null;
    created_at: string;
    active: boolean;
  }>;
  manuals: {
    created: Array<{
      id: string;
      manual_number: number;
      target_id: string;
      target_display_name: string;
      target_avatar: string;
      offense: string;
      action: string;
      advise: string | null;
      note_proof: string | null;
      reviewed_by: string[];
      created_at: string;
    }>;
    reviewed: Array<{
      id: string;
      manual_number: number;
      target_id: string;
      target_display_name: string;
      moderator_id: string;
      moderator_display_name: string;
      offense: string;
      action: string;
      created_at: string;
    }>;
  };
  activity: {
    vc: {
      vc_sessions: number;
      total_vc_time: number;
      avg_session_duration: number;
      longest_session: number;
      unique_channels: number;
    };
    vc_sessions: Array<{
      id: string;
      channel_id: string;
      channel_name: string;
      joined_at: string;
      left_at: string;
      duration_seconds: number;
    }>;
    chat: {
      message_count: number;
      unique_channels: number;
      total_characters: number;
      messages_in_vc: number;
    };
    by_day: Array<{
      date: string;
      case_count: number;
      mutes: number;
      bans: number;
      warns: number;
    }>;
    by_hour: Array<{
      hour: number;
      case_count: number;
    }>;
  };
}

export default function ModDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const modId = params.modId as string;

  const [modDetails, setModDetails] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cases' | 'manuals' | 'activity'>('cases');
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ 
    startDate: null, 
    endDate: null 
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    } else if (status === 'authenticated' && !session?.user?.permissions?.hasFullAccess) {
      // Mods stats requires full access (admin/manage server)
      router.replace('/admin');
    }
  }, [status, session, router]);

  const fetchModDetails = useCallback(async (range?: { startDate: string | null; endDate: string | null }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const r = range || dateRange;
      if (r.startDate) params.set('startDate', r.startDate);
      if (r.endDate) params.set('endDate', r.endDate);

      const response = await fetch(`/api/mods-stats/${modId}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setModDetails(data);
      }
    } catch (error) {
      console.error('Error fetching mod details:', error);
    } finally {
      setLoading(false);
    }
  }, [modId, dateRange]);

  useEffect(() => {
    if (status === 'authenticated' && modId) {
      fetchModDetails();
    }
  }, [status, modId, fetchModDetails]);

  const handleDateRangeChange = useCallback((range: { startDate: string | null; endDate: string | null }) => {
    setDateRange(range);
    fetchModDetails(range);
  }, [fetchModDetails]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0h 0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'MUTE':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'BAN':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'KICK':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'WARN':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'UNBAN':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'UNMUTE':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  if (loading || !modDetails) {
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

  const { mod, stats, cases, manuals, activity } = modDetails;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link 
          href="/admin/mods-stats"
          className="inline-flex items-center gap-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Moderators
        </Link>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="relative">
            <img
              src={mod.avatar_url}
              alt={mod.display_name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-500/30"
              onError={(e) => {
                const defaultIndex = Number(BigInt(mod.id) >> 22n) % 6;
                e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
              }}
            />
            {mod.in_guild && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[rgb(var(--color-bg-primary))]"></div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-1">
              {mod.display_name}
            </h1>
            <p className="text-[rgb(var(--color-text-secondary))]">{mod.tag}</p>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))] font-mono mt-1">{mod.id}</p>
          </div>
          <div className="w-full sm:w-auto">
            <DateRangeFilter onChange={handleDateRangeChange} />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-8">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiShield className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Total Cases</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{parseInt(stats.total_cases as any) || 0}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiSlash className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Mutes</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{parseInt(stats.mutes as any) || 0}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiUserX className="w-4 h-4 text-red-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Bans</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{parseInt(stats.bans as any) || 0}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Warns</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{parseInt(stats.warns as any) || 0}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiMic className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">VC Time</span>
          </div>
          <p className="text-xl font-bold text-blue-500">{formatDuration(activity.vc.total_vc_time)}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiMessageSquare className="w-4 h-4 text-green-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Messages</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{parseInt(activity.chat.message_count as any) || 0}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiFile className="w-4 h-4 text-indigo-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Manuals</span>
          </div>
          <p className="text-2xl font-bold text-indigo-500">{manuals.created.length}</p>
        </div>
      </div>

      {/* Activity Charts */}
      {activity.by_day.length > 0 && (
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-5 border border-[rgb(var(--color-border))] mb-8">
          <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4">Activity (Last 30 Days)</h3>
          <div className="h-40 flex items-end gap-1">
            {activity.by_day.slice(0, 30).reverse().map((day, idx) => {
              const maxCases = Math.max(...activity.by_day.map(d => parseInt(d.case_count as any) || 0), 1);
              const height = ((parseInt(day.case_count as any) || 0) / maxCases) * 100;
              return (
                <div 
                  key={idx} 
                  className="flex-1 bg-blue-500/80 hover:bg-blue-500 transition-colors rounded-t cursor-pointer group relative"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${new Date(day.date).toLocaleDateString()}: ${day.case_count} cases`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                      <p className="font-semibold">{new Date(day.date).toLocaleDateString()}</p>
                      <p>{day.case_count} cases</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[rgb(var(--color-border))] mb-6 gap-1">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 sm:px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'cases'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
          }`}
        >
          Cases
          <span className="ml-2 px-2 py-0.5 text-xs bg-[rgb(var(--color-bg-tertiary))] rounded-full">
            {cases.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('manuals')}
          className={`px-4 sm:px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'manuals'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
          }`}
        >
          Manuals
          <span className="ml-2 px-2 py-0.5 text-xs bg-[rgb(var(--color-bg-tertiary))] rounded-full">
            {manuals.created.length + manuals.reviewed.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 sm:px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'activity'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
          }`}
        >
          Activity
        </button>
      </div>

      {/* Cases Tab */}
      {activeTab === 'cases' && (
        <div className="space-y-3">
          {cases.length === 0 ? (
            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-8 border border-[rgb(var(--color-border))] text-center">
              <FiShield className="w-12 h-12 mx-auto mb-4 text-[rgb(var(--color-text-tertiary))]" />
              <p className="text-[rgb(var(--color-text-secondary))]">No moderation cases found</p>
            </div>
          ) : (
            cases.map((c) => (
              <div 
                key={c.id}
                className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border-hover))] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Target User */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={c.target_avatar}
                      alt={c.target_display_name}
                      className="w-10 h-10 rounded-full border border-[rgb(var(--color-border))]"
                      onError={(e) => {
                        const defaultIndex = Number(BigInt(c.target_id) >> 22n) % 6;
                        e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">{c.target_display_name}</p>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">{c.target_id}</p>
                    </div>
                  </div>

                  {/* Case Info */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="px-2 py-1 bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] rounded font-mono text-xs">
                      #{c.case_number}
                    </span>
                    <span className={`px-3 py-1 rounded font-semibold text-sm uppercase border ${getActionColor(c.action)}`}>
                      {c.action}
                    </span>
                    {!c.active && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">Revoked</span>
                    )}
                  </div>
                </div>

                {/* Reason & Details */}
                <div className="mt-3 pt-3 border-t border-[rgb(var(--color-border))]">
                  {c.reason && (
                    <p className="text-[rgb(var(--color-text-secondary))] text-sm mb-2">
                      <span className="font-semibold text-[rgb(var(--color-text-primary))]">Reason:</span> {c.reason}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[rgb(var(--color-text-tertiary))]">
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {formatDate(c.created_at)}
                    </span>
                    {c.duration_seconds !== null && c.duration_seconds > 0 && (
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        Duration: {formatDuration(c.duration_seconds)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Manuals Tab */}
      {activeTab === 'manuals' && (
        <div className="space-y-6">
          {/* Created Manuals */}
          <div>
            <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              Created by {mod.display_name}
              <span className="ml-2 text-sm font-normal text-[rgb(var(--color-text-tertiary))]">
                ({manuals.created.length})
              </span>
            </h3>
            {manuals.created.length === 0 ? (
              <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-6 border border-[rgb(var(--color-border))] text-center">
                <p className="text-[rgb(var(--color-text-secondary))]">No manual cases created</p>
              </div>
            ) : (
              <div className="space-y-3">
                {manuals.created.map((m) => (
                  <div 
                    key={m.id}
                    className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-5 border border-[rgb(var(--color-border))]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={m.target_avatar}
                          alt={m.target_display_name}
                          className="w-10 h-10 rounded-full border border-[rgb(var(--color-border))]"
                          onError={(e) => {
                            const defaultIndex = Number(BigInt(m.target_id) >> 22n) % 6;
                            e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">{m.target_display_name}</p>
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">{m.target_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded font-mono text-xs">
                          Manual #{m.manual_number}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">Offense:</span> <span className="text-[rgb(var(--color-text-secondary))]">{m.offense}</span></p>
                      <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">Action:</span> <span className="text-[rgb(var(--color-text-secondary))]">{m.action}</span></p>
                      {m.advise && (
                        <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">Advice:</span> <span className="text-[rgb(var(--color-text-secondary))]">{m.advise}</span></p>
                      )}
                      {m.note_proof && (
                        <p><span className="font-semibold text-[rgb(var(--color-text-primary))]">Note/Proof:</span> <span className="text-[rgb(var(--color-text-secondary))]">{m.note_proof}</span></p>
                      )}
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))] pt-2">
                        <FiCalendar className="w-3 h-3 inline mr-1" />
                        {formatDate(m.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed Manuals */}
          {manuals.reviewed.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                Reviewed by {mod.display_name}
                <span className="ml-2 text-sm font-normal text-[rgb(var(--color-text-tertiary))]">
                  ({manuals.reviewed.length})
                </span>
              </h3>
              <div className="space-y-3">
                {manuals.reviewed.map((m) => (
                  <div 
                    key={m.id}
                    className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded font-mono text-xs">
                        Manual #{m.manual_number}
                      </span>
                      <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                        Created by {m.moderator_display_name || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold text-[rgb(var(--color-text-primary))]">Target:</span>{' '}
                      <span className="text-[rgb(var(--color-text-secondary))]">{m.target_display_name || m.target_id}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-[rgb(var(--color-text-primary))]">Offense:</span>{' '}
                      <span className="text-[rgb(var(--color-text-secondary))]">{m.offense}</span>
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                      {formatDate(m.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* VC Stats */}
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-5 border border-[rgb(var(--color-border))]">
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
              <FiMic className="w-5 h-5 text-blue-500" />
              Voice Channel Activity
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Total Time</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {formatDuration(activity.vc.total_vc_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Sessions</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {activity.vc.vc_sessions}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Avg Session</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {formatDuration(Math.round(activity.vc.avg_session_duration))}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Longest Session</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {formatDuration(activity.vc.longest_session)}
                </p>
              </div>
            </div>

            {/* Recent VC Sessions */}
            {activity.vc_sessions.length > 0 && (
              <div className="border-t border-[rgb(var(--color-border))] pt-4 mt-4">
                <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3">Recent Sessions</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.vc_sessions.slice(0, 20).map((session) => (
                    <div key={session.id} className="flex items-center justify-between text-sm bg-[rgb(var(--color-bg-tertiary))] rounded-lg p-3">
                      <div>
                        <p className="font-medium text-[rgb(var(--color-text-primary))]">{session.channel_name || 'Unknown Channel'}</p>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                          {new Date(session.joined_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-blue-500 font-semibold">
                        {formatDuration(session.duration_seconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Stats */}
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-5 border border-[rgb(var(--color-border))]">
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
              <FiMessageSquare className="w-5 h-5 text-green-500" />
              Chat Activity
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Messages Sent</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {parseInt(activity.chat.message_count as any) || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Unique Channels</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {parseInt(activity.chat.unique_channels as any) || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Total Characters</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {(parseInt(activity.chat.total_characters as any) || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Messages in VC</p>
                <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                  {parseInt(activity.chat.messages_in_vc as any) || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Activity by Hour */}
          {activity.by_hour.length > 0 && (
            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-5 border border-[rgb(var(--color-border))]">
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-4">Activity by Hour</h3>
              <div className="h-32 flex items-end gap-0.5">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourData = activity.by_hour.find(h => parseInt(h.hour as any) === hour);
                  const caseCount = parseInt(hourData?.case_count as any) || 0;
                  const maxCases = Math.max(...activity.by_hour.map(h => parseInt(h.case_count as any) || 0), 1);
                  const height = (caseCount / maxCases) * 100;
                  return (
                    <div 
                      key={hour} 
                      className="flex-1 bg-purple-500/70 hover:bg-purple-500 transition-colors rounded-t cursor-pointer group relative"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${hour}:00 - ${caseCount} cases`}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                          <p className="font-semibold">{hour}:00</p>
                          <p>{caseCount} cases</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
