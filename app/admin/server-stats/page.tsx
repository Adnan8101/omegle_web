'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
    FiUsers, FiMic, FiMessageSquare, FiTrendingUp,
    FiClock, FiHash, FiChevronDown, FiChevronUp, FiAward, FiActivity
} from 'react-icons/fi';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DateRangeFilter from '@/components/DateRangeFilter';

interface UserRanking {
    user_id: string;
    vc_duration: number;
    vc_sessions: number;
    message_count: number;
    total_characters: number;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    in_guild?: boolean;
    nickname?: string;
}

interface ChannelStats {
    channel_id: string;
    channel_name: string;
    total_sessions?: number;
    unique_users: number;
    total_duration?: number;
    avg_peak_members?: number;
    last_activity: string;
    message_count?: number;
    total_characters?: number;
}

interface Contributor {
    channel_id: string;
    user_id: string;
    total_duration?: number;
    session_count?: number;
    message_count?: number;
    total_characters?: number;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    in_guild?: boolean;
    nickname?: string;
}

type RankSort = 'combined' | 'vc' | 'text';
type ActiveTab = 'users' | 'voice' | 'messages';

export default function ServerStatsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('users');
    const [rankSort, setRankSort] = useState<RankSort>('combined');
    const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
    const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });

    const [totalMembers, setTotalMembers] = useState(0);
    const [userRankings, setUserRankings] = useState<UserRanking[]>([]);
    const [topVoiceChannels, setTopVoiceChannels] = useState<ChannelStats[]>([]);
    const [vcContributors, setVcContributors] = useState<Record<string, Contributor[]>>({});
    const [topMessageChannels, setTopMessageChannels] = useState<ChannelStats[]>([]);
    const [msgContributors, setMsgContributors] = useState<Record<string, Contributor[]>>({});
    const [expandedVcContributors, setExpandedVcContributors] = useState<Set<string>>(new Set());
    const [expandedMsgContributors, setExpandedMsgContributors] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/admin');
        } else if (status === 'authenticated' && !session?.user?.permissions?.hasAnyAccess) {
            router.replace('/admin');
        } else if (status === 'authenticated' && session?.user?.permissions?.hasAnyAccess) {
            fetchServerStats();
        }
    }, [status, session, router]);

    const fetchServerStats = useCallback(async (range?: { startDate: string | null; endDate: string | null }) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            const r = range || dateRange;
            if (r.startDate) params.set('startDate', r.startDate);
            if (r.endDate) params.set('endDate', r.endDate);
            const res = await fetch(`/api/vctranscript/server-stats?${params}`);
            const data = await res.json();
            setTotalMembers(data.totalMembers || 0);
            setUserRankings(data.userRankings || []);
            setTopVoiceChannels(data.topVoiceChannels || []);
            setVcContributors(data.vcContributorsByChannel || {});
            setTopMessageChannels(data.topMessageChannels || []);
            setMsgContributors(data.msgContributorsByChannel || {});
        } catch (error) {
            console.error('Error fetching server stats:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    const handleDateChange = (range: { startDate: string | null; endDate: string | null }) => {
        setDateRange(range);
        fetchServerStats(range);
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0m';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getUserDisplay = (user: UserRanking | Contributor) => ({
        name: user.nickname || user.display_name || user.username || 'Unknown User',
        avatar: user.avatar_url || `https://cdn.discordapp.com/embed/avatars/${parseInt(user.user_id.slice(-4)) % 5}.png`,
        username: user.username || 'unknown',
        inGuild: user.in_guild ?? false,
    });

    const sortedUsers = [...userRankings].sort((a, b) => {
        switch (rankSort) {
            case 'vc': return b.vc_duration - a.vc_duration;
            case 'text': return b.message_count - a.message_count;
            case 'combined': return (b.vc_duration + b.message_count * 60) - (a.vc_duration + a.message_count * 60);
            default: return 0;
        }
    });

    const toggleChannel = (channelId: string) => {
        setExpandedChannels(prev => {
            const next = new Set(prev);
            if (next.has(channelId)) next.delete(channelId);
            else next.add(channelId);
            return next;
        });
    };

    const getRankBadge = (idx: number) => {
        if (idx === 0) return <span className="text-lg">🥇</span>;
        if (idx === 1) return <span className="text-lg">🥈</span>;
        if (idx === 2) return <span className="text-lg">🥉</span>;
        return <span className="text-sm font-bold text-[rgb(var(--color-text-tertiary))]">#{idx + 1}</span>;
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8 animate-pulse">
                        <div className="h-10 w-64 bg-[rgb(var(--color-bg-secondary))] rounded mb-4"></div>
                        <div className="h-5 w-96 bg-[rgb(var(--color-bg-secondary))] rounded"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-32 bg-[rgb(var(--color-bg-secondary))] rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-[rgb(var(--color-bg-secondary))] rounded-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    const totalVcTime = userRankings.reduce((sum, u) => sum + u.vc_duration, 0);
    const totalMessages = userRankings.reduce((sum, u) => sum + u.message_count, 0);
    const totalUsers = totalMembers || userRankings.length; // Use totalMembers from API
    const totalSessions = userRankings.reduce((sum, u) => sum + (u.vc_sessions || 0), 0);
    const totalCharacters = userRankings.reduce((sum, u) => sum + (u.total_characters || 0), 0);
    const avgVcTime = totalUsers > 0 ? totalVcTime / totalUsers : 0;
    const avgMessages = totalUsers > 0 ? totalMessages / totalUsers : 0;
    const avgSessionDuration = totalSessions > 0 ? totalVcTime / totalSessions : 0;

    const toggleVcExpand = (channelId: string) => {
        setExpandedVcContributors(prev => {
            const next = new Set(prev);
            if (next.has(channelId)) next.delete(channelId);
            else next.add(channelId);
            return next;
        });
    };

    const toggleMsgExpand = (channelId: string) => {
        setExpandedMsgContributors(prev => {
            const next = new Set(prev);
            if (next.has(channelId)) next.delete(channelId);
            else next.add(channelId);
            return next;
        });
    };

    // Chart data preparation
    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316', '#ef4444', '#84cc16'];

    // Activity Distribution (VC time vs Messages - weighted for fair comparison)
    const activityDistribution = [
        { name: 'Voice Chat', value: Math.round(totalVcTime / 60), color: '#8b5cf6' }, // Convert to minutes
        { name: 'Messages', value: totalMessages, color: '#10b981' },
    ];

    // Top 10 Users by VC hours for bar chart
    const top10VcUsers = [...userRankings]
        .sort((a, b) => b.vc_duration - a.vc_duration)
        .slice(0, 10)
        .map(u => ({
            name: getUserDisplay(u).name.slice(0, 12) + (getUserDisplay(u).name.length > 12 ? '...' : ''),
            hours: Math.round(u.vc_duration / 3600 * 10) / 10,
            fullName: getUserDisplay(u).name,
        }));

    // Top 10 Users by messages for bar chart
    const top10ChatUsers = [...userRankings]
        .sort((a, b) => b.message_count - a.message_count)
        .slice(0, 10)
        .map(u => ({
            name: getUserDisplay(u).name.slice(0, 12) + (getUserDisplay(u).name.length > 12 ? '...' : ''),
            messages: u.message_count,
            fullName: getUserDisplay(u).name,
        }));

    // Top channels by sessions for chart
    const channelActivityData = topVoiceChannels.slice(0, 8).map((ch, idx) => ({
        name: (ch.channel_name || 'Unknown').slice(0, 10) + ((ch.channel_name || '').length > 10 ? '...' : ''),
        sessions: ch.total_sessions || 0,
        duration: Math.round((ch.total_duration || 0) / 3600 * 10) / 10,
        fill: COLORS[idx % COLORS.length],
    }));

    // Top message channels for chart
    const messageChannelData = topMessageChannels.slice(0, 8).map((ch, idx) => ({
        name: (ch.channel_name || 'Unknown').slice(0, 10) + ((ch.channel_name || '').length > 10 ? '...' : ''),
        messages: Number(ch.message_count) || 0,
        users: ch.unique_users || 0,
        fill: COLORS[idx % COLORS.length],
    }));

    return (
        <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-4xl font-bold text-[rgb(var(--color-text-primary))] mb-2 flex items-center gap-3">
                        <FiTrendingUp className="w-7 h-7 sm:w-9 sm:h-9 text-blue-500" />
                        Server Stats
                    </h1>
                    <p className="text-sm sm:text-base text-[rgb(var(--color-text-secondary))] mb-4">
                        Complete server activity rankings and channel leaderboards
                    </p>
                    <DateRangeFilter onChange={handleDateChange} initialRange={dateRange} />
                </div>

                {/* Overview Cards - 2 rows of 4 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-blue-500/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <FiUsers className="w-4 h-4 text-blue-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">Total Users</p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{totalUsers}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-purple-500/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <FiMic className="w-4 h-4 text-purple-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">Total VC Time</p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{formatDuration(totalVcTime)}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-green-500/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <FiMessageSquare className="w-4 h-4 text-green-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">Total Messages</p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{totalMessages.toLocaleString()}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-4 sm:p-5 border border-[rgb(var(--color-border))] hover:border-orange-500/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <FiActivity className="w-4 h-4 text-orange-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-xs sm:text-sm">VC Sessions</p>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--color-text-primary))]">{totalSessions.toLocaleString()}</p>
                    </div>
                </div>

                {/* Average Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-3 sm:p-5 border border-[rgb(var(--color-border))]">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <FiClock className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-[10px] sm:text-sm truncate">Avg VC/User</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-cyan-400">{formatDuration(Math.round(avgVcTime))}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-3 sm:p-5 border border-[rgb(var(--color-border))]">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <FiMessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-[10px] sm:text-sm truncate">Avg Msgs</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-pink-400">{Math.round(avgMessages).toLocaleString()}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-3 sm:p-5 border border-[rgb(var(--color-border))]">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <FiClock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-[10px] sm:text-sm truncate">Avg Session</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-yellow-400">{formatDuration(Math.round(avgSessionDuration))}</p>
                    </div>
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-3 sm:p-5 border border-[rgb(var(--color-border))]">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <FiHash className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
                            <p className="text-[rgb(var(--color-text-tertiary))] text-[10px] sm:text-sm truncate">Total Chars</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-indigo-400">{totalCharacters.toLocaleString()}</p>
                    </div>
                </div>

                {/* Charts Section - 2x2 Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Activity Distribution Pie Chart */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                            <FiTrendingUp className="w-5 h-5 text-purple-500" />
                            Activity Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={activityDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {activityDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgb(var(--color-bg-tertiary))',
                                        border: '1px solid rgb(var(--color-border))',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value, name) => {
                                        const v = Number(value) || 0;
                                        return [
                                            name === 'Voice Chat' ? `${Math.round(v / 60)}h ${v % 60}m` : v.toLocaleString(),
                                            String(name)
                                        ];
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top 10 VC Users Bar Chart */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h3 className="text-sm sm:text-lg font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                            <FiMic className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                            Top 10 VC Users (Hours)
                        </h3>
                        <div className="h-[220px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top10VcUsers} layout="vertical" margin={{ left: 5, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={10} tickFormatter={(v) => `${v}h`} />
                                    <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={9} width={70} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgb(var(--color-bg-tertiary))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px' }}
                                        formatter={(value, _name, props) => [`${Number(value) || 0}h`, (props as any)?.payload?.fullName || '']}
                                        labelFormatter={() => ''}
                                    />
                                    <Bar dataKey="hours" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top 10 Chat Users Bar Chart */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h3 className="text-sm sm:text-lg font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                            <FiMessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                            Top 10 Chat Users (Messages)
                        </h3>
                        <div className="h-[220px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top10ChatUsers} layout="vertical" margin={{ left: 5, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                                    <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={9} width={70} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgb(var(--color-bg-tertiary))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px' }}
                                        formatter={(value, _name, props) => [(Number(value) || 0).toLocaleString(), (props as any)?.payload?.fullName || '']}
                                        labelFormatter={() => ''}
                                    />
                                    <Bar dataKey="messages" fill="#10b981" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Message Channels Bar Chart */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))]">
                        <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                            <FiHash className="w-5 h-5 text-pink-500" />
                            Top Message Channels
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={messageChannelData} layout="vertical" margin={{ left: 5, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={9} width={70} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgb(var(--color-bg-tertiary))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px' }}
                                />
                                <Bar dataKey="messages" fill="#ec4899" name="Messages" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Channel Activity Bar Chart - Full Width */}
                {channelActivityData.length > 0 && (
                    <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 border border-[rgb(var(--color-border))] mb-8">
                        <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
                            <FiMic className="w-5 h-5 text-cyan-500" />
                            Voice Channels: Sessions vs Hours
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={channelActivityData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgb(var(--color-bg-tertiary))', border: '1px solid rgb(var(--color-border))', borderRadius: '8px' }}
                                    formatter={(value, name) => {
                                        const v = Number(value) || 0;
                                        return [
                                            name === 'duration' ? `${v}h` : v,
                                            name === 'duration' ? 'Total Hours' : 'Sessions'
                                        ];
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="duration" fill="#8b5cf6" name="Hours" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex border-b border-[rgb(var(--color-border))] mb-8 overflow-x-auto no-scrollbar gap-1 touch-pan-x snap-x pb-1">
                    {([
                        { key: 'users' as const, label: 'Users', icon: <FiUsers className="w-4 h-4" />, count: totalUsers },
                        { key: 'voice' as const, label: 'Voice Channels', icon: <FiMic className="w-4 h-4" />, count: topVoiceChannels.length },
                        { key: 'messages' as const, label: 'Message Channels', icon: <FiMessageSquare className="w-4 h-4" />, count: topMessageChannels.length },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === tab.key
                                ? 'text-blue-500'
                                : 'text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))]'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="text-xs opacity-60">({tab.count})</span>
                            {activeTab === tab.key && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ===== USERS TAB ===== */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {/* Sort Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {([
                                { key: 'combined' as const, label: 'VC + Text' },
                                { key: 'vc' as const, label: 'Voice Only' },
                                { key: 'text' as const, label: 'Text Only' },
                            ]).map(sort => (
                                <button
                                    key={sort.key}
                                    onClick={() => setRankSort(sort.key)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${rankSort === sort.key
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]'
                                        }`}
                                >
                                    {sort.label}
                                </button>
                            ))}
                        </div>

                        {/* User Ranking Table */}
                        <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden -mx-4 sm:mx-0 shadow-apple-md">
                            <div className="overflow-x-auto w-full touch-pan-x">
                                <table className="w-full min-w-[500px]">
                                    <thead className="bg-[rgb(var(--color-bg-tertiary))]">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider w-12 shrink-0">Rank</th>
                                            <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider shrink-0">User</th>
                                            <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider shrink-0">
                                                <span className="flex items-center gap-1"><FiMic className="w-3 h-3" /> VC Time</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider shrink-0 hidden sm:table-cell">Sessions</th>
                                            <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider shrink-0">
                                                <span className="flex items-center gap-1"><FiMessageSquare className="w-3 h-3" /> Messages</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[rgb(var(--color-border))]">
                                        {sortedUsers.map((user, idx) => {
                                            const display = getUserDisplay(user);
                                            return (
                                                <tr key={user.user_id} className={`hover:bg-[rgb(var(--color-hover))] transition-colors ${idx < 3 ? 'bg-blue-500/5' : ''}`}>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                        <div className="flex items-center justify-center w-8">
                                                            {getRankBadge(idx)}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                        <div className="flex items-center gap-2 sm:gap-3">
                                                            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[rgb(var(--color-border))]">
                                                                <Image src={display.avatar} alt={display.name} fill className="object-cover" unoptimized />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="text-xs sm:text-sm font-semibold text-[rgb(var(--color-text-primary))] truncate max-w-[100px] sm:max-w-[200px]">{display.name}</p>
                                                                    {display.inGuild ? (
                                                                        <span className="text-[8px] px-1 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">IN</span>
                                                                    ) : (
                                                                        <span className="text-[8px] px-1 py-0.5 rounded bg-gray-500/20 text-gray-400 flex-shrink-0">LEFT</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] sm:text-xs text-[rgb(var(--color-text-tertiary))] truncate">@{display.username}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-blue-400">{formatDuration(user.vc_duration)}</td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[rgb(var(--color-text-secondary))] hidden sm:table-cell">{user.vc_sessions}</td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-purple-400">{user.message_count.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 sm:px-6 py-3 bg-[rgb(var(--color-bg-tertiary))] border-t border-[rgb(var(--color-border))]">
                                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                                    Showing {sortedUsers.length} users • Sorted by {rankSort === 'combined' ? 'VC + Text' : rankSort === 'vc' ? 'Voice time' : 'Messages'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== VOICE CHANNELS TAB ===== */}
                {activeTab === 'voice' && (
                    <div className="space-y-4">
                        {topVoiceChannels.length > 0 ? (
                            topVoiceChannels.map((channel, idx) => (
                                <div key={channel.channel_id} className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
                                    <div
                                        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[rgb(var(--color-hover))] transition-colors"
                                        onClick={() => toggleChannel(channel.channel_id)}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="flex items-center justify-center w-8 flex-shrink-0">
                                                {getRankBadge(idx)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FiHash className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                    <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate text-sm sm:text-base">{channel.channel_name}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--color-text-tertiary))]">
                                                    <span className="flex items-center gap-1"><FiClock className="w-3 h-3" /> {formatDuration(channel.total_duration || 0)}</span>
                                                    <span className="flex items-center gap-1"><FiUsers className="w-3 h-3" /> {channel.unique_users} users</span>
                                                    <span>{channel.total_sessions} sessions</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-lg font-bold text-blue-400">{formatDuration(channel.total_duration || 0)}</p>
                                                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">total time</p>
                                            </div>
                                            <button className="p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                                                {expandedChannels.has(channel.channel_id) ? (
                                                    <FiChevronUp className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                                                ) : (
                                                    <FiChevronDown className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Contributors Expandable */}
                                    {expandedChannels.has(channel.channel_id) && vcContributors[channel.channel_id] && (() => {
                                        const contributors = vcContributors[channel.channel_id];
                                        const isExpanded = expandedVcContributors.has(channel.channel_id);
                                        const displayedContributors = isExpanded ? contributors : contributors.slice(0, 10);
                                        const hasMore = contributors.length > 10;

                                        return (
                                            <div className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))] p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase flex items-center gap-1">
                                                        <FiAward className="w-3 h-3" /> Top Contributors ({contributors.length})
                                                    </p>
                                                    {hasMore && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleVcExpand(channel.channel_id); }}
                                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <><FiChevronUp className="w-3 h-3" /> Show Less</>
                                                            ) : (
                                                                <><FiChevronDown className="w-3 h-3" /> Show All ({contributors.length - 10} more)</>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    {displayedContributors.map((c, cIdx) => {
                                                        const display = getUserDisplay(c);
                                                        return (
                                                            <div key={c.user_id} className="flex items-center gap-3 p-2 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-lg">
                                                                <span className="text-xs font-bold text-[rgb(var(--color-text-tertiary))] w-6 text-center">{cIdx + 1}</span>
                                                                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0">
                                                                    <Image src={display.avatar} alt={display.name} fill className="object-cover" unoptimized />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs sm:text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">{display.name}</p>
                                                                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">@{display.username}</p>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <p className="text-xs sm:text-sm font-bold text-blue-400">{formatDuration(c.total_duration || 0)}</p>
                                                                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">{c.session_count} sessions</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))
                        ) : (
                            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-12 text-center border border-[rgb(var(--color-border))]">
                                <FiMic className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
                                <p className="text-[rgb(var(--color-text-secondary))]">No voice channel data available</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== MESSAGE CHANNELS TAB ===== */}
                {activeTab === 'messages' && (
                    <div className="space-y-4">
                        {topMessageChannels.length > 0 ? (
                            topMessageChannels.map((channel, idx) => (
                                <div key={channel.channel_id} className="bg-[rgb(var(--color-bg-secondary))] rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
                                    <div
                                        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[rgb(var(--color-hover))] transition-colors"
                                        onClick={() => toggleChannel(`msg-${channel.channel_id}`)}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="flex items-center justify-center w-8 flex-shrink-0">
                                                {getRankBadge(idx)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FiHash className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                                    <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate text-sm sm:text-base">{channel.channel_name}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--color-text-tertiary))]">
                                                    <span className="flex items-center gap-1"><FiMessageSquare className="w-3 h-3" /> {Number(channel.message_count).toLocaleString()} messages</span>
                                                    <span className="flex items-center gap-1"><FiUsers className="w-3 h-3" /> {channel.unique_users} users</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-lg font-bold text-purple-400">{Number(channel.message_count).toLocaleString()}</p>
                                                <p className="text-xs text-[rgb(var(--color-text-tertiary))]">messages</p>
                                            </div>
                                            <button className="p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors">
                                                {expandedChannels.has(`msg-${channel.channel_id}`) ? (
                                                    <FiChevronUp className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                                                ) : (
                                                    <FiChevronDown className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Contributors Expandable */}
                                    {expandedChannels.has(`msg-${channel.channel_id}`) && msgContributors[channel.channel_id] && (() => {
                                        const contributors = msgContributors[channel.channel_id];
                                        const isExpanded = expandedMsgContributors.has(channel.channel_id);
                                        const displayedContributors = isExpanded ? contributors : contributors.slice(0, 10);
                                        const hasMore = contributors.length > 10;

                                        return (
                                            <div className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))] p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] uppercase flex items-center gap-1">
                                                        <FiAward className="w-3 h-3" /> Top Contributors ({contributors.length})
                                                    </p>
                                                    {hasMore && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleMsgExpand(channel.channel_id); }}
                                                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <><FiChevronUp className="w-3 h-3" /> Show Less</>
                                                            ) : (
                                                                <><FiChevronDown className="w-3 h-3" /> Show All ({contributors.length - 10} more)</>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    {displayedContributors.map((c, cIdx) => {
                                                        const display = getUserDisplay(c);
                                                        return (
                                                            <div key={c.user_id} className="flex items-center gap-3 p-2 sm:p-3 bg-[rgb(var(--color-bg-primary))] rounded-lg">
                                                                <span className="text-xs font-bold text-[rgb(var(--color-text-tertiary))] w-6 text-center">{cIdx + 1}</span>
                                                                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0">
                                                                    <Image src={display.avatar} alt={display.name} fill className="object-cover" unoptimized />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs sm:text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">{display.name}</p>
                                                                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">@{display.username}</p>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <p className="text-xs sm:text-sm font-bold text-purple-400">{Number(c.message_count).toLocaleString()}</p>
                                                                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">{Number(c.total_characters || 0).toLocaleString()} chars</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))
                        ) : (
                            <div className="bg-[rgb(var(--color-bg-secondary))] rounded-xl p-12 text-center border border-[rgb(var(--color-border))]">
                                <FiMessageSquare className="w-12 h-12 text-[rgb(var(--color-text-tertiary))] mx-auto mb-3" />
                                <p className="text-[rgb(var(--color-text-secondary))]">No message channel data available</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
