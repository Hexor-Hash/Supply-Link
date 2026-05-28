import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { applyRateLimit, RATE_LIMIT_PRESETS } from './lib/api/rateLimit';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Rate-limit public verify pages (all locales): /en/verify/[id], /es/verify/[id], etc.
  if (/^\/[a-z]{2}\/verify\//.test(pathname)) {
    const limited = applyRateLimit(request, 'verify', RATE_LIMIT_PRESETS.verify);
    if (limited) return limited as NextResponse;
  }

  return intlMiddleware(request) as NextResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
