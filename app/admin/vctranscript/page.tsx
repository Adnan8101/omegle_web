'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiUsers, FiClock, FiActivity, FiSearch, FiArrowUp, FiChevronRight } from 'react-icons/fi';
import DateRangeFilter from '@/components/DateRangeFilter';

// Build avatar URL from hash (handles both hash and legacy full URLs)
function buildAvatarUrl(userId: string, avatarHash: string | null, discriminator: string = '0', size: number = 128): string {
  if (avatarHash) {
    // Check if it's already a full URL (legacy data)
    if (avatarHash.startsWith('https://cdn.discordapp.com/')) {
      if (avatarHash.includes('?size=')) {
        return avatarHash.replace(/\?size=\d+/, `?size=${size}`);
      }
      return avatarHash;
    }
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  }
  // Default avatar
  if (discriminator === '0' || !discriminator) {
    const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  const defaultIndex = parseInt(discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

interface User {
  user_id: string;
  session_count: number;
  total_duration: number;
  last_active: string;
  // From cache join
  username?: string;
  display_name?: string;
  avatar_url?: string;
  in_guild?: boolean;
  nickname?: string;
}

interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  inGuild: boolean;
}

type SortField = 'duration' | 'sessions' | 'last_active' | 'name';
type SortDir = 'asc' | 'desc';

export default function VCTranscriptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [discordUsers, setDiscordUsers] = useState<Map<string, DiscordUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasDbError, setHasDbError] = useState(false);
  const [sortField, setSortField] = useState<SortField>('duration');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const fetchUsers = useCallback(async (range?: { startDate: string | null; endDate: string | null }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const r = range || dateRange;
      if (r.startDate) params.set('startDate', r.startDate);
      if (r.endDate) params.set('endDate', r.endDate);
      const response = await fetch(`/api/vctranscript/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        const userList: User[] = data.users || [];
        setUsers(userList);

        // Get all user IDs
        const userIds = userList.map((u: User) => u.user_id);
        
        if (userIds.length > 0) {
          // Use new centralized user-data API - no caching, fetch on demand
          const batchRes = await fetch('/api/discord/user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds }),
          });
          const batchData = await batchRes.json();
          if (batchData.users) {
            const discordMap = new Map<string, DiscordUser>();
            for (const [uid, info] of Object.entries(batchData.users)) {
              const userData = info as any;
              discordMap.set(uid, {
                id: userData.id,
                username: userData.username,
                displayName: userData.displayName,
                avatar: userData.avatar,
                inGuild: userData.inGuild,
              });
            }
            setDiscordUsers(discordMap);
          }
        }
      } else {
        setHasDbError(true);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setHasDbError(true);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Check authentication and permissions
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setIsRedirecting(true);
      router.replace('/admin');
      return;
    }
    
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      // VC Transcript accessible to: Full Access, Moderator, Trail Mod/View Only
      const canAccess = perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasViewOnlyAccess;
      
      if (!canAccess) {
        setHasPermission(false);
        // Redirect to appropriate page based on permissions
        if (perms?.hasCasinoAccess) {
          setIsRedirecting(true);
          router.replace('/admin/casino');
        } else {
          setIsRedirecting(true);
          router.replace('/admin');
        }
        return;
      }
      
      setHasPermission(true);
      fetchUsers();
    }
  }, [status, session, router, fetchUsers]);

  // Show loading state while checking auth/permissions
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

  // Show access denied if no permission
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
                You do not have permission to access VC Stats.
              </p>
            </div>
            <button
              onClick={() => {
                const perms = session?.user?.permissions;
                if (perms?.hasCasinoAccess) {
                  router.replace('/admin/casino');
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

  const getUser = (userId: string): DiscordUser => {
    return discordUsers.get(userId) || {
      id: userId,
      username: 'Unknown',
      displayName: 'Unknown User',
      avatar: buildAvatarUrl(userId, null, '0', 128),
      inGuild: false,
    };
  };

  const filteredUsers = users
    .filter(user => {
      const du = getUser(user.user_id);
      const term = searchTerm.toLowerCase();
      return user.user_id.includes(term) ||
        du.displayName.toLowerCase().includes(term) ||
        du.username.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      switch (sortField) {
        case 'duration': return (Number(a.total_duration) - Number(b.total_duration)) * dir;
        case 'sessions': return (Number(a.session_count) - Number(b.session_count)) * dir;
        case 'last_active': return (new Date(a.last_active).getTime() - new Date(b.last_active).getTime()) * dir;
        case 'name': return getUser(a.user_id).displayName.localeCompare(getUser(b.user_id).displayName) * dir;
        default: return 0;
      }
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2">
            VC Transcript Dashboard
          </h1>
          <p className="text-[rgb(var(--color-text-secondary))] mb-4">
            View voice channel activity for all users • Live data from Discord
          </p>
          <DateRangeFilter onChange={(r) => { setDateRange(r); fetchUsers(r); }} initialRange={dateRange} />
        </div>

        {hasDbError && users.length === 0 && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <span className="text-yellow-500 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">Database Connection Issue</p>
              <p className="text-yellow-600/70 dark:text-yellow-400/70 text-xs mt-1">
                Could not connect to the bot database. Check that the database is accessible.
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
            <input
              type="text"
              placeholder="Search by name, username, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-6 border border-[rgb(var(--color-border))] animate-pulse">
                  <div className="h-3 w-20 bg-[rgb(var(--color-bg-tertiary))] rounded mb-3"></div>
                  <div className="h-8 w-16 bg-[rgb(var(--color-bg-tertiary))] rounded"></div>
                </div>
              ))}
            </div>
            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] p-6">
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-14 bg-[rgb(var(--color-bg-tertiary))] rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {users.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <FiUsers className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                    <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">Total Users</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))]">{users.length}</p>
                </div>
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <FiActivity className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                    <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">Total Sessions</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))]">
                    {users.reduce((sum, u) => sum + Number(u.session_count), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-blue-500/50 transition-colors">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <FiClock className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                    <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">Total VC Time</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))]">
                    {formatDuration(users.reduce((sum, u) => sum + Number(u.total_duration), 0))}
                  </p>
                </div>
              </div>
            )}

            {filteredUsers.length === 0 && users.length === 0 ? (
              <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))] p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No Users Found</h2>
                <p className="text-[rgb(var(--color-text-secondary))] mb-6">
                  No voice channel activity data is available. Start the bot and wait for users to join voice channels.
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))] p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No Results</h2>
                <p className="text-[rgb(var(--color-text-secondary))] mb-4">
                  No users match &quot;{searchTerm}&quot;
                </p>
                <button onClick={() => setSearchTerm('')} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium">
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden shadow-apple-md -mx-4 sm:mx-0">
                <div className="overflow-x-auto w-full touch-pan-x">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                          <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-[rgb(var(--color-text-primary))] transition-colors">
                            User <FiArrowUp className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                          <button onClick={() => toggleSort('sessions')} className="flex items-center gap-1 hover:text-[rgb(var(--color-text-primary))] transition-colors">
                            Sessions <FiArrowUp className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                          <button onClick={() => toggleSort('duration')} className="flex items-center gap-1 hover:text-[rgb(var(--color-text-primary))] transition-colors">
                            Total Time <FiArrowUp className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                          <button onClick={() => toggleSort('last_active')} className="flex items-center gap-1 hover:text-[rgb(var(--color-text-primary))] transition-colors">
                            Last Active <FiArrowUp className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(var(--color-border))]">
                      {filteredUsers.map((user) => {
                        const du = getUser(user.user_id);
                        return (
                          <tr key={user.user_id} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[rgb(var(--color-border))]">
                                  <Image
                                    src={du.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
                                    alt={du.displayName}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">
                                      {du.displayName}
                                    </p>
                                    {du.inGuild ? (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">IN</span>
                                    ) : (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 font-medium">LEFT</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                    @{du.username} • {user.user_id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                              {Number(user.session_count).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[rgb(var(--color-text-primary))]">
                              {formatDuration(Number(user.total_duration))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[rgb(var(--color-text-secondary))]">
                              {new Date(user.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                href={`/admin/vctranscript/${user.user_id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                View Details
                                <FiChevronRight className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer with count */}
                <div className="px-6 py-3 bg-[rgb(var(--color-bg-tertiary))] border-t border-[rgb(var(--color-border))]">
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                    Showing {filteredUsers.length} of {users.length} users
                    {searchTerm && ` matching "${searchTerm}"`}
                    {' • '}Sorted by {sortField} ({sortDir})
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
