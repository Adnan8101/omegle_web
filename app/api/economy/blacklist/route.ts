import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";
const BOT_TOKEN = process.env.BOT_TOKEN;

// GET - Fetch blacklisted items
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
    const channelsResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    // Fetch roles from Discord
    const rolesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    const [channels, roles] = await Promise.all([
      channelsResponse.ok ? channelsResponse.json() : [],
      rolesResponse.ok ? rolesResponse.json() : []
    ]);

    // Get blacklisted items from database
    const [blacklistedChannels, blacklistedCategories, blacklistedRoles] = await Promise.all([
      prismaBot.economyBlacklistChannel.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistCategory.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistRole.findMany({ where: { guild_id: GUILD_ID } })
    ]);

    // Map to include names
    const categories = channels
      .filter((ch: any) => ch.type === 4)
      .map((ch: any) => ({ id: ch.id, name: ch.name, position: ch.position }))
      .sort((a: any, b: any) => a.position - b.position);

    const textChannels = channels
      .filter((ch: any) => ch.type === 0)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        parentId: ch.parent_id,
        parentName: channels.find((c: any) => c.id === ch.parent_id)?.name || 'No Category',
        type: 'text'
      }));

    const voiceChannels = channels
      .filter((ch: any) => ch.type === 2)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        parentId: ch.parent_id,
        parentName: channels.find((c: any) => c.id === ch.parent_id)?.name || 'No Category',
        type: 'voice'
      }));

    const formattedRoles = roles
      .filter((r: any) => r.name !== '@everyone')
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position
      }))
      .sort((a: any, b: any) => b.position - a.position);

    return NextResponse.json({
      available: {
        categories,
        textChannels,
        voiceChannels,
        roles: formattedRoles
      },
      blacklisted: {
        channels: blacklistedChannels.map(c => ({
          id: c.channel_id,
          type: c.channel_type,
          name: [...textChannels, ...voiceChannels].find(ch => ch.id === c.channel_id)?.name || 'Unknown'
        })),
        categories: blacklistedCategories.map(c => ({
          id: c.category_id,
          name: categories.find((cat: any) => cat.id === c.category_id)?.name || 'Unknown'
        })),
        roles: blacklistedRoles.map(r => ({
          id: r.role_id,
          name: formattedRoles.find((role: any) => role.id === r.role_id)?.name || 'Unknown',
          color: formattedRoles.find((role: any) => role.id === r.role_id)?.color || 0
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add item to blacklist
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
    const { type, id, channelType } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    switch (type) {
      case 'channel':
        await prismaBot.economyBlacklistChannel.upsert({
          where: {
            guild_id_channel_id: {
              guild_id: GUILD_ID,
              channel_id: id
            }
          },
          create: {
            guild_id: GUILD_ID,
            channel_id: id,
            channel_type: channelType || 'text',
            added_by: session.user.id
          },
          update: {}
        });
        break;

      case 'category':
        await prismaBot.economyBlacklistCategory.upsert({
          where: {
            guild_id_category_id: {
              guild_id: GUILD_ID,
              category_id: id
            }
          },
          create: {
            guild_id: GUILD_ID,
            category_id: id,
            added_by: session.user.id
          },
          update: {}
        });
        break;

      case 'role':
        await prismaBot.economyBlacklistRole.upsert({
          where: {
            guild_id_role_id: {
              guild_id: GUILD_ID,
              role_id: id
            }
          },
          create: {
            guild_id: GUILD_ID,
            role_id: id,
            added_by: session.user.id
          },
          update: {}
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove item from blacklist
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
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    switch (type) {
      case 'channel':
        await prismaBot.economyBlacklistChannel.delete({
          where: {
            guild_id_channel_id: {
              guild_id: GUILD_ID,
              channel_id: id
            }
          }
        });
        break;

      case 'category':
        await prismaBot.economyBlacklistCategory.delete({
          where: {
            guild_id_category_id: {
              guild_id: GUILD_ID,
              category_id: id
            }
          }
        });
        break;

      case 'role':
        await prismaBot.economyBlacklistRole.delete({
          where: {
            guild_id_role_id: {
              guild_id: GUILD_ID,
              role_id: id
            }
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
