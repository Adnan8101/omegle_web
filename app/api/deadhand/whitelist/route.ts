import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

async function checkHierarchyPermission(session: any, guildId: string): Promise<boolean> {
    if (!session?.user?.id) return false;
    try {
        const botToken = process.env.BOT_TOKEN;
        const botId = process.env.BOT_CLIENT_ID;
        if (!botToken || !botId) return false;
        const [guildRes, botRes, userRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers: { Authorization: `Bot ${botToken}` } }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${botId}`, { headers: { Authorization: `Bot ${botToken}` } }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${session.user.id}`, { headers: { Authorization: `Bot ${botToken}` } }),
        ]);
        if (!guildRes.ok || !userRes.ok) return false;
        const guild = await guildRes.json();
        if (guild.owner_id === session.user.id) return true;
        if (!botRes.ok) return false;
        const [botMember, userMember] = await Promise.all([botRes.json(), userRes.json()]);
        const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers: { Authorization: `Bot ${botToken}` } });
        if (!rolesRes.ok) return false;
        const allRoles: any[] = await rolesRes.json();
        const roleMap = new Map(allRoles.map((r: any) => [r.id, r.position]));
        const botPos = Math.max(0, ...((botMember.roles as string[]).map((r: string) => roleMap.get(r) ?? 0)));
        const userPos = Math.max(0, ...((userMember.roles as string[]).map((r: string) => roleMap.get(r) ?? 0)));
        return userPos > botPos;
    } catch { return false; }
}

// GET /api/deadhand/whitelist?guildId=...
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });
    try {
        const list = await (prismaBot as any).deadHandGlobalWhitelist.findMany({ where: { guild_id: guildId } });
        return NextResponse.json(list);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/deadhand/whitelist  { guildId, target_id, type }
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { guildId, target_id, type } = body;
    if (!guildId || !target_id || !type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });
    try {
        const entry = await (prismaBot as any).deadHandGlobalWhitelist.upsert({
            where: { guild_id_target_id: { guild_id: guildId, target_id } },
            update: { type },
            create: { guild_id: guildId, target_id, type, added_by: session.user!.id! },
        });
        return NextResponse.json(entry);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/deadhand/whitelist  { guildId, target_id }
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { guildId, target_id } = body;
    if (!guildId || !target_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });
    try {
        await (prismaBot as any).deadHandGlobalWhitelist.delete({
            where: { guild_id_target_id: { guild_id: guildId, target_id } },
        });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
