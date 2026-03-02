import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// GET - Fetch all categories from Discord
export async function GET(request: NextRequest) {
  console.log('=== CATEGORIES API START ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Step 1: Check session
    console.log('Step 1: Getting session...');
    const session = await getServerSession(authOptions);
    console.log('Session user ID:', session?.user?.id || 'NO SESSION');
    
    if (!session?.user?.id) {
      console.log('ERROR: No session - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Check permissions
    console.log('Step 2: Checking permissions...');
    const perms = session.user.permissions;
    console.log('Permissions:', JSON.stringify(perms));
    
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      console.log('ERROR: No casino access - returning 403');
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Step 3: Check BOT_TOKEN
    console.log('Step 3: Checking DISCORD_BOT_TOKEN...');
    const botToken = process.env.DISCORD_BOT_TOKEN;
    console.log('BOT_TOKEN exists:', !!botToken);
    console.log('BOT_TOKEN length:', botToken?.length || 0);
    console.log('BOT_TOKEN first 20 chars:', botToken?.substring(0, 20) || 'MISSING');
    
    if (!botToken) {
      console.log('ERROR: DISCORD_BOT_TOKEN is not set');
      return NextResponse.json({ 
        error: 'Bot configuration error',
        details: 'DISCORD_BOT_TOKEN is not configured' 
      }, { status: 500 });
    }

    // Step 4: Fetch channels from Discord
    console.log('Step 4: Fetching Discord channels...');
    console.log('Guild ID:', GUILD_ID);
    
    let channels: any[] = [];
    try {
      const discordUrl = `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`;
      console.log('Discord URL:', discordUrl);
      
      const response = await fetch(discordUrl, {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      console.log('Discord response status:', response.status);
      console.log('Discord response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Discord API error text:', errorText);
        
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
      console.log('Channels fetched successfully, count:', channels.length);
      
    } catch (discordError: any) {
      console.log('Discord fetch EXCEPTION:', discordError.message);
      console.log('Discord fetch stack:', discordError.stack);
      return NextResponse.json({ 
        error: 'Failed to connect to Discord',
        details: discordError.message || 'Network error'
      }, { status: 500 });
    }

    // Step 5: Process channels
    console.log('Step 5: Processing channels...');
    const categories = channels
      .filter((ch: any) => ch.type === 4)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        position: ch.position
      }))
      .sort((a: any, b: any) => a.position - b.position);

    console.log('Categories found:', categories.length);

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

    console.log('Text channels:', textChannels.length);
    console.log('Voice channels:', voiceChannels.length);

    // Step 6: Fetch database records
    console.log('Step 6: Fetching database records...');
    let categoryRewards: any[] = [];
    let blacklistedChannels: any[] = [];
    let blacklistedCategories: any[] = [];
    let blacklistedRoles: any[] = [];
    
    try {
      console.log('Querying economyCategoryReward...');
      categoryRewards = await prismaBot.economyCategoryReward.findMany({
        where: { guild_id: GUILD_ID }
      });
      console.log('Category rewards found:', categoryRewards.length);

      console.log('Querying blacklist tables...');
      const [blChannels, blCategories, blRoles] = await Promise.all([
        prismaBot.economyBlacklistChannel.findMany({ where: { guild_id: GUILD_ID } }),
        prismaBot.economyBlacklistCategory.findMany({ where: { guild_id: GUILD_ID } }),
        prismaBot.economyBlacklistRole.findMany({ where: { guild_id: GUILD_ID } })
      ]);
      
      blacklistedChannels = blChannels;
      blacklistedCategories = blCategories;
      blacklistedRoles = blRoles;
      console.log('Blacklist - channels:', blChannels.length, 'categories:', blCategories.length, 'roles:', blRoles.length);
      
    } catch (dbError: any) {
      console.log('Database EXCEPTION:', dbError.message);
      console.log('Database stack:', dbError.stack);
      // Continue with empty arrays - at least show Discord categories
    }

    // Step 7: Build response
    console.log('Step 7: Building response...');
    const responseData = {
      categories,
      textChannels,
      voiceChannels,
      categoryRewards: categoryRewards.map((cr: any) => ({
        id: cr.id,
        categoryId: cr.category_id,
        categoryName: cr.category_name,
        vcEnabled: cr.vc_enabled,
        vcMinutesPerPoint: cr.vc_minutes_per_point,
        vcOzyAmount: cr.vc_ozy_amount || 1,
        vcDailyLimit: cr.vc_daily_limit || 100,
        vcMinMembers: cr.vc_min_members || 2,
        messageEnabled: cr.message_enabled,
        messagesPerPoint: cr.messages_per_point,
        msgOzyAmount: cr.msg_ozy_amount || 1,
        msgDailyLimit: cr.msg_daily_limit || 100,
        msgMinLength: cr.msg_min_length || 5,
        msgCooldown: cr.msg_cooldown || 5
      })),
      blacklist: {
        channels: blacklistedChannels.map((c: any) => ({ id: c.channel_id, type: c.channel_type })),
        categories: blacklistedCategories.map((c: any) => c.category_id),
        roles: blacklistedRoles.map((r: any) => r.role_id)
      }
    };
    
    console.log('=== CATEGORIES API SUCCESS ===');
    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.log('=== CATEGORIES API FATAL ERROR ===');
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    console.log('Error name:', error.name);
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
      vcOzyAmount,
      vcDailyLimit,
      vcMinMembers,
      messageEnabled, 
      messagesPerPoint,
      msgOzyAmount,
      msgDailyLimit,
      msgMinLength,
      msgCooldown
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
        vc_minutes_per_point: vcMinutesPerPoint ?? 5,
        vc_ozy_amount: vcOzyAmount ?? 1,
        vc_daily_limit: vcDailyLimit ?? 100,
        vc_min_members: vcMinMembers ?? 2,
        message_enabled: messageEnabled ?? true,
        messages_per_point: messagesPerPoint ?? 25,
        msg_ozy_amount: msgOzyAmount ?? 1,
        msg_daily_limit: msgDailyLimit ?? 100,
        msg_min_length: msgMinLength ?? 5,
        msg_cooldown: msgCooldown ?? 5
      },
      update: {
        category_name: categoryName,
        vc_enabled: vcEnabled,
        vc_minutes_per_point: vcMinutesPerPoint,
        vc_ozy_amount: vcOzyAmount,
        vc_daily_limit: vcDailyLimit,
        vc_min_members: vcMinMembers,
        message_enabled: messageEnabled,
        messages_per_point: messagesPerPoint,
        msg_ozy_amount: msgOzyAmount,
        msg_daily_limit: msgDailyLimit,
        msg_min_length: msgMinLength,
        msg_cooldown: msgCooldown
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
