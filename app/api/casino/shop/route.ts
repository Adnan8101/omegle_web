import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { canAccessCasino } from '@/lib/apiAuth';
import { Prisma } from '@prisma/client';

const GUILD_ID = "910043773130661918";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
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

    const parseOptionalInt = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = parseOptionalInt(body.price);
    const rawStock = parseOptionalInt(body.stock);
    const stock = rawStock === -1 ? null : rawStock;
    const incomeAmount = parseOptionalInt(body.income_amount);
    const timeHours = parseOptionalInt(body.time_hours);
    const requiredBalance = parseOptionalInt(body.required_balance);
    const expiresInDays = parseOptionalInt(body.expires_in_days);

    if (!name) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    if (price === null || price < 0) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
    }

    if (stock !== null && stock < 0) {
      return NextResponse.json({ error: 'Stock must be 0 or greater' }, { status: 400 });
    }

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const item = await prismaBot.shopItem.create({
      data: {
        guild_id: GUILD_ID,
        name,
        price,
        description: body.description || null,
        thumbnail: body.thumbnail || null,
        stock,
        income_amount: incomeAmount,
        time_hours: timeHours,
        role_required_id: body.role_required_id || null,
        role_given_id: body.role_given_id || null,
        role_removed_id: body.role_removed_id || null,
        required_balance: requiredBalance,
        reply_message: body.reply_message || null,
        expires_in_days: expiresInDays,
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'An item with this name already exists' }, { status: 409 });
      }
    }
    console.error('Error creating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
