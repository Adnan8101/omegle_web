import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { sendDM } from '@/lib/discord';
import crypto from 'crypto';

const GUILD_ID = "910043773130661918";

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET - Get public shop items and user balance (if logged in)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Get all active shop items
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

    // Filter out items with no stock
    const availableItems = items.filter((item: any) => item.stock === null || item.stock > 0);

    // Get economy config
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    let userBalance = 0;
    let userPurchases: any[] = [];

    // If user is logged in, get their balance and purchases
    if (userId) {
      const economyUser = await prismaBot.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } }
      });
      userBalance = economyUser?.total_points || 0;

      // Get user's pending purchases
      userPurchases = await prismaBot.shopPurchase.findMany({
        where: {
          guild_id: GUILD_ID,
          user_id: userId,
          status: 'pending'
        },
        orderBy: { created_at: 'desc' },
        take: 10
      });
    }

    return NextResponse.json({
      items: availableItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        thumbnail: item.thumbnail,
        stock: item.stock,
        income_amount: item.income_amount,
        time_hours: item.time_hours,
        role_required_id: item.role_required_id,
        required_balance: item.required_balance,
        expires_at: item.expires_at?.toISOString() || null
      })),
      config: {
        currencyEmoji: config?.currency_emoji || '🪙',
        currencyName: config?.currency_name || 'points'
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

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Get the item
    const item = await prismaBot.shopItem.findFirst({
      where: { id: itemId, guild_id: GUILD_ID }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if item is expired
    if (item.expires_at && new Date() > item.expires_at) {
      return NextResponse.json({ error: 'This item has expired and is no longer available' }, { status: 400 });
    }

    // Check stock
    if (item.stock !== null && item.stock <= 0) {
      return NextResponse.json({ error: 'This item is out of stock' }, { status: 400 });
    }

    // Get user's economy data
    const economyUser = await prismaBot.economyUser.findUnique({
      where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } }
    });

    if (!economyUser) {
      return NextResponse.json({ error: 'You don\'t have an economy account. Earn some points first!' }, { status: 400 });
    }

    // Check balance
    if (economyUser.total_points < item.price) {
      return NextResponse.json({ 
        error: `Insufficient balance. You need ${item.price.toLocaleString()} points but only have ${economyUser.total_points.toLocaleString()}.` 
      }, { status: 400 });
    }

    // Check minimum balance requirement
    if (item.required_balance && economyUser.total_points < item.required_balance) {
      return NextResponse.json({ 
        error: `You need a minimum balance of ${item.required_balance.toLocaleString()} points to purchase this item.` 
      }, { status: 400 });
    }

    // Generate unique redeem code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prismaBot.shopPurchase.findUnique({ where: { redeem_code: code } });
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    // Get economy config for leaderboard sync setting
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    const leaderboardSync = config?.leaderboard_sync ?? true;

    // Deduct points from user
    await prismaBot.economyUser.update({
      where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
      data: {
        total_points: { decrement: item.price },
        leaderboard_points: leaderboardSync ? { decrement: item.price } : undefined
      }
    });

    // Decrement stock if applicable
    if (item.stock !== null && item.stock > 0) {
      await prismaBot.shopItem.update({
        where: { id: item.id },
        data: { stock: { decrement: 1 } }
      });
    }

    // Create purchase record
    const purchase = await prismaBot.shopPurchase.create({
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
    await prismaBot.economyPointLog.create({
      data: {
        guild_id: GUILD_ID,
        user_id: userId,
        amount: -item.price,
        reason: `Purchased ${item.name} (Website)`,
        source: 'shop'
      }
    });

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
            { name: '🎟️ Your Redeem Code', value: `\`\`\`${code}\`\`\``, inline: false },
            { name: '📝 How to Redeem', value: `Go to **Omeglee server** and use:\n\`/redeem code:${code}\``, inline: false }
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
        redeemCode: code,
        replyMessage: item.reply_message,
        createdAt: purchase.created_at.toISOString()
      },
      newBalance: economyUser.total_points - item.price,
      dmSent
    });

  } catch (error) {
    console.error('Error purchasing item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
