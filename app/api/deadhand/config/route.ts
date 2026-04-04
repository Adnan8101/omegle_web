import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const MODULE_DEFAULTS = [
    { module_name: 'anti_ban',            severity: 'high',     threshold_short: 3, time_span_short_secs: 10, threshold_long: 6, time_span_long_secs: 60 },
    { module_name: 'anti_kick',           severity: 'high',     threshold_short: 3, time_span_short_secs: 10, threshold_long: 6, time_span_long_secs: 60 },
    { module_name: 'anti_bot',            severity: 'high',     threshold_short: 2, time_span_short_secs: 10, threshold_long: 4, time_span_long_secs: 60 },
    { module_name: 'anti_prune',          severity: 'high',     threshold_short: 1, time_span_short_secs: 30, threshold_long: 2, time_span_long_secs: 120 },
    { module_name: 'anti_channel_delete', severity: 'high',     threshold_short: 3, time_span_short_secs: 10, threshold_long: 5, time_span_long_secs: 60 },
    { module_name: 'anti_channel_update', severity: 'low',      threshold_short: 5, time_span_short_secs: 10, threshold_long: 8, time_span_long_secs: 60 },
    { module_name: 'anti_role_create',    severity: 'high',     threshold_short: 3, time_span_short_secs: 10, threshold_long: 5, time_span_long_secs: 60 },
    { module_name: 'anti_role_delete',    severity: 'high',     threshold_short: 3, time_span_short_secs: 10, threshold_long: 5, time_span_long_secs: 60 },
    { module_name: 'anti_server_update',  severity: 'low',      threshold_short: 3, time_span_short_secs: 10, threshold_long: 5, time_span_long_secs: 60 },
    { module_name: 'anti_webhook_create', severity: 'medium',   threshold_short: 3, time_span_short_secs: 10, threshold_long: 5, time_span_long_secs: 60 },
    { module_name: 'anti_webhook_update', severity: 'medium',   threshold_short: 5, time_span_short_secs: 10, threshold_long: 8, time_span_long_secs: 60 },
    { module_name: 'anti_webhook_delete', severity: 'medium',   threshold_short: 3, time_span_short_secs: 10, threshold_long: 5, time_span_long_secs: 60 },
    { module_name: 'anti_danger_perms',   severity: 'critical', threshold_short: 1, time_span_short_secs: 5,  threshold_long: 2, time_span_long_secs: 30 },
];

// ---------------------------------------------------------------------------
// Check if the requesting user has permission to manage Dead Hand for this guild
// ---------------------------------------------------------------------------
async function checkHierarchyPermission(session: any, guildId: string): Promise<boolean> {
    if (!session?.user?.id) return false;
    try {
        const botToken = process.env.BOT_TOKEN;
        const botId = process.env.BOT_CLIENT_ID;
        if (!botToken || !botId) return false;

        const [guildRes, botMemberRes, userMemberRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
                headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
            }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${botId}`, {
                headers: { Authorization: `Bot ${botToken}` },
            }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${session.user.id}`, {
                headers: { Authorization: `Bot ${botToken}` },
            }),
        ]);

        if (!guildRes.ok || !userMemberRes.ok) return false;
        const guild = await guildRes.json();

        // Server owner always allowed
        if (guild.owner_id === session.user.id) return true;

        if (!botMemberRes.ok) return false;

        const botMember = await botMemberRes.json();
        const userMember = await userMemberRes.json();

        // Fetch roles to compare positions
        const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${botToken}` },
        });
        if (!rolesRes.ok) return false;
        const allRoles: any[] = await rolesRes.json();
        const roleMap = new Map(allRoles.map((r: any) => [r.id, r.position]));

        const botHighestPos = Math.max(0, ...((botMember.roles as string[]).map(r => roleMap.get(r) ?? 0)));
        const userHighestPos = Math.max(0, ...((userMember.roles as string[]).map(r => roleMap.get(r) ?? 0)));

        return userHighestPos > botHighestPos;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// GET /api/deadhand/config?guildId=...
// POST /api/deadhand/config  { guildId, enabled?, strict_mode?, log_channel_id?, emergency_lock_level? }
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });

    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });

    try {
        let config = await (prismaBot as any).deadHandConfig.findUnique({
            where: { guild_id: guildId },
            include: { modules: true, whitelist: true },
        });

        if (!config) {
            // Auto-create config + default modules
            config = await (prismaBot as any).deadHandConfig.create({
                data: {
                    guild_id: guildId,
                    modules: {
                        create: MODULE_DEFAULTS.map(m => ({
                            ...m,
                            action: 'mute',
                            cooldown_secs: 60,
                            whitelist_roles: [],
                            whitelist_users: [],
                            protected_roles: [],
                        })),
                    },
                },
                include: { modules: true, whitelist: true },
            });
        }

        return NextResponse.json(config);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { guildId, enabled, strict_mode, log_channel_id, emergency_lock_level } = body;
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });

    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });

    try {
        const config = await (prismaBot as any).deadHandConfig.upsert({
            where: { guild_id: guildId },
            update: {
                ...(enabled !== undefined && { enabled }),
                ...(strict_mode !== undefined && { strict_mode }),
                ...(log_channel_id !== undefined && { log_channel_id }),
                ...(emergency_lock_level !== undefined && { emergency_lock_level }),
            },
            create: { guild_id: guildId, enabled: enabled ?? false },
        });
        return NextResponse.json(config);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
