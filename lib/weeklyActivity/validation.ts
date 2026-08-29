import { prismaBot } from '@/lib/prismaBot';
import {
    MAX_WINNER_COUNT,
    MIN_WINNER_COUNT,
    isValidWinnerCount,
    isWeeklyActivityScope,
    isWeeklyActivityType,
} from './types';
import { CATEGORY_CHANNEL_TYPE } from './aggregation';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

export interface RuleInput {
    name: string;
    scope: string;
    category_id?: string | null;
    activity_type: string;
    winner_count: number;
    reward_role_id: string;
    enabled?: boolean;
    priority?: number;
    min_chat_messages?: number;
    min_voice_seconds?: number;
}

export interface ValidationResult {
    ok: boolean;
    error?: string;
    code?: string;
}

export function validateRuleShape(input: Partial<RuleInput>): ValidationResult {
    if (!input.name || !String(input.name).trim()) {
        return { ok: false, error: 'Rule name is required.', code: 'invalid_name' };
    }
    if (String(input.name).trim().length > 100) {
        return { ok: false, error: 'Rule name must be 100 characters or fewer.', code: 'invalid_name' };
    }
    if (!isWeeklyActivityScope(input.scope)) {
        return { ok: false, error: 'Scope must be "all_server" or "category".', code: 'invalid_scope' };
    }
    if (input.scope === 'category' && !input.category_id) {
        return { ok: false, error: 'A category must be selected for category scoped rules.', code: 'missing_category' };
    }
    if (!isWeeklyActivityType(input.activity_type)) {
        return { ok: false, error: 'Activity type must be "chat", "vc" or "both".', code: 'invalid_activity_type' };
    }
    if (!isValidWinnerCount(input.winner_count)) {
        return {
            ok: false,
            error: `Winner count must be a whole number between ${MIN_WINNER_COUNT} and ${MAX_WINNER_COUNT}.`,
            code: 'invalid_winner_count',
        };
    }
    if (!input.reward_role_id || !/^\d{5,25}$/.test(String(input.reward_role_id))) {
        return { ok: false, error: 'A valid reward role must be selected.', code: 'invalid_role' };
    }
    // Validate minimum thresholds
    const needsChat = input.activity_type === 'chat' || input.activity_type === 'both';
    const needsVoice = input.activity_type === 'vc' || input.activity_type === 'both';
    if (needsChat && input.min_chat_messages !== undefined) {
        const v = Number(input.min_chat_messages);
        if (!Number.isInteger(v) || v < 0 || v > 100000) {
            return { ok: false, error: 'Minimum messages must be between 0 and 100,000.', code: 'invalid_min_chat' };
        }
    }
    if (needsVoice && input.min_voice_seconds !== undefined) {
        const v = Number(input.min_voice_seconds);
        if (!Number.isInteger(v) || v < 0 || v > 604800) {
            return { ok: false, error: 'Minimum voice time must be between 0 and 604,800 seconds (1 week).', code: 'invalid_min_voice' };
        }
    }
    return { ok: true };
}

export async function validateCategory(guildId: string, categoryId: string): Promise<ValidationResult> {
    const channel = await prismaBot.discordChannelCache.findFirst({
        where: { channel_id: categoryId, guild_id: guildId, is_deleted: false },
    });
    if (!channel) {
        return { ok: false, error: 'The selected category no longer exists.', code: 'missing_category' };
    }
    if (channel.type !== CATEGORY_CHANNEL_TYPE) {
        return { ok: false, error: 'The selected channel is not a category.', code: 'invalid_category' };
    }
    return { ok: true };
}

export interface GuildRoleInfo {
    id: string;
    name: string;
    color: number;
    position: number;
    managed: boolean;
}

export async function fetchGuildRoles(guildId: string): Promise<GuildRoleInfo[]> {
    if (!BOT_TOKEN) return [];
    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` },
            next: { revalidate: 60 },
        });
        if (!response.ok) return [];
        const raw = await response.json();
        return (Array.isArray(raw) ? raw : []).map((role: any) => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
            managed: !!role.managed,
        }));
    } catch {
        return [];
    }
}

export async function fetchBotHighestRolePosition(
    guildId: string,
    roles: GuildRoleInfo[]
): Promise<number | null> {
    if (!BOT_TOKEN) return null;
    try {
        const appResponse = await fetch('https://discord.com/api/v10/oauth2/applications/@me', {
            headers: { Authorization: `Bot ${BOT_TOKEN}` },
            next: { revalidate: 3600 },
        });
        if (!appResponse.ok) return null;
        const app = await appResponse.json();
        const botId = app?.id;
        if (!botId) return null;
        const memberResponse = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${botId}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` }, next: { revalidate: 60 } }
        );
        if (!memberResponse.ok) return null;
        const member = await memberResponse.json();
        const positions = (member?.roles || [])
            .map((roleId: string) => roles.find((role) => role.id === roleId)?.position ?? 0);
        if (positions.length === 0) return 0;
        return Math.max(...positions);
    } catch {
        return null;
    }
}

export async function validateRewardRole(guildId: string, roleId: string): Promise<ValidationResult> {
    const roles = await fetchGuildRoles(guildId);
    if (roles.length === 0) return { ok: true };
    const role = roles.find((candidate) => candidate.id === roleId);
    if (!role) {
        return { ok: false, error: 'The selected role no longer exists in this server.', code: 'role_missing' };
    }
    if (role.managed) {
        return { ok: false, error: 'Managed / integration roles cannot be assigned by the bot.', code: 'role_managed' };
    }
    const botPosition = await fetchBotHighestRolePosition(guildId, roles);
    if (botPosition !== null && botPosition <= role.position) {
        return {
            ok: false,
            error: `The bot's highest role must be above @${role.name} for it to manage that role.`,
            code: 'role_hierarchy',
        };
    }
    return { ok: true };
}

export async function validateRuleInput(guildId: string, input: RuleInput): Promise<ValidationResult> {
    const shape = validateRuleShape(input);
    if (!shape.ok) return shape;
    if (input.scope === 'category' && input.category_id) {
        const category = await validateCategory(guildId, input.category_id);
        if (!category.ok) return category;
    }
    return validateRewardRole(guildId, input.reward_role_id);
}
