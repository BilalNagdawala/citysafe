import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('citysafe-role')?.value;

  // Protect /guardian routes
  if (request.nextUrl.pathname.startsWith('/guardian')) {
    // If not a guardian, and not accessing the registration page, redirect to home
    if (role !== 'guardian' && !request.nextUrl.pathname.startsWith('/guardian/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Prevent users from accessing the root path if they already have a role
  if (request.nextUrl.pathname === '/') {
    if (role === 'guardian') {
      return NextResponse.redirect(new URL('/guardian', request.url));
    } else if (role === 'user') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
