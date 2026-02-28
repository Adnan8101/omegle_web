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

// GET - List all purchases
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
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'redeemed', or null for all
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const where: any = { guild_id: GUILD_ID };
    if (status) {
      where.status = status;
    }
    
    const [purchases, total] = await Promise.all([
      prismaBot.shopPurchase.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      prismaBot.shopPurchase.count({ where })
    ]);
    
    // Get economy config for currency
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    
    return NextResponse.json({
      purchases: purchases.map((p: any) => ({
        ...p,
        created_at: p.created_at.toISOString(),
        redeemed_at: p.redeemed_at?.toISOString() || null
      })),
      total,
      currencyEmoji: config?.currency_emoji || '🪙'
    });
    
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
