import { NextRequest, NextResponse } from 'next/server';
import { prismaBot } from '@/lib/prismaBot';
import { getDiscordUser, addGuildRole, sendDirectMessage } from '@/lib/discord';
const API_KEY = process.env.NOWPAYMENTS_API_KEY || 'CBD5QR0-ZFD4RNX-JMHZ6CW-60GRKH3';
const processingLocks = new Set<string>();
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { payment_id, order_id, payment_status } = body;
    if (!payment_id || !order_id) {
      return NextResponse.json({ error: 'Missing payment_id or order_id' }, { status: 400 });
    }
    if (processingLocks.has(payment_id.toString())) {
      return NextResponse.json({ message: 'Already processing' }, { status: 200 });
    }
    processingLocks.add(payment_id.toString());
    try {
      const npCheck = await fetch(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
        headers: { 'x-api-key': API_KEY }
      });
      if (!npCheck.ok) {
        console.error('Failed to verify NowPayment ID:', payment_id);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }
      const npData = await npCheck.json();
      const confirmedStatus = npData.payment_status;
      const isSuccess = ['finished', 'confirmed', 'sending'].includes(confirmedStatus);
      let dbPayment = await (prismaBot as any).nowPaymentsPayment.findUnique({
        where: { order_id },
        include: { plan: true }
      });
      if (!dbPayment) {
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }
      dbPayment = await (prismaBot as any).nowPaymentsPayment.update({
        where: { order_id },
        data: {
          status: confirmedStatus,
          pay_amount: npData.pay_amount,
          pay_currency: npData.pay_currency,
          webhook_data: body,
          payment_id: payment_id.toString(),
        },
        include: { plan: true }
      });
      if (isSuccess && dbPayment.status !== 'finished' && dbPayment.status !== 'confirmed') {
        const { plan, user_id, guild_id } = dbPayment;
        let subscription = await (prismaBot as any).donatorSubscription.findUnique({
          where: { guild_id_user_id_plan_id: { guild_id, user_id, plan_id: plan.id } }
        });
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        if (subscription) {
          const currentExpiry = subscription.expiry_date ? new Date(subscription.expiry_date) : new Date();
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          baseDate.setDate(baseDate.getDate() + 30);
          subscription = await (prismaBot as any).donatorSubscription.update({
             where: { id: subscription.id },
             data: { status: 'active', expiry_date: baseDate, payment_id: payment_id.toString() }
          });
        } else {
          subscription = await (prismaBot as any).donatorSubscription.create({
            data: {
              guild_id,
              user_id,
              plan_id: plan.id,
              status: 'active',
              expiry_date: newExpiryDate,
              payment_id: payment_id.toString()
            }
          });
        }
        if (plan.linked_role_id) {
          const roleGranted = await addGuildRole(guild_id, user_id, plan.linked_role_id);
          if (roleGranted) {
             console.log(`Granted role ${plan.linked_role_id} to user ${user_id} via crypto`);
             const dmContent = `🎉 **Thanks for your crypto donation!**\n\nYour subscription for **${plan.title}** has been confirmed via the blockchain. You have received your exclusive role in the server.\n\nEnjoy your premium perks!`;
             await sendDirectMessage(user_id, dmContent);
          }
        }
      }
      return NextResponse.json({ message: 'IPN processed successfully' }, { status: 200 });
    } finally {
      processingLocks.delete(payment_id.toString());
    }
  } catch (err: any) {
    console.error('NowPayments IPN Webhook Error:', err);
    return NextResponse.json({ error: 'Internal server error while processing webhook' }, { status: 500 });
  }
}