import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// GET - Check if user has casino access and return casino role info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'Not authenticated' 
      }, { status: 401 });
    }
    
    const perms = session.user.permissions;
    
    // Admin always has access
    if (perms.hasFullAccess) {
      return NextResponse.json({ 
        hasAccess: true, 
        reason: 'Full admin access',
        isAdmin: true
      });
    }
    
    // Check if user has casino role from database
    try {
      const casinoRoles = await prismaBot.casinoAdminRole.findMany({
        where: { guild_id: GUILD_ID }
      });
      
      const casinoRoleIds = casinoRoles.map((r: any) => r.role_id);
      const userRoles = perms.roles || [];
      
      const hasCasinoRole = userRoles.some((roleId: string) => casinoRoleIds.includes(roleId));
      
      if (hasCasinoRole) {
        return NextResponse.json({ 
          hasAccess: true, 
          reason: 'Has casino role',
          isAdmin: false,
          casinoRoles: casinoRoleIds
        });
      }
      
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'No casino role',
        casinoRoles: casinoRoleIds,
        userRoles
      });
      
    } catch (error) {
      console.error('Error checking casino roles:', error);
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'Database error',
        error: String(error)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error checking casino access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
