import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put, del } from '@vercel/blob';
import { canAccessCasino } from '@/lib/apiAuth';

// Max file size: 4MB
const MAX_FILE_SIZE = 4 * 1024 * 1024;
// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// Target dimensions for shop images
const MAX_WIDTH = 512;
const MAX_HEIGHT = 512;

// Get the blob token from environment
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Check if blob token is configured
    if (!BLOB_TOKEN) {
      console.error('[Upload] BLOB_READ_WRITE_TOKEN is not configured');
      return NextResponse.json({ 
        error: 'Image upload is not configured. Please contact admin.' 
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size: 4MB' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'png';
    const filename = `shop-items/${timestamp}-${randomString}.${extension}`;

    // Upload to Vercel Blob with explicit token
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      token: BLOB_TOKEN,
    });

    console.log('[Upload] File uploaded successfully:', blob.url);

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: filename,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Remove an uploaded image
export async function DELETE(request: NextRequest) {
  try {
    // Check if blob token is configured
    if (!BLOB_TOKEN) {
      return NextResponse.json({ 
        error: 'Image storage is not configured' 
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.hasAnyAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = canAccessCasino(session.user?.permissions);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No casino access' }, { status: 403 });
    }

    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Only allow deleting from our blob storage
    if (!url.includes('blob.vercel-storage.com')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    await del(url, { token: BLOB_TOKEN });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Upload] Delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete image' 
    }, { status: 500 });
  }
}
