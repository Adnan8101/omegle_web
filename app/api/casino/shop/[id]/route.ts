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

// GET - Get a single shop item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await hasCasinoAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    
    const item = await prismaBot.shopItem.findFirst({
      where: { 
        id,
        guild_id: GUILD_ID 
      }
    });
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    // Get economy config for currency
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    
    return NextResponse.json({
      item,
      currencyEmoji: config?.currency_emoji || '🪙',
      currencyName: config?.currency_name || 'points'
    });
    
  } catch (error) {
    console.error('Error fetching shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a shop item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // Find the existing item
    const existing = await prismaBot.shopItem.findFirst({
      where: { id, guild_id: GUILD_ID }
    });
    
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    // Check if name already exists (if changing name)
    if (name && name !== existing.name) {
      const nameExists = await prismaBot.shopItem.findUnique({
        where: { guild_id_name: { guild_id: GUILD_ID, name } }
      });
      if (nameExists) {
        return NextResponse.json({ error: 'An item with this name already exists' }, { status: 400 });
      }
    }
    
    // Calculate expires_at if expires_in_days is set
    let expires_at = existing.expires_at;
    if (expires_in_days !== undefined) {
      if (expires_in_days && expires_in_days > 0) {
        expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + parseInt(expires_in_days));
      } else {
        expires_at = null;
      }
    }
    
    const item = await prismaBot.shopItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        price: price !== undefined ? parseInt(price) : existing.price,
        description: description !== undefined ? (description || null) : existing.description,
        thumbnail: thumbnail !== undefined ? (thumbnail || null) : existing.thumbnail,
        stock: stock !== undefined ? (stock !== null && stock !== '' ? parseInt(stock) : null) : existing.stock,
        time_hours: time_hours !== undefined ? (time_hours ? parseInt(time_hours) : null) : existing.time_hours,
        income_amount: income_amount !== undefined ? (income_amount ? parseInt(income_amount) : null) : existing.income_amount,
        role_required_id: role_required_id !== undefined ? (role_required_id || null) : existing.role_required_id,
        role_given_id: role_given_id !== undefined ? (role_given_id || null) : existing.role_given_id,
        role_removed_id: role_removed_id !== undefined ? (role_removed_id || null) : existing.role_removed_id,
        required_balance: required_balance !== undefined ? (required_balance ? parseInt(required_balance) : null) : existing.required_balance,
        reply_message: reply_message !== undefined ? (reply_message || null) : existing.reply_message,
        expires_in_days: expires_in_days !== undefined ? (expires_in_days ? parseInt(expires_in_days) : null) : existing.expires_in_days,
        expires_at
      }
    });
    
    return NextResponse.json({ success: true, item });
    
  } catch (error) {
    console.error('Error updating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a shop item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await hasCasinoAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }
    
    // Find the existing item
    const existing = await prismaBot.shopItem.findFirst({
      where: { id, guild_id: GUILD_ID }
    });
    
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    await prismaBot.shopItem.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
