import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getLiveUserProfiles } from '@/lib/teamBotClient';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
const VALID_DESIGNATIONS = ['Founder', 'Bot Developer', 'Management'];
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const members = await prismaBot.teamMember.findMany({
      orderBy: [
        { position: 'asc' },
        { created_at: 'asc' },
      ],
    });
    const userIds = members.map((m) => m.discord_user_id);
    const profilesMap = await getLiveUserProfiles(userIds);
    const membersWithProfiles = members.map((m) => {
      const profile = profilesMap.get(m.discord_user_id) || null;
      return {
        ...m,
        profile,
      };
    });
    return NextResponse.json({ success: true, data: membersWithProfiles });
  } catch (error: any) {
    console.error('[API Admin Team GET] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to retrieve team members' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { discord_user_id, designation } = await request.json();
    if (!discord_user_id || !discord_user_id.trim()) {
      return NextResponse.json({ error: 'Discord User ID is required' }, { status: 400 });
    }
    if (!designation || !VALID_DESIGNATIONS.includes(designation)) {
      return NextResponse.json(
        { error: `Designation must be one of: ${VALID_DESIGNATIONS.join(', ')}` },
        { status: 400 }
      );
    }
    const existing = await prismaBot.teamMember.findUnique({
      where: { discord_user_id: discord_user_id.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'This Discord User ID is already added' }, { status: 400 });
    }
    const member = await prismaBot.teamMember.create({
      data: {
        discord_user_id: discord_user_id.trim(),
        designation,
      },
    });
    return NextResponse.json({ success: true, data: member });
  } catch (error: any) {
    console.error('[API Admin Team POST] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}