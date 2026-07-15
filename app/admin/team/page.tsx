'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
export default function TeamManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        body: JSON.stringify({ discord_user_id: discordUserId, designation }),
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
    if (searchQuery) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };
  const handleDragEnter = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex || searchQuery) return;
    const updated = [...members];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    setDraggedIndex(targetIndex);
    setMembers(updated);
  };
  const handleDragEnd = async () => {
    setDraggedIndex(null);
    if (searchQuery) return;
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
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    const discordId = member.discord_user_id.toLowerCase();
    const designation = member.designation.toLowerCase();
    const username = member.profile?.username?.toLowerCase() || '';
    const displayName = member.profile?.displayName?.toLowerCase() || '';
    return (
      discordId.includes(query) ||
      designation.includes(query) ||
      username.includes(query) ||
      displayName.includes(query)
    );
  });
  const getDesignationBadgeClass = (role: string) => {
    switch (role) {
      case 'Founder':
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/35';
      case 'Bot Developer':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20';
      case 'Management':
        return 'bg-purple-500/10 text-purple-400 border border-purple-400/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-400/20';
    }
  };
  if (hasPermission === null || loading && members.length === 0) {
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
      {}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl animate-fade-in">
          <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:opacity-75">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl animate-fade-in">
          <FiCheck className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto hover:opacity-75">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
      {}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
            <FiUsers className="text-blue-500 w-6 h-6" />
            Team Management
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            Manage the community's staff hierarchy and designations.
          </p>
        </div>
        <button
          onClick={() => {
            setDiscordUserId('');
            setDesignation('Founder');
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/15 text-sm"
        >
          <FiPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>
      {}
      <div className="flex gap-3">
        <div className="relative flex-grow">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-tertiary))] w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, ID, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/50 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <button
          onClick={fetchMembers}
          className="p-2.5 border border-[rgb(var(--color-border))] rounded-xl hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-secondary))] transition-colors"
          title="Refresh"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {}
      <div className="glass-blue rounded-3xl border border-[rgb(var(--color-border))] overflow-hidden shadow-apple-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))]/30 text-[rgb(var(--color-text-secondary))] font-semibold">
                {!searchQuery && <th className="w-10 px-4 py-4"></th>}
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
                  <td colSpan={searchQuery ? 5 : 6} className="px-6 py-12 text-center text-[rgb(var(--color-text-tertiary))]">
                    {loading ? 'Refreshing members...' : 'No team members found.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    draggable={!searchQuery}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-[rgb(var(--color-hover))]/20 transition-colors ${
                      draggedIndex === index ? 'opacity-40 bg-[rgb(var(--color-hover))]/40 border-y border-dashed border-blue-500/50' : ''
                    }`}
                  >
                    {!searchQuery && (
                      <td className="px-4 py-4 text-center align-middle">
                        <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-[rgb(var(--color-hover))]/50 rounded-lg inline-flex items-center text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
                          <FiMenu className="w-4 h-4" />
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))]">
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
                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-[rgb(var(--color-text-tertiary))]">
                              ?
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[rgb(var(--color-text-primary))]">
                            {member.profile?.displayName || 'Unknown Member'}
                          </p>
                          <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                            {member.profile ? `@${member.profile.username}` : 'Direct fetch failed'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
                        {member.discord_user_id}
                        <button
                          onClick={() => copyToClipboard(member.discord_user_id)}
                          className="text-[rgb(var(--color-text-tertiary))] hover:text-blue-500 transition-colors p-1"
                          title="Copy ID"
                        >
                          {copiedId === member.discord_user_id ? (
                            <FiCheck className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <FiCopy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getDesignationBadgeClass(member.designation)}`}>
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
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setDesignation(member.designation);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-[rgb(var(--color-text-secondary))] hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"
                          title="Edit Designation"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(member.id)}
                          className="p-1.5 text-[rgb(var(--color-text-secondary))] hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
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
      {}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-blue w-full max-w-md rounded-3xl border border-[rgb(var(--color-border))] p-6 shadow-apple-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Add Team Member</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] rounded-lg hover:bg-[rgb(var(--color-hover))]"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--color-text-secondary))] mb-1.5">
                  Discord User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 929297205796417597"
                  value={discordUserId}
                  onChange={(e) => setDiscordUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))]/50 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--color-text-secondary))] mb-1.5">
                  Designation
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] focus:outline-none focus:border-blue-500 text-sm text-[rgb(var(--color-text-primary))]"
                >
                  <option value="Founder">Founder</option>
                  <option value="Bot Developer">Bot Developer</option>
                  <option value="Management">Management</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
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
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-blue w-full max-w-md rounded-3xl border border-[rgb(var(--color-border))] p-6 shadow-apple-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Edit Designation</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedMember(null);
                }}
                className="p-1 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] rounded-lg hover:bg-[rgb(var(--color-hover))]"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--color-text-secondary))] mb-1.5">
                  Member Details
                </label>
                <div className="p-3 bg-[rgb(var(--color-bg-tertiary))]/50 rounded-xl flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[rgb(var(--color-bg-tertiary))]">
                    {selectedMember.profile?.avatar ? (
                      <img
                        src={selectedMember.profile.avatar}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src.includes('.gif')) {
                            target.src = target.src.replace('.gif', '.webp');
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[rgb(var(--color-text-tertiary))] font-semibold">?</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{selectedMember.profile?.displayName || 'Unknown'}</p>
                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">{selectedMember.discord_user_id}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--color-text-secondary))] mb-1.5">
                  Designation
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] focus:outline-none focus:border-blue-500 text-sm text-[rgb(var(--color-text-primary))]"
                >
                  <option value="Founder">Founder</option>
                  <option value="Bot Developer">Bot Developer</option>
                  <option value="Management">Management</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
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
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-blue w-full max-w-sm rounded-3xl border border-[rgb(var(--color-border))] p-6 shadow-apple-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <FiAlertCircle className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-lg font-bold">Remove Team Member?</h2>
            </div>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6 leading-relaxed">
              Are you sure you want to remove this member from the team? This action will immediately remove their presentation from the website's About Us page.
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
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-red-500/15 flex items-center justify-center gap-2"
              >
                {submitting ? 'Removing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}