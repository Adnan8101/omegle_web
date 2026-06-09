import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserVCStats,
  getUserVCSessions,
  getUserChatStats,
  getUserInteractions,
  getUserVoiceUserStats,
} from '@/lib/botDb';
import { GUILD_ID, getErrorMessage } from '@/lib/constants';
import { canAccessVCAndChats } from '@/lib/apiAuth';
const emptyVCStats = {
  total_sessions: 0,
  total_duration: 0,
  unique_channels: 0,
  total_rejoins: 0,
  total_messages: 0,
  avg_session_duration: 0,
  longest_session: 0,
  shortest_session: 0,
  total_mutes: 0,
  total_unmutes: 0,
  total_deafs: 0,
  total_undeafs: 0,
  total_video_ons: 0,
  total_video_offs: 0,
  total_screen_shares: 0,
};
const emptyChatStats = {
  total_messages: 0,
  unique_channels: 0,
  total_characters: 0,
  messages_in_vc: 0,
  unique_reply_targets: 0,
};
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessVCAndChats(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateFilter = { startDate, endDate };
    const [vcStats, vcSessions, chatStats, interactions, voiceUserStats] = await Promise.all([
      getUserVCStats(userId, GUILD_ID, dateFilter).catch((e: unknown) => {
        console.error('Error fetching VC stats:', getErrorMessage(e));
        return emptyVCStats;
      }),
      getUserVCSessions(userId, GUILD_ID, 200, dateFilter).catch((e: unknown) => {
        console.error('Error fetching VC sessions:', getErrorMessage(e));
        return [];
      }),
      getUserChatStats(userId, GUILD_ID, dateFilter).catch((e: unknown) => {
        console.error('Error fetching chat stats:', getErrorMessage(e));
        return emptyChatStats;
      }),
      getUserInteractions(userId, GUILD_ID).catch((e: unknown) => {
        console.error('Error fetching interactions:', getErrorMessage(e));
        return [];
      }),
      getUserVoiceUserStats(userId, GUILD_ID).catch((e: unknown) => {
        console.error('Error fetching voice user stats:', getErrorMessage(e));
        return null;
      }),
    ]);
    return NextResponse.json({
      userId,
      vcStats: vcStats || emptyVCStats,
      vcSessions: vcSessions || [],
      chatStats: chatStats || emptyChatStats,
      interactions: interactions || [],
      voiceUserStats: voiceUserStats || null,
    });
  } catch (error: unknown) {
    console.error('Error fetching VC transcript:', getErrorMessage(error));
    return NextResponse.json({
      userId,
      vcStats: emptyVCStats,
      vcSessions: [],
      chatStats: emptyChatStats,
      interactions: [],
      voiceUserStats: null,
      _error: getErrorMessage(error),
    });
  }
}