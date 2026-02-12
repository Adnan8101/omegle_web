import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    const application = await StaffApplication.create({
      ...body,
      status: 'pending',
    });

    return NextResponse.json(
      { success: true, data: application },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { country: { $regex: search, $options: 'i' } },
        { age: { $regex: search, $options: 'i' } },
        { aboutYourself: { $regex: search, $options: 'i' } },
      ];
    }

    const applications = await StaffApplication.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: applications });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
