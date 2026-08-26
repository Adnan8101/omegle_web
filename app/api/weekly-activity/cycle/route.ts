import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { weeklyCycleConfig } from '@/lib/weeklyActivity/config';
import { getCycleBounds, getPreviousCycleBounds } from '@/lib/weeklyActivity/weeklyCycle';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        const config = weeklyCycleConfig();
        const now = new Date();
        const current = getCycleBounds(now, config);
        const previous = getPreviousCycleBounds(current.start, config);
        const [currentCycle, previousCycle] = await Promise.all([
            prismaBot.weeklyActivityCycle.findUnique({
                where: { guild_id_start_at: { guild_id: GUILD_ID, start_at: current.start } },
            }),
            prismaBot.weeklyActivityCycle.findUnique({
                where: { guild_id_start_at: { guild_id: GUILD_ID, start_at: previous.start } },
            }),
        ]);
        return NextResponse.json({
            config,
            current: {
                id: currentCycle?.id || null,
                start: current.start.toISOString(),
                end: current.end.toISOString(),
                status: currentCycle?.status || 'pending',
                msRemaining: Math.max(0, current.end.getTime() - now.getTime()),
            },
            previous: previousCycle
                ? {
                    id: previousCycle.id,
                    start: previousCycle.start_at.toISOString(),
                    end: previousCycle.end_at.toISOString(),
                    status: previousCycle.status,
                    finalizedAt: previousCycle.finalized_at?.toISOString() || null,
                }
                : null,
        });
    } catch (error) {
        console.error('[WeeklyActivity] GET /cycle error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
