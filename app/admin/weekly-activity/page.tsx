'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FiActivity,
    FiAlertCircle,
    FiAlertTriangle,
    FiAward,
    FiCheck,
    FiChevronDown,
    FiClock,
    FiEdit2,
    FiFolder,
    FiGlobe,
    FiInfo,
    FiList,
    FiMessageSquare,
    FiMic,
    FiPlus,
    FiRefreshCw,
    FiShield,
    FiTag,
    FiTrash2,
    FiUsers,
    FiX,
    FiZap,
} from 'react-icons/fi';

type Scope = 'all_server' | 'category';
type ActivityType = 'chat' | 'vc' | 'both';

interface WeeklyRule {
    id: string;
    name: string;
    scope: Scope;
    category_id: string | null;
    activity_type: ActivityType;
    winner_count: number;
    reward_role_id: string;
    enabled: boolean;
    priority: number;
    min_chat_messages: number;
    min_voice_seconds: number;
    created_at: string;
    holder_count?: number;
    failure_count?: number;
}

interface DiscordRole {
    id: string;
    name: string;
    color: number;
    position: number;
    manageable: boolean;
}

interface Category {
    id: string;
    name: string;
    textChannelCount: number;
    voiceChannelCount: number;
}

interface AuditEntry {
    id: string;
    rule_id: string | null;
    user_id: string | null;
    action: string;
    reason: string | null;
    created_at: string;
    rule?: { name: string; reward_role_id: string } | null;
}

interface TopWinner {
    userId: string;
    ruleId: string;
    grantedAt: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
}

interface Stats {
    totalRules: number;
    enabledRules: number;
    totalHolders: number;
    failedOperations: number;
    recentActions: AuditEntry[];
    topWinners: TopWinner[];
    cycleProgress: number;
    msRemaining: number;
    cycleStart: string;
    cycleEnd: string;
}

interface Exclusion {
    id: string;
    userId: string;
    reason: string | null;
    createdAt: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
}

interface CycleInfo {
    config: { timeZone: string; weekStartDay: number; weekStartHour: number };
    current: { start: string; end: string; status: string; msRemaining: number };
    previous: { start: string; end: string; status: string; finalizedAt: string | null } | null;
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
    chat: 'Chat only',
    vc: 'VC only',
    both: 'Chat + VC',
};

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
    chat: <FiMessageSquare className="w-3.5 h-3.5" />,
    vc: <FiMic className="w-3.5 h-3.5" />,
    both: <FiActivity className="w-3.5 h-3.5" />,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function roleColor(color: number): string {
    if (!color) return '#99aab5';
    return `#${color.toString(16).padStart(6, '0')}`;
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
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function actionBadge(action: string) {
    const map: Record<string, { label: string; color: string }> = {
        rule_created: { label: 'Rule Created', color: '#3b82f6' },
        rule_updated: { label: 'Rule Updated', color: '#f59e0b' },
        rule_enabled: { label: 'Enabled', color: '#22c55e' },
        rule_disabled: { label: 'Disabled', color: '#6b7280' },
        rule_deleted: { label: 'Rule Deleted', color: '#ef4444' },
        roles_reconciled: { label: 'Roles Synced', color: '#a855f7' },
        role_assign_failed: { label: 'Assign Failed', color: '#f97316' },
        role_removal_failed: { label: 'Removal Failed', color: '#f97316' },
        cycle_finalized: { label: 'Cycle Finalized', color: '#22c55e' },
        cycle_finalized_with_errors: { label: 'Finalized w/ Errors', color: '#f97316' },
        cycle_reset: { label: 'Cycle Reset', color: '#ec4899' },
        exclusion_added: { label: 'Member Excluded', color: '#6b7280' },
        exclusion_removed: { label: 'Exclusion Removed', color: '#3b82f6' },
    };
    const cfg = map[action] || { label: action, color: '#6b7280' };
    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
                backgroundColor: `${cfg.color}20`,
                color: cfg.color,
                border: `1px solid ${cfg.color}30`,
            }}
        >
            {cfg.label}
        </span>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Avatar Stack component
// ────────────────────────────────────────────────────────────────────────────
function AvatarStack({ winners, max = 5 }: { winners: TopWinner[]; max?: number }) {
    const shown = winners.slice(0, max);
    const extra = Math.max(0, winners.length - max);
    return (
        <div className="flex -space-x-2">
            {shown.map((w, i) => (
                <div
                    key={w.userId}
                    className="relative w-7 h-7 rounded-full border-2 border-[rgb(var(--color-bg-secondary))] overflow-hidden flex-shrink-0"
                    style={{ zIndex: max - i }}
                    title={w.displayName || w.username || w.userId}
                >
                    {w.avatarUrl ? (
                        <img src={w.avatarUrl} alt={w.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {(w.displayName || w.username || '?')[0].toUpperCase()}
                        </div>
                    )}
                </div>
            ))}
            {extra > 0 && (
                <div className="w-7 h-7 rounded-full border-2 border-[rgb(var(--color-bg-secondary))] bg-[rgb(var(--color-bg-tertiary))] flex items-center justify-center text-xs text-[rgb(var(--color-text-tertiary))] font-semibold">
                    +{extra}
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Rule Create/Edit Modal
// ────────────────────────────────────────────────────────────────────────────
interface RuleModalProps {
    rule?: WeeklyRule | null;
    roles: DiscordRole[];
    categories: Category[];
    rulesCount: number;
    onClose: () => void;
    onSave: () => void;
}

function RuleModal({ rule, roles, categories, rulesCount, onClose, onSave }: RuleModalProps) {
    const isEdit = !!rule;
    const [form, setForm] = useState({
        name: rule?.name || '',
        scope: (rule?.scope || 'all_server') as Scope,
        category_id: rule?.category_id || '',
        activity_type: (rule?.activity_type || 'chat') as ActivityType,
        winner_count: rule?.winner_count?.toString() || '5',
        reward_role_id: rule?.reward_role_id || '',
        enabled: rule?.enabled ?? true,
        priority: rule?.priority?.toString() ?? rulesCount.toString(),
        // Advanced / minimum threshold fields (stored in seconds for vc, raw count for chat)
        min_chat_messages: rule?.min_chat_messages?.toString() ?? '0',
        min_voice_seconds: rule?.min_voice_seconds?.toString() ?? '0',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(
        // Auto-open if existing rule has thresholds set
        !!(rule?.min_chat_messages || rule?.min_voice_seconds)
    );

    const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));
    const selectedRole = roles.find((role) => role.id === form.reward_role_id);
    const selectedCategory = categories.find((category) => category.id === form.category_id);

    const handleSave = async () => {
        setError('');
        if (!form.name.trim()) { setError('Rule name is required.'); return; }
        if (form.scope === 'category' && !form.category_id) { setError('Select a category.'); return; }
        if (!form.reward_role_id) { setError('Select a reward role.'); return; }
        const winners = parseInt(form.winner_count, 10);
        if (!Number.isInteger(winners) || winners < 1 || winners > 50) {
            setError('Winners must be between 1 and 50.');
            return;
        }
        setSaving(true);
        try {
            const url = isEdit ? `/api/weekly-activity/rules/${rule!.id}` : '/api/weekly-activity/rules';
            const response = await fetch(url, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    scope: form.scope,
                    category_id: form.scope === 'category' ? form.category_id : null,
                    activity_type: form.activity_type,
                    winner_count: winners,
                    reward_role_id: form.reward_role_id,
                    enabled: form.enabled,
                    priority: parseInt(form.priority, 10) || 0,
                    min_chat_messages: Math.max(0, parseInt(form.min_chat_messages, 10) || 0),
                    min_voice_seconds: Math.max(0, parseInt(form.min_voice_seconds, 10) || 0),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Failed to save rule.');
                return;
            }
            onSave();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--color-border))]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.15)' }}>
                            <FiAward className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                            {isEdit ? 'Edit Rule' : 'New Activity Rule'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Rule Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => set('name', e.target.value)}
                            placeholder="e.g., Top Chat Members"
                            className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                        />
                    </div>

                    {/* Scope */}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Scope</label>
                        <div className="flex gap-3">
                            {([
                                { value: 'all_server' as Scope, label: 'All Server', icon: <FiGlobe className="w-4 h-4" /> },
                                { value: 'category' as Scope, label: 'Category', icon: <FiFolder className="w-4 h-4" /> },
                            ]).map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => { set('scope', option.value); if (option.value === 'all_server') set('category_id', ''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${form.scope === option.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
                                    style={form.scope !== option.value ? { background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' } : {}}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category selector */}
                    {form.scope === 'category' && (
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Category</label>
                            <select
                                value={form.category_id}
                                onChange={(e) => set('category_id', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                            >
                                <option value="">— Select a category —</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {selectedCategory && (
                                <p className="mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                                    {selectedCategory.textChannelCount} text · {selectedCategory.voiceChannelCount} voice channels
                                </p>
                            )}
                        </div>
                    )}

                    {/* Activity Type */}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Activity Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { value: 'chat' as ActivityType, label: 'Chat', icon: <FiMessageSquare className="w-4 h-4" /> },
                                { value: 'vc' as ActivityType, label: 'Voice', icon: <FiMic className="w-4 h-4" /> },
                                { value: 'both' as ActivityType, label: 'Chat + VC', icon: <FiActivity className="w-4 h-4" /> },
                            ]).map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => set('activity_type', option.value)}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${form.activity_type === option.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
                                    style={form.activity_type !== option.value ? { background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' } : {}}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {form.activity_type === 'both' && (
                            <p className="mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                                1 point per message + 1 point per full minute in VC
                            </p>
                        )}
                    </div>

                    {/* Winners + Role */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Winners (top N)</label>
                            <input
                                type="number" min="1" max="50"
                                value={form.winner_count}
                                onChange={(e) => set('winner_count', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">
                                Priority
                                <span className="ml-1 font-normal text-[rgb(var(--color-text-tertiary))]">(lower = first)</span>
                            </label>
                            <input
                                type="number" min="0"
                                value={form.priority}
                                onChange={(e) => set('priority', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                            />
                        </div>
                    </div>

                    {/* Reward Role */}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Reward Role</label>
                        <select
                            value={form.reward_role_id}
                            onChange={(e) => set('reward_role_id', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                        >
                            <option value="">— Select a role —</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id} disabled={!role.manageable}>
                                    {role.name}{role.manageable ? '' : ' (above the bot)'}
                                </option>
                            ))}
                        </select>
                        {selectedRole && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: roleColor(selectedRole.color) }} />
                                <span className="text-xs font-medium" style={{ color: roleColor(selectedRole.color) }}>@{selectedRole.name}</span>
                                {!selectedRole.manageable && (
                                    <span className="text-xs text-orange-400">Bot role must be above this role</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info box about multi-role support */}
                    <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <FiInfo className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-300">
                            Multiple rules can share the same role. Users who win a lower-priority rule first are automatically excluded from higher-priority rule pools.
                        </p>
                    </div>

                    {/* ── Advanced: Minimum Thresholds ── */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--color-border))' }}>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-[rgb(var(--color-hover))]"
                            style={{ background: 'rgb(var(--color-bg-primary))' }}
                        >
                            <span className="flex items-center gap-2 text-[rgb(var(--color-text-primary))]">
                                <FiZap className="w-4 h-4 text-amber-400" />
                                Advanced — Minimum Activity Required
                                {(parseInt(form.min_chat_messages) > 0 || parseInt(form.min_voice_seconds) > 0) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>ON</span>
                                )}
                            </span>
                            <FiChevronDown className={`w-4 h-4 text-[rgb(var(--color-text-tertiary))] transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>

                        {showAdvanced && (
                            <div className="p-4 space-y-4" style={{ background: 'rgb(var(--color-bg-secondary))', borderTop: '1px solid rgb(var(--color-border))' }}>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                    Only users who meet <strong className="text-[rgb(var(--color-text-primary))]">all</strong> minimums are eligible for the top-N ranking.
                                    Set to <strong className="text-[rgb(var(--color-text-primary))]">0</strong> to disable a threshold (everyone qualifies).
                                    At cycle end, members who no longer meet the minimum lose the role.
                                </p>

                                {/* Min Messages (chat / both) */}
                                {(form.activity_type === 'chat' || form.activity_type === 'both') && (
                                    <div>
                                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">
                                            <FiMessageSquare className="inline w-3.5 h-3.5 mr-1.5 text-blue-400" />
                                            Minimum Messages
                                            <span className="ml-2 font-normal text-xs text-[rgb(var(--color-text-tertiary))]">0 = no minimum</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number" min="0" max="100000"
                                                value={form.min_chat_messages}
                                                onChange={(e) => set('min_chat_messages', e.target.value)}
                                                placeholder="e.g. 50"
                                                className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                                            />
                                            <span className="text-sm text-[rgb(var(--color-text-tertiary))] whitespace-nowrap">messages / week</span>
                                        </div>
                                        {parseInt(form.min_chat_messages) > 0 && (
                                            <p className="mt-1.5 text-xs text-amber-400">
                                                Members need at least <strong>{parseInt(form.min_chat_messages).toLocaleString()}</strong> messages this week to qualify.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Min Voice (vc / both) — input in HOURS, stored as seconds */}
                                {(form.activity_type === 'vc' || form.activity_type === 'both') && (
                                    <div>
                                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">
                                            <FiMic className="inline w-3.5 h-3.5 mr-1.5 text-purple-400" />
                                            Minimum Voice Hours
                                            <span className="ml-2 font-normal text-xs text-[rgb(var(--color-text-tertiary))]">0 = no minimum</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number" min="0" max="168" step="0.5"
                                                value={Math.round((parseInt(form.min_voice_seconds) || 0) / 36) / 100}
                                                onChange={(e) => {
                                                    const hours = parseFloat(e.target.value) || 0;
                                                    set('min_voice_seconds', Math.round(hours * 3600).toString());
                                                }}
                                                placeholder="e.g. 2"
                                                className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                                style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                                            />
                                            <span className="text-sm text-[rgb(var(--color-text-tertiary))] whitespace-nowrap">hours / week</span>
                                        </div>
                                        {parseInt(form.min_voice_seconds) > 0 && (
                                            <p className="mt-1.5 text-xs text-amber-400">
                                                Members need at least <strong>{(parseInt(form.min_voice_seconds) / 3600).toFixed(1)}h</strong> in voice channels this week to qualify.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Enable toggle (edit only) */}
                    {isEdit && (
                        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}>
                            <div>
                                <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">Rule Enabled</p>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-0.5">Disable to pause finalization without deleting</p>
                            </div>
                            <button
                                onClick={() => set('enabled', !form.enabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${form.enabled ? 'bg-green-500' : 'bg-[rgb(var(--color-bg-tertiary))]'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgb(var(--color-border))]">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors" style={{ background: 'rgb(var(--color-bg-tertiary))' }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        {saving ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><FiCheck className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Rule'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Reset Confirmation Modal
// ────────────────────────────────────────────────────────────────────────────
function ResetModal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
    const [confirm, setConfirm] = useState('');
    const [resetting, setResetting] = useState(false);
    const [result, setResult] = useState<{ deletedResults: number; removedHolders: number } | null>(null);

    const doReset = async () => {
        setResetting(true);
        try {
            const res = await fetch('/api/weekly-activity/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: 'RESET' }),
            });
            const data = await res.json();
            if (!res.ok) { alert(data.error || 'Reset failed'); return; }
            setResult(data);
            setTimeout(() => { onReset(); onClose(); }, 2500);
        } catch { alert('Network error'); }
        finally { setResetting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <FiAlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Reset Cycle Data</h2>
                    </div>
                    {result ? (
                        <div className="text-center py-4">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="font-semibold text-[rgb(var(--color-text-primary))]">Reset complete</p>
                            <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                                {result.deletedResults} results deleted · {result.removedHolders} holders removed
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-3">
                                This will permanently delete all computed results for the <strong className="text-[rgb(var(--color-text-primary))]">current cycle</strong> and remove all current role holders. The next finalization will start fresh.
                            </p>
                            <div className="p-3 rounded-xl mb-4 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <strong className="text-red-400">Note:</strong> <span className="text-[rgb(var(--color-text-secondary))]">Raw chat and voice logs are NOT deleted. Only the computed results and role holder records are reset.</span>
                            </div>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-2">Type <strong className="text-[rgb(var(--color-text-primary))]">RESET</strong> to confirm</p>
                            <input
                                type="text"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="RESET"
                                className="w-full px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 font-mono"
                                style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                            />
                            <div className="flex gap-3">
                                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-medium text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors" style={{ background: 'rgb(var(--color-bg-tertiary))' }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={doReset}
                                    disabled={confirm !== 'RESET' || resetting}
                                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                    style={{ background: confirm === 'RESET' ? '#ef4444' : undefined, backgroundColor: confirm !== 'RESET' ? 'rgb(var(--color-bg-tertiary))' : undefined }}
                                >
                                    {resetting ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiAlertTriangle className="w-4 h-4" />}
                                    Reset Now
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────
export default function WeeklyActivityPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [rules, setRules] = useState<WeeklyRule[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [cycle, setCycle] = useState<CycleInfo | null>(null);
    const [audit, setAudit] = useState<AuditEntry[]>([]);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditPage, setAuditPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<WeeklyRule | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'rules' | 'exclusions' | 'audit'>('rules');
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [exclusions, setExclusions] = useState<Exclusion[]>([]);
    const [exclusionInput, setExclusionInput] = useState('');
    const [exclusionReason, setExclusionReason] = useState('');
    const [exclusionError, setExclusionError] = useState('');
    const [savingExclusion, setSavingExclusion] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [dangerOpen, setDangerOpen] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [rulesRes, discordRes, statsRes, cycleRes] = await Promise.all([
                fetch('/api/weekly-activity/rules'),
                fetch('/api/weekly-activity/discord-data'),
                fetch('/api/weekly-activity/stats'),
                fetch('/api/weekly-activity/cycle'),
            ]);
            if (rulesRes.ok) setRules((await rulesRes.json()).rules || []);
            if (discordRes.ok) {
                const data = await discordRes.json();
                setRoles(data.roles || []);
                setCategories(data.categories || []);
            }
            if (statsRes.ok) setStats(await statsRes.json());
            if (cycleRes.ok) setCycle(await cycleRes.json());
        } catch (error) {
            console.error('WeeklyActivity data load error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadExclusions = useCallback(async () => {
        try {
            const res = await fetch('/api/weekly-activity/exclusions');
            if (!res.ok) return;
            setExclusions((await res.json()).exclusions || []);
        } catch { }
    }, []);

    const addExclusion = async () => {
        setExclusionError('');
        const userId = exclusionInput.trim();
        if (!/^\d{5,25}$/.test(userId)) { setExclusionError('Enter a valid Discord user ID.'); return; }
        setSavingExclusion(true);
        try {
            const res = await fetch('/api/weekly-activity/exclusions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, reason: exclusionReason.trim() || null }),
            });
            const data = await res.json();
            if (!res.ok) { setExclusionError(data.error || 'Failed.'); return; }
            setExclusionInput(''); setExclusionReason('');
            await loadExclusions();
        } catch { setExclusionError('Network error.'); }
        finally { setSavingExclusion(false); }
    };

    const removeExclusion = async (userId: string) => {
        try {
            const res = await fetch(`/api/weekly-activity/exclusions?userId=${userId}`, { method: 'DELETE' });
            if (res.ok) await loadExclusions();
        } catch { }
    };

    const loadAudit = useCallback(async (page = 1) => {
        try {
            const res = await fetch(`/api/weekly-activity/audit?page=${page}&pageSize=20`);
            if (!res.ok) return;
            const data = await res.json();
            setAudit(data.entries || []);
            setAuditTotal(data.total || 0);
        } catch { }
    }, []);

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') { router.replace('/admin'); return; }
        if (!session?.user?.permissions?.hasFullAccess) { setHasPermission(false); router.replace('/admin/dashboard'); return; }
        setHasPermission(true);
        loadData(); loadAudit(); loadExclusions();
    }, [status, session, router, loadData, loadAudit, loadExclusions]);

    useEffect(() => {
        if (activeTab === 'audit') loadAudit(auditPage);
    }, [activeTab, auditPage, loadAudit]);

    const toggleRule = async (rule: WeeklyRule) => {
        setTogglingId(rule.id);
        try {
            const res = await fetch(`/api/weekly-activity/rules/${rule.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled }),
            });
            if (res.ok) await loadData();
        } catch { }
        setTogglingId(null);
    };

    const deleteRule = async (rule: WeeklyRule) => {
        if (!confirm(`Delete "${rule.name}"? Roles already granted stay on members but are no longer managed.`)) return;
        setDeletingId(rule.id);
        try {
            const res = await fetch(`/api/weekly-activity/rules/${rule.id}`, { method: 'DELETE' });
            if (res.ok) { await loadData(); await loadAudit(); }
        } catch { }
        setDeletingId(null);
    };

    const getRole = (roleId: string) => roles.find((r) => r.id === roleId);
    const getCategoryName = (catId: string | null) => categories.find((c) => c.id === catId)?.name || catId || 'Unknown';

    const cycleSummary = useMemo(() => {
        if (!cycle) return null;
        const weekStart = DAY_NAMES[cycle.config.weekStartDay] || 'Monday';
        const hour = String(cycle.config.weekStartHour).padStart(2, '0');
        return `${weekStart}s at ${hour}:00 ${cycle.config.timeZone}`;
    }, [cycle]);

    if (status === 'loading' || hasPermission === null) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--color-bg-primary))' }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-transparent border-t-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-[rgb(var(--color-text-secondary))]">Loading…</p>
                </div>
            </div>
        );
    }

    const topWinnersByRule = (ruleId: string) =>
        (stats?.topWinners || []).filter((w) => w.ruleId === ruleId);

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: 'rgb(var(--color-bg-primary))' }}>
            <div className="max-w-7xl mx-auto">

                {/* ── Hero Header ── */}
                <div className="relative mb-8 overflow-hidden rounded-2xl p-6 sm:p-8"
                    style={{
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(59,130,246,0.08) 50%, rgba(168,85,247,0.06) 100%)',
                        border: '1px solid rgba(251,191,36,0.2)',
                    }}>
                    {/* Decorative glow */}
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}>
                                <FiAward className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))]">Weekly Activity Roles</h1>
                                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-0.5">
                                    Automatically reward your most active members each week · {cycleSummary || 'Configuring…'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {stats?.topWinners && stats.topWinners.length > 0 && (
                                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                    <AvatarStack winners={stats.topWinners} max={5} />
                                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">{stats.totalHolders} holders</span>
                                </div>
                            )}
                            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-all" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                <FiRefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Cycle progress bar */}
                    {stats && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                                    Cycle Progress — {formatDate(stats.cycleStart)} → {formatDate(stats.cycleEnd)}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                                    <FiClock className="w-3.5 h-3.5" />
                                    {formatRemaining(stats.msRemaining)} remaining
                                </div>
                            </div>
                            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${stats.cycleProgress}%`,
                                        background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                                        boxShadow: '0 0 8px rgba(245,158,11,0.5)',
                                    }}
                                />
                            </div>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1.5">
                                {stats.cycleProgress}% of the week has elapsed · roles finalize at cycle end
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Stats Cards ── */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Rules', value: stats.totalRules, icon: <FiList className="w-5 h-5" />, color: '#3b82f6', glow: 'rgba(59,130,246,0.2)' },
                            { label: 'Active Rules', value: stats.enabledRules, icon: <FiZap className="w-5 h-5" />, color: '#22c55e', glow: 'rgba(34,197,94,0.2)' },
                            { label: 'Role Holders', value: stats.totalHolders, icon: <FiShield className="w-5 h-5" />, color: '#a855f7', glow: 'rgba(168,85,247,0.2)' },
                            {
                                label: 'Failed Ops', value: stats.failedOperations,
                                icon: <FiAlertCircle className="w-5 h-5" />,
                                color: stats.failedOperations > 0 ? '#f97316' : '#6b7280',
                                glow: stats.failedOperations > 0 ? 'rgba(249,115,22,0.2)' : 'transparent',
                            },
                        ].map((card) => (
                            <div key={card.label}
                                className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                                style={{
                                    background: 'rgb(var(--color-bg-secondary))',
                                    border: `1px solid rgb(var(--color-border))`,
                                    boxShadow: card.value > 0 && card.label === 'Failed Ops' ? '0 0 0 1px rgba(249,115,22,0.3)' : undefined,
                                }}>
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="p-2 rounded-xl" style={{ background: card.glow, color: card.color }}>
                                        {card.icon}
                                    </div>
                                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">{card.label}</span>
                                </div>
                                <p className="text-3xl font-extrabold text-[rgb(var(--color-text-primary))]">{card.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Previous Cycle Info ── */}
                {cycle?.previous && (
                    <div className="mb-6 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                        <FiInfo className="w-4 h-4 text-[rgb(var(--color-text-tertiary))] flex-shrink-0" />
                        <span className="text-[rgb(var(--color-text-secondary))]">
                            Previous cycle <strong className="text-[rgb(var(--color-text-primary))]">{formatDate(cycle.previous.start)} — {formatDate(cycle.previous.end)}</strong>
                            {' '}· Status: <strong className="text-[rgb(var(--color-text-primary))]">{cycle.previous.status}</strong>
                            {cycle.previous.finalizedAt && ` · Finalized ${new Date(cycle.previous.finalizedAt).toLocaleDateString()}`}
                        </span>
                    </div>
                )}

                {/* ── Tab Bar ── */}
                <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                    {(['rules', 'exclusions', 'audit'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
                        >
                            {tab === 'rules' ? `Rules (${rules.length})` : tab === 'exclusions' ? `Excluded (${exclusions.length})` : 'Activity Log'}
                        </button>
                    ))}
                </div>

                {/* ══════════════ RULES TAB ══════════════ */}
                {activeTab === 'rules' && (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Activity Rules</h2>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-0.5">Processed top-to-bottom by priority. Winners of earlier rules are excluded from later ones.</p>
                            </div>
                            <button
                                onClick={() => { setEditingRule(null); setShowModal(true); }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
                            >
                                <FiPlus className="w-4 h-4" /> Create Rule
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }} />
                                ))}
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="rounded-2xl p-16 text-center" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                <div className="text-6xl mb-5">🏆</div>
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No rules yet</h3>
                                <p className="text-[rgb(var(--color-text-secondary))] mb-6 max-w-sm mx-auto">
                                    Create your first rule to start rewarding your most active chat and voice members every week.
                                </p>
                                <button
                                    onClick={() => { setEditingRule(null); setShowModal(true); }}
                                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/20"
                                >
                                    Create First Rule
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map((rule, idx) => {
                                    const role = getRole(rule.reward_role_id);
                                    const ruleWinners = topWinnersByRule(rule.id);
                                    return (
                                        <div
                                            key={rule.id}
                                            className={`group rounded-2xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ${!rule.enabled ? 'opacity-60' : ''}`}
                                            style={{
                                                background: 'rgb(var(--color-bg-secondary))',
                                                border: rule.enabled ? '1px solid rgb(var(--color-border))' : '1px dashed rgb(var(--color-border))',
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* Title row */}
                                                    <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                                                        {/* Priority badge */}
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                                                            #{idx + 1}
                                                        </span>
                                                        <h3 className="font-bold text-[rgb(var(--color-text-primary))] text-lg">{rule.name}</h3>
                                                        {rule.enabled ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.2)' }}>
                                                                Disabled
                                                            </span>
                                                        )}
                                                        {!role && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Role missing</span>}
                                                        {role && !role.manageable && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>Above bot role</span>}
                                                        {(rule.failure_count ?? 0) > 0 && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
                                                                {rule.failure_count} failed
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Meta row */}
                                                    <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            {rule.scope === 'category' ? <FiFolder className="w-4 h-4" /> : <FiGlobe className="w-4 h-4" />}
                                                            {rule.scope === 'category' ? getCategoryName(rule.category_id) : 'All Server'}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            {ACTIVITY_ICONS[rule.activity_type]}
                                                            {ACTIVITY_LABELS[rule.activity_type]}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            <FiAward className="w-4 h-4" />
                                                            Top {rule.winner_count}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: role ? roleColor(role.color) : '#99aab5' }}>
                                                            <FiTag className="w-4 h-4" />
                                                            @{role?.name || rule.reward_role_id}
                                                        </span>
                                                        {rule.min_chat_messages > 0 && (
                                                            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                                                <FiMessageSquare className="w-3 h-3" />
                                                                ≥{rule.min_chat_messages.toLocaleString()} msgs
                                                            </span>
                                                        )}
                                                        {rule.min_voice_seconds > 0 && (
                                                            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>
                                                                <FiMic className="w-3 h-3" />
                                                                ≥{(rule.min_voice_seconds / 3600).toFixed(1)}h VC
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Holder avatars */}
                                                    <div className="flex items-center gap-3">
                                                        {ruleWinners.length > 0 ? (
                                                            <>
                                                                <AvatarStack winners={ruleWinners} max={6} />
                                                                <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                                                    {rule.holder_count ?? 0} holding this role
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-text-tertiary))]">
                                                                <FiUsers className="w-3.5 h-3.5" />
                                                                {rule.holder_count ?? 0} holders
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => router.push(`/admin/weekly-activity/${rule.id}`)}
                                                        className="p-2.5 rounded-xl text-[rgb(var(--color-text-secondary))] hover:text-green-400 transition-colors"
                                                        style={{ background: 'rgb(var(--color-bg-tertiary))' }}
                                                        title="View leaderboard"
                                                    >
                                                        <FiActivity className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleRule(rule)}
                                                        disabled={togglingId === rule.id}
                                                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${rule.enabled ? 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]' : 'text-green-400'}`}
                                                        style={{ background: 'rgb(var(--color-bg-tertiary))' }}
                                                    >
                                                        {togglingId === rule.id ? '…' : rule.enabled ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingRule(rule); setShowModal(true); }}
                                                        className="p-2.5 rounded-xl text-[rgb(var(--color-text-secondary))] hover:text-blue-400 transition-colors"
                                                        style={{ background: 'rgb(var(--color-bg-tertiary))' }}
                                                        title="Edit rule"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRule(rule)}
                                                        disabled={deletingId === rule.id}
                                                        className="p-2.5 rounded-xl text-[rgb(var(--color-text-secondary))] hover:text-red-400 transition-colors disabled:opacity-50"
                                                        style={{ background: 'rgb(var(--color-bg-tertiary))' }}
                                                        title="Delete rule"
                                                    >
                                                        {deletingId === rule.id ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiTrash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Danger Zone ── */}
                        <div className="mt-8">
                            <button
                                onClick={() => setDangerOpen((o) => !o)}
                                className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                            >
                                <FiAlertTriangle className="w-4 h-4" />
                                Danger Zone
                                <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${dangerOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {dangerOpen && (
                                <div className="mt-3 rounded-2xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div>
                                            <p className="font-semibold text-[rgb(var(--color-text-primary))]">Reset Current Cycle Data</p>
                                            <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1 max-w-lg">
                                                Clears all computed results and role holders for the current cycle. Raw chat/voice logs are untouched. The next finalization will start fresh from zero.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowReset(true)}
                                            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                                            style={{ background: '#ef4444', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
                                        >
                                            Reset Cycle
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════ EXCLUSIONS TAB ══════════════ */}
                {activeTab === 'exclusions' && (
                    <div>
                        <div className="rounded-2xl p-6 mb-5" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                            <h3 className="font-bold text-[rgb(var(--color-text-primary))] mb-1">Exclude a Member</h3>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-5">
                                Excluded members never appear in any weekly leaderboard. Use for bots, test accounts, or staff-managed accounts.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text" value={exclusionInput} onChange={(e) => setExclusionInput(e.target.value)}
                                    placeholder="Discord user ID (numbers only)"
                                    className="flex-1 px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                                />
                                <input
                                    type="text" value={exclusionReason} onChange={(e) => setExclusionReason(e.target.value)}
                                    placeholder="Reason (optional)"
                                    className="flex-1 px-4 py-2.5 rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    style={{ background: 'rgb(var(--color-bg-primary))', border: '1px solid rgb(var(--color-border))' }}
                                />
                                <button
                                    onClick={addExclusion} disabled={savingExclusion}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    {savingExclusion ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlus className="w-4 h-4" />}
                                    Exclude
                                </button>
                            </div>
                            {exclusionError && <p className="text-xs text-red-400 mt-2">{exclusionError}</p>}
                        </div>
                        {exclusions.length === 0 ? (
                            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))] mb-1">No excluded members</h3>
                                <p className="text-[rgb(var(--color-text-secondary))]">Every eligible member counts toward the weekly leaderboards.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {exclusions.map((ex) => (
                                    <div key={ex.id} className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            {ex.avatarUrl ? (
                                                <img src={ex.avatarUrl} alt="" className="w-9 h-9 rounded-full flex-shrink-0 object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                                                    {(ex.displayName || ex.username || ex.userId)[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))] truncate">
                                                    {ex.displayName || ex.username || ex.userId}
                                                </p>
                                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono truncate">
                                                    {ex.userId}{ex.reason ? ` · ${ex.reason}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeExclusion(ex.userId)}
                                            className="p-2 rounded-lg text-[rgb(var(--color-text-secondary))] hover:text-red-400 transition-colors flex-shrink-0"
                                            style={{ background: 'rgb(var(--color-bg-tertiary))' }}
                                            title="Remove exclusion"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════ AUDIT TAB ══════════════ */}
                {activeTab === 'audit' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                                Activity Log <span className="text-[rgb(var(--color-text-tertiary))] font-normal text-base">({auditTotal} entries)</span>
                            </h2>
                            <button onClick={() => loadAudit(auditPage)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                <FiRefreshCw className="w-3.5 h-3.5" /> Refresh
                            </button>
                        </div>
                        {audit.length === 0 ? (
                            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))] mb-1">No log entries</h3>
                                <p className="text-[rgb(var(--color-text-secondary))]">Entries appear as rules change and cycles finalize.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    {audit.map((entry) => (
                                        <div key={entry.id} className="flex items-start gap-4 p-4 rounded-xl transition-colors" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                            <div className="flex-shrink-0 mt-0.5">{actionBadge(entry.action)}</div>
                                            <div className="flex-1 min-w-0">
                                                {entry.rule?.name && (
                                                    <p className="text-xs font-semibold text-[rgb(var(--color-text-secondary))] mb-0.5">
                                                        Rule: {entry.rule.name}
                                                    </p>
                                                )}
                                                {entry.reason && (
                                                    <p className="text-sm text-[rgb(var(--color-text-primary))] truncate">{entry.reason}</p>
                                                )}
                                                {entry.user_id && (
                                                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono mt-0.5">by {entry.user_id}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-[rgb(var(--color-text-tertiary))] whitespace-nowrap flex-shrink-0">
                                                {new Date(entry.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {auditTotal > 20 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Page {auditPage} of {Math.ceil(auditTotal / 20)}</p>
                                        <div className="flex gap-2">
                                            <button disabled={auditPage <= 1} onClick={() => setAuditPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                                Previous
                                            </button>
                                            <button disabled={auditPage >= Math.ceil(auditTotal / 20)} onClick={() => setAuditPage((p) => p + 1)} className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors" style={{ background: 'rgb(var(--color-bg-secondary))', border: '1px solid rgb(var(--color-border))' }}>
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <RuleModal
                    rule={editingRule}
                    roles={roles}
                    categories={categories}
                    rulesCount={rules.length}
                    onClose={() => { setShowModal(false); setEditingRule(null); }}
                    onSave={async () => { setShowModal(false); setEditingRule(null); await loadData(); await loadAudit(); }}
                />
            )}
            {showReset && (
                <ResetModal
                    onClose={() => setShowReset(false)}
                    onReset={async () => { await loadData(); await loadAudit(); }}
                />
            )}
        </div>
    );
}
