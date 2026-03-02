import { getErrorMessage } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/apiAuth';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessAdminFeatures(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const total = await StaffApplication.countDocuments();
    const pending = await StaffApplication.countDocuments({ status: 'pending' });
    const considered = await StaffApplication.countDocuments({ status: 'considered' });
    const denied = await StaffApplication.countDocuments({ status: 'denied' });

    return NextResponse.json({
      success: true,
      data: {
        total,
        pending,
        considered,
        denied,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
