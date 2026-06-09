'use client';
import EntityDropdown from '@/components/ui/entity-dropdown';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect,useMemo,useRef,useState } from 'react';
import {
FiCheck,
FiChevronLeft,
FiList,
FiPlus,
FiSave,
FiSettings,
FiShield,
FiTrash2,
FiX,
} from 'react-icons/fi';
type RuleModalMode = 'create' | 'edit';
type RuleType =
  | 'bad_words'
  | 'caps'
  | 'emoji_spam'
  | 'fast_spam'
  | 'links'
  | 'mention_spam'
  | 'zalgo'
  | 'spoiler'
  | 'newline_spam'
  | 'character_limit'
  | 'sticker_spam'
  | 'image_spam'
  | 'phishing';
interface AutoModConfig {
  enabled: boolean;
  ignore_admins: boolean;
  stop_on_trigger: boolean;
  log_channel_id: string | null;
  ignored_roles: string[];
  ignored_users?: string[];
  ignored_channels: string[];
}
interface AutoModRule {
  id: string;
  guild_id?: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  priority: number;
  stop_on_trigger: boolean;
  settings: Record<string, unknown>;
  actions: {
    delete?: boolean;
    mute?: boolean;
    kick?: boolean;
    ban?: boolean;
    warn?: boolean;
    muteDurationMs?: number;
    muteDurationMinutes?: number;
    [key: string]: unknown;
  };
}
interface GuildInfo {
  id: string;
  name: string;
  icon?: string | null;
  description?: string;
}
interface NamedRole {
  id: string;
  name: string;
  color?: string | null;
}
interface NamedChannel {
  id: string;
  name: string;
}
interface NamedUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string | null;
}
const RULE_TYPES: RuleType[] = [
  'bad_words',
  'caps',
  'emoji_spam',
  'fast_spam',
  'links',
  'mention_spam',
  'zalgo',
  'spoiler',
  'newline_spam',
  'character_limit',
  'sticker_spam',
  'image_spam',
  'phishing',
];
const RULE_TYPE_LABELS: Record<RuleType, string> = {
  bad_words: 'Bad Words',
  caps: 'Caps Spam',
  emoji_spam: 'Emoji Spam',
  fast_spam: 'Message Spaming',
  links: 'Invite Links',
  mention_spam: 'Mention Spam',
  zalgo: 'Zalgo',
  spoiler: 'Spoiler',
  newline_spam: 'Newline Spam',
  character_limit: 'Character Limit',
  sticker_spam: 'Sticker Spam',
  image_spam: 'Image Spam',
  phishing: 'Phishing',
};
const RULE_TYPE_HELP: Record<RuleType, string[]> = {
  bad_words: [
    'Scans messages for blocked words and phrases before they spread in chat.',
    'Use wildcard words for partial matches and exact words for strict whole-word checks.',
    'Great for filtering slurs, harassment, and repeated toxic patterns.',
  ],
  caps: [
    'Stops messages that are shouting with excessive uppercase letters.',
    'Use the percentage slider to tune how strict this rule should be.',
    'Helps keep conversations readable without over-moderating normal emphasis.',
  ],
  emoji_spam: [
    'Limits how many emoji can be sent in a single message.',
    'Useful for reducing visual spam and keeping channels clean.',
    'Set a comfortable value so regular reactions still feel natural.',
  ],
  fast_spam: [
    'Tracks how many messages are sent in a short time window.',
    'Each message is counted, including single-emoji messages.',
    'Use this to catch flood spam and rapid chat disruption.',
  ],
  links: [
    'Protects your server from unapproved Discord invite links.',
    'Only invites from your allowlist are permitted.',
    'Use this to keep promotions and redirects limited to trusted servers.',
  ],
  mention_spam: [
    'Limits how many user mentions can appear in one message.',
    'Prevents ping abuse and mass-mention harassment in active channels.',
    'Set a limit that allows normal conversation while blocking abuse.',
  ],
  zalgo: [
    'Detects excessive combining characters used in distorted text.',
    'Helps stop unreadable or disruptive zalgo-style messages.',
    'Example: z̵̿a̴͠l̶͋ǵ̷o̴̿ text with many stacked marks.',
  ],
  spoiler: [
    'Detects hidden spoiler formatting in messages.',
    'Useful when you want to prevent concealed text or bait content.',
    'Example: ||this is hidden spoiler text||',
  ],
  newline_spam: [
    'Detects stacked line breaks used to flood vertical space.',
    'Set the maximum newlines allowed in one message.',
    'Keeps chat compact and prevents long empty-message spam.',
  ],
  character_limit: [
    'Restricts message length when posts are too long for your channel style.',
    'Set a maximum character count that fits your community.',
    'Useful for high-traffic channels where short readable messages are preferred.',
  ],
  sticker_spam: [
    'Limits how many stickers can be posted in one message.',
    'Prevents sticker floods that drown normal conversation.',
    'Pick a limit that supports fun usage without spam bursts.',
  ],
  image_spam: [
    'Limits how many images can be attached in one message.',
    'Reduces media flood and keeps moderation workload manageable.',
    'Best used in channels where image spam is common.',
  ],
  phishing: [
    'Scans for suspicious or known phishing domains.',
    'Helps prevent credential theft and scam links in your community.',
    'Use with logging enabled so staff can review incidents quickly.',
  ],
};
type RuleActionPreset =
  | 'delete'
  | 'warn'
  | 'mute'
  | 'delete_warn'
  | 'delete_mute'
  | 'delete_warn_mute';
const ACTION_PRESET_LABELS: Record<RuleActionPreset, string> = {
  delete: 'Delete',
  warn: 'Warn',
  mute: 'Mute',
  delete_warn: 'Delete and Warn',
  delete_mute: 'Delete and Mute',
  delete_warn_mute: 'Delete, Warn and Mute',
};
function actionPresetToActions(
  preset: RuleActionPreset,
  muteDurationMinutes = 10
): AutoModRule['actions'] {
  const safeMinutes = Math.min(40320, Math.max(1, Math.floor(Number.isFinite(muteDurationMinutes) ? muteDurationMinutes : 10)));
  const muteDurationMs = safeMinutes * 60 * 1000;
  switch (preset) {
    case 'warn':
      return { delete: false, warn: true, mute: false, kick: false, ban: false };
    case 'mute':
      return { delete: false, warn: false, mute: true, muteDurationMinutes: safeMinutes, muteDurationMs, kick: false, ban: false };
    case 'delete_warn':
      return { delete: true, warn: true, mute: false, kick: false, ban: false };
    case 'delete_mute':
      return { delete: true, warn: false, mute: true, muteDurationMinutes: safeMinutes, muteDurationMs, kick: false, ban: false };
    case 'delete_warn_mute':
      return { delete: true, warn: true, mute: true, muteDurationMinutes: safeMinutes, muteDurationMs, kick: false, ban: false };
    case 'delete':
    default:
      return { delete: true, warn: false, mute: false, kick: false, ban: false };
  }
}
function actionPresetIncludesMute(preset: RuleActionPreset): boolean {
  return preset === 'mute' || preset === 'delete_mute' || preset === 'delete_warn_mute';
}
function muteDurationMinutesFromActions(actions?: AutoModRule['actions']): number {
  const minutes = Number(actions?.muteDurationMinutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    return Math.min(40320, Math.max(1, Math.floor(minutes)));
  }
  const ms = Number(actions?.muteDurationMs);
  if (!Number.isFinite(ms) || ms <= 0) return 10;
  return Math.min(40320, Math.max(1, Math.floor(ms / 60000)));
}
function actionsToPreset(actions: AutoModRule['actions']): RuleActionPreset {
  const hasDelete = Boolean(actions?.delete);
  const hasWarn = Boolean(actions?.warn);
  const hasMute = Boolean(actions?.mute);
  if (hasDelete && hasWarn && hasMute) return 'delete_warn_mute';
  if (hasDelete && hasWarn) return 'delete_warn';
  if (hasDelete && hasMute) return 'delete_mute';
  if (hasWarn) return 'warn';
  if (hasMute) return 'mute';
  return 'delete';
}
function withSharedSettings(settings: Record<string, unknown>): Record<string, unknown> {
  return {
    ...settings,
    whitelistRoleIds: Array.isArray(settings.whitelistRoleIds) ? settings.whitelistRoleIds : [],
    whitelistUserIds: Array.isArray(settings.whitelistUserIds) ? settings.whitelistUserIds : [],
    whitelistChannelIds: Array.isArray(settings.whitelistChannelIds) ? settings.whitelistChannelIds : [],
    logChannelId: typeof settings.logChannelId === 'string' ? settings.logChannelId : '',
  };
}
function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}
function defaultSettings(type: RuleType): Record<string, unknown> {
  switch (type) {
    case 'bad_words':
      return withSharedSettings({ wildcardWords: [], exactWords: [], regex: false });
    case 'caps':
      return withSharedSettings({ minLength: 12, maxCapsPercent: 70 });
    case 'emoji_spam':
      return withSharedSettings({ maxEmojis: 8 });
    case 'fast_spam':
      return withSharedSettings({ windowSeconds: 5, limit: 5 });
    case 'links':
      return withSharedSettings({
        allowlist: [],
      });
    case 'mention_spam':
      return withSharedSettings({ maxMentions: 5 });
    case 'zalgo':
      return withSharedSettings({ maxCombiningChars: 12 });
    case 'spoiler':
      return withSharedSettings({});
    case 'newline_spam':
      return withSharedSettings({ max: 10 });
    case 'character_limit':
      return withSharedSettings({ max: 2000 });
    case 'sticker_spam':
      return withSharedSettings({ maxStickers: 3 });
    case 'image_spam':
      return withSharedSettings({ maxImages: 4 });
    case 'phishing':
      return withSharedSettings({ blockedDomains: [], detectShorteners: true });
    default:
      return {};
  }
}
function normalizeSettings(type: RuleType, settings?: Record<string, unknown>): Record<string, unknown> {
  const base = defaultSettings(type);
  const current = settings || {};
  switch (type) {
    case 'bad_words':
      return withSharedSettings({
        wildcardWords: Array.isArray(current.wildcardWords)
          ? current.wildcardWords
          : Array.isArray(current.words) && !toBoolean(current.exactMatch, false)
            ? current.words
            : [],
        exactWords: Array.isArray(current.exactWords)
          ? current.exactWords
          : Array.isArray(current.words) && toBoolean(current.exactMatch, false)
            ? current.words
            : [],
        regex: toBoolean(current.regex, false),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'caps':
      return withSharedSettings({
        minLength: toNumber(current.minLength, 12),
        maxCapsPercent: toNumber(current.maxCapsPercent, 70),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'emoji_spam':
      return withSharedSettings({
        maxEmojis: toNumber(current.maxEmojis, 8),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'fast_spam':
      return withSharedSettings({
        windowSeconds: toNumber(current.windowSeconds, toNumber(current.intervalMs, 5000) / 1000 || 5),
        limit: toNumber(current.limit, toNumber(current.maxMessages, 5)),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'links':
      return withSharedSettings({
        allowlist: Array.isArray(current.allowlist)
          ? current.allowlist
          : Array.isArray(current.domains)
            ? current.domains
            : [],
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'mention_spam':
      return withSharedSettings({
        maxMentions: toNumber(current.maxMentions, 5),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'zalgo':
      return withSharedSettings({
        maxCombiningChars: toNumber(current.maxCombiningChars, 12),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'spoiler':
      return withSharedSettings({
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'newline_spam':
      return withSharedSettings({
        max: toNumber(current.max, toNumber(current.maxNewlines, 10)),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'character_limit':
      return withSharedSettings({
        max: toNumber(current.max, toNumber(current.maxCharacters, 2000)),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'sticker_spam':
      return withSharedSettings({
        maxStickers: toNumber(current.maxStickers, 3),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'image_spam':
      return withSharedSettings({
        maxImages: toNumber(current.maxImages, 4),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    case 'phishing':
      return withSharedSettings({
        blockedDomains: Array.isArray(current.blockedDomains) ? current.blockedDomains : [],
        detectShorteners: toBoolean(current.detectShorteners, true),
        whitelistRoleIds: current.whitelistRoleIds,
        whitelistUserIds: current.whitelistUserIds,
        whitelistChannelIds: current.whitelistChannelIds,
        logChannelId: current.logChannelId,
      });
    default:
      return base;
  }
}
function listToText(value: unknown): string {
  return Array.isArray(value) ? value.map((v) => String(v)).join('\n') : '';
}
function textToList(value: string): string[] {
  return value
    .split(/[\n,]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
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
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200
        ${checked ? 'bg-emerald-500' : 'bg-gray-400/60'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110 active:scale-[0.98]'}
      `}
      aria-pressed={checked}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}
function MultiCheckDropdown({
  label,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; name: string; color?: string | null; avatar?: string | null; username?: string }>;
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">{label}</p>
      <EntityDropdown
        className="mt-2"
        options={options.map((opt) => ({
          id: opt.id,
          name: opt.name,
          subtitle: opt.username && opt.username !== opt.name ? `@${opt.username}` : undefined,
          avatarUrl: opt.avatar || null,
          color: opt.color || null,
        }))}
        selectedIds={selectedIds}
        onChange={onChange}
        multiple
        placeholder={`Select ${label.toLowerCase()}`}
        searchPlaceholder="Search by name or id"
      />
    </div>
  );
}
function SelectedReadonly({
  label,
  selectedIds,
  options,
}: {
  label: string;
  selectedIds: string[];
  options: Array<{ id: string; name: string }>;
}) {
  const map = new Map(options.map((x) => [x.id, x.name]));
  const text = selectedIds.map((id) => `${map.get(id) || id} (${id})`).join('\n');
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] mb-2">Selected {label}</p>
      <textarea
        readOnly
        value={text}
        placeholder={`No ${label.toLowerCase()} selected`}
        className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm min-h-[88px]"
      />
    </div>
  );
}
export default function AutoModPage() {
  const { status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<AutoModConfig>({
    enabled: false,
    ignore_admins: true,
    stop_on_trigger: true,
    log_channel_id: null,
    ignored_roles: [],
    ignored_users: [],
    ignored_channels: [],
  });
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [roles, setRoles] = useState<NamedRole[]>([]);
  const [users, setUsers] = useState<NamedUser[]>([]);
  const [channels, setChannels] = useState<NamedChannel[]>([]);
  const [rules, setRules] = useState<AutoModRule[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingGuildData, setLoadingGuildData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ruleModalMode, setRuleModalMode] = useState<RuleModalMode>('create');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const guildContextCacheRef = useRef(new Map<string, { roles: NamedRole[]; users: NamedUser[]; channels: NamedChannel[] }>());
  const [newRuleDraft, setNewRuleDraft] = useState<{
    name: string;
    type: RuleType | '';
    enabled: boolean;
    priority: number;
    stop_on_trigger: boolean;
    settings: Record<string, unknown>;
    actionPreset: RuleActionPreset;
    muteDurationMinutes: number;
  }>({
    name: '',
    type: '',
    enabled: true,
    priority: 100,
    stop_on_trigger: true,
    settings: {},
    actionPreset: 'delete_warn',
    muteDurationMinutes: 10,
  });
  const selectedGuild = useMemo(
    () => guilds.find((g) => g.id === selectedGuildId) || null,
    [guilds, selectedGuildId]
  );
  const globalRoleWhitelistIds = useMemo(
    () => config.ignored_roles,
    [config.ignored_roles]
  );
  const globalUserWhitelistIds = useMemo(
    () => (Array.isArray(config.ignored_users) ? config.ignored_users : []),
    [config.ignored_users]
  );
  const ruleTypeOptions = useMemo(
    () => RULE_TYPES.map((type) => ({ id: type, name: RULE_TYPE_LABELS[type] })),
    []
  );
  const actionPresetOptions = useMemo(
    () => (Object.keys(ACTION_PRESET_LABELS) as RuleActionPreset[]).map((preset) => ({ id: preset, name: ACTION_PRESET_LABELS[preset] })),
    []
  );
  const setGlobalRoleWhitelistIds = (roleIds: string[]) => {
    setConfig((prev) => ({ ...prev, ignored_roles: roleIds }));
  };
  const setGlobalUserWhitelistIds = (userIds: string[]) => {
    setConfig((prev) => ({ ...prev, ignored_users: userIds }));
  };
  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      router.push('/admin/signin');
      return;
    }
    void (async () => {
      setError(null);
      const res = await fetch('/api/automod/guilds').catch(() => null);
      if (!res) {
        setGuilds([]);
        setError('Could not load guilds. Check network and try again.');
        setLoadingGuilds(false);
        return;
      }
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setGuilds([]);
        setError(data?.error || 'Could not load guilds.');
        setLoadingGuilds(false);
        return;
      }
      const items: GuildInfo[] = Array.isArray(data?.guilds) ? data.guilds : [];
      setGuilds(items);
      setLoadingGuilds(false);
    })();
  }, [status, router]);
  useEffect(() => {
    if (!selectedGuildId) return;
    const cached = guildContextCacheRef.current.get(selectedGuildId);
    if (cached) {
      setRoles(cached.roles);
      setUsers(cached.users);
      setChannels(cached.channels);
    }
    void (async () => {
      setLoadingGuildData(true);
      setError(null);
      try {
        const query = `?guildId=${encodeURIComponent(selectedGuildId)}`;
        const [cfgRes, rulesRes, ctxRes] = await Promise.all([
          fetch(`/api/automod/config${query}`),
          fetch(`/api/automod/rules${query}`),
          fetch(`/api/automod/guild-context${query}`),
        ]);
        const [cfg, rls, ctx] = await Promise.all([
          cfgRes.json().catch(() => null),
          rulesRes.json().catch(() => null),
          ctxRes.json().catch(() => null),
        ]);
        const firstError = [
          { ok: ctxRes.ok, body: ctx },
          { ok: cfgRes.ok, body: cfg },
          { ok: rulesRes.ok, body: rls },
        ].find((x) => !x.ok);
        if (firstError) {
          const reason = firstError.body?.reason;
          if (reason === 'BOT_NOT_IN_GUILD') {
            setError('Bot is not added to this guild. Invite the bot and try again.');
          } else if (reason === 'MISSING_GUILD_PERMISSION') {
            setError('You need Manage Server or Administrator permission in this guild.');
          } else if (reason === 'USER_NOT_IN_GUILD') {
            setError('You are not a member of this guild.');
          } else if (reason === 'DB_UNAVAILABLE') {
            setError('AutoMod database is unavailable. Check BOT_DATABASE_URL credentials in omegle_web/.env.local.');
          } else {
            setError(firstError.body?.details || firstError.body?.error || 'Failed to load AutoMod data for selected guild.');
          }
          if (!cached) {
            setRoles([]);
            setUsers([]);
            setChannels([]);
          }
          setRules([]);
          return;
        }
        if (cfg?.config) setConfig(cfg.config);
        if (Array.isArray(rls?.rules)) setRules(rls.rules);
        const nextRoles = Array.isArray(ctx?.roles) ? ctx.roles : [];
        const nextUsers = Array.isArray(ctx?.users) ? ctx.users : [];
        const nextChannels = Array.isArray(ctx?.channels) ? ctx.channels : [];
        setRoles(nextRoles);
        setUsers(nextUsers);
        setChannels(nextChannels);
        guildContextCacheRef.current.set(selectedGuildId, {
          roles: nextRoles,
          users: nextUsers,
          channels: nextChannels,
        });
        if (cfg?.reason === 'DB_UNAVAILABLE' || rls?.reason === 'DB_UNAVAILABLE') {
          setError('AutoMod database is unavailable. Showing fallback data only.');
        }
        if (ctx?.guild?.id) {
          setGuilds((prev) => prev.map((g) =>
            g.id === ctx.guild.id
              ? {
                  ...g,
                  name: ctx.guild.name || g.name,
                  description: ctx.guild.description || g.description || '',
                  icon: ctx.guild.icon || g.icon || null,
                }
              : g
          ));
        }
      } catch {
        setError('Failed to load AutoMod data for selected guild.');
      } finally {
        setLoadingGuildData(false);
      }
    })();
  }, [selectedGuildId]);
  const saveConfig = async () => {
    if (!selectedGuildId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/automod/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          ignored_users: globalUserWhitelistIds,
          ignored_roles: globalRoleWhitelistIds,
          guild_id: selectedGuildId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.details || body?.error || 'Failed to save config');
      }
    } catch {
      setError('Could not save AutoMod config. Database may be unavailable.');
    } finally {
      setSaving(false);
    }
  };
  const createRule = async () => {
    if (!selectedGuildId) return;
    if (creatingRule) return;
    if (!newRuleDraft.name.trim()) {
      setError('Rule name is required.');
      return;
    }
    if (!newRuleDraft.type) {
      setError('Select a rule type first.');
      return;
    }
    setCreatingRule(true);
    setError(null);
    const normalized = normalizeSettings(newRuleDraft.type, newRuleDraft.settings);
    const res = await fetch('/api/automod/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild_id: selectedGuildId,
        name: newRuleDraft.name.trim(),
        type: newRuleDraft.type,
        enabled: true,
        priority: newRuleDraft.priority,
        stop_on_trigger: newRuleDraft.stop_on_trigger,
        settings: normalized,
        actions: actionPresetToActions(newRuleDraft.actionPreset, newRuleDraft.muteDurationMinutes),
      }),
    });
    if (res.ok) {
      const data = await fetch(`/api/automod/rules?guildId=${encodeURIComponent(selectedGuildId)}`).then((r) => r.json());
      setRules(data.rules || []);
      setIsCreateModalOpen(false);
      setRuleModalMode('create');
      setEditingRuleId(null);
      setNewRuleDraft({
        name: '',
        type: '',
        enabled: true,
        priority: 100,
        stop_on_trigger: true,
        settings: {},
        actionPreset: 'delete_warn',
        muteDurationMinutes: 10,
      });
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body?.details || body?.error || 'Failed to create rule');
    }
    setCreatingRule(false);
  };
  const saveRule = async (rule: AutoModRule): Promise<boolean> => {
    const res = await fetch('/api/automod/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rule, guild_id: selectedGuildId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.details || body?.error || 'Failed to save rule');
      return false;
    }
    return true;
  };
  const deleteRule = async (id: string) => {
    const res = await fetch(`/api/automod/rules?id=${id}&guildId=${encodeURIComponent(selectedGuildId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.details || body?.error || 'Failed to delete rule');
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (editingRuleId === id) {
      setEditingRuleId(null);
      setIsCreateModalOpen(false);
      setRuleModalMode('create');
    }
  };
  const openCreateModal = () => {
    setError(null);
    setRuleModalMode('create');
    setEditingRuleId(null);
    setNewRuleDraft({
      name: '',
      type: '',
      enabled: true,
      priority: 100,
      stop_on_trigger: true,
      settings: {},
      actionPreset: 'delete_warn',
      muteDurationMinutes: 10,
    });
    setIsCreateModalOpen(true);
  };
  const openEditModal = (rule: AutoModRule) => {
    setError(null);
    setRuleModalMode('edit');
    setEditingRuleId(rule.id);
    setNewRuleDraft({
      name: rule.name,
      type: rule.type,
      enabled: rule.enabled,
      priority: rule.priority,
      stop_on_trigger: rule.stop_on_trigger,
      settings: normalizeSettings(rule.type, rule.settings),
      actionPreset: actionsToPreset(rule.actions),
      muteDurationMinutes: muteDurationMinutesFromActions(rule.actions),
    });
    setIsCreateModalOpen(true);
  };
  const submitRuleModal = async () => {
    if (ruleModalMode === 'create') {
      await createRule();
      return;
    }
    if (!editingRuleId || !newRuleDraft.type) return;
    const existing = rules.find((r) => r.id === editingRuleId);
    if (!existing) {
      setError('Rule not found. Please refresh and try again.');
      return;
    }
    const updatedRule: AutoModRule = {
      ...existing,
      name: newRuleDraft.name.trim(),
      type: newRuleDraft.type,
      enabled: newRuleDraft.enabled,
      priority: newRuleDraft.priority,
      stop_on_trigger: newRuleDraft.stop_on_trigger,
      settings: normalizeSettings(newRuleDraft.type, newRuleDraft.settings),
      actions: actionPresetToActions(newRuleDraft.actionPreset, newRuleDraft.muteDurationMinutes),
    };
    const ok = await saveRule(updatedRule);
    if (!ok) return;
    setRules((prev) => prev.map((r) => (r.id === updatedRule.id ? updatedRule : r)));
    setIsCreateModalOpen(false);
    setRuleModalMode('create');
    setEditingRuleId(null);
  };
  const renderConditionFields = (
    type: RuleType | '',
    settings: Record<string, unknown>,
    setSetting: (key: string, value: unknown) => void
  ) => {
    if (!type) return null;
    const box = 'w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-sm';
    switch (type) {
      case 'bad_words':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Banned Words (wildcard)</p>
              <textarea
                value={listToText(settings.wildcardWords)}
                onChange={(e) => setSetting('wildcardWords', textToList(e.target.value))}
                placeholder="Add New"
                className={`${box} min-h-[100px]`}
              />
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-2">Wildcard catches words inside larger text, for example dumbfuckass matches fuck.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Banned Words (exact)</p>
              <textarea
                value={listToText(settings.exactWords)}
                onChange={(e) => setSetting('exactWords', textToList(e.target.value))}
                placeholder="Add New"
                className={`${box} min-h-[100px]`}
              />
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-2">Exact match triggers only on the exact word.</p>
            </div>
          </div>
        );
      case 'caps':
        return (
          <div className="rounded-xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))]">
            <div className="mb-3">
              <p className="text-sm font-medium">Maximum Caps Percentage</p>
            </div>
            <div
              className="rounded-xl p-4 border border-[rgb(var(--color-border))]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(59,130,246,0.08), rgba(16,185,129,0.08)), repeating-linear-gradient(to right, transparent 0, transparent 19px, rgba(148,163,184,0.15) 20px)',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm">Caps Threshold</p>
                <span className="text-xs text-[rgb(var(--color-text-secondary))]">{toNumber(settings.maxCapsPercent, 70)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={toNumber(settings.maxCapsPercent, 70)}
                onChange={(e) => setSetting('maxCapsPercent', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">Adjust from 10% to 100%</p>
            </div>
          </div>
        );
      case 'emoji_spam':
        return (
          <div className="space-y-2">
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">Allowed emoji in 1 message</p>
            <input type="number" className={box} placeholder="Maximum emoji count" value={toNumber(settings.maxEmojis, 8)} onChange={(e) => setSetting('maxEmojis', Number(e.target.value))} />
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">Rule maximum emoji in message can contain.</p>
          </div>
        );
      case 'fast_spam':
        return (
          <div className="space-y-3">
            <p className="text-sm font-medium">Message Spaming</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium mb-2">Messages</p>
                <input type="number" className={box} placeholder="Messages" value={toNumber(settings.limit, 5)} onChange={(e) => setSetting('limit', Number(e.target.value))} />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Time span (seconds)</p>
                <input type="number" className={box} placeholder="Time" value={toNumber(settings.windowSeconds, 5)} onChange={(e) => setSetting('windowSeconds', Number(e.target.value))} />
              </div>
            </div>
            <div className="rounded-xl border border-[rgb(var(--color-border))] px-4 py-3 text-sm text-[rgb(var(--color-text-secondary))]">
              Max Messages allowed {toNumber(settings.limit, 5)} in {toNumber(settings.windowSeconds, 5)} seconds
            </div>
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">Single emoji message is also counted as one message.</p>
          </div>
        );
      case 'links':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">Allowed Server Invite List</p>
              <div className="space-y-2">
                {Array.isArray(settings.allowlist) && settings.allowlist.map((link: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => {
                        const updated = [...(Array.isArray(settings.allowlist) ? settings.allowlist : [])];
                        updated[idx] = e.target.value;
                        setSetting('allowlist', updated);
                      }}
                      placeholder="discord.gg/example"
                      className={`${box} flex-1`}
                    />
                    <button
                      onClick={() => {
                        const updated = (Array.isArray(settings.allowlist) ? settings.allowlist : []).filter((_: string, i: number) => i !== idx);
                        setSetting('allowlist', updated);
                      }}
                      className="px-3 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition flex items-center justify-center"
                      title="Delete this link"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const current = Array.isArray(settings.allowlist) ? settings.allowlist : [];
                  setSetting('allowlist', [...current, '']);
                }}
                className="w-full px-4 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition flex items-center justify-center gap-2 font-medium text-sm"
              >
                <FiPlus size={16} /> Add New
              </button>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">Any invite not in this list is moderated by this rule.</p>
            </div>
          </div>
        );
      case 'mention_spam':
        return (
          <div className="space-y-2">
            <input type="number" className={box} placeholder="Mention allow per message" value={toNumber(settings.maxMentions, 5)} onChange={(e) => setSetting('maxMentions', Number(e.target.value))} />
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">Users can mention up to this number in one message before the rule triggers.</p>
          </div>
        );
      case 'zalgo':
        return null;
      case 'spoiler':
        return null;
      case 'newline_spam':
        return (
          <div className="space-y-2">
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">Set how many newline characters are allowed in a single message.</p>
            <input type="number" className={box} placeholder="Max # of Newlines..." value={toNumber(settings.max, 10)} onChange={(e) => setSetting('max', Number(e.target.value))} />
          </div>
        );
      case 'character_limit':
        return <input type="number" className={box} placeholder="Max Character Count" value={toNumber(settings.max, 2000)} onChange={(e) => setSetting('max', Number(e.target.value))} />;
      case 'sticker_spam':
        return <input type="number" className={box} placeholder="Max stickers per message" value={toNumber(settings.maxStickers, 3)} onChange={(e) => setSetting('maxStickers', Number(e.target.value))} />;
      case 'image_spam':
        return <input type="number" className={box} placeholder="Max images per message" value={toNumber(settings.maxImages, 4)} onChange={(e) => setSetting('maxImages', Number(e.target.value))} />;
      case 'phishing':
        return (
          <div className="space-y-3">
            <textarea
              value={listToText(settings.blockedDomains)}
              onChange={(e) => setSetting('blockedDomains', textToList(e.target.value))}
              placeholder="Blocked phishing domains (one per line)"
              className={`${box} min-h-[120px]`}
            />
            <label className="flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] px-4 py-3">
              <span className="text-sm">Detect URL shorteners</span>
              <ToggleSwitch checked={Boolean(settings.detectShorteners)} onChange={(v) => setSetting('detectShorteners', v)} />
            </label>
          </div>
        );
      default:
        return null;
    }
  };
  if (loadingGuilds || status === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-[rgb(var(--color-text-secondary))] text-lg font-medium">Loading AutoMod...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))] hover:text-blue-500 cursor-pointer">
            <FiChevronLeft /> Back
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 tracking-tight flex items-center gap-3">
            <FiShield className="text-blue-500" />
            AutoMod
          </h1>
          <p className="text-base text-[rgb(var(--color-text-secondary))] mt-1">Manage automated moderation rules.</p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving || !selectedGuildId}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2 font-semibold cursor-pointer active:scale-[0.99] transition"
        >
          <FiSave /> Save Config
        </button>
      </div>
      {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">{error}</div>}
      <div className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] p-5 md:p-6 shadow-apple-lg space-y-5">
        <div>
          <label className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] block mb-2">Select Server</label>
          <EntityDropdown
            options={guilds.map((g) => ({ id: g.id, name: g.name }))}
            selectedIds={selectedGuildId ? [selectedGuildId] : []}
            onChange={(values) => setSelectedGuildId(values[0] || '')}
            multiple={false}
            placeholder="Choose your mutual server..."
            searchPlaceholder="Search servers"
          />
          <p className="mt-2 text-sm text-[rgb(var(--color-text-secondary))]">Only servers where you have access permissions and the bot is present are listed.</p>
          {guilds.length === 0 && (
            <p className="mt-2 text-sm text-[rgb(var(--color-text-secondary))]">
              No mutual guilds found where both you and the bot are present.
            </p>
          )}
        </div>
        {!selectedGuildId && (
          <div className="p-4 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))]">
            Select a server to open AutoMod settings.
          </div>
        )}
        {selectedGuild && !loadingGuildData && (
          <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[rgb(var(--color-bg-tertiary))] flex items-center justify-center">
                {selectedGuild.icon ? (
                  <img src={selectedGuild.icon} alt={selectedGuild.name} className="w-full h-full object-cover" />
                ) : (
                  <FiShield className="text-xl text-[rgb(var(--color-text-secondary))]" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedGuild.name}</h2>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">{selectedGuild.description || 'No server description available.'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] px-4 py-2 flex items-center justify-between gap-4 min-w-[230px]">
              <div>
                <p className="font-semibold">AutoMod</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">Enable or disable for this server</p>
              </div>
              <ToggleSwitch checked={config.enabled} onChange={(v) => setConfig((p) => ({ ...p, enabled: v }))} />
            </div>
          </div>
        )}
      </div>
      {selectedGuildId && loadingGuildData && (
        <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Loading server AutoMod settings...
        </div>
      )}
      {!selectedGuildId && (
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-6 bg-[rgb(var(--color-bg-secondary))] text-center text-[rgb(var(--color-text-secondary))]">
          Server settings will appear here after you select a server.
        </div>
      )}
      {selectedGuildId && !loadingGuildData && (
      <div className="rounded-2xl border border-[rgb(var(--color-border))] p-5 bg-[rgb(var(--color-bg-secondary))] space-y-4">
        <div>
          <h3 className="text-xl font-bold">Global Settings</h3>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">Global whitelist is applied across all rules. Rule-level logging overrides global logging when set.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-primary))] space-y-3">
            <MultiCheckDropdown
              label="Global Whitelisted Roles"
              options={roles}
              selectedIds={globalRoleWhitelistIds}
              onChange={setGlobalRoleWhitelistIds}
            />
            <MultiCheckDropdown
              label="Global Whitelisted Users"
              options={users}
              selectedIds={globalUserWhitelistIds}
              onChange={setGlobalUserWhitelistIds}
            />
            <MultiCheckDropdown
              label="Global Whitelisted Channels"
              options={channels.map((c) => ({ id: c.id, name: `#${c.name}` }))}
              selectedIds={config.ignored_channels}
              onChange={(values) => setConfig((p) => ({ ...p, ignored_channels: values }))}
            />
          </div>
          <div className="rounded-xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-primary))] space-y-3">
            <SelectedReadonly label="Global Roles" options={roles} selectedIds={globalRoleWhitelistIds} />
            <SelectedReadonly label="Global Users" options={users} selectedIds={globalUserWhitelistIds} />
            <SelectedReadonly label="Global Channels" options={channels.map((c) => ({ id: c.id, name: `#${c.name}` }))} selectedIds={config.ignored_channels} />
            <div>
              <label className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] block mb-2">Global Logging Channel</label>
              <EntityDropdown
                options={channels.map((channel) => ({
                  id: channel.id,
                  name: `#${channel.name}`,
                  subtitle: channel.id,
                }))}
                selectedIds={config.log_channel_id ? [config.log_channel_id] : []}
                onChange={(values) => setConfig((p) => ({ ...p, log_channel_id: values[0] || null }))}
                multiple={false}
                placeholder="No logging channel"
                searchPlaceholder="Search channels"
              />
            </div>
          </div>
        </div>
      </div>
      )}
      {selectedGuildId && !loadingGuildData && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))] flex items-center justify-between">
          <span className="font-semibold">Ignore Admins</span>
          <ToggleSwitch checked={config.ignore_admins} onChange={(v) => setConfig((p) => ({ ...p, ignore_admins: v }))} />
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))] flex items-center justify-between">
          <span className="font-semibold">Stop On Trigger</span>
          <ToggleSwitch checked={config.stop_on_trigger} onChange={(v) => setConfig((p) => ({ ...p, stop_on_trigger: v }))} />
        </div>
        <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))] flex items-center justify-between">
          <span className="font-semibold">Rules</span>
          <span className="text-sm px-2 py-1 rounded-lg bg-[rgb(var(--color-bg-primary))]">{rules.length}</span>
        </div>
      </div>
      )}
      {selectedGuildId && !loadingGuildData && (
      <div className="rounded-2xl border border-[rgb(var(--color-border))] p-4 bg-[rgb(var(--color-bg-secondary))] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiList /> Rules
          </h2>
          <button
            onClick={openCreateModal}
            disabled={!selectedGuildId}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <FiPlus /> Add Rule
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              role="button"
              tabIndex={0}
              onClick={() => openEditModal(rule)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openEditModal(rule);
                }
              }}
              className="text-left p-4 rounded-2xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] hover:border-blue-500/40 hover:shadow-md cursor-pointer transition"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-base truncate">{rule.name}</h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-secondary))] inline-flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(rule);
                    }}
                    aria-label={`Edit ${rule.name}`}
                  >
                    <FiSettings className="text-[rgb(var(--color-text-secondary))]" />
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg border border-red-500/30 hover:bg-red-500/10 inline-flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteRule(rule.id);
                    }}
                    aria-label={`Delete ${rule.name}`}
                  >
                    <FiTrash2 className="text-red-400" />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">Type: {rule.type}</p>
                {rule.enabled ? <FiCheck className="text-emerald-500" /> : <FiX className="text-red-400" />}
              </div>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">Priority: {rule.priority}</p>
            </div>
          ))}
        </div>
      </div>
      )}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] shadow-2xl p-5 md:p-7 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight">{ruleModalMode === 'edit' ? 'Edit Rule' : 'Create New Rule'}</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">Choose a name and rule type, then configure conditions.</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setRuleModalMode('create');
                  setEditingRuleId(null);
                }}
                className="w-10 h-10 rounded-xl border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-primary))] inline-flex items-center justify-center"
              >
                <FiX />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={newRuleDraft.name}
                onChange={(e) => setNewRuleDraft((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] text-sm"
                placeholder="Rule name (e.g. Block Scam Links)"
              />
              {ruleModalMode === 'edit' ? (
                <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Rule Enabled</span>
                  <ToggleSwitch checked={newRuleDraft.enabled} onChange={(v) => setNewRuleDraft((p) => ({ ...p, enabled: v }))} />
                </div>
              ) : (
              <EntityDropdown
                options={ruleTypeOptions}
                selectedIds={newRuleDraft.type ? [newRuleDraft.type] : []}
                onChange={(values) => {
                  const type = (values[0] || '') as RuleType | '';
                  setNewRuleDraft((p) => ({
                    ...p,
                    type,
                    settings: type ? normalizeSettings(type, p.settings) : {},
                  }));
                }}
                multiple={false}
                placeholder="Select rule type..."
                searchPlaceholder="Search rule types"
              />
              )}
            </div>
            {ruleModalMode === 'edit' && (
              <EntityDropdown
                options={ruleTypeOptions}
                selectedIds={newRuleDraft.type ? [newRuleDraft.type] : []}
                onChange={(values) => {
                  const type = (values[0] || '') as RuleType | '';
                  setNewRuleDraft((p) => ({
                    ...p,
                    type,
                    settings: type ? normalizeSettings(type, p.settings) : {},
                  }));
                }}
                multiple={false}
                placeholder="Select rule type..."
                searchPlaceholder="Search rule types"
              />
            )}
            {newRuleDraft.type && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="space-y-3 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4">
                  <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Rule Conditions</p>
                  <div className="space-y-1">
                    {RULE_TYPE_HELP[newRuleDraft.type].map((line) => (
                      <p key={line} className="text-sm text-[rgb(var(--color-text-secondary))]">{line}</p>
                    ))}
                  </div>
                  {renderConditionFields(
                    newRuleDraft.type,
                    newRuleDraft.settings,
                    (key, value) => setNewRuleDraft((p) => ({ ...p, settings: { ...p.settings, [key]: value } }))
                  )}
                </div>
                <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-primary))] p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Action</p>
                  <EntityDropdown
                    className="mt-2"
                    options={actionPresetOptions}
                    selectedIds={[newRuleDraft.actionPreset]}
                    onChange={(values) => setNewRuleDraft((p) => ({ ...p, actionPreset: (values[0] || p.actionPreset) as RuleActionPreset }))}
                    multiple={false}
                    placeholder="Select action"
                    searchPlaceholder="Search actions"
                  />
                </div>
                {actionPresetIncludesMute(newRuleDraft.actionPreset) && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Mute Duration (Minutes)</p>
                    <input
                      type="number"
                      min={1}
                      max={40320}
                      step={1}
                      value={newRuleDraft.muteDurationMinutes}
                      onChange={(e) => setNewRuleDraft((p) => ({ ...p, muteDurationMinutes: Math.min(40320, Math.max(1, Number(e.target.value) || 1)) }))}
                      className="w-full mt-2 px-4 py-3 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-sm"
                      placeholder="Enter minutes"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <MultiCheckDropdown
                      label="Whitelist Roles"
                      options={roles}
                      selectedIds={Array.isArray(newRuleDraft.settings.whitelistRoleIds) ? newRuleDraft.settings.whitelistRoleIds.map((v) => String(v)) : []}
                      onChange={(values) => setNewRuleDraft((p) => ({ ...p, settings: { ...p.settings, whitelistRoleIds: values } }))}
                    />
                  </div>
                  <div>
                    <MultiCheckDropdown
                      label="Whitelist Users"
                      options={users}
                      selectedIds={Array.isArray(newRuleDraft.settings.whitelistUserIds) ? newRuleDraft.settings.whitelistUserIds.map((v) => String(v)) : []}
                      onChange={(values) => setNewRuleDraft((p) => ({ ...p, settings: { ...p.settings, whitelistUserIds: values } }))}
                    />
                  </div>
                </div>
                <MultiCheckDropdown
                  label="Whitelist Channels"
                  options={channels.map((c) => ({ id: c.id, name: `#${c.name}` }))}
                  selectedIds={Array.isArray(newRuleDraft.settings.whitelistChannelIds) ? newRuleDraft.settings.whitelistChannelIds.map((v) => String(v)) : []}
                  onChange={(values) => setNewRuleDraft((p) => ({ ...p, settings: { ...p.settings, whitelistChannelIds: values } }))}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SelectedReadonly
                    label="Roles"
                    options={roles}
                    selectedIds={Array.isArray(newRuleDraft.settings.whitelistRoleIds) ? newRuleDraft.settings.whitelistRoleIds.map((v) => String(v)) : []}
                  />
                  <SelectedReadonly
                    label="Users"
                    options={users}
                    selectedIds={Array.isArray(newRuleDraft.settings.whitelistUserIds) ? newRuleDraft.settings.whitelistUserIds.map((v) => String(v)) : []}
                  />
                  <SelectedReadonly
                    label="Channels"
                    options={channels.map((c) => ({ id: c.id, name: `#${c.name}` }))}
                    selectedIds={Array.isArray(newRuleDraft.settings.whitelistChannelIds) ? newRuleDraft.settings.whitelistChannelIds.map((v) => String(v)) : []}
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Logging Channel</p>
                  <EntityDropdown
                    className="mt-2"
                    options={channels.map((channel) => ({
                      id: channel.id,
                      name: `#${channel.name}`,
                      subtitle: channel.id,
                    }))}
                    selectedIds={newRuleDraft.settings.logChannelId ? [String(newRuleDraft.settings.logChannelId)] : []}
                    onChange={(values) => setNewRuleDraft((p) => ({ ...p, settings: { ...p.settings, logChannelId: values[0] || '' } }))}
                    multiple={false}
                    placeholder="Use global logging channel"
                    searchPlaceholder="Search channels"
                  />
                </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              {ruleModalMode === 'edit' && editingRuleId ? (
                <button
                  onClick={() => void deleteRule(editingRuleId)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-2"
                >
                  <FiTrash2 /> Delete Rule
                </button>
              ) : null}
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setRuleModalMode('create');
                  setEditingRuleId(null);
                }}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-primary))]"
              >
                Cancel
              </button>
              <button
                onClick={submitRuleModal}
                disabled={creatingRule || !newRuleDraft.name.trim() || !newRuleDraft.type}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-2 disabled:opacity-60"
              >
                {ruleModalMode === 'edit' ? <FiSave /> : <FiPlus />}
                {ruleModalMode === 'edit' ? 'Save Rule' : creatingRule ? 'Creating...' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}