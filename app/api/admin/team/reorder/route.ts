import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { members } = await request.json(); // Array of { id: string, position: number }
    if (!members || !Array.isArray(members)) {
      return NextResponse.json({ error: 'Invalid members list' }, { status: 400 });
    }

    await prismaBot.$transaction(
      members.map((m) =>
        prismaBot.teamMember.update({
          where: { id: m.id },
          data: { position: m.position },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Admin Team Reorder POST] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to reorder team members' }, { status: 500 });
  }
}
