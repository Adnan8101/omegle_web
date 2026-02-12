'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Application {
  _id: string;
  discordUsername: string;
  discordUserId: string;
  country: string;
  availableTime: string;
  age: string;
  aboutYourself?: string;
  moderatorDefinition: string;
  experience: string;
  voiceChat: string;
  serviceLength: string;
  discordBotExperience: number;
  ethicalDilemma: string;
  conflictResolution: string;
  contentModeration: string;
  priorityScenario: string;
  patternRecognition: string;
  status: 'pending' | 'considered' | 'denied';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

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
  }, [activeTab, searchTerm]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (result.success) {
        setIsApplicationsOpen(result.data.isOpen);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
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
        if (selectedApp?._id === id) {
          setSelectedApp(result.data);
        }
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

  const openModal = (app: Application) => {
    setSelectedApp(app);
    setNotes(app.notes || '');
    setShowModal(true);
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Staff Applications</h1>
            <p className="text-gray-400">Review and manage all staff applications</p>
          </div>
          
          {/* Application Status Toggle */}
          <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Application Status</p>
                <p className={`text-lg font-bold ${isApplicationsOpen ? 'text-green-500' : 'text-red-500'}`}>
                  {isApplicationsOpen ? 'OPEN' : 'CLOSED'}
                </p>
              </div>
              <button
                onClick={toggleApplications}
                disabled={settingsLoading}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-discord-dark disabled:opacity-50 ${
                  isApplicationsOpen ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                    isApplicationsOpen ? 'translate-x-12' : 'translate-x-1'
                  }`}
                />
                <span className={`absolute text-xs font-bold ${isApplicationsOpen ? 'left-2 text-white' : 'right-2 text-white'}`}>
                  {isApplicationsOpen ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-discord-blurple text-white shadow-lg'
                : 'bg-discord-light text-gray-300 hover:bg-discord-light/80'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-700'
              }`}
            >
              {activeTab === tab.id ? applications.length : tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by country, age, or content..."
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
      ) : applications.length === 0 ? (
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
              : 'Applications will appear here once submitted'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((app) => (
            <div
              key={app._id}
              className="bg-discord-light/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer"
              onClick={() => openModal(app)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-white">
                      Applicant from {app.country}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
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
                      <span>Age: {app.age}</span>
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
                      <span>{app.availableTime}</span>
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
                      <span>
                        {new Date(app.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {app.aboutYourself && (
                    <p className="mt-3 text-gray-300 text-sm line-clamp-2">
                      {app.aboutYourself}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(app);
                    }}
                    className="p-2 bg-discord-blurple/20 hover:bg-discord-blurple/30 rounded-lg transition-colors"
                  >
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-discord-dark rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-discord-dark border-b border-gray-700 p-6 flex items-center justify-between z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Application Details
                </h2>
                <p className="text-gray-400 text-sm">
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
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-discord-light rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-400"
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

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Management */}
              <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Application Status
                </h3>
                <div className="flex gap-2">
                  {['pending', 'considered', 'denied'].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApp._id,
                          status as 'pending' | 'considered' | 'denied'
                        )
                      }
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        selectedApp.status === status
                          ? getStatusColor(status) + ' border'
                          : 'bg-discord-light text-gray-400 hover:bg-discord-light/80'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Discord Username</p>
                    <p className="text-white font-medium">{selectedApp.discordUsername}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Discord User ID</p>
                    <p className="text-white font-mono text-sm">{selectedApp.discordUserId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Country</p>
                    <p className="text-white font-medium">{selectedApp.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Age</p>
                    <p className="text-white font-medium">{selectedApp.age}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-400 mb-1">Available Time</p>
                    <p className="text-white font-medium">
                      {selectedApp.availableTime}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-400 mb-1">Voice Chat</p>
                    <p className="text-white font-medium">{selectedApp.voiceChat}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-400 mb-1">
                      Discord Bot Experience
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-discord-darker rounded-full overflow-hidden">
                        <div
                          className="h-full bg-discord-blurple rounded-full"
                          style={{
                            width: `${(selectedApp.discordBotExperience / 5) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-white font-medium">
                        {selectedApp.discordBotExperience}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              {selectedApp.aboutYourself && (
                <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    About Themselves
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {selectedApp.aboutYourself}
                  </p>
                </div>
              )}

              {/* Moderation Understanding */}
              <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Understanding of Moderation
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">
                      What it means to be a moderator:
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.moderatorDefinition}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Previous Experience:</p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.experience}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Service Commitment:</p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.serviceLength}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scenario Responses */}
              <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Scenario-Based Responses
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-discord-fuchsia font-semibold mb-2">
                      Scenario 1: Ethical Dilemma (Moderator Favoritism)
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.ethicalDilemma}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-discord-fuchsia font-semibold mb-2">
                      Scenario 2: Conflict Resolution
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.conflictResolution}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-discord-fuchsia font-semibold mb-2">
                      Scenario 3: Content Moderation Gray Area
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.contentModeration}
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Thinking */}
              <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Critical Thinking & Logic
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-discord-green font-semibold mb-2">
                      Priority Management (Multiple Emergencies)
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.priorityScenario}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-discord-green font-semibold mb-2">
                      Pattern Recognition (Subtle Instigator)
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedApp.patternRecognition}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="bg-discord-light/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Admin Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-discord-darker border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-discord-blurple text-white placeholder-gray-500 resize-none"
                  placeholder="Add private notes about this applicant..."
                />
                <button
                  onClick={() => updateNotes(selectedApp._id)}
                  className="mt-3 px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white font-semibold rounded-lg transition-colors"
                >
                  Save Notes
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => deleteApplication(selectedApp._id)}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-semibold rounded-lg transition-colors border border-red-500/30"
                >
                  Delete Application
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-discord-light hover:bg-discord-light/80 text-white font-semibold rounded-lg transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
