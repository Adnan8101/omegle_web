/**
 * Script to sync all users from bot database to ensure fresh data
 * This fetches all users from Discord and updates the cache
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { queryBotDb } from '../lib/botDb';

async function syncAllUsers() {
  console.log('🔄 Starting user sync from bot database...');
  
  try {
    // Get all unique user IDs from voice_logs and chat_logs
    const voiceUsers = await queryBotDb('SELECT DISTINCT user_id FROM voice_logs');
    const chatUsers = await queryBotDb('SELECT DISTINCT user_id FROM chat_logs');
    
    const allUserIds = [...new Set([
      ...voiceUsers.map((u: { user_id: string }) => u.user_id),
      ...chatUsers.map((u: { user_id: string }) => u.user_id),
    ])];
    
    console.log(`📊 Found ${allUserIds.length} unique users in logs`);
    
    // Check which users are not in cache
    const cachedUsers = await queryBotDb('SELECT user_id FROM discord_user_cache');
    
    const cachedUserIds = new Set(cachedUsers.map((u: { user_id: string }) => u.user_id));
    const missingUserIds = allUserIds.filter((id: string) => !cachedUserIds.has(id));
    
    console.log(`📊 ${cachedUsers.length} users already in cache`);
    console.log(`📊 ${missingUserIds.length} users need to be synced`);
    
    if (missingUserIds.length === 0) {
      console.log('✅ All users are already cached!');
      process.exit(0);
      return;
    }
    
    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!botToken) {
      console.error('❌ No Discord bot token found in environment');
      process.exit(1);
    }
    
    let synced = 0;
    let failed = 0;
    
    for (const userId of missingUserIds) {
      try {
        // Rate limit: small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        
        if (res.ok) {
          const user: any = await res.json();
          const avatarHash = user.avatar || null; // Store only the hash
          
          // Upsert user into cache
          await queryBotDb(`
            INSERT INTO discord_user_cache (user_id, username, display_name, avatar_url, global_name, discriminator, in_guild, roles, nickname, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id) DO UPDATE SET
              username = EXCLUDED.username,
              display_name = EXCLUDED.display_name,
              avatar_url = EXCLUDED.avatar_url,
              global_name = EXCLUDED.global_name,
              discriminator = EXCLUDED.discriminator,
              updated_at = NOW()
          `, [
            userId,
            user.username,
            user.global_name || user.username,
            avatarHash,
            user.global_name || null,
            user.discriminator || '0',
            false,
            null,
            null,
            null
          ]);
          
          console.log(`✅ Synced: ${user.username} (${userId})`);
          synced++;
        } else if (res.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(res.headers.get('retry-after') || '5') * 1000;
          console.log(`⏳ Rate limited, waiting ${retryAfter}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          // Retry this user
          missingUserIds.push(userId);
        } else {
          console.error(`❌ Failed to fetch user ${userId}: ${res.status}`);
          // Add placeholder for deleted users
          await queryBotDb(`
            INSERT INTO discord_user_cache (user_id, username, display_name, avatar_url, global_name, discriminator, in_guild, roles, nickname, joined_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id) DO NOTHING
          `, [
            userId,
            `deleted_${userId.slice(-4)}`,
            'Deleted User',
            null,
            null,
            '0',
            false,
            null,
            null,
            null
          ]);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error syncing user ${userId}:`, error);
        failed++;
      }
    }
    
    console.log('\n📊 Sync Summary:');
    console.log(`  ✅ Synced: ${synced}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
  
  process.exit(0);
}

syncAllUsers().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
