import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaBot } from "@/lib/prismaBot";

const GUILD_ID = "910043773130661918";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.error('[Profile API] Unauthorized - no session or user ID');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('[Profile API] Fetching stats for user:', userId);

    // Fetch economy data
    const economyData = await prismaBot.economyUser.findUnique({
      where: {
        guild_id_user_id: {
          guild_id: GUILD_ID,
          user_id: userId,
        },
      },
    });

    // Get user's rank in economy
    const totalUsers = await prismaBot.economyUser.count({
      where: { guild_id: GUILD_ID },
    });

    let rank = 1;
    if (economyData) {
      const higherRankedUsers = await prismaBot.economyUser.count({
        where: {
          guild_id: GUILD_ID,
          leaderboard_points: {
            gt: economyData.leaderboard_points,
          },
        },
      });
      rank = higherRankedUsers + 1;
    }

    // Fetch voice channel sessions/logs
    const vcSessions = await prismaBot.voiceLog.findMany({
      where: {
        guild_id: GUILD_ID,
        user_id: userId,
      },
      orderBy: {
        joined_at: 'desc',
      },
      take: 50,
    });

    // Calculate total VC time from VoiceUserStats
    const voiceStats = await prismaBot.voiceUserStats.findUnique({
      where: {
        guild_id_user_id: {
          guild_id: GUILD_ID,
          user_id: userId,
        },
      },
    });

    const totalVcTime = voiceStats?.total_time_in_vc || 0;

    // Calculate VC statistics
    const uniqueChannels = new Set(vcSessions.map(s => s.channel_id)).size;
    const completedSessions = vcSessions.filter(s => s.duration_seconds);
    const avgDuration = completedSessions.length > 0
      ? Math.floor(completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedSessions.length)
      : 0;
    const longestSession = Math.max(...completedSessions.map(s => s.duration_seconds || 0), 0);
    const totalMutes = vcSessions.reduce((sum, s) => sum + (s.mute_count || 0), 0);
    const totalUnmutes = vcSessions.reduce((sum, s) => sum + (s.unmute_count || 0), 0);
    const totalDeafs = vcSessions.reduce((sum, s) => sum + (s.deaf_count || 0), 0);
    const totalUndeafs = vcSessions.reduce((sum, s) => sum + (s.undeaf_count || 0), 0);

    // Count total messages from EconomyUser
    const totalMessages = economyData?.total_messages || 0;

    // Fetch recent chat messages from chat_logs table
    const chatMessages = await prismaBot.$queryRaw<Array<{
      id: string;
      content: string;
      channel_name: string;
      created_at: Date;
      in_voice_chat: boolean;
      content_length: number;
    }>>`
      SELECT id, content, channel_name, created_at, in_voice_chat, content_length
      FROM chat_logs
      WHERE guild_id = ${GUILD_ID}
        AND user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    // Count unique channels from chat messages
    const uniqueChatChannels = new Set(chatMessages.map(m => m.channel_name)).size;

    // Check if user is currently in a VC (from VoiceTracking)
    const activeSession = await prismaBot.voiceTracking.findFirst({
      where: {
        guild_id: GUILD_ID,
        user_id: userId,
        left_at: null,
      },
      orderBy: {
        joined_at: 'desc',
      },
    });

    // Calculate today's stats (coins earned and VC time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayVcSessions = vcSessions.filter(
      (s) => new Date(s.joined_at) >= todayStart
    );

    const vcTimeToday = todayVcSessions.reduce((total, session) => {
      if (session.duration_seconds) {
        return total + session.duration_seconds;
      }
      // If still in VC, calculate time so far
      if (!session.left_at) {
        const duration = Math.floor(
          (Date.now() - new Date(session.joined_at).getTime()) / 1000
        );
        return total + duration;
      }
      return total;
    }, 0);

    // Fetch economy point logs for today to calculate coins earned
    const economyLogs = await prismaBot.economyPointLog.findMany({
      where: {
        guild_id: GUILD_ID,
        user_id: userId,
        created_at: {
          gte: todayStart,
        },
      },
    });

    const coinsEarnedToday = economyLogs.reduce((total, entry) => {
      return total + entry.amount;
    }, 0);

    // Get channel name for active session
    let currentVcName = null;
    if (activeSession) {
      // Try to get channel name from a recent log
      const recentLog = await prismaBot.voiceLog.findFirst({
        where: {
          guild_id: GUILD_ID,
          channel_id: activeSession.channel_id,
        },
        orderBy: {
          joined_at: 'desc',
        },
      });
      currentVcName = recentLog?.channel_name || 'Voice Channel';
    }

    // Format the response
    const stats = {
      economy: {
        coins: economyData?.leaderboard_points || 0,
        rank: rank,
        totalUsers: totalUsers,
      },
      voiceChannel: {
        totalTime: totalVcTime,
        sessions: vcSessions.map((session) => ({
          id: session.id,
          channelName: session.channel_name || 'Unknown Channel',
          joinedAt: session.joined_at.toISOString(),
          leftAt: session.left_at?.toISOString() || null,
          duration: session.duration_seconds || 0,
          peakMemberCount: session.peak_member_count || 0,
          messagesSent: session.messages_sent || 0,
          muteCount: session.mute_count || 0,
          unmuteCount: session.unmute_count || 0,
          deafCount: session.deaf_count || 0,
          undeafCount: session.undeaf_count || 0,
        })),
        stats: {
          totalSessions: vcSessions.length,
          uniqueChannels: uniqueChannels,
          avgDuration: avgDuration,
          longestSession: longestSession,
          totalMutes: totalMutes,
          totalUnmutes: totalUnmutes,
        },
      },
      chatStats: {
        totalMessages: totalMessages,
        uniqueChannels: uniqueChatChannels,
        recentMessages: chatMessages.map(msg => ({
          id: msg.id,
          content: msg.content || '[No content]',
          channelName: msg.channel_name || 'Unknown Channel',
          timestamp: msg.created_at.toISOString(),
          inVoiceChat: msg.in_voice_chat,
          contentLength: msg.content_length,
        })),
      },
      liveTracking: {
        currentVc: currentVcName,
        currentStatus: activeSession ? 'In Voice Channel' : 'Offline',
        coinsEarnedToday: coinsEarnedToday,
        vcTimeToday: vcTimeToday,
      },
    };

    console.log('[Profile API] Successfully returning stats');
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Profile API] Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
