// Admin: read/write Spin-the-Wheel configuration (game settings + segments).
// Gated by casino access. Segments include weights (server-only odds) here —
// this endpoint is never exposed to players.

import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { canAccessCasino } from '@/lib/apiAuth';
import { prismaBot } from '@/lib/prismaBot';
import { SEGMENT_COUNT_OPTIONS, DEFAULT_SEGMENT_COLORS } from '@/lib/gambling/constants';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function defaultSegments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    position: i,
    reward_amount: 0,
    weight: 1,
    color: DEFAULT_SEGMENT_COLORS[i % DEFAULT_SEGMENT_COLORS.length],
    label: '',
    icon: null as string | null,
  }));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canAccessCasino(session.user.permissions)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const [config, segments] = await Promise.all([
      prismaBot.wheelConfig.findUnique({ where: { guild_id: GUILD_ID } }),
      prismaBot.wheelSegment.findMany({
        where: { guild_id: GUILD_ID },
        orderBy: { position: 'asc' },
      }),
    ]);

    const segmentCount = config?.segment_count ?? 8;

    return NextResponse.json(
      {
        config: {
          enabled: config?.enabled ?? false,
          entry_cost: config?.entry_cost ?? 50,
          segment_count: segmentCount,
        },
        segments:
          segments.length > 0
            ? segments.map((s) => ({
                position: s.position,
                reward_amount: s.reward_amount,
                weight: s.weight,
                color: s.color,
                label: s.label,
                icon: s.icon,
              }))
            : defaultSegments(segmentCount),
        segmentCountOptions: SEGMENT_COUNT_OPTIONS,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('Error fetching wheel config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canAccessCasino(session.user.permissions)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, entry_cost, segment_count, segments } = body;

    // Validate segment count.
    const count = Number(segment_count);
    if (!SEGMENT_COUNT_OPTIONS.includes(count as any)) {
      return NextResponse.json(
        { error: `segment_count must be one of ${SEGMENT_COUNT_OPTIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate entry cost.
    const cost = Number(entry_cost);
    if (!Number.isInteger(cost) || cost < 0) {
      return NextResponse.json({ error: 'entry_cost must be a non-negative integer' }, { status: 400 });
    }

    // Validate segments array matches the count.
    if (!Array.isArray(segments) || segments.length !== count) {
      return NextResponse.json(
        { error: `segments must be an array of exactly ${count} entries` },
        { status: 400 },
      );
    }

    const cleanSegments = segments.map((s: any, i: number) => {
      const reward = Math.max(0, Math.floor(Number(s?.reward_amount) || 0));
      const weight = Math.max(0, Math.floor(Number(s?.weight) || 0));
      const color = typeof s?.color === 'string' && s.color.trim() ? s.color.trim() : DEFAULT_SEGMENT_COLORS[i % DEFAULT_SEGMENT_COLORS.length];
      const label = typeof s?.label === 'string' ? s.label.slice(0, 40) : '';
      const icon = typeof s?.icon === 'string' && s.icon.trim() ? s.icon.trim() : null;
      return { guild_id: GUILD_ID, position: i, reward_amount: reward, weight, color, label, icon };
    });

    // At least one segment must be reachable (weight > 0), else spins are undefined.
    if (cleanSegments.every((s) => s.weight === 0)) {
      return NextResponse.json(
        { error: 'At least one segment must have a weight greater than 0' },
        { status: 400 },
      );
    }

    await prismaBot.$transaction(async (tx) => {
      await tx.wheelConfig.upsert({
        where: { guild_id: GUILD_ID },
        create: {
          guild_id: GUILD_ID,
          enabled: Boolean(enabled),
          entry_cost: cost,
          segment_count: count,
        },
        update: {
          enabled: Boolean(enabled),
          entry_cost: cost,
          segment_count: count,
        },
      });
      // Replace the full segment set to match the desired configuration.
      await tx.wheelSegment.deleteMany({ where: { guild_id: GUILD_ID } });
      await tx.wheelSegment.createMany({ data: cleanSegments });
    });

    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error updating wheel config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
