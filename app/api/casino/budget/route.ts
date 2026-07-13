import { canAccessCasino } from '@/lib/apiAuth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const GUILD_ID = "1507458872225566811";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    let budget = await prismaBot.shopBudget.findUnique({
      where: { guild_id: GUILD_ID }
    });
    if (!budget) {
      budget = await prismaBot.shopBudget.create({
        data: { guild_id: GUILD_ID, available: 0, total_added: 0, total_spent: 0 }
      });
    }

    const logs = await prismaBot.shopBudgetLog.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { created_at: 'desc' }
    });

    // Fetch manual coin logs from EconomyPointLog
    const coinLogs = await prismaBot.economyPointLog.findMany({
      where: {
        guild_id: GUILD_ID,
        source: 'manual'
      },
      orderBy: { created_at: 'desc' }
    });

    const userIdsToFetch = new Set<string>();
    coinLogs.forEach(log => {
      if (log.user_id) userIdsToFetch.add(log.user_id);
      if (log.admin_id) userIdsToFetch.add(log.admin_id);
    });

    const userCaches = userIdsToFetch.size > 0
      ? await prismaBot.discordUserCache.findMany({
          where: { user_id: { in: Array.from(userIdsToFetch) } },
          select: { user_id: true, username: true, display_name: true }
        })
      : [];

    const userCacheMap = new Map(userCaches.map(u => [u.user_id, u.display_name || u.username]));

    const mappedBudgetLogs = logs.map(log => ({
      id: log.id,
      type: log.type,
      inr_cost: log.inr_cost,
      coin_cost: log.coin_cost,
      budget_before: log.budget_before,
      budget_after: log.budget_after,
      user_id: log.user_id,
      user_name: log.user_name,
      item_id: log.item_id,
      item_name: log.item_name,
      status: log.status,
      created_at: log.created_at.toISOString()
    }));

    const mappedCoinLogs = coinLogs.map(log => {
      const adminName = userCacheMap.get(log.admin_id || '') || log.admin_id || 'System';
      const userName = userCacheMap.get(log.user_id) || log.user_id || 'Unknown';
      return {
        id: log.id,
        type: log.amount >= 0 ? 'COIN_ADD' : 'COIN_REMOVE',
        inr_cost: null,
        coin_cost: Math.abs(log.amount),
        budget_before: null,
        budget_after: null,
        user_id: log.admin_id,
        user_name: adminName,
        item_id: log.user_id,
        item_name: `Target: ${userName}${log.reason ? ` (${log.reason})` : ''}`,
        status: 'SUCCESS',
        created_at: log.created_at.toISOString()
      };
    });

    const combinedLogs = [...mappedBudgetLogs, ...mappedCoinLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      budget: {
        available: budget.available,
        totalAdded: budget.total_added,
        totalSpent: budget.total_spent
      },
      logs: combinedLogs
    });
  } catch (error) {
    console.error('Error fetching budget stats & logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
