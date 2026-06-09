import { canAccessVCAndChats } from '@/lib/apiAuth';
import { authOptions } from '@/lib/auth';
import { getAllUsersWithVCActivity,getAllUsersWithVCActivityAndProfiles } from '@/lib/botDb';
import { GUILD_ID,getErrorMessage } from '@/lib/constants';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessVCAndChats(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateFilter = { startDate, endDate };
    let users: Record<string, unknown>[] = [];
    try {
      users = await getAllUsersWithVCActivityAndProfiles(GUILD_ID, dateFilter);
    } catch (error: unknown) {
      console.error('Database error fetching users with profiles:', getErrorMessage(error));
      try {
        users = await getAllUsersWithVCActivity(GUILD_ID, dateFilter);
      } catch (fallbackError: unknown) {
        console.error('Fallback query also failed:', getErrorMessage(fallbackError));
      }
    }
    return NextResponse.json({ users: users || [] });
  } catch (error: unknown) {
    console.error('Error fetching users:', getErrorMessage(error));
    return NextResponse.json({ users: [] });
  }
}