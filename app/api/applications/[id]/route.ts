import { getErrorMessage, GUILD_ID } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { queryBotDb } from '@/lib/botDb';

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
    let userProfile = application.userProfile;
    let userStats = application.userStats;
    let modLogs = application.modLogs;
    
    if (userId) {
      try {
        // Fetch Discord user profile from cache
        const userCacheResult = await queryBotDb(`
          SELECT 
            username,
            display_name,
            avatar_url,
            in_guild,
            nickname
          FROM discord_user_cache
          WHERE user_id = $1
        `, [userId]);
        
        if (userCacheResult[0]) {
          userProfile = userCacheResult[0];
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
        
        // Fetch moderation logs (modlogs, warnings, etc.) from moderation_cases table
        const modLogsResult = await queryBotDb(`
          SELECT 
            case_number,
            action,
            reason,
            moderator_id,
            created_at,
            duration_seconds,
            active
          FROM moderation_cases
          WHERE target_id = $1 AND guild_id = $2
          ORDER BY created_at DESC
          LIMIT 50
        `, [userId, GUILD_ID]);
        
        modLogs = modLogsResult || [];
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
