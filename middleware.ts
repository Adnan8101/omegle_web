import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Define our admin subdomain
  const adminDomain = process.env.ADMIN_DOMAIN || 'admin.omegleecommunity.com';

  // If the request is for any admin route
  if (pathname.startsWith('/admin')) {
    const isLocalhostAdmin = host.startsWith('admin.localhost');
    const isProdAdmin = host === adminDomain;

    if (!isLocalhostAdmin && !isProdAdmin) {
      let targetHost = adminDomain;
      let protocol = request.headers.get('x-forwarded-proto') || 'https';

      if (host.includes('localhost')) {
        const port = host.split(':')[1] || '3000';
        targetHost = `admin.localhost:${port}`;
        protocol = 'http'; // local dev usually HTTP
      }

      // Construct the redirect URL preserving path and search parameters
      const redirectUrl = `${protocol}://${targetHost}${pathname}${url.search}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
