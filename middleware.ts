import { NextRequest, NextResponse } from 'next/server';

// Supported URL locale prefixes (rw = Kinyarwanda, en = English, sw = Kiswahili)
const URL_LOCALES = ['rw', 'en', 'sw'];
const DEFAULT_URL_LOCALE = 'rw';

// Map URL locale to internal language code
const LOCALE_TO_LANG: Record<string, string> = { rw: 'ky', en: 'en', sw: 'sw' };

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static/internal paths
  if (pathname === '' || pathname === '/') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', '/');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const pathParts = pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];

  // Handle locale-prefixed URLs (e.g., /en/article/slug, /sw/category/politics)
  if (URL_LOCALES.includes(firstSegment)) {
    const locale = firstSegment;
    const lang = LOCALE_TO_LANG[locale] || 'ky';

    // Bare locale path → redirect to home
    if (pathParts.length === 1) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Strip locale prefix and rewrite to actual path
    const strippedPath = '/' + pathParts.slice(1).join('/');
    const url = request.nextUrl.clone();
    url.pathname = strippedPath;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', strippedPath);
    requestHeaders.set('x-locale', locale);
    requestHeaders.set('x-language', lang);

    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  // Legacy locale codes — redirect to new URL format
  const legacyLocales = ['ky', 'fr'];
  if (legacyLocales.includes(firstSegment)) {
    if (pathParts.length === 1) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const newLocale = firstSegment === 'ky' ? 'rw' : DEFAULT_URL_LOCALE;
    const rest = pathParts.slice(1).join('/');
    return NextResponse.redirect(new URL(`/${newLocale}/${rest}`, request.url), 301);
  }

  // Non-locale paths — pass through with header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Don't run middleware on static files and API routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
