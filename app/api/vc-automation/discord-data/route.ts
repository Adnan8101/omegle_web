import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { GUILD_ID } from '@/lib/constants';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const perms = session.user.permissions;
        if (!perms?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const allChannels = await prismaBot.discordChannelCache.findMany({
            where: {
                guild_id: GUILD_ID,
                is_deleted: false,
                type: { in: [2, 4, 13] },
            },
            orderBy: [{ parent_id: 'asc' }, { position: 'asc' }],
        });
        const categories = allChannels
            .filter((c) => c.type === 4)
            .map((c) => ({ id: c.channel_id, name: c.name, type: 'category' }));
        const voiceChannels = allChannels
            .filter((c) => c.type === 2 || c.type === 13)
            .map((c) => ({
                id: c.channel_id,
                name: c.name,
                parent_id: c.parent_id,
                parent_name: c.parent_name,
                type: 'voice',
            }));
        let roles: any[] = [];
        if (BOT_TOKEN) {
            try {
                const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
                    headers: { Authorization: `Bot ${BOT_TOKEN}` },
                    next: { revalidate: 60 },
                });
                if (res.ok) {
                    const rawRoles = await res.json();
                    roles = (Array.isArray(rawRoles) ? rawRoles : [])
                        .filter((r: any) => !r.managed && r.name !== '@everyone')
                        .map((r: any) => ({
                            id: r.id,
                            name: r.name,
                            color: r.color,
                            position: r.position,
                        }))
                        .sort((a: any, b: any) => b.position - a.position);
                }
            } catch {
            }
        }
        return NextResponse.json({ categories, voiceChannels, roles });
    } catch (error) {
        console.error('[VCAutomation] GET /discord-data error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}