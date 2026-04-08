'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getQuestionTitle, getRoleLabel, STAFF_ROLES, StaffRole } from '@/lib/staffApplicationForm';

type RoleFormSetting = {
  isOpen: boolean;
  closedMessage?: string;
};

const DEFAULT_ROLE_FORM_SETTINGS: Record<StaffRole, RoleFormSetting> = {
  moderation: { isOpen: true, closedMessage: '' },
  event_team: { isOpen: true, closedMessage: '' },
  gaming_mod: { isOpen: true, closedMessage: '' },
  media_team: { isOpen: true, closedMessage: '' },
  entertainment_team: { isOpen: true, closedMessage: '' },
};

interface Application {
  _id: string;
  applicationRole?: StaffRole;
  dailyAvailability?: string;
  roleAnswers?: Record<string, string>;
  formVersion?: number;

  // Discord & Personal Info
  discordUsername?: string;
  discordUserId: string;
  country?: string;
  timezone?: string;
  age?: string;

  // General Questions
  aboutYourself?: string;
  whyJoin?: string;
  hoursPerWeek?: string;
  languages?: string;
  vcAvailability?: string;
  vcFrequency?: string;

  // Moderation Questions
  moderationExperience?: string;
  moderatorDefinition?: string;
  leadershipExperience?: string;

  // Bot Experience
  discordBotExperience?: string;
  automodKnowledge?: string;
  moderationBotsFamiliarity?: string;
  modCommandsKnowledge?: string;

  // Status & Metadata
  status: 'pending' | 'considered' | 'denied';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  
  // Fetched user data
  userProfile?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
    in_guild?: boolean;
    nickname?: string;
  } | null;
  userStats?: {
    vc_duration?: number;
    vc_sessions?: number;
    message_count?: number;
  } | null;
  modLogs?: Array<{
    case_number?: number;
    action?: string;
    action_type?: string; // fallback for old data
    reason?: string;
    moderator_id?: string;
    moderator_username?: string;
    moderator_display_name?: string;
    moderator_avatar_url?: string;
    created_at?: string;
    duration_seconds?: number;
    active?: boolean;
  }>;
  dataFetchedAt?: string;
}

export default function ApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeRoleTab, setActiveRoleTab] = useState<'all' | StaffRole>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true);
  const [roleForms, setRoleForms] = useState<Record<StaffRole, RoleFormSetting>>(DEFAULT_ROLE_FORM_SETTINGS);
  const [modalTab, setModalTab] = useState<'details' | 'userData'>('details');
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    } else if (status === 'authenticated' && !session?.user?.permissions?.hasFullAccess) {
      // Applications require full access (admin/manage server)
      router.push('/admin');
    }
  }, [status, session, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (result.success) {
        setIsApplicationsOpen(result.data.isOpen);
        if (result.data.roleForms) {
          setRoleForms((prev) => {
            const next = { ...prev };
            for (const role of STAFF_ROLES) {
              const incoming = result.data.roleForms?.[role.id];
              if (!incoming) continue;
              next[role.id] = {
                isOpen: typeof incoming.isOpen === 'boolean' ? incoming.isOpen : true,
                closedMessage: incoming.closedMessage || '',
              };
            }
            return next;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/applications?${params}`);
      const result = await response.json();
      if (result.success) {
        setApplications(result.data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleApplications = async () => {
    setSettingsLoading(true);
    try {
      const newStatus = !isApplicationsOpen;
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        setIsApplicationsOpen(newStatus);
        alert(`Staff applications are now ${newStatus ? 'OPEN' : 'CLOSED'}`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update application status');
    } finally {
      setSettingsLoading(false);
    }
  };

  const toggleRoleForm = async (role: StaffRole) => {
    setSettingsLoading(true);
    try {
      const current = roleForms[role] || { isOpen: true, closedMessage: '' };
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleForms: {
            [role]: {
              isOpen: !current.isOpen,
              closedMessage: current.closedMessage || '',
            },
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        const updated = result.data?.roleForms?.[role];
        setRoleForms((prev) => ({
          ...prev,
          [role]: {
            isOpen: typeof updated?.isOpen === 'boolean' ? updated.isOpen : !current.isOpen,
            closedMessage: updated?.closedMessage || current.closedMessage || '',
          },
        }));
      }
    } catch (error) {
      console.error('Error updating role form status:', error);
      alert('Failed to update role form status');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setActiveTab(status);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm]);

  const updateApplicationStatus = async (
    id: string,
    status: 'pending' | 'considered' | 'denied'
  ) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (result.success) {
        fetchApplications();
        if (selectedApp?._id === id) {
          setSelectedApp(result.data);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateNotes = async (id: string) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Notes updated successfully!');
        // Update selected app with new notes
        setSelectedApp(result.data);
        setNotes(result.data.notes || '');
        // Refresh applications list
        await fetchApplications();
      }
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        fetchApplications();
        setShowModal(false);
        setSelectedApp(null);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const openModal = async (app: Application) => {
    setSelectedApp(app);
    setNotes(app.notes || '');
    setModalTab('details');
    setShowModal(true);
    
    // Scroll modal content to top
    setTimeout(() => {
      const modalContent = document.querySelector('.modal-content-scroll');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
    }, 100);
    
    // Fetch fresh application data including user stats and modlogs
    try {
      const response = await fetch(`/api/applications/${app._id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedApp(result.data);
        setNotes(result.data.notes || '');
      }
    } catch (error) {
      console.error('Error fetching application details:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'considered':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const tabs = [
    { id: 'all', label: 'All Applications', count: applications.length },
    {
      id: 'pending',
      label: 'Pending',
      count: applications.filter((a) => a.status === 'pending').length,
    },
    {
      id: 'considered',
      label: 'Considered',
      count: applications.filter((a) => a.status === 'considered').length,
    },
    {
      id: 'denied',
      label: 'Denied',
      count: applications.filter((a) => a.status === 'denied').length,
    },
  ];

  const roleTabs: Array<{ id: 'all' | StaffRole; label: string; count: number }> = [
    {
      id: 'all',
      label: 'All Roles',
      count: applications.length,
    },
    ...STAFF_ROLES.map((role) => ({
      id: role.id,
      label: role.label,
      count: applications.filter((application) => (application.applicationRole || 'moderation') === role.id).length,
    })),
  ];

  const visibleApplications = applications.filter((application) => {
    if (activeRoleTab === 'all') return true;
    return (application.applicationRole || 'moderation') === activeRoleTab;
  });

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">Staff Applications</h1>
            <p className="text-xs sm:text-base text-gray-400">Review and manage all staff applications</p>
          </div>

          {/* Global Application Status Toggle */}
          <div className="bg-discord-light/50 rounded-xl p-3 sm:p-4 border border-gray-700 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Application Status (Global)</p>
                <p className={`text-lg font-bold ${isApplicationsOpen ? 'text-green-500' : 'text-red-500'}`}>
                  {isApplicationsOpen ? 'OPEN' : 'CLOSED'}
                </p>
              </div>
              <button
                onClick={toggleApplications}
                disabled={settingsLoading}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-discord-dark disabled:opacity-50 ${isApplicationsOpen ? 'bg-green-500' : 'bg-gray-600'
                  }`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${isApplicationsOpen ? 'translate-x-12' : 'translate-x-1'
                    }`}
                />
                <span className={`absolute text-xs font-bold ${isApplicationsOpen ? 'left-2 text-white' : 'right-2 text-white'}`}>
                  {isApplicationsOpen ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Per-Role Application Status */}
        <div className="mt-4 bg-discord-light/50 rounded-xl p-4 sm:p-5 border border-gray-700">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <p className="text-sm text-gray-400">Role Application Status</p>
              <p className="text-xs text-gray-500 mt-1">
                Global OFF closes all forms. Role toggles below control each section when global is ON.
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                isApplicationsOpen
                  ? 'bg-green-500/15 text-green-400 border-green-500/40'
                  : 'bg-red-500/15 text-red-400 border-red-500/40'
              }`}
            >
              Master: {isApplicationsOpen ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {STAFF_ROLES.map((role) => {
              const roleSetting = roleForms[role.id] || { isOpen: true, closedMessage: '' };
              const isRoleOpen = roleSetting.isOpen;
              return (
                <div
                  key={role.id}
                  className="bg-discord-dark/40 border border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{role.label}</p>
                      <p className={`text-xs mt-1 ${isRoleOpen ? 'text-green-400' : 'text-red-400'}`}>
                        {isRoleOpen ? 'OPEN' : 'CLOSED'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRoleForm(role.id)}
                      disabled={settingsLoading}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                        isRoleOpen ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                      title={`Toggle ${role.label} applications`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                          isRoleOpen ? 'translate-x-9' : 'translate-x-1'
                        }`}
                      />
                      <span className="sr-only">Toggle {role.label} applications</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 pb-2 snap-x touch-pan-x">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base ${activeTab === tab.id
                ? 'bg-discord-blurple text-white shadow-lg'
                : 'bg-discord-light text-gray-300 hover:bg-discord-light/80'
              }`}
          >
            {tab.label}
            <span
              className={`ml-2 px-2 py-1 rounded-full text-[10px] sm:text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-700'
                }`}
            >
              {activeTab === tab.id ? applications.length : tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Role Filter Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 pb-2 snap-x touch-pan-x">
        {roleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveRoleTab(tab.id)}
            className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base ${
              activeRoleTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-discord-light text-gray-300 hover:bg-discord-light/80'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 px-2 py-1 rounded-full text-[10px] sm:text-xs ${
                activeRoleTab === tab.id ? 'bg-white/20' : 'bg-gray-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by role, country, age, or answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-discord-light border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-discord-blurple text-white placeholder-gray-500"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-discord-blurple"></div>
        </div>
      ) : visibleApplications.length === 0 ? (
        <div className="bg-discord-light/50 rounded-xl p-12 text-center border border-gray-700">
          <svg
            className="w-16 h-16 text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            No applications found
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : activeRoleTab !== 'all'
                ? `No ${getRoleLabel(activeRoleTab)} applications for this filter`
                : 'Applications will appear here once submitted'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleApplications.map((app) => (
            <div
              key={app._id}
              className="bg-discord-light/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer shadow-apple-sm hover:shadow-apple-md"
              onClick={() => openModal(app)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-white">
                      {getRoleLabel(app.applicationRole || 'moderation')} Applicant
                    </h3>
                    <span
                      className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${getStatusColor(
                        app.status
                      )}`}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>Country: {app.country || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{(app.dailyAvailability || app.hoursPerWeek || 'N/A')} daily availability</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="truncate">
                        {new Date(app.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {(app.whyJoin || app.aboutYourself) && (
                    <p className="mt-3 text-gray-300 text-xs sm:text-sm line-clamp-2">
                      {app.whyJoin || app.aboutYourself}
                    </p>
                  )}
                </div>
                <div className="flex items-center w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(app);
                    }}
                    className="w-full sm:w-auto flex justify-center items-center gap-2 p-2 sm:px-4 bg-discord-blurple/20 hover:bg-discord-blurple/30 rounded-lg transition-colors text-discord-blurple text-sm font-semibold"
                  >
                    <span className="sm:hidden">View Details</span>
                    <svg
                      className="w-5 h-5 text-discord-blurple"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black/80 sm:bg-black/60 z-50 overflow-y-auto animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="glass-effect rounded-t-[2rem] sm:rounded-apple-xl max-w-5xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-[rgb(var(--color-border))] shadow-apple-2xl flex flex-col pt-2 sm:pt-0 sm:my-4" onClick={(e) => e.stopPropagation()}>
              {/* Drag Handle (Mobile) */}
              <div className="w-16 h-1.5 bg-gray-500/30 rounded-full mx-auto mb-2 sm:hidden"></div>

              {/* Modal Header */}
              <div className="glass-effect border-b border-[rgb(var(--color-border))] p-5 sm:p-8 flex items-start justify-between flex-shrink-0 backdrop-blur-xl">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-4 mb-2">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                        {selectedApp.userProfile?.display_name || selectedApp.userProfile?.username || selectedApp.discordUsername}
                      </h2>
                      {selectedApp.userProfile?.in_guild !== undefined && (
                        <p className="text-sm text-[rgb(var(--color-text-tertiary))] mt-1">
                          {selectedApp.userProfile.in_guild ? '✓ Member of server' : '✗ Not in server'}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[rgb(var(--color-text-secondary))] text-sm font-light">
                    Submitted on{' '}
                    {new Date(selectedApp.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  {selectedApp.userProfile?.avatar_url ? (
                    <img 
                      src={selectedApp.userProfile.avatar_url}
                      alt={selectedApp.userProfile.username || selectedApp.discordUsername}
                      className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-lg"
                      onError={(e) => {
                        // Fallback to default avatar
                        const defaultIndex = Number(BigInt(selectedApp.discordUserId) >> 22n) % 6;
                        e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
                      }}
                    />
                  ) : (
                    <img 
                      src={`https://cdn.discordapp.com/embed/avatars/${Number(BigInt(selectedApp.discordUserId) >> 22n) % 6}.png`}
                      alt={selectedApp.userProfile?.username || selectedApp.discordUsername}
                      className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-lg"
                    />
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-3 hover:bg-[rgb(var(--color-bg-tertiary))] rounded-apple-lg apple-transition"
                  >
                    <svg
                      className="w-6 h-6 text-[rgb(var(--color-text-secondary))]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-[rgb(var(--color-border))] px-6 sm:px-8 gap-2">
                <button
                  onClick={() => setModalTab('details')}
                  className={`px-6 py-3 font-semibold transition-all relative ${
                    modalTab === 'details'
                      ? 'text-[rgb(var(--color-accent))] border-b-2 border-[rgb(var(--color-accent))]'
                      : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                  }`}
                >
                  Application Details
                </button>
                <button
                  onClick={() => setModalTab('userData')}
                  className={`px-6 py-3 font-semibold transition-all relative ${
                    modalTab === 'userData'
                      ? 'text-[rgb(var(--color-accent))] border-b-2 border-[rgb(var(--color-accent))]'
                      : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                  }`}
                >
                  User Data & Modlogs
                  {selectedApp.modLogs && selectedApp.modLogs.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {selectedApp.modLogs.length}
                    </span>
                  )}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 modal-content-scroll">
                {modalTab === 'details' ? (
                  <>
                {/* Status Management */}
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                  <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                    Application Status
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {['pending', 'considered', 'denied'].map((status) => (
                      <button
                        key={status}
                        onClick={() =>
                          updateApplicationStatus(
                            selectedApp._id,
                            status as 'pending' | 'considered' | 'denied'
                          )
                        }
                        className={`px-6 py-3 rounded-apple-lg font-semibold apple-transition ${selectedApp.status === status
                            ? status === 'pending'
                              ? 'bg-yellow-500 text-white border-2 border-yellow-600'
                              : status === 'considered'
                                ? 'bg-green-500 text-white border-2 border-green-600'
                                : 'bg-red-500 text-white border-2 border-red-600'
                            : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))]'
                          }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                  <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                    Discord & Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Applied Role</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-semibold text-lg">{getRoleLabel(selectedApp.applicationRole || 'moderation')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Daily Availability</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-semibold text-lg">{selectedApp.dailyAvailability || selectedApp.hoursPerWeek || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Discord Username</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-semibold text-lg">{selectedApp.discordUsername || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Discord User ID</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-mono text-sm bg-[rgb(var(--color-bg-tertiary))] px-3 py-2 rounded-apple inline-block">{selectedApp.discordUserId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Country</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-semibold text-lg">{selectedApp.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Timezone</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-semibold text-lg">{selectedApp.timezone || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Age</p>
                      <p className="text-[rgb(var(--color-text-primary))] font-semibold text-lg">{selectedApp.age || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {selectedApp.roleAnswers && Object.keys(selectedApp.roleAnswers).length > 0 ? (
                  <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                    <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                      Role Form Responses
                    </h3>
                    <div className="space-y-5">
                      {Object.entries(selectedApp.roleAnswers)
                        .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
                        .map(([key, value]) => (
                          <div key={key}>
                            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                              {getQuestionTitle(selectedApp.applicationRole, key)}
                            </p>
                            <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* General Questions (Legacy) */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                      <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                        General Questions
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            Tell us about yourself:
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.aboutYourself || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">Why do you want to join the staff team?</p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.whyJoin || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">How much time can you dedicate daily?</p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.dailyAvailability || selectedApp.hoursPerWeek || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">What languages do you speak?</p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.languages || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Moderation Experience (Legacy) */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                      <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                        Moderation Experience
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            Previous moderation experience:
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.moderationExperience || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">What does being a moderator mean to you?</p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.moderatorDefinition || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">Leadership experience:</p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.leadershipExperience || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* VC Availability (Legacy) */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                      <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                        VC Availability
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            Can connect in VC regularly:
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple capitalize">
                            {selectedApp.vcAvailability === 'listen' ? 'Yes, but can listen' : (selectedApp.vcAvailability || 'N/A')}
                          </p>
                        </div>
                        {selectedApp.vcFrequency && (
                          <div>
                            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                              VC frequency:
                            </p>
                            <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                              {selectedApp.vcFrequency}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Discord Bot Experience (Legacy) */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                      <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                        Discord Bot Experience
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            Discord bot experience (1-5):
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.discordBotExperience ? `${selectedApp.discordBotExperience}/5` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            AutoMod knowledge:
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.automodKnowledge || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            Moderation bots familiarity:
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.moderationBotsFamiliarity || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-3 font-semibold">
                            Mod commands knowledge:
                          </p>
                          <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed whitespace-pre-wrap bg-[rgb(var(--color-bg-tertiary))] p-4 rounded-apple">
                            {selectedApp.modCommandsKnowledge || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Admin Notes */}
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                  <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-4">
                    Admin Notes
                  </h3>
                  
                  {/* Display existing notes if they exist */}
                  {selectedApp.notes && (
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-apple">
                      <p className="text-sm text-blue-500 font-semibold mb-2">Saved Notes:</p>
                      <p className="text-[rgb(var(--color-text-primary))] whitespace-pre-wrap">{selectedApp.notes}</p>
                    </div>
                  )}
                  
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-4 bg-[rgb(var(--color-bg-tertiary))] border-2 border-[rgb(var(--color-border))] rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))] text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] resize-none apple-transition font-light"
                    placeholder="Add private notes about this applicant..."
                  />
                  <button
                    onClick={() => updateNotes(selectedApp._id)}
                    className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white hover:shadow-blue-glow font-semibold rounded-apple-lg apple-transition shadow-apple-md"
                  >
                    Save Notes
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                  <button
                    onClick={() => deleteApplication(selectedApp._id)}
                    className="w-full sm:w-auto px-8 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-semibold rounded-apple-lg apple-transition border-2 border-red-500/30"
                  >
                    Delete Application
                  </button>
                  <div className="hidden sm:block flex-1"></div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-8 py-4 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-primary))] font-semibold rounded-apple-lg apple-transition border border-[rgb(var(--color-border))]"
                  >
                    Close
                  </button>
                </div>
                </>
                ) : (
                  <>
                {/* User Data Tab */}
                {selectedApp.userProfile || selectedApp.userStats || selectedApp.modLogs ? (
                  <>
                    {/* User Stats */}
                    {selectedApp.userStats && (
                      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                        <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                          User Activity Stats
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-[rgb(var(--color-bg-tertiary))] p-5 rounded-apple-lg">
                            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Total VC Time</p>
                            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
                              {selectedApp.userStats.vc_duration 
                                ? `${Math.floor(selectedApp.userStats.vc_duration / 3600)}h ${Math.floor((selectedApp.userStats.vc_duration % 3600) / 60)}m`
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-[rgb(var(--color-bg-tertiary))] p-5 rounded-apple-lg">
                            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">VC Sessions</p>
                            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
                              {selectedApp.userStats.vc_sessions?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-[rgb(var(--color-bg-tertiary))] p-5 rounded-apple-lg">
                            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-2 font-medium">Messages Sent</p>
                            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">
                              {selectedApp.userStats.message_count?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Moderation Logs */}
                    {selectedApp.modLogs && selectedApp.modLogs.length > 0 ? (
                      <div className="bg-[rgb(var(--color-bg-secondary))] rounded-apple-lg p-6 border border-[rgb(var(--color-border))] shadow-apple-sm">
                        <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-5">
                          Moderation History
                          <span className="ml-3 px-3 py-1 text-sm bg-red-500 text-white rounded-full">
                            {selectedApp.modLogs.length} {selectedApp.modLogs.length === 1 ? 'case' : 'cases'}
                          </span>
                        </h3>
                        <div className="space-y-4">
                          {selectedApp.modLogs.map((log: any, index: number) => {
                            const action = (log.action || log.action_type || 'Unknown').toUpperCase();
                            const isMute = action === 'MUTE';
                            const borderColor = action === 'BAN' ? 'border-red-500' : 
                                               action === 'MUTE' ? 'border-orange-500' : 
                                               action === 'WARN' ? 'border-yellow-500' : 
                                               action === 'KICK' ? 'border-amber-500' : 'border-gray-500';
                            const actionBgColor = action === 'BAN' ? 'bg-red-500/20 text-red-500' : 
                                                  action === 'MUTE' ? 'bg-orange-500/20 text-orange-500' : 
                                                  action === 'WARN' ? 'bg-yellow-500/20 text-yellow-500' : 
                                                  action === 'KICK' ? 'bg-amber-500/20 text-amber-500' :
                                                  action === 'UNBAN' ? 'bg-green-500/20 text-green-500' :
                                                  action === 'UNMUTE' ? 'bg-blue-500/20 text-blue-500' : 'bg-gray-500/20 text-gray-400';
                            
                            // Format duration properly - show "Muted" if duration is 0 or very short for mutes
                            const formatDuration = (seconds: number | undefined | null) => {
                              if (!seconds || seconds <= 0) return null;
                              const days = Math.floor(seconds / 86400);
                              const hours = Math.floor((seconds % 86400) / 3600);
                              const minutes = Math.floor((seconds % 3600) / 60);
                              if (days > 0) return `${days}d ${hours}h`;
                              if (hours > 0) return `${hours}h ${minutes}m`;
                              if (minutes > 0) return `${minutes}m`;
                              return null;
                            };
                            
                            const durationDisplay = formatDuration(log.duration_seconds);

                            return (
                              <div 
                                key={index}
                                className={`bg-[rgb(var(--color-bg-tertiary))] p-5 rounded-apple-lg border-l-4 ${borderColor}`}
                              >
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {log.case_number && (
                                        <span className="px-2.5 py-1 bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-secondary))] rounded-apple font-mono text-xs">
                                          #{log.case_number}
                                        </span>
                                      )}
                                      <span className={`px-3 py-1 rounded-apple font-semibold text-sm uppercase ${actionBgColor}`}>
                                        {action}
                                      </span>
                                      {log.active === false && (
                                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">Revoked</span>
                                      )}
                                    </div>
                                    {log.created_at && (
                                      <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                        {new Date(log.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {log.moderator_id && (
                                    <div className="flex items-center gap-3 text-sm">
                                      {log.moderator_avatar_url && (
                                        <img 
                                          src={log.moderator_avatar_url}
                                          alt={log.moderator_display_name || 'Moderator'}
                                          className="w-8 h-8 rounded-full border border-[rgb(var(--color-border))]"
                                          onError={(e) => {
                                            const defaultIndex = Number(BigInt(log.moderator_id) >> 22n) % 6;
                                            e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
                                          }}
                                        />
                                      )}
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span className="text-[rgb(var(--color-text-tertiary))]">Moderator:</span>
                                        <span className="text-[rgb(var(--color-text-secondary))] font-medium">
                                          {log.moderator_display_name || log.moderator_username || 'Unknown'}
                                        </span>
                                        <span className="text-[rgb(var(--color-text-tertiary))] font-mono text-xs bg-[rgb(var(--color-bg-secondary))] px-2 py-0.5 rounded">
                                          {log.moderator_id}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {log.reason && (
                                    <div>
                                      <span className="text-sm font-semibold text-[rgb(var(--color-text-primary))]">Reason: </span>
                                      <span className="text-[rgb(var(--color-text-secondary))]">{log.reason}</span>
                                    </div>
                                  )}
                                  
                                  {isMute && durationDisplay && (
                                    <div className="text-sm text-[rgb(var(--color-text-tertiary))]">
                                      Duration: {durationDisplay}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-apple-lg p-6 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-green-500 mb-2">Clean Record</h3>
                        <p className="text-[rgb(var(--color-text-secondary))]">This user has no moderation history</p>
                      </div>
                    )}

                    {selectedApp.dataFetchedAt && (
                      <div className="text-center text-sm text-[rgb(var(--color-text-tertiary))]">
                        Data fetched on {new Date(selectedApp.dataFetchedAt).toLocaleString()}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple-lg p-12 text-center">
                    <svg className="w-20 h-20 mx-auto mb-4 text-[rgb(var(--color-text-tertiary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">No User Data Available</h3>
                    <p className="text-[rgb(var(--color-text-secondary))]">
                      User data was not fetched when this application was submitted
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Role Form Toggles */}
      <div className="mb-6 bg-discord-light/50 rounded-xl p-4 sm:p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-white">Dedicated Role Forms</h2>
          <span className="text-xs text-gray-400">Toggle role form availability</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {STAFF_ROLES.map((role) => {
            const roleConfig = roleForms[role.id] || { isOpen: true, closedMessage: '' };
            return (
              <div key={role.id} className="rounded-lg border border-gray-700 bg-discord-dark/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{role.label}</p>
                    <p className={`text-xs font-semibold ${roleConfig.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                      {roleConfig.isOpen ? 'OPEN' : 'CLOSED'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleRoleForm(role.id)}
                    disabled={settingsLoading}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors disabled:opacity-50 ${
                      roleConfig.isOpen ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                        roleConfig.isOpen ? 'translate-x-9' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )}
</div>
  );
}
