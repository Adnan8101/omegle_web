// Admin: paginated spin history for the Spin the Wheel game (spec §13).
// Joins WheelSpin to DiscordUserCache for display names.

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { canAccessCasino } from '@/lib/apiAuth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canAccessCasino(session.user.permissions)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [spins, total] = await Promise.all([
      prismaBot.wheelSpin.findMany({
        where: { guild_id: GUILD_ID },
        orderBy: { created_at: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prismaBot.wheelSpin.count({ where: { guild_id: GUILD_ID } }),
    ]);

    // Resolve display names.
    const userIds = [...new Set(spins.map((s) => s.user_id))];
    const users = userIds.length
      ? await prismaBot.discordUserCache.findMany({
          where: { user_id: { in: userIds } },
          select: { user_id: true, display_name: true, global_name: true, username: true },
        })
      : [];
    const nameMap = new Map<string, string>();
    for (const u of users) {
      nameMap.set(u.user_id, u.display_name || u.global_name || u.username || u.user_id);
    }

    return NextResponse.json(
      {
        spins: spins.map((s) => ({
          spinId: s.id,
          userId: s.user_id,
          userName: nameMap.get(s.user_id) || s.user_id,
          reward: s.reward_amount,
          segmentIndex: s.segment_index,
          balanceBefore: s.balance_before,
          balanceAfter: s.balance_after,
          createdAt: s.created_at.toISOString(),
        })),
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('Error fetching wheel history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
