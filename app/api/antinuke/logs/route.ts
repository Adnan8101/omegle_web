import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const MAIN_OWNER_ID = '929297205796417597';
const ADMINISTRATOR = 0x0000000000000008n;
const MANAGE_GUILD  = 0x0000000000000020n;

async function verifyAccess(session: any, guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  const userId = String(session?.user?.id || '');
  if (!userId) return false;
  if (userId === MAIN_OWNER_ID) return true;

  const [memberRes, rolesRes, guildRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
    fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` }, cache: 'no-store',
    }),
  ]);

  if (!memberRes.ok || !guildRes.ok) return false;
  const guild  = await guildRes.json().catch(() => null);
  const member = await memberRes.json().catch(() => null);
  if (String(guild?.owner_id) === userId) return true;

  const roles  = rolesRes.ok ? await rolesRes.json().catch(() => []) : [];
  const roleMap = new Map<string, bigint>();
  for (const r of Array.isArray(roles) ? roles : []) {
    try { roleMap.set(String(r.id), BigInt(r.permissions || '0')); } catch { }
  }
  let effective = 0n;
  for (const rid of Array.isArray(member?.roles) ? member.roles : []) {
    effective |= roleMap.get(String(rid)) || 0n;
  }
  return (effective & ADMINISTRATOR) !== 0n || (effective & MANAGE_GUILD) !== 0n;
}

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
