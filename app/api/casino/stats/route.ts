import { canAccessCasino } from '@/lib/apiAuth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
const GUILD_ID = "1507458872225566811";
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
    const totalItems = await prismaBot.shopItem.count({
      where: { guild_id: GUILD_ID }
    });
    const totalPurchases = await prismaBot.shopPurchase.count({
      where: { guild_id: GUILD_ID }
    });
    const pendingRedemptions = await prismaBot.shopPurchase.count({
      where: {
        guild_id: GUILD_ID,
        status: 'pending'
      }
    });
    const purchases = await prismaBot.shopPurchase.findMany({
      where: { guild_id: GUILD_ID },
      select: { price_paid: true }
    });
    const totalRevenue = purchases.reduce((sum, p) => sum + p.price_paid, 0);
    const uniqueUsers = await prismaBot.shopPurchase.findMany({
      where: { guild_id: GUILD_ID },
      select: { user_id: true },
      distinct: ['user_id']
    });
    const totalUsers = uniqueUsers.length;
    const economyUsers = await prismaBot.economyUser.aggregate({
      where: { guild_id: GUILD_ID },
      _sum: { total_points: true }
    });
    const totalPoints = economyUsers._sum.total_points || 0;
    const topItemsData = await prismaBot.shopPurchase.groupBy({
      by: ['item_id', 'item_name'],
      where: { guild_id: GUILD_ID },
      _count: { item_id: true },
      _sum: { price_paid: true },
      orderBy: { _count: { item_id: 'desc' } },
      take: 5
    });
    const topItems = await Promise.all(
      topItemsData.map(async (data) => {
        const item = await prismaBot.shopItem.findUnique({
          where: { id: data.item_id },
          select: { name: true }
        });
        const fallbackName = data.item_name ? `Deleted: ${data.item_name}` : 'Deleted Item';
        return {
          name: item?.name || fallbackName,
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