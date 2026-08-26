export type WeeklyActivityScope = 'all_server' | 'category';
export type WeeklyActivityType = 'chat' | 'vc' | 'both';
export type WeeklyCycleStatus = 'active' | 'finalizing' | 'finalized';
export type WeeklyRoleState = 'pending' | 'assigned' | 'removed' | 'failed';

export const WEEKLY_ACTIVITY_SCOPES: WeeklyActivityScope[] = ['all_server', 'category'];
export const WEEKLY_ACTIVITY_TYPES: WeeklyActivityType[] = ['chat', 'vc', 'both'];

export const MIN_WINNER_COUNT = 1;
export const MAX_WINNER_COUNT = 50;

export const CHAT_POINTS_PER_MESSAGE = 1;
export const VOICE_POINTS_PER_MINUTE = 1;

export interface WeeklyActivityRuleConfig {
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

export interface RawActivityEntry {
    userId: string;
    chatMessages: number;
    voiceSeconds: number;
}

export interface LeaderboardEntry extends RawActivityEntry {
    rank: number;
    activityValue: number;
    activityType: WeeklyActivityType;
    qualifies: boolean;
}

export interface WeeklyLeaderboard {
    ruleId: string;
    cycleStart: Date;
    cycleEnd: Date;
    activityType: WeeklyActivityType;
    winnerCount: number;
    entries: LeaderboardEntry[];
    winners: LeaderboardEntry[];
}

export function isWeeklyActivityScope(value: unknown): value is WeeklyActivityScope {
    return typeof value === 'string' && (WEEKLY_ACTIVITY_SCOPES as string[]).includes(value);
}

export function isWeeklyActivityType(value: unknown): value is WeeklyActivityType {
    return typeof value === 'string' && (WEEKLY_ACTIVITY_TYPES as string[]).includes(value);
}

export function isValidWinnerCount(value: unknown): boolean {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= MIN_WINNER_COUNT && parsed <= MAX_WINNER_COUNT;
}

export function computeActivityValue(
    activityType: WeeklyActivityType,
    chatMessages: number,
    voiceSeconds: number
): number {
    if (activityType === 'chat') return Math.max(0, Math.trunc(chatMessages));
    if (activityType === 'vc') return Math.max(0, Math.trunc(voiceSeconds));
    const chatPoints = Math.max(0, Math.trunc(chatMessages)) * CHAT_POINTS_PER_MESSAGE;
    const voicePoints = Math.floor(Math.max(0, Math.trunc(voiceSeconds)) / 60) * VOICE_POINTS_PER_MINUTE;
    return chatPoints + voicePoints;
}

export function compareSnowflake(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length !== b.length) return a.length - b.length;
    return a < b ? -1 : 1;
}

export function compareLeaderboardEntries(
    a: { activityValue: number; chatMessages: number; voiceSeconds: number; userId: string },
    b: { activityValue: number; chatMessages: number; voiceSeconds: number; userId: string }
): number {
    if (a.activityValue !== b.activityValue) return b.activityValue - a.activityValue;
    if (a.chatMessages !== b.chatMessages) return b.chatMessages - a.chatMessages;
    if (a.voiceSeconds !== b.voiceSeconds) return b.voiceSeconds - a.voiceSeconds;
    return compareSnowflake(a.userId, b.userId);
}

export function buildLeaderboardEntries(
    raw: RawActivityEntry[],
    activityType: WeeklyActivityType,
    winnerCount: number
): LeaderboardEntry[] {
    const scored = raw
        .map((entry) => ({
            userId: entry.userId,
            chatMessages: Math.max(0, Math.trunc(entry.chatMessages)),
            voiceSeconds: Math.max(0, Math.trunc(entry.voiceSeconds)),
            activityValue: computeActivityValue(activityType, entry.chatMessages, entry.voiceSeconds),
        }))
        .filter((entry) => entry.activityValue > 0)
        .sort(compareLeaderboardEntries);
    return scored.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        activityType,
        qualifies: index < winnerCount,
    }));
}

export function selectWinners(entries: LeaderboardEntry[], winnerCount: number): LeaderboardEntry[] {
    return entries.filter((entry) => entry.rank <= winnerCount && entry.activityValue > 0);
}

export function formatActivityValue(activityType: WeeklyActivityType, value: number): string {
    if (activityType === 'chat') return `${value} messages`;
    if (activityType === 'vc') return formatSeconds(value);
    return `${value} points`;
}

export function formatSeconds(seconds: number): string {
    const safe = Math.max(0, Math.trunc(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (hours === 0 && minutes === 0) return '0m';
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
}
