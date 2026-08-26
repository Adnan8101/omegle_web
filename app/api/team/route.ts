import { prismaBot } from '@/lib/prismaBot';
import { getLiveUserProfiles } from '@/lib/teamBotClient';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const members = await prismaBot.teamMember.findMany({
      orderBy: [
        { position: 'asc' },
        { created_at: 'asc' },
      ],
    });
    const userIds = members.map((m) => m.discord_user_id);
    const profilesMap = await getLiveUserProfiles(userIds);
    const membersWithProfiles = members
      .map((m) => {
        const profile = profilesMap.get(m.discord_user_id) || null;
        return {
          id: m.id,
          discord_user_id: m.discord_user_id,
          designation: m.designation,
          created_at: m.created_at,
          profile,
        };
      })
      .filter((m) => m.profile !== null);
    const founders = membersWithProfiles.filter(
      (m) => m.designation === 'Founder' || m.designation?.toLowerCase() === 'founder'
    );
    const admins = membersWithProfiles.filter(
      (m) => m.designation === 'Admin' || m.designation?.toLowerCase() === 'admin'
    );
    const core_team = membersWithProfiles.filter(
      (m) =>
        m.designation === 'Core Team' ||
        m.designation?.toLowerCase() === 'core team'
    );
    return NextResponse.json({
      success: true,
      data: {
        founders,
        admins,
        core_team,
      },
    });
  } catch (error: any) {
    console.error('[API Public Team GET] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to retrieve team details' }, { status: 500 });
  }
}