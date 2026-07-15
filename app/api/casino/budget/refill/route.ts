import { canAccessCasino } from '@/lib/apiAuth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
const GUILD_ID = "1507458872225566811";
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
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
    const amount = Number(body.amount);
    const action = body.action || 'refill'; 
    if (isNaN(amount) || amount < 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'Amount must be a non-negative integer' }, { status: 400 });
    }
    if (action === 'refill' && amount <= 0) {
      return NextResponse.json({ error: 'Refill amount must be a positive integer' }, { status: 400 });
    }
    const result = await prismaBot.$transaction(async (tx) => {
      let budget = await tx.shopBudget.findUnique({
        where: { guild_id: GUILD_ID }
      });
      if (!budget) {
        budget = await tx.shopBudget.create({
          data: { guild_id: GUILD_ID, available: 0, total_added: 0, total_spent: 0 }
        });
      }
      const oldAvailable = budget.available;
      let newAvailable = oldAvailable;
      if (action === 'set') {
        newAvailable = amount;
      } else {
        newAvailable = oldAvailable + amount;
      }
      const updatedBudget = await tx.shopBudget.update({
        where: { guild_id: GUILD_ID },
        data: {
          available: newAvailable,
          total_added: action === 'set' ? undefined : { increment: amount }
        }
      });
      const log = await tx.shopBudgetLog.create({
        data: {
          guild_id: GUILD_ID,
          type: action === 'set' ? 'EDIT' : 'REFILL',
          inr_cost: amount,
          coin_cost: amount,
          budget_before: oldAvailable,
          budget_after: newAvailable,
          user_id: session.user.id,
          user_name: session.user.name || session.user.email || 'Admin',
          status: 'SUCCESS'
        }
      });
      return { updatedBudget, log };
    });
    return NextResponse.json({
      success: true,
      budget: {
        available: result.updatedBudget.available,
        totalAdded: result.updatedBudget.total_added,
        totalSpent: result.updatedBudget.total_spent
      }
    });
  } catch (error) {
    console.error('Error refilling/updating budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}