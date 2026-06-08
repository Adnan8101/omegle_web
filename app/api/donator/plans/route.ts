import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

function hasAdminAccess(session: any): boolean {
  if (process.env.ADMIN_DEV_BYPASS === 'true') return true;
  const perms = session?.user?.permissions;
  return Boolean(perms?.hasFullAccess || perms?.hasModeratorAccess || perms?.hasAnyAccess);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const planId = searchParams.get('id');
    const guildId = searchParams.get('guild_id');

    let plans;
    if (planId) {
      plans = await (prismaBot as any).donatorPlan.findUnique({
        where: { id: planId },
        include: {
          _count: {
            select: { subscriptions: true }
          }
        }
      });
    } else if (guildId) {
      plans = await (prismaBot as any).donatorPlan.findMany({
        where: { guild_id: guildId },
        include: {
          _count: {
            select: { subscriptions: true }
          }
        },
        orderBy: { created_at: 'asc' }
      });
    } else {
      plans = [];
    }

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error('Error fetching donator plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !hasAdminAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      guild_id,
      title,
      description,
      price,
      perks,
      linked_role_id,
      crypto_enabled,
      price_crypto,
      ozy_enabled,
      price_ozy,
    } = body;

    if (!guild_id || !title || !price || !linked_role_id) {
      return NextResponse.json(
        { error: 'Missing required fields: guild_id, title, price, linked_role_id' },
        { status: 400 }
      );
    }

    const plan = await (prismaBot as any).donatorPlan.create({
      data: {
        guild_id,
        title,
        description: description || '',
        price: Math.floor(price), 
        perks: Array.isArray(perks) ? perks : [],
        linked_role_id,
        crypto_enabled: crypto_enabled ?? true,
        price_crypto: price_crypto ? Math.floor(price_crypto) : null,
        ozy_enabled: Boolean(ozy_enabled),
        price_ozy: price_ozy ? Math.floor(price_ozy) : null,
        created_by: session.user.id
      }
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating donator plan:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Plan title already exists for this guild' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !hasAdminAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const body = await request.json();
    const {
      id: bodyId,
      title,
      description,
      price,
      perks,
      linked_role_id,
      enabled,
      paused,
      crypto_enabled,
      price_crypto,
      ozy_enabled,
      price_ozy,
    } = body;
    const id = searchParams.get('id') || bodyId;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const plan = await (prismaBot as any).donatorPlan.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Math.floor(price) }),
        ...(perks !== undefined && { perks: Array.isArray(perks) ? perks : [] }),
        ...(linked_role_id !== undefined && { linked_role_id }),
        ...(enabled !== undefined && { enabled }),
        ...(paused !== undefined && { paused }),
        ...(crypto_enabled !== undefined && { crypto_enabled }),
        ...(price_crypto !== undefined && { price_crypto: price_crypto === '' || price_crypto === null ? null : Math.floor(price_crypto) }),
        ...(ozy_enabled !== undefined && { ozy_enabled: Boolean(ozy_enabled) }),
        ...(price_ozy !== undefined && { price_ozy: price_ozy === '' || price_ozy === null ? null : Math.floor(price_ozy) })
      }
    });

    return NextResponse.json({ data: plan });
  } catch (error: any) {
    console.error('Error updating donator plan:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !hasAdminAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    await (prismaBot as any).donatorPlan.delete({
      where: { id: planId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting donator plan:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
