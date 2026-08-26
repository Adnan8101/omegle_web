'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
  FiCopy,
  FiMenu,
  FiAward,
  FiShield,
  FiZap,
} from 'react-icons/fi';

interface TeamMember {
  id: string;
  discord_user_id: string;
  designation: string;
  created_at: string;
  profile?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    banner: string | null;
    accentColor: string | null;
  } | null;
}

const DESIGNATION_OPTIONS = [
  { value: 'Founder', label: 'Founder', icon: FiAward, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { value: 'Admin', label: 'Admin', icon: FiShield, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { value: 'Core Team', label: 'Core Team', icon: FiZap, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
];

export default function TeamManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [discordUserId, setDiscordUserId] = useState('');
  const [designation, setDesignation] = useState('Founder');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/admin');
      return;
    }
    if (status === 'authenticated') {
      const perms = session?.user?.permissions;
      const canAccess = perms?.hasFullAccess;
      if (!canAccess) {
        setHasPermission(false);
        if (perms?.hasSrModAccess || perms?.hasModeratorAccess || perms?.hasViewOnlyAccess) {
          router.push('/admin/vctranscript');
        } else {
          router.push('/admin');
        }
        return;
      }
      setHasPermission(true);
    }
  }, [status, session, router]);

  useEffect(() => {
    if (hasPermission) {
      fetchMembers();
    }
  }, [hasPermission]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/team', { cache: 'no-store' });
      const resData = await response.json();
      if (response.ok) {
        setMembers(resData.data || []);
      } else {
        setError(resData.error || 'Failed to load team members');
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('An unexpected error occurred while loading team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_user_id: discordUserId.trim(), designation }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Team member added successfully!');
        setDiscordUserId('');
        setDesignation('Founder');
        setIsAddModalOpen(false);
        fetchMembers();
      } else {
        setError(data.error || 'Failed to add team member');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/team/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designation }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Designation updated successfully!');
        setIsEditModalOpen(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        setError(data.error || 'Failed to update designation');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteConfirmId) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/team/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Team member deleted successfully.');
        setDeleteConfirmId(null);
        fetchMembers();
      } else {
        setError(data.error || 'Failed to delete team member');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (searchQuery || selectedFilter !== 'ALL') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragEnter = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex || searchQuery || selectedFilter !== 'ALL') return;
    const updated = [...members];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    setDraggedIndex(targetIndex);
    setMembers(updated);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    if (searchQuery || selectedFilter !== 'ALL') return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const reorderedList = members.map((m, idx) => ({
        id: m.id,
        position: idx,
      }));
      const response = await fetch('/api/admin/team/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: reorderedList }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Team order updated successfully!');
      } else {
        setError(data.error || 'Failed to update team positions');
        fetchMembers();
      }
    } catch (err) {
      setError('An unexpected error occurred while reordering');
      fetchMembers();
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const total = members.length;
    const founders = members.filter((m) => m.designation === 'Founder' || m.designation?.toLowerCase() === 'founder').length;
    const admins = members.filter((m) => m.designation === 'Admin' || m.designation?.toLowerCase() === 'admin').length;
    const core = members.filter(
      (m) =>
        m.designation === 'Core Team' ||
        m.designation?.toLowerCase() === 'core team'
    ).length;
    return { total, founders, admins, core };
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const query = searchQuery.toLowerCase();
      const discordId = member.discord_user_id.toLowerCase();
      const des = member.designation.toLowerCase();
      const username = member.profile?.username?.toLowerCase() || '';
      const displayName = member.profile?.displayName?.toLowerCase() || '';
      const matchesSearch =
        discordId.includes(query) ||
        des.includes(query) ||
        username.includes(query) ||
        displayName.includes(query);

      if (!matchesSearch) return false;

      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === 'Founder') return member.designation === 'Founder' || des === 'founder';
      if (selectedFilter === 'Admin') return member.designation === 'Admin' || des === 'admin';
      if (selectedFilter === 'Core Team') {
        return member.designation === 'Core Team' || des === 'core team';
      }
      return true;
    });
  }, [members, searchQuery, selectedFilter]);

  const getDesignationBadgeClass = (role: string) => {
    switch (role) {
      case 'Founder':
        return 'bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10';
      case 'Admin':
        return 'bg-gradient-to-r from-rose-500/20 via-red-500/15 to-pink-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/10';
      case 'Core Team':
        return 'bg-gradient-to-r from-purple-500/20 via-indigo-500/15 to-violet-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10';
      default:
        return 'bg-gray-500/10 text-gray-300 border border-gray-400/20';
    }
  };

  if (hasPermission === null || (loading && members.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))]">Loading team details...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      {/* Alert Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl animate-fade-in backdrop-blur-md">
          <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:opacity-75 p-1">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl animate-fade-in backdrop-blur-md">
          <FiCheck className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto hover:opacity-75 p-1">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FiUsers className="w-5 h-5" />
            </div>
            Team Management
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            Configure Omeglee&apos;s leadership hierarchy: Founder, Admin, and Core Team.
          </p>
        </div>
        <button
          onClick={() => {
            setDiscordUserId('');
            setDesignation('Founder');
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 text-sm active:scale-95"
        >
          <FiPlus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Overview Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setSelectedFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedFilter === 'ALL'
              ? 'bg-blue-500/15 border-blue-500/40 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30'
              : 'glass-blue border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border))]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[rgb(var(--color-text-secondary))]">All Members</span>
            <FiUsers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-[rgb(var(--color-text-primary))] mt-2">{counts.total}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('Founder')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedFilter === 'Founder'
              ? 'bg-amber-500/15 border-amber-500/40 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30'
              : 'glass-blue border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border))]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Founders</span>
            <FiAward className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-300 mt-2">{counts.founders}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('Admin')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedFilter === 'Admin'
              ? 'bg-rose-500/15 border-rose-500/40 shadow-sm shadow-rose-500/10 ring-1 ring-rose-500/30'
              : 'glass-blue border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border))]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">Admins</span>
            <FiShield className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-extrabold text-rose-300 mt-2">{counts.admins}</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('Core Team')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedFilter === 'Core Team'
              ? 'bg-purple-500/15 border-purple-500/40 shadow-sm shadow-purple-500/10 ring-1 ring-purple-500/30'
              : 'glass-blue border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border))]/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300">Core Team</span>
            <FiZap className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-purple-300 mt-2">{counts.core}</p>
        </button>
      </div>

      {/* Search & Refresh Controls */}
      <div className="flex gap-3">
        <div className="relative flex-grow">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-tertiary))] w-4 h-4" />
          <input
            type="text"
            placeholder="Search by username, Discord ID, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/50 focus:outline-none focus:border-blue-500 text-sm text-[rgb(var(--color-text-primary))] transition-all placeholder:text-[rgb(var(--color-text-tertiary))]"
          />
        </div>
        <button
          onClick={fetchMembers}
          className="p-2.5 border border-[rgb(var(--color-border))] rounded-xl hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors flex items-center justify-center shadow-sm"
          title="Refresh List"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Team Members Table */}
      <div className="glass-blue rounded-3xl border border-[rgb(var(--color-border))] overflow-hidden shadow-apple-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))]/40 text-[rgb(var(--color-text-secondary))] font-semibold">
                {!searchQuery && selectedFilter === 'ALL' && <th className="w-10 px-4 py-4"></th>}
                <th className="px-6 py-4">Profile</th>
                <th className="px-6 py-4">Discord ID</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Added On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--color-border))]/50">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={!searchQuery && selectedFilter === 'ALL' ? 6 : 5} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FiUsers className="w-8 h-8 text-[rgb(var(--color-text-tertiary))] opacity-50" />
                      <p className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                        {loading ? 'Loading team members...' : 'No team members match your criteria.'}
                      </p>
                      {!loading && (
                        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                          Add a new member above to get started.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    draggable={!searchQuery && selectedFilter === 'ALL'}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-[rgb(var(--color-hover))]/25 transition-colors group ${
                      draggedIndex === index ? 'opacity-40 bg-[rgb(var(--color-hover))]/40 border-y border-dashed border-blue-500/50' : ''
                    }`}
                  >
                    {!searchQuery && selectedFilter === 'ALL' && (
                      <td className="px-4 py-4 text-center align-middle">
                        <div className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-[rgb(var(--color-hover))]/60 rounded-lg inline-flex items-center text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
                          <FiMenu className="w-4 h-4" />
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] ring-2 ring-white/5">
                          {member.profile?.avatar ? (
                            <img
                              src={member.profile.avatar}
                              alt={member.profile.displayName}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src.includes('.gif')) {
                                  target.src = target.src.replace('.gif', '.webp');
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[rgb(var(--color-text-tertiary))]">
                              {member.profile?.displayName ? member.profile.displayName.substring(0, 2).toUpperCase() : '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[rgb(var(--color-text-primary))] group-hover:text-blue-400 transition-colors">
                            {member.profile?.displayName || 'Unknown Member'}
                          </p>
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                            {member.profile ? `@${member.profile.username}` : 'Direct fetch failed'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-[rgb(var(--color-text-secondary))] inline-flex items-center gap-1.5 bg-[rgb(var(--color-bg-tertiary))]/50 px-2.5 py-1 rounded-lg border border-[rgb(var(--color-border))]/60">
                        {member.discord_user_id}
                        <button
                          onClick={() => copyToClipboard(member.discord_user_id)}
                          className="text-[rgb(var(--color-text-tertiary))] hover:text-blue-400 transition-colors p-0.5"
                          title="Copy ID"
                        >
                          {copiedId === member.discord_user_id ? (
                            <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <FiCopy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5 ${getDesignationBadgeClass(member.designation)}`}>
                        {member.designation === 'Founder' && <FiAward className="w-3.5 h-3.5" />}
                        {member.designation === 'Admin' && <FiShield className="w-3.5 h-3.5" />}
                        {member.designation === 'Core Team' && <FiZap className="w-3.5 h-3.5" />}
                        {member.designation}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[rgb(var(--color-text-secondary))]">
                      {new Date(member.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setDesignation(member.designation || 'Founder');
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-[rgb(var(--color-text-secondary))] hover:text-blue-400 rounded-xl hover:bg-blue-500/10 transition-colors"
                          title="Edit Designation"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(member.id)}
                          className="p-2 text-[rgb(var(--color-text-secondary))] hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                          title="Delete Member"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="glass-blue w-full max-w-md rounded-3xl border border-[rgb(var(--color-border))] p-6 shadow-apple-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <FiPlus className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Add Team Member</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-2">
                  Discord User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 929297205796417597"
                  value={discordUserId}
                  onChange={(e) => setDiscordUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/60 focus:outline-none focus:border-blue-500 text-sm text-[rgb(var(--color-text-primary))]"
                />
                <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] mt-1.5">
                  The avatar, username, and banner are automatically fetched from Discord.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-2">
                  Designation / Role
                </label>

                {/* Quick Selection Chips */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {DESIGNATION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = designation === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDesignation(opt.value)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? `${opt.bg} ${opt.border} ${opt.color} ring-1 ring-white/20 shadow-md`
                            : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/40 text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown for Accessibility */}
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] focus:outline-none focus:border-blue-500 text-sm text-[rgb(var(--color-text-primary))]"
                >
                  <option value="Founder">Founder</option>
                  <option value="Admin">Admin</option>
                  <option value="Core Team">Core Team</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-[rgb(var(--color-border))] rounded-xl font-semibold text-sm hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Designation Modal */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="glass-blue w-full max-w-md rounded-3xl border border-[rgb(var(--color-border))] p-6 shadow-apple-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <FiEdit2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Edit Designation</h2>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedMember(null);
                }}
                className="p-1.5 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditMember} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-2">
                  Member Details
                </label>
                <div className="p-3.5 bg-[rgb(var(--color-bg-tertiary))]/60 rounded-2xl flex items-center gap-3 border border-[rgb(var(--color-border))]/60">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))]">
                    {selectedMember.profile?.avatar ? (
                      <img
                        src={selectedMember.profile.avatar}
                        className="object-cover w-full h-full"
                        alt={selectedMember.profile?.displayName}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src.includes('.gif')) {
                            target.src = target.src.replace('.gif', '.webp');
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[rgb(var(--color-text-tertiary))] font-bold">?</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[rgb(var(--color-text-primary))] truncate">
                      {selectedMember.profile?.displayName || 'Unknown Member'}
                    </p>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] font-mono">{selectedMember.discord_user_id}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-2">
                  Designation / Role
                </label>

                {/* Quick Selection Chips */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {DESIGNATION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = designation === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDesignation(opt.value)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? `${opt.bg} ${opt.border} ${opt.color} ring-1 ring-white/20 shadow-md`
                            : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/40 text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown for Accessibility */}
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] focus:outline-none focus:border-blue-500 text-sm text-[rgb(var(--color-text-primary))]"
                >
                  <option value="Founder">Founder</option>
                  <option value="Admin">Admin</option>
                  <option value="Core Team">Core Team</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 py-2.5 border border-[rgb(var(--color-border))] rounded-xl font-semibold text-sm hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="glass-blue w-full max-w-sm rounded-3xl border border-red-500/30 p-6 shadow-apple-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <FiAlertCircle className="w-6 h-6 flex-shrink-0" />
              </div>
              <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Remove Member?</h2>
            </div>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6 leading-relaxed">
              Are you sure you want to remove this member from the team roster? This change will immediately remove them from the public Team page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-[rgb(var(--color-border))] rounded-xl font-semibold text-sm hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
              >
                {submitting ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}