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
    FiMessageSquare,
    FiMic,
    FiRefreshCw,
    FiShield,
    FiUsers,
    FiZap,
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
        priority: number;
    };
    crossExcludedCount: number;
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

const ACTIVITY_LABELS: Record<ActivityType, string> = { chat: 'Chat only', vc: 'VC only', both: 'Chat + VC' };

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
    if (activityType === 'chat') return `${value.toLocaleString()} msgs`;
    if (activityType === 'vc') return formatSeconds(value);
    return `${value.toLocaleString()} pts`;
}

function formatRemaining(ms: number): string {
    if (ms <= 0) return 'Finalizing…';
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
    const map: Record<string, { label: string; color: string }> = {
        assigned: { label: 'Assigned', color: '#22c55e' },
        removed: { label: 'Removed', color: '#6b7280' },
        pending: { label: 'Pending', color: '#3b82f6' },
        failed: { label: 'Failed', color: '#f97316' },
    };
    const cfg = map[state] || { label: state, color: '#6b7280' };
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
        >
            {cfg.label}
        </span>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Avatar component
// ────────────────────────────────────────────────────────────────────────────
function Avatar({ member, size = 40 }: { member: MemberRow; size?: number }) {
    const label = (member.displayName || member.username || member.userId)[0]?.toUpperCase();
    return (
        <div
            className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold"
            style={{
                width: size, height: size,
                background: member.avatarUrl ? undefined : 'linear-gradient(135deg, #6366f1, #a855f7)',
                fontSize: size * 0.4,
                border: '2px solid rgba(255,255,255,0.1)',
            }}
        >
            {member.avatarUrl
                ? <img src={member.avatarUrl} alt={member.displayName || ''} style={{ width: size, height: size, objectFit: 'cover' }} />
                : label
            }
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Podium component for top 3
// ────────────────────────────────────────────────────────────────────────────
const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_HEIGHTS = [120, 90, 70];
const PODIUM_COLORS = [
    'linear-gradient(180deg, #f59e0b, #d97706)',
    'linear-gradient(180deg, #9ca3af, #6b7280)',
    'linear-gradient(180deg, #cd7c2c, #a0562a)',
];

function Podium({ entries, activityType }: { entries: MemberRow[]; activityType: ActivityType }) {
    if (entries.length === 0) return null;
    // Reorder for podium: 2nd, 1st, 3rd
    const podiumOrder = [entries[1], entries[0], entries[2]].filter(Boolean);
    const podiumRanks = [2, 1, 3];

    return (
        <div className="flex items-end justify-center gap-4 mb-8 pt-6">
            {podiumOrder.map((entry, pIdx) => {
                if (!entry) return null;
                const displayRank = podiumRanks[pIdx];
                const isFirst = displayRank === 1;
                const height = PODIUM_HEIGHTS[displayRank - 1];
                return (
                    <div key={entry.userId} className="flex flex-col items-center gap-2" style={{ width: 120 }}>
                        {/* Crown for #1 */}
                        {isFirst && <div className="text-2xl animate-bounce">👑</div>}
                        <div className="text-2xl">{MEDAL[displayRank - 1]}</div>
                        {/* Avatar */}
                        <div className="relative">
                            <Avatar member={entry} size={isFirst ? 64 : 52} />
                            {isFirst && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-amber-900">1</div>
                            )}
                        </div>
                        {/* Name */}
                        <p className="text-xs font-bold text-[rgb(var(--color-text-primary))] text-center truncate w-full px-1" title={entry.displayName || entry.username || entry.userId}>
                            {entry.displayName || entry.username || entry.userId}
                        </p>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))]">{formatValue(activityType, entry.activityValue || 0)}</p>
                        {/* Podium bar */}
                        <div
                            className="w-full rounded-t-lg flex items-center justify-center text-white text-sm font-black"
                            style={{ height, background: PODIUM_COLORS[displayRank - 1], boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}
                        >
                            #{displayRank}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────
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
            const res = await fetch(`/api/weekly-activity/rules/${ruleId}/leaderboard`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(body.error || 'Failed to load the leaderboard.');
                return;
            }
            setData(await res.json());
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
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--color-bg-primary))' }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-transparent border-t-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-[rgb(var(--color-text-secondary))]">Loading leaderboard…</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen p-8" style={{ background: 'rgb(var(--color-bg-primary))' }}>
                <div className="max-w-3xl mx-auto rounded-2xl p-10 text-center" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-[rgb(var(--color-text-primary))] mb-4">{error || 'Rule not found.'}</p>
                    <button onClick={() => router.push('/admin/weekly-activity')} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all">
                        Back to rules
                    </button>
                </div>
            </div>
        );
    }

    const { rule, cycle, previousCycle, projected, previousWinners, roleHolders, crossExcludedCount } = data;
    const rows = tab === 'current' ? projected : tab === 'previous' ? previousWinners : roleHolders;
    const topValue = projected[0]?.activityValue || 1;

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: 'rgb(var(--color-bg-primary))' }}>
            <div className="max-w-5xl mx-auto">

                {/* Back */}
                <button onClick={() => router.push('/admin/weekly-activity')} className="flex items-center gap-2 mb-6 text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
                    <FiArrowLeft className="w-4 h-4" /> Back to rules
                </button>

                {/* Header */}
                <div className="relative mb-6 overflow-hidden rounded-2xl p-6"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.08))',
                        border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    Priority #{rule.priority}
                                </span>
                                {!rule.enabled && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af' }}>Disabled</span>
                                )}
                            </div>
                            <h1 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))] mb-3">{rule.name}</h1>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[rgb(var(--color-text-secondary))]">
                                <span className="flex items-center gap-1.5">
                                    {rule.activity_type === 'chat' ? <FiMessageSquare className="w-4 h-4" /> : rule.activity_type === 'vc' ? <FiMic className="w-4 h-4" /> : <FiActivity className="w-4 h-4" />}
                                    {ACTIVITY_LABELS[rule.activity_type]}
                                </span>
                                <span className="flex items-center gap-1.5"><FiAward className="w-4 h-4" /> Top {rule.winner_count}</span>
                                <span className="flex items-center gap-1.5"><FiShield className="w-4 h-4" /> {rule.scope === 'category' ? 'Category scope' : 'All server'}</span>
                                <span className="flex items-center gap-1.5"><FiUsers className="w-4 h-4" /> {roleHolders.length} holding the role</span>
                            </div>
                        </div>
                        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-all" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                            <FiRefreshCw className="w-3.5 h-3.5" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Cycle Info Cards */}
                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div className="rounded-xl p-5" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                        <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Current Cycle</p>
                        <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">{formatDate(cycle.start)} — {formatDate(cycle.end)}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-amber-400 font-semibold">
                            <FiClock className="w-4 h-4" /> Ends in {formatRemaining(cycle.msRemaining)}
                        </div>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">{cycle.timeZone}</p>
                    </div>
                    <div className="rounded-xl p-5" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                        <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Previous Cycle</p>
                        {previousCycle ? (
                            <>
                                <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">{formatDate(previousCycle.start)} — {formatDate(previousCycle.end)}</p>
                                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-2">Status: <strong>{previousCycle.status}</strong></p>
                                {previousCycle.finalizedAt && (
                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Finalized {new Date(previousCycle.finalizedAt).toLocaleString()}</p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-[rgb(var(--color-text-secondary))]">No finalized cycle yet.</p>
                        )}
                    </div>
                </div>

                {/* Cross-exclusion info */}
                {crossExcludedCount > 0 && (
                    <div className="mb-5 flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <FiZap className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-indigo-300">
                            <strong>{crossExcludedCount}</strong> user{crossExcludedCount !== 1 ? 's' : ''} were excluded from this rule's pool because they already won a higher-priority rule this cycle.
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                    {([
                        { key: 'current' as const, label: `Live (${projected.length})` },
                        { key: 'previous' as const, label: `Prev. Winners (${previousWinners.length})` },
                        { key: 'holders' as const, label: `Holders (${roleHolders.length})` },
                    ]).map((option) => (
                        <button
                            key={option.key}
                            onClick={() => setTab(option.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === option.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Live leaderboard note */}
                {tab === 'current' && (
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-4">
                        Live standings for the current week — projections only. Roles are assigned/removed only when the cycle finalizes.
                    </p>
                )}

                {/* Podium (current tab, top 3 exist) */}
                {tab === 'current' && projected.length >= 2 && (
                    <div className="rounded-2xl overflow-hidden mb-5"
                        style={{
                            background: 'linear-gradient(180deg, rgba(251,191,36,0.06) 0%, rgb(var(--color-bg-secondary)) 60%)',
                            border: '1px solid rgb(var(--color-border))',
                        }}>
                        <Podium entries={projected.slice(0, 3)} activityType={rule.activity_type} />
                    </div>
                )}

                {/* Remaining rows */}
                {rows.length === 0 ? (
                    <div className="rounded-2xl p-12 text-center" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                        <p className="text-[rgb(var(--color-text-secondary))]">
                            {tab === 'current' ? 'No activity recorded yet this week.' : tab === 'previous' ? 'No finalized results for the previous cycle.' : 'No members currently hold this role.'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                        {/* Table header */}
                        {tab !== 'holders' && (
                            <div className="grid gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]"
                                style={{ gridTemplateColumns: '3rem 1fr auto auto auto', background: 'rgb(var(--color-bg-tertiary))', borderBottom: '1px solid rgb(var(--color-border))' }}>
                                <span>Rank</span>
                                <span>Member</span>
                                <span className="text-right">Activity</span>
                                <span className="text-right">Chat</span>
                                <span className="text-right">Voice</span>
                            </div>
                        )}
                        <div className="divide-y divide-[rgb(var(--color-border))]">
                            {(tab === 'current' ? rows.slice(3) : rows).map((row, idx) => {
                                const isActualTop3 = tab === 'current' && (row.rank ?? 999) <= 3;
                                if (isActualTop3) return null; // already shown in podium
                                const barPct = tab === 'current' && topValue > 0 ? Math.round(((row.activityValue || 0) / topValue) * 100) : 0;

                                if (tab === 'holders') {
                                    return (
                                        <div key={row.userId} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[rgb(var(--color-hover))] transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar member={row} size={38} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))] truncate">{row.displayName || row.username || row.userId}</p>
                                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono truncate">{row.userId}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-[rgb(var(--color-text-tertiary))] whitespace-nowrap flex-shrink-0">
                                                {row.grantedAt ? `Granted ${new Date(row.grantedAt).toLocaleDateString()}` : '—'}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={row.userId}
                                        className={`grid gap-3 px-5 py-4 items-center hover:bg-[rgb(var(--color-hover))] transition-colors ${row.qualifies || row.isWinner ? '' : ''}`}
                                        style={{ gridTemplateColumns: '3rem 1fr auto auto auto' }}
                                    >
                                        {/* Rank */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-bold text-[rgb(var(--color-text-primary))]">#{row.rank}</span>
                                        </div>

                                        {/* Member */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar member={row} size={36} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))] truncate">{row.displayName || row.username || row.userId}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {tab === 'current' && barPct > 0 && (
                                                        <div className="h-1.5 w-24 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                                            <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: row.qualifies ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                                                        </div>
                                                    )}
                                                    {tab === 'current' ? (
                                                        row.qualifies
                                                            ? <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>✓ Qualifies</span>
                                                            : <span className="text-xs text-[rgb(var(--color-text-tertiary))]">Outside top {rule.winner_count}</span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            {row.isWinner && <span className="text-xs font-semibold text-amber-400">Winner</span>}
                                                            {roleStateBadge(row.roleState)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activity value */}
                                        <span className="text-sm font-bold text-[rgb(var(--color-text-primary))] text-right whitespace-nowrap">
                                            {formatValue(rule.activity_type, row.activityValue || 0)}
                                        </span>

                                        {/* Chat */}
                                        <span className="text-sm text-[rgb(var(--color-text-secondary))] text-right whitespace-nowrap">
                                            {(row.chatMessages ?? 0).toLocaleString()}
                                        </span>

                                        {/* Voice */}
                                        <span className="text-sm text-[rgb(var(--color-text-secondary))] text-right whitespace-nowrap">
                                            {formatSeconds(row.voiceSeconds || 0)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Failed role ops alert */}
                {tab === 'previous' && previousWinners.some((row) => row.roleState === 'failed') && (
                    <div className="mt-4 flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}>
                        <FiAlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-orange-400">Some role operations failed</p>
                            <p className="text-xs text-orange-400/80 mt-1">The scheduler retries failed operations automatically. Check the activity log for the underlying Discord error.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
