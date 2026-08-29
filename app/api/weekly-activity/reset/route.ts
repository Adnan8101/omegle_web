import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { prismaBot } from '@/lib/prismaBot';
import { weeklyCycleConfig } from '@/lib/weeklyActivity/config';
import { getCycleBounds } from '@/lib/weeklyActivity/weeklyCycle';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/weekly-activity/reset
 *
 * Resets the current cycle's computed results and role holders so the
 * next finalization starts fresh. Does NOT delete chat/voice raw logs
 * (those are the source of truth and owned by the broader bot system).
 *
 * Body: { confirm: "RESET" }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!session.user.permissions?.hasFullAccess) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        if (body?.confirm !== 'RESET') {
            return NextResponse.json(
                { error: 'Confirmation required. Send { "confirm": "RESET" } in the request body.' },
                { status: 400 }
            );
        }

        const config = weeklyCycleConfig();
        const now = new Date();
        const current = getCycleBounds(now, config);

        // Find the current cycle record
        const currentCycle = await prismaBot.weeklyActivityCycle.findUnique({
            where: { guild_id_start_at: { guild_id: GUILD_ID, start_at: current.start } },
        });

        let deletedResults = 0;
        let removedHolders = 0;

        if (currentCycle) {
            // 1. Delete all WeeklyActivityResult rows for the current cycle
            const deletedResultsOp = await prismaBot.weeklyActivityResult.deleteMany({
                where: { guild_id: GUILD_ID, cycle_id: currentCycle.id },
            });
            deletedResults = deletedResultsOp.count;

            // 2. Reset the cycle record status back to active
            await prismaBot.weeklyActivityCycle.update({
                where: { id: currentCycle.id },
                data: {
                    status: 'active',
                    finalized_at: null,
                },
            });
        }

        // 3. Remove all role holders so next finalization reassigns from scratch
        const removedHoldersOp = await prismaBot.weeklyActivityRoleHolder.deleteMany({
            where: { guild_id: GUILD_ID },
        });
        removedHolders = removedHoldersOp.count;

        // 4. Write audit log
        await prismaBot.weeklyActivityAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                user_id: session.user.id,
                action: 'cycle_reset',
                reason: `Current cycle data reset manually by admin`,
                meta: {
                    cycle_id: currentCycle?.id ?? null,
                    cycle_start: current.start.toISOString(),
                    deleted_results: deletedResults,
                    removed_holders: removedHolders,
                    reset_by: session.user.id,
                },
            },
        });

        return NextResponse.json({
            success: true,
            deletedResults,
            removedHolders,
            cycleStart: current.start.toISOString(),
            cycleEnd: current.end.toISOString(),
        });
    } catch (error) {
        console.error('[WeeklyActivity] POST /reset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
