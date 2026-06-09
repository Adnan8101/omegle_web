import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { canAccessCasino } from '@/lib/apiAuth';
import { Prisma } from '@prisma/client';
const GUILD_ID = "1507458872225566811";
export const dynamic = 'force-dynamic';
export const revalidate = 0;
function parseOptionalInt(value: unknown): number | null | 'INVALID' {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : 'INVALID';
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (!/^-?\d+$/.test(raw)) return 'INVALID';
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : 'INVALID';
}
function normalizeRoleId(roleRef: string | null | undefined): string | null {
  if (!roleRef) return null;
  const trimmed = roleRef.trim();
  if (/^\d{17,20}$/.test(trimmed)) return trimmed;
  const mentionMatch = trimmed.match(/^<@&?(\d{17,20})>$/);
  if (mentionMatch) return mentionMatch[1];
  return null;
}
function parseRoleIds(roleRef: string | null | undefined): string[] {
  if (!roleRef) return [];
  const unique = new Set<string>();
  const parts = roleRef.split(/[\s,|/]+/).filter(Boolean);
  for (const part of parts) {
    const normalized = normalizeRoleId(part);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique);
}
function serializeRoleIds(roleIds: string[]): string | null {
  return roleIds.length > 0 ? roleIds.join(',') : null;
}
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
    const existing = await prismaBot.shopItem.findFirst({
      where: { id, guild_id: GUILD_ID },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const item = await prismaBot.shopItem.findUnique({
      where: { id }
    });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    return NextResponse.json({
      item: {
        ...item,
        role_required_ids: parseRoleIds(item.role_required_id),
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = parseOptionalInt(body.price);
    const rawStock = parseOptionalInt(body.stock);
    const incomeAmount = parseOptionalInt(body.income_amount);
    const timeHours = parseOptionalInt(body.time_hours);
    const requiredBalance = parseOptionalInt(body.required_balance);
    const expiresInDays = parseOptionalInt(body.expires_in_days);
    if (
      price === 'INVALID' ||
      rawStock === 'INVALID' ||
      incomeAmount === 'INVALID' ||
      timeHours === 'INVALID' ||
      requiredBalance === 'INVALID' ||
      expiresInDays === 'INVALID'
    ) {
      return NextResponse.json({ error: 'One or more numeric fields are invalid' }, { status: 400 });
    }
    const stock = rawStock === null || rawStock === -1 ? null : rawStock;
    const requiredRoleIds = parseRoleIds(body.role_required_id);
    if (!name) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }
    if (price === null || price < 0) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
    }
    if (stock !== null && stock < 0) {
      return NextResponse.json({ error: 'Stock must be 0 or greater' }, { status: 400 });
    }
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
        role_required_id: serializeRoleIds(requiredRoleIds),
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
    const deletedAt = new Date();
    const deleted = await prismaBot.$transaction(async (tx) => {
      await tx.shopPurchase.updateMany({
        where: {
          guild_id: GUILD_ID,
          item_id: id,
          item_deleted_at: null
        },
        data: { item_deleted_at: deletedAt }
      });
      return tx.shopItem.deleteMany({
        where: { id, guild_id: GUILD_ID }
      });
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}