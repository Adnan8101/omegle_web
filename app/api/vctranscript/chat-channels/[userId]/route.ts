import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessVCAndChats } from '@/lib/apiAuth';
import { queryBotDb } from '@/lib/botDb';
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
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateParts: string[] = [];
    const dateParams: unknown[] = [userId, GUILD_ID];
    let paramIdx = 3;
    if (startDate) {
      dateParts.push(`cl.created_at >= $${paramIdx}`);
      dateParams.push(startDate);
      paramIdx++;
    }
    if (endDate) {
      dateParts.push(`cl.created_at <= $${paramIdx}`);
      dateParams.push(endDate);
    }
    const dateClause = dateParts.length ? ' AND ' + dateParts.join(' AND ') : '';
    const channels = await queryBotDb(`
      SELECT
        cl.channel_id,
        COALESCE(dcc.name, cl.channel_name, cl.channel_id) as channel_name,
        COUNT(*) as message_count,
        SUM(cl.content_length) as total_characters,
        COUNT(CASE WHEN cl.replied_to_id IS NOT NULL THEN 1 END) as reply_count,
        COUNT(CASE WHEN cl.in_voice_chat = true THEN 1 END) as in_vc_count,
        MIN(cl.created_at) as first_message,
        MAX(cl.created_at) as last_message
      FROM chat_logs cl
      LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = cl.channel_id
      WHERE cl.user_id = $1 AND cl.guild_id = $2${dateClause}
      GROUP BY cl.channel_id, dcc.name, cl.channel_name
      ORDER BY message_count DESC
      LIMIT 50
    `, dateParams).catch(() => []);
    return NextResponse.json({ channels: channels || [] });
  } catch (error: unknown) {
    console.error('Error fetching chat channels:', getErrorMessage(error));
    return NextResponse.json({ channels: [], _error: getErrorMessage(error) });
  }
}