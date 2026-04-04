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

    const [stats] = await StaffApplication.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          considered: {
            $sum: { $cond: [{ $eq: ['$status', 'considered'] }, 1, 0] }
          },
          denied: {
            $sum: { $cond: [{ $eq: ['$status', 'denied'] }, 1, 0] }
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          pending: 1,
          considered: 1,
          denied: 1,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total: Number(stats?.total || 0),
        pending: Number(stats?.pending || 0),
        considered: Number(stats?.considered || 0),
        denied: Number(stats?.denied || 0),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
