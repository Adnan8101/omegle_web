import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

const GUILD_ID = "910043773130661918";

// GET - Fetch economy config
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - require full access or casino access
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });

    // Get category rewards if advanced mode
    const categoryRewards = config?.advanced_mode 
      ? await prismaBot.economyCategoryReward.findMany({
          where: { guild_id: GUILD_ID },
          orderBy: { category_name: 'asc' }
        })
      : [];

    return NextResponse.json({
      config: config || {
        guild_id: GUILD_ID,
        messages_per_point: 25,
        min_message_length: 5,
        message_cooldown: 5,
        minutes_per_point: 1,
        require_two_members: 2,
        ignore_afk_channel: true,
        ignore_self_muted: false,
        ignore_deafened: false,
        currency_name: 'Ozy',
        currency_emoji: '🪙',
        leaderboard_sync: true,
        enabled: false,
        advanced_mode: false,
        shop_enabled: true
      },
      categoryRewards
    });
  } catch (error) {
    console.error('Error fetching economy config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update economy config
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - require full access or casino access
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      messages_per_point,
      min_message_length,
      message_cooldown,
      minutes_per_point,
      require_two_members,
      ignore_afk_channel,
      ignore_self_muted,
      ignore_deafened,
      currency_name,
      currency_emoji,
      leaderboard_sync,
      enabled,
      advanced_mode,
      shop_enabled,
      afk_channel_id
    } = body;

    const config = await prismaBot.economyConfig.upsert({
      where: { guild_id: GUILD_ID },
      create: {
        guild_id: GUILD_ID,
        messages_per_point: messages_per_point ?? 25,
        min_message_length: min_message_length ?? 5,
        message_cooldown: message_cooldown ?? 5,
        minutes_per_point: minutes_per_point ?? 1,
        require_two_members: require_two_members ?? 2,
        ignore_afk_channel: ignore_afk_channel ?? true,
        ignore_self_muted: ignore_self_muted ?? false,
        ignore_deafened: ignore_deafened ?? false,
        currency_name: currency_name ?? 'Ozy',
        currency_emoji: currency_emoji ?? '🪙',
        leaderboard_sync: leaderboard_sync ?? true,
        enabled: enabled ?? false,
        advanced_mode: advanced_mode ?? false,
        shop_enabled: shop_enabled ?? true,
        afk_channel_id: afk_channel_id ?? null
      },
      update: {
        ...(messages_per_point !== undefined && { messages_per_point }),
        ...(min_message_length !== undefined && { min_message_length }),
        ...(message_cooldown !== undefined && { message_cooldown }),
        ...(minutes_per_point !== undefined && { minutes_per_point }),
        ...(require_two_members !== undefined && { require_two_members }),
        ...(ignore_afk_channel !== undefined && { ignore_afk_channel }),
        ...(ignore_self_muted !== undefined && { ignore_self_muted }),
        ...(ignore_deafened !== undefined && { ignore_deafened }),
        ...(currency_name !== undefined && { currency_name }),
        ...(currency_emoji !== undefined && { currency_emoji }),
        ...(leaderboard_sync !== undefined && { leaderboard_sync }),
        ...(enabled !== undefined && { enabled }),
        ...(advanced_mode !== undefined && { advanced_mode }),
        ...(shop_enabled !== undefined && { shop_enabled }),
        ...(afk_channel_id !== undefined && { afk_channel_id })
      }
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating economy config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
