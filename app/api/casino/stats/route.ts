import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// Helper to check if user has casino access
async function hasCasinoAccess(session: any): Promise<boolean> {
  if (!session?.user?.permissions) return false;
  
  const perms = session.user.permissions;
  if (perms.hasFullAccess) return true;
  
  try {
    const casinoRoles = await prismaBot.casinoAdminRole.findMany({
      where: { guild_id: GUILD_ID }
    });
    
    const casinoRoleIds = casinoRoles.map((r: any) => r.role_id);
    const userRoles = perms.roles || [];
    
    return userRoles.some((roleId: string) => casinoRoleIds.includes(roleId));
  } catch (error) {
    console.error('Error checking casino roles:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Casino stats GET - Session:', session?.user?.email);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      console.log('Casino stats GET - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await hasCasinoAccess(session);
    console.log('Casino stats GET - Has access:', hasAccess);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    console.log('Casino stats GET - Fetching stats...');

    // Get total items
    const totalItems = await prismaBot.shopItem.count({
      where: { guild_id: GUILD_ID }
    });

    // Get total purchases
    const totalPurchases = await prismaBot.shopPurchase.count({
      where: { guild_id: GUILD_ID }
    });

    // Get pending redemptions
    const pendingRedemptions = await prismaBot.shopPurchase.count({
      where: {
        guild_id: GUILD_ID,
        status: 'pending'
      }
    });

    // Get total revenue
    const purchases = await prismaBot.shopPurchase.findMany({
      where: { guild_id: GUILD_ID },
      select: { price_paid: true }
    });
    const totalRevenue = purchases.reduce((sum, p) => sum + p.price_paid, 0);

    // Get total users who made purchases
    const uniqueUsers = await prismaBot.shopPurchase.findMany({
      where: { guild_id: GUILD_ID },
      select: { user_id: true },
      distinct: ['user_id']
    });
    const totalUsers = uniqueUsers.length;

    // Get total points in economy (optional - might be heavy)
    const economyUsers = await prismaBot.economyUser.aggregate({
      where: { guild_id: GUILD_ID },
      _sum: { total_points: true }
    });
    const totalPoints = economyUsers._sum.total_points || 0;

    // Get top selling items
    const topItemsData = await prismaBot.shopPurchase.groupBy({
      by: ['item_id'],
      where: { guild_id: GUILD_ID },
      _count: { item_id: true },
      _sum: { price_paid: true },
      orderBy: { _count: { item_id: 'desc' } },
      take: 5
    });

    // Get item names for top items
    const topItems = await Promise.all(
      topItemsData.map(async (data) => {
        const item = await prismaBot.shopItem.findUnique({
          where: { id: data.item_id },
          select: { name: true }
        });
        return {
          name: item?.name || 'Unknown',
          purchaseCount: data._count.item_id,
          totalRevenue: data._sum.price_paid || 0
        };
      })
    );

    return NextResponse.json({
      stats: {
        totalItems,
        totalPurchases,
        pendingRedemptions,
        totalRevenue,
        totalUsers,
        totalPoints
      },
      topItems
    });

  } catch (error) {
    console.error('Error fetching casino stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
