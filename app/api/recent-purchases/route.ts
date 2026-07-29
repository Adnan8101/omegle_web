import { prismaBot } from '@/lib/prismaBot';
import { getLiveUserProfiles } from '@/lib/teamBotClient';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GUILD_ID = '1507458872225566811';
const FEED_LIMIT = 24;

/**
 * Public activity feed of the newest shop purchases.
 *
 * This endpoint is unauthenticated, so it deliberately selects only the
 * columns that are safe to publish. `redeem_code` in particular is a bearer
 * secret — anyone holding it could redeem someone else's purchase — so it is
 * never selected here, along with `proof_link` and `redeemed_by`.
 */
export async function GET() {
  try {
    const purchases = await prismaBot.shopPurchase.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { created_at: 'desc' },
      take: FEED_LIMIT,
      select: {
        id: true,
        user_id: true,
        item_id: true,
        item_name: true,
        price_paid: true,
        status: true,
        created_at: true,
      },
    });

    if (purchases.length === 0) {
      const emptyConfig = await prismaBot.economyConfig.findUnique({ where: { guild_id: GUILD_ID } });
      return NextResponse.json({
        purchases: [],
        currencyEmoji: emptyConfig?.currency_emoji || '🪙',
        currencyName: emptyConfig?.currency_name || 'Ozy',
      });
    }

    const itemIds = Array.from(new Set(purchases.map((p) => p.item_id).filter(Boolean)));
    const userIds = Array.from(new Set(purchases.map((p) => p.user_id)));

    const [items, profiles, config] = await Promise.all([
      itemIds.length
        ? prismaBot.shopItem.findMany({
            where: { guild_id: GUILD_ID, id: { in: itemIds } },
            select: { id: true, thumbnail: true, description: true },
          })
        : Promise.resolve([]),
      getLiveUserProfiles(userIds),
      prismaBot.economyConfig.findUnique({ where: { guild_id: GUILD_ID } }),
    ]);

    const itemsById = new Map(items.map((item) => [item.id, item]));

    return NextResponse.json({
      purchases: purchases.map((purchase) => {
        const item = itemsById.get(purchase.item_id);
        const profile = profiles.get(purchase.user_id);

        return {
          id: purchase.id,
          itemName: purchase.item_name,
          itemDescription: item?.description ?? null,
          itemThumbnail: item?.thumbnail ?? null,
          // The shop row is gone but the purchase record survives.
          itemDelisted: !itemsById.has(purchase.item_id),
          pricePaid: purchase.price_paid,
          status: purchase.status,
          purchasedAt: purchase.created_at.toISOString(),
          user: {
            displayName: profile?.displayName || profile?.username || 'Unknown member',
            username: profile?.username ?? null,
            avatar: profile?.avatar ?? null,
          },
        };
      }),
      currencyEmoji: config?.currency_emoji || '🪙',
      currencyName: config?.currency_name || 'Ozy',
    });
  } catch (error) {
    console.error('[API recent-purchases GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load recent purchases' }, { status: 500 });
  }
}
