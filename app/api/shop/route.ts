import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { sendDM } from '@/lib/discord';
import { getDiscordUser } from '@/lib/discord';
import crypto from 'crypto';

const GUILD_ID = "910043773130661918";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET - Get public shop items and user balance (if logged in)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Get economy config first to check if shop is enabled
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    // Check if shop is disabled
    if (config?.shop_enabled === false) {
      return NextResponse.json({
        shopDisabled: true,
        items: [],
        config: {
          currencyEmoji: config?.currency_emoji || '🪙',
          currencyName: config?.currency_name || 'Ozy'
        },
        user: null
      });
    }

    // Get all shop items (both enabled and disabled, including out of stock items)
    const now = new Date();
    const items = await prismaBot.shopItem.findMany({
      where: {
        guild_id: GUILD_ID,
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } }
        ]
      },
      orderBy: { price: 'asc' }
    });

    let userBalance = 0;
    let userPurchases: any[] = [];
    let userRoleIds: string[] = [];

    // If user is logged in, get their balance and purchases
    if (userId) {
      const [economyUser, member, pendingPurchases] = await Promise.all([
        prismaBot.economyUser.findUnique({
          where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } }
        }),
        getDiscordUser(userId),
        prismaBot.shopPurchase.findMany({
          where: {
            guild_id: GUILD_ID,
            user_id: userId,
            status: 'pending'
          },
          orderBy: { created_at: 'desc' },
          take: 10
        })
      ]);

      userBalance = economyUser?.total_points || 0;
      userRoleIds = member?._fromGuild ? (member.roles || []) : [];

      userPurchases = pendingPurchases;
    }

    return NextResponse.json({
      items: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        thumbnail: item.thumbnail,
        stock: item.stock,
        income_amount: item.income_amount,
        time_hours: item.time_hours,
        role_required_id: item.role_required_id,
        has_required_role: userId
          ? (!item.role_required_id || userRoleIds.includes(item.role_required_id))
          : null,
        required_balance: item.required_balance,
        expires_at: item.expires_at?.toISOString() || null,
        out_of_stock: item.stock !== null && item.stock !== -1 && item.stock <= 0,
        enabled: item.enabled
      })),
      config: {
        currencyEmoji: config?.currency_emoji || '🪙',
        currencyName: config?.currency_name || 'Ozy'
      },
      user: userId ? {
        id: userId,
        balance: userBalance,
        pendingPurchases: userPurchases.map((p: any) => ({
          id: p.id,
          itemName: p.item_name,
          pricePaid: p.price_paid,
          redeemCode: p.redeem_code,
          createdAt: p.created_at.toISOString()
        }))
      } : null
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error) {
    console.error('Error fetching shop:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Purchase an item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in to purchase items' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { itemId } = body;

    const member = await getDiscordUser(userId);
    const userRoleIds = member?._fromGuild ? (member.roles || []) : [];

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Get economy config first to check if shop is enabled
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    if (config?.shop_enabled === false) {
      return NextResponse.json({ error: 'The shop is currently closed' }, { status: 400 });
    }

    const result = await prismaBot.$transaction(async (tx) => {
      // Get the item
      const item = await tx.shopItem.findFirst({
        where: { id: itemId, guild_id: GUILD_ID }
      });

      if (!item) {
        throw new Error('ITEM_NOT_FOUND');
      }

      // Check if item is enabled
      if (!item.enabled) {
        throw new Error('ITEM_DISABLED');
      }

      // Check if item is expired
      if (item.expires_at && new Date() > item.expires_at) {
        throw new Error('ITEM_EXPIRED');
      }

      if (item.role_required_id && !userRoleIds.includes(item.role_required_id)) {
        throw new Error(`MISSING_REQUIRED_ROLE:${item.role_required_id}`);
      }

      // Check stock
      if (item.stock !== null && item.stock !== -1 && item.stock <= 0) {
        throw new Error('OUT_OF_STOCK');
      }

      // Get user's economy data
      const economyUser = await tx.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } }
      });

      // Use already fetched config for currency name
      const currencyName = config?.currency_name || 'Ozy';

      if (!economyUser) {
        throw new Error(`NO_ECONOMY_ACCOUNT:${currencyName}`);
      }

      // Check balance
      if (economyUser.total_points < item.price) {
        throw new Error(`INSUFFICIENT_BALANCE:${item.price}:${economyUser.total_points}:${currencyName}`);
      }

      // Check minimum balance requirement
      if (item.required_balance && economyUser.total_points < item.required_balance) {
        throw new Error(`MIN_BALANCE:${item.required_balance}:${currencyName}`);
      }

      // Generate unique redeem code
      let code = generateCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await tx.shopPurchase.findUnique({ where: { redeem_code: code } });
        if (!existing) break;
        code = generateCode();
        attempts++;
      }

      // Decrement stock if applicable (atomic guard to avoid race/oversell)
      if (item.stock !== null && item.stock !== -1) {
        const stockUpdate = await tx.shopItem.updateMany({
          where: { id: item.id, guild_id: GUILD_ID, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } }
        });

        if (stockUpdate.count === 0) {
          throw new Error('OUT_OF_STOCK');
        }
      }

      // Use config for leaderboard sync setting
      const leaderboardSync = config?.leaderboard_sync ?? true;

      // Deduct points with atomic guard against concurrent balance changes.
      const pointsUpdate = await tx.economyUser.updateMany({
        where: {
          guild_id: GUILD_ID,
          user_id: userId,
          total_points: { gte: item.price }
        },
        data: {
          total_points: { decrement: item.price },
          leaderboard_points: leaderboardSync ? { decrement: item.price } : undefined
        }
      });

      if (pointsUpdate.count === 0) {
        throw new Error(`INSUFFICIENT_BALANCE:${item.price}:${economyUser.total_points}:${currencyName}`);
      }

      // Create purchase record
      const purchase = await tx.shopPurchase.create({
        data: {
          guild_id: GUILD_ID,
          user_id: userId,
          item_id: item.id,
          item_name: item.name,
          price_paid: item.price,
          redeem_code: code
        }
      });

      // Create point log
      await tx.economyPointLog.create({
        data: {
          guild_id: GUILD_ID,
          user_id: userId,
          amount: -item.price,
          reason: `Purchased ${item.name} (Website)`,
          source: 'shop'
        }
      });

      return { item, purchase, economyUser };
    });

    const { item, purchase, economyUser } = result;

    // Get currency emoji for the DM
    const currencyEmoji = config?.currency_emoji || '🪙';
    const formatNumber = (n: number) => n.toLocaleString();

    // Send DM notification to user with purchase receipt
    let dmSent = false;
    try {
      const dmResult = await sendDM(userId, {
        embed: {
          title: '🎉 Purchase Successful!',
          description: `Thank you for your purchase from **Omeglee Community Shop**!`,
          color: 0x57F287, // Green color
          thumbnail: item.thumbnail ? { url: item.thumbnail } : undefined,
          fields: [
            { name: '📦 Item', value: item.name, inline: true },
            { name: '💰 Price Paid', value: `${currencyEmoji}${formatNumber(item.price)}`, inline: true },
            { name: '🎟️ Your Redeem Code', value: `\`\`\`${purchase.redeem_code}\`\`\``, inline: false },
            { name: '📝 How to Redeem', value: `DM **Omeglee Bot** and send your code:\n\`/redeem code:${purchase.redeem_code}\``, inline: false }
          ],
          footer: { text: '⚠️ Keep this code safe! • Omeglee Shop' },
          timestamp: new Date().toISOString()
        }
      });
      dmSent = dmResult.success;
      if (!dmResult.success) {
        console.error('DM failed:', dmResult.error);
      }
    } catch (dmError) {
      console.error('Failed to send DM notification:', dmError);
    }

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchase.id,
        itemName: item.name,
        pricePaid: item.price,
        redeemCode: purchase.redeem_code,
        replyMessage: item.reply_message,
        createdAt: purchase.created_at.toISOString()
      },
      newBalance: economyUser.total_points - item.price,
      dmSent
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ITEM_NOT_FOUND') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      if (error.message === 'ITEM_DISABLED') {
        return NextResponse.json({ error: 'This item is currently unavailable' }, { status: 400 });
      }
      if (error.message === 'ITEM_EXPIRED') {
        return NextResponse.json({ error: 'This item has expired and is no longer available' }, { status: 400 });
      }
      if (error.message === 'OUT_OF_STOCK') {
        return NextResponse.json({ error: 'This item is out of stock' }, { status: 400 });
      }
      if (error.message.startsWith('NO_ECONOMY_ACCOUNT:')) {
        const currencyName = error.message.split(':')[1] || 'Ozy';
        return NextResponse.json({ error: `You don't have an economy account. Earn some ${currencyName} first!` }, { status: 400 });
      }
      if (error.message.startsWith('MIN_BALANCE:')) {
        const [, requiredBalance, currencyName] = error.message.split(':');
        return NextResponse.json({
          error: `You need a minimum balance of ${Number(requiredBalance).toLocaleString()} ${currencyName} to purchase this item.`
        }, { status: 400 });
      }
      if (error.message.startsWith('MISSING_REQUIRED_ROLE:')) {
        const [, roleId] = error.message.split(':');
        return NextResponse.json({
          error: `You need role <@&${roleId}> to buy this item.`
        }, { status: 403 });
      }
      if (error.message.startsWith('INSUFFICIENT_BALANCE:')) {
        const [, required, current, currencyName] = error.message.split(':');
        return NextResponse.json({
          error: `Insufficient balance. You need ${Number(required).toLocaleString()} ${currencyName} but only have ${Number(current).toLocaleString()}.`
        }, { status: 400 });
      }
    }
    console.error('Error purchasing item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
