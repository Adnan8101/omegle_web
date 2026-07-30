import { authOptions } from '@/lib/auth';
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
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const config = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    const categoryRewards = config?.advanced_mode
      ? await prismaBot.economyCategoryReward.findMany({
          where: { guild_id: GUILD_ID },
          orderBy: { category_name: 'asc' }
        })
      : [];
    return NextResponse.json({
      config: config || {
        guild_id: GUILD_ID,
        min_message_length: 5,
        minutes_per_point: 1,
        require_two_members: 1,
        ignore_afk_channel: true,
        ignore_self_muted: false,
        ignore_deafened: false,
        currency_name: 'Ozy',
        currency_emoji: '🪙',
        ozy_inr_rate: 18.0,
        leaderboard_sync: true,
        enabled: false,
        advanced_mode: false,
        shop_enabled: true,
        vc_enabled: true,
        message_enabled: true,
        afk_verify_enabled: false,
        afk_verify_min: 80,
        afk_verify_max: 90,
        purchase_cooldown_enabled: false,
        purchase_cooldown_hours: 24,
        max_grind_enabled: false,
        max_grind_hours: 8,
        msg_min_per_minute: 3,
        msg_count_emojis: false,
        msg_count_stickers: false
      },
      categoryRewards
    });
  } catch (error) {
    console.error('Error fetching economy config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const perms = session.user.permissions;
    if (!perms?.hasFullAccess && !perms?.hasCasinoAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const body = await request.json();
    const {
      min_message_length,
      minutes_per_point,
      require_two_members,
      count_bots,
      ignore_afk_channel,
      ignore_self_muted,
      ignore_deafened,
      currency_name,
      currency_emoji,
      ozy_inr_rate,
      leaderboard_sync,
      enabled,
      advanced_mode,
      shop_enabled,
      afk_channel_id,
      vc_enabled,
      message_enabled,
      afk_verify_enabled,
      afk_verify_min,
      afk_verify_max,
      purchase_cooldown_enabled,
      purchase_cooldown_hours,
      max_grind_enabled,
      max_grind_hours,
      msg_min_per_minute,
      msg_count_emojis,
      msg_count_stickers
    } = body;
    const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, Math.round(parsed)));
    };
    const currentConfig = await prismaBot.economyConfig.findUnique({
      where: { guild_id: GUILD_ID }
    });
    const config = await prismaBot.economyConfig.upsert({
      where: { guild_id: GUILD_ID },
      create: {
        guild_id: GUILD_ID,
        min_message_length: min_message_length ?? 5,
        minutes_per_point: minutes_per_point ?? 1,
        require_two_members: require_two_members ?? 1,
        count_bots: count_bots ?? false,
        ignore_afk_channel: ignore_afk_channel ?? true,
        ignore_self_muted: ignore_self_muted ?? false,
        ignore_deafened: ignore_deafened ?? false,
        currency_name: currency_name ?? 'Ozy',
        currency_emoji: currency_emoji ?? '🪙',
        ozy_inr_rate: ozy_inr_rate ?? 18.0,
        leaderboard_sync: leaderboard_sync ?? true,
        enabled: enabled ?? false,
        advanced_mode: advanced_mode ?? false,
        shop_enabled: shop_enabled ?? true,
        afk_channel_id: afk_channel_id ?? null,
        vc_enabled: vc_enabled ?? true,
        message_enabled: message_enabled ?? true,
        afk_verify_enabled: afk_verify_enabled ?? false,
        afk_verify_min: afk_verify_min ?? 80,
        afk_verify_max: afk_verify_max ?? 90,
        purchase_cooldown_enabled: purchase_cooldown_enabled ?? false,
        purchase_cooldown_hours: clampInt(purchase_cooldown_hours, 24, 1, 8760),
        max_grind_enabled: max_grind_enabled ?? false,
        max_grind_hours: clampInt(max_grind_hours, 8, 1, 24),
        msg_min_per_minute: clampInt(msg_min_per_minute, 3, 1, 500),
        msg_count_emojis: msg_count_emojis ?? false,
        msg_count_stickers: msg_count_stickers ?? false
      },
      update: {
        ...(min_message_length !== undefined && { min_message_length }),
        ...(minutes_per_point !== undefined && { minutes_per_point }),
        ...(require_two_members !== undefined && { require_two_members }),
        ...(count_bots !== undefined && { count_bots }),
        ...(ignore_afk_channel !== undefined && { ignore_afk_channel }),
        ...(ignore_self_muted !== undefined && { ignore_self_muted }),
        ...(ignore_deafened !== undefined && { ignore_deafened }),
        ...(currency_name !== undefined && { currency_name }),
        ...(currency_emoji !== undefined && { currency_emoji }),
        ...(ozy_inr_rate !== undefined && { ozy_inr_rate }),
        ...(leaderboard_sync !== undefined && { leaderboard_sync }),
        ...(enabled !== undefined && { enabled }),
        ...(advanced_mode !== undefined && { advanced_mode }),
        ...(shop_enabled !== undefined && { shop_enabled }),
        ...(afk_channel_id !== undefined && { afk_channel_id }),
        ...(vc_enabled !== undefined && { vc_enabled }),
        ...(message_enabled !== undefined && { message_enabled }),
        ...(afk_verify_enabled !== undefined && { afk_verify_enabled }),
        ...(afk_verify_min !== undefined && { afk_verify_min }),
        ...(afk_verify_max !== undefined && { afk_verify_max }),
        ...(purchase_cooldown_enabled !== undefined && { purchase_cooldown_enabled }),
        ...(purchase_cooldown_hours !== undefined && { purchase_cooldown_hours: clampInt(purchase_cooldown_hours, 24, 1, 8760) }),
        ...(max_grind_enabled !== undefined && { max_grind_enabled }),
        ...(max_grind_hours !== undefined && { max_grind_hours: clampInt(max_grind_hours, 8, 1, 24) }),
        ...(msg_min_per_minute !== undefined && { msg_min_per_minute: clampInt(msg_min_per_minute, 3, 1, 500) }),
        ...(msg_count_emojis !== undefined && { msg_count_emojis }),
        ...(msg_count_stickers !== undefined && { msg_count_stickers })
      }
    });
    if (ozy_inr_rate !== undefined) {
      const itemsToUpdate = await prismaBot.shopItem.findMany({
        where: { guild_id: GUILD_ID, price_ozy_override: false }
      });
      for (const item of itemsToUpdate) {
        
        const costInr = item.actual_inr ?? 0;
        if (costInr > 0) {
          const newPrice = Math.round(costInr * ozy_inr_rate);
          await prismaBot.shopItem.update({
            where: { id: item.id },
            data: { price: newPrice }
          });
        }
      }
    }
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating economy config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}