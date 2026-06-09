'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback,useEffect,useState } from 'react';
import {
FiActivity,
FiAlertCircle,FiCheck,
FiClock,
FiEdit2,
FiInfo,
FiList,
FiMic,
FiPlus,
FiRefreshCw,
FiShield,
FiTag,
FiTrash2,
FiUsers,
FiX
} from 'react-icons/fi';
interface AutomationRule {
    id: string;
    name: string;
    target_type: 'category' | 'channel';
    target_id: string;
    excluded_channel_ids: string[];
    rolling_days: number;
    required_hours: number;
    reward_role_id: string;
    count_deafened: boolean;
    enabled: boolean;
    created_at: string;
    grant_count?: number;
}
interface DiscordRole {
    id: string;
    name: string;
    color: number;
    position: number;
}
interface VoiceChannel {
    id: string;
    name: string;
    parent_id: string | null;
    parent_name: string | null;
    type: string;
}
interface Category {
    id: string;
    name: string;
    type: string;
}
interface AuditEntry {
    id: string;
    rule_id: string | null;
    user_id: string | null;
    action: string;
    reason: string | null;
    created_at: string;
    meta: any;
    rule?: { name: string; reward_role_id: string } | null;
}
interface Stats {
    totalRules: number;
    enabledRules: number;
    totalGrants: number;
    recentActions: AuditEntry[];
    ruleStats: (AutomationRule & { grant_count: number })[];
}
function roleColor(color: number): string {
    if (!color) return '#99aab5';
    return `#${color.toString(16).padStart(6, '0')}`;
}
function actionBadge(action: string) {
    const map: Record<string, { label: string; bg: string; text: string }> = {
        role_granted: { label: 'Granted', bg: 'bg-green-500/20', text: 'text-green-400' },
        role_removed: { label: 'Removed', bg: 'bg-red-500/20', text: 'text-red-400' },
        rule_created: { label: 'Rule Created', bg: 'bg-blue-500/20', text: 'text-blue-400' },
        rule_updated: { label: 'Rule Updated', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
        rule_deleted: { label: 'Rule Deleted', bg: 'bg-red-500/20', text: 'text-red-500' },
        eval_failed: { label: 'Error', bg: 'bg-orange-500/20', text: 'text-orange-400' },
    };
    const cfg = map[action] || { label: action, bg: 'bg-gray-500/20', text: 'text-gray-400' };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
}
interface RuleModalProps {
    rule?: AutomationRule | null;
    roles: DiscordRole[];
    voiceChannels: VoiceChannel[];
    categories: Category[];
    existingRules: AutomationRule[];
    onClose: () => void;
    onSave: () => void;
}
function RuleModal({ rule, roles, voiceChannels, categories, existingRules, onClose, onSave }: RuleModalProps) {
    const isEdit = !!rule;
    const [form, setForm] = useState({
        name: rule?.name || '',
        target_type: rule?.target_type || 'category',
        target_id: rule?.target_id || '',
        excluded_channel_ids: rule?.excluded_channel_ids || [] as string[],
        rolling_days: rule?.rolling_days?.toString() || '7',
        required_hours: rule?.required_hours?.toString() || '10',
        reward_role_id: rule?.reward_role_id || '',
        count_deafened: rule?.count_deafened ?? false,
        enabled: rule?.enabled ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [conflictRuleId, setConflictRuleId] = useState('');
    const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));
    const toggleExcluded = (channelId: string) => {
        setForm(f => ({
            ...f,
            excluded_channel_ids: f.excluded_channel_ids.includes(channelId)
                ? f.excluded_channel_ids.filter(id => id !== channelId)
                : [...f.excluded_channel_ids, channelId],
        }));
    };
    const channelsInSelectedCategory = form.target_type === 'category'
        ? voiceChannels.filter(c => c.parent_id === form.target_id)
        : [];
    const handleSave = async () => {
        setError('');
        setConflictRuleId('');
        if (!form.name.trim()) { setError('Rule name is required.'); return; }
        if (!form.target_id) { setError('Select a target channel or category.'); return; }
        if (!form.reward_role_id) { setError('Select a reward role.'); return; }
        const days = parseInt(form.rolling_days);
        const hours = parseFloat(form.required_hours);
        if (isNaN(days) || days < 1) { setError('Rolling days must be at least 1.'); return; }
        if (isNaN(hours) || hours <= 0) { setError('Required hours must be greater than 0.'); return; }
        setSaving(true);
        try {
            const url = isEdit ? `/api/vc-automation/rules/${rule!.id}` : '/api/vc-automation/rules';
            const method = isEdit ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    target_type: form.target_type,
                    target_id: form.target_id,
                    excluded_channel_ids: form.excluded_channel_ids,
                    rolling_days: days,
                    required_hours: hours,
                    reward_role_id: form.reward_role_id,
                    count_deafened: form.count_deafened,
                    enabled: form.enabled,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to save rule.');
                if (data.conflictRuleId) setConflictRuleId(data.conflictRuleId);
                return;
            }
            onSave();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    const conflictRule = existingRules.find(r => r.id === conflictRuleId);
    const selectedRole = roles.find(r => r.id === form.reward_role_id);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {}
                <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--color-border))]">
                    <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                        {isEdit ? 'Edit Automation Rule' : 'New Automation Rule'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                        <FiX className="w-5 h-5 text-[rgb(var(--color-text-secondary))]" />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    {}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Rule Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="e.g., Active Gamer"
                            className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    {}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Target Type</label>
                        <div className="flex gap-3">
                            {(['category', 'channel'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { set('target_type', type); set('target_id', ''); set('excluded_channel_ids', []); }}
                                    className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${form.target_type === type
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:border-blue-500/50'
                                        }`}
                                >
                                    {type === 'category' ? '📁 Category' : '🔊 Individual Channel'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {}
                    {form.target_type === 'category' ? (
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Category</label>
                            <select
                                value={form.target_id}
                                onChange={e => { set('target_id', e.target.value); set('excluded_channel_ids', []); }}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">— Select a category —</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            {}
                            {form.target_id && channelsInSelectedCategory.length > 0 && (
                                <div className="mt-3">
                                    <label className="block text-xs font-semibold text-[rgb(var(--color-text-tertiary))] mb-2">
                                        Exclude channels (optional)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {channelsInSelectedCategory.map(ch => (
                                            <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={form.excluded_channel_ids.includes(ch.id)}
                                                    onChange={() => toggleExcluded(ch.id)}
                                                    className="w-4 h-4 rounded accent-blue-500"
                                                />
                                                <span className="text-sm text-[rgb(var(--color-text-secondary))]">🔊 {ch.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Voice Channel</label>
                            <select
                                value={form.target_id}
                                onChange={e => set('target_id', e.target.value)}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="">— Select a voice channel —</option>
                                {voiceChannels.map(ch => (
                                    <option key={ch.id} value={ch.id}>
                                        {ch.parent_name ? `${ch.parent_name} / ` : ''}{ch.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Rolling Period (Days)</label>
                            <input
                                type="number"
                                min="1"
                                value={form.rolling_days}
                                onChange={e => set('rolling_days', e.target.value)}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Required Hours</label>
                            <input
                                type="number"
                                min="0.1"
                                step="0.5"
                                value={form.required_hours}
                                onChange={e => set('required_hours', e.target.value)}
                                className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>
                    {}
                    <div>
                        <label className="block text-sm font-semibold text-[rgb(var(--color-text-secondary))] mb-2">Reward Role</label>
                        <select
                            value={form.reward_role_id}
                            onChange={e => set('reward_role_id', e.target.value)}
                            className="w-full px-4 py-2.5 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            <option value="">— Select a role —</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                        {selectedRole && (
                            <div className="mt-2 flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: roleColor(selectedRole.color) }}
                                />
                                <span className="text-xs text-[rgb(var(--color-text-tertiary))]" style={{ color: roleColor(selectedRole.color) }}>
                                    @{selectedRole.name}
                                </span>
                            </div>
                        )}
                    </div>
                    {}
                    <div className="flex items-center justify-between p-4 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">Count Deafened Time</p>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-0.5">
                                {form.count_deafened
                                    ? 'Deafened time counts toward the requirement'
                                    : 'Deafened time is excluded from the requirement'}
                            </p>
                        </div>
                        <button
                            onClick={() => set('count_deafened', !form.count_deafened)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.count_deafened ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.count_deafened ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {}
                    {isEdit && (
                        <div className="flex items-center justify-between p-4 bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-xl">
                            <div>
                                <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">Rule Enabled</p>
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-0.5">Disable to pause without deleting the rule</p>
                            </div>
                            <button
                                onClick={() => set('enabled', !form.enabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}
                    {}
                    {conflictRule && (
                        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <FiAlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-yellow-400">Conflict with existing rule</p>
                                <p className="text-xs text-yellow-400/80 mt-1">
                                    Conflicting rule: <span className="font-semibold">{conflictRule.name}</span>
                                </p>
                            </div>
                        </div>
                    )}
                    {}
                    {error && !conflictRule && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>
                {}
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
export default function VCAutomationPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [audit, setAudit] = useState<AuditEntry[]>([]);
    const [roles, setRoles] = useState<DiscordRole[]>([]);
    const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'rules' | 'audit'>('rules');
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotal, setAuditTotal] = useState(0);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [rulesRes, statsRes, discordRes] = await Promise.all([
                fetch('/api/vc-automation/rules'),
                fetch('/api/vc-automation/stats'),
                fetch('/api/vc-automation/discord-data'),
            ]);
            if (rulesRes.ok) { const d = await rulesRes.json(); setRules(d.rules || []); }
            if (statsRes.ok) { const d = await statsRes.json(); setStats(d); }
            if (discordRes.ok) {
                const d = await discordRes.json();
                setRoles(d.roles || []);
                setVoiceChannels(d.voiceChannels || []);
                setCategories(d.categories || []);
            }
        } catch (err) {
            console.error('VCAutomation data load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);
    const loadAudit = useCallback(async (page = 1) => {
        try {
            const res = await fetch(`/api/vc-automation/audit?page=${page}&pageSize=20`);
            if (res.ok) {
                const d = await res.json();
                setAudit(d.entries || []);
                setAuditTotal(d.total || 0);
            }
        } catch {}
    }, []);
    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') { router.replace('/admin'); return; }
        if (status === 'authenticated') {
            const perms = session?.user?.permissions;
            if (!perms?.hasFullAccess) { setHasPermission(false); router.replace('/admin/dashboard'); return; }
            setHasPermission(true);
            loadData();
            loadAudit();
        }
    }, [status, session, router, loadData, loadAudit]);
    useEffect(() => {
        if (activeTab === 'audit') loadAudit(auditPage);
    }, [activeTab, auditPage, loadAudit]);
    const deleteRule = async (id: string) => {
        if (!confirm('Delete this automation rule? Roles will no longer be managed by it.')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/vc-automation/rules/${id}`, { method: 'DELETE' });
            if (res.ok) { await loadData(); await loadAudit(); }
        } catch {}
        setDeletingId(null);
    };
    const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || roleId;
    const getRoleColor = (roleId: string) => {
        const role = roles.find(r => r.id === roleId);
        return role ? roleColor(role.color) : '#99aab5';
    };
    const getTargetLabel = (rule: AutomationRule) => {
        if (rule.target_type === 'category') {
            const cat = categories.find(c => c.id === rule.target_id);
            return `📁 ${cat?.name || rule.target_id}`;
        }
        const ch = voiceChannels.find(c => c.id === rule.target_id);
        return `🔊 ${ch?.name || rule.target_id}`;
    };
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
                {}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <FiMic className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">VC Automation</h1>
                            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                                Auto-grant and remove Discord roles based on rolling voice channel activity
                            </p>
                        </div>
                    </div>
                </div>
                {}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Rules', value: stats.totalRules, icon: <FiList />, color: 'blue' },
                            { label: 'Active Rules', value: stats.enabledRules, icon: <FiActivity />, color: 'green' },
                            { label: 'Roles Granted', value: stats.totalGrants, icon: <FiShield />, color: 'purple' },
                            { label: 'Recent Actions', value: stats.recentActions.length, icon: <FiClock />, color: 'orange' },
                        ].map(({ label, value, icon, color }) => (
                            <div key={label} className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-4 hover:border-blue-500/40 transition-colors">
                                <div className={`flex items-center gap-2 mb-1 text-${color}-500`}>
                                    {icon}
                                    <span className="text-xs text-[rgb(var(--color-text-tertiary))]">{label}</span>
                                </div>
                                <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{value}</p>
                            </div>
                        ))}
                    </div>
                )}
                {}
                <div className="flex items-center gap-1 mb-6 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl p-1 w-fit">
                    {(['rules', 'audit'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                                }`}
                        >
                            {tab === 'rules' ? '📋 Rules' : '📜 Audit Log'}
                        </button>
                    ))}
                </div>
                {}
                {activeTab === 'rules' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                                Automation Rules <span className="text-[rgb(var(--color-text-tertiary))] font-normal text-sm">({rules.length})</span>
                            </h2>
                            <button
                                onClick={() => { setEditingRule(null); setShowModal(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-md"
                            >
                                <FiPlus className="w-4 h-4" />
                                Add Rule
                            </button>
                        </div>
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-28 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-12 text-center">
                                <div className="text-5xl mb-4">🎙️</div>
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No automation rules yet</h3>
                                <p className="text-[rgb(var(--color-text-secondary))] mb-6">
                                    Create rules to automatically grant and remove roles based on voice activity.
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
                                {rules.map(rule => (
                                    <div
                                        key={rule.id}
                                        className={`bg-[rgb(var(--color-bg-secondary))] border rounded-xl p-5 transition-all hover:shadow-md ${rule.enabled ? 'border-[rgb(var(--color-border))]' : 'border-dashed border-[rgb(var(--color-border))] opacity-70'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">{rule.name}</h3>
                                                    {rule.enabled ? (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Active</span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">Disabled</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
                                                    <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                        <FiMic className="w-3.5 h-3.5" />
                                                        <span>{getTargetLabel(rule)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                        <FiClock className="w-3.5 h-3.5" />
                                                        <span>{rule.required_hours}h in {rule.rolling_days} days</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <FiTag className="w-3.5 h-3.5 text-[rgb(var(--color-text-secondary))]" />
                                                        <span className="font-medium" style={{ color: getRoleColor(rule.reward_role_id) }}>
                                                            @{getRoleName(rule.reward_role_id)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm text-[rgb(var(--color-text-secondary))]">
                                                        <FiUsers className="w-3.5 h-3.5" />
                                                        <span>{rule.grant_count ?? 0} users holding role</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2.5">
                                                    {rule.count_deafened && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">Counts deafened</span>
                                                    )}
                                                    {rule.excluded_channel_ids.length > 0 && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                                                            {rule.excluded_channel_ids.length} channel{rule.excluded_channel_ids.length > 1 ? 's' : ''} excluded
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => router.push(`/admin/vc-automation/${rule.id}`)}
                                                    className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-green-500/20 hover:text-green-400 text-[rgb(var(--color-text-secondary))] transition-colors"
                                                    title="View rule details and progress"
                                                >
                                                    <FiInfo className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingRule(rule); setShowModal(true); }}
                                                    className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-blue-500/20 hover:text-blue-400 text-[rgb(var(--color-text-secondary))] transition-colors"
                                                    title="Edit rule"
                                                >
                                                    <FiEdit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteRule(rule.id)}
                                                    disabled={deletingId === rule.id}
                                                    className="p-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] hover:bg-red-500/20 hover:text-red-400 text-[rgb(var(--color-text-secondary))] transition-colors disabled:opacity-50"
                                                    title="Delete rule"
                                                >
                                                    {deletingId === rule.id ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiTrash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {}
                {activeTab === 'audit' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                                Audit Log <span className="text-[rgb(var(--color-text-tertiary))] font-normal text-sm">({auditTotal} entries)</span>
                            </h2>
                            <button onClick={() => loadAudit(auditPage)} className="flex items-center gap-2 px-3 py-1.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-lg text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
                                <FiRefreshCw className="w-3.5 h-3.5" />
                                Refresh
                            </button>
                        </div>
                        {audit.length === 0 ? (
                            <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl p-12 text-center">
                                <div className="text-5xl mb-4">📜</div>
                                <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">No audit entries</h3>
                                <p className="text-[rgb(var(--color-text-secondary))]">Audit entries will appear here as the automation system runs.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[640px]">
                                            <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Action</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Rule</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">User</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Reason</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[rgb(var(--color-border))]">
                                                {audit.map(entry => (
                                                    <tr key={entry.id} className="hover:bg-[rgb(var(--color-hover))] transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">{actionBadge(entry.action)}</td>
                                                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] max-w-[150px] truncate">
                                                            {entry.rule?.name || (entry.rule_id ? entry.rule_id.slice(0, 8) + '…' : '—')}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))] font-mono">
                                                            {entry.user_id ? entry.user_id : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-[rgb(var(--color-text-tertiary))] max-w-[200px] truncate">
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
                                {}
                                {auditTotal > 20 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                            Page {auditPage} of {Math.ceil(auditTotal / 20)}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={auditPage <= 1}
                                                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                                                className="px-3 py-1.5 text-sm rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] disabled:opacity-40 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                disabled={auditPage >= Math.ceil(auditTotal / 20)}
                                                onClick={() => setAuditPage(p => p + 1)}
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
            {}
            {showModal && (
                <RuleModal
                    rule={editingRule}
                    roles={roles}
                    voiceChannels={voiceChannels}
                    categories={categories}
                    existingRules={rules}
                    onClose={() => { setShowModal(false); setEditingRule(null); }}
                    onSave={async () => { setShowModal(false); setEditingRule(null); await loadData(); await loadAudit(); }}
                />
            )}
        </div>
    );
}