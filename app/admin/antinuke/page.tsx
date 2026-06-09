'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FiShield, FiPlus, FiTrash2, FiSave, FiX, FiCheck,
  FiAlertTriangle, FiUser, FiSearch, FiRefreshCw, FiLock,
  FiEye, FiChevronDown, FiInfo,
} from 'react-icons/fi';
const MAIN_OWNER_ID = '929297205796417597';
const EDITORS = [MAIN_OWNER_ID, '1066281404821930025', '1058043072522489946'];
const ALL_PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: 'MANAGE_PERMISSIONS', label: 'Manage Permission', group: 'Roles' },
];
const PERM_GROUPS = ['Roles'];
const EVENT_TYPE_COLORS: Record<string, string> = {
  BOT_ADD:            'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ROLE_UPDATE:        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ROLE_CREATE:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ROLE_DELETE:        'bg-red-500/20 text-red-300 border-red-500/30',
  CHANNEL_CREATE:     'bg-green-500/20 text-green-300 border-green-500/30',
  CHANNEL_DELETE:     'bg-red-500/20 text-red-300 border-red-500/30',
  CHANNEL_UPDATE:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  WEBHOOK_CREATE:     'bg-teal-500/20 text-teal-300 border-teal-500/30',
  WEBHOOK_DELETE:     'bg-red-500/20 text-red-300 border-red-500/30',
  WEBHOOK_UPDATE:     'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  MEMBER_ROLE_UPDATE: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};
const ACTION_COLORS: Record<string, string> = {
  KICKED_BOT:            'text-green-400',
  REVERTED_ROLE:         'text-green-400',
  DELETED_ROLE:          'text-green-400',
  RESTORED_ROLE:         'text-green-400',
  DELETED_CHANNEL:       'text-green-400',
  RESTORED_CHANNEL:      'text-green-400',
  REVERTED_CHANNEL:      'text-green-400',
  DELETED_WEBHOOK:       'text-green-400',
  REVERTED_MEMBER_ROLES: 'text-green-400',
  ALERT_ONLY:            'text-yellow-400',
};
interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount?: number | null;
}
interface WhitelistEntry {
  id: string;
  userId: string;
  permissions: Record<string, boolean>;
  addedBy: string;
  createdAt: string;
  user?: GuildUser | null;
}
interface AntiNukeLog {
  id: string;
  guild_id: string;
  executor_id: string;
  target_id: string | null;
  event_type: string;
  action_taken: string;
  extra_data: Record<string, unknown> | null;
  timestamp: string;
}
interface GuildUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}
function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200
        ${checked ? 'bg-red-500' : 'bg-gray-600/60'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}
export default function AntiNukePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canEdit = EDITORS.includes(session?.user?.id || '');
  const [guilds, setGuilds]           = useState<GuildInfo[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<GuildInfo | null>(null);
  const [whitelist, setWhitelist]     = useState<WhitelistEntry[]>([]);
  const [logs, setLogs]               = useState<AntiNukeLog[]>([]);
  const [guildUsers, setGuildUsers]   = useState<GuildUser[]>([]);
  const [loadingGuilds, setLoadingGuilds]   = useState(true);
  const [loadingData, setLoadingData]       = useState(false);
  const [loadingLogs, setLoadingLogs]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showInfoModal, setShowInfoModal]     = useState(false);
  const [modalStep, setModalStep]             = useState<'user' | 'permissions'>('user');
  const [addUserId, setAddUserId]             = useState('');
  const [addUserSearch, setAddUserSearch]     = useState('');
  const [addPerms, setAddPerms]               = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false]))
  );
  const [savingAdd, setSavingAdd]             = useState(false);
  const [searchResults, setSearchResults]     = useState<GuildUser[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [selectedSearchUser, setSelectedSearchUser] = useState<GuildUser | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logEventFilter, setLogEventFilter]   = useState('');
  const [logSearch, setLogSearch]             = useState('');
  const [editingEntry, setEditingEntry]       = useState<WhitelistEntry | null>(null);
  const [editPerms, setEditPerms]             = useState<Record<string, boolean>>({});
  const [savingEdit, setSavingEdit]           = useState(false);
  const [activeTab, setActiveTab]             = useState<'whitelist' | 'logs'>('whitelist');
  const [showGuildDropdown, setShowGuildDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };
  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      router.push('/admin/signin');
    }
  }, [status, router]);
  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoadingGuilds(true);
    fetch('/api/antinuke/guilds')
      .then(r => r.json())
      .then(d => setGuilds(Array.isArray(d.guilds) ? d.guilds : []))
      .catch(() => setError('Failed to load guilds.'))
      .finally(() => setLoadingGuilds(false));
  }, [status]);
  const loadGuildData = useCallback(async (guildId: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const [wlRes, ctxRes] = await Promise.all([
        fetch(`/api/antinuke/whitelist?guildId=${guildId}`),
        fetch(`/api/antinuke/guild-context?guildId=${guildId}`),
      ]);
      const [wl, ctx] = await Promise.all([wlRes.json(), ctxRes.json()]);
      setWhitelist(Array.isArray(wl.whitelist) ? wl.whitelist : []);
      setGuildUsers(Array.isArray(ctx.users) ? ctx.users : []);
    } catch {
      setError('Failed to load Anti-Nuke data for this guild.');
    } finally {
      setLoadingData(false);
    }
  }, []);
  const loadLogs = useCallback(async (guildId: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/antinuke/logs?guildId=${guildId}&limit=100`);
      const d = await res.json();
      setLogs(Array.isArray(d.logs) ? d.logs : []);
    } catch {
    } finally {
      setLoadingLogs(false);
    }
  }, []);
  useEffect(() => {
    if (!selectedGuild) return;
    loadGuildData(selectedGuild.id);
    loadLogs(selectedGuild.id);
  }, [selectedGuild, loadGuildData, loadLogs]);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowGuildDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const searchMembers = useCallback(async (query: string) => {
    if (!selectedGuild) return;
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/antinuke/search-users?guildId=${selectedGuild.id}&q=${encodeURIComponent(q)}`);
      const d = await res.json();
      setSearchResults(Array.isArray(d.users) ? d.users : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [selectedGuild]);
  const handleAddUser = async () => {
    if (!selectedGuild) return;
    const userId = addUserId.trim();
    if (!userId) return;
    setSavingAdd(true);
    setError(null);
    try {
      const res = await fetch('/api/antinuke/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: selectedGuild.id, userId, permissions: addPerms }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to add user');
      await loadGuildData(selectedGuild.id);
      setShowAddModal(false);
      setAddUserId('');
      setAddUserSearch('');
      setSearchResults([]);
      setSelectedSearchUser(null);
      setAddPerms(Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false])));
      showSuccess(`User ${userId} added to whitelist.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAdd(false);
    }
  };
  const handleRemoveUser = async (userId: string) => {
    if (!selectedGuild) return;
    setError(null);
    try {
      const res = await fetch('/api/antinuke/whitelist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: selectedGuild.id, userId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to remove user');
      setWhitelist(prev => prev.filter(e => e.userId !== userId));
      if (editingEntry?.userId === userId) setEditingEntry(null);
      showSuccess('User removed from whitelist.');
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleSaveEdit = async () => {
    if (!selectedGuild || !editingEntry) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/antinuke/whitelist/${editingEntry.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: selectedGuild.id, permissions: editPerms }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to save');
      setWhitelist(prev =>
        prev.map(e => e.userId === editingEntry.userId ? { ...e, permissions: editPerms } : e)
      );
      setEditingEntry(null);
      showSuccess('Permissions updated.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logEventFilter && log.event_type !== logEventFilter) return false;
      if (logSearch) {
        const q = logSearch.toLowerCase();
        return (
          log.executor_id.includes(q) ||
          (log.target_id ?? '').includes(q) ||
          log.event_type.toLowerCase().includes(q) ||
          log.action_taken.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, logEventFilter, logSearch]);
  const filteredUsers = useMemo(() => {
    const q = addUserSearch.trim().toLowerCase();
    if (!q) return guildUsers.slice(0, 50);
    return guildUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.id.includes(q)
    ).slice(0, 30);
  }, [guildUsers, addUserSearch]);
  const userMap = useMemo(() => new Map(guildUsers.map(u => [u.id, u])), [guildUsers]);
  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))]">
      {}
      <div className="sticky top-0 z-20 bg-[rgb(var(--color-bg-primary))]/80 backdrop-blur-xl border-b border-[rgb(var(--color-border))]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <FiShield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Anti-Nuke</h1>
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="p-1 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] hover:text-red-400 transition-colors"
                  title="Anti-Nuke Protection Guide"
                  type="button"
                >
                  <FiInfo className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                Server protection & whitelist management
              </p>
            </div>
          </div>
          {}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl
                          bg-amber-500/10 border border-amber-500/20">
            <FiLock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono text-amber-300">Main Owner: {MAIN_OWNER_ID}</span>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {status === 'authenticated' && !canEdit && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <div className="flex-1">
              <span className="font-semibold text-amber-200">View Only Mode:</span> This is view only. Ask main owner to edit the category of antinuke in website.
            </div>
          </div>
        )}
        {}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
            <FiCheck className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
        {}
        <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-6">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-4">
            Select Server
          </h2>
          {loadingGuilds ? (
            <div className="h-12 rounded-xl bg-[rgb(var(--color-bg-tertiary))] animate-pulse" />
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowGuildDropdown(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                           bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))]
                           hover:border-red-500/40 transition-all duration-200 text-left"
              >
                {selectedGuild ? (
                  <>
                    {selectedGuild.icon ? (
                      <Image
                        src={selectedGuild.icon}
                        alt={selectedGuild.name}
                        width={32}
                        height={32}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-red-400">
                          {selectedGuild.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedGuild.name}</p>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))]">{selectedGuild.id}</p>
                    </div>
                  </>
                ) : (
                  <span className="text-[rgb(var(--color-text-tertiary))]">
                    Select a server...
                  </span>
                )}
                <FiChevronDown
                  className={`w-4 h-4 text-[rgb(var(--color-text-tertiary))] ml-auto flex-shrink-0 transition-transform duration-200 ${showGuildDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showGuildDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 z-30
                                bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))]
                                rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                  {guilds.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[rgb(var(--color-text-tertiary))]">
                      No guilds available
                    </div>
                  ) : guilds.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedGuild(g);
                        setShowGuildDropdown(false);
                        setWhitelist([]);
                        setLogs([]);
                        setEditingEntry(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors text-left
                                  ${selectedGuild?.id === g.id ? 'bg-red-500/10' : ''}`}
                    >
                      {g.icon ? (
                        <Image src={g.icon} alt={g.name} width={32} height={32} className="rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-red-400">{g.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{g.name}</p>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">{g.id}</p>
                      </div>
                      {selectedGuild?.id === g.id && <FiCheck className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <FiLock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Main Owner</span>
            </div>
            <p className="font-mono text-sm text-amber-200 break-all">{MAIN_OWNER_ID}</p>
            <p className="text-xs text-amber-400/60 mt-1">Read-only · Always bypassed</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 relative group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiShield className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Protection</span>
              </div>
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                title="Anti-Nuke Protection Guide"
                type="button"
              >
                <FiInfo className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-2xl font-bold text-red-300">Always On</p>
            <p className="text-xs text-red-400/60 mt-1">All events monitored 24/7</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5">
            <div className="flex items-center gap-2 mb-2">
              <FiUser className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Whitelisted</span>
            </div>
            <p className="text-2xl font-bold">{whitelist.length}</p>
            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">
              {selectedGuild ? `in ${selectedGuild.name}` : 'Select a server'}
            </p>
          </div>
        </div>
        {}
        {selectedGuild && (
          <>
            <div className="flex gap-1 p-1 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] w-fit">
              {(['whitelist', 'logs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
                              ${activeTab === tab
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'}`}
                >
                  {tab === 'whitelist' ? 'Whitelisted Users' : 'Incident Logs'}
                </button>
              ))}
            </div>
            {}
            {activeTab === 'whitelist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Whitelisted Users</h2>
                    <button
                      onClick={() => setShowInfoModal(true)}
                      className="p-1 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] hover:text-red-400 transition-colors"
                      title="Learn how whitelisting works"
                      type="button"
                    >
                      <FiInfo className="w-4 h-4" />
                    </button>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setAddPerms(Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false])));
                        setAddUserId('');
                        setAddUserSearch('');
                        setSearchResults([]);
                        setSelectedSearchUser(null);
                        setModalStep('user');
                        setShowAddModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl
                                 bg-red-500 hover:bg-red-400 text-white text-sm font-medium
                                 transition-all duration-200 shadow-lg shadow-red-500/20"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add User
                    </button>
                  )}
                </div>
                {loadingData ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 rounded-xl bg-[rgb(var(--color-bg-secondary))] animate-pulse" />
                    ))}
                  </div>
                ) : whitelist.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgb(var(--color-border))]
                                  bg-[rgb(var(--color-bg-secondary))] p-12 text-center">
                    <FiShield className="w-10 h-10 mx-auto text-[rgb(var(--color-text-tertiary))] mb-3" />
                    <p className="text-[rgb(var(--color-text-secondary))] font-medium">No whitelisted users</p>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))] mt-1">
                      Only the Main Owner can perform protected actions. Add users to grant partial access.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {whitelist.map(entry => {
                      const user = entry.user || userMap.get(entry.userId);
                      const grantedCount = Object.values(entry.permissions).filter(Boolean).length;
                      const isEditing = editingEntry?.userId === entry.userId;
                      return (
                        <div
                          key={entry.userId}
                          className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] overflow-hidden"
                        >
                          {}
                          <div className="flex items-center gap-3 px-5 py-4">
                            {user?.avatar ? (
                              <Image
                                src={user.avatar}
                                alt={user.name}
                                width={40}
                                height={40}
                                className="rounded-full flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[rgb(var(--color-bg-tertiary))] flex items-center justify-center flex-shrink-0">
                                <FiUser className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {user?.name || entry.userId}
                              </p>
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">
                                {entry.userId} · {grantedCount} permissions
                              </p>
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingEntry(null);
                                    } else {
                                      setEditingEntry(entry);
                                      setEditPerms({ ...entry.permissions });
                                    }
                                  }}
                                  className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                                >
                                  <FiEye className="w-4 h-4 text-[rgb(var(--color-text-secondary))]" />
                                </button>
                                <button
                                  onClick={() => handleRemoveUser(entry.userId)}
                                  className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {}
                          {!isEditing && (
                            <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                              {ALL_PERMISSIONS.filter(p => entry.permissions[p.key]).map(p => (
                                <span
                                  key={p.key}
                                  className="px-2 py-0.5 rounded-md text-xs font-medium
                                             bg-red-500/15 text-red-300 border border-red-500/20"
                                >
                                  {p.label}
                                </span>
                              ))}
                              {grantedCount === 0 && (
                                <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                  No permissions granted
                                </span>
                              )}
                            </div>
                          )}
                          {}
                          {isEditing && (
                            <div className="border-t border-[rgb(var(--color-border))] px-5 py-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {PERM_GROUPS.map(group => (
                                  <div key={group}>
                                    <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-2">
                                      {group}
                                    </p>
                                    <div className="space-y-2">
                                      {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => (
                                        <div key={perm.key} className="flex items-center justify-between gap-2">
                                          <span className="text-sm text-[rgb(var(--color-text-secondary))]">{perm.label}</span>
                                          <ToggleSwitch
                                            checked={Boolean(editPerms[perm.key])}
                                            onChange={v => setEditPerms(prev => ({ ...prev, [perm.key]: v }))}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--color-border))]">
                                <button
                                  onClick={() => setEditingEntry(null)}
                                  className="px-4 py-2 rounded-xl text-sm text-[rgb(var(--color-text-secondary))]
                                             hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={savingEdit}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400
                                             text-white text-sm font-medium transition-all duration-200 disabled:opacity-50"
                                >
                                  {savingEdit ? (
                                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FiSave className="w-4 h-4" />
                                  )}
                                  Save
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <h2 className="text-base font-semibold">Incident Logs</h2>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    {}
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                      <input
                        type="text"
                        placeholder="Search by ID..."
                        value={logSearch}
                        onChange={e => setLogSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))]
                                   text-sm focus:outline-none focus:border-red-500/40 w-44"
                      />
                    </div>
                    {}
                    <select
                      value={logEventFilter}
                      onChange={e => setLogEventFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))]
                                 text-sm focus:outline-none focus:border-red-500/40"
                    >
                      <option value="">All Events</option>
                      {Object.keys(EVENT_TYPE_COLORS).map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    {}
                    <button
                      onClick={() => selectedGuild && loadLogs(selectedGuild.id)}
                      disabled={loadingLogs}
                      className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors disabled:opacity-50"
                    >
                      <FiRefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                {loadingLogs ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-[rgb(var(--color-bg-secondary))] animate-pulse" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgb(var(--color-border))]
                                  bg-[rgb(var(--color-bg-secondary))] p-12 text-center">
                    <FiEye className="w-10 h-10 mx-auto text-[rgb(var(--color-text-tertiary))] mb-3" />
                    <p className="text-[rgb(var(--color-text-secondary))] font-medium">No incidents recorded</p>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))] mt-1">
                      Anti-nuke actions will appear here as they occur.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[rgb(var(--color-border))]">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Event</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Executor</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Target</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Action Taken</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--color-border))]">
                          {filteredLogs.map(log => {
                            const executor = (log as any).executorUser || userMap.get(log.executor_id);
                            const target = (log as any).targetUser || (log.target_id ? userMap.get(log.target_id) : null);
                            return (
                              <tr key={log.id} className="hover:bg-[rgb(var(--color-bg-tertiary))]/50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
                                                    ${EVENT_TYPE_COLORS[log.event_type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                                    {log.event_type.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {executor?.avatar && (
                                      <Image
                                        src={executor.avatar}
                                        alt={executor.name}
                                        width={20}
                                        height={20}
                                        className="rounded-full"
                                      />
                                    )}
                                    <span className="text-sm font-mono text-[rgb(var(--color-text-secondary))]">
                                      {executor?.name || log.executor_id}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm font-mono text-[rgb(var(--color-text-tertiary))]">
                                    {log.target_id ? (
                                      target?.name || log.target_id
                                    ) : (
                                      <span className="text-[rgb(var(--color-text-tertiary))]">—</span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-sm font-medium ${ACTION_COLORS[log.action_taken] || 'text-[rgb(var(--color-text-secondary))]'}`}>
                                    {log.action_taken.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-[rgb(var(--color-text-tertiary))]" title={new Date(log.timestamp).toLocaleString()}>
                                    {formatRelativeTime(log.timestamp)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {}
        {!selectedGuild && !loadingGuilds && (
          <div className="rounded-2xl border border-dashed border-[rgb(var(--color-border))]
                          bg-[rgb(var(--color-bg-secondary))] p-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20
                            flex items-center justify-center mb-4">
              <FiShield className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Select a Server</h3>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))] max-w-sm mx-auto">
              Choose a server from the dropdown above to manage Anti-Nuke settings,
              whitelisted users, and view incident logs.
            </p>
          </div>
        )}
      </div>
      {}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))]
                          shadow-2xl w-full max-w-xl flex flex-col"
               style={{ maxHeight: '85vh' }}>
            {}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--color-border))] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <FiPlus className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {modalStep === 'user' ? 'Step 1 — Select User' : 'Step 2 — Set Permissions'}
                  </h3>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                    {modalStep === 'user'
                      ? 'Search or enter a user ID to whitelist'
                      : `Granting bypass permissions to ${userMap.get(addUserId)?.name ?? addUserId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:text-red-400 transition-colors mr-1"
                  title="View system whitelist rules explanation"
                  type="button"
                >
                  <FiInfo className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 mr-2">
                  <div className={`w-2 h-2 rounded-full ${modalStep === 'user' ? 'bg-red-400' : 'bg-[rgb(var(--color-text-tertiary))]'}`} />
                  <div className={`w-2 h-2 rounded-full ${modalStep === 'permissions' ? 'bg-red-400' : 'bg-[rgb(var(--color-text-tertiary))]'}`} />
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
            {}
            {modalStep === 'user' && (
              <>
                {}
                <div className="p-4 border-b border-[rgb(var(--color-border))] flex-shrink-0">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                    {searchLoading && (
                      <FiRefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-tertiary))] animate-spin" />
                    )}
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search by name, username or ID..."
                      value={addUserSearch}
                      onChange={e => {
                        const val = e.target.value;
                        setAddUserSearch(val);
                        setSelectedSearchUser(null);
                        setAddUserId('');
                        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                        searchDebounceRef.current = setTimeout(() => {
                          searchMembers(val);
                        }, 350);
                      }}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))]
                                 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                    />
                  </div>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2 ml-1">
                    {!addUserSearch.trim()
                      ? 'Start typing to search all server members & bots'
                      : searchLoading
                        ? 'Searching...'
                        : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {}
                {selectedSearchUser && (
                  <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0">
                    <Image src={selectedSearchUser.avatar} alt={selectedSearchUser.name} width={24} height={24} className="rounded-full" />
                    <span className="text-sm font-medium text-red-300 flex-1 truncate">{selectedSearchUser.name}</span>
                    <span className="text-xs font-mono text-red-400/70">{selectedSearchUser.id}</span>
                    <button onClick={() => { setSelectedSearchUser(null); setAddUserId(''); setAddUserSearch(''); setSearchResults([]); }}
                      className="ml-1 text-red-400 hover:text-red-300 transition-colors">
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {}
                <div className="overflow-y-auto flex-1">
                  {!addUserSearch.trim() ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-[rgb(var(--color-text-tertiary))]">
                      <FiSearch className="w-8 h-8 opacity-20" />
                      <p className="text-sm">Type a name to search members</p>
                    </div>
                  ) : searchLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[rgb(var(--color-text-tertiary))]">
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      <span>Searching members...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-[rgb(var(--color-text-tertiary))]">
                      <FiUser className="w-7 h-7 opacity-20" />
                      <p className="text-sm">No members found for &quot;{addUserSearch}&quot;</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {searchResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedSearchUser(u);
                            setAddUserId(u.id);
                            setAddUserSearch('');
                            setSearchResults([]);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors text-left
                                      ${addUserId === u.id ? 'bg-red-500/10 border-l-2 border-red-500' : ''}`}
                        >
                          <Image src={u.avatar} alt={u.name} width={32} height={32} className="rounded-full flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono truncate">
                              @{u.username} · {u.id}{(u as any).isBot ? ' · 🤖 Bot' : ''}
                            </p>
                          </div>
                          {addUserId === u.id && <FiCheck className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {}
                <div className="px-4 py-3 border-t border-[rgb(var(--color-border))] flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Or paste User ID manually (e.g. 929297205796417597)"
                    value={!selectedSearchUser ? addUserId : ''}
                    onChange={e => {
                      const val = e.target.value.trim();
                      if (/^\d*$/.test(val)) {
                        setAddUserId(val);
                        setSelectedSearchUser(null);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))]
                               text-xs font-mono focus:outline-none focus:border-red-500/50 transition-colors
                               placeholder:text-[rgb(var(--color-text-tertiary))]"
                  />
                </div>
                {}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[rgb(var(--color-border))] flex-shrink-0">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-sm text-[rgb(var(--color-text-secondary))]
                               hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!addUserId || !/^\d{17,20}$/.test(addUserId)}
                    onClick={() => setModalStep('permissions')}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400
                               text-white text-sm font-medium transition-all duration-200
                               disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                  >
                    Next — Set Permissions
                    <FiCheck className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            {}
            {modalStep === 'permissions' && (
              <>
                {}
                {(() => {
                  const u = selectedSearchUser || userMap.get(addUserId);
                  return (
                    <div className="flex items-center gap-3 px-5 py-3 bg-red-500/5 border-b border-[rgb(var(--color-border))] flex-shrink-0">
                      {u ? (
                        <Image src={u.avatar} alt={u.name} width={36} height={36} className="rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[rgb(var(--color-bg-tertiary))] flex items-center justify-center flex-shrink-0">
                          <FiUser className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u?.name ?? 'Unknown User'}</p>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">{addUserId}</p>
                      </div>
                      <button
                        onClick={() => setModalStep('user')}
                        className="text-xs px-2 py-1 rounded-lg bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))]
                                   hover:bg-[rgb(var(--color-bg-primary))] transition-colors flex-shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  );
                })()}
                {}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider">
                      Permissions
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddPerms(Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true])))}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Grant All
                      </button>
                      <button
                        onClick={() => setAddPerms(Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, false])))}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))]
                                   hover:bg-[rgb(var(--color-bg-primary))] transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PERM_GROUPS.map(group => (
                      <div key={group} className="rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] p-3.5">
                        <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-3">{group}</p>
                        <div className="space-y-2.5">
                          {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => (
                            <div key={perm.key} className="flex items-center justify-between gap-2">
                              <span className="text-sm text-[rgb(var(--color-text-secondary))]">{perm.label}</span>
                              <ToggleSwitch
                                checked={Boolean(addPerms[perm.key])}
                                onChange={v => setAddPerms(prev => ({ ...prev, [perm.key]: v }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[rgb(var(--color-border))] flex-shrink-0">
                  <button
                    onClick={() => setModalStep('user')}
                    className="px-4 py-2 rounded-xl text-sm text-[rgb(var(--color-text-secondary))]
                               hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors flex items-center gap-2"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleAddUser}
                    disabled={!addUserId || savingAdd}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400
                               text-white text-sm font-medium transition-all duration-200
                               disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                  >
                    {savingAdd ? (
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiPlus className="w-4 h-4" />
                    )}
                    Add to Whitelist
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 ease-out animate-fade-in"
            onClick={() => setShowInfoModal(false)}
          />
          <div className="relative bg-[rgb(var(--color-bg-secondary))] rounded-3xl border border-[rgb(var(--color-border))]
                          shadow-2xl w-full max-w-4xl flex flex-col p-6 md:p-8 space-y-6 text-sm animate-scale-in"
               style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <FiShield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[rgb(var(--color-text-primary))]">Anti-Nuke Protection Guide</h3>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                    Detailed system behavior, bypass rules, and FAQs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-2 rounded-xl hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto flex-1 pr-2 font-sans text-[rgb(var(--color-text-secondary))] leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Hardcoded Users */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                      👥 Hardcoded Users (System Admin)
                    </h4>
                    <div className="text-xs space-y-2">
                      <p>For absolute security, the core editors are hardcoded in the application code and cannot be added or deleted dynamically via the database:</p>
                      <ul className="list-disc list-inside space-y-2 bg-[rgb(var(--color-bg-primary))]/45 p-3 rounded-xl border border-[rgb(var(--color-border))] font-mono text-[11px]">
                        <li>
                          <strong className="text-amber-400">Main Owner:</strong> 929297205796417597
                          <span className="block text-[10px] pl-4 text-[rgb(var(--color-text-tertiary))] mt-0.5">Has absolute system bypass. The only user allowed to invite new bots and modify database tables directly.</span>
                        </li>
                        <li className="border-t border-[rgb(var(--color-border))]/50 pt-2">
                          <strong className="text-red-400">Web Editors:</strong> 1066281404821930025, 1058043072522489946
                          <span className="block text-[10px] pl-4 text-[rgb(var(--color-text-tertiary))] mt-0.5">Authorized to log in, write/edit whitelist options, and manage configurations on this website panel.</span>
                        </li>
                      </ul>
                      <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] italic">
                        Other administrators can view the dashboard in Read-Only mode, but cannot make configuration changes.
                      </p>
                    </div>
                  </div>

                  {/* Whitelisting & Bypass Logic */}
                  <div className="space-y-2 bg-[rgb(var(--color-bg-primary))]/40 border border-[rgb(var(--color-border))] rounded-2xl p-4">
                    <h4 className="font-semibold text-red-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                      🔑 Whitelisting & Bypass Logic
                    </h4>
                    <div className="text-xs space-y-2">
                      <p>
                        Whitelisting grants bypass status for monitored actions. The whitelist uses a single consolidated permission toggle:
                      </p>
                      <p className="bg-[rgb(var(--color-bg-secondary))] px-3 py-2 rounded-lg border border-[rgb(var(--color-border))] font-semibold text-center text-red-400">
                        ⚡ Manage Permission
                      </p>
                      <p className="text-[11px] text-[rgb(var(--color-text-tertiary))]">
                        Users or bots whitelisted with <strong>Manage Permission</strong> can create or update roles containing dangerous permissions, and assign dangerous roles to server members without being reverted.
                      </p>
                      <p className="text-[11px] text-red-300 font-semibold mt-2">
                        🤖 Automatic Bot Kick:
                      </p>
                      <p className="text-[11px] text-[rgb(var(--color-text-tertiary))]">
                        To prevent malicious integration add-ons, only bots invited directly by the <strong>Main Owner</strong> are allowed. Any bot added by another admin is instantly kicked, even if that admin is whitelisted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Monitored Actions */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                      🛡️ Monitored Actions (Bypass Required)
                    </h4>
                    <p className="text-xs">
                      Only highly sensitive, potentially destructive actions are monitored by the Anti-Nuke bot. If a non-whitelisted user executes these, the bot immediately reverts the action:
                    </p>
                    <ul className="list-disc list-inside text-xs pl-2 space-y-2 bg-[rgb(var(--color-bg-primary))]/40 p-3 rounded-2xl border border-[rgb(var(--color-border))]">
                      <li>
                        <strong className="text-[rgb(var(--color-text-primary))]">Role Permission Modifications:</strong>
                        <span className="block text-[11px] pl-4 text-[rgb(var(--color-text-tertiary))]">Updating any role to grant dangerous permissions (Administrator, Manage Guild, Manage Roles, Kick Members, Ban Members, Manage Webhooks, etc.).</span>
                      </li>
                      <li>
                        <strong className="text-[rgb(var(--color-text-primary))]">Dangerous Member Role Updates:</strong>
                        <span className="block text-[11px] pl-4 text-[rgb(var(--color-text-tertiary))]">Assigning any role that possesses dangerous permissions to a server member.</span>
                      </li>
                    </ul>
                  </div>

                  {/* What is Ignored */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                      🚫 What is Ignored in Anti-Nuke
                    </h4>
                    <p className="text-xs">
                      The system does not monitor or revert modifications to the following features (they can be modified freely by standard server admins):
                    </p>
                    <ul className="list-disc list-inside text-xs pl-2 space-y-1 bg-[rgb(var(--color-bg-primary))]/40 p-3 rounded-2xl border border-[rgb(var(--color-border))]">
                      <li><strong>Channels & Categories:</strong> Creation, deletion, updates, or permission overrides on channels/categories are ignored.</li>
                      <li><strong>Webhooks:</strong> Creating, deleting, or updating Discord webhooks will not be blocked or reverted.</li>
                      <li><strong>Roles Creation/Deletion:</strong> Standard role creation and role deletion events are ignored.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Full Width Bottom: FAQs */}
              <div className="space-y-4 pt-6 border-t border-[rgb(var(--color-border))]">
                <h4 className="font-semibold text-red-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                  ❓ Frequently Asked Questions (FAQ)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[rgb(var(--color-bg-primary))]/30 p-3.5 rounded-xl border border-[rgb(var(--color-border))]/60">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))]">Q: Which actions need a whitelist and which don't?</p>
                    <p className="text-[11px] text-[rgb(var(--color-text-secondary))] mt-1">
                      A: <strong>Need Whitelist:</strong> Adding admin/mod permissions to any role, or assigning an admin/mod role to someone.
                      <br className="mb-1" />
                      <strong>Do NOT Need Whitelist:</strong> Modifying channels, deleting channels/categories, creating standard roles, and assigning standard roles.
                    </p>
                  </div>
                  <div className="bg-[rgb(var(--color-bg-primary))]/30 p-3.5 rounded-xl border border-[rgb(var(--color-border))]/60">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))]">Q: Who are the hardcoded users and can we change them?</p>
                    <p className="text-[11px] text-[rgb(var(--color-text-secondary))] mt-1">A: The Main Owner (929297205796417597) and Web Editors (1066281404821930025, 1058043072522489946) are hardcoded directly in the codebase for maximum security against database manipulation.</p>
                  </div>
                  <div className="bg-[rgb(var(--color-bg-primary))]/30 p-3.5 rounded-xl border border-[rgb(var(--color-border))]/60">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))]">Q: How does the bot revert unauthorized changes?</p>
                    <p className="text-[11px] text-[rgb(var(--color-text-secondary))] mt-1">A: When a role update is detected, the bot checks the executor. If unauthorized, the bot removes the dangerous permissions or strips the role from the member, restoring original security status.</p>
                  </div>
                  <div className="bg-[rgb(var(--color-bg-primary))]/30 p-3.5 rounded-xl border border-[rgb(var(--color-border))]/60">
                    <p className="font-semibold text-[rgb(var(--color-text-primary))]">Q: Can whitelisted users invite helper bots?</p>
                    <p className="text-[11px] text-[rgb(var(--color-text-secondary))] mt-1">A: No. Any bot added by a user other than the Main Owner is immediately kicked to prevent rogue bots from bypassing permissions.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end border-t border-[rgb(var(--color-border))] pt-4 flex-shrink-0">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-medium transition-all duration-200"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}