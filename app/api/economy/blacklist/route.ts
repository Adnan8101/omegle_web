import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "1507458872225566811";

export async function GET(request: NextRequest) {
  console.log('=== BLACKLIST API START ===');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not set');
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    console.log('Fetching Discord channels and roles...');

    
    const channelsResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    
    const rolesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    console.log('Channels response:', channelsResponse.status);
    console.log('Roles response:', rolesResponse.status);

    const channels = channelsResponse.ok ? await channelsResponse.json() : [];
    const roles = rolesResponse.ok ? await rolesResponse.json() : [];

    console.log('Channels fetched:', channels.length);
    console.log('Roles fetched:', roles.length);

    
    const [blacklistedChannels, blacklistedCategories, blacklistedRoles, blacklistedMembers] = await Promise.all([
      prismaBot.economyBlacklistChannel.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistCategory.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistRole.findMany({ where: { guild_id: GUILD_ID } }),
      prismaBot.economyBlacklistMember.findMany({ where: { guild_id: GUILD_ID } })
    ]);

    console.log('Blacklisted channels:', blacklistedChannels.length);
    console.log('Blacklisted categories:', blacklistedCategories.length);
    console.log('Blacklisted roles:', blacklistedRoles.length);
    console.log('Blacklisted members:', blacklistedMembers.length);

    
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

    console.log('Available categories:', categories.length);
    console.log('Available text channels:', textChannels.length);
    console.log('Available voice channels:', voiceChannels.length);
    console.log('Available roles:', formattedRoles.length);

    
    const mappedBlacklistedCategories = blacklistedCategories.map(c => {
      const cat = categories.find((cat: any) => cat.id === c.category_id);
      console.log(`Category ${c.category_id} -> ${cat?.name || 'NOT FOUND'}`);
      return {
        id: c.category_id,
        name: cat?.name || 'Unknown'
      };
    });

    const mappedBlacklistedChannels = blacklistedChannels.map(c => {
      const ch = [...textChannels, ...voiceChannels].find(ch => ch.id === c.channel_id);
      console.log(`Channel ${c.channel_id} -> ${ch?.name || 'NOT FOUND'}`);
      return {
        id: c.channel_id,
        type: c.channel_type,
        name: ch?.name || 'Unknown'
      };
    });

    const mappedBlacklistedRoles = blacklistedRoles.map(r => {
      const role = formattedRoles.find((role: any) => role.id === r.role_id);
      console.log(`Role ${r.role_id} -> ${role?.name || 'NOT FOUND'}`);
      return {
        id: r.role_id,
        name: role?.name || 'Unknown',
        color: role?.color || 0
      };
    });

    const mappedBlacklistedMembers = await Promise.all(
      blacklistedMembers.map(async (m) => {
        
        try {
          const memberRes = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${m.user_id}`,
            {
              headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            }
          );

          if (memberRes.ok) {
            const memberData = await memberRes.json();
            const user = memberData.user;
            return {
              id: m.user_id,
              name: user.global_name || user.username,
              username: user.username,
              discriminator: user.discriminator,
              avatar: user.avatar
            };
          }
        } catch (err) {
          console.log(`Could not fetch member ${m.user_id}:`, err);
        }

        
        return {
          id: m.user_id,
          name: m.user_name || `User ${m.user_id}`,
          username: m.user_name,
          discriminator: '0',
          avatar: null
        };
      })
    );

    console.log('=== BLACKLIST API END ===');

    return NextResponse.json({
      available: {
        categories,
        textChannels,
        voiceChannels,
        roles: formattedRoles
      },
      blacklisted: {
        channels: mappedBlacklistedChannels,
        categories: mappedBlacklistedCategories,
        roles: mappedBlacklistedRoles,
        members: mappedBlacklistedMembers
      }
    });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

      case 'member':
        await prismaBot.economyBlacklistMember.upsert({
          where: {
            guild_id_user_id: {
              guild_id: GUILD_ID,
              user_id: id
            }
          },
          create: {
            guild_id: GUILD_ID,
            user_id: id,
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

      case 'member':
        await prismaBot.economyBlacklistMember.delete({
          where: {
            guild_id_user_id: {
              guild_id: GUILD_ID,
              user_id: id
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
