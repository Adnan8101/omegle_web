'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback,useEffect,useState } from 'react';
import {
FiActivity,
FiAlertTriangle,
FiChevronRight,
FiClock,
FiMessageSquare,
FiMic,
FiSearch,
FiShield,
FiSlash,
FiUsers,
FiUserX
} from 'react-icons/fi';
interface ModStats {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  in_guild: boolean;
  joined_at: string | null;
  is_mod: boolean;
  roles: string[];
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
  activity: {
    vc_sessions: number;
    total_vc_time: number;
    message_count: number;
  };
}
export default function ModsStatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mods, setMods] = useState<ModStats[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'cases' | 'vc' | 'messages' | 'name'>('cases');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setIsRedirecting(true);
      router.replace('/admin');
      return;
    }
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      if (!perms?.hasFullAccess && !perms?.hasSrModAccess) {
        setHasPermission(false);
        if (perms?.hasCasinoAccess) {
          setIsRedirecting(true);
          router.replace('/admin/casino');
        } else if (perms?.hasModeratorAccess) {
          setIsRedirecting(true);
          router.replace('/admin/automod');
        } else {
          setIsRedirecting(true);
          router.replace('/admin');
        }
        return;
      }
      setHasPermission(true);
    }
  }, [status, session, router]);
  const fetchMods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mods-stats');
      if (response.ok) {
        const data = await response.json();
        setMods(data.mods || []);
        setOverview(data.overview || null);
      }
    } catch (error) {
      console.error('Error fetching mods:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (status === 'authenticated' && hasPermission) {
      fetchMods();
    }
  }, [status, hasPermission, fetchMods]);
  if (status === 'loading' || hasPermission === null || isRedirecting) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
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
                You do not have permission to access Mod Stats.
              </p>
            </div>
            <button
              onClick={() => {
                const perms = session?.user?.permissions;
                if (perms?.hasCasinoAccess) {
                  router.replace('/admin/casino');
                } else if (perms?.hasSrModAccess) {
                  router.replace('/admin/vctranscript');
                } else if (perms?.hasModeratorAccess) {
                  router.replace('/admin/automod');
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
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const filteredMods = mods
    .filter(mod => {
      const searchLower = searchTerm.toLowerCase();
      return (
        mod.display_name.toLowerCase().includes(searchLower) ||
        mod.username.toLowerCase().includes(searchLower) ||
        mod.user_id.includes(searchTerm)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'cases':
          comparison = a.stats.total_cases - b.stats.total_cases;
          break;
        case 'vc':
          comparison = a.activity.total_vc_time - b.activity.total_vc_time;
          break;
        case 'messages':
          comparison = a.activity.message_count - b.activity.message_count;
          break;
        case 'name':
          comparison = a.display_name.localeCompare(b.display_name);
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });
  const totalStats = overview || mods.reduce(
    (acc, mod) => ({
      cases: acc.cases + mod.stats.total_cases,
      mutes: acc.mutes + mod.stats.mutes,
      bans: acc.bans + mod.stats.bans,
      kicks: acc.kicks + mod.stats.kicks,
      warns: acc.warns + mod.stats.warns,
      manuals: acc.manuals + mod.stats.total_manuals,
    }),
    { cases: 0, mutes: 0, bans: 0, kicks: 0, warns: 0, manuals: 0 }
  );
  const displayStats = overview ? {
    cases: overview.total_cases || 0,
    mutes: overview.mutes || 0,
    bans: overview.bans || 0,
    kicks: overview.kicks || 0,
    warns: overview.warns || 0,
    manuals: overview.total_manuals || 0,
  } : totalStats;
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading moderator stats...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-1 sm:mb-2">
          Moderator Stats
        </h1>
        <p className="text-xs sm:text-base text-[rgb(var(--color-text-secondary))]">
          View statistics and activity for all staff members
        </p>
      </div>
      {}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Staff Members</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{mods.length}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiShield className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Total Cases</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{displayStats.cases.toLocaleString()}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiSlash className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Mutes</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{displayStats.mutes.toLocaleString()}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiUserX className="w-4 h-4 text-red-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Bans</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{displayStats.bans.toLocaleString()}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Warns</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{displayStats.warns.toLocaleString()}</p>
        </div>
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
          <div className="flex items-center gap-2 mb-2">
            <FiActivity className="w-4 h-4 text-green-500" />
            <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Manuals</span>
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{displayStats.manuals.toLocaleString()}</p>
        </div>
      </div>
      {}
      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-6 border border-[rgb(var(--color-border))] mb-8">
        <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-6">Action Distribution</h2>
        <div className="space-y-4">
          {[
            { label: 'Mutes', count: displayStats.mutes, color: 'bg-orange-500', icon: FiSlash },
            { label: 'Bans', count: displayStats.bans, color: 'bg-red-500', icon: FiUserX },
            { label: 'Kicks', count: displayStats.kicks, color: 'bg-yellow-500', icon: FiUserX },
            { label: 'Warns', count: displayStats.warns, color: 'bg-yellow-400', icon: FiAlertTriangle },
            { label: 'Manuals', count: displayStats.manuals, color: 'bg-green-500', icon: FiActivity },
          ].map(({ label, count, color, icon: Icon }) => {
            const percentage = displayStats.cases > 0 ? (count / displayStats.cases) * 100 : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                    <span className="text-sm font-medium text-[rgb(var(--color-text-primary))]">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">{count.toLocaleString()}</span>
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))] w-12 text-right">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-[rgb(var(--color-bg-tertiary))] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[rgb(var(--color-text-primary))]"
          >
            <option value="cases">Sort by Cases</option>
            <option value="vc">Sort by VC Time</option>
            <option value="messages">Sort by Messages</option>
            <option value="name">Sort by Name</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-3 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
          >
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMods.map((mod) => (
          <button
            key={mod.user_id}
            onClick={() => router.push(`/admin/mods-stats/${mod.user_id}`)}
            className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-5 border border-[rgb(var(--color-border))] hover:border-blue-500/50 hover:shadow-lg transition-all text-left group"
          >
            {}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <img
                  src={mod.avatar_url}
                  alt={mod.display_name}
                  className="w-14 h-14 rounded-full border-2 border-[rgb(var(--color-border))] group-hover:border-blue-500 transition-colors"
                  onError={(e) => {
                    const defaultIndex = Number(BigInt(mod.user_id) >> 22n) % 6;
                    e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
                  }}
                />
                {mod.in_guild && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[rgb(var(--color-bg-secondary))]"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))] truncate group-hover:text-blue-500 transition-colors">
                  {mod.display_name}
                </h3>
                <p className="text-sm text-[rgb(var(--color-text-tertiary))] truncate">@{mod.username}</p>
              </div>
              <FiChevronRight className="w-5 h-5 text-[rgb(var(--color-text-tertiary))] group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            {}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-xl font-bold text-purple-500">{mod.stats.total_cases}</p>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Cases</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-500">{mod.stats.mutes}</p>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Mutes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-500">{mod.stats.bans}</p>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Bans</p>
              </div>
            </div>
            {}
            <div className="flex items-center justify-between text-sm border-t border-[rgb(var(--color-border))] pt-4">
              <div className="flex items-center gap-1 text-[rgb(var(--color-text-secondary))]">
                <FiMic className="w-4 h-4" />
                <span>{formatDuration(mod.activity.total_vc_time)}</span>
              </div>
              <div className="flex items-center gap-1 text-[rgb(var(--color-text-secondary))]">
                <FiMessageSquare className="w-4 h-4" />
                <span>{mod.activity.message_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-[rgb(var(--color-text-secondary))]">
                <FiClock className="w-4 h-4" />
                <span className="text-xs">{formatDate(mod.stats.last_action)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {filteredMods.length === 0 && (
        <div className="text-center py-12">
          <FiUsers className="w-16 h-16 mx-auto mb-4 text-[rgb(var(--color-text-tertiary))]" />
          <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">No Moderators Found</h3>
          <p className="text-[rgb(var(--color-text-secondary))]">
            {searchTerm ? 'Try a different search term' : 'No staff members with the required roles found'}
          </p>
        </div>
      )}
    </div>
  );
}