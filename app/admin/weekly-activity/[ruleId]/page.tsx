'use client';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertCircle,
    FiArrowLeft,
    FiAward,
    FiClock,
    FiRefreshCw,
    FiShield,
    FiUsers,
} from 'react-icons/fi';

type ActivityType = 'chat' | 'vc' | 'both';

interface MemberRow {
    userId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    rank?: number;
    activityValue?: number;
    chatMessages?: number;
    voiceSeconds?: number;
    qualifies?: boolean;
    isWinner?: boolean;
    roleState?: string;
    roleError?: string | null;
    grantedAt?: string;
}

interface LeaderboardResponse {
    rule: {
        id: string;
        name: string;
        scope: string;
        category_id: string | null;
        activity_type: ActivityType;
        winner_count: number;
        reward_role_id: string;
        enabled: boolean;
    };
    cycle: {
        start: string;
        end: string;
        status: string;
        msRemaining: number;
        timeZone: string;
    };
    previousCycle: { start: string; end: string; status: string; finalizedAt: string | null } | null;
    projected: MemberRow[];
    previousWinners: MemberRow[];
    roleHolders: MemberRow[];
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
    chat: 'Chat only',
    vc: 'VC only',
    both: 'Chat + VC',
};

function formatSeconds(seconds: number): string {
    const safe = Math.max(0, Math.trunc(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (hours === 0 && minutes === 0) return '0m';
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
}

function formatValue(activityType: ActivityType, value: number): string {
    if (activityType === 'chat') return `${value} messages`;
    if (activityType === 'vc') return formatSeconds(value);
    return `${value} points`;
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

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function roleStateBadge(state?: string) {
    if (!state) return null;
    const map: Record<string, { label: string; bg: string; text: string }> = {
        assigned: { label: 'Role assigned', bg: 'bg-green-500/20', text: 'text-green-400' },
        removed: { label: 'Role removed', bg: 'bg-gray-500/20', text: 'text-gray-400' },
        pending: { label: 'Pending', bg: 'bg-blue-500/20', text: 'text-blue-400' },
        failed: { label: 'Failed', bg: 'bg-orange-500/20', text: 'text-orange-400' },
    };
    const cfg = map[state] || { label: state, bg: 'bg-gray-500/20', text: 'text-gray-400' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

function MemberCell({ member }: { member: MemberRow }) {
    const label = member.displayName || member.username || member.userId;
    return (
        <div className="flex items-center gap-2 min-w-0">
            {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
            ) : (
                <span className="w-7 h-7 rounded-full bg-[rgb(var(--color-bg-tertiary))] flex-shrink-0" />
            )}
            <div className="min-w-0">
                <p className="text-sm text-[rgb(var(--color-text-primary))] truncate">{label}</p>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono truncate">{member.userId}</p>
            </div>
        </div>
    );
}

export default function WeeklyActivityRuleDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const ruleId = String(params?.ruleId || '');
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'current' | 'previous' | 'holders'>('current');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/weekly-activity/rules/${ruleId}/leaderboard`);
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                setError(body.error || 'Failed to load the leaderboard.');
                return;
            }
            setData(await response.json());
        } catch {
            setError('Network error while loading the leaderboard.');
        } finally {
            setLoading(false);
        }
    }, [ruleId]);

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') { router.replace('/admin'); return; }
        if (!session?.user?.permissions?.hasFullAccess) { router.replace('/admin/dashboard'); return; }
        load();
    }, [status, session, router, load]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                    <p className="text-[rgb(var(--color-text-secondary))]">Loading leaderboard...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-8">
                <div className="max-w-3xl mx-auto bg-[rgb(var(--color-bg-secondary))] border border-red-500/30 rounded-2xl p-8 text-center">
                    <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-[rgb(var(--color-text-primary))] mb-4">{error || 'Rule not found.'}</p>
                    <button
                        onClick={() => router.push('/admin/weekly-activity')}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                        Back to rules
                    </button>
                </div>
            </div>
        );
    }

    const { rule, cycle, previousCycle, projected, previousWinners, roleHolders } = data;
    const rows = tab === 'current' ? projected : tab === 'previous' ? previousWinners : roleHolders;

    return (
        <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => router.push('/admin/weekly-activity')}
                    className="flex items-center gap-2 mb-6 text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Back to rules
                </button>

                <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))] mb-1">{rule.name}</h1>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[rgb(var(--color-text-secondary))]">
                            <span className="flex items-center gap-1.5"><FiActivity className="w-3.5 h-3.5" /> {ACTIVITY_LABELS[rule.activity_type]}</span>
                            <span className="flex items-center gap-1.5"><FiAward className="w-3.5 h-3.5" /> Top {rule.winner_count}</span>
                            <span className="flex items-center gap-1.5"><FiShield className="w-3.5 h-3.5" /> {rule.scope === 'category' ? 'Category scope' : 'All server'}</span>
                            <span className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5" /> {roleHolders.length} holding the role</span>
                        </div>
                    </div>
                    <button
                        onClick={load}
                        className="flex items-center gap-2 px-3 py-2 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-lg text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors"
                    >
                        <FiRefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-1">Current Cycle</p>
                        <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">
                            {formatDate(cycle.start)} — {formatDate(cycle.end)}
                        </p>
                        <p className="flex items-center gap-1.5 mt-2 text-sm text-amber-500">
                            <FiClock className="w-4 h-4" />
                            Ends in {formatRemaining(cycle.msRemaining)}
                        </p>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Boundaries in {cycle.timeZone}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-1">Previous Cycle</p>
                        {previousCycle ? (
                            <>
                                <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">
                                    {formatDate(previousCycle.start)} — {formatDate(previousCycle.end)}
                                </p>
                                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-2">Status: {previousCycle.status}</p>
                                {previousCycle.finalizedAt && (
                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
                                        Finalized {new Date(previousCycle.finalizedAt).toLocaleString()}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-[rgb(var(--color-text-secondary))]">No finalized cycle yet.</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 mb-4 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-1 w-fit">
                    {([
                        { key: 'current' as const, label: `Projected (${projected.length})` },
                        { key: 'previous' as const, label: `Previous Winners (${previousWinners.length})` },
                        { key: 'holders' as const, label: `Role Holders (${roleHolders.length})` },
                    ]).map((option) => (
                        <button
                            key={option.key}
                            onClick={() => setTab(option.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === option.key
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {tab === 'current' && (
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-3">
                        Live standings for the current week. Nothing is granted or removed until the cycle is finalized.
                    </p>
                )}

                <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl overflow-hidden">
                    {rows.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-[rgb(var(--color-text-secondary))]">
                                {tab === 'current'
                                    ? 'No activity recorded for this rule yet this week.'
                                    : tab === 'previous'
                                        ? 'No finalized results for the previous cycle.'
                                        : 'No members currently hold this role through this rule.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                                    <tr>
                                        {(tab === 'holders'
                                            ? ['Member', 'Granted']
                                            : ['Rank', 'Member', 'Activity', 'Chat', 'Voice', 'Status']
                                        ).map((heading) => (
                                            <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[rgb(var(--color-border))]">
                                    {rows.map((row) => (
                                        <tr
                                            key={row.userId}
                                            className={`hover:bg-[rgb(var(--color-hover))] transition-colors ${row.qualifies || row.isWinner ? 'bg-green-500/5' : ''}`}
                                        >
                                            {tab === 'holders' ? (
                                                <>
                                                    <td className="px-4 py-3"><MemberCell member={row} /></td>
                                                    <td className="px-4 py-3 text-xs text-[rgb(var(--color-text-tertiary))] whitespace-nowrap">
                                                        {row.grantedAt ? new Date(row.grantedAt).toLocaleString() : '—'}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 text-sm font-semibold text-[rgb(var(--color-text-primary))] whitespace-nowrap">
                                                        #{row.rank}
                                                    </td>
                                                    <td className="px-4 py-3"><MemberCell member={row} /></td>
                                                    <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-primary))] whitespace-nowrap">
                                                        {formatValue(rule.activity_type, row.activityValue || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] whitespace-nowrap">
                                                        {row.chatMessages ?? 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] whitespace-nowrap">
                                                        {formatSeconds(row.voiceSeconds || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {tab === 'current' ? (
                                                            row.qualifies ? (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Qualifies</span>
                                                            ) : (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">Outside top {rule.winner_count}</span>
                                                            )
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                {row.isWinner && (
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">Winner</span>
                                                                )}
                                                                {roleStateBadge(row.roleState)}
                                                            </div>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {tab === 'previous' && previousWinners.some((row) => row.roleState === 'failed') && (
                    <div className="mt-4 flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                        <FiAlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-orange-400">Some role operations failed</p>
                            <p className="text-xs text-orange-400/80 mt-1">
                                The scheduler retries failed operations automatically. Check the activity log for the underlying Discord error.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
