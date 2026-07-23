

import { isDevPassword } from '@/lib/gambling/devAccess';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };

    if (!isDevPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid Developer Password' },
        { status: 401 },
      );
    }

    
    const response = NextResponse.json({ ok: true });
    response.cookies.set('dev_access', password as string, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
