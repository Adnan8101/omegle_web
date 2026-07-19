import { prismaBot } from '@/lib/prismaBot';
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guildId');
        
        if (!guildId) {
            return NextResponse.json({ error: 'guildId query parameter is required' }, { status: 400 });
        }
        
        // Fetch channels from cache for this guildId
        const allChannels = await prismaBot.discordChannelCache.findMany({
            where: {
                guild_id: guildId,
                is_deleted: false,
            },
            orderBy: [{ parent_id: 'asc' }, { position: 'asc' }],
        });
        
        const categories = allChannels
            .filter((c) => c.type === 4) // Category
            .map((c) => ({ id: c.channel_id, name: c.name }));
            
        const textChannels = allChannels
            .filter((c) => c.type === 0 || c.type === 5) // Text or Announcement
            .map((c) => ({ id: c.channel_id, name: c.name }));
            
        let roles: any[] = [];
        if (BOT_TOKEN) {
            try {
                const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
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
                        }));
                } else {
                    console.error(`[Tickets Discord Data] Failed to fetch roles for ${guildId}:`, res.status, res.statusText);
                }
            } catch (err) {
                console.error('[Tickets Discord Data] Role fetch error:', err);
            }
        }
        
        return NextResponse.json({ categories, textChannels, roles });
    } catch (error) {
        console.error('[Tickets Discord Data API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch Discord data' }, { status: 500 });
    }
}
