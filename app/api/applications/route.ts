import { getErrorMessage, GUILD_ID } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { queryBotDb } from '@/lib/botDb';
import { STAFF_ROLES } from '@/lib/staffApplicationForm';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in with Discord to submit an application.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validRoles = new Set(STAFF_ROLES.map((role) => role.id));
    const selectedRole = validRoles.has(body.applicationRole) ? body.applicationRole : 'moderation';
    const dailyAvailability = body.dailyAvailability || body.hoursPerWeek || '';
    const roleAnswers = body.roleAnswers && typeof body.roleAnswers === 'object' ? body.roleAnswers : {};
    const formVersion = Number(body.formVersion) >= 2 ? 2 : 1;
    const normalizedBody = {
      ...body,
      applicationRole: selectedRole,
      dailyAvailability,
      hoursPerWeek: body.hoursPerWeek || dailyAvailability,
      roleAnswers,
      formVersion,
      discordUserId: session.user.id,
      discordUsername: session.user.name || body.discordUsername || '',
    };
    
    const userId = normalizedBody.discordUserId;
    
    // Fetch user data from bot database
    let userProfile = null;
    let userStats = null;
    let modLogs = null;
    
    if (userId) {
      try {
        // Fetch user data from Discord API using centralized endpoint
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (botToken) {
          try {
            const userRes = await fetch(`https://discord.com/api/v10/users/${userId}`, {
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

            if (userRes.ok) {
              const user = await userRes.json();
              const member = memberRes.ok ? await memberRes.json() : null;
              
              let avatarUrl = `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> 22n) % 6}.png`;
              if (user.avatar) {
                const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
                avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${ext}?size=128`;
              }
              
              userProfile = {
                username: user.username,
                display_name: member?.nick || user.global_name || user.username,
                avatar_url: avatarUrl,
                in_guild: !!member,
                tag: user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`,
              };
            }
          } catch (fetchErr) {
            console.error('Error fetching user from Discord:', fetchErr);
          }
        }
        
        // Fetch user VC and chat stats
        const statsResult = await queryBotDb(`
          SELECT 
            (SELECT COALESCE(SUM(duration_seconds), 0) FROM voice_logs WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL) as vc_duration,
            (SELECT COUNT(*) FROM voice_logs WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL) as vc_sessions,
            (SELECT COUNT(*) FROM chat_logs WHERE user_id = $1 AND guild_id = $2) as message_count
        `, [userId, GUILD_ID]);
        
        userStats = statsResult[0] || null;
        
        // Fetch moderation logs (modlogs, manual actions, warnings) from moderation_cases table
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
      }
    }

    const application = await StaffApplication.create({
      ...normalizedBody,
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
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');
    const { canAccessAdminFeatures } = await import('@/lib/apiAuth');
    
    const session = await getServerSession(authOptions);
    if (!session || !canAccessAdminFeatures(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        { whyJoin: { $regex: search, $options: 'i' } },
        { applicationRole: { $regex: search, $options: 'i' } },
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
