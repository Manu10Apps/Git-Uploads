import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // If path is just a locale, redirect to home
  const locales = ['en', 'ky', 'sw', 'fr'];
  if (pathname === '' || pathname === '/') {
    return NextResponse.next();
  }

  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 1 && locales.includes(pathParts[0])) {
    // Redirect locale-only requests to home
    return NextResponse.redirect(new URL('/', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Don't run middleware on static files and API routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
