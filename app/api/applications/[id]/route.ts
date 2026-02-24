import { getErrorMessage, GUILD_ID } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { queryBotDb, getUserDisplay } from '@/lib/botDb';

// Fetch user from Discord API
async function fetchDiscordUser(userId: string) {
  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error('Error fetching Discord user:', err);
  }
  return null;
}

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
        // Fetch Discord user profile with proper avatar URL construction
        let userDisplay = await getUserDisplay(userId, 128);
        
        // If user not in cache, try to fetch from Discord API directly
        if (userDisplay.username === 'Unknown User') {
          const botToken = process.env.DISCORD_BOT_TOKEN;
          if (botToken) {
            try {
              const discordRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
                headers: { Authorization: `Bot ${botToken}` },
                cache: 'no-store',
              });
              if (discordRes.ok) {
                const discordUser = await discordRes.json();
                let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`;
                if (discordUser.avatar) {
                  const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
                  avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.${ext}?size=128`;
                }
                userDisplay = {
                  id: userId,
                  username: discordUser.username,
                  displayName: discordUser.global_name || discordUser.username,
                  avatar: avatarUrl,
                  tag: discordUser.discriminator === '0' ? `@${discordUser.username}` : `${discordUser.username}#${discordUser.discriminator}`,
                  inGuild: true,
                };
              }
            } catch (discordErr) {
              console.error('Error fetching user from Discord API:', discordErr);
            }
          }
        }
        
        userProfile = {
          username: userDisplay.username,
          display_name: userDisplay.displayName,
          avatar_url: userDisplay.avatar, // Full avatar URL
          in_guild: userDisplay.inGuild,
          tag: userDisplay.tag,
        };
        
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
            mc.active,
            duc.username as moderator_username,
            duc.display_name as moderator_display_name,
            duc.avatar_url as moderator_avatar_hash,
            duc.nickname as moderator_nickname
          FROM moderation_cases mc
          LEFT JOIN discord_user_cache duc ON mc.moderator_id = duc.user_id
          WHERE mc.target_id = $1 AND mc.guild_id = $2
          ORDER BY mc.created_at DESC
          LIMIT 50
        `, [userId, GUILD_ID]);
        
        // Collect moderator IDs that need fetching from Discord API
        const missingModIds = [...new Set(
          (modLogsResult || [])
            .filter((log: any) => !log.moderator_username && log.moderator_id)
            .map((log: any) => log.moderator_id)
        )].slice(0, 20) as string[];

        // Fetch missing moderators from Discord API
        const fetchedMods: Record<string, { username: string; displayName: string; avatar: string }> = {};
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (botToken && missingModIds.length > 0) {
          for (const modId of missingModIds) {
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
        
        // Build full avatar URLs for moderators
        modLogs = (modLogsResult || []).map((log: any) => {
          const fetched = fetchedMods[log.moderator_id];
          
          let moderator_avatar_url = null;
          if (log.moderator_avatar_hash) {
            const extension = log.moderator_avatar_hash.startsWith('a_') ? 'gif' : 'png';
            moderator_avatar_url = `https://cdn.discordapp.com/avatars/${log.moderator_id}/${log.moderator_avatar_hash}.${extension}?size=64`;
          } else if (fetched) {
            moderator_avatar_url = fetched.avatar;
          } else if (log.moderator_id) {
            const defaultIndex = Number(BigInt(log.moderator_id) >> 22n) % 6;
            moderator_avatar_url = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
          }
          return {
            ...log,
            moderator_avatar_url,
            moderator_display_name: log.moderator_nickname || log.moderator_display_name || log.moderator_username || fetched?.displayName || 'Unknown Moderator',
            moderator_username: log.moderator_username || fetched?.username || null,
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
