import { NextRequest, NextResponse } from 'next/server';
import { queryBotDb } from '@/lib/botDb';
import { GUILD_ID, getErrorMessage } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; targetUserId: string }> }
) {
  try {
    const { userId, targetUserId } = await params;
    
    const query = `
      SELECT 
        vl1.id as session_id,
        vl1.channel_id,
        vl1.joined_at as user1_joined,
        vl1.left_at as user1_left,
        CASE 
          WHEN vl1.left_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (vl1.left_at - vl1.joined_at))
          ELSE EXTRACT(EPOCH FROM (NOW() - vl1.joined_at))
        END::int as user1_duration,
        vl2.joined_at as user2_joined,
        vl2.left_at as user2_left,
        CASE 
          WHEN vl2.left_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (vl2.left_at - vl2.joined_at))
          ELSE EXTRACT(EPOCH FROM (NOW() - vl2.joined_at))
        END::int as user2_duration,
        GREATEST(vl1.joined_at, vl2.joined_at) as overlap_start,
        LEAST(COALESCE(vl1.left_at, NOW()), COALESCE(vl2.left_at, NOW())) as overlap_end,
        GREATEST(0,
          EXTRACT(EPOCH FROM 
            LEAST(COALESCE(vl1.left_at, NOW()), COALESCE(vl2.left_at, NOW()))
          ) -
          EXTRACT(EPOCH FROM 
            GREATEST(vl1.joined_at, vl2.joined_at)
          )
        )::int as overlap_duration,
        dcc.name as channel_name
      FROM voice_logs vl1
      JOIN voice_logs vl2 
        ON vl1.channel_id = vl2.channel_id 
        AND vl1.guild_id = vl2.guild_id
        AND vl2.user_id = $2
        AND vl1.joined_at < COALESCE(vl2.left_at, NOW())
        AND COALESCE(vl1.left_at, NOW()) > vl2.joined_at
      LEFT JOIN discord_channel_cache dcc 
        ON vl1.channel_id = dcc.channel_id
      WHERE vl1.user_id = $1 
        AND vl1.guild_id = $3
        AND vl1.left_at IS NOT NULL
      ORDER BY overlap_start DESC
    `;

    const result = await queryBotDb(query, [userId, targetUserId, GUILD_ID]);

    return NextResponse.json({
      sessions: result || [],
      count: result?.length || 0,
    });
  } catch (error: unknown) {
    console.error('Error fetching shared sessions:', getErrorMessage(error));
    return NextResponse.json({
      error: 'Internal server error',
      message: getErrorMessage(error),
      sessions: []
    }, { status: 500 });
  }
}
