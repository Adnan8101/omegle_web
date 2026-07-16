import { authOptions } from '@/lib/auth';
import { getDiscordUser,getGuildRoleName,sendDM,getDisplayName } from '@/lib/discord';
import { prismaBot } from '@/lib/prismaBot';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
const GUILD_ID = "1507458872225566811";
export const dynamic = 'force-dynamic';
export const revalidate = 0;
function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
function calculatePurchaseExpiry(baseDate: Date): Date {
  const expiresAt = new Date(baseDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt;
}
function normalizeRoleId(roleRef: string | null | undefined): string | null {
  if (!roleRef) return null;
  const trimmed = roleRef.trim();
  if (/^\d{17,20}$/.test(trimmed)) return trimmed;
  const mentionMatch = trimmed.match(/^<@&?(\d{17,20})>$/);
  if (mentionMatch) return mentionMatch[1];
  return null;
}
function parseRoleIds(roleRef: string | null | undefined): string[] {
  if (!roleRef) return [];
  const unique = new Set<string>();
  const parts = roleRef.split(/[\s,|/]+/).filter(Boolean);
  for (const part of parts) {
    const normalized = normalizeRoleId(part);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    if (config?.shop_enabled === false) {
      return NextResponse.json({
        shopDisabled: true,
        items: [],
        config: {
          currencyEmoji: config?.currency_emoji || 'OZY',
          currencyName: config?.currency_name || 'Ozy'
        },
        user: null
      });
    }
    const now = new Date();
    const [items, purchaseCounts] = await Promise.all([
      prismaBot.shopItem.findMany({
        where: {
          guild_id: GUILD_ID,
          enabled: true,
          OR: [
            { expires_at: null },
            { expires_at: { gt: now } }
          ]
        },
        orderBy: { sort_order: 'asc' }
      }),
      prismaBot.shopPurchase.groupBy({
        by: ['item_id'],
        where: { guild_id: GUILD_ID },
        _count: { id: true }
      })
    ]);
    const purchaseMap = new Map<string, number>();
    for (const p of purchaseCounts) {
      purchaseMap.set(p.item_id, p._count.id);
    }
    let userBalance = 0;
    let userPurchases: any[] = [];
    let userRoleIds: string[] = [];
    const roleNameCache = new Map<string, string | null>();
    const resolveRoleName = async (roleRef: string | null): Promise<string | null> => {
      const roleId = normalizeRoleId(roleRef);
      if (!roleId) return null;
      if (roleNameCache.has(roleId)) {
        return roleNameCache.get(roleId) || null;
      }
      const roleName = await getGuildRoleName(GUILD_ID, roleId);
      roleNameCache.set(roleId, roleName);
      return roleName;
    };
    const resolveRoleNames = async (roleRef: string | null): Promise<string[]> => {
      const roleIds = parseRoleIds(roleRef);
      if (roleIds.length === 0) return [];
      const names = await Promise.all(roleIds.map(async (roleId) => {
        const roleName = await resolveRoleName(roleId);
        return roleName || `@${roleId}`;
      }));
      return names;
    };
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
    const budget = await prismaBot.shopBudget.findUnique({
      where: { guild_id: GUILD_ID }
    }) || { available: 0, total_added: 0, total_spent: 0 };
    const mappedItems = await Promise.all(items.map(async (item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        price_inr: item.price_inr,
        description: item.description,
        thumbnail: item.thumbnail,
        stock: item.stock,
        income_amount: item.income_amount,
        time_hours: item.time_hours,
        sort_order: item.sort_order ?? 0,
        purchase_count: purchaseMap.get(item.id) || 0,
        role_required_id: normalizeRoleId(item.role_required_id),
        role_required_ids: parseRoleIds(item.role_required_id),
        role_required_name: await resolveRoleName(item.role_required_id),
        role_required_names: await resolveRoleNames(item.role_required_id),
        has_required_role: userId
          ? (() => {
              const requiredRoleIds = parseRoleIds(item.role_required_id);
              return requiredRoleIds.length === 0 || requiredRoleIds.some((requiredRoleId) => userRoleIds.includes(requiredRoleId));
            })()
          : null,
        required_balance: item.required_balance,
        expires_at: item.expires_at?.toISOString() || null,
        out_of_stock: item.stock !== null && item.stock !== -1 && item.stock <= 0,
        enabled: item.enabled
      })));
    return NextResponse.json({
      items: mappedItems,
      config: {
        currencyEmoji: config?.currency_emoji || 'OZY',
        currencyName: config?.currency_name || 'Ozy'
      },
      budget: {
        available: budget.available,
        total_added: budget.total_added,
        total_spent: budget.total_spent
      },
      user: userId ? {
        id: userId,
        balance: userBalance,
        pendingPurchases: userPurchases.map((p: any) => ({
          id: p.id,
          itemName: p.item_name,
          pricePaid: p.price_paid,
          redeemCode: p.redeem_code,
          createdAt: p.created_at.toISOString(),
          expiresAt: p.expires_at?.toISOString() || null
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
export async function POST(request: NextRequest) {
  let config: any = null;
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
    config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    if (config?.shop_enabled === false) {
      return NextResponse.json({ error: 'The shop is currently closed' }, { status: 400 });
    }
    const result = await prismaBot.$transaction(async (tx) => {
      const item = await tx.shopItem.findFirst({
        where: { id: itemId, guild_id: GUILD_ID }
      });
      if (!item) {
        throw new Error('ITEM_NOT_FOUND');
      }
      if (!item.enabled) {
        throw new Error('ITEM_DISABLED');
      }
      if (item.expires_at && new Date() > item.expires_at) {
        throw new Error('ITEM_EXPIRED');
      }
      const requiredRoleIds = parseRoleIds(item.role_required_id);
      if (requiredRoleIds.length > 0 && !requiredRoleIds.some((requiredRoleId) => userRoleIds.includes(requiredRoleId))) {
        throw new Error(`MISSING_REQUIRED_ROLE:${requiredRoleIds.join(',')}`);
      }
      if (item.stock !== null && item.stock !== -1 && item.stock <= 0) {
        throw new Error('OUT_OF_STOCK');
      }
      let budget = await tx.shopBudget.findUnique({
        where: { guild_id: GUILD_ID }
      });
      if (!budget) {
        budget = await tx.shopBudget.create({
          data: { guild_id: GUILD_ID, available: 0, total_added: 0, total_spent: 0 }
        });
      }
      if (budget.available < item.price) {
        throw new Error(`INSUFFICIENT_BUDGET:${item.price}:${budget.available}`);
      }
      const economyUser = await tx.economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } }
      });
      const currencyName = config?.currency_name || 'Ozy';
      if (!economyUser) {
        throw new Error(`NO_ECONOMY_ACCOUNT:${currencyName}`);
      }
      if (economyUser.total_points < item.price) {
        throw new Error(`INSUFFICIENT_BALANCE:${item.price}:${economyUser.total_points}:${currencyName}`);
      }
      if (item.required_balance && economyUser.total_points < item.required_balance) {
        throw new Error(`MIN_BALANCE:${item.required_balance}:${currencyName}`);
      }
      let code = generateCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await tx.shopPurchase.findUnique({ where: { redeem_code: code } });
        if (!existing) break;
        code = generateCode();
        attempts++;
      }
      if (item.stock !== null && item.stock !== -1) {
        const stockUpdate = await tx.shopItem.updateMany({
          where: { id: item.id, guild_id: GUILD_ID, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } }
        });
        if (stockUpdate.count === 0) {
          throw new Error('OUT_OF_STOCK');
        }
      }
      const oldAvailable = budget.available;
      const newAvailable = budget.available - item.price;
      await tx.shopBudget.update({
        where: { guild_id: GUILD_ID },
        data: {
          available: newAvailable,
          total_spent: { increment: item.price }
        }
      });
      const userName = member ? getDisplayName(member) : userId;
      await tx.shopBudgetLog.create({
        data: {
          guild_id: GUILD_ID,
          type: 'PURCHASE',
          inr_cost: item.actual_inr || item.price_inr || 0,
          coin_cost: item.price,
          budget_before: oldAvailable,
          budget_after: newAvailable,
          user_id: userId,
          user_name: userName,
          item_id: item.id,
          item_name: item.name,
          status: 'SUCCESS'
        }
      });
      const leaderboardSync = config?.leaderboard_sync ?? true;
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
      const purchaseExpiresAt = calculatePurchaseExpiry(new Date());
      const purchase = await tx.shopPurchase.create({
        data: {
          guild_id: GUILD_ID,
          user_id: userId,
          item_id: item.id,
          item_name: item.name,
          price_paid: item.price,
          redeem_code: code,
          expires_at: purchaseExpiresAt
        }
      });
      await tx.economyPointLog.create({
        data: {
          guild_id: GUILD_ID,
          user_id: userId,
          amount: -item.price,
          reason: `Purchased ${item.name} (Website)`,
          source: 'shop'
        }
      });
      return { item, purchase, economyUser, purchaseExpiresAt };
    });
    const { item, purchase, economyUser, purchaseExpiresAt } = result;
    const currencyEmoji = config?.currency_emoji || 'OZY';
    const formatNumber = (n: number) => n.toLocaleString();
    let dmSent = false;
    try {
      const dmResult = await sendDM(userId, {
        embed: {
          title: 'Purchase Successful',
          description: `Thank you for your purchase from **Omeglee Community Shop**!`,
          color: 0x57F287,
          thumbnail: item.thumbnail ? { url: item.thumbnail } : undefined,
          fields: [
            { name: 'Item', value: item.name, inline: true },
            { name: 'Price Paid', value: `${currencyEmoji}${formatNumber(item.price)}`, inline: true },
            { name: 'Redeem Code', value: `\`\`\`${purchase.redeem_code}\`\`\``, inline: false },
            { name: 'Expires', value: `<t:${Math.floor(purchaseExpiresAt.getTime() / 1000)}:F>`, inline: false },
            { name: 'How to Redeem', value: `DM **Omeglee Bot** and send your code:\n\`/redeem code:${purchase.redeem_code}\``, inline: false }
          ],
          footer: { text: 'Keep this code safe | Omeglee Shop' },
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
        createdAt: purchase.created_at.toISOString(),
        expiresAt: purchaseExpiresAt.toISOString()
      },
      newBalance: economyUser.total_points - item.price,
      dmSent
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('INSUFFICIENT_BUDGET:')) {
        const [, required, current] = error.message.split(':');
        const currencyName = config?.currency_name || 'Ozy';
        return NextResponse.json({
          error: `Insufficient reward budget to complete this purchase. Item costs ${Number(required).toLocaleString()} ${currencyName} but only ${Number(current).toLocaleString()} ${currencyName} remains.`
        }, { status: 400 });
      }
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
        const [, roleRef] = error.message.split(':');
        const requiredRoleIds = parseRoleIds(roleRef);
        const roleNames = await Promise.all(requiredRoleIds.map(async (roleId) => {
          const roleName = await getGuildRoleName(GUILD_ID, roleId);
          return roleName || roleId;
        }));
        const roleMentions = requiredRoleIds.map((roleId) => `<@&${roleId}>`).join(', ');
        return NextResponse.json({
          error: requiredRoleIds.length > 0
            ? `You need any one of the following roles: ${roleMentions}`
            : 'You need the required role to buy this item.',
          roleNames
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