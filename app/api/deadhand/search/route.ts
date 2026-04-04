import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/deadhand/search?guildId=...&query=...&type=member|role|channel
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    const query = searchParams.get('query')?.toLowerCase() ?? '';
    const type = searchParams.get('type') ?? 'member'; // member | role | channel
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });

    try {
        if (type === 'member') {
            const res = await fetch(
                `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=10`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            if (!res.ok) return NextResponse.json({ results: [] });
            const members: any[] = await res.json();
            return NextResponse.json({
                results: members.map(m => ({
                    id: m.user.id,
                    name: m.nick ?? m.user.global_name ?? m.user.username,
                    avatarUrl: m.user.avatar
                        ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.webp?size=64`
                        : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.user.discriminator ?? '0') % 5}.png`,
                    type: 'user',
                })),
            });
        }

        if (type === 'role') {
            const res = await fetch(
                `https://discord.com/api/v10/guilds/${guildId}/roles`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            if (!res.ok) return NextResponse.json({ results: [] });
            const roles: any[] = await res.json();
            const filtered = query
                ? roles.filter((r: any) => r.name.toLowerCase().includes(query))
                : roles;
            return NextResponse.json({
                results: filtered.slice(0, 10).map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    color: r.color,
                    type: 'role',
                })),
            });
        }

        if (type === 'channel') {
            const res = await fetch(
                `https://discord.com/api/v10/guilds/${guildId}/channels`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );
            if (!res.ok) return NextResponse.json({ results: [] });
            const channels: any[] = await res.json();
            const filtered = channels.filter((c: any) =>
                c.type === 0 && // text channels only
                (query ? c.name.toLowerCase().includes(query) : true)
            );
            return NextResponse.json({
                results: filtered.slice(0, 10).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    type: 'channel',
                })),
            });
        }

        return NextResponse.json({ results: [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
