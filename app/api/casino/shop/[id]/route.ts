import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { canAccessCasino } from '@/lib/apiAuth';
import { Prisma } from '@prisma/client';

const GUILD_ID = "910043773130661918";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Get single shop item
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
    
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    const item = await prismaBot.shopItem.findUnique({
      where: { id }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get economy config
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    return NextResponse.json({
      item: {
        ...item,
        created_at: item.created_at.toISOString(),
        expires_at: item.expires_at?.toISOString() || null
      },
      currencyEmoji: config?.currency_emoji || '🪙'
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error) {
    console.error('Error fetching shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update shop item
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
    const stock = parseOptionalInt(body.stock);
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

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const item = await prismaBot.shopItem.update({
      where: { id },
      data: {
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
        expires_at: expiresAt
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
    console.error('Error updating shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete shop item
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
    
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
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
