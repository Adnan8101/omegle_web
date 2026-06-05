'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback, use } from 'react';
import {
    FiArrowLeft, FiClock, FiUsers, FiTarget, FiActivity, FiMic, FiTag, FiAward, FiInfo
} from 'react-icons/fi';
import Image from 'next/image';

interface RuleDetails {
    rule: {
        id: string;
        name: string;
        target_type: 'category' | 'channel';
        target_id: string;
        excluded_channel_ids: string[];
        rolling_days: number;
        required_hours: number;
        reward_role_id: string;
        count_deafened: boolean;
        enabled: boolean;
    };
    roleHolders: Array<{
        user_id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
    }>;
    grindingUsers: Array<{
        user_id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        total_time_seconds: number;
        progress_percentage: number;
        top_channel_name: string;
    }>;
}

export default function RuleDetailsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const ruleId = params.ruleId as string;

    const [data, setData] = useState<RuleDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/vc-automation/rules/${ruleId}/details`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch rule details');
            }
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message || 'An error occurred while loading.');
        } finally {
            setLoading(false);
        }
    }, [ruleId]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/admin');
            return;
        }
        if (status === 'authenticated') {
            const perms = session?.user?.permissions;
            if (!perms?.hasFullAccess) {
                router.replace('/admin/dashboard');
                return;
            }
            loadData();
        }
    }, [status, session, router, loadData]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                    <p className="text-[rgb(var(--color-text-secondary))]">Loading Rule Details...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex flex-col items-center justify-center p-6">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl max-w-md text-center shadow-lg">
                    <FiInfo className="w-12 h-12 mx-auto mb-4 opacity-80" />
                    <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
                    <p>{error || 'Unknown error occurred.'}</p>
                    <button
                        onClick={() => router.push('/admin/vc-automation')}
                        className="mt-6 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors font-medium"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const { rule, roleHolders, grindingUsers } = data;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const getAvatar = (user: any) => {
        if (user.avatar_url) return user.avatar_url;
        // fallback avatar based on user id logic if needed, or simple placeholder
        return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.user_id) % 5}.png`;
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4 border-b border-[rgb(var(--color-border))] pb-6">
                    <button
                        onClick={() => router.push('/admin/vc-automation')}
                        className="p-2.5 rounded-xl bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-tertiary))] transition-all shadow-sm"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">{rule.name}</h1>
                            {rule.enabled ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium border border-green-500/30">Active</span>
                            ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium border border-gray-500/30">Disabled</span>
                            )}
                        </div>
                        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                            Detailed statistics and user progress for this automation rule.
                        </p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-5 rounded-2xl shadow-sm hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-2 text-blue-400">
                            <FiTarget className="w-5 h-5" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Requirement</span>
                        </div>
                        <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{rule.required_hours} Hours</p>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">in a rolling {rule.rolling_days}-day period</p>
                    </div>

                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-5 rounded-2xl shadow-sm hover:border-purple-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-2 text-purple-400">
                            <FiUsers className="w-5 h-5" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Role Holders</span>
                        </div>
                        <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{roleHolders.length}</p>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">users currently have this role</p>
                    </div>

                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-5 rounded-2xl shadow-sm hover:border-orange-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-2 text-orange-400">
                            <FiActivity className="w-5 h-5" />
                            <span className="text-xs font-semibold uppercase tracking-wider">In the Race</span>
                        </div>
                        <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{grindingUsers.length}</p>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">users actively grinding</p>
                    </div>

                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] p-5 rounded-2xl shadow-sm hover:border-green-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-2 text-green-400">
                            <FiClock className="w-5 h-5" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Current Cycle</span>
                        </div>
                        <p className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Rolling Window</p>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">Past {rule.rolling_days} days tracking</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Role Holders List */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="p-5 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))]/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FiAward className="w-5 h-5 text-yellow-500" />
                                <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Role Holders</h2>
                            </div>
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2.5 py-1 rounded-full font-semibold">
                                {roleHolders.length} Users
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2">
                            {roleHolders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                                    <FiUsers className="w-12 h-12 mb-3" />
                                    <p className="text-[rgb(var(--color-text-secondary))] font-medium">No one holds this role yet.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[rgb(var(--color-border))]/50">
                                    {roleHolders.map(user => (
                                        <li key={user.user_id} className="p-3 flex items-center gap-4 hover:bg-[rgb(var(--color-bg-tertiary))] rounded-xl transition-colors">
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                                                <Image src={getAvatar(user)} alt={user.username} fill className="object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-[rgb(var(--color-text-primary))] truncate">{user.display_name}</p>
                                                <p className="text-xs text-[rgb(var(--color-text-tertiary))] truncate">@{user.username}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Grinding Users List (The Race) */}
                    <div className="bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="p-5 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-tertiary))]/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FiActivity className="w-5 h-5 text-blue-500" />
                                <h2 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">The Race (Grinding)</h2>
                            </div>
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-semibold">
                                {grindingUsers.length} Users
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2">
                            {grindingUsers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                                    <FiActivity className="w-12 h-12 mb-3" />
                                    <p className="text-[rgb(var(--color-text-secondary))] font-medium">No one is currently grinding for this role.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[rgb(var(--color-border))]/50">
                                    {grindingUsers.map((user, index) => (
                                        <li key={user.user_id} className="p-4 hover:bg-[rgb(var(--color-bg-tertiary))] rounded-xl transition-colors group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-bold text-[rgb(var(--color-text-tertiary))] w-4 text-right">
                                                        #{index + 1}
                                                    </span>
                                                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                                                        <Image src={getAvatar(user)} alt={user.username} fill className="object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[rgb(var(--color-text-primary))] truncate">
                                                            {user.display_name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-blue-400">
                                                        {formatTime(user.total_time_seconds)}
                                                    </p>
                                                    <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">
                                                        / {rule.required_hours}h required
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="relative w-full h-2 bg-[rgb(var(--color-bg-primary))] rounded-full overflow-hidden mb-2 shadow-inner">
                                                <div 
                                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: \`\${user.progress_percentage}%\` }}
                                                />
                                            </div>
                                            
                                            {/* Meta info */}
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-text-secondary))]">
                                                    <FiMic className="w-3 h-3 opacity-70" />
                                                    <span className="truncate max-w-[200px]">
                                                        Grinding in <span className="font-medium text-[rgb(var(--color-text-primary))]">{user.top_channel_name}</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-[rgb(var(--color-text-tertiary))] ml-auto">
                                                    <FiTarget className="w-3 h-3" />
                                                    {user.progress_percentage.toFixed(1)}%
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
