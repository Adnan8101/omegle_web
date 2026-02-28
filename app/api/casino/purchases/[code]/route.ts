import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// Helper to check if user has casino access
async function hasCasinoAccess(session: any): Promise<boolean> {
  if (!session?.user?.permissions) return false;
  
  const perms = session.user.permissions;
  if (perms.hasFullAccess) return true;
  
  try {
    const casinoRoles = await prismaBot.casinoAdminRole.findMany({
      where: { guild_id: GUILD_ID }
    });
    
    const casinoRoleIds = casinoRoles.map((r: any) => r.role_id);
    const userRoles = perms.roles || [];
    
    return userRoles.some((roleId: string) => casinoRoleIds.includes(roleId));
  } catch (error) {
    console.error('Error checking casino roles:', error);
    return false;
  }
}

// GET - Get purchase by code
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
    
    const hasAccess = await hasCasinoAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    
    const purchase = await prismaBot.shopPurchase.findUnique({
      where: { redeem_code: code.toUpperCase() }
    });
    
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    
    // Get the item details
    const item = await prismaBot.shopItem.findUnique({
      where: { id: purchase.item_id }
    });
    
    // Get economy config for currency
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    
    return NextResponse.json({
      purchase: {
        ...purchase,
        created_at: purchase.created_at.toISOString(),
        redeemed_at: purchase.redeemed_at?.toISOString() || null
      },
      item,
      currencyEmoji: config?.currency_emoji || '🪙'
    });
    
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Redeem a purchase code
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
    
    const hasAccess = await hasCasinoAccess(session);
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
        redeemed_at: updated.redeemed_at?.toISOString() || null
      }
    });
    
  } catch (error) {
    console.error('Error redeeming purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
