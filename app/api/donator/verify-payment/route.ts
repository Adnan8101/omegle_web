import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { addGuildMemberRole, getGuildRoleName, sendDM } from '@/lib/discord';

const isProduction = process.env.NODE_ENV === 'production';

const RAZORPAY_KEY_ID = isProduction
  ? (process.env.RAZORPAY_KEY_ID || '')
  : (process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID || '');

const RAZORPAY_KEY_SECRET = isProduction
  ? (process.env.RAZORPAY_KEY_SECRET || '')
  : (process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '');

const DEFAULT_SUBSCRIPTION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_order_id) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay keys are not configured' }, { status: 503 });
    }

    
    const payment = await (prismaBot as any).razorpayPayment.findUnique({
      where: { razorpay_order_id },
      include: { plan: true }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (razorpay_signature) {
      const expected = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expected !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    
    try {
      const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const razorpayResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!razorpayResponse.ok) {
        console.error('Failed to fetch payment from Razorpay');
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
      }

      const razorpayPayment = await razorpayResponse.json();

      
      if (razorpayPayment.order_id !== razorpay_order_id) {
        return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 });
      }

      
      if (razorpayPayment.amount !== Number(payment.amount)) {
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
      }

      if (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized') {
        
        await (prismaBot as any).razorpayPayment.update({
          where: { razorpay_order_id },
          data: {
            status: razorpayPayment.status,
            razorpay_id: razorpay_payment_id,
            method: razorpayPayment.method,
            updated_at: new Date()
          }
        });

        
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + DEFAULT_SUBSCRIPTION_DAYS);

        let subscription: any;
        const existingSub = await (prismaBot as any).donatorSubscription.findFirst({
          where: {
            guild_id: payment.guild_id,
            user_id: payment.user_id,
            plan_id: payment.plan_id,
          }
        });

        if (existingSub) {
          
          const baseDate = existingSub.status === 'active' && existingSub.expiry_date
            ? new Date(existingSub.expiry_date)
            : now;
          const newExpiry = new Date(baseDate);
          newExpiry.setDate(newExpiry.getDate() + DEFAULT_SUBSCRIPTION_DAYS);

          subscription = await (prismaBot as any).donatorSubscription.update({
            where: { id: existingSub.id },
            data: {
              status: 'active',
              expiry_date: newExpiry,
              payment_id: razorpayPayment.id,
              cancelled_at: null,
              cancelled_by: null,
              updated_at: new Date()
            },
            include: { plan: true }
          });
        } else {
          subscription = await (prismaBot as any).donatorSubscription.create({
            data: {
              guild_id: payment.guild_id,
              user_id: payment.user_id,
              plan_id: payment.plan_id,
              status: 'active',
              start_date: now,
              expiry_date: expiryDate,
              payment_id: razorpayPayment.id,
            },
            include: { plan: true }
          });
        }

        
        const roleId = payment.plan?.linked_role_id;
        if (payment.user_id && roleId && payment.guild_id) {
          await addGuildMemberRole(payment.user_id, roleId, payment.guild_id);
        }

        
        const planTitle = payment.plan?.title || 'Donator';
        const roleName = payment.plan?.linked_role_id
          ? await getGuildRoleName(payment.guild_id, payment.plan.linked_role_id)
          : null;
        const perks = Array.isArray(payment.plan?.perks) ? payment.plan.perks : [];
        const perksText = perks.length > 0
          ? perks.map((perk: string, idx: number) => `${idx + 1}. ${String(perk).replace(/<[^>]*>/g, '').trim()}`).join('\n').slice(0, 1000)
          : 'No perk data available';

        await sendDM(payment.user_id, {
          embed: {
            title: '✔ Subscription Activated!',
            description: `Thank you for subscribing to **${planTitle}**! Your donator role has been granted.`,
            color: 0x22c55e,
            thumbnail: payment?.webhook_data?.customer_snapshot?.avatar
              ? { url: payment.webhook_data.customer_snapshot.avatar }
              : undefined,
            fields: [
              { name: 'Plan', value: planTitle, inline: true },
              { name: 'Duration', value: `${DEFAULT_SUBSCRIPTION_DAYS} days`, inline: true },
              {
                name: 'Expires',
                value: subscription.expiry_date
                  ? new Date(subscription.expiry_date).toLocaleDateString()
                  : 'Lifetime',
                inline: true
              },
              {
                name: 'Subscription ID',
                value: String(subscription.id),
                inline: true,
              },
              {
                name: 'Payment',
                value: `${razorpayPayment.status} via ${razorpayPayment.method || 'unknown'}`,
                inline: true,
              },
              {
                name: 'Amount',
                value: `${payment.currency} ${(Number(payment.amount) / 100).toFixed(2)} (USD $${(Number(payment.amount_usd) / 100).toFixed(2)})`,
                inline: true,
              },
              {
                name: 'Role Given',
                value: roleName
                  ? `${roleName} (${payment.plan?.linked_role_id || 'N/A'})`
                  : (payment.plan?.linked_role_id || 'N/A'),
                inline: false,
              },
              {
                name: 'Description',
                value: payment.plan?.description || 'No description',
                inline: false,
              },
              {
                name: 'Perks',
                value: perksText || 'No perks listed',
                inline: false,
              },
            ],
            footer: { text: 'Omeglee Donator System — Thank you for your support!' },
            timestamp: new Date().toISOString(),
          }
        });

        return NextResponse.json({
          success: true,
          status: razorpayPayment.status,
          message: 'Payment verified and subscription activated',
          subscription: {
            id: subscription.id,
            status: subscription.status,
            expiry_date: subscription.expiry_date,
          }
        });
      } else if (razorpayPayment.status === 'failed') {
        await (prismaBot as any).razorpayPayment.update({
          where: { razorpay_order_id },
          data: { status: 'failed', updated_at: new Date() }
        });
        return NextResponse.json({ error: 'Payment failed', status: razorpayPayment.status }, { status: 400 });
      } else {
        return NextResponse.json({ error: 'Payment status is ' + razorpayPayment.status }, { status: 400 });
      }
    } catch (razorpayError) {
      console.error('Razorpay verification error:', razorpayError);
      return NextResponse.json({ error: 'Razorpay verification error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
