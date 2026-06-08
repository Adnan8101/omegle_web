import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { addGuildMemberRole, getGuildRoleName, sendDM } from '@/lib/discord';
import crypto from 'crypto';

const DEFAULT_SUBSCRIPTION_DAYS = 30;
const USER_ERROR_PREFIX = 'USER_ERROR:';

function userError(message: string): Error {
  return new Error(`${USER_ERROR_PREFIX}${message}`);
}

function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sendDonatorWebhook(payload: Record<string, unknown>) {
  const webhookUrl = process.env.DONATOR_PAYMENT_WEBHOOK_URL || process.env.PAYMENT_WEBHOOK_URL || '';
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to send donator webhook:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const guildId = String(body?.guild_id || '').trim();
    const planId = String(body?.plan_id || '').trim();

    if (!guildId || !planId) {
      return NextResponse.json({ error: 'guild_id and plan_id are required' }, { status: 400 });
    }

    const now = new Date();
    
    
    const [plan, config, economyUser] = await Promise.all([
      (prismaBot as any).donatorPlan.findFirst({
        where: { id: planId, guild_id: guildId },
      }),
      (prismaBot as any).economyConfig.findUnique({
        where: { guild_id: guildId },
        select: { currency_name: true, currency_emoji: true, leaderboard_sync: true },
      }),
      (prismaBot as any).economyUser.findUnique({
        where: { guild_id_user_id: { guild_id: guildId, user_id: session.user.id } },
        select: { total_points: true },
      }),
    ]);

    if (!plan) throw userError('Plan not found for selected server.');
    if (!plan.enabled || plan.paused) throw userError('This plan is currently unavailable.');
    if (!plan.ozy_enabled) throw userError('Ozy checkout is not enabled for this plan.');

    const ozyPrice = Number(plan.price_ozy || 0);
    if (!Number.isFinite(ozyPrice) || ozyPrice <= 0) {
      throw userError('This plan does not have a valid Ozy price configured yet.');
    }

    if (!economyUser) {
      throw userError(`You do not have an economy account yet. Earn some ${config?.currency_name || 'Ozy'} first.`);
    }

    if (economyUser.total_points < ozyPrice) {
      throw userError(
        `Insufficient balance. Required: ${ozyPrice.toLocaleString()} ${config?.currency_name || 'Ozy'}, available: ${economyUser.total_points.toLocaleString()}.`
      );
    }

    const runCheckoutTransaction = () => (prismaBot as any).$transaction(async (tx: any) => {
      const paymentId = `ozy_tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
      const orderId = `ozy_order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const payment = await tx.razorpayPayment.create({
        data: {
          razorpay_id: paymentId,
          razorpay_order_id: orderId,
          guild_id: guildId,
          user_id: session.user.id,
          plan_id: plan.id,
          amount: ozyPrice,
          currency: 'OZY',
          amount_usd: plan.price,
          status: 'captured',
          method: 'ozy',
          webhook_data: {
            method_type: 'ozy',
            paid_ozy: ozyPrice,
            currency_name: config?.currency_name || 'Ozy',
            currency_emoji: config?.currency_emoji || '🪙',
            customer_snapshot: {
              id: session.user.id,
              name: session.user.name || null,
              username: session.user.name || null,
              avatar: session.user.image || null,
              email: session.user.email || null,
            },
          },
        },
      });

      await tx.economyUser.update({
        where: { guild_id_user_id: { guild_id: guildId, user_id: session.user.id } },
        data: {
          total_points: { decrement: ozyPrice },
          leaderboard_points: config?.leaderboard_sync !== false ? { decrement: ozyPrice } : undefined,
        },
      });

      await tx.economyPointLog.create({
        data: {
          guild_id: guildId,
          user_id: session.user.id,
          amount: -ozyPrice,
          reason: `Purchased donator plan ${plan.title} (Website Ozy Checkout)`,
          source: 'donator',
        },
      });

      const existingSub = await tx.donatorSubscription.findFirst({
        where: {
          guild_id: guildId,
          user_id: session.user.id,
          plan_id: plan.id,
        },
      });

      let subscription;
      if (existingSub) {
        const baseDate = existingSub.status === 'active' && existingSub.expiry_date
          ? new Date(existingSub.expiry_date)
          : now;
        const nextExpiry = new Date(baseDate);
        nextExpiry.setDate(nextExpiry.getDate() + DEFAULT_SUBSCRIPTION_DAYS);

        subscription = await tx.donatorSubscription.update({
          where: { id: existingSub.id },
          data: {
            status: 'active',
            expiry_date: nextExpiry,
            payment_id: paymentId,
            cancelled_at: null,
            cancelled_by: null,
            updated_at: new Date(),
          },
          include: { plan: true },
        });
      } else {
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + DEFAULT_SUBSCRIPTION_DAYS);

        subscription = await tx.donatorSubscription.create({
          data: {
            guild_id: guildId,
            user_id: session.user.id,
            plan_id: plan.id,
            status: 'active',
            start_date: now,
            expiry_date: expiryDate,
            payment_id: paymentId,
          },
          include: { plan: true },
        });
      }

      return {
        subscription,
        payment,
        ozyPrice,
        currencyName: config?.currency_name || 'Ozy',
        currencyEmoji: config?.currency_emoji || '🪙',
        balanceAfter: economyUser.total_points - ozyPrice,
      };
    }, {
      
      
      maxWait: 15_000,
      timeout: 40_000,
      isolationLevel: 'Serializable',
    });

    let result;
    let retryCount = 0;
    const maxRetries = 2;
    while (retryCount < maxRetries) {
      try {
        result = await runCheckoutTransaction();
        break;
      } catch (txError: any) {
        retryCount++;
        
        if (txError?.code === 'P2028' && retryCount < maxRetries) {
          console.warn(`[Ozy TX] P2028 error on attempt ${retryCount}, retrying...`, txError.message);
          await new Promise(r => setTimeout(r, 100 * retryCount)); 
          continue;
        }
        throw txError;
      }
    }

    const roleId = result.subscription?.plan?.linked_role_id;
    if (roleId) {
      await addGuildMemberRole(session.user.id, roleId, guildId);
    }

    const roleName = roleId ? await getGuildRoleName(guildId, roleId) : null;
    const perks = Array.isArray(result.subscription?.plan?.perks) ? result.subscription.plan.perks : [];

    await sendDM(session.user.id, {
      embed: {
        title: '✔ Ozy Purchase Successful!',
        description: `Your **${result.subscription?.plan?.title || 'Donator'}** subscription is now active.`,
        color: 0x22c55e,
        thumbnail: session.user.image ? { url: session.user.image } : undefined,
        fields: [
          { name: 'Plan', value: result.subscription?.plan?.title || 'Donator', inline: true },
          { name: 'Payment Method', value: 'Ozy Balance', inline: true },
          { name: 'Amount', value: `${result.currencyEmoji} ${result.ozyPrice.toLocaleString()} ${result.currencyName}`, inline: true },
          {
            name: 'Role Given',
            value: roleName ? `${roleName} (${roleId})` : (roleId || 'N/A'),
            inline: false,
          },
          {
            name: 'Perks',
            value: perks.length > 0
              ? perks.map((perk: string, idx: number) => `${idx + 1}. ${stripHtml(perk)}`).join('\n').slice(0, 1000)
              : 'No perks listed',
            inline: false,
          },
        ],
        footer: { text: 'Omeglee Donator System — Thank you for your support!' },
        timestamp: new Date().toISOString(),
      },
    });

    await sendDonatorWebhook({
      event: 'donator.ozy_payment.captured',
      guild_id: guildId,
      user_id: session.user.id,
      subscription_id: result.subscription.id,
      payment_id: result.payment.razorpay_id,
      order_id: result.payment.razorpay_order_id,
      plan_id: result.subscription.plan_id,
      plan_title: result.subscription?.plan?.title || null,
      amount_ozy: result.ozyPrice,
      currency_name: result.currencyName,
      method: 'ozy',
      status: 'captured',
      created_at: new Date().toISOString(),
    });

    const hostUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || '';
    const redirectUrl = hostUrl
      ? `${hostUrl}/donator/subscriptions?guild_id=${encodeURIComponent(guildId)}`
      : `/donator/subscriptions?guild_id=${encodeURIComponent(guildId)}`;

    return NextResponse.json({
      success: true,
      data: {
        subscription_id: result.subscription.id,
        payment_id: result.payment.razorpay_id,
        order_id: result.payment.razorpay_order_id,
        balance_after: result.balanceAfter,
        currency_name: result.currencyName,
        currency_emoji: result.currencyEmoji,
        redirect_url: redirectUrl,
      },
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.startsWith(USER_ERROR_PREFIX)) {
      return NextResponse.json({ error: message.slice(USER_ERROR_PREFIX.length) }, { status: 400 });
    }

    console.error('Ozy payment error:', error);
    return NextResponse.json({ error: 'Failed to process Ozy payment' }, { status: 500 });
  }
}
