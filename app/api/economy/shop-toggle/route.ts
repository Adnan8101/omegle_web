import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Fetch shop items with their toggle states
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get shop config and items
    const [config, items] = await Promise.all([
      prismaBot.economyConfig.findUnique({ where: { guild_id: GUILD_ID } }),
      prismaBot.shopItem.findMany({ 
        where: { guild_id: GUILD_ID },
        orderBy: { name: 'asc' }
      })
    ]);

    return NextResponse.json({
      shopEnabled: config?.shop_enabled ?? true,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        thumbnail: item.thumbnail,
        stock: item.stock,
        enabled: item.enabled
      }))
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

// PATCH - Toggle shop or individual item
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { type, itemId, enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled value' }, { status: 400 });
    }

    if (type === 'shop') {
      // Toggle entire shop
      await prismaBot.economyConfig.upsert({
        where: { guild_id: GUILD_ID },
        create: { guild_id: GUILD_ID, shop_enabled: enabled },
        update: { shop_enabled: enabled }
      });
      return NextResponse.json({ success: true, shopEnabled: enabled });
    } else if (type === 'item' && itemId) {
      // Toggle individual item
      const updated = await prismaBot.shopItem.updateMany({
        where: { id: itemId, guild_id: GUILD_ID },
        data: { enabled },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, itemId, enabled });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error toggling shop:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
