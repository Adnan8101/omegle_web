import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';

export async function GET() {
  try {
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
