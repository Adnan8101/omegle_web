import { prismaBot } from '@/lib/prismaBot';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    let reaction = await prismaBot.liveReaction.findUnique({
      where: { id: 'heart' },
    });
    if (!reaction) {
      reaction = await prismaBot.liveReaction.create({
        data: { id: 'heart', count: 0 },
      });
    }
    return NextResponse.json({
      success: true,
      count: reaction.count,
    });
  } catch (error: any) {
    console.error('[API Reactions GET] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to retrieve reactions' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action === 'decrement' ? 'decrement' : 'increment';
    let reaction;
    if (action === 'decrement') {
      const existing = await prismaBot.liveReaction.findUnique({
        where: { id: 'heart' },
      });
      const newCount = Math.max(0, (existing?.count || 0) - 1);
      reaction = await prismaBot.liveReaction.upsert({
        where: { id: 'heart' },
        update: { count: newCount },
        create: { id: 'heart', count: 0 },
      });
    } else {
      reaction = await prismaBot.liveReaction.upsert({
        where: { id: 'heart' },
        update: { count: { increment: 1 } },
        create: { id: 'heart', count: 1 },
      });
    }
    return NextResponse.json({
      success: true,
      count: reaction.count,
    });
  } catch (error: any) {
    console.error('[API Reactions POST] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
  }
}