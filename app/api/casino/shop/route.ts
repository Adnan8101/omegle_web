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
  
  // Check if user has casino role from database
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

// GET - List all shop items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await hasCasinoAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    
    const items = await prismaBot.shopItem.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { created_at: 'desc' }
    });
    
    // Get economy config for currency
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    
    return NextResponse.json({
      items,
      currencyEmoji: config?.currency_emoji || '🪙',
      currencyName: config?.currency_name || 'points'
    });
    
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new shop item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await hasCasinoAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, price, description, thumbnail, stock, time_hours, income_amount, 
            role_required_id, role_given_id, role_removed_id, required_balance, 
            reply_message, expires_in_days } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Check if item with same name exists
    const existing = await prismaBot.shopItem.findUnique({
      where: { guild_id_name: { guild_id: GUILD_ID, name } }
    });
    
    if (existing) {
      return NextResponse.json({ error: 'An item with this name already exists' }, { status: 400 });
    }
    
    // Calculate expires_at if expires_in_days is set
    let expires_at = null;
    if (expires_in_days && expires_in_days > 0) {
      expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expires_in_days);
    }
    
    const item = await prismaBot.shopItem.create({
      data: {
        guild_id: GUILD_ID,
        name,
        price: parseInt(price) || 0,
        description: description || null,
        thumbnail: thumbnail || null,
        stock: stock !== null && stock !== undefined && stock !== '' ? parseInt(stock) : null,
        time_hours: time_hours ? parseInt(time_hours) : null,
        income_amount: income_amount ? parseInt(income_amount) : null,
        role_required_id: role_required_id || null,
        role_given_id: role_given_id || null,
        role_removed_id: role_removed_id || null,
        required_balance: required_balance ? parseInt(required_balance) : null,
        reply_message: reply_message || null,
        expires_in_days: expires_in_days ? parseInt(expires_in_days) : null,
        expires_at,
        created_by: session.user.id
      }
    });
    
    return NextResponse.json({ success: true, item });
    
  } catch (error) {
    console.error('Error creating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
