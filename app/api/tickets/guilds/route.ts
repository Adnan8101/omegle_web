import { prismaBot } from '@/lib/prismaBot';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

export async function GET() {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user?.id || !session?.accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const accessToken = session.accessToken;
        const hasFullAccess = session.user.permissions?.hasFullAccess;
        
        // Fetch user's guilds from Discord
        let userGuilds: any[] = [];
        try {
            const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                headers: { Authorization: `Bearer ${accessToken}` },
                next: { revalidate: 30 },
            });
            if (res.ok) {
                userGuilds = await res.json();
            } else {
                console.error('[Tickets Guilds API] Discord @me/guilds fetch failed:', res.status, res.statusText);
            }
        } catch (err) {
            console.error('[Tickets Guilds API] Discord @me/guilds fetch error:', err);
        }
        
        const userGuildsMap = new Map(userGuilds.map((g: any) => [g.id, g]));
        
        // Fetch allowed guilds
        const allowedGuilds = await prismaBot.allowedGuild.findMany({
            orderBy: { added_at: 'desc' }
        });
        
        const matchedGuilds = [];
        
        for (const guild of allowedGuilds) {
            // 1. If user is a global developer with full access, allow them automatically
            if (hasFullAccess) {
                matchedGuilds.push({
                    guild_id: guild.guild_id,
                    guild_name: guild.guild_name || `Guild ${guild.guild_id}`
                });
                continue;
            }
            
            const userGuild = userGuildsMap.get(guild.guild_id);
            if (!userGuild) continue; // User is not in this guild
            
            // 2. Check Discord owner or admin/manage permissions
            const permissions = BigInt(userGuild.permissions || '0');
            const isOwner = userGuild.owner === true;
            const isAdmin = (permissions & 0x8n) !== 0n;
            const isManager = (permissions & 0x20n) !== 0n;
            
            if (isOwner || isAdmin || isManager) {
                matchedGuilds.push({
                    guild_id: guild.guild_id,
                    guild_name: guild.guild_name || userGuild.name || `Guild ${guild.guild_id}`
                });
                continue;
            }
            
            // 3. Check configured bot admin or mod roles in the guild
            if (BOT_TOKEN) {
                try {
                    const memberRes = await fetch(
                        `https://discord.com/api/v10/guilds/${guild.guild_id}/members/${userId}`,
                        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
                    );
                    if (memberRes.ok) {
                        const memberData = await memberRes.json();
                        const memberRoles = memberData.roles || [];
                        
                        const [adminRoleRecord, modRoles] = await Promise.all([
                            prismaBot.adminRole.findUnique({ where: { guild_id: guild.guild_id } }),
                            prismaBot.modRole.findMany({ where: { guild_id: guild.guild_id } })
                        ]);
                        
                        const hasBotAccess = 
                            (adminRoleRecord && memberRoles.includes(adminRoleRecord.role_id)) || 
                            memberRoles.some((rId: string) => modRoles.some((mr: any) => mr.role_id === rId));
                            
                        if (hasBotAccess) {
                            matchedGuilds.push({
                                guild_id: guild.guild_id,
                                guild_name: guild.guild_name || userGuild.name || `Guild ${guild.guild_id}`
                            });
                        }
                    }
                } catch (err) {
                    console.error(`[Tickets Guilds API] Error fetching member roles for guild ${guild.guild_id}:`, err);
                }
            }
        }
        
        // If matchedGuilds is empty, but database has no allowed guilds, fallback to default for main server
        if (matchedGuilds.length === 0 && allowedGuilds.length === 0) {
            matchedGuilds.push({
                guild_id: '1507458872225566811',
                guild_name: 'Omeglee Server'
            });
        }
        
        return NextResponse.json({ success: true, guilds: matchedGuilds });
    } catch (error) {
        console.error('[Tickets Guilds API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
    }
}
