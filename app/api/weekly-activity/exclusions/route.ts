import { authOptions } from '@/lib/auth';
import { GUILD_ID } from '@/lib/constants';
import { getDiscordUser } from '@/lib/discord';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

async function authorize() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    if (!session.user.permissions?.hasFullAccess) {
        return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
    }
    return { session };
}

export async function GET() {
    try {
        const auth = await authorize();
        if (auth.error) return auth.error;
        const rows = await prismaBot.weeklyActivityExclusion.findMany({
            where: { guild_id: GUILD_ID },
            orderBy: { created_at: 'desc' },
        });
        const cached = await prismaBot.discordUserCache.findMany({
            where: { user_id: { in: rows.map((row) => row.user_id) } },
            select: { user_id: true, username: true, display_name: true, avatar_url: true },
        });
        const map = new Map(cached.map((row) => [row.user_id, row]));
        return NextResponse.json({
            exclusions: rows.map((row) => ({
                id: row.id,
                userId: row.user_id,
                reason: row.reason,
                createdAt: row.created_at.toISOString(),
                username: map.get(row.user_id)?.username || null,
                displayName: map.get(row.user_id)?.display_name || map.get(row.user_id)?.username || null,
                avatarUrl: map.get(row.user_id)?.avatar_url || null,
            })),
        });
    } catch (error) {
        console.error('[WeeklyActivity] GET /exclusions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authorize();
        if (auth.error) return auth.error;
        const body = await request.json();
        const userId = String(body.userId || '').trim();
        const reason = body.reason ? String(body.reason).trim().slice(0, 200) : null;
        if (!/^\d{5,25}$/.test(userId)) {
            return NextResponse.json({ error: 'Enter a valid Discord user ID.' }, { status: 400 });
        }
        const existing = await prismaBot.weeklyActivityExclusion.findUnique({
            where: { guild_id_user_id: { guild_id: GUILD_ID, user_id: userId } },
        });
        if (existing) {
            return NextResponse.json({ error: 'That member is already excluded.' }, { status: 409 });
        }
        const exclusion = await prismaBot.weeklyActivityExclusion.create({
            data: {
                guild_id: GUILD_ID,
                user_id: userId,
                reason,
                created_by: auth.session!.user.id,
            },
        });
        await prismaBot.weeklyActivityAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                user_id: auth.session!.user.id,
                action: 'exclusion_added',
                reason: `Excluded ${userId} from weekly leaderboards${reason ? `: ${reason}` : ''}`,
                meta: { excluded_user_id: userId },
            },
        });
        const member = await getDiscordUser(userId).catch(() => null);
        return NextResponse.json({
            success: true,
            exclusion: {
                id: exclusion.id,
                userId,
                reason,
                createdAt: exclusion.created_at.toISOString(),
                username: member?.user?.username || null,
                displayName: member?.nick || member?.user?.global_name || member?.user?.username || null,
                avatarUrl: null,
            },
        });
    } catch (error) {
        console.error('[WeeklyActivity] POST /exclusions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = await authorize();
        if (auth.error) return auth.error;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        const deleted = await prismaBot.weeklyActivityExclusion.deleteMany({
            where: { guild_id: GUILD_ID, user_id: userId },
        });
        if (deleted.count === 0) {
            return NextResponse.json({ error: 'Exclusion not found' }, { status: 404 });
        }
        await prismaBot.weeklyActivityAuditLog.create({
            data: {
                guild_id: GUILD_ID,
                user_id: auth.session!.user.id,
                action: 'exclusion_removed',
                reason: `Removed ${userId} from the weekly leaderboard exclusion list`,
                meta: { excluded_user_id: userId },
            },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[WeeklyActivity] DELETE /exclusions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
