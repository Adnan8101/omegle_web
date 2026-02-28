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
  
  // Check if user has casino role from database
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

// GET - Get casino statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await hasCasinoAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    
    // Get economy config
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    
    // Get total shop items
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
    
    // Get total revenue (sum of all purchases)
    const revenueResult = await prismaBot.shopPurchase.aggregate({
      where: { guild_id: GUILD_ID },
      _sum: { price_paid: true }
    });
    const totalRevenue = revenueResult._sum.price_paid || 0;
    
    // Get total economy users
    const totalUsers = await prismaBot.economyUser.count({
      where: { guild_id: GUILD_ID }
    });
    
    // Get total points in circulation
    const pointsResult = await prismaBot.economyUser.aggregate({
      where: { guild_id: GUILD_ID },
      _sum: { total_points: true }
    });
    const totalPoints = pointsResult._sum.total_points || 0;
    
    // Get recent purchases (last 10)
    const recentPurchases = await prismaBot.shopPurchase.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { created_at: 'desc' },
      take: 10
    });
    
    // Get top selling items
    const topItems = await prismaBot.$queryRaw`
      SELECT item_name, COUNT(*) as purchase_count, SUM(price_paid) as total_revenue
      FROM shop_purchases
      WHERE guild_id = ${GUILD_ID}
      GROUP BY item_name
      ORDER BY purchase_count DESC
      LIMIT 5
    ` as Array<{ item_name: string; purchase_count: bigint; total_revenue: bigint }>;
    
    return NextResponse.json({
      config: {
        enabled: config?.enabled || false,
        currencyName: config?.currency_name || 'points',
        currencyEmoji: config?.currency_emoji || '🪙',
        messagesPerPoint: config?.messages_per_point || 25,
        minutesPerPoint: config?.minutes_per_point || 1
      },
      stats: {
        totalItems,
        totalPurchases,
        pendingRedemptions,
        totalRevenue,
        totalUsers,
        totalPoints
      },
      recentPurchases: recentPurchases.map((p: any) => ({
        ...p,
        created_at: p.created_at.toISOString(),
        redeemed_at: p.redeemed_at?.toISOString() || null
      })),
      topItems: topItems.map(item => ({
        name: item.item_name,
        purchaseCount: Number(item.purchase_count),
        totalRevenue: Number(item.total_revenue)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching casino stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
