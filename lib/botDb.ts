import { Pool } from 'pg';
import { GUILD_ID, getErrorMessage } from './constants';
import { cachedUserToDisplay, getUserDisplay as getUserDisplayFromCache, type CachedUser, type UserDisplay } from './userUtils';

let pool: Pool | null = null;

function getBotDatabaseConnectionString() {
  return process.env.BOT_DATABASE_URL || process.env.BOT_DATABASE_WRITE_URL || process.env.DATABASE_URL;
}

function getPool() {
  if (!pool) {
    const connectionString = getBotDatabaseConnectionString();

    if (!connectionString) {
      throw new Error('Bot database connection string is not configured');
    }

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      
      ssl: { rejectUnauthorized: false },
    });
    
    
    pool.on('error', (err) => {
      console.error('Bot DB pool error:', err.message);
    });
  }
  return pool;
}

export async function queryBotDb(query: string, params?: unknown[]) {
  let client;
  try {
    const pool = getPool();
    client = await pool.connect();
    const result = await client.query(query, params);
    return result.rows;
  } catch (error: unknown) {
    console.error('Bot DB query error:', getErrorMessage(error));
    throw error;
  } finally {
    if (client) client.release();
  }
}

interface DateFilter {
  startDate?: string | null;
  endDate?: string | null;
}

function buildDateClause(
  column: string,
  dateFilter: DateFilter,
  paramOffset: number
): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (dateFilter.startDate) {
    parts.push(`${column} >= $${paramOffset}`);
    params.push(dateFilter.startDate);
    paramOffset++;
  }
  if (dateFilter.endDate) {
    parts.push(`${column} <= $${paramOffset}`);
    params.push(dateFilter.endDate);
  }
  return {
    clause: parts.length ? ' AND ' + parts.join(' AND ') : '',
    params,
  };
}

export async function getUserVCStats(userId: string, guildId: string = GUILD_ID, dateFilter: DateFilter = {}) {
  const df = buildDateClause('joined_at', dateFilter, 3);
  const query = `
    SELECT 
      COUNT(*) as total_sessions,
      SUM(duration_seconds) as total_duration,
      COUNT(DISTINCT channel_id) as unique_channels,
      SUM(rejoin_count) as total_rejoins,
      SUM(messages_sent) as total_messages,
      AVG(duration_seconds) as avg_session_duration,
      MAX(duration_seconds) as longest_session,
      MIN(duration_seconds) as shortest_session,
      SUM(mute_count) as total_mutes,
      SUM(unmute_count) as total_unmutes,
      SUM(deaf_count) as total_deafs,
      SUM(undeaf_count) as total_undeafs,
      SUM(video_on_count) as total_video_ons,
      SUM(video_off_count) as total_video_offs,
      SUM(screen_share_start) as total_screen_shares
    FROM voice_logs
    WHERE user_id = $1 AND guild_id = $2 AND left_at IS NOT NULL${df.clause}
  `;
  const result = await queryBotDb(query, [userId, guildId, ...df.params]);
  return result[0] || {};
}

export async function getUserVoiceUserStats(userId: string, guildId: string = GUILD_ID) {
  const query = `
    SELECT 
      total_time_in_vc,
      total_time_speaking,
      total_time_muted,
      total_time_deafened,
      total_time_listening,
      total_sessions,
      last_joined_at
    FROM voice_user_stats
    WHERE user_id = $1 AND guild_id = $2
  `;
  const result = await queryBotDb(query, [userId, guildId]);
  return result[0] || null;
}

export async function getUserVCSessions(
  userId: string,
  guildId: string = GUILD_ID,
  limit: number = 100,
  dateFilter: DateFilter = {}
) {
  const df = buildDateClause('vl.joined_at', dateFilter, 4);
  const query = `
    SELECT 
      vl.id,
      vl.channel_id,
      COALESCE(dcc.name, vl.channel_name) as channel_name,
      vl.joined_at,
      vl.left_at,
      vl.duration_seconds,
      vl.members_present,
      vl.peak_member_count,
      vl.first_joiner_id,
      vl.last_leaver_id,
      vl.join_order,
      vl.leave_order,
      vl.messages_sent,
      vl.is_rejoin,
      vl.rejoin_count,
      vl.mute_count,
      vl.unmute_count,
      vl.deaf_count,
      vl.undeaf_count,
      vl.video_on_count,
      vl.video_off_count,
      vl.screen_share_start,
      vl.screen_share_stop
    FROM voice_logs vl
    LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vl.channel_id
    WHERE vl.user_id = $1 AND vl.guild_id = $2${df.clause}
    ORDER BY vl.joined_at DESC
    LIMIT $3
  `;
  return await queryBotDb(query, [userId, guildId, limit, ...df.params]);
}

export async function getAllUsersWithVCActivity(guildId: string = GUILD_ID, dateFilter: DateFilter = {}) {
  const df = buildDateClause('joined_at', dateFilter, 2);
  const query = `
    SELECT 
      user_id,
      COUNT(*) as session_count,
      SUM(duration_seconds) as total_duration,
      MAX(joined_at) as last_active
    FROM voice_logs
    WHERE guild_id = $1 AND left_at IS NOT NULL${df.clause}
    GROUP BY user_id
    ORDER BY total_duration DESC
    LIMIT 1000
  `;
  return await queryBotDb(query, [guildId, ...df.params]);
}

export async function getAllUsersWithVCActivityAndProfiles(guildId: string = GUILD_ID, dateFilter: DateFilter = {}) {
  const df = buildDateClause('vl.joined_at', dateFilter, 2);
  const query = `
    SELECT 
      vl.user_id,
      COUNT(*) as session_count,
      SUM(vl.duration_seconds) as total_duration,
      MAX(vl.joined_at) as last_active,
      duc.username,
      duc.display_name,
      duc.avatar_url,
      duc.in_guild,
      duc.nickname
    FROM voice_logs vl
    LEFT JOIN discord_user_cache duc ON duc.user_id = vl.user_id
    WHERE vl.guild_id = $1 AND vl.left_at IS NOT NULL${df.clause}
    GROUP BY vl.user_id, duc.username, duc.display_name, duc.avatar_url, duc.in_guild, duc.nickname
    ORDER BY total_duration DESC
    LIMIT 1000
  `;
  return await queryBotDb(query, [guildId, ...df.params]);
}

export async function getUserChatStats(userId: string, guildId: string = GUILD_ID, dateFilter: DateFilter = {}) {
  const df = buildDateClause('created_at', dateFilter, 3);
  const query = `
    SELECT 
      COUNT(*) as total_messages,
      COUNT(DISTINCT channel_id) as unique_channels,
      SUM(content_length) as total_characters,
      COUNT(CASE WHEN in_voice_chat THEN 1 END) as messages_in_vc,
      COUNT(DISTINCT replied_to_id) as unique_reply_targets,
      COUNT(CASE WHEN mentioned_user_ids IS NOT NULL AND mentioned_user_ids != '' THEN 1 END) as messages_with_mentions
    FROM chat_logs
    WHERE user_id = $1 AND guild_id = $2${df.clause}
  `;
  const result = await queryBotDb(query, [userId, guildId, ...df.params]);
  return result[0] || {};
}

export async function getUserInteractions(userId: string, guildId: string = GUILD_ID) {
  const query = `
    SELECT 
      target_user_id,
      mutual_vc_sessions,
      mutual_vc_duration,
      messages_to_target,
      messages_in_same_channel,
      last_interaction
    FROM user_interactions
    WHERE user_id = $1 AND guild_id = $2
    ORDER BY mutual_vc_duration DESC
    LIMIT 50
  `;
  return await queryBotDb(query, [userId, guildId]);
}

export async function getChannelActivity(guildId: string = GUILD_ID) {
  const query = `
    SELECT 
      vl.channel_id,
      COALESCE(dcc.name, vl.channel_name, vl.channel_id) as channel_name,
      COUNT(DISTINCT vl.user_id) as unique_users,
      COUNT(*) as total_sessions,
      SUM(vl.duration_seconds) as total_duration,
      AVG(vl.peak_member_count) as avg_peak_members
    FROM voice_logs vl
    LEFT JOIN discord_channel_cache dcc ON dcc.channel_id = vl.channel_id
    WHERE vl.guild_id = $1 AND vl.channel_name IS NOT NULL
    GROUP BY vl.channel_id, dcc.name, vl.channel_name
    ORDER BY total_duration DESC
    LIMIT 50
  `;
  return await queryBotDb(query, [guildId]);
}

export async function getAllChatMessages(
  limit: number = 1000,
  guildId: string = GUILD_ID,
  dateFilter: DateFilter = {}
) {
  const df = buildDateClause('created_at', dateFilter, 3);
  const query = `
    SELECT 
      id,
      user_id,
      channel_id,
      COALESCE(channel_name, channel_id) as channel_name,
      content_length,
      in_voice_chat,
      replied_to_id,
      created_at
    FROM chat_logs
    WHERE guild_id = $1${df.clause}
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const params = [guildId, limit, ...df.params];
  console.log('[botDb] getAllChatMessages query:', query.replace(/\s+/g, ' ').trim());
  console.log('[botDb] getAllChatMessages params:', params);
  const result = await queryBotDb(query, params);
  console.log('[botDb] getAllChatMessages returned', result?.length || 0, 'rows');
  return result;
}

export async function getCachedUser(userId: string) {
  const query = `
    SELECT user_id, username, display_name, avatar_url, global_name, 
           discriminator, in_guild, roles, nickname, joined_at, updated_at
    FROM discord_user_cache
    WHERE user_id = $1
  `;
  const result = await queryBotDb(query, [userId]);
  return result[0] || null;
}

export async function getCachedUsers(userIds: string[]) {
  if (!userIds.length) return [];
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const query = `
    SELECT user_id, username, display_name, avatar_url, global_name, 
           discriminator, in_guild, roles, nickname, joined_at, updated_at
    FROM discord_user_cache
    WHERE user_id IN (${placeholders})
  `;
  return await queryBotDb(query, userIds);
}

export async function getAllCachedUsers() {
  const query = `
    SELECT user_id, username, display_name, avatar_url, global_name, 
           discriminator, in_guild, nickname, updated_at
    FROM discord_user_cache
    ORDER BY display_name ASC
  `;
  return await queryBotDb(query);
}

export async function getUserDisplay(userId: string, size: number = 128): Promise<UserDisplay> {
  const cachedUser = await getCachedUser(userId);
  return getUserDisplayFromCache(cachedUser as CachedUser | null, userId, size);
}

export async function getUsersDisplay(userIds: string[], size: number = 128): Promise<Map<string, UserDisplay>> {
  const cachedUsers = await getCachedUsers(userIds);
  const userMap = new Map<string, CachedUser>();
  cachedUsers.forEach((user: any) => userMap.set(user.user_id, user as CachedUser));
  
  const result = new Map<string, UserDisplay>();
  userIds.forEach(userId => {
    const cached = userMap.get(userId);
    result.set(userId, getUserDisplayFromCache(cached || null, userId, size));
  });
  
  return result;
}

export async function getCachedChannel(channelId: string) {
  const query = `
    SELECT channel_id, guild_id, name, type, parent_id, parent_name,
           position, is_deleted, updated_at
    FROM discord_channel_cache
    WHERE channel_id = $1
  `;
  const result = await queryBotDb(query, [channelId]);
  return result[0] || null;
}

export async function getCachedChannels(channelIds: string[]) {
  if (!channelIds.length) return [];
  const placeholders = channelIds.map((_, i) => `$${i + 1}`).join(', ');
  const query = `
    SELECT channel_id, guild_id, name, type, parent_id, parent_name,
           position, is_deleted, updated_at
    FROM discord_channel_cache
    WHERE channel_id IN (${placeholders})
  `;
  return await queryBotDb(query, channelIds);
}

export async function getAllCachedChannels(guildId: string = GUILD_ID) {
  const query = `
    SELECT channel_id, name, type, parent_id, parent_name,
           position, is_deleted, updated_at
    FROM discord_channel_cache
    WHERE guild_id = $1
    ORDER BY position ASC
  `;
  return await queryBotDb(query, [guildId]);
}
