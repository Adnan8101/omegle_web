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

    return NextResponse.json({
      success: true,
      budget: {
        available: budget.available,
        totalAdded: budget.total_added,
        totalSpent: budget.total_spent
      },
      logs: logs.map(log => ({
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
      }))
    });
  } catch (error) {
    console.error('Error fetching budget stats & logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
