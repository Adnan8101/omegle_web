import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';

// GET /api/deadhand/logs?guildId=...&limit=50&cursor=...
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    const limitParam = parseInt(searchParams.get('limit') ?? '50');
    const cursor = searchParams.get('cursor') ?? undefined;
    if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });

    try {
        const logs = await (prismaBot as any).deadHandEvent.findMany({
            where: { guild_id: guildId },
            orderBy: { created_at: 'desc' },
            take: Math.min(limitParam, 100),
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        return NextResponse.json(logs);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
