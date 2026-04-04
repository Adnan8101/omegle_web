import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getDiscordUsers } from '@/lib/discord';

const isProduction = process.env.NODE_ENV === 'production';

const RAZORPAY_KEY_ID = isProduction
  ? (process.env.RAZORPAY_KEY_ID || '')
  : (process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID || '');

const RAZORPAY_KEY_SECRET = isProduction
  ? (process.env.RAZORPAY_KEY_SECRET || '')
  : (process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '');

const USD_TO_INR_FALLBACK = 83;

let rateCache: { value: number; fetchedAt: number } | null = null;
const RATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getUsdToInrRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.fetchedAt < RATE_CACHE_TTL_MS) {
    return rateCache.value;
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return USD_TO_INR_FALLBACK;
    }

    const data = await response.json();
    const rate = Number(data?.rates?.INR);
    if (!Number.isFinite(rate) || rate <= 0) {
      return USD_TO_INR_FALLBACK;
    }

    rateCache = { value: rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return USD_TO_INR_FALLBACK;
  }
}

function hasAdminAccess(session: any): boolean {
  if (process.env.ADMIN_DEV_BYPASS === 'true') return true;
  const perms = session?.user?.permissions;
  return Boolean(perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasAnyAccess);
}

function buildProfile(member: any, fallbackUserId: string, fallbackName?: string | null, fallbackAvatar?: string | null) {
  const user = member?.user;
  const username = user?.username || null;
  const displayName = member?.nick || user?.global_name || username || fallbackName || null;
  const avatar = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${String(user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
    : (fallbackAvatar || null);

  return {
    id: user?.id || fallbackUserId,
    username,
    displayName,
    avatar,
  };
}

// GET payments - admin can see all, users can see their own
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const guildId = searchParams.get('guild_id');
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    const isAdmin = hasAdminAccess(session);

    // Non-admins can only see their own payments
    if (!isAdmin && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where: any = {};
    if (guildId) where.guild_id = guildId;
    if (userId) where.user_id = userId;
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      (prismaBot as any).razorpayPayment.findMany({
        where,
        include: {
          plan: true
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' }
      }),
      (prismaBot as any).razorpayPayment.count({ where })
    ]);

    const userIds: string[] = Array.from(
      new Set<string>(
        payments
          .map((p: any) => p.user_id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const discordUsers = await getDiscordUsers(userIds);

    const enrichedPayments = payments.map((payment: any) => {
      const snapshot = payment?.webhook_data?.customer_snapshot || payment?.webhook_data?.customerSnapshot || {};
      const profile = buildProfile(
        discordUsers.get(payment.user_id),
        payment.user_id,
        snapshot?.name || snapshot?.username || null,
        snapshot?.avatar || null
      );
      return { ...payment, user_profile: profile };
    });

    return NextResponse.json({
      data: enrichedPayments,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST to create Razorpay order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json({
        error: isProduction
          ? 'Razorpay keys are not configured.'
          : 'Razorpay test keys are not configured. Set RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET in .env.local',
      }, { status: 503 });
    }

    if (!isProduction && RAZORPAY_KEY_ID.startsWith('rzp_live_')) {
      return NextResponse.json({
        error: 'Live Razorpay keys are blocked in development. Use test keys (rzp_test_*) in .env.local',
      }, { status: 503 });
    }

    const body = await request.json();
    const { guild_id, plan_id } = body;

    if (!guild_id || !plan_id) {
      return NextResponse.json({ error: 'Guild ID and Plan ID required' }, { status: 400 });
    }

    // Fetch the plan to get price
    const plan = await (prismaBot as any).donatorPlan.findUnique({
      where: { id: plan_id }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (!plan.enabled || plan.paused) {
      return NextResponse.json({ error: 'Plan is not available' }, { status: 400 });
    }

    // plan.price is stored in cents (e.g. 100 = $1.00).
    // To convert USD cents to INR paise: paise = usdCents * usdInrRate.
    const usdToInrRate = await getUsdToInrRate();
    const amountInINR = Math.max(100, Math.round(plan.price * usdToInrRate));

    // Create Razorpay order
    try {
      const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      // Razorpay receipt max length is 40 characters.
      const receipt = `ord_${Date.now().toString(36)}_${guild_id.slice(-8)}_${session.user.id.slice(-8)}`.slice(0, 40);
      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInINR,
          currency: 'INR',
          receipt,
          notes: {
            guild_id,
            user_id: session.user.id,
            plan_id
          }
        })
      });

      if (!razorpayResponse.ok) {
        const errorData = await razorpayResponse.json();
        console.error('Razorpay error:', errorData);
        return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
      }

      const razorpayOrder = await razorpayResponse.json();

      // Store payment record in database
      const payment = await (prismaBot as any).razorpayPayment.create({
        data: {
          razorpay_order_id: razorpayOrder.id,
          guild_id,
          user_id: session.user.id,
          plan_id,
          amount_usd: plan.price,
          amount: amountInINR,
          currency: 'INR',
          status: 'created',
          method: null,
          webhook_data: {
            customer_snapshot: {
              id: session.user.id,
              name: session.user.name || null,
              username: session.user.name || null,
              avatar: session.user.image || null,
              email: session.user.email || null,
            }
          }
        },
        include: { plan: true }
      });

      return NextResponse.json({
        data: {
          orderId: razorpayOrder.id,
          amount: amountInINR,
          currency: 'INR',
          key: RAZORPAY_KEY_ID,
          paymentId: payment.id,
          planName: plan.title,
          planPrice: `$${(plan.price / 100).toFixed(2)}`,
          amountInRupees: (amountInINR / 100).toFixed(2),
          conversionRate: usdToInrRate,
        }
      });
    } catch (razorpayError) {
      console.error('Razorpay API error:', razorpayError);
      return NextResponse.json({ error: 'Payment service error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}

// PATCH to update payment status (called by webhook)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id, status, payment_method, webhook_data } = body;

    if (!razorpay_order_id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const payment = await (prismaBot as any).razorpayPayment.update({
      where: { razorpay_order_id },
      data: {
        status: status || undefined,
        method: payment_method || undefined,
        webhook_data: webhook_data || undefined,
        updated_at: new Date()
      },
      include: { plan: true }
    });

    return NextResponse.json({ data: payment });
  } catch (error: any) {
    console.error('Error updating payment:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
