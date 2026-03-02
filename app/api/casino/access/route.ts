import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";
// Hardcoded fallback casino role ID
const HARDCODED_CASINO_ROLES = ["1470329047262167040"];

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
    console.log('[Casino Access API] Checking permissions:', {
      hasFullAccess: perms.hasFullAccess,
      hasCasinoAccess: perms.hasCasinoAccess,
      userRoles: perms.roles
    });
    
    // Admin always has access
    if (perms.hasFullAccess) {
      return NextResponse.json({ 
        hasAccess: true, 
        reason: 'Full admin access',
        isAdmin: true
      });
    }
    
    // If session already says they have casino access, grant it
    if (perms.hasCasinoAccess) {
      return NextResponse.json({ 
        hasAccess: true, 
        reason: 'Session has casino access',
        isAdmin: false
      });
    }
    
    // Check if user has casino role from database
    try {
      const casinoRoles = await prismaBot.casinoAdminRole.findMany({
        where: { guild_id: GUILD_ID }
      });
      
      // Combine DB roles with hardcoded fallback
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
      
      // Fallback: check hardcoded roles
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
