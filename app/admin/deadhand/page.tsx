'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EntityDropdown from '@/components/ui/entity-dropdown';
import {
    FiShield, FiAlertTriangle, FiChevronDown, FiChevronUp,
    FiPlus, FiSave, FiRotateCcw,
} from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GuildInfo { id: string; name: string; icon?: string | null; }
interface DHModule {
    id: string; guild_id: string; module_name: string;
    severity: string; enabled: boolean;
    threshold_short: number; time_span_short_secs: number;
    threshold_long: number; time_span_long_secs: number;
    action: string; cooldown_secs: number;
    whitelist_roles: string[]; whitelist_users: string[];
    protected_roles: string[];
}
interface DHConfig {
    guild_id: string; enabled: boolean; strict_mode: boolean;
    emergency_lock_level: number; log_channel_id: string | null;
    modules: DHModule[];
    whitelist: Array<{ id: string; target_id: string; type: string }>;
}
interface SearchResult { id: string; name: string; type: string; avatarUrl?: string; color?: number; }
interface Channel { id: string; name: string; }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MODULE_LABELS: Record<string, string> = {
    anti_ban: 'Anti Ban', anti_kick: 'Anti Kick', anti_bot: 'Anti Bot',
    anti_prune: 'Anti Prune', anti_channel_delete: 'Anti Channel Delete',
    anti_channel_update: 'Anti Channel Update', anti_role_create: 'Anti Role Create',
    anti_role_delete: 'Anti Role Delete', anti_server_update: 'Anti Server Update',
    anti_webhook_create: 'Anti Webhook Create', anti_webhook_update: 'Anti Webhook Update',
    anti_webhook_delete: 'Anti Webhook Delete', anti_danger_perms: 'Anti Danger Perms',
};
const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6',
};
const LOCK_LABELS = ['Off', 'Soft', 'Medium', 'Hard'];
const LOCK_COLORS = ['#8b949e', '#f59e0b', '#f97316', '#ef4444']; // Adjusted off color for better contrast in light mode

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${checked ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    return (
        <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full"
            style={{ backgroundColor: (SEVERITY_COLORS[severity] ?? '#6b7280') + '22', color: SEVERITY_COLORS[severity] ?? '#6b7280', border: `1px solid ${(SEVERITY_COLORS[severity] ?? '#6b7280')}55` }}>
            {severity}
        </span>
    );
}

function SearchDropdown({
    guildId, type, placeholder, selected, onAdd, onRemove,
}: {
    guildId: string; type: 'member' | 'role';
    placeholder: string;
    selected: Array<{ id: string; name: string; avatarUrl?: string; color?: number }>;
    onAdd: (r: SearchResult) => void;
    onRemove: (id: string) => void;
}) {
    const [latestResults, setLatestResults] = useState<SearchResult[]>([]);

    const selectedIds = useMemo(() => selected.map((s) => s.id), [selected]);

    const selectedOptions = useMemo(
        () => selected.map((s) => ({
            id: s.id,
            name: s.name,
            avatarUrl: s.avatarUrl || null,
            color: s.color ?? null,
        })),
        [selected]
    );

    const fetchOptions = useCallback(async (query: string) => {
        if (!guildId) return [];

        try {
            const res = await fetch(`/api/deadhand/search?guildId=${guildId}&query=${encodeURIComponent(query)}&type=${type}`);
            const data = await res.json();
            const results = Array.isArray(data.results) ? data.results as SearchResult[] : [];
            setLatestResults(results);

            return results
                .filter((r) => !selectedIds.includes(r.id))
                .map((r) => ({
                    id: r.id,
                    name: r.name,
                    subtitle: r.id,
                    avatarUrl: r.avatarUrl || null,
                    color: r.color ?? null,
                }));
        } catch {
            setLatestResults([]);
            return [];
        }
    }, [guildId, selectedIds, type]);

    const handleChange = useCallback((nextIds: string[]) => {
        const currentSet = new Set(selectedIds);
        const nextSet = new Set(nextIds);

        for (const currentId of selectedIds) {
            if (!nextSet.has(currentId)) {
                onRemove(currentId);
            }
        }

        for (const id of nextIds) {
            if (currentSet.has(id)) continue;

            const found = latestResults.find((r) => r.id === id) || selected.find((r) => r.id === id);
            if (found) {
                onAdd(found);
                continue;
            }

            onAdd({
                id,
                name: id,
                type: type === 'member' ? 'user' : 'role',
            });
        }
    }, [latestResults, onAdd, onRemove, selected, selectedIds, type]);

    return (
        <EntityDropdown
            options={[]}
            selectedIds={selectedIds}
            selectedOptions={selectedOptions}
            onChange={handleChange}
            multiple
            placeholder={placeholder}
            searchPlaceholder="Search by name or id"
            fetchOptions={fetchOptions}
            emptyMessage="No results found"
        />
    );
}

function ModuleCard({
    module, guildId, onChange, channels,
}: {
    module: DHModule; guildId: string;
    onChange: (updated: Partial<DHModule>) => void;
    channels: Channel[];
}) {
    const [open, setOpen] = useState(false);
    const label = MODULE_LABELS[module.module_name] ?? module.module_name;

    // Local whitelist state
    const [whitelistRoles, setWhitelistRoles] = useState<Array<{ id: string; name: string; color?: number }>>([]);
    const [whitelistUsers, setWhitelistUsers] = useState<Array<{ id: string; name: string; avatarUrl?: string }>>([]);
    const [protectedRoles, setProtectedRoles] = useState<Array<{ id: string; name: string; color?: number }>>([]);

    const save = () => {
        onChange({
            whitelist_roles: whitelistRoles.map(r => r.id),
            whitelist_users: whitelistUsers.map(u => u.id),
            protected_roles: protectedRoles.map(r => r.id),
        });
    };

    return (
        <div className={`rounded-2xl border transition-all duration-200 ${module.enabled ? 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]' : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] opacity-80'}`}>
            {/* Header row */}
            <div className="flex items-center gap-4 px-5 py-5 cursor-pointer" onClick={() => setOpen(o => !o)}>
                <Toggle checked={module.enabled} onChange={v => onChange({ enabled: v })} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-[rgb(var(--color-text-primary))] text-lg">{label}</span>
                        <SeverityBadge severity={module.severity} />
                    </div>
                    <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))] mt-1">
                        Triggers at {module.threshold_short}×/{module.time_span_short_secs}s or {module.threshold_long}×/{module.time_span_long_secs}s
                    </p>
                </div>
                <div className="flex items-center text-[rgb(var(--color-text-tertiary))] opacity-70 hover:opacity-100 transition-opacity">
                    {open ? <FiChevronUp size={24} /> : <FiChevronDown size={24} />}
                </div>
            </div>

            {open && (
                <div className="border-t border-[rgb(var(--color-border))] px-5 pb-6 pt-5 space-y-6">
                    {/* Thresholds */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 p-4 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))]">
                            <label className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Short Threshold</label>
                            <div className="flex items-center gap-3">
                                <input type="number" min={1} value={module.threshold_short}
                                    onChange={e => onChange({ threshold_short: +e.target.value })}
                                    className="w-20 px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-base text-[rgb(var(--color-text-primary))] focus:outline-none focus:border-blue-500/50" />
                                <span className="text-[rgb(var(--color-text-secondary))] text-sm font-medium">actions in</span>
                                <input type="number" min={1} value={module.time_span_short_secs}
                                    onChange={e => onChange({ time_span_short_secs: +e.target.value })}
                                    className="w-20 px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-base text-[rgb(var(--color-text-primary))] focus:outline-none focus:border-blue-500/50" />
                                <span className="text-[rgb(var(--color-text-secondary))] text-sm font-medium">sec</span>
                            </div>
                        </div>
                        <div className="space-y-2 p-4 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))]">
                            <label className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Long Threshold</label>
                            <div className="flex items-center gap-3">
                                <input type="number" min={1} value={module.threshold_long}
                                    onChange={e => onChange({ threshold_long: +e.target.value })}
                                    className="w-20 px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-base text-[rgb(var(--color-text-primary))] focus:outline-none focus:border-blue-500/50" />
                                <span className="text-[rgb(var(--color-text-secondary))] text-sm font-medium">actions in</span>
                                <input type="number" min={1} value={module.time_span_long_secs}
                                    onChange={e => onChange({ time_span_long_secs: +e.target.value })}
                                    className="w-20 px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-base text-[rgb(var(--color-text-primary))] focus:outline-none focus:border-blue-500/50" />
                                <span className="text-[rgb(var(--color-text-secondary))] text-sm font-medium">sec</span>
                            </div>
                        </div>
                    </div>

                    {/* Action + Cooldown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Action</label>
                            <select value={module.action} onChange={e => onChange({ action: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-base text-[rgb(var(--color-text-primary))] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                <option value="mute">Mute</option>
                                <option value="kick">Kick</option>
                                <option value="ban">Ban</option>
                                <option value="takedown_roles">Takedown Danger Roles</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Cooldown (sec)</label>
                            <input type="number" min={0} value={module.cooldown_secs}
                                onChange={e => onChange({ cooldown_secs: +e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-base text-[rgb(var(--color-text-primary))] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </div>
                    </div>

                    {/* Whitelists */}
                    <div className="space-y-4 pt-2">
                        <p className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Whitelist (this module)</p>
                        <SearchDropdown guildId={guildId} type="role" placeholder="Search roles to whitelist…"
                            selected={whitelistRoles}
                            onAdd={r => setWhitelistRoles(prev => [...prev, { id: r.id, name: r.name, color: r.color }])}
                            onRemove={id => setWhitelistRoles(prev => prev.filter(r => r.id !== id))} />
                        <SearchDropdown guildId={guildId} type="member" placeholder="Search users to whitelist…"
                            selected={whitelistUsers}
                            onAdd={r => setWhitelistUsers(prev => [...prev, { id: r.id, name: r.name, avatarUrl: r.avatarUrl }])}
                            onRemove={id => setWhitelistUsers(prev => prev.filter(u => u.id !== id))} />
                    </div>

                    {module.action === 'takedown_roles' && (
                        <div className="space-y-4 pt-2">
                            <p className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Protected Roles (never stripped)</p>
                            <SearchDropdown guildId={guildId} type="role" placeholder="Search roles to protect…"
                                selected={protectedRoles}
                                onAdd={r => setProtectedRoles(prev => [...prev, { id: r.id, name: r.name, color: r.color }])}
                                onRemove={id => setProtectedRoles(prev => prev.filter(r => r.id !== id))} />
                        </div>
                    )}

                    <button type="button" onClick={save}
                        className="flex w-full items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-base font-bold shadow-sm transition-all duration-200">
                        <FiSave size={18} /> Save Module Configuration
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DeadHandPage() {
    const { status } = useSession();
    const router = useRouter();

    const [guilds, setGuilds] = useState<GuildInfo[]>([]);
    const [guildId, setGuildId] = useState('');
    const [config, setConfig] = useState<DHConfig | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loadingGuilds, setLoadingGuilds] = useState(true);
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permError, setPermError] = useState<string | null>(null);

    // Global whitelist state
    const [globalWhitelistRoles, setGlobalWhitelistRoles] = useState<Array<{ id: string; name: string; color?: number }>>([]);
    const [globalWhitelistUsers, setGlobalWhitelistUsers] = useState<Array<{ id: string; name: string; avatarUrl?: string }>>([]);

    // -----------------------------------------------------------------------
    // Auth guard
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (status === 'loading') return;
        if (status !== 'authenticated') router.push('/admin/signin');
    }, [status, router]);

    // -----------------------------------------------------------------------
    // Load guilds
    // -----------------------------------------------------------------------
    useEffect(() => {
        void (async () => {
            try {
                const res = await fetch('/api/automod/guilds');
                const data = await res.json();
                setGuilds(Array.isArray(data?.guilds) ? data.guilds : []);
            } catch { setGuilds([]); }
            setLoadingGuilds(false);
        })();
    }, []);

    // -----------------------------------------------------------------------
    // Load config when guild selected
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!guildId) return;
        setPermError(null);
        setError(null);
        setLoadingConfig(true);
        void (async () => {
            try {
                // Load config and channels in parallel
                const [cfgRes, chRes] = await Promise.all([
                    fetch(`/api/deadhand/config?guildId=${guildId}`),
                    fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                        // We proxy through our search endpoint to avoid CORS
                    }),
                ]);

                if (cfgRes.status === 403) {
                    setPermError('Insufficient role hierarchy to manage Dead Hand in this server. You must be the server owner or have a role above the bot.');
                    setLoadingConfig(false);
                    return;
                }

                if (!cfgRes.ok) {
                    setError('Failed to load Dead Hand configuration.');
                    setLoadingConfig(false);
                    return;
                }

                const cfg: DHConfig = await cfgRes.json();
                setConfig(cfg);

                // Load channels via search API
                const searchRes = await fetch(`/api/deadhand/search?guildId=${guildId}&type=channel&query=`);
                if (searchRes.ok) {
                    const { results } = await searchRes.json();
                    setChannels(results ?? []);
                }

                // Load global whitelist
                const wlRes = await fetch(`/api/deadhand/whitelist?guildId=${guildId}`);
                if (wlRes.ok) {
                    const wl = await wlRes.json();
                    setGlobalWhitelistRoles(wl.filter((w: any) => w.type === 'role').map((w: any) => ({ id: w.target_id, name: w.target_id })));
                    setGlobalWhitelistUsers(wl.filter((w: any) => w.type === 'user').map((w: any) => ({ id: w.target_id, name: w.target_id })));
                }
            } catch (e: any) {
                setError(e.message ?? 'Unknown error');
            }
            setLoadingConfig(false);
        })();
    }, [guildId]);

    // -----------------------------------------------------------------------
    // Config updaters
    // -----------------------------------------------------------------------
    async function saveConfig(updates: Partial<DHConfig>) {
        if (!config) return;
        setSaving('config');
        try {
            const res = await fetch('/api/deadhand/config', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId, ...updates }),
            });
            if (res.ok) setConfig(prev => prev ? { ...prev, ...updates } : prev);
        } catch { setError('Failed to save config.'); }
        setSaving(null);
    }

    async function saveModule(module_name: string, updates: Partial<DHModule>) {
        setSaving(module_name);
        try {
            const res = await fetch('/api/deadhand/modules', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId, module_name, ...updates }),
            });
            if (res.ok) {
                setConfig(prev => {
                    if (!prev) return prev;
                    return { ...prev, modules: prev.modules.map(m => m.module_name === module_name ? { ...m, ...updates } : m) };
                });
            }
        } catch { setError('Failed to save module.'); }
        setSaving(null);
    }

    async function addGlobalWhitelist(targetId: string, type: 'role' | 'user') {
        await fetch('/api/deadhand/whitelist', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guildId, target_id: targetId, type }),
        });
    }

    async function removeGlobalWhitelist(targetId: string) {
        await fetch('/api/deadhand/whitelist', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guildId, target_id: targetId }),
        });
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    if (status === 'loading' || loadingGuilds) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-[rgb(var(--color-accent))] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10" style={{ fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)' }}>
            {/* Header */}
            <div className="flex items-center gap-5 bg-red-600/10 p-6 rounded-3xl border border-red-500/20">
                <div className="p-4 rounded-2xl bg-red-500 shadow-xl">
                    <FiShield className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[rgb(var(--color-text-primary))]">Dead Hand</h1>
                    <p className="text-base font-medium text-[rgb(var(--color-text-secondary))] mt-1">Production-grade anti-nuke protection system</p>
                </div>
            </div>

            {/* Guild selector */}
            <div className="rounded-3xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-6 space-y-3 shadow-apple-lg">
                <label className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider block">Server</label>
                <select value={guildId} onChange={e => setGuildId(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer shadow-sm">
                    <option value="">Select a server…</option>
                    {guilds.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {/* Permission error */}
            {permError && (
                <div className="flex items-start gap-4 p-5 rounded-3xl bg-red-500/10 border border-red-500/30">
                    <FiAlertTriangle className="text-red-500 mt-1 shrink-0" size={24} />
                    <p className="text-red-500 font-medium text-base leading-relaxed">{permError}</p>
                </div>
            )}

            {/* General error */}
            {error && !permError && (
                <div className="flex items-start gap-4 p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30">
                    <FiAlertTriangle className="text-amber-500 mt-1 shrink-0" size={24} />
                    <p className="text-amber-500 font-medium text-base leading-relaxed">{error}</p>
                </div>
            )}

            {/* Loading config */}
            {loadingConfig && (
                <div className="flex items-center justify-center p-12">
                    <div className="w-10 h-10 border-4 border-[rgb(var(--color-border))] border-t-[rgb(var(--color-accent))] rounded-full animate-spin" />
                </div>
            )}

            {config && !permError && !loadingConfig && (
                <>
                    <hr className="border-[rgb(var(--color-border))]" />

                    {/* Master controls */}
                    <div className="rounded-3xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-6 md:p-8 space-y-8 shadow-apple-lg">
                        <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">System Controls</h2>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-[rgb(var(--color-border))]">
                            <div className="max-w-md">
                                <p className="text-lg text-[rgb(var(--color-text-primary))] font-bold">Enable Dead Hand</p>
                                <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))] mt-1">Master switch — disabling entirely pauses all modules and protections.</p>
                            </div>
                            <div className="scale-125 transform ml-2 md:justify-self-end">
                                <Toggle checked={config.enabled} onChange={v => saveConfig({ enabled: v })} />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-[rgb(var(--color-border))]">
                            <div className="max-w-md">
                                <p className="text-lg text-[rgb(var(--color-text-primary))] font-bold">Strict Mode</p>
                                <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))] mt-1">When enabled, actors above the bot role are detected and logged (but the bot skips impossible punishments).</p>
                            </div>
                            <div className="scale-125 transform ml-2 md:justify-self-end">
                                <Toggle checked={config.strict_mode} onChange={v => saveConfig({ strict_mode: v })} />
                            </div>
                        </div>

                        {/* Emergency lock level badge */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-[rgb(var(--color-border))]">
                            <div className="max-w-md">
                                <p className="text-lg text-[rgb(var(--color-text-primary))] font-bold">Emergency Lock Status</p>
                                <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))] mt-1">
                                    Current active level: <span style={{ color: LOCK_COLORS[config.emergency_lock_level] }} className="font-extrabold text-lg tracking-wider ml-1 uppercase">{LOCK_LABELS[config.emergency_lock_level]}</span>
                                </p>
                            </div>
                            {config.emergency_lock_level > 0 && (
                                <button type="button"
                                    onClick={() => saveConfig({ emergency_lock_level: 0 })}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-sm font-bold text-[rgb(var(--color-text-primary))] hover:bg-gray-100 hover:text-black dark:hover:bg-white dark:hover:text-black transition-colors shadow-sm">
                                    <FiRotateCcw size={16} /> Reset Lock
                                </button>
                            )}
                        </div>

                        {/* Log channel */}
                        <div className="space-y-3 pt-4">
                            <p className="text-lg text-[rgb(var(--color-text-primary))] font-bold">Logging Channel</p>
                            <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">All Dead Hand events and potential nukes will be broadcasted here.</p>
                            <EntityDropdown
                                options={channels.map((ch) => ({ id: ch.id, name: `#${ch.name}`, subtitle: ch.id }))}
                                selectedIds={config.log_channel_id ? [config.log_channel_id] : []}
                                onChange={(values) => saveConfig({ log_channel_id: values[0] || null })}
                                multiple={false}
                                placeholder="No logging channel selected"
                                searchPlaceholder="Search channels"
                            />
                        </div>
                    </div>

                    {/* Module cards */}
                    <div className="space-y-5">
                        <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] pl-2">Protection Modules</h2>
                        {config.modules.map(module => (
                            <ModuleCard
                                key={module.module_name}
                                module={module}
                                guildId={guildId}
                                channels={channels}
                                onChange={updates => {
                                    // Optimistic update
                                    setConfig(prev => prev ? {
                                        ...prev,
                                        modules: prev.modules.map(m => m.module_name === module.module_name ? { ...m, ...updates } : m)
                                    } : prev);
                                    // Persist
                                    void saveModule(module.module_name, updates);
                                }}
                            />
                        ))}
                    </div>

                    {/* Global whitelist */}
                    <div className="rounded-3xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-6 md:p-8 space-y-6 shadow-apple-lg">
                        <div>
                            <h2 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">Global Whitelist</h2>
                            <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))] mt-2">Roles and users whitelisted here are excluded from ALL protections entirely.</p>
                        </div>
                        <div className="space-y-3 pt-2">
                            <p className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Whitelisted Roles</p>
                            <SearchDropdown guildId={guildId} type="role" placeholder="Search roles to whitelist globally…"
                                selected={globalWhitelistRoles}
                                onAdd={r => {
                                    void addGlobalWhitelist(r.id, 'role');
                                    setGlobalWhitelistRoles(prev => [...prev, { id: r.id, name: r.name, color: r.color }]);
                                }}
                                onRemove={id => {
                                    void removeGlobalWhitelist(id);
                                    setGlobalWhitelistRoles(prev => prev.filter(r => r.id !== id));
                                }} />
                        </div>
                        <div className="space-y-3 pt-4">
                            <p className="text-sm font-bold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Whitelisted Users</p>
                            <SearchDropdown guildId={guildId} type="member" placeholder="Search users to whitelist globally…"
                                selected={globalWhitelistUsers}
                                onAdd={r => {
                                    void addGlobalWhitelist(r.id, 'user');
                                    setGlobalWhitelistUsers(prev => [...prev, { id: r.id, name: r.name, avatarUrl: r.avatarUrl }]);
                                }}
                                onRemove={id => {
                                    void removeGlobalWhitelist(id);
                                    setGlobalWhitelistUsers(prev => prev.filter(u => u.id !== id));
                                }} />
                        </div>
                    </div>
                </>
            )}
            
            {/* Bottom Padding */}
            <div className="h-10" />
        </div>
    );
}
