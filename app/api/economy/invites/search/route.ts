import { authOptions } from '@/lib/auth';
import { getDiscordUser,getDiscordUserAvatar } from '@/lib/discord';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
const GUILD_ID = "1507458872225566811";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasSrModAccess) {
      return NextResponse.json({ error: 'Insufficient permissions - Admin only' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const stats = await prismaBot.economyInviteStats.findMany({
      where: { guild_id: GUILD_ID },
      orderBy: { total_invites: 'desc' },
      take: 100
    });
    const isIdSearch = /^\d{17,19}$/.test(query);
    if (isIdSearch) {
      const stat = stats.find(s => s.user_id === query);
      if (stat) {
        const discordUser = await getDiscordUser(stat.user_id);
        return NextResponse.json({
          results: [{
            user_id: stat.user_id,
            username: discordUser?.nick || discordUser?.user?.global_name || discordUser?.user?.username || `User ${stat.user_id.slice(0, 8)}`,
            avatar: discordUser ? getDiscordUserAvatar(discordUser.user) : null,
            total_invites: stat.total_invites,
            coins_earned: stat.coins_earned,
          }]
        });
      }
    }
    const searchResults = await Promise.all(
      stats.map(async (stat) => {
        const discordUser = await getDiscordUser(stat.user_id);
        const username = discordUser?.nick || discordUser?.user?.global_name || discordUser?.user?.username || '';
        return {
          user_id: stat.user_id,
          username: username || `User ${stat.user_id.slice(0, 8)}`,
          avatar: discordUser ? getDiscordUserAvatar(discordUser.user) : null,
          total_invites: stat.total_invites,
          coins_earned: stat.coins_earned,
          match: username.toLowerCase().includes(query.toLowerCase()) || stat.user_id.includes(query),
        };
      })
    );
    const filteredResults = searchResults
      .filter(r => r.match)
      .sort((a, b) => {
        if (a.username.toLowerCase() === query.toLowerCase()) return -1;
        if (b.username.toLowerCase() === query.toLowerCase()) return 1;
        return b.total_invites - a.total_invites;
      })
      .slice(0, 10);
    return NextResponse.json({
      results: filteredResults.map(({ match, ...rest }) => rest)
    });
  } catch (error) {
    console.error('[API] Error searching invites:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}