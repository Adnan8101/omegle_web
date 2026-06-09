import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

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
      const allCasinoRoleIds = [...new Set(dbRoleIds)];
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
      return NextResponse.json({
        hasAccess: false,
        reason: 'Database error checking casino roles',
        error: String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Casino Access API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}