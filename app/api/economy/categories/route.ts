import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

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

    // Check if BOT_TOKEN exists
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('BOT_TOKEN environment variable is not set');
      return NextResponse.json({ 
        error: 'Bot configuration error',
        details: 'BOT_TOKEN is not configured' 
      }, { status: 500 });
    }

    // Fetch channels from Discord
    let channels: any[] = [];
    try {
      console.log('Fetching Discord channels for guild:', GUILD_ID);
      
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store', // Disable caching for fresh data
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Discord API error:', response.status, errorText);
        
        // Return specific error messages
        if (response.status === 401) {
          return NextResponse.json({ 
            error: 'Discord authentication failed',
            details: 'Bot token may be invalid' 
          }, { status: 500 });
        }
        if (response.status === 403) {
          return NextResponse.json({ 
            error: 'Discord permission denied',
            details: 'Bot may not have access to this guild' 
          }, { status: 500 });
        }
        if (response.status === 404) {
          return NextResponse.json({ 
            error: 'Discord guild not found',
            details: 'Guild ID may be incorrect or bot is not in the guild' 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          error: 'Discord API error',
          details: `Status ${response.status}: ${errorText}` 
        }, { status: 500 });
      }

      channels = await response.json();
      console.log('Successfully fetched', channels.length, 'channels from Discord');
      
    } catch (discordError: any) {
      console.error('Discord fetch error:', discordError);
      return NextResponse.json({ 
        error: 'Failed to connect to Discord',
        details: discordError.message || 'Network error'
      }, { status: 500 });
    }

    // Filter categories (type 4 = category)
    const categories = channels
      .filter((ch: any) => ch.type === 4)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        position: ch.position
      }))
      .sort((a: any, b: any) => a.position - b.position);

    console.log('Found', categories.length, 'categories');

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

    // Get existing category rewards from database
    let categoryRewards: any[] = [];
    let blacklistedChannels: any[] = [];
    let blacklistedCategories: any[] = [];
    let blacklistedRoles: any[] = [];
    
    try {
      categoryRewards = await prismaBot.economyCategoryReward.findMany({
        where: { guild_id: GUILD_ID }
      });

      // Get blacklisted items
      const [blChannels, blCategories, blRoles] = await Promise.all([
        prismaBot.economyBlacklistChannel.findMany({ where: { guild_id: GUILD_ID } }),
        prismaBot.economyBlacklistCategory.findMany({ where: { guild_id: GUILD_ID } }),
        prismaBot.economyBlacklistRole.findMany({ where: { guild_id: GUILD_ID } })
      ]);
      
      blacklistedChannels = blChannels;
      blacklistedCategories = blCategories;
      blacklistedRoles = blRoles;
      
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      // Continue with empty arrays if database fails - at least show Discord categories
    }

    return NextResponse.json({
      categories,
      textChannels,
      voiceChannels,
      categoryRewards: categoryRewards.map((cr: any) => ({
        id: cr.id,
        categoryId: cr.category_id,
        categoryName: cr.category_name,
        vcEnabled: cr.vc_enabled,
        vcMinutesPerPoint: cr.vc_minutes_per_point,
        messageEnabled: cr.message_enabled,
        messagesPerPoint: cr.messages_per_point
      })),
      blacklist: {
        channels: blacklistedChannels.map((c: any) => ({ id: c.channel_id, type: c.channel_type })),
        categories: blacklistedCategories.map((c: any) => c.category_id),
        roles: blacklistedRoles.map((r: any) => r.role_id)
      }
    });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
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
  } catch (error: any) {
    console.error('Error saving category reward:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
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
  } catch (error: any) {
    console.error('Error deleting category reward:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
