import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAIN_OWNER_ID  = '929297205796417597';
const ADMINISTRATOR  = 0x0000000000000008n;
const MANAGE_GUILD   = 0x0000000000000020n;

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

    const guildId = request.nextUrl.searchParams.get('guildId') || '';
    const query   = request.nextUrl.searchParams.get('q') || '';

    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
    if (!query.trim()) return NextResponse.json({ users: [] });

    const ok = await verifyAccess(session, guildId);
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const botToken = process.env.DISCORD_BOT_TOKEN!;

    let members: any[] = [];
    if (/^\d{17,20}$/.test(query)) {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${query}`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      });
      if (memberRes.ok) {
        const m = await memberRes.json().catch(() => null);
        if (m) members = [m];
      } else {
        const userRes = await fetch(`https://discord.com/api/v10/users/${query}`, {
          headers: { Authorization: `Bot ${botToken}` },
          cache: 'no-store',
        });
        if (userRes.ok) {
          const u = await userRes.json().catch(() => null);
          if (u) members = [{ user: u }];
        }
      }
    } else {
      const searchUrl = `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=25`;
      const res = await fetch(searchUrl, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      });
      members = res.ok ? await res.json().catch(() => []) : [];
    }

    const users = (Array.isArray(members) ? members : []).map((m: any) => {
      const user = m.user || {};
      const fallbackIndex = Number(BigInt(String(user.id || '0')) % 6n);
      const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
      return {
        id:       String(user.id || ''),
        name:     String(m.nick || user.global_name || user.username || '').trim(),
        username: String(user.username || '').trim(),
        avatar,
        isBot:    Boolean(user.bot),
      };
    }).filter((u: any) => u.id && u.name);

    return NextResponse.json({ users });
  } catch (err) {
    console.error('[search-users] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
