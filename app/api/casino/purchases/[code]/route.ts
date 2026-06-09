import { canAccessCasino } from '@/lib/apiAuth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
const GUILD_ID = "1507458872225566811";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    const purchase = await prismaBot.shopPurchase.findUnique({
      where: { redeem_code: code.toUpperCase() }
    });
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    const item = await prismaBot.shopItem.findUnique({
      where: { id: purchase.item_id }
    });
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    return NextResponse.json({
      purchase: {
        ...purchase,
        created_at: purchase.created_at.toISOString(),
        redeemed_at: purchase.redeemed_at?.toISOString() || null,
        expires_at: purchase.expires_at?.toISOString() || null,
        item_deleted_at: purchase.item_deleted_at?.toISOString() || null
      },
      item,
      currencyEmoji: config?.currency_emoji || '🪙'
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    const body = await request.json();
    const { proof_link } = body;
    const purchase = await prismaBot.shopPurchase.findUnique({
      where: { redeem_code: code.toUpperCase() }
    });
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (purchase.status === 'redeemed') {
      return NextResponse.json({ error: 'This code has already been redeemed' }, { status: 400 });
    }
    if (purchase.status === 'expired') {
      return NextResponse.json({ error: 'This code has already expired' }, { status: 400 });
    }
    if (purchase.expires_at && new Date() > purchase.expires_at) {
      await prismaBot.shopPurchase.update({
        where: { redeem_code: code.toUpperCase() },
        data: { status: 'expired' }
      });
      return NextResponse.json({
        error: `This code expired on ${purchase.expires_at.toISOString()}`
      }, { status: 400 });
    }
    const updated = await prismaBot.shopPurchase.update({
      where: { redeem_code: code.toUpperCase() },
      data: {
        status: 'redeemed',
        redeemed_by: session.user.id,
        redeemed_at: new Date(),
        proof_link: proof_link || null
      }
    });
    return NextResponse.json({
      success: true,
      purchase: {
        ...updated,
        created_at: updated.created_at.toISOString(),
        redeemed_at: updated.redeemed_at?.toISOString() || null,
        expires_at: updated.expires_at?.toISOString() || null,
        item_deleted_at: updated.item_deleted_at?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error redeeming purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}