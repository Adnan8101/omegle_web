import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUsersDisplay } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds } = await request.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
    }

    
    const limitedIds = userIds.slice(0, 100);

    
    const usersMap = await getUsersDisplay(limitedIds, 128);
    
    return NextResponse.json({ users: usersMap });
  } catch (error: unknown) {
    console.error('Error batch fetching users:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
