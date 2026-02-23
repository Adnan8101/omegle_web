'use client';

import { useEffect, useState } from 'react';
import { X, Users, Clock, MessageSquare, Mic, MicOff, Video, VideoOff, Monitor, TrendingUp, Calendar, Hash, ArrowRight, LogIn, LogOut } from 'lucide-react';
import Image from 'next/image';

interface SessionModalProps {
  sessionId: string;
  onClose: () => void;
}

interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  tag: string;
  inGuild: boolean;
}

interface OverlappingUser {
  user_id: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number;
  messages_sent: number;
  mute_count: number;
  unmute_count: number;
  deaf_count: number;
  undeaf_count: number;
  video_on_count: number;
  video_off_count: number;
  screen_share_start: number;
  screen_share_stop: number;
  join_order: number | null;
  is_rejoin: boolean;
}

interface TimelineEvent {
  type: string;
  userId: string;
  timestamp: string;
  relativeTime: number;
  joinOrder?: number;
  count?: number;
}

export default function SessionModal({ sessionId, onClose }: SessionModalProps) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [overlappingUsers, setOverlappingUsers] = useState<OverlappingUser[]>([]);
  const [users, setUsers] = useState<Map<string, DiscordUser>>(new Map());
  const [channel, setChannel] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'timeline'>('overview');

  useEffect(() => {
    fetchSessionDetails();
    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const sessionRes = await fetch(`/api/vctranscript/session/${sessionId}`);
      const sessionData = await sessionRes.json();
      
      setSession(sessionData.session);
      setTimeline(sessionData.timeline || []);
      setOverlappingUsers(sessionData.overlappingUsers || []);

      // Fetch channel info (try cached first, fallback to Discord API)
      let channelData = null;
      try {
        const cachedChRes = await fetch('/api/discord/cached-channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelIds: [sessionData.session.channel_id] }),
        });
        const cachedChData = await cachedChRes.json();
        if (cachedChData.channels?.[sessionData.session.channel_id]) {
          channelData = cachedChData.channels[sessionData.session.channel_id];
        }
      } catch {}
      if (!channelData) {
        try {
          const channelRes = await fetch(`/api/discord/channel/${sessionData.session.channel_id}`);
          channelData = await channelRes.json();
        } catch {}
      }
      setChannel(channelData);

      // Collect all unique user IDs
      const uniqueUserIds = [...new Set([
        sessionData.session.user_id,
        ...(sessionData.overlappingUsers || []).map((u: any) => u.user_id),
        ...(sessionData.timeline || []).map((e: any) => e.userId),
      ])];

      // Batch fetch all Discord users (try cached first, fallback to API)
      if (uniqueUserIds.length > 0) {
        try {
          const cachedRes = await fetch('/api/discord/cached-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: uniqueUserIds }),
          });
          const cachedData = await cachedRes.json();
          if (cachedData.users && Object.keys(cachedData.users).length > 0) {
            setUsers(new Map(Object.entries(cachedData.users)));
          } else {
            throw new Error('No cached data');
          }
        } catch {
          const batchRes = await fetch('/api/discord/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: uniqueUserIds }),
          });
          const batchData = await batchRes.json();
          if (batchData.users) {
            setUsers(new Map(Object.entries(batchData.users)));
          }
        }
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatFullDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'user_join': return <LogIn className="w-4 h-4 text-green-400" />;
      case 'user_leave': return <LogOut className="w-4 h-4 text-red-400" />;
      case 'session_start': return <Mic className="w-4 h-4 text-blue-400" />;
      case 'session_end': return <MicOff className="w-4 h-4 text-gray-400" />;
      case 'video_on': return <Video className="w-4 h-4 text-yellow-400" />;
      case 'video_off': return <VideoOff className="w-4 h-4 text-yellow-600" />;
      case 'screen_share_start': return <Monitor className="w-4 h-4 text-cyan-400" />;
      case 'screen_share_stop': return <Monitor className="w-4 h-4 text-cyan-600" />;
      default: return <ArrowRight className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventLabel = (type: string, event?: TimelineEvent) => {
    switch(type) {
      case 'user_join': return event?.joinOrder ? `Joined Channel (#${event.joinOrder} to join)` : 'Joined Channel';
      case 'user_leave': return 'Left Channel';
      case 'session_start': return 'Session Started';
      case 'session_end': return 'Session Ended';
      case 'video_on': return `Camera On${event?.count && event.count > 1 ? ` (${event.count}×)` : ''}`;
      case 'video_off': return `Camera Off${event?.count && event.count > 1 ? ` (${event.count}×)` : ''}`;
      case 'screen_share_start': return `Screen Share Started${event?.count && event.count > 1 ? ` (${event.count}×)` : ''}`;
      case 'screen_share_stop': return `Screen Share Stopped${event?.count && event.count > 1 ? ` (${event.count}×)` : ''}`;
      default: return type.replace(/_/g, ' ');
    }
  };

  const getEventColor = (type: string) => {
    switch(type) {
      case 'user_join': return 'border-green-500/30 bg-green-500/5';
      case 'user_leave': return 'border-red-500/30 bg-red-500/5';
      case 'session_start': return 'border-blue-500/30 bg-blue-500/5';
      case 'session_end': return 'border-gray-500/30 bg-gray-500/5';
      case 'video_on': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'video_off': return 'border-yellow-700/30 bg-yellow-700/5';
      case 'screen_share_start': return 'border-cyan-500/30 bg-cyan-500/5';
      case 'screen_share_stop': return 'border-cyan-700/30 bg-cyan-700/5';
      default: return 'border-[rgb(var(--color-border))]';
    }
  };

  const getUserDisplay = (userId: string) => {
    const user = users.get(userId);
    return {
      name: user?.displayName || 'Unknown User',
      avatar: user?.avatar || `https://cdn.discordapp.com/embed/avatars/${parseInt(userId.slice(-4)) % 5}.png`,
      username: user?.username || 'unknown',
      inGuild: user?.inGuild ?? false,
    };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-8 max-w-4xl w-full mx-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
            <p className="text-[rgb(var(--color-text-secondary))] text-sm">Loading session details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const sessionUser = getUserDisplay(session.user_id);
  const otherParticipants = overlappingUsers
    .filter(u => u.user_id !== session.user_id)
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  return (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-3xl max-w-6xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[rgb(var(--color-border))] flex flex-col my-4" onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Compact */}
        <div className="p-4 sm:p-5 border-b border-[rgb(var(--color-border))] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-blue-500/30 flex-shrink-0">
                <Image src={sessionUser.avatar} alt={sessionUser.name} fill className="object-cover" unoptimized />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
                  <Mic className="w-5 h-5 text-blue-500" />
                  Voice Session Details
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 text-xs sm:text-sm text-[rgb(var(--color-text-secondary))]">
                  <span className="font-medium">{sessionUser.name}</span>
                  <span className="text-[rgb(var(--color-text-tertiary))]">•</span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {channel?.name || 'Unknown Channel'}
                  </span>
                  <span className="text-[rgb(var(--color-text-tertiary))]">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(session.joined_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-xs text-[rgb(var(--color-text-tertiary))]">
                  <span>{formatTime(session.joined_at)}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{session.left_at ? formatTime(session.left_at) : <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> In Progress</span>}</span>
                  <span className="text-[rgb(var(--color-text-tertiary))]">•</span>
                  <span className="font-mono font-medium text-blue-400">{formatDuration(session.duration_seconds || 0)}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgb(var(--color-border))] px-4 sm:px-6 flex-shrink-0">
          {(['overview', 'participants', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1 ${
                activeTab === tab 
                  ? 'text-blue-500' 
                  : 'text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))]'
              }`}
            >
              {tab === 'overview' && <><TrendingUp className="w-3.5 h-3.5" /> Overview</>}
              {tab === 'participants' && <><Users className="w-3.5 h-3.5" /> Participants ({otherParticipants.length + 1})</>}
              {tab === 'timeline' && <><Calendar className="w-3.5 h-3.5" /> Timeline ({timeline.length})</>}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Channel Info */}
              <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-3 sm:p-4 border border-[rgb(var(--color-border))]">
                <h3 className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-2">Channel Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Channel</p>
                    <p className="text-sm font-medium text-[rgb(var(--color-text-primary))] flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-blue-400" />
                      {channel?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Channel ID</p>
                    <p className="text-sm font-mono text-[rgb(var(--color-text-secondary))]">{session.channel_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Type</p>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1">{channel?.type === 2 ? <><Mic className="w-3.5 h-3.5 text-green-400" /> Voice</> : channel?.type === 13 ? <><Monitor className="w-3.5 h-3.5 text-purple-400" /> Stage</> : 'Channel'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Status</p>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1">{channel?.exists ? <><span className="w-2 h-2 rounded-full bg-green-500"></span> Active</> : <><X className="w-3.5 h-3.5 text-red-400" /> Deleted</>}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Clock className="w-5 h-5 text-blue-400" />} label="Duration" value={formatDuration(session.duration_seconds || 0)} />
                <StatCard icon={<Users className="w-5 h-5 text-green-400" />} label="Peak Members" value={(session.peak_member_count || 0).toString()} />
                <StatCard icon={<MessageSquare className="w-5 h-5 text-purple-400" />} label="Messages" value={(session.messages_sent || 0).toString()} />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-orange-400" />} label="Rejoins" value={(session.rejoin_count || 0).toString()} />
              </div>

              {/* Session Time Details */}
              <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
                <h3 className="text-sm font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-3">Session Timing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <LogIn className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Joined At</p>
                      <p className="text-sm font-medium text-[rgb(var(--color-text-primary))]">{formatFullDateTime(session.joined_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Left At</p>
                      <p className="text-sm font-medium text-[rgb(var(--color-text-primary))]">
                        {session.left_at ? formatFullDateTime(session.left_at) : <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Still in channel</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
                <h3 className="text-sm font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-3">Activity During Session</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <ActivityBadge icon={<Mic className="w-3 h-3" />} label="Mutes" value={session.mute_count || 0} />
                  <ActivityBadge icon={<MicOff className="w-3 h-3" />} label="Unmutes" value={session.unmute_count || 0} />
                  <ActivityBadge icon={<Video className="w-3 h-3" />} label="Video On" value={session.video_on_count || 0} />
                  <ActivityBadge icon={<VideoOff className="w-3 h-3" />} label="Video Off" value={session.video_off_count || 0} />
                  <ActivityBadge icon={<Monitor className="w-3 h-3" />} label="Screen Share" value={session.screen_share_start || 0} />
                  <ActivityBadge icon={<Users className="w-3 h-3" />} label="Join Order" value={`#${session.join_order || '?'}`} />
                </div>
              </div>
            </div>
          )}

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              {/* Session Owner (the user whose session this is) */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
                  Session Owner — Joined #{session.join_order || '?'}
                </p>
                <ParticipantCard 
                  user={getUserDisplay(session.user_id)}
                  userId={session.user_id}
                  joinedAt={session.joined_at}
                  leftAt={session.left_at}
                  duration={session.duration_seconds}
                  messages={session.messages_sent}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                  isOwner={true}
                  videoOnCount={session.video_on_count}
                  screenShareCount={session.screen_share_start}
                  muteCount={session.mute_count}
                />
              </div>

              {/* Other Participants - sorted by join time */}
              {otherParticipants.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-3">
                    Other Users in Channel ({otherParticipants.length}) — Ordered by join time
                  </p>
                  <div className="space-y-2">
                    {otherParticipants.map((participant, idx) => {
                      const pUser = getUserDisplay(participant.user_id);
                      return (
                        <ParticipantCard
                          key={idx}
                          user={pUser}
                          userId={participant.user_id}
                          joinedAt={participant.joined_at}
                          leftAt={participant.left_at}
                          duration={participant.duration_seconds}
                          messages={participant.messages_sent}
                          formatTime={formatTime}
                          formatDuration={formatDuration}
                          isOwner={false}
                          joinPosition={participant.join_order || idx + 2}
                          videoOnCount={participant.video_on_count}
                          screenShareCount={participant.screen_share_start}
                          muteCount={participant.mute_count}
                          isRejoin={participant.is_rejoin}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-8 text-center">
                  <Users className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
                  <p className="text-[rgb(var(--color-text-secondary))]">No other participants found during this session</p>
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">User may have been alone in the channel</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-2">
              {timeline.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-4">
                    Chronological Events
                  </p>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-[rgb(var(--color-border))]" />
                    
                    <div className="space-y-1">
                      {timeline.map((event, idx) => {
                        const eventUser = getUserDisplay(event.userId);
                        return (
                          <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${getEventColor(event.type)}`}>
                            <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] flex items-center justify-center">
                              {getEventIcon(event.type)}
                            </div>
                            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-[rgb(var(--color-border))]">
                              <Image src={eventUser.avatar} alt={eventUser.name} fill className="object-cover" unoptimized />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">
                                  {eventUser.name}
                                </p>
                                {!eventUser.inGuild && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">LEFT SERVER</span>
                                )}
                              </div>
                              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                {getEventLabel(event.type, event)}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-xs font-mono text-[rgb(var(--color-text-secondary))]">
                                {formatTime(event.timestamp)}
                              </p>
                              <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">
                                +{formatDuration(event.relativeTime)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-8 text-center">
                  <Clock className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
                  <p className="text-[rgb(var(--color-text-secondary))]">No timeline events available</p>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[rgb(var(--color-bg-tertiary))] rounded-xl p-4 border border-[rgb(var(--color-border))]">
      <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-tertiary))] mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{value}</p>
    </div>
  );
}

function ActivityBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-[rgb(var(--color-bg-primary))] rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[rgb(var(--color-text-tertiary))] mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-bold text-[rgb(var(--color-text-primary))]">{value}</p>
    </div>
  );
}

function ParticipantCard({ 
  user, userId, joinedAt, leftAt, duration, messages, formatTime, formatDuration, isOwner,
  joinPosition, videoOnCount, screenShareCount, muteCount, isRejoin
}: { 
  user: { name: string; avatar: string; username: string; inGuild: boolean };
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  duration: number;
  messages: number;
  formatTime: (t: string) => string;
  formatDuration: (s: number) => string;
  isOwner: boolean;
  joinPosition?: number;
  videoOnCount?: number;
  screenShareCount?: number;
  muteCount?: number;
  isRejoin?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
      isOwner ? 'bg-blue-500/5' : 'bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))]'
    }`}>
      <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-[rgb(var(--color-border))] flex-shrink-0">
        <Image src={user.avatar} alt={user.name} fill className="object-cover" unoptimized />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[rgb(var(--color-text-primary))] truncate">{user.name}</p>
          {isOwner && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">OWNER</span>}
          {joinPosition && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">#{joinPosition} JOIN</span>}
          {isRejoin && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">REJOIN</span>}
          {user.inGuild ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">IN SERVER</span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">NOT IN SERVER</span>
          )}
        </div>
        <p className="text-xs text-[rgb(var(--color-text-tertiary))]">@{user.username} • {userId}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-[rgb(var(--color-text-secondary))]">
          <span className="flex items-center gap-1">
            <LogIn className="w-3 h-3 text-green-400" />
            {formatTime(joinedAt)}
          </span>
          <span className="flex items-center gap-1">
            <LogOut className="w-3 h-3 text-red-400" />
            {leftAt ? formatTime(leftAt) : <span className="flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Still here</span>}
          </span>
        </div>
        {/* Media activity badges */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {(videoOnCount || 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
              <Video className="w-3 h-3" /> Camera {videoOnCount}×
            </span>
          )}
          {(screenShareCount || 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
              <Monitor className="w-3 h-3" /> Screen Share {screenShareCount}×
            </span>
          )}
          {(muteCount || 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">
              <MicOff className="w-3 h-3" /> Muted {muteCount}×
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold text-[rgb(var(--color-text-primary))]">{formatDuration(duration || 0)}</p>
        {messages > 0 && (
          <p className="text-xs text-[rgb(var(--color-text-tertiary))]">{messages} msgs</p>
        )}
      </div>
    </div>
  );
}
