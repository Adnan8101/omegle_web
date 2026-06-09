import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getGuildRoleName, removeGuildMemberRole, sendDM } from '@/lib/discord';
import { getDiscordUsers } from '@/lib/discord';
function hasAdminAccess(session: any): boolean {
  if (process.env.ADMIN_DEV_BYPASS === 'true') return true;
  const perms = session?.user?.permissions;
  return Boolean(perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasAnyAccess);
}
function buildProfile(member: any, fallbackUserId: string, snapshot?: any) {
  const user = member?.user;
  const avatar = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${String(user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
    : (snapshot?.avatar || null);
  return {
    id: user?.id || fallbackUserId,
    username: user?.username || snapshot?.username || null,
    displayName: member?.nick || user?.global_name || user?.username || snapshot?.name || snapshot?.username || null,
    avatar,
  };
}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const searchParams = request.nextUrl.searchParams;
    const guildId = searchParams.get('guild_id');
    const subscriptionId = searchParams.get('subscription_id')?.trim();
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const planSearch = searchParams.get('plan')?.trim();
    const userSearch = searchParams.get('user_search')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const isAdmin = hasAdminAccess(session);
    const effectiveUserId = !isAdmin ? (userId || session.user.id) : userId;
    if (!isAdmin && effectiveUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const where: any = {};
    if (subscriptionId) where.id = subscriptionId;
    if (guildId) where.guild_id = guildId;
    if (effectiveUserId) where.user_id = effectiveUserId;
    if (status) where.status = status;
    if (userSearch) {
      where.user_id = {
        contains: userSearch,
        mode: 'insensitive'
      };
    }
    if (planSearch) {
      where.plan = {
        title: {
          contains: planSearch,
          mode: 'insensitive'
        }
      };
    }
    const [subscriptions, total] = await Promise.all([
      (prismaBot as any).donatorSubscription.findMany({
        where,
        include: {
          plan: true
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' }
      }),
      (prismaBot as any).donatorSubscription.count({ where })
    ]);
    const userIds: string[] = Array.from(
      new Set<string>(
        subscriptions
          .map((s: any) => s.user_id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const paymentIds: string[] = Array.from(
      new Set<string>(
        subscriptions
          .map((s: any) => s.payment_id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const discordUsers = await getDiscordUsers(userIds);
    const payments = paymentIds.length > 0
      ? await (prismaBot as any).razorpayPayment.findMany({
          where: {
            razorpay_id: {
              in: paymentIds,
            },
          },
          select: {
            razorpay_id: true,
            razorpay_order_id: true,
            amount: true,
            amount_usd: true,
            currency: true,
            status: true,
            method: true,
            created_at: true,
            webhook_data: true,
          },
        })
      : [];
    const paymentById = new Map<string, any>(
      payments
        .filter((p: any) => typeof p.razorpay_id === 'string' && p.razorpay_id.length > 0)
        .map((p: any) => [p.razorpay_id as string, p])
    );
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (subscription: any) => {
        const payment = subscription.payment_id ? paymentById.get(subscription.payment_id) : null;
        const snapshot = payment?.webhook_data?.customer_snapshot || payment?.webhook_data?.customerSnapshot || {};
        const roleId = subscription?.plan?.linked_role_id || null;
        const roleName = roleId ? await getGuildRoleName(subscription.guild_id, roleId) : null;
        return {
          ...subscription,
          user_profile: buildProfile(discordUsers.get(subscription.user_id), subscription.user_id, snapshot),
          payment_details: payment
            ? {
                payment_id: payment.razorpay_id,
                order_id: payment.razorpay_order_id,
                amount: payment.amount,
                amount_usd: payment.amount_usd,
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                created_at: payment.created_at,
              }
            : null,
          role_details: roleId
            ? {
                id: roleId,
                name: roleName,
              }
            : null,
        };
      })
    );
    return NextResponse.json({
      data: enrichedSubscriptions,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { subscription_id, reason } = body;
    if (!subscription_id) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
    }
    const isAdmin = hasAdminAccess(session);
    if (!isAdmin) {
      const owned = await (prismaBot as any).donatorSubscription.findFirst({
        where: {
          id: subscription_id,
          user_id: session.user.id,
        },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    const subscription = await (prismaBot as any).donatorSubscription.update({
      where: { id: subscription_id },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: session.user.id
      },
      include: { plan: true }
    });
    const roleId = subscription?.plan?.linked_role_id;
    const userId = subscription?.user_id;
    const guildId = subscription?.guild_id;
    const planTitle = subscription?.plan?.title || 'Unknown Plan';
    if (userId && roleId && guildId) {
      await removeGuildMemberRole(userId, roleId, guildId);
    }
    if (userId) {
      await sendDM(userId, {
        embed: {
          title: '✖ Subscription Revoked',
          description: `Your **${planTitle}** donator subscription has been revoked by an admin.`,
          color: 0xef4444,
          fields: [
            { name: 'Plan', value: planTitle, inline: true },
            { name: 'Subscription ID', value: String(subscription.id), inline: true },
            { name: 'Status', value: 'Cancelled', inline: true },
            {
              name: 'Reason',
              value: reason || 'No reason provided.',
              inline: false,
            },
          ],
          footer: { text: 'Omeglee Donator System' },
          timestamp: new Date().toISOString(),
        }
      });
    }
    return NextResponse.json({ data: subscription });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !hasAdminAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const body = await request.json();
    const { subscription_id, status, expiry_date } = body;
    if (!subscription_id) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
    }
    const subscription = await (prismaBot as any).donatorSubscription.update({
      where: { id: subscription_id },
      data: {
        ...(status && { status }),
        ...(expiry_date && { expiry_date: new Date(expiry_date) })
      },
      include: { plan: true }
    });
    return NextResponse.json({ data: subscription });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}