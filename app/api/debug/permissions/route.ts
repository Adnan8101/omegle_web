import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const GUILD_ID = "1507458872225566811";
    const response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );
    const debug = {
      status: response.status,
      statusText: response.statusText,
      hasAccessToken: !!session.accessToken,
      userId: session.user?.id,
      permissions: session.user?.permissions,
    };
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        ...debug,
        error: errorText,
        endpoint: `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`
      });
    }
    const member = await response.json();
    return NextResponse.json({
      ...debug,
      member: {
        roles: member.roles,
        permissions: member.permissions,
        user: {
          id: member.user?.id,
          username: member.user?.username,
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}