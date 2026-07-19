'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  FiFolder, 
  FiFileText, 
  FiUsers, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSettings, 
  FiMessageSquare, 
  FiSave,
  FiChevronDown,
  FiChevronUp,
  FiServer
} from 'react-icons/fi';
import EntityDropdown from '@/components/ui/entity-dropdown';

interface DiscordGuild {
  guild_id: string;
  guild_name: string;
}

interface DiscordData {
  categories: { id: string; name: string }[];
  textChannels: { id: string; name: string }[];
  roles: { id: string; name: string; color?: number }[];
}

interface CategoryConfig {
  id?: string;
  guild_id: string;
  name: string;
  channel_category_id: string;
  transcript_channel_id: string | null;
  staff_role_ids: string[];
}

const TICKET_CATEGORIES = [
  'General Queries',
  'Report',
  'Punishment Appeal',
  'Shop Redeem',
  'Partnership / Promo',
  'Giveaway',
  'Tech Support',
  'Mod Complaint'
];

export default function TicketSystemConfig() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  
  const [discordData, setDiscordData] = useState<DiscordData>({
    categories: [],
    textChannels: [],
    roles: []
  });
  
  const [configs, setConfigs] = useState<Record<string, CategoryConfig>>({});
  const [loadingGuilds, setLoadingGuilds] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('General Queries');
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Authentication guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
    } else if (status === 'authenticated' && !session?.user?.permissions?.hasFullAccess) {
      router.replace('/admin');
    }
  }, [status, session, router]);

  // Load allowed guilds
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    const fetchGuilds = async () => {
      try {
        setLoadingGuilds(true);
        const res = await fetch('/api/tickets/guilds');
        const data = await res.json();
        if (data.success && data.guilds?.length > 0) {
          setGuilds(data.guilds);
          setSelectedGuildId(data.guilds[0].guild_id);
        }
      } catch (err) {
        console.error('Failed to load guilds:', err);
      } finally {
        setLoadingGuilds(false);
      }
    };
    
    fetchGuilds();
  }, [status]);

  // Fetch Discord data and ticket configs for selected guild
  useEffect(() => {
    if (!selectedGuildId) return;
    
    const fetchGuildDetails = async () => {
      try {
        setLoadingData(true);
        // Fetch Discord categories, channels, and roles
        const discordRes = await fetch(`/api/tickets/discord-data?guildId=${selectedGuildId}`);
        const discordJson = await discordRes.json();
        
        // Fetch existing category configurations
        const configRes = await fetch(`/api/tickets/config?guildId=${selectedGuildId}`);
        const configJson = await configRes.json();
        
        setDiscordData({
          categories: discordJson.categories || [],
          textChannels: discordJson.textChannels || [],
          roles: discordJson.roles || []
        });
        
        const loadedConfigs: Record<string, CategoryConfig> = {};
        TICKET_CATEGORIES.forEach(cat => {
          const matched = configJson.categories?.find((c: any) => c.name === cat);
          loadedConfigs[cat] = matched ? {
            id: matched.id,
            guild_id: matched.guild_id,
            name: matched.name,
            channel_category_id: matched.channel_category_id,
            transcript_channel_id: matched.transcript_channel_id,
            staff_role_ids: matched.staff_role_ids || []
          } : {
            guild_id: selectedGuildId,
            name: cat,
            channel_category_id: '',
            transcript_channel_id: '',
            staff_role_ids: []
          };
        });
        
        setConfigs(loadedConfigs);
      } catch (err) {
        console.error('Failed to load guild configuration:', err);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchGuildDetails();
  }, [selectedGuildId]);

  const handleSaveConfig = async (catName: string) => {
    const config = configs[catName];
    if (!config.channel_category_id) {
      showNotification('error', 'Opening Category is required.');
      return;
    }
    if (!config.transcript_channel_id) {
      showNotification('error', 'Transcript Channel is required.');
      return;
    }
    if (config.staff_role_ids.length === 0) {
      showNotification('error', 'At least one Staff Role is required.');
      return;
    }

    try {
      setSavingCategory(catName);
      const res = await fetch('/api/tickets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: selectedGuildId,
          name: catName,
          openingCategoryId: config.channel_category_id,
          transcriptChannelId: config.transcript_channel_id,
          staffRoleIds: config.staff_role_ids
        })
      });
      
      const json = await res.json();
      if (json.success) {
        setConfigs(prev => ({
          ...prev,
          [catName]: {
            ...prev[catName],
            id: json.category.id
          }
        }));
        showNotification('success', `Saved configuration for ${catName}!`);
      } else {
        showNotification('error', json.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Save error:', err);
      showNotification('error', 'Network error while saving configuration');
    } finally {
      setSavingCategory(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Mappers to EntityDropdownOptions
  const categoryOptions = discordData.categories.map(c => ({ id: c.id, name: c.name }));
  const channelOptions = discordData.textChannels.map(c => ({ id: c.id, name: `#${c.name}` }));
  const roleOptions = discordData.roles.map(r => ({ 
    id: r.id, 
    name: r.name,
    color: r.color
  }));

  if (status === 'loading' || loadingGuilds) {
    return (
      <main className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading Ticket System configs...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10 space-y-8 bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))] pb-20">
      
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Ticket System Configuration
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            Configure independent opening categories, transcript logs, and staff permissions for each ticket category.
          </p>
        </div>
        
        {/* Guild Selection Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
            <FiServer className="text-blue-500 w-4 h-4" /> Server:
          </label>
          <div className="relative">
            <select
              value={selectedGuildId}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              className="appearance-none bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[rgb(var(--color-text-primary))] px-4 py-2 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-colors"
            >
              {guilds.map((g) => (
                <option key={g.guild_id} value={g.guild_id} className="bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-primary))]">
                  {g.guild_name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-400">
              <FiChevronDown />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notification.type === 'success' ? <FiCheckCircle className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}

      {guilds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[rgb(var(--color-text-secondary))] gap-4 max-w-md mx-auto text-center glass-blue border border-white/5 rounded-3xl p-8 shadow-apple-lg">
          <FiServer className="w-16 h-16 text-blue-500/50 animate-pulse" />
          <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))]">No Authorized Servers</h2>
          <p className="text-sm">
            We couldn't find any Discord servers where the bot is installed and you possess administrator rights or a configured bot management role.
          </p>
        </div>
      ) : loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 text-[rgb(var(--color-text-secondary))] gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span>Syncing with Discord Guild cache...</span>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          {TICKET_CATEGORIES.map((catName) => {
            const isExpanded = expandedCategory === catName;
            const config = configs[catName] || { channel_category_id: '', transcript_channel_id: '', staff_role_ids: [] };
            const isConfigured = !!(config.channel_category_id && config.transcript_channel_id && config.staff_role_ids.length > 0);
            
            return (
              <div 
                key={catName} 
                className={`glass-blue border rounded-3xl overflow-hidden transition-all duration-300 ${
                  isExpanded 
                    ? 'border-blue-500/30 shadow-blue-glow/10 bg-blue-500/[0.02]' 
                    : 'border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                }`}
              >
                {/* Header Row */}
                <div 
                  onClick={() => setExpandedCategory(isExpanded ? null : catName)}
                  className="flex items-center justify-between px-6 py-5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      isConfigured 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-white/5 text-[rgb(var(--color-text-tertiary))] border border-white/5'
                    }`}>
                      <FiSettings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{catName}</h3>
                      <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
                        {isConfigured 
                          ? 'Active and fully configured' 
                          : 'Configuration pending'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isConfigured && (
                      <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        Active
                      </span>
                    )}
                    <div className="text-[rgb(var(--color-text-secondary))]">
                      {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Configuration Content */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-6 py-6 bg-black/[0.1] space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Opening Category Dropdown */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
                          <FiFolder className="text-blue-400" /> Opening Category
                        </label>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                          Discord category where new ticket channels will be created.
                        </p>
                        <EntityDropdown
                          options={categoryOptions}
                          selectedIds={config.channel_category_id ? [config.channel_category_id] : []}
                          onChange={(ids) => {
                            setConfigs(prev => ({
                              ...prev,
                              [catName]: {
                                ...prev[catName],
                                channel_category_id: ids[0] || ''
                              }
                            }));
                          }}
                          multiple={false}
                          placeholder="Select a category channel..."
                          searchPlaceholder="Search category channels..."
                        />
                      </div>

                      {/* Transcript Channel Dropdown */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
                          <FiFileText className="text-blue-400" /> Transcript Channel
                        </label>
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                          Channel where ticket transcripts are sent after closure.
                        </p>
                        <EntityDropdown
                          options={channelOptions}
                          selectedIds={config.transcript_channel_id ? [config.transcript_channel_id] : []}
                          onChange={(ids) => {
                            setConfigs(prev => ({
                              ...prev,
                              [catName]: {
                                ...prev[catName],
                                transcript_channel_id: ids[0] || null
                              }
                            }));
                          }}
                          multiple={false}
                          placeholder="Select transcript channel..."
                          searchPlaceholder="Search text channels..."
                        />
                      </div>
                      
                    </div>

                    {/* Staff Roles Searchable Dropdown */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="text-sm font-semibold flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
                        <FiUsers className="text-blue-400" /> Staff Roles
                      </label>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                        Search and assign multiple staff roles that will automatically receive access to these tickets.
                      </p>
                      <EntityDropdown
                        options={roleOptions}
                        selectedIds={config.staff_role_ids}
                        onChange={(ids) => {
                          setConfigs(prev => ({
                            ...prev,
                            [catName]: {
                              ...prev[catName],
                              staff_role_ids: ids
                            }
                          }));
                        }}
                        multiple={true}
                        placeholder="Search and assign staff roles..."
                        searchPlaceholder="Type role name..."
                      />
                    </div>

                    {/* Save Button Row */}
                    <div className="flex justify-end pt-4 border-t border-white/5">
                      <button
                        onClick={() => handleSaveConfig(catName)}
                        disabled={savingCategory === catName}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 text-white font-semibold py-2.5 px-6 rounded-2xl shadow-lg transition-all active:scale-95 duration-200 cursor-pointer"
                      >
                        {savingCategory === catName ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <FiSave className="w-4 h-4" />
                        )}
                        <span>{savingCategory === catName ? 'Saving...' : 'Save Configuration'}</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
