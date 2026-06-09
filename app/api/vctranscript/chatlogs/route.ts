import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessVCAndChats } from '@/lib/apiAuth';
import { getAllChatMessages } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessVCAndChats(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const messages = await getAllChatMessages(1000, undefined, { startDate, endDate });
    return NextResponse.json({ messages: messages || [] });
  } catch (error: unknown) {
    const errMsg = getErrorMessage(error);
    return NextResponse.json({ messages: [], error: errMsg }, { status: 500 });
  }
}