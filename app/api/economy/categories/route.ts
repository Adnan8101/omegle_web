import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";
const BOT_TOKEN = process.env.BOT_TOKEN;

// GET - Fetch all categories from Discord
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch channels from Discord
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch channels from Discord');
    }

    const channels = await response.json();

    console.log('Total channels fetched:', channels.length);

    // Filter categories (type 4 = category)
    const categories = channels
      .filter((ch: any) => ch.type === 4)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        position: ch.position
      }))
      .sort((a: any, b: any) => a.position - b.position);

    console.log('Categories found:', categories.length, categories.map((c: any) => c.name));

    // Get all channels organized by category
    const textChannels = channels
      .filter((ch: any) => ch.type === 0)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        parentId: ch.parent_id,
        position: ch.position,
        type: 'text'
      }));

    const voiceChannels = channels
      .filter((ch: any) => ch.type === 2)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        parentId: ch.parent_id,
        position: ch.position,
        type: 'voice'
      }));

    // Get existing category rewards
    const categoryRewards = await prismaBot.economyCategoryReward.findMany({
      where: { guild_id: GUILD_ID }
    });

    // Get blacklisted items
    const [blacklistedChannels, blacklistedCategories, blacklistedRoles] = await Promise.all([
      prismaBot.economyBlacklistChannel.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistCategory.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistRole.findMany({ where: { guild_id: GUILD_ID } })
    ]);

    return NextResponse.json({
      categories,
      textChannels,
      voiceChannels,
      categoryRewards: categoryRewards.map(cr => ({
        id: cr.id,
        categoryId: cr.category_id,
        categoryName: cr.category_name,
        vcEnabled: cr.vc_enabled,
        vcMinutesPerPoint: cr.vc_minutes_per_point,
        messageEnabled: cr.message_enabled,
        messagesPerPoint: cr.messages_per_point
      })),
      blacklist: {
        channels: blacklistedChannels.map(c => ({ id: c.channel_id, type: c.channel_type })),
        categories: blacklistedCategories.map(c => c.category_id),
        roles: blacklistedRoles.map(r => r.role_id)
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create/Update category reward
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      categoryId, 
      categoryName,
      vcEnabled, 
      vcMinutesPerPoint, 
      messageEnabled, 
      messagesPerPoint 
    } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const reward = await prismaBot.economyCategoryReward.upsert({
      where: {
        guild_id_category_id: {
          guild_id: GUILD_ID,
          category_id: categoryId
        }
      },
      create: {
        guild_id: GUILD_ID,
        category_id: categoryId,
        category_name: categoryName,
        vc_enabled: vcEnabled ?? true,
        vc_minutes_per_point: vcMinutesPerPoint ?? 1,
        message_enabled: messageEnabled ?? true,
        messages_per_point: messagesPerPoint ?? 25
      },
      update: {
        category_name: categoryName,
        vc_enabled: vcEnabled,
        vc_minutes_per_point: vcMinutesPerPoint,
        message_enabled: messageEnabled,
        messages_per_point: messagesPerPoint
      }
    });

    return NextResponse.json({ success: true, reward });
  } catch (error) {
    console.error('Error saving category reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove category reward
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    await prismaBot.economyCategoryReward.delete({
      where: {
        guild_id_category_id: {
          guild_id: GUILD_ID,
          category_id: categoryId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category reward:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
