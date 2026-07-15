import { canAccessCasino } from '@/lib/apiAuth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const GUILD_ID = '1507458872225566811';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 });
    }

    // Bulk update sort_order: each item gets its index as the sort_order
    await prismaBot.$transaction(
      orderedIds.map((id: string, index: number) =>
        prismaBot.shopItem.updateMany({
          where: { id, guild_id: GUILD_ID },
          data: { sort_order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering shop items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
