import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { fetchBotHighestRolePosition, fetchGuildRoles } from '@/lib/weeklyActivity/validation';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const CATEGORY_TYPE = 4;
const TEXT_TYPES = [0, 5, 15];
const VOICE_TYPES = [2, 13];

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const channels = await prismaBot.discordChannelCache.findMany({
            where: {
                guild_id: GUILD_ID,
                is_deleted: false,
                type: { in: [CATEGORY_TYPE, ...TEXT_TYPES, ...VOICE_TYPES] },
            },
            orderBy: [{ parent_id: 'asc' }, { position: 'asc' }],
        });
        const categories = channels
            .filter((channel) => channel.type === CATEGORY_TYPE)
            .map((channel) => {
                const children = channels.filter((child) => child.parent_id === channel.channel_id);
                return {
                    id: channel.channel_id,
                    name: channel.name,
                    textChannelCount: children.filter((child) => TEXT_TYPES.includes(child.type)).length,
                    voiceChannelCount: children.filter((child) => VOICE_TYPES.includes(child.type)).length,
                };
            });
        const roles = await fetchGuildRoles(GUILD_ID);
        const assignable = roles.filter((role) => !role.managed && role.name !== '@everyone');
        const botHighestPosition = await fetchBotHighestRolePosition(GUILD_ID, roles);
        return NextResponse.json({
            categories,
            roles: assignable
                .map((role) => ({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position,
                    manageable: botHighestPosition === null ? true : botHighestPosition > role.position,
                }))
                .sort((a, b) => b.position - a.position),
            botHighestPosition,
        });
    } catch (error) {
        console.error('[WeeklyActivity] GET /discord-data error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
