import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { verifyAccess } from '@/lib/verifyAccess';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const guildId   = params.get('guildId') || '';
    const limitStr  = params.get('limit') || '50';
    const eventType = params.get('eventType') || '';

    if (!guildId) return NextResponse.json({ error: 'guildId is required' }, { status: 400 });

    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 50));

    const logs = await prismaBot.antiNukeLog.findMany({
      where: {
        guild_id: guildId,
        ...(eventType ? { event_type: eventType } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const executorIds = logs.map(l => l.executor_id);
    const targetIds = logs.map(l => l.target_id).filter(Boolean) as string[];
    const uniqueIds = Array.from(new Set([...executorIds, ...targetIds]));

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const userMap: Record<string, any> = {};

    if (botToken && uniqueIds.length > 0) {
      await Promise.all(uniqueIds.map(async id => {
        try {
          const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${id}`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store',
          });
          if (memberRes.ok) {
            const m = await memberRes.json();
            const u = m.user || {};
            const fallbackIndex = Number(BigInt(String(u.id || '0')) % 6n);
            const avatar = u.avatar
              ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=64`
              : `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
            userMap[id] = {
              id: String(u.id || ''),
              name: String(m.nick || u.global_name || u.username || id).trim(),
              username: String(u.username || '').trim(),
              avatar,
              isBot: Boolean(u.bot),
            };
          } else {
            const userRes = await fetch(`https://discord.com/api/v10/users/${id}`, {
              headers: { Authorization: `Bot ${botToken}` },
              cache: 'no-store',
            });
            if (userRes.ok) {
              const u = await userRes.json();
              const fallbackIndex = Number(BigInt(String(u.id || '0')) % 6n);
              const avatar = u.avatar
                ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=64`
                : `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
              userMap[id] = {
                id: String(u.id || ''),
                name: String(u.global_name || u.username || id).trim(),
                username: String(u.username || '').trim(),
                avatar,
                isBot: Boolean(u.bot),
              };
            }
          }
        } catch (e) {
          console.error(`[logs] Error fetching user info for ${id}:`, e);
        }
      }));
    }

    const resolvedLogs = logs.map(l => ({
      id: l.id,
      guildId: l.guild_id,
      executorId: l.executor_id,
      targetId: l.target_id,
      eventType: l.event_type,
      actionTaken: l.action_taken,
      extraData: l.extra_data,
      timestamp: l.timestamp.toISOString(),
      executorUser: userMap[l.executor_id] || null,
      targetUser: l.target_id ? (userMap[l.target_id] || null) : null,
    }));

    return NextResponse.json({ logs: resolvedLogs });
  } catch (error) {
    console.error('[antinuke/logs] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
