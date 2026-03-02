import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { canAccessCasino } from '@/lib/apiAuth';

const GUILD_ID = "910043773130661918";

// GET - Get all shop items for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = canAccessCasino(session.user?.permissions);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    // Get all shop items (including expired)
    const items = await prismaBot.shopItem.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { created_at: 'desc' }
    });

    // Get economy config
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    return NextResponse.json({
      items: items.map((item: any) => ({
        ...item,
        created_at: item.created_at.toISOString(),
        expires_at: item.expires_at?.toISOString() || null
      })),
      currencyEmoji: config?.currency_emoji || '🪙'
    });

  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new shop item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    const body = await request.json();

    // Calculate expiration date if specified
    let expiresAt = null;
    if (body.expires_in_days && parseInt(body.expires_in_days) > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(body.expires_in_days));
    }

    const item = await prismaBot.shopItem.create({
      data: {
        guild_id: GUILD_ID,
        name: body.name,
        price: parseInt(body.price),
        description: body.description || null,
        thumbnail: body.thumbnail || null,
        stock: body.stock ? parseInt(body.stock) : null,
        income_amount: body.income_amount ? parseInt(body.income_amount) : null,
        time_hours: body.time_hours ? parseInt(body.time_hours) : null,
        role_required_id: body.role_required_id || null,
        role_given_id: body.role_given_id || null,
        role_removed_id: body.role_removed_id || null,
        required_balance: body.required_balance ? parseInt(body.required_balance) : null,
        reply_message: body.reply_message || null,
        expires_at: expiresAt,
        created_by: session?.user?.id || 'web-admin'
      }
    });

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        created_at: item.created_at.toISOString(),
        expires_at: item.expires_at?.toISOString() || null
      }
    });

  } catch (error) {
    console.error('Error creating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
