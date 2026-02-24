/**
 * Script to fix user avatars in discord_user_cache
 * Converts full URLs to just avatar hashes
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { queryBotDb } from '../lib/botDb';

async function fixAvatars() {
  console.log('🔄 Fetching all users from discord_user_cache...');
  
  const users = await queryBotDb('SELECT * FROM discord_user_cache');
  console.log(`📊 Found ${users.length} users`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const user of users) {
    const avatarUrl = user.avatar_url;
    
    if (!avatarUrl) {
      skipped++;
      continue;
    }
    
    // Check if it's a full URL
    if (avatarUrl.startsWith('https://cdn.discordapp.com/avatars/')) {
      // Extract hash from URL: https://cdn.discordapp.com/avatars/{user_id}/{hash}.png
      const match = avatarUrl.match(/avatars\/\d+\/([^.?]+)/);
      if (match) {
        const hash = match[1];
        await queryBotDb(
          'UPDATE discord_user_cache SET avatar_url = $1 WHERE user_id = $2',
          [hash, user.user_id]
        );
        console.log(`✅ Updated ${user.username} (${user.user_id}): ${hash}`);
        updated++;
      }
    } else if (avatarUrl.startsWith('https://cdn.discordapp.com/embed/avatars/')) {
      // Default avatar - set to null
      await queryBotDb(
        'UPDATE discord_user_cache SET avatar_url = NULL WHERE user_id = $1',
        [user.user_id]
      );
      console.log(`✅ Updated ${user.username} (${user.user_id}): set to null (default avatar)`);
      updated++;
    } else {
      // Already a hash, skip
      skipped++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log('✨ Done!');
  
  process.exit(0);
}

fixAvatars().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
