'use client';

import { useEffect, useState } from 'react';
import { X, Clock, Hash, Users, Calendar, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface SharedSessionsModalProps {
  userId: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar: string;
  onClose: () => void;
  onSessionClick: (sessionId: string) => void;
}

interface SharedSession {
  session_id: string;
  channel_id: string;
  channel_name: string;
  user1_joined: string;
  user1_left: string | null;
  user1_duration: number;
  user2_joined: string;
  user2_left: string | null;
  user2_duration: number;
  overlap_start: string;
  overlap_end: string | null;
  overlap_duration: number;
}

export default function SharedSessionsModal({
  userId,
  targetUserId,
  targetUserName,
  targetUserAvatar,
  onClose,
  onSessionClick,
}: SharedSessionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SharedSession[]>([]);

  useEffect(() => {
    fetchSharedSessions();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchSharedSessions = async () => {
    try {
      console.log('Fetching shared sessions for:', userId, 'and', targetUserId);
      const res = await fetch(`/api/vctranscript/shared-sessions/${userId}/${targetUserId}`);
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Shared sessions data:', data);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching shared sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-8 max-w-4xl w-full mx-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
            <p className="text-[rgb(var(--color-text-secondary))] text-sm">Loading shared sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[rgb(var(--color-border))] flex flex-col" 
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Header - Compact */}
        <div className="p-5 border-b border-[rgb(var(--color-border))] flex-shrink-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-500/40 flex-shrink-0">
                <Image src={targetUserAvatar} alt={targetUserName} fill className="object-cover" unoptimized />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Shared VC Sessions
                </h2>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                  with <span className="font-semibold text-blue-400">{targetUserName}</span> • {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[rgb(var(--color-hover))] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session, idx) => (
                <div
                  key={idx}
                  onClick={() => onSessionClick(session.session_id)}
                  className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4 border border-[rgb(var(--color-border))] hover:border-blue-500/50 transition-all cursor-pointer group"
                >
                  {/* Channel Header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[rgb(var(--color-border))]">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-[rgb(var(--color-text-primary))]">
                        {session.channel_name || session.channel_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-text-tertiary))]">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateTime(session.overlap_start)}
                    </div>
                  </div>

                  {/* Time Breakdown - Horizontal Layout */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Overlap Duration - Highlighted */}
                    <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Together</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400 mb-1">{formatDuration(session.overlap_duration)}</p>
                      <div className="text-[10px] text-[rgb(var(--color-text-tertiary))] leading-tight">
                        {formatDateTime(session.overlap_start).split(',')[1]}
                        {session.overlap_end ? (
                          <> → {formatDateTime(session.overlap_end).split(',')[1]}</>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 ml-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Your Duration */}
                    <div className="bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-semibold uppercase tracking-wide">You</span>
                      </div>
                      <p className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-1">{formatDuration(session.user1_duration)}</p>
                      <div className="text-[10px] text-[rgb(var(--color-text-tertiary))] leading-tight">
                        {formatDateTime(session.user1_joined).split(',')[1]}
                        {session.user1_left && (
                          <> → {formatDateTime(session.user1_left).split(',')[1]}</>
                        )}
                      </div>
                    </div>

                    {/* Their Duration */}
                    <div className="bg-[rgb(var(--color-bg-primary))] border border-[rgb(var(--color-border))] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-purple-400 font-semibold uppercase tracking-wide truncate">{targetUserName}</span>
                      </div>
                      <p className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-1">{formatDuration(session.user2_duration)}</p>
                      <div className="text-[10px] text-[rgb(var(--color-text-tertiary))] leading-tight">
                        {formatDateTime(session.user2_joined).split(',')[1]}
                        {session.user2_left && (
                          <> → {formatDateTime(session.user2_left).split(',')[1]}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer hint */}
                  <div className="mt-3 pt-2 border-t border-[rgb(var(--color-border))] flex items-center justify-center text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Click for full session details</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
              <p className="text-[rgb(var(--color-text-secondary))]">No shared sessions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
