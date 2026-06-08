import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "1507458872225566811";

const HARDCODED_CASINO_ROLES = ["1470329047262167040"];

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
    console.log('[Casino Access API] Checking permissions:', {
      hasFullAccess: perms.hasFullAccess,
      hasCasinoAccess: perms.hasCasinoAccess,
      userRoles: perms.roles
    });
    
    
    if (perms.hasFullAccess) {
      return NextResponse.json({ 
        hasAccess: true, 
        reason: 'Full admin access',
        isAdmin: true
      });
    }
    
    
    if (perms.hasCasinoAccess) {
      return NextResponse.json({ 
        hasAccess: true, 
        reason: 'Session has casino access',
        isAdmin: false
      });
    }
    
    
    try {
      const casinoRoles = await prismaBot.casinoAdminRole.findMany({
        where: { guild_id: GUILD_ID }
      });
      
      
      const dbRoleIds = casinoRoles.map((r: any) => r.role_id);
      const allCasinoRoleIds = [...new Set([...dbRoleIds, ...HARDCODED_CASINO_ROLES])];
      const userRoles = perms.roles || [];
      
      console.log('[Casino Access API] Role check:', {
        dbRoleIds,
        allCasinoRoleIds,
        userRoles
      });
      
      const hasCasinoRole = userRoles.some((roleId: string) => allCasinoRoleIds.includes(roleId));
      
      if (hasCasinoRole) {
        return NextResponse.json({ 
          hasAccess: true, 
          reason: 'Has casino role',
          isAdmin: false,
          casinoRoles: allCasinoRoleIds,
          matchedRole: userRoles.find((r: string) => allCasinoRoleIds.includes(r))
        });
      }
      
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'No casino role found',
        casinoRoles: allCasinoRoleIds,
        userRoles
      });
      
    } catch (error) {
      console.error('[Casino Access API] Error checking casino roles:', error);
      
      
      const userRoles = perms.roles || [];
      const hasCasinoRole = userRoles.some((roleId: string) => HARDCODED_CASINO_ROLES.includes(roleId));
      
      if (hasCasinoRole) {
        return NextResponse.json({ 
          hasAccess: true, 
          reason: 'Has hardcoded casino role (DB error fallback)',
          isAdmin: false
        });
      }
      
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'Database error and no hardcoded role match',
        error: String(error)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[Casino Access API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
