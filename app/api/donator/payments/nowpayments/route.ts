import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
const API_KEY = process.env.NOWPAYMENTS_API_KEY || 'CBD5QR0-ZFD4RNX-JMHZ6CW-60GRKH3';
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hostUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'https://omeglee.com';
    const body = await request.json();
    const { guild_id, plan_id } = body;
    if (!guild_id || !plan_id) {
      return NextResponse.json({ error: 'Missing guild_id or plan_id' }, { status: 400 });
    }
    const plan = await (prismaBot as any).donatorPlan.findUnique({
      where: { id: plan_id },
    });
    if (!plan || !plan.enabled || plan.paused || !plan.crypto_enabled) {
      return NextResponse.json({ error: 'Plan not available for crypto payment. Please select a valid plan.' }, { status: 400 });
    }
    const rawPriceUsd = plan.price_crypto != null && plan.price_crypto > 0 ? plan.price_crypto : plan.price;
    const priceUsd = (rawPriceUsd / 100).toFixed(2);
    const orderId = `OM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const dbPayment = await (prismaBot as any).nowPaymentsPayment.create({
      data: {
        order_id: orderId,
        guild_id,
        user_id: session.user.id,
        plan_id: plan.id,
        price_amount: rawPriceUsd,
        price_currency: 'usd',
        status: 'waiting',
      }
    });
    const payload = {
      price_amount: parseFloat(priceUsd),
      price_currency: "usd",
      order_id: orderId,
      order_description: `${plan.title} - 30 days`,
      ipn_callback_url: `${hostUrl}/api/donator/webhook/nowpayments`,
      success_url: `${hostUrl}/donator?payment_success=true&guild=${guild_id}`,
      cancel_url: `${hostUrl}/donator?payment_cancelled=true&guild=${guild_id}`
    };
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.invoice_url) {
      console.error('NowPayments API Error', data);
      return NextResponse.json({ error: 'Failed to create crypto invoice. Please try Razorpay or try again later.' }, { status: 500 });
    }
    await (prismaBot as any).nowPaymentsPayment.update({
      where: { id: dbPayment.id },
      data: {
        invoice_id: data.id?.toString(),
        payment_url: data.invoice_url
      }
    });
    return NextResponse.json({ data: { invoice_url: data.invoice_url } });
  } catch (err: any) {
    console.error('Crypto order creation error:', err);
    return NextResponse.json({ error: 'Internal server error while initiating crypto payment' }, { status: 500 });
  }
}