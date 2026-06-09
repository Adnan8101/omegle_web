import { authOptions } from '@/lib/auth';
import { verifyAccess } from '@/lib/verifyAccess';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
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