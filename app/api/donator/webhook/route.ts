import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prismaBot } from '@/lib/prismaBot';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';
interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        order_id?: string;
        notes?: {
          guild_id?: string;
          user_id?: string;
          plan_id?: string;
        };
      };
    };
    order?: {
      entity?: {
        id: string;
      };
    };
  };
}
interface RazorpayPaymentEntity {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    order_id?: string;
    notes?: {
      guild_id?: string;
      user_id?: string;
      plan_id?: string;
    };
}
function verifyWebhookSignature(body: string, signature: string): boolean {
  try {
    if (!WEBHOOK_SECRET) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not set, skipping signature verification');
      return true;
    }
    const hash = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    return hash === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
async function assignRoleToUser(guildId: string, userId: string, roleId: string): Promise<boolean> {
  try {
    if (!BOT_TOKEN || !roleId) {
      console.warn('Bot token or role ID missing, skipping role assignment');
      return false;
    }
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to assign role:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error assigning role:', error);
    return false;
  }
}
async function sendPaymentNotificationDM(
  userId: string,
  planTitle: string,
  planDescription: string,
  perks: string[],
  userAvatar: string | null
): Promise<boolean> {
  try {
    if (!BOT_TOKEN) {
      console.warn('Bot token missing, skipping DM notification');
      return false;
    }
    const dmResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: userId
      })
    });
    if (!dmResponse.ok) {
      console.error('Failed to create DM channel');
      return false;
    }
    const channel = await dmResponse.json();
    const embed = {
      title: `✨ Welcome to ${planTitle}!`,
      description: `Thank you for purchasing our **${planTitle}** plan!`,
      color: 0xff6b6b,
      thumbnail: userAvatar
        ? {
            url: userAvatar
          }
        : undefined,
      fields: [
        {
          name: 'Plan Details',
          value: planDescription || 'Premium subscription',
          inline: false
        },
        {
          name: '📋 Included Perks',
          value: perks.length > 0 ? perks.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'Premium features unlocked',
          inline: false
        },
        {
          name: 'Purchase Date',
          value: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          inline: true
        }
      ],
      footer: {
        text: 'Thank you for your support! 🎉'
      },
      timestamp: new Date().toISOString()
    };
    const messageResponse = await fetch(
      `https://discord.com/api/v10/channels/${channel.id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [embed]
        })
      }
    );
    return messageResponse.ok;
  } catch (error) {
    console.error('Error sending DM notification:', error);
    return false;
  }
}
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature') || '';
    const body = await request.text();
    if (!verifyWebhookSignature(body, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const event: RazorpayWebhookEvent = JSON.parse(body);
    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const payment: RazorpayPaymentEntity | undefined = event?.payload?.payment?.entity;
      const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
      if (!payment || !orderId) {
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
      }
      if (!payment.notes?.guild_id || !payment.notes?.user_id || !payment.notes?.plan_id) {
        console.error('Missing required notes in payment:', payment.notes);
        return NextResponse.json({ error: 'Invalid payment notes' }, { status: 400 });
      }
      const updatedPayment = await (prismaBot as any).razorpayPayment.update({
        where: { razorpay_order_id: orderId },
        data: {
          status: event.event === 'payment.captured' ? 'captured' : 'authorized',
          razorpay_id: payment.id,
          method: payment.method || null,
          webhook_data: event,
          updated_at: new Date()
        },
        include: { plan: true }
      });
      let subscription = await (prismaBot as any).donatorSubscription.findFirst({
        where: {
          payment_id: payment.id
        },
        include: { plan: true }
      });
      if (!subscription) {
        subscription = await (prismaBot as any).donatorSubscription.create({
          data: {
            guild_id: payment.notes.guild_id,
            user_id: payment.notes.user_id,
            plan_id: payment.notes.plan_id,
            status: 'active',
            start_date: new Date(),
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            payment_id: payment.id
          },
          include: { plan: true }
        });
      }
      if (subscription.plan.linked_role_id) {
        await assignRoleToUser(
          payment.notes.guild_id,
          payment.notes.user_id,
          subscription.plan.linked_role_id
        );
      }
      try {
        const userResponse = await fetch(
          `https://discord.com/api/v10/users/${payment.notes.user_id}`,
          {
            headers: {
              'Authorization': `Bot ${BOT_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        let userAvatar = null;
        if (userResponse.ok) {
          const user = await userResponse.json();
          if (user.avatar) {
            userAvatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
          }
        }
        await sendPaymentNotificationDM(
          payment.notes.user_id,
          subscription.plan.title,
          subscription.plan.description || '',
          subscription.plan.perks || [],
          userAvatar
        );
      } catch (error) {
        console.error('Error in post-payment notifications:', error);
      }
      return NextResponse.json({ success: true, subscription_id: subscription.id });
    } else if (event.event === 'payment.failed') {
      const payment: RazorpayPaymentEntity | undefined = event?.payload?.payment?.entity;
      const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
      if (!orderId) {
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
      }
      await (prismaBot as any).razorpayPayment.update({
        where: { razorpay_order_id: orderId },
        data: {
          status: 'failed',
          razorpay_id: payment?.id || null,
          webhook_data: event,
          updated_at: new Date()
        }
      });
      return NextResponse.json({ success: true, status: 'payment_failed' });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}