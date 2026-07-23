

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEV_ACCESS_PASSWORD = '123Byte123';

function expectedPassword(): string {
  
  
  
  
  return process.env.WHEEL_DEV_PASSWORD || DEV_ACCESS_PASSWORD;
}

export function middleware(request: NextRequest) {
  const candidate = request.cookies.get('dev_access')?.value ?? null;
  const isAuthorized = candidate !== null && candidate === expectedPassword();

  if (!isAuthorized) {
    
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  
  
  matcher: ['/gambling/:path*', '/wheel/:path*', '/slots/:path*'],
};