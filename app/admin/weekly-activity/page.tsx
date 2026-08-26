'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FiActivity,
    FiAlertCircle,
    FiAward,
    FiCheck,
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

interface Stats {
    totalRules: number;
    enabledRules: number;
    totalHolders: number;
    failedOperations: number;
    recentActions: AuditEntry[];
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function roleColor(color: number): string {
    if (!color) return '#99aab5';
    return `#${color.toString(16).padStart(6, '0')}`;
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
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function actionBadge(action: string) {
    const map: Record<string, { label: string; bg: string; text: string }> = {
        rule_created: { label: 'Rule Created', bg: 'bg-blue-500/20', text: 'text-blue-400' },
        rule_updated: { label: 'Rule Updated', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
        rule_enabled: { label: 'Enabled', bg: 'bg-green-500/20', text: 'text-green-400' },
        rule_disabled: { label: 'Disabled', bg: 'bg-gray-500/20', text: 'text-gray-400' },
        rule_deleted: { label: 'Rule Deleted', bg: 'bg-red-500/20', text: 'text-red-500' },
        roles_reconciled: { label: 'Roles Synced', bg: 'bg-purple-500/20', text: 'text-purple-400' },
        role_assign_failed: { label: 'Assign Failed', bg: 'bg-orange-500/20', text: 'text-orange-400' },
        role_removal_failed: { label: 'Removal Failed', bg: 'bg-orange-500/20', text: 'text-orange-400' },
        role_removal_skipped: { label: 'Removal Skipped', bg: 'bg-sky-500/20', text: 'text-sky-400' },
        role_configuration_error: { label: 'Config Error', bg: 'bg-red-500/20', text: 'text-red-400' },
        role_retry_completed: { label: 'Retry Recovered', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
        cycle_finalized: { label: 'Cycle Finalized', bg: 'bg-green-500/20', text: 'text-green-400' },
        cycle_finalized_with_errors: { label: 'Finalized w/ Errors', bg: 'bg-orange-500/20', text: 'text-orange-400' },
        rule_finalization_failed: { label: 'Finalize Failed', bg: 'bg-red-500/20', text: 'text-red-400' },
        exclusion_added: { label: 'Member Excluded', bg: 'bg-gray-500/20', text: 'text-gray-400' },
        exclusion_removed: { label: 'Exclusion Removed', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    };
    const cfg = map[action] || { label: action, bg: 'bg-gray-500/20', text: 'text-gray-400' };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
}

interface RuleModalProps {
    rule?: WeeklyRule | null;
    roles: DiscordRole[];
    categories: Category[];
    onClose: () => void;
    onSave: () => void;
}

function RuleModal({ rule, roles, categories, onClose, onSave }: RuleModalProps) {
    const isEdit = !!rule;
    const [form, setForm] = useState({
        name: rule?.name || '',
        scope: (rule?.scope || 'all_server') as Scope,
        category_id: rule?.category_id || '',
        activity_type: (rule?.activity_type || 'chat') as ActivityType,
        winner_count: rule?.winner_count?.toString() || '5',
        reward_role_id: rule?.reward_role_id || '',
        enabled: rule?.enabled ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

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
            setError('Winners must be a whole number between 1 and 50.');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--color-border))]">
                    <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                        {isEdit ? 'Edit Weekly Rule' : 'New Weekly Rule'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                        <FiX className="w-5 h-5 text-[rgb(var(--color-text-secondary))]" />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Rule Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(event) => set('name', event.target.value)}
                            placeholder="e.g., Top Members"
                            className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

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
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${form.scope === option.value
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:border-blue-500/50'
                                        }`}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.scope === 'category' && (
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Category</label>
                            <select
                                value={form.category_id}
                                onChange={(event) => set('category_id', event.target.value)}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">— Select a category —</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            {selectedCategory && (
                                <p className="mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                                    Every channel currently inside this category counts automatically —
                                    {' '}{selectedCategory.textChannelCount} text and {selectedCategory.voiceChannelCount} voice channels right now.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Activity</label>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { value: 'chat' as ActivityType, label: 'Chat', icon: <FiMessageSquare className="w-4 h-4" /> },
                                { value: 'vc' as ActivityType, label: 'VC', icon: <FiMic className="w-4 h-4" /> },
                                { value: 'both' as ActivityType, label: 'Chat + VC', icon: <FiActivity className="w-4 h-4" /> },
                            ]).map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => set('activity_type', option.value)}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${form.activity_type === option.value
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:border-blue-500/50'
                                        }`}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {form.activity_type === 'both' && (
                            <p className="mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                                Combined ranking uses points: 1 point per message plus 1 point per full minute in voice.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Winners</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={form.winner_count}
                                onChange={(event) => set('winner_count', event.target.value)}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Reward Role</label>
                            <select
                                value={form.reward_role_id}
                                onChange={(event) => set('reward_role_id', event.target.value)}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">— Select a role —</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id} disabled={!role.manageable}>
                                        {role.name}{role.manageable ? '' : ' (above the bot)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedRole && (
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: roleColor(selectedRole.color) }} />
                            <span className="text-xs" style={{ color: roleColor(selectedRole.color) }}>@{selectedRole.name}</span>
                            {!selectedRole.manageable && (
                                <span className="text-xs text-orange-400">The bot cannot manage this role — move the bot role higher.</span>
                            )}
                        </div>
                    )}

                    {isEdit && (
                        <div className="flex items-center justify-between p-4 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl">
                            <div>
                                <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">Rule Enabled</p>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-0.5">Disable to pause weekly finalization without deleting the rule</p>
                            </div>
                            <button
                                onClick={() => set('enabled', !form.enabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgb(var(--color-border))]">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-primary))] transition-colors font-medium">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><FiCheck className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Rule'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
            const response = await fetch('/api/weekly-activity/exclusions');
            if (!response.ok) return;
            const data = await response.json();
            setExclusions(data.exclusions || []);
        } catch { }
    }, []);

    const addExclusion = async () => {
        setExclusionError('');
        const userId = exclusionInput.trim();
        if (!/^\d{5,25}$/.test(userId)) {
            setExclusionError('Enter a valid Discord user ID (numbers only).');
            return;
        }
        setSavingExclusion(true);
        try {
            const response = await fetch('/api/weekly-activity/exclusions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, reason: exclusionReason.trim() || null }),
            });
            const data = await response.json();
            if (!response.ok) {
                setExclusionError(data.error || 'Failed to add exclusion.');
                return;
            }
            setExclusionInput('');
            setExclusionReason('');
            await loadExclusions();
        } catch {
            setExclusionError('Network error. Please try again.');
        } finally {
            setSavingExclusion(false);
        }
    };

    const removeExclusion = async (userId: string) => {
        try {
            const response = await fetch(`/api/weekly-activity/exclusions?userId=${userId}`, { method: 'DELETE' });
            if (response.ok) await loadExclusions();
        } catch { }
    };

    const loadAudit = useCallback(async (page = 1) => {
        try {
            const response = await fetch(`/api/weekly-activity/audit?page=${page}&pageSize=20`);
            if (!response.ok) return;
            const data = await response.json();
            setAudit(data.entries || []);
            setAuditTotal(data.total || 0);
        } catch { }
    }, []);

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') { router.replace('/admin'); return; }
        if (!session?.user?.permissions?.hasFullAccess) {
            setHasPermission(false);
            router.replace('/admin/dashboard');
            return;
        }
        setHasPermission(true);
        loadData();
        loadAudit();
        loadExclusions();
    }, [status, session, router, loadData, loadAudit, loadExclusions]);

    useEffect(() => {
        if (activeTab === 'audit') loadAudit(auditPage);
    }, [activeTab, auditPage, loadAudit]);

    const toggleRule = async (rule: WeeklyRule) => {
        setTogglingId(rule.id);
        try {
            const response = await fetch(`/api/weekly-activity/rules/${rule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled }),
            });
            if (response.ok) await loadData();
        } catch { }
        setTogglingId(null);
    };

    const deleteRule = async (rule: WeeklyRule) => {
        if (!confirm(`Delete "${rule.name}"? Roles it already granted stay on members but are no longer managed.`)) return;
        setDeletingId(rule.id);
        try {
            const response = await fetch(`/api/weekly-activity/rules/${rule.id}`, { method: 'DELETE' });
            if (response.ok) { await loadData(); await loadAudit(); }
        } catch { }
        setDeletingId(null);
    };

    const getRole = (roleId: string) => roles.find((role) => role.id === roleId);
    const getCategoryName = (categoryId: string | null) =>
        categories.find((category) => category.id === categoryId)?.name || categoryId || 'Unknown category';

    const cycleSummary = useMemo(() => {
        if (!cycle) return null;
        const weekStart = DAY_NAMES[cycle.config.weekStartDay] || 'Monday';
        const hour = String(cycle.config.weekStartHour).padStart(2, '0');
        return `Weeks start ${weekStart} at ${hour}:00 ${cycle.config.timeZone}`;
    }, [cycle]);

    if (status === 'loading' || hasPermission === null) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                    <p className="text-[rgb(var(--color-text-secondary))]">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl">
                        <FiAward className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">Weekly Activity Roles</h1>
                        <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                            Reward the most active chat and voice members with Discord roles every week
                        </p>
                    </div>
                </div>

                {cycle && (
                    <div className="mb-8 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-1">Current Weekly Cycle</p>
                                <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">
                                    {formatDate(cycle.current.start)} — {formatDate(cycle.current.end)}
                                </p>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">{cycleSummary}</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))]">
                                <FiClock className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">
                                    Ends in {formatRemaining(cycle.current.msRemaining)}
                                </span>
                            </div>
                            {cycle.previous && (
                                <div className="text-right">
                                    <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-1">Previous Cycle</p>
                                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                                        {formatDate(cycle.previous.start)} — {formatDate(cycle.previous.end)} · {cycle.previous.status}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex items-start gap-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                            <FiInfo className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>Live standings are projections. Roles are only assigned or removed when the cycle is finalized.</span>
                        </div>
                    </div>
                )}

                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Rules', value: stats.totalRules, icon: <FiList />, color: 'text-blue-500' },
                            { label: 'Active Rules', value: stats.enabledRules, icon: <FiActivity />, color: 'text-green-500' },
                            { label: 'Role Holders', value: stats.totalHolders, icon: <FiShield />, color: 'text-purple-500' },
                            { label: 'Failed Operations', value: stats.failedOperations, icon: <FiAlertCircle />, color: stats.failedOperations > 0 ? 'text-orange-500' : 'text-[rgb(var(--color-text-tertiary))]' },
                        ].map((card) => (
                            <div key={card.label} className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-4">
                                <div className={`flex items-center gap-2 mb-1 ${card.color}`}>
                                    {card.icon}
                                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">{card.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{card.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-1 mb-6 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-1 w-fit">
                    {(['rules', 'exclusions', 'audit'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                                }`}
                        >
                            {tab === 'rules' ? 'Rules' : tab === 'exclusions' ? `Excluded Members (${exclusions.length})` : 'Activity Log'}
                        </button>
                    ))}
                </div>

                {activeTab === 'rules' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                                Rules <span className="text-[rgb(var(--color-text-tertiary))] font-normal text-sm">({rules.length})</span>
                            </h2>
                            <button
                                onClick={() => { setEditingRule(null); setShowModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-md"
                            >
                                <FiPlus className="w-4 h-4" />
                                Create Rule
                            </button>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, index) => (
                                    <div key={index} className="h-28 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-12 text-center">
                                <div className="text-5xl mb-4">🏆</div>
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No weekly rules yet</h3>
                                <p className="text-[rgb(var(--color-text-secondary))] mb-6">
                                    Create a rule to reward your most active chat and voice members each week.
                                </p>
                                <button
                                    onClick={() => { setEditingRule(null); setShowModal(true); }}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Create First Rule
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map((rule) => {
                                    const role = getRole(rule.reward_role_id);
                                    return (
                                        <div
                                            key={rule.id}
                                            className={`bg-[rgb(var(--color-bg-secondary))] border rounded-xl p-5 transition-all hover:shadow-md ${rule.enabled ? 'border-[rgb(var(--color-border))]' : 'border-dashed border-[rgb(var(--color-border))] opacity-70'}`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">{rule.name}</h3>
                                                        {rule.enabled ? (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Active</span>
                                                        ) : (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">Disabled</span>
                                                        )}
                                                        {!role && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Role missing</span>
                                                        )}
                                                        {role && !role.manageable && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">Above bot role</span>
                                                        )}
                                                        {(rule.failure_count ?? 0) > 0 && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                                                                {rule.failure_count} pending retries
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            {rule.scope === 'category' ? <FiFolder className="w-3.5 h-3.5" /> : <FiGlobe className="w-3.5 h-3.5" />}
                                                            {rule.scope === 'category' ? getCategoryName(rule.category_id) : 'All Server'}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            <FiActivity className="w-3.5 h-3.5" />
                                                            {ACTIVITY_LABELS[rule.activity_type]}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            <FiAward className="w-3.5 h-3.5" />
                                                            Top {rule.winner_count}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm">
                                                            <FiTag className="w-3.5 h-3.5 text-[rgb(var(--color-text-secondary))]" />
                                                            <span className="font-medium" style={{ color: role ? roleColor(role.color) : '#99aab5' }}>
                                                                @{role?.name || rule.reward_role_id}
                                                            </span>
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                            <FiUsers className="w-3.5 h-3.5" />
                                                            {rule.holder_count ?? 0} holding role
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => router.push(`/admin/weekly-activity/${rule.id}`)}
                                                        className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-green-500/20 hover:text-green-400 text-[rgb(var(--color-text-secondary))] transition-colors"
                                                        title="View leaderboard"
                                                    >
                                                        <FiInfo className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleRule(rule)}
                                                        disabled={togglingId === rule.id}
                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${rule.enabled
                                                            ? 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-gray-500/20'
                                                            : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                            }`}
                                                    >
                                                        {togglingId === rule.id ? '…' : rule.enabled ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingRule(rule); setShowModal(true); }}
                                                        className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-blue-500/20 hover:text-blue-400 text-[rgb(var(--color-text-secondary))] transition-colors"
                                                        title="Edit rule"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRule(rule)}
                                                        disabled={deletingId === rule.id}
                                                        className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-red-500/20 hover:text-red-400 text-[rgb(var(--color-text-secondary))] transition-colors disabled:opacity-50"
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
                    </div>
                )}

                {activeTab === 'exclusions' && (
                    <div>
                        <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-5 mb-4">
                            <h3 className="text-sm font-semibold text-[rgb(var(--color-text-primary))] mb-1">Exclude a member from all weekly leaderboards</h3>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-4">
                                Use this for bots not flagged by Discord, test accounts, or staff-managed accounts that should never win a weekly role.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    value={exclusionInput}
                                    onChange={(event) => setExclusionInput(event.target.value)}
                                    placeholder="Discord user ID"
                                    className="flex-1 px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                                />
                                <input
                                    type="text"
                                    value={exclusionReason}
                                    onChange={(event) => setExclusionReason(event.target.value)}
                                    placeholder="Reason (optional)"
                                    className="flex-1 px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                                <button
                                    onClick={addExclusion}
                                    disabled={savingExclusion}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    {savingExclusion ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlus className="w-4 h-4" />}
                                    Exclude
                                </button>
                            </div>
                            {exclusionError && (
                                <p className="text-xs text-red-400 mt-2">{exclusionError}</p>
                            )}
                        </div>
                        {exclusions.length === 0 ? (
                            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-12 text-center">
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No excluded members</h3>
                                <p className="text-[rgb(var(--color-text-secondary))]">Every eligible member currently counts toward the weekly leaderboards.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {exclusions.map((exclusion) => (
                                    <div key={exclusion.id} className="flex items-center justify-between gap-4 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {exclusion.avatarUrl ? (
                                                <img src={exclusion.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                                            ) : (
                                                <span className="w-8 h-8 rounded-full bg-[rgb(var(--color-bg-tertiary))] flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm text-[rgb(var(--color-text-primary))] truncate">
                                                    {exclusion.displayName || exclusion.username || exclusion.userId}
                                                </p>
                                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono truncate">
                                                    {exclusion.userId}{exclusion.reason ? ` · ${exclusion.reason}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeExclusion(exclusion.userId)}
                                            className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-red-500/20 hover:text-red-400 text-[rgb(var(--color-text-secondary))] transition-colors flex-shrink-0"
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

                {activeTab === 'audit' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                                Activity Log <span className="text-[rgb(var(--color-text-tertiary))] font-normal text-sm">({auditTotal} entries)</span>
                            </h2>
                            <button
                                onClick={() => loadAudit(auditPage)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-lg text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors"
                            >
                                <FiRefreshCw className="w-3.5 h-3.5" />
                                Refresh
                            </button>
                        </div>
                        {audit.length === 0 ? (
                            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-12 text-center">
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No log entries</h3>
                                <p className="text-[rgb(var(--color-text-secondary))]">Entries appear here as rules change and cycles finalize.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[640px]">
                                            <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                                                <tr>
                                                    {['Action', 'Rule', 'User', 'Details', 'Time'].map((heading) => (
                                                        <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                                                            {heading}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[rgb(var(--color-border))]">
                                                {audit.map((entry) => (
                                                    <tr key={entry.id} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">{actionBadge(entry.action)}</td>
                                                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] max-w-[160px] truncate">
                                                            {entry.rule?.name || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] font-mono">
                                                            {entry.user_id || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-tertiary))] max-w-[260px] truncate">
                                                            {entry.reason || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-[rgb(var(--color-text-tertiary))] whitespace-nowrap">
                                                            {new Date(entry.created_at).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {auditTotal > 20 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                            Page {auditPage} of {Math.ceil(auditTotal / 20)}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={auditPage <= 1}
                                                onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
                                                className="px-3 py-1.5 text-sm rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] disabled:opacity-40 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                disabled={auditPage >= Math.ceil(auditTotal / 20)}
                                                onClick={() => setAuditPage((page) => page + 1)}
                                                className="px-3 py-1.5 text-sm rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] disabled:opacity-40 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                                            >
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
                    onClose={() => { setShowModal(false); setEditingRule(null); }}
                    onSave={async () => { setShowModal(false); setEditingRule(null); await loadData(); await loadAudit(); }}
                />
            )}
        </div>
    );
}
