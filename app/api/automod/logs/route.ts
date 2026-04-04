import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

function hasAccess(session: any, request: NextRequest): boolean {
  return process.env.AUTOMOD_DEV_BYPASS === 'true';
}

function isAutoModDbUnavailable(message: string): boolean {
  return message.includes('automod_logs') && (message.includes('does not exist') || message.includes('no such table') || message.includes('table'));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAccess(session, request)) {
      return NextResponse.json({ error: 'Insufficient permissions for AutoMod logs.' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const guildId = searchParams.get('guild_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('user_id');
    const ruleName = searchParams.get('rule_name');

    if (!guildId) {
      return NextResponse.json({ error: 'Missing guild_id parameter' }, { status: 400 });
    }

    try {
      const where: any = { guild_id: guildId };
      if (userId) where.user_id = userId;
      if (ruleName) where.rule_name = ruleName;

      const [logs, total] = await Promise.all([
        (prismaBot as any).autoModLog.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' }
        }),
        (prismaBot as any).autoModLog.count({ where })
      ]);

      return NextResponse.json({
        data: logs,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('automod logs GET error', error);
      if (isAutoModDbUnavailable(error.message)) {
        return NextResponse.json({
          error: 'AutoMod tables are not created in database yet. Run Prisma migration for omegle_web.',
          data: []
        }, { status: 503 });
      }
      return NextResponse.json({
        error: 'AutoMod database is unavailable. Check BOT_DATABASE_URL credentials in omegle_web/.env.local.',
        data: []
      }, { status: 503 });
    }
  } catch (error) {
    console.error('automod logs endpoint error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
