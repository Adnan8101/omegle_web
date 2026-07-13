import { prismaBot } from '@/lib/prismaBot';
import { getLiveUserProfiles } from '@/lib/teamBotClient';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const members = await prismaBot.teamMember.findMany();
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
    const founders = membersWithProfiles.filter((m) => m.designation === 'Founder');
    const developers = membersWithProfiles.filter((m) => m.designation === 'Bot Developer');
    const management = membersWithProfiles.filter((m) => m.designation === 'Management');
    return NextResponse.json({
      success: true,
      data: {
        founders,
        developers,
        management,
      },
    });
  } catch (error: any) {
    console.error('[API Public Team GET] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to retrieve team details' }, { status: 500 });
  }
}