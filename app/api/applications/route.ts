import { getErrorMessage, GUILD_ID } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { queryBotDb } from '@/lib/botDb';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const userId = body.discordUserId;
    
    // Fetch user data from bot database
    let userProfile = null;
    let userStats = null;
    let modLogs = null;
    
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
        
        userProfile = userCacheResult[0] || null;
        
        // Fetch user VC and chat stats
        const statsResult = await queryBotDb(`
          SELECT 
            (SELECT COALESCE(SUM(duration_seconds), 0) FROM voice_logs WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL) as vc_duration,
            (SELECT COUNT(*) FROM voice_logs WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL) as vc_sessions,
            (SELECT COUNT(*) FROM chat_logs WHERE user_id = $1 AND guild_id = $2) as message_count
        `, [userId, GUILD_ID]);
        
        userStats = statsResult[0] || null;
        
        // Fetch moderation logs (modlogs, manual actions, warnings)
        const modLogsResult = await queryBotDb(`
          SELECT 
            case_number,
            action_type as action,
            reason,
            moderator_id,
            created_at,
            expires_at,
            duration_seconds
          FROM moderation_case
          WHERE target_id = $1 AND guild_id = $2
          ORDER BY created_at DESC
          LIMIT 50
        `, [userId, GUILD_ID]);
        
        modLogs = modLogsResult || [];
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }

    const application = await StaffApplication.create({
      ...body,
      status: 'pending',
      userProfile,
      userStats,
      modLogs,
      dataFetchedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, data: application },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { country: { $regex: search, $options: 'i' } },
        { age: { $regex: search, $options: 'i' } },
        { aboutYourself: { $regex: search, $options: 'i' } },
      ];
    }

    const applications = await StaffApplication.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: applications });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
