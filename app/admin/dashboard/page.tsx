'use client';
import { signOut,useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
import {
FiActivity,
FiAward,
FiCheckCircle,
FiClock,
FiDollarSign,
FiFileText,
FiLogOut,
FiMic,
FiShield,
FiUsers,
FiXCircle
} from 'react-icons/fi';
interface Stats {
  total: number;
  pending: number;
  considered: number;
  denied: number;
}
interface WeeklySummary {
  totalRules: number;
  enabledRules: number;
  totalHolders: number;
  failedOperations: number;
  cycleEnd: string | null;
  msRemaining: number;
}
function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Finalizing';
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
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
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const DASHBOARD_CACHE_KEY = 'admin_dashboard_stats_v1';
  const DASHBOARD_CACHE_TTL_MS = 60_000;
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    } else if (status === 'authenticated' && !session?.user?.permissions?.hasAnyAccess) {
      router.replace('/admin');
    } else if (status === 'authenticated') {
      if (session?.user?.permissions?.hasFullAccess) {
        try {
          const cachedRaw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { timestamp: number; stats: Stats };
            if (Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL_MS) {
              setStats(cached.stats);
              setLoading(false);
            }
          }
        } catch {
        }
        fetchStats();
        fetchWeeklySummary();
      } else {
        setLoading(false);
      }
      router.prefetch('/admin/monitor');
      router.prefetch('/admin/shop');
      router.prefetch('/admin/dashboard/applications');
      router.prefetch('/admin/weekly-activity');
    }
  }, [status, session, router]);
  const fetchWeeklySummary = async () => {
    try {
      const [statsResponse, cycleResponse] = await Promise.all([
        fetch('/api/weekly-activity/stats'),
        fetch('/api/weekly-activity/cycle'),
      ]);
      if (!statsResponse.ok) return;
      const statsData = await statsResponse.json();
      const cycleData = cycleResponse.ok ? await cycleResponse.json() : null;
      setWeekly({
        totalRules: statsData.totalRules ?? 0,
        enabledRules: statsData.enabledRules ?? 0,
        totalHolders: statsData.totalHolders ?? 0,
        failedOperations: statsData.failedOperations ?? 0,
        cycleEnd: cycleData?.current?.end ?? null,
        msRemaining: cycleData?.current?.msRemaining ?? 0,
      });
    } catch (error) {
      console.error('Error fetching weekly activity summary:', error);
    }
  };
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/applications/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
        try {
          sessionStorage.setItem(
            DASHBOARD_CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), stats: result.data })
          );
        } catch {
        }
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
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Pending Review',
      value: stats.pending,
      icon: <FiClock className="w-8 h-8" />,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
    },
    {
      title: 'Considered',
      value: stats.considered,
      icon: <FiCheckCircle className="w-8 h-8" />,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Denied',
      value: stats.denied,
      icon: <FiXCircle className="w-8 h-8" />,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-500/20',
    },
  ];
  if (status === 'authenticated' && !session?.user?.permissions?.hasAnyAccess) {
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
                You do not have access to the dashboard. Taking you back.
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
  const perms = session?.user?.permissions;
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 tracking-tight">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">Monitor and manage community staff panel</p>
      </div>
      {perms?.hasFullAccess ? (
        loading ? (
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
                    <div className={`flex justify-center items-center scale-75 sm:scale-100 origin-top-left ${card.iconColor}`}>
                      {card.icon}
                    </div>
                  </div>
                </div>
                <h3 className="text-[rgb(var(--color-text-secondary))] text-xs sm:text-sm font-semibold mb-1 truncate uppercase tracking-wide">
                  {card.title}
                </h3>
                <p className="text-xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))]">{card.value}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="glass-blue rounded-3xl p-6 sm:p-8 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-apple-md">
          <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Welcome Back!</h2>
          <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] font-light">
            You are logged into the Omeglee Admin Panel. Use the quick action shortcuts below or the sidebar navigation to manage your assigned sections.
          </p>
        </div>
      )}
      {perms?.hasFullAccess && weekly && (
        <div className="glass-blue rounded-3xl p-5 sm:p-6 md:p-8 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-apple-md">
          <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">Weekly Activity Roles</h2>
            <Link
              href="/admin/weekly-activity"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage rules
            </Link>
          </div>
          {weekly.totalRules === 0 ? (
            <div className="p-4 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] rounded-apple">
              <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] mb-3">
                No weekly rules configured yet. Create one to automatically reward your most active chat and voice members every week.
              </p>
              <Link
                href="/admin/weekly-activity"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-apple text-sm font-medium apple-transition"
              >
                <FiAward className="w-4 h-4" />
                Create First Rule
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Active Rules', value: `${weekly.enabledRules} / ${weekly.totalRules}`, icon: <FiAward className="w-5 h-5 text-amber-500" /> },
                { label: 'Members Holding Roles', value: weekly.totalHolders, icon: <FiUsers className="w-5 h-5 text-purple-500" /> },
                { label: 'Cycle Ends In', value: formatRemaining(weekly.msRemaining), icon: <FiClock className="w-5 h-5 text-blue-500" /> },
                {
                  label: 'Pending Retries',
                  value: weekly.failedOperations,
                  icon: <FiShield className={`w-5 h-5 ${weekly.failedOperations > 0 ? 'text-orange-500' : 'text-green-500'}`} />,
                },
              ].map((card) => (
                <div key={card.label} className="p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-apple border border-[rgb(var(--color-border))]">
                  <div className="flex items-center gap-2 mb-1.5">
                    {card.icon}
                    <span className="text-xs text-[rgb(var(--color-text-tertiary))] truncate">{card.label}</span>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="glass-blue rounded-3xl p-5 sm:p-6 md:p-8 border border-[rgb(var(--color-border))] mb-6 sm:mb-8 shadow-apple-md">
        <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))] mb-4 sm:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {perms?.hasFullAccess && (
            <>
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
            </>
          )}
          {perms?.hasFullAccess && (
            <Link
              href="/admin/weekly-activity"
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
            >
              <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Weekly Activity Roles</h3>
                <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Reward top chat and VC members every week</p>
              </div>
            </Link>
          )}
          {perms?.hasFullAccess && (
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
          )}
          {(perms?.hasFullAccess || perms?.hasCasinoAccess) && (
            <Link
              href="/admin/shop"
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
          )}
          {(perms?.hasFullAccess || perms?.hasSrModAccess) && (
            <>
              <Link
                href="/admin/mods-stats"
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
              >
                <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
                  <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Mod Stats</h3>
                  <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">View statistics and activity for staff members</p>
                </div>
              </Link>
              <Link
                href="/admin/vctranscript"
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
              >
                <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
                  <FiMic className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">VC Stats</h3>
                  <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">View voice activity metrics and details</p>
                </div>
              </Link>
            </>
          )}
          {(perms?.hasFullAccess || perms?.hasModeratorAccess) && (
            <Link
              href="/admin/automod"
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] active:scale-95 rounded-apple border border-[rgb(var(--color-border))] apple-transition group shadow-apple-sm touch-manipulation"
            >
              <div className="p-2.5 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-apple group-hover:scale-110 apple-transition shrink-0">
                <FiShield className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))] text-sm sm:text-base">Moderation</h3>
                <p className="text-xs sm:text-sm text-[rgb(var(--color-text-tertiary))] font-light truncate">Manage moderator config and action logs</p>
              </div>
            </Link>
          )}
        </div>
      </div>
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