// Test script to verify Discord API connection
// Run with: npx ts-node scripts/test-discord-api.ts

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const GUILD_ID = "910043773130661918";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function testDiscordAPI() {
  console.log('='.repeat(50));
  console.log('Discord API Test Script');
  console.log('='.repeat(50));
  
  // Check if token exists
  console.log('\n1. Checking BOT_TOKEN...');
  if (!BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN is not set in .env.local');
    process.exit(1);
  }
  console.log('✅ BOT_TOKEN found (length:', BOT_TOKEN.length, ')');
  console.log('   Token starts with:', BOT_TOKEN.substring(0, 20) + '...');
  
  // Test Discord API - Get Guild Info
  console.log('\n2. Testing Discord API - Get Guild Info...');
  try {
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!guildResponse.ok) {
      const errorText = await guildResponse.text();
      console.error('❌ Guild API Error:', guildResponse.status, errorText);
    } else {
      const guild = await guildResponse.json();
      console.log('✅ Guild found:', guild.name);
      console.log('   Guild ID:', guild.id);
      console.log('   Member count:', guild.approximate_member_count || 'N/A');
    }
  } catch (error: any) {
    console.error('❌ Guild fetch error:', error.message);
  }
  
  // Test Discord API - Get Channels
  console.log('\n3. Testing Discord API - Get Channels...');
  try {
    const channelsResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!channelsResponse.ok) {
      const errorText = await channelsResponse.text();
      console.error('❌ Channels API Error:', channelsResponse.status, errorText);
      process.exit(1);
    }
    
    const channels = await channelsResponse.json();
    console.log('✅ Channels fetched successfully!');
    console.log('   Total channels:', channels.length);
    
    // Filter by type
    const categories = channels.filter((ch: any) => ch.type === 4);
    const textChannels = channels.filter((ch: any) => ch.type === 0);
    const voiceChannels = channels.filter((ch: any) => ch.type === 2);
    
    console.log('\n   Categories (type 4):', categories.length);
    console.log('   Text Channels (type 0):', textChannels.length);
    console.log('   Voice Channels (type 2):', voiceChannels.length);
    
    // List categories
    console.log('\n4. Categories found:');
    console.log('-'.repeat(40));
    categories
      .sort((a: any, b: any) => a.position - b.position)
      .forEach((cat: any, index: number) => {
        console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
      });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed! Discord API is working.');
    console.log('='.repeat(50));
    
    // Output JSON for debugging
    console.log('\n5. Sample category data (first 3):');
    console.log(JSON.stringify(categories.slice(0, 3), null, 2));
    
  } catch (error: any) {
    console.error('❌ Channels fetch error:', error.message);
    process.exit(1);
  }
}

testDiscordAPI();
