import { getErrorMessage, GUILD_ID } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { queryBotDb } from '@/lib/botDb';

// No longer needed - fetching directly from Discord API


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const application = await StaffApplication.findById(params.id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const userId = application.discordUserId;
    
    // Fetch fresh user data from bot database
    let userProfile: any = application.userProfile;
    let userStats = application.userStats;
    let modLogs = application.modLogs;
    
    if (userId) {
      try {
        // Fetch Discord user profile directly from Discord API - no cache
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (botToken) {
          try {
            const discordRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
              headers: { Authorization: `Bot ${botToken}` },
              cache: 'no-store',
            });
            
            const memberRes = await fetch(
              `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
              {
                headers: { Authorization: `Bot ${botToken}` },
                cache: 'no-store',
              }
            );

            if (discordRes.ok) {
              const discordUser = await discordRes.json();
              const member = memberRes.ok ? await memberRes.json() : null;
              
              let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`;
              if (discordUser.avatar) {
                const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
                avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.${ext}?size=128`;
              }
              
              userProfile = {
                username: discordUser.username,
                display_name: member?.nick || discordUser.global_name || discordUser.username,
                avatar_url: avatarUrl,
                in_guild: !!member,
                tag: discordUser.discriminator === '0' ? `@${discordUser.username}` : `${discordUser.username}#${discordUser.discriminator}`,
              };
            }
          } catch (discordErr) {
            console.error('Error fetching user from Discord API:', discordErr);
          }
        }
        
        // Fetch user VC and chat stats
        const statsResult = await queryBotDb(`
          SELECT 
            (SELECT COALESCE(SUM(duration_seconds), 0) FROM voice_logs WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL) as vc_duration,
            (SELECT COUNT(*) FROM voice_logs WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL) as vc_sessions,
            (SELECT COUNT(*) FROM chat_logs WHERE user_id = $1 AND guild_id = $2) as message_count
        `, [userId, GUILD_ID]);
        
        if (statsResult[0]) {
          userStats = statsResult[0];
        }
        
        // Fetch moderation logs with moderator names and avatars
        const modLogsResult = await queryBotDb(`
          SELECT 
            mc.case_number,
            mc.action,
            mc.reason,
            mc.moderator_id,
            mc.created_at,
            mc.duration_seconds,
            mc.active
          FROM moderation_cases mc
          WHERE mc.target_id = $1 AND mc.guild_id = $2
          ORDER BY mc.created_at DESC
          LIMIT 50
        `, [userId, GUILD_ID]);
        
        // Collect moderator IDs that need fetching from Discord API
        const modIds = [...new Set(
          (modLogsResult || [])
            .filter((log: any) => log.moderator_id)
            .map((log: any) => log.moderator_id)
        )].slice(0, 20) as string[];

        // Fetch moderators from Discord API
        const fetchedMods: Record<string, { username: string; displayName: string; avatar: string }> = {};
        if (botToken && modIds.length > 0) {
          for (const modId of modIds) {
            try {
              const res = await fetch(`https://discord.com/api/v10/users/${modId}`, {
                headers: { Authorization: `Bot ${botToken}` },
                cache: 'no-store',
              });
              if (res.ok) {
                const user = await res.json();
                let avatar = `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(modId) >> 22n) % 6}.png`;
                if (user.avatar) {
                  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
                  avatar = `https://cdn.discordapp.com/avatars/${modId}/${user.avatar}.${ext}?size=64`;
                }
                fetchedMods[modId] = {
                  username: user.username,
                  displayName: user.global_name || user.username,
                  avatar,
                };
              }
            } catch {
              // Ignore errors for individual users
            }
          }
        }
        
        // Build modlogs with fetched moderator data
        modLogs = (modLogsResult || []).map((log: any) => {
          const fetched = fetchedMods[log.moderator_id];
          
          let moderator_avatar_url = null;
          if (fetched) {
            moderator_avatar_url = fetched.avatar;
          } else if (log.moderator_id) {
            const defaultIndex = Number(BigInt(log.moderator_id) >> 22n) % 6;
            moderator_avatar_url = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
          }
          
          return {
            ...log,
            moderator_avatar_url,
            moderator_display_name: fetched?.displayName || 'Unknown Moderator',
            moderator_username: fetched?.username || null,
          };
        });
      } catch (err) {
        console.error('Error fetching user data:', err);
        // Keep existing data if fetch fails
      }
    }
    
    // Return application with fresh data
    const appData = application.toObject();
    appData.userProfile = userProfile;
    appData.userStats = userStats;
    appData.modLogs = modLogs;
    appData.dataFetchedAt = new Date();

    return NextResponse.json({ success: true, data: appData });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const body = await request.json();

    const application = await StaffApplication.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: application });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const application = await StaffApplication.findByIdAndDelete(params.id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
