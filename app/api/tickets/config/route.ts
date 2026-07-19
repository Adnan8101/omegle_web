import { prismaBot } from '@/lib/prismaBot';
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        
        const categories = await prismaBot.mailCategory.findMany({
            where: { guild_id: guildId }
        });
        
        return NextResponse.json({ success: true, categories });
    } catch (error) {
        console.error('[Tickets Config GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch ticket configurations' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const body = await request.json();
        const { guildId, name, openingCategoryId, transcriptChannelId, staffRoleIds } = body;
        
        if (!guildId || !name || !openingCategoryId || !transcriptChannelId || !Array.isArray(staffRoleIds)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        let result;
        if (name === 'Tech Support') {
            const allMatches = await prismaBot.mailCategory.findMany({
                where: {
                    guild_id: guildId,
                    name: { in: ['Tech Support', 'Support'] }
                }
            });
            const exactMatch = allMatches.find(c => c.name === 'Tech Support');
            const oldMatch = allMatches.find(c => c.name === 'Support');
            
            if (exactMatch) {
                result = await prismaBot.mailCategory.update({
                    where: { id: exactMatch.id },
                    data: {
                        channel_category_id: openingCategoryId,
                        transcript_channel_id: transcriptChannelId,
                        staff_role_ids: staffRoleIds
                    }
                });
                if (oldMatch) {
                    await prismaBot.mailCategory.delete({ where: { id: oldMatch.id } }).catch(() => null);
                }
            } else if (oldMatch) {
                result = await prismaBot.mailCategory.update({
                    where: { id: oldMatch.id },
                    data: {
                        name: 'Tech Support',
                        channel_category_id: openingCategoryId,
                        transcript_channel_id: transcriptChannelId,
                        staff_role_ids: staffRoleIds
                    }
                });
            } else {
                result = await prismaBot.mailCategory.create({
                    data: {
                        guild_id: guildId,
                        name: 'Tech Support',
                        channel_category_id: openingCategoryId,
                        transcript_channel_id: transcriptChannelId,
                        staff_role_ids: staffRoleIds
                    }
                });
            }
        } else {
            const existing = await prismaBot.mailCategory.findFirst({
                where: { guild_id: guildId, name: name }
            });
            if (existing) {
                result = await prismaBot.mailCategory.update({
                    where: { id: existing.id },
                    data: {
                        channel_category_id: openingCategoryId,
                        transcript_channel_id: transcriptChannelId,
                        staff_role_ids: staffRoleIds
                    }
                });
            } else {
                result = await prismaBot.mailCategory.create({
                    data: {
                        guild_id: guildId,
                        name: name,
                        channel_category_id: openingCategoryId,
                        transcript_channel_id: transcriptChannelId,
                        staff_role_ids: staffRoleIds
                    }
                });
            }
        }
        
        // Also ensure MailConfig is enabled for this guild so the bot knows Modmail is enabled.
        await prismaBot.mailConfig.upsert({
            where: { guild_id: guildId },
            update: { enabled: true },
            create: {
                guild_id: guildId,
                inbox_category_id: openingCategoryId,
                enabled: true
            }
        });
        
        return NextResponse.json({ success: true, category: result });
    } catch (error) {
        console.error('[Tickets Config POST] Error:', error);
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }
}
