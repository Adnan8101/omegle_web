import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';
import { canAccessVCAndChats } from '@/lib/apiAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get detailed session info (with channel name from cache)
    const sessionData = await queryBotDb(`
      SELECT 
        vl.*,
        COALESCE(dcc.name, vl.channel_name) as resolved_channel_name,
        -- Parse members_present JSON if it exists
        COALESCE(vl.members_present, '[]') as members_data
      FROM voice_logs vl
      LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vl.channel_id
      WHERE vl.id = $1
    `, [sessionId]);

    if (!sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionInfo = sessionData[0];

    // Get all users who were in this channel during this time period
    const overlappingUsers = await queryBotDb(`
      SELECT DISTINCT
        user_id,
        joined_at,
        left_at,
        duration_seconds,
        messages_sent,
        mute_count,
        unmute_count,
        deaf_count,
        undeaf_count,
        video_on_count,
        video_off_count,
        screen_share_start,
        screen_share_stop,
        join_order,
        is_rejoin
      FROM voice_logs
      WHERE channel_id = $1
        AND guild_id = $2
        AND (
          (joined_at <= $4 AND (left_at IS NULL OR left_at >= $3))
        )
      ORDER BY joined_at ASC
    `, [
      sessionInfo.channel_id,
      sessionInfo.guild_id,
      sessionInfo.joined_at,
      sessionInfo.left_at || new Date()
    ]);

    return NextResponse.json({
      session: sessionInfo,
      overlappingUsers: overlappingUsers || [],
      timeline: generateTimeline(sessionInfo, overlappingUsers || []),
    });
  } catch (error: unknown) {
    console.error('Error fetching session details:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to fetch session details' },
      { status: 500 }
    );
  }
}

interface TimelineEvent {
  type: string;
  userId: string;
  timestamp: string;
  relativeTime: number;
  joinOrder?: number;
  count?: number;
}

interface SessionRecord {
  user_id: string;
  joined_at: string;
  left_at: string | null;
  channel_id: string;
  guild_id: string;
}

interface UserRecord {
  user_id: string;
  joined_at: string;
  left_at: string | null;
  video_on_count: number;
  video_off_count: number;
  screen_share_start: number;
  screen_share_stop: number;
  join_order: number;
}

function generateTimeline(session: SessionRecord, users: UserRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const sessionStart = new Date(session.joined_at).getTime();
  const sessionEnd = session.left_at ? new Date(session.left_at).getTime() : Date.now();

  // Add session start
  events.push({
    type: 'session_start',
    userId: session.user_id,
    timestamp: session.joined_at,
    relativeTime: 0,
  });

  // Add all user joins/leaves + media activity summaries
  for (const user of users) {
    const joinTime = new Date(user.joined_at).getTime();
    if (joinTime >= sessionStart && joinTime <= sessionEnd) {
      events.push({
        type: 'user_join',
        userId: user.user_id,
        timestamp: user.joined_at,
        relativeTime: Math.floor((joinTime - sessionStart) / 1000),
        joinOrder: user.join_order,
      });
    }

    // Add video on events (approximate - placed near join time since we don't have exact timestamps)
    if (user.video_on_count > 0) {
      const videoTime = Math.min(joinTime + 5000, sessionEnd); // 5s after join as approximation
      events.push({
        type: 'video_on',
        userId: user.user_id,
        timestamp: new Date(videoTime).toISOString(),
        relativeTime: Math.floor((videoTime - sessionStart) / 1000),
        count: user.video_on_count,
      });
    }

    // Add screen share events
    if (user.screen_share_start > 0) {
      const ssTime = Math.min(joinTime + 10000, sessionEnd); // 10s after join as approximation
      events.push({
        type: 'screen_share_start',
        userId: user.user_id,
        timestamp: new Date(ssTime).toISOString(),
        relativeTime: Math.floor((ssTime - sessionStart) / 1000),
        count: user.screen_share_start,
      });
    }

    if (user.left_at) {
      const leaveTime = new Date(user.left_at).getTime();
      if (leaveTime >= sessionStart && leaveTime <= sessionEnd) {
        // Add screen share stop before leave
        if (user.screen_share_stop > 0) {
          const ssStopTime = Math.max(leaveTime - 5000, sessionStart);
          events.push({
            type: 'screen_share_stop',
            userId: user.user_id,
            timestamp: new Date(ssStopTime).toISOString(),
            relativeTime: Math.floor((ssStopTime - sessionStart) / 1000),
            count: user.screen_share_stop,
          });
        }

        if (user.video_off_count > 0) {
          const videoOffTime = Math.max(leaveTime - 3000, sessionStart);
          events.push({
            type: 'video_off',
            userId: user.user_id,
            timestamp: new Date(videoOffTime).toISOString(),
            relativeTime: Math.floor((videoOffTime - sessionStart) / 1000),
            count: user.video_off_count,
          });
        }

        events.push({
          type: 'user_leave',
          userId: user.user_id,
          timestamp: user.left_at,
          relativeTime: Math.floor((leaveTime - sessionStart) / 1000),
        });
      }
    }
  }

  // Add session end
  if (session.left_at) {
    events.push({
      type: 'session_end',
      userId: session.user_id,
      timestamp: session.left_at,
      relativeTime: Math.floor((sessionEnd - sessionStart) / 1000),
    });
  }

  return events.sort((a, b) => a.relativeTime - b.relativeTime ||
    // Tie-breaking: joins before media before leaves
    (['session_start', 'user_join'].includes(a.type) ? -1 : ['session_end', 'user_leave'].includes(a.type) ? 1 : 0)
  );
}
