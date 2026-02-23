import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllChatMessages } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('[ChatLogs API] Fetching messages with filters:', { startDate, endDate });
    
    const messages = await getAllChatMessages(1000, undefined, { startDate, endDate });
    
    console.log('[ChatLogs API] Found', messages?.length || 0, 'messages');
    
    return NextResponse.json({ messages: messages || [] });
  } catch (error: unknown) {
    const errMsg = getErrorMessage(error);
    console.error('[ChatLogs API] Error:', errMsg);
    return NextResponse.json({ messages: [], error: errMsg }, { status: 500 });
  }
}
