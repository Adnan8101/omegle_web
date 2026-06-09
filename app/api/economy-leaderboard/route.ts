import { NextRequest, NextResponse } from 'next/server';
import { prismaBot } from '@/lib/prismaBot';
const GUILD_ID = "1507458872225566811";
export async function GET(request: NextRequest) {
  try {
    const topUsers = await prismaBot.economyUser.findMany({
      where: {
        guild_id: GUILD_ID,
        total_points: { gt: 0 }
      },
      orderBy: { total_points: 'desc' },
      take: 20,
      select: {
        user_id: true,
        total_points: true,
        leaderboard_points: true
      }
    });
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    const leaderboard = await Promise.all(
      topUsers.map(async (user, index) => {
        try {
          const userRes = await fetch(
            `https://discord.com/api/v10/users/${user.user_id}`,
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
            }
          );
          let username = 'Unknown User';
          let avatar = null;
          if (userRes.ok) {
            const userData = await userRes.json();
            username = userData.global_name || userData.username;
            if (userData.avatar) {
              avatar = `https://cdn.discordapp.com/avatars/${user.user_id}/${userData.avatar}.png?size=128`;
            }
          }
          return {
            rank: index + 1,
            user_id: user.user_id,
            username,
            avatar,
            total_points: user.total_points,
            leaderboard_points: user.leaderboard_points
          };
        } catch (error) {
          console.error(`Error fetching user ${user.user_id}:`, error);
          return {
            rank: index + 1,
            user_id: user.user_id,
            username: 'Unknown User',
            avatar: null,
            total_points: user.total_points,
            leaderboard_points: user.leaderboard_points
          };
        }
      })
    );
    return NextResponse.json({
      leaderboard,
      currencyEmoji: config?.currency_emoji || '🪙',
      currencyName: config?.currency_name || 'Ozy'
    });
  } catch (error) {
    console.error('Error fetching economy leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}