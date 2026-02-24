import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUsersDisplay } from '@/lib/botDb';
import { getErrorMessage } from '@/lib/constants';

/**
 * Batch resolve Discord users from cache
 * POST body: { userIds: string[] }
 */
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

    // Limit to 100 users per batch
    const limitedIds = userIds.slice(0, 100);

    // Use cached user data with proper avatar URLs
    const usersMap = await getUsersDisplay(limitedIds, 128);
    
    return NextResponse.json({ users: usersMap });
  } catch (error: unknown) {
    console.error('Error batch fetching users:', getErrorMessage(error));
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
