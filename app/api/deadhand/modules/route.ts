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
        const botHighestPos = Math.max(0, ...((botMember.roles as string[]).map((r: string) => roleMap.get(r) ?? 0)));
        const userHighestPos = Math.max(0, ...((userMember.roles as string[]).map((r: string) => roleMap.get(r) ?? 0)));
        return userHighestPos > botHighestPos;
    } catch { return false; }
}

// GET /api/deadhand/modules?guildId=...
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });
    try {
        const modules = await (prismaBot as any).deadHandModule.findMany({ where: { guild_id: guildId } });
        return NextResponse.json(modules);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/deadhand/modules  { guildId, module_name, ...fields }
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { guildId, module_name, ...updates } = body;
    if (!guildId || !module_name) return NextResponse.json({ error: 'guildId and module_name required' }, { status: 400 });
    const allowed = await checkHierarchyPermission(session, guildId);
    if (!allowed) return NextResponse.json({ error: 'Insufficient role hierarchy' }, { status: 403 });
    try {
        const mod = await (prismaBot as any).deadHandModule.update({
            where: { guild_id_module_name: { guild_id: guildId, module_name } },
            data: updates,
        });
        return NextResponse.json(mod);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
