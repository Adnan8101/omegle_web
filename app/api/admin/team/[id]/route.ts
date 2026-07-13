import { authOptions } from '@/lib/auth';
import { prismaBot } from '@/lib/prismaBot';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const VALID_DESIGNATIONS = ['Founder', 'Bot Developer', 'Management'];

// PUT /api/admin/team/[id] - Update team member designation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { designation } = await request.json();

    if (!designation || !VALID_DESIGNATIONS.includes(designation)) {
      return NextResponse.json(
        { error: `Designation must be one of: ${VALID_DESIGNATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify member exists
    const existing = await prismaBot.teamMember.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const updated = await prismaBot.teamMember.update({
      where: { id },
      data: { designation },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[API Admin Team PUT] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

// DELETE /api/admin/team/[id] - Delete team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.permissions?.hasFullAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify member exists
    const existing = await prismaBot.teamMember.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    await prismaBot.teamMember.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Team member deleted' });
  } catch (error: any) {
    console.error('[API Admin Team DELETE] Error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 });
  }
}
