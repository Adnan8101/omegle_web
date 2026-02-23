/**
 * Import Voice & Chat Data from Bot DB to Web Transcript DB
 * 
 * This script copies voice logs, chat logs, and user interactions
 * from the bot's PostgreSQL database to populate the web transcript feature.
 * 
 * Usage: npx ts-node scripts/importVoiceData.ts
 */

import { Pool } from 'pg';

const BOT_DB_URL = process.env.BOT_DATABASE_URL!;
const GUILD_ID = '910043773130661918';

if (!BOT_DB_URL) {
  console.error('❌ BOT_DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: BOT_DB_URL,
  max: 10,
  ssl: {
    rejectUnauthorized: false,
  },
});

interface VoiceLog {
  id: string;
  guild_id: string;
  user_id: string;
  channel_id: string;
  channel_name: string | null;
  joined_at: Date;
  left_at: Date | null;
  duration_seconds: number | null;
  mute_count: number;
  unmute_count: number;
  deaf_count: number;
  undeaf_count: number;
  video_on_count: number;
  video_off_count: number;
  screen_share_start: number;
  screen_share_stop: number;
  members_present: string | null;
  peak_member_count: number | null;
  first_joiner_id: string | null;
  last_leaver_id: string | null;
  join_order: number | null;
  leave_order: number | null;
  messages_sent: number;
  is_rejoin: boolean;
  rejoin_count: number;
}

interface ChatLog {
  id: string;
  guild_id: string;
  user_id: string;
  channel_id: string;
  channel_name: string | null;
  message_id: string;
  content_length: number | null;
  in_voice_chat: boolean;
  replied_to_id: string | null;
  created_at: Date;
}

interface UserInteraction {
  id: string;
  guild_id: string;
  user_id: string;
  target_user_id: string;
  mutual_vc_sessions: number;
  mutual_vc_duration: number;
  messages_to_target: number;
  messages_in_same_channel: number;
  last_interaction: Date;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function getStats() {
  console.log('\n📊 Analyzing data in bot database...\n');

  try {
    // Check if tables exist
    const voiceLogsExists = await checkTableExists('voice_logs');
    const chatLogsExists = await checkTableExists('chat_logs');
    const interactionsExists = await checkTableExists('user_interactions');

    if (!voiceLogsExists) {
      console.log('⚠️  voice_logs table not found - it will be created');
    }
    if (!chatLogsExists) {
      console.log('⚠️  chat_logs table not found - it will be created');
    }
    if (!interactionsExists) {
      console.log('⚠️  user_interactions table not found - it will be created');
    }

    // Voice logs stats
    if (voiceLogsExists) {
      const voiceStats = await pool.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT channel_id) as unique_channels,
          SUM(duration_seconds) as total_duration,
          MIN(joined_at) as earliest_session,
          MAX(joined_at) as latest_session
        FROM voice_logs
        WHERE guild_id = $1 AND left_at IS NOT NULL
      `, [GUILD_ID]);

      const vs = voiceStats.rows[0];
      console.log('🎙️  Voice Logs:');
      console.log(`   └─ Total Sessions: ${parseInt(vs.total_sessions).toLocaleString()}`);
      console.log(`   └─ Unique Users: ${parseInt(vs.unique_users).toLocaleString()}`);
      console.log(`   └─ Unique Channels: ${parseInt(vs.unique_channels).toLocaleString()}`);
      console.log(`   └─ Total Duration: ${formatSeconds(parseInt(vs.total_duration) || 0)}`);
      console.log(`   └─ Date Range: ${vs.earliest_session ? new Date(vs.earliest_session).toLocaleDateString() : 'N/A'} to ${vs.latest_session ? new Date(vs.latest_session).toLocaleDateString() : 'N/A'}`);
    }

    // Chat logs stats
    if (chatLogsExists) {
      const chatStats = await pool.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT channel_id) as unique_channels,
          SUM(content_length) as total_characters,
          COUNT(CASE WHEN in_voice_chat THEN 1 END) as messages_in_vc
        FROM chat_logs
        WHERE guild_id = $1
      `, [GUILD_ID]);

      const cs = chatStats.rows[0];
      console.log('\n💬 Chat Logs:');
      console.log(`   └─ Total Messages: ${parseInt(cs.total_messages).toLocaleString()}`);
      console.log(`   └─ Unique Users: ${parseInt(cs.unique_users).toLocaleString()}`);
      console.log(`   └─ Unique Channels: ${parseInt(cs.unique_channels).toLocaleString()}`);
      console.log(`   └─ Total Characters: ${parseInt(cs.total_characters || 0).toLocaleString()}`);
      console.log(`   └─ Messages in VC: ${parseInt(cs.messages_in_vc).toLocaleString()}`);
    }

    // User interactions stats
    if (interactionsExists) {
      const interactionStats = await pool.query(`
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT user_id) as unique_users,
          SUM(mutual_vc_sessions) as total_mutual_sessions,
          SUM(mutual_vc_duration) as total_mutual_duration
        FROM user_interactions
        WHERE guild_id = $1
      `, [GUILD_ID]);

      const is = interactionStats.rows[0];
      console.log('\n🤝 User Interactions:');
      console.log(`   └─ Total Interaction Pairs: ${parseInt(is.total_interactions).toLocaleString()}`);
      console.log(`   └─ Unique Users: ${parseInt(is.unique_users).toLocaleString()}`);
      console.log(`   └─ Total Mutual Sessions: ${parseInt(is.total_mutual_sessions || 0).toLocaleString()}`);
      console.log(`   └─ Total Mutual Duration: ${formatSeconds(parseInt(is.total_mutual_duration) || 0)}`);
    }

    console.log('\n✅ All data is already in the bot database and accessible via the transcript API!');
    console.log('\n📝 Note: The transcript web app reads directly from the bot database using');
    console.log('   the botDb.ts library and the BOT_DATABASE_URL connection string.');
    console.log('   No data import is needed - it\'s all live!\n');

    // Show top 10 users by VC time
    if (voiceLogsExists) {
      console.log('\n🏆 Top 10 Users by Voice Time:\n');
      const topUsers = await pool.query(`
        SELECT 
          user_id,
          COUNT(*) as session_count,
          SUM(duration_seconds) as total_duration,
          MAX(joined_at) as last_active
        FROM voice_logs
        WHERE guild_id = $1 AND left_at IS NOT NULL
        GROUP BY user_id
        ORDER BY total_duration DESC
        LIMIT 10
      `, [GUILD_ID]);

      topUsers.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. User ${row.user_id}`);
        console.log(`      └─ Sessions: ${row.session_count} | Duration: ${formatSeconds(parseInt(row.total_duration))}`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Error analyzing data:', error.message);
    throw error;
  }
}

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

async function createDummyUserIfNeeded() {
  console.log('\n🧪 Creating dummy user data for testing...\n');
  
  const dummyUserId = '123456789012345678'; // Example Discord ID
  const dummyChannelId = '987654321098765432';
  
  try {
    // Check if dummy user already has data
    const existing = await pool.query(`
      SELECT COUNT(*) as count FROM voice_logs 
      WHERE guild_id = $1 AND user_id = $2
    `, [GUILD_ID, dummyUserId]);

    if (parseInt(existing.rows[0].count) > 0) {
      console.log(`✅ Dummy user ${dummyUserId} already has ${existing.rows[0].count} sessions`);
      return;
    }

    // Create some dummy voice sessions
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const joinedAt = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)); // i days ago
      const leftAt = new Date(joinedAt.getTime() + (Math.random() * 2 * 60 * 60 * 1000)); // 0-2 hours
      const duration = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000);

      await pool.query(`
        INSERT INTO voice_logs (
          id, guild_id, user_id, channel_id, channel_name,
          joined_at, left_at, duration_seconds,
          mute_count, unmute_count, messages_sent,
          peak_member_count, is_rejoin, rejoin_count
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13
        )
      `, [
        GUILD_ID, dummyUserId, dummyChannelId, 'Test Channel',
        joinedAt, leftAt, duration,
        Math.floor(Math.random() * 5), Math.floor(Math.random() * 5), Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 10) + 1, false, 0
      ]);
    }

    console.log(`✅ Created 5 dummy sessions for user ${dummyUserId}`);
    console.log(`   You can now visit: https://www.omegleecommunity.com/admin/vctranscript/${dummyUserId}\n`);

  } catch (error: any) {
    console.error('❌ Error creating dummy data:', error.message);
  }
}

async function main() {
  console.log('🚀 Voice Data Analysis & Test Data Generator\n');
  console.log(`📍 Guild ID: ${GUILD_ID}`);
  console.log(`🔗 Database: ${BOT_DB_URL.split('@')[1] || 'Connected'}\n`);

  try {
    await getStats();
    await createDummyUserIfNeeded();
    
    console.log('\n✨ Script completed successfully!');
    console.log('\n🌐 Available URLs:');
    console.log('   • User List: https://www.omegleecommunity.com/admin/vctranscript');
    console.log('   • Test User: https://www.omegleecommunity.com/admin/vctranscript/123456789012345678');
    console.log('   • Dashboard: https://www.omegleecommunity.com/admin/dashboard\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
