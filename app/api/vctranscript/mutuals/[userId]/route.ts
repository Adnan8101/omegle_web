import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessVCAndChats } from '@/lib/apiAuth';
import { queryBotDb, getUsersDisplay } from '@/lib/botDb';
import { GUILD_ID, getErrorMessage } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !canAccessVCAndChats(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guildId = GUILD_ID;

    
    
    
    
    const vcMutuals = await queryBotDb(`
      SELECT 
        vl2.user_id as target_user_id,
        COUNT(*) as mutual_vc_sessions,
        SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM 
              LEAST(COALESCE(vl1.left_at, NOW()), COALESCE(vl2.left_at, NOW()))
            ) -
            EXTRACT(EPOCH FROM 
              GREATEST(vl1.joined_at, vl2.joined_at)
            )
          )
        )::int as mutual_vc_duration,
        MAX(GREATEST(vl1.joined_at, vl2.joined_at)) as last_interaction
      FROM voice_logs vl1
      JOIN voice_logs vl2 
        ON vl1.channel_id = vl2.channel_id 
        AND vl1.guild_id = vl2.guild_id
        AND vl2.user_id != $1
        AND vl1.joined_at < COALESCE(vl2.left_at, NOW())
        AND COALESCE(vl1.left_at, NOW()) > vl2.joined_at
      WHERE vl1.user_id = $1 AND vl1.guild_id = $2 AND vl1.left_at IS NOT NULL
      GROUP BY vl2.user_id
      HAVING SUM(
        GREATEST(0,
          EXTRACT(EPOCH FROM 
            LEAST(COALESCE(vl1.left_at, NOW()), COALESCE(vl2.left_at, NOW()))
          ) -
          EXTRACT(EPOCH FROM 
            GREATEST(vl1.joined_at, vl2.joined_at)
          )
        )
      ) > 0
      ORDER BY mutual_vc_duration DESC
      LIMIT 50
    `, [userId, guildId]).catch(() => []);

    
    
    
    
    
    const chatMutuals = await queryBotDb(`
      WITH direct_replies AS (
        SELECT 
          cl1.replied_to_id as target_user_id,
          COUNT(*) as messages_to_target
        FROM chat_logs cl1
        WHERE cl1.user_id = $1 AND cl1.guild_id = $2 AND cl1.replied_to_id IS NOT NULL
          AND cl1.replied_to_id != $1
        GROUP BY cl1.replied_to_id
      ),
      mentions AS (
        SELECT 
          mention_id as target_user_id,
          COUNT(*) as mention_count
        FROM chat_logs cl,
          LATERAL jsonb_array_elements_text(
            CASE 
              WHEN cl.mentioned_user_ids IS NOT NULL AND cl.mentioned_user_ids != '' 
              THEN cl.mentioned_user_ids::jsonb 
              ELSE '[]'::jsonb 
            END
          ) AS mention_id
        WHERE cl.user_id = $1 AND cl.guild_id = $2
          AND mention_id != $1
        GROUP BY mention_id
      ),
      same_channel AS (
        SELECT 
          cl2.user_id as target_user_id,
          COUNT(*) as messages_in_same_channel
        FROM chat_logs cl1
        JOIN chat_logs cl2 
          ON cl1.channel_id = cl2.channel_id 
          AND cl1.guild_id = cl2.guild_id
          AND cl2.user_id != $1
          AND ABS(EXTRACT(EPOCH FROM cl1.created_at - cl2.created_at)) < 300
        WHERE cl1.user_id = $1 AND cl1.guild_id = $2
        GROUP BY cl2.user_id
        HAVING COUNT(*) > 2
      )
      SELECT 
        COALESCE(dr.target_user_id, m.target_user_id, sc.target_user_id) as target_user_id,
        COALESCE(dr.messages_to_target, 0)::int as messages_to_target,
        COALESCE(m.mention_count, 0)::int as mention_count,
        COALESCE(sc.messages_in_same_channel, 0)::int as messages_in_same_channel,
        NOW() as last_interaction
      FROM direct_replies dr
      FULL OUTER JOIN mentions m ON dr.target_user_id = m.target_user_id
      FULL OUTER JOIN same_channel sc ON COALESCE(dr.target_user_id, m.target_user_id) = sc.target_user_id
      ORDER BY COALESCE(dr.messages_to_target, 0) + COALESCE(m.mention_count, 0) + COALESCE(sc.messages_in_same_channel, 0) DESC
      LIMIT 50
    `, [userId, guildId]).catch(() => []);

    
    
    
    const sharedChannels = await queryBotDb(`
      SELECT 
        vl2.user_id as other_user_id,
        vl1.channel_id,
        COALESCE(dcc.name, vl1.channel_name, vl1.channel_id) as channel_name,
        COUNT(*) as overlap_count,
        SUM(
          GREATEST(0,
            EXTRACT(EPOCH FROM 
              LEAST(COALESCE(vl1.left_at, NOW()), COALESCE(vl2.left_at, NOW()))
            ) -
            EXTRACT(EPOCH FROM 
              GREATEST(vl1.joined_at, vl2.joined_at)
            )
          )
        )::int as overlap_seconds
      FROM voice_logs vl1
      JOIN voice_logs vl2 ON vl1.channel_id = vl2.channel_id 
        AND vl1.guild_id = vl2.guild_id
        AND vl2.user_id != $1
        AND vl1.joined_at < COALESCE(vl2.left_at, NOW())
        AND COALESCE(vl1.left_at, NOW()) > vl2.joined_at
      LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vl1.channel_id
      WHERE vl1.user_id = $1 AND vl1.guild_id = $2
      GROUP BY vl2.user_id, vl1.channel_id, dcc.name, vl1.channel_name
      HAVING SUM(
        GREATEST(0,
          EXTRACT(EPOCH FROM 
            LEAST(COALESCE(vl1.left_at, NOW()), COALESCE(vl2.left_at, NOW()))
          ) -
          EXTRACT(EPOCH FROM 
            GREATEST(vl1.joined_at, vl2.joined_at)
          )
        )
      ) > 0
      ORDER BY overlap_seconds DESC
      LIMIT 100
    `, [userId, guildId]).catch(() => []);

    
    
    
    const allUserIds = new Set<string>();
    (vcMutuals || []).forEach((m: any) => allUserIds.add(m.target_user_id));
    (chatMutuals || []).forEach((m: any) => allUserIds.add(m.target_user_id));
    (sharedChannels || []).forEach((m: any) => allUserIds.add(m.other_user_id));

    
    const resolvedUsers = allUserIds.size > 0 
      ? await getUsersDisplay([...allUserIds], 128)
      : {};

    return NextResponse.json({
      vcMutuals: vcMutuals || [],
      chatMutuals: chatMutuals || [],
      sharedChannels: sharedChannels || [],
      resolvedUsers,
    });
  } catch (error: unknown) {
    console.error('Error fetching mutuals:', getErrorMessage(error));
    return NextResponse.json({
      vcMutuals: [],
      chatMutuals: [],
      sharedChannels: [],
      resolvedUsers: {},
      _error: getErrorMessage(error),
    });
  }
}
