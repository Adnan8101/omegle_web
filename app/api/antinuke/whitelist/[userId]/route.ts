import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { verifyAccess, MAIN_OWNER_ID, EDITORS } from '@/lib/verifyAccess';
const ALL_PERMISSIONS = [
  'MANAGE_PERMISSIONS',
];
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId } = await params;
    if (userId === MAIN_OWNER_ID) {
      return NextResponse.json({ error: 'Main Owner cannot be modified.' }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    const { guildId, permissions } = body || {};
    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });
    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!EDITORS.includes(String(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden. Only whitelisted editors can edit the Anti-Nuke configurations.' }, { status: 403 });
    }
    if (typeof permissions !== 'object' || permissions === null) {
      return NextResponse.json({ error: 'permissions object is required' }, { status: 400 });
    }
    const safePermissions: Record<string, boolean> = {};
    for (const key of ALL_PERMISSIONS) {
      safePermissions[key] = Boolean(permissions[key]);
    }
    const row = await prismaBot.antiNukeWhitelist.update({
      where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
      data: {
        permissions: safePermissions,
        added_by: String(session.user.id),
      },
    });
    return NextResponse.json({ success: true, entry: row });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'User not found in whitelist.' }, { status: 404 });
    }
    console.error('[antinuke/whitelist/[userId]] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}