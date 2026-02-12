import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ApplicationSettings from '@/models/ApplicationSettings';

export async function GET() {
  try {
    await dbConnect();
    
    let settings = await ApplicationSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await ApplicationSettings.create({ isOpen: true });
    }

    console.log('GET /api/settings - Returning:', { isOpen: settings.isOpen });

    return NextResponse.json({ 
      success: true, 
      data: { 
        isOpen: settings.isOpen,
        closedMessage: settings.closedMessage 
      } 
    });
  } catch (error: any) {
    console.error('GET /api/settings - Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    console.log('PATCH /api/settings - Received:', body);

    let settings = await ApplicationSettings.findOne();
    
    if (!settings) {
      settings = await ApplicationSettings.create(body);
    } else {
      settings = await ApplicationSettings.findOneAndUpdate(
        {},
        { $set: body },
        { new: true, runValidators: true }
      );
    }

    console.log('PATCH /api/settings - Updated to:', { isOpen: settings?.isOpen });

    return NextResponse.json({ 
      success: true, 
      data: { 
        isOpen: settings?.isOpen,
        closedMessage: settings?.closedMessage 
      } 
    });
  } catch (error: any) {
    console.error('PATCH /api/settings - Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
