import { prismaBot } from '@/lib/prismaBot';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const guilds = await prismaBot.allowedGuild.findMany({
            orderBy: { added_at: 'desc' }
        });
        
        // Fallback to default GUILD_ID if database is empty
        if (guilds.length === 0) {
            guilds.push({
                id: 'default',
                guild_id: '1507458872225566811',
                guild_name: 'Omeglee Server',
                added_by: 'System',
                added_at: new Date()
            });
        }
        
        return NextResponse.json({ success: true, guilds });
    } catch (error) {
        console.error('[Tickets Guilds API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
    }
}
