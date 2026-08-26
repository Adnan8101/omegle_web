import { prismaBot } from '@/lib/prismaBot';
import {
    LeaderboardEntry,
    RawActivityEntry,
    WeeklyActivityType,
    buildLeaderboardEntries,
    selectWinners,
} from './types';

const TEXT_CHANNEL_TYPES = [0, 5, 15];
const VOICE_CHANNEL_TYPES = [2, 13];
export const CATEGORY_CHANNEL_TYPE = 4;

export interface WeeklyRuleShape {
    id: string;
    guild_id: string;
    name: string;
    scope: string;
    category_id: string | null;
    activity_type: string;
    winner_count: number;
    reward_role_id: string;
    enabled: boolean;
}

export interface ScopeChannels {
    textChannelIds: string[] | null;
    voiceChannelIds: string[] | null;
}

export async function resolveScopeChannels(
    guildId: string,
    scope: string,
    categoryId: string | null
): Promise<ScopeChannels> {
    if (scope !== 'category' || !categoryId) {
        return { textChannelIds: null, voiceChannelIds: null };
    }
    const channels = await prismaBot.discordChannelCache.findMany({
        where: { guild_id: guildId, parent_id: categoryId, is_deleted: false },
        select: { channel_id: true, type: true },
    });
    const textChannelIds: string[] = [];
    const voiceChannelIds: string[] = [];
    for (const channel of channels) {
        if (TEXT_CHANNEL_TYPES.includes(channel.type)) {
            textChannelIds.push(channel.channel_id);
        } else if (VOICE_CHANNEL_TYPES.includes(channel.type)) {
            textChannelIds.push(channel.channel_id);
            voiceChannelIds.push(channel.channel_id);
        }
    }
    return { textChannelIds, voiceChannelIds };
}

export async function aggregateRuleActivity(
    rule: WeeklyRuleShape,
    start: Date,
    end: Date
): Promise<RawActivityEntry[]> {
    const activityType = rule.activity_type as WeeklyActivityType;
    const scope = await resolveScopeChannels(rule.guild_id, rule.scope, rule.category_id);
    const needsChat = activityType === 'chat' || activityType === 'both';
    const needsVoice = activityType === 'vc' || activityType === 'both';

    const chatTotals = new Map<string, number>();
    if (needsChat && !(scope.textChannelIds !== null && scope.textChannelIds.length === 0)) {
        const grouped = await prismaBot.chatLog.groupBy({
            by: ['user_id'],
            where: {
                guild_id: rule.guild_id,
                created_at: { gte: start, lt: end },
                ...(scope.textChannelIds !== null ? { channel_id: { in: scope.textChannelIds } } : {}),
            },
            _count: { _all: true },
        });
        for (const row of grouped) {
            chatTotals.set(row.user_id, row._count._all);
        }
    }

    const voiceTotals = new Map<string, number>();
    if (needsVoice && !(scope.voiceChannelIds !== null && scope.voiceChannelIds.length === 0)) {
        const grouped = await prismaBot.voiceLog.groupBy({
            by: ['user_id'],
            where: {
                guild_id: rule.guild_id,
                joined_at: { gte: start, lt: end },
                ...(scope.voiceChannelIds !== null ? { channel_id: { in: scope.voiceChannelIds } } : {}),
            },
            _sum: { duration_seconds: true },
        });
        for (const row of grouped) {
            voiceTotals.set(row.user_id, Math.max(0, row._sum.duration_seconds || 0));
        }
    }

    const excluded = await getExcludedUserIds(rule.guild_id);
    const userIds = new Set<string>([...chatTotals.keys(), ...voiceTotals.keys()]);
    return Array.from(userIds)
        .filter((userId) => !excluded.has(userId))
        .map((userId) => ({
            userId,
            chatMessages: chatTotals.get(userId) || 0,
            voiceSeconds: voiceTotals.get(userId) || 0,
        }));
}

export async function getExcludedUserIds(guildId: string): Promise<Set<string>> {
    const rows = await prismaBot.weeklyActivityExclusion.findMany({
        where: { guild_id: guildId },
        select: { user_id: true },
    });
    return new Set(rows.map((row) => row.user_id));
}

export async function calculateLeaderboard(
    rule: WeeklyRuleShape,
    start: Date,
    end: Date
): Promise<{ entries: LeaderboardEntry[]; winners: LeaderboardEntry[] }> {
    const raw = await aggregateRuleActivity(rule, start, end);
    const entries = buildLeaderboardEntries(
        raw,
        rule.activity_type as WeeklyActivityType,
        rule.winner_count
    );
    return { entries, winners: selectWinners(entries, rule.winner_count) };
}
