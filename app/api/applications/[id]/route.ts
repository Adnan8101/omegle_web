import { getErrorMessage, GUILD_ID } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/apiAuth';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { queryBotDb, getUsersDisplay } from '@/lib/botDb';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessAdminFeatures(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        // Fetch Discord user from cache first
        const usersMap = await getUsersDisplay([userId], 128);
        const userDisplay = usersMap.get(userId);
        
        if (userDisplay) {
          userProfile = {
            username: userDisplay.username,
            display_name: userDisplay.displayName,
            avatar_url: userDisplay.avatar,
            in_guild: userDisplay.inGuild,
            tag: `@${userDisplay.username}`,
          };
        } else {
          // Fallback to default if not in cache
          userProfile = {
            username: 'Unknown User',
            display_name: 'Unknown User',
            avatar_url: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`,
            in_guild: false,
            tag: '@unknown',
          };
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
        
        // Collect moderator IDs and fetch from cache
        const modIds = [...new Set(
          (modLogsResult || [])
            .filter((log: any) => log.moderator_id)
            .map((log: any) => log.moderator_id)
        )].slice(0, 20) as string[];

        // Fetch moderators from cache
        const modsMap = await getUsersDisplay(modIds, 64);
        
        // Build modlogs with fetched moderator data
        modLogs = (modLogsResult || []).map((log: any) => {
          const modUser = modsMap.get(log.moderator_id);
          
          return {
            ...log,
            moderator_avatar_url: modUser?.avatar || `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(log.moderator_id) >> 22n) % 6}.png`,
            moderator_display_name: modUser?.displayName || 'Unknown Moderator',
            moderator_username: modUser?.username || null,
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
