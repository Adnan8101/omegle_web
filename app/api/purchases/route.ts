import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's purchases
    const purchases = await prismaBot.shopPurchase.findMany({
      where: {
        guild_id: GUILD_ID,
        user_id: userId
      },
      orderBy: { created_at: 'desc' }
    });

    const purchasedItemIds = Array.from(
      new Set(
        purchases
          .map((p: any) => p.item_id)
          .filter((id: any) => typeof id === 'string' && id.length > 0)
      )
    );

    let existingItemIds = new Set<string>();
    if (purchasedItemIds.length > 0) {
      const existingItems = await prismaBot.shopItem.findMany({
        where: {
          guild_id: GUILD_ID,
          id: { in: purchasedItemIds }
        },
        select: { id: true }
      });
      existingItemIds = new Set(existingItems.map((item: any) => item.id));
    }

    // Get economy config for currency
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    return NextResponse.json({
      purchases: purchases.map((p: any) => ({
        id: p.id,
        item_id: p.item_id,
        item_name: p.item_name,
        price_paid: p.price_paid,
        redeem_code: p.redeem_code,
        status: p.status,
        is_item_deleted: !existingItemIds.has(p.item_id),
        created_at: p.created_at.toISOString(),
        redeemed_at: p.redeemed_at?.toISOString() || null,
        redeemed_by: p.redeemed_by
      })),
      currencyEmoji: config?.currency_emoji || '🪙'
    });

  } catch (error) {
    console.error('Error fetching user purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
