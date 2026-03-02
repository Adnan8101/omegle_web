import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryBotDb } from '@/lib/botDb';
import { GUILD_ID, getErrorMessage } from '@/lib/constants';
import { canAccessServerStats } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessServerStats(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter clauses for VC (voice_logs)
    const vcDateParts: string[] = [];
    const vcParams: unknown[] = [GUILD_ID];
    let vcIdx = 2;
    if (startDate) {
      vcDateParts.push(`joined_at >= $${vcIdx}`);
      vcParams.push(startDate);
      vcIdx++;
    }
    if (endDate) {
      vcDateParts.push(`joined_at <= $${vcIdx}`);
      vcParams.push(endDate);
      vcIdx++;
    }
    const vcDateClause = vcDateParts.length ? ' AND ' + vcDateParts.join(' AND ') : '';

    // Build date filter clauses for chat (chat_logs)
    const chatDateParts: string[] = [];
    const chatParams: unknown[] = [GUILD_ID];
    let chatIdx = 2;
    if (startDate) {
      chatDateParts.push(`created_at >= $${chatIdx}`);
      chatParams.push(startDate);
      chatIdx++;
    }
    if (endDate) {
      chatDateParts.push(`created_at <= $${chatIdx}`);
      chatParams.push(endDate);
      chatIdx++;
    }
    const chatDateClause = chatDateParts.length ? ' AND ' + chatDateParts.join(' AND ') : '';

    // Combined params for the FULL OUTER JOIN query
    // For the combined query, we need: guildId, [startDate], [endDate] - same for both subqueries
    const combinedParams: unknown[] = [GUILD_ID];
    let paramIdx = 2;
    
    // Build unified date clause parts (these params are shared)
    const vcSubqueryDateParts: string[] = [];
    const chatSubqueryDateParts: string[] = [];
    
    if (startDate) {
      vcSubqueryDateParts.push(`joined_at >= $${paramIdx}`);
      chatSubqueryDateParts.push(`created_at >= $${paramIdx}`);
      combinedParams.push(startDate);
      paramIdx++;
    }
    if (endDate) {
      vcSubqueryDateParts.push(`joined_at <= $${paramIdx}`);
      chatSubqueryDateParts.push(`created_at <= $${paramIdx}`);
      combinedParams.push(endDate);
      paramIdx++;
    }
    
    const vcSubqueryDateClause = vcSubqueryDateParts.length ? ' AND ' + vcSubqueryDateParts.join(' AND ') : '';
    const chatSubqueryDateClause = chatSubqueryDateParts.length ? ' AND ' + chatSubqueryDateParts.join(' AND ') : '';

    // 1. Get total unique member count
    const totalMembersResult = await queryBotDb(`
      SELECT COUNT(DISTINCT COALESCE(vc.user_id, cl.user_id))::int as total_members
      FROM (
        SELECT DISTINCT user_id
        FROM voice_logs
        WHERE guild_id = $1 AND left_at IS NOT NULL${vcSubqueryDateClause}
      ) vc
      FULL OUTER JOIN (
        SELECT DISTINCT user_id
        FROM chat_logs
        WHERE guild_id = $1${chatSubqueryDateClause}
      ) cl ON vc.user_id = cl.user_id
    `, combinedParams).catch((err) => { console.error('totalMembers error:', err); return [{ total_members: 0 }]; });
    
    const totalMembers = totalMembersResult[0]?.total_members || 0;

    // 2. User Rankings — top 500 by VC + text combined
    const userRankings = await queryBotDb(`
      SELECT 
        COALESCE(vc.user_id, cl.user_id) as user_id,
        COALESCE(vc.total_duration, 0)::int as vc_duration,
        COALESCE(vc.session_count, 0)::int as vc_sessions,
        COALESCE(cl.message_count, 0)::int as message_count,
        COALESCE(cl.total_characters, 0)::int as total_characters,
        duc.username,
        duc.display_name,
        duc.avatar_url,
        duc.in_guild,
        duc.nickname
      FROM (
        SELECT user_id, SUM(duration_seconds) as total_duration, COUNT(*) as session_count
        FROM voice_logs
        WHERE guild_id = $1 AND left_at IS NOT NULL${vcSubqueryDateClause}
        GROUP BY user_id
      ) vc
      FULL OUTER JOIN (
        SELECT user_id, COUNT(*) as message_count, SUM(content_length) as total_characters
        FROM chat_logs
        WHERE guild_id = $1${chatSubqueryDateClause}
        GROUP BY user_id
      ) cl ON vc.user_id = cl.user_id
      LEFT JOIN discord_user_cache duc ON duc.user_id = COALESCE(vc.user_id, cl.user_id)
      ORDER BY (COALESCE(vc.total_duration, 0) + COALESCE(cl.message_count, 0) * 60) DESC
      LIMIT 500
    `, combinedParams).catch((err) => { console.error('userRankings error:', err); return []; });

    // 2. Top Voice Channels - build proper clause with vl. prefix
    const vcDatePartsWithAlias = vcDateParts.map(p => p.replace('joined_at', 'vl.joined_at'));
    const vcDateClauseWithAlias = vcDatePartsWithAlias.length ? ' AND ' + vcDatePartsWithAlias.join(' AND ') : '';
    
    const topVoiceChannels = await queryBotDb(`
      SELECT 
        vl.channel_id,
        COALESCE(dcc.name, vl.channel_name, vl.channel_id) as channel_name,
        COUNT(*) as total_sessions,
        COUNT(DISTINCT vl.user_id) as unique_users,
        SUM(vl.duration_seconds)::int as total_duration,
        AVG(vl.peak_member_count)::int as avg_peak_members,
        MAX(vl.joined_at) as last_activity
      FROM voice_logs vl
      LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vl.channel_id
      WHERE vl.guild_id = $1 AND vl.left_at IS NOT NULL${vcDateClauseWithAlias}
      GROUP BY vl.channel_id, dcc.name, vl.channel_name
      ORDER BY total_duration DESC
      LIMIT 50
    `, vcParams).catch((err) => { console.error('topVoiceChannels error:', err); return []; });

    // 3. Top contributors per voice channel (top 100 per channel)
    const topChannelIds = (topVoiceChannels || []).slice(0, 30).map((ch: Record<string, unknown>) => ch.channel_id as string);
    let vcContributors: Record<string, unknown>[] = [];
    if (topChannelIds.length > 0) {
      const baseIdx = vcParams.length + 1;
      const placeholders = topChannelIds.map((_: string, i: number) => `$${baseIdx + i}`).join(', ');
      vcContributors = await queryBotDb(`
        SELECT 
          vl.channel_id,
          vl.user_id,
          SUM(vl.duration_seconds)::int as total_duration,
          COUNT(*) as session_count,
          duc.username,
          duc.display_name,
          duc.avatar_url,
          duc.in_guild,
          duc.nickname
        FROM voice_logs vl
        LEFT JOIN discord_user_cache duc ON duc.user_id = vl.user_id
        WHERE vl.guild_id = $1 AND vl.left_at IS NOT NULL${vcDateClauseWithAlias}
          AND vl.channel_id IN (${placeholders})
        GROUP BY vl.channel_id, vl.user_id, duc.username, duc.display_name, duc.avatar_url, duc.in_guild, duc.nickname
        ORDER BY vl.channel_id, total_duration DESC
      `, [...vcParams, ...topChannelIds]).catch((err) => { console.error('vcContributors error:', err); return []; });
    }

    // 4. Top Message Channels - build proper clause with cl. prefix
    const chatDatePartsWithAlias = chatDateParts.map(p => p.replace('created_at', 'cl.created_at'));
    const chatDateClauseWithAlias = chatDatePartsWithAlias.length ? ' AND ' + chatDatePartsWithAlias.join(' AND ') : '';
    
    const topMessageChannels = await queryBotDb(`
      SELECT 
        cl.channel_id,
        COALESCE(dcc.name, cl.channel_name, cl.channel_id) as channel_name,
        COUNT(*) as message_count,
        COUNT(DISTINCT cl.user_id) as unique_users,
        SUM(cl.content_length)::int as total_characters,
        MAX(cl.created_at) as last_activity
      FROM chat_logs cl
      LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = cl.channel_id
      WHERE cl.guild_id = $1${chatDateClauseWithAlias}
      GROUP BY cl.channel_id, dcc.name, cl.channel_name
      ORDER BY message_count DESC
      LIMIT 50
    `, chatParams).catch((err) => { console.error('topMessageChannels error:', err); return []; });

    // 5. Top contributors per message channel (top 100 per channel)
    const topMsgChannelIds = (topMessageChannels || []).slice(0, 30).map((ch: Record<string, unknown>) => ch.channel_id as string);
    let msgContributors: Record<string, unknown>[] = [];
    if (topMsgChannelIds.length > 0) {
      const baseIdx = chatParams.length + 1;
      const placeholders = topMsgChannelIds.map((_: string, i: number) => `$${baseIdx + i}`).join(', ');
      msgContributors = await queryBotDb(`
        SELECT 
          cl.channel_id,
          cl.user_id,
          COUNT(*) as message_count,
          SUM(cl.content_length)::int as total_characters,
          duc.username,
          duc.display_name,
          duc.avatar_url,
          duc.in_guild,
          duc.nickname
        FROM chat_logs cl
        LEFT JOIN discord_user_cache duc ON duc.user_id = cl.user_id
        WHERE cl.guild_id = $1${chatDateClauseWithAlias}
          AND cl.channel_id IN (${placeholders})
        GROUP BY cl.channel_id, cl.user_id, duc.username, duc.display_name, duc.avatar_url, duc.in_guild, duc.nickname
        ORDER BY cl.channel_id, message_count DESC
      `, [...chatParams, ...topMsgChannelIds]).catch((err) => { console.error('msgContributors error:', err); return []; });
    }

    // Group contributors by channel (top 100 each)
    const vcContributorsByChannel: Record<string, Record<string, unknown>[]> = {};
    for (const c of vcContributors) {
      const chId = c.channel_id as string;
      if (!vcContributorsByChannel[chId]) vcContributorsByChannel[chId] = [];
      if (vcContributorsByChannel[chId].length < 100) {
        vcContributorsByChannel[chId].push(c);
      }
    }

    const msgContributorsByChannel: Record<string, Record<string, unknown>[]> = {};
    for (const c of msgContributors) {
      const chId = c.channel_id as string;
      if (!msgContributorsByChannel[chId]) msgContributorsByChannel[chId] = [];
      if (msgContributorsByChannel[chId].length < 100) {
        msgContributorsByChannel[chId].push(c);
      }
    }

    return NextResponse.json({
      totalMembers,
      userRankings: userRankings || [],
      topVoiceChannels: topVoiceChannels || [],
      vcContributorsByChannel,
      topMessageChannels: topMessageChannels || [],
      msgContributorsByChannel,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('Error fetching server stats:', message);
    return NextResponse.json({
      totalMembers: 0,
      userRankings: [],
      topVoiceChannels: [],
      vcContributorsByChannel: {},
      topMessageChannels: [],
      msgContributorsByChannel: {},
      _error: message,
    });
  }
}
