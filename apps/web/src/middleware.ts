import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route guard (Next.js 15 name; `proxy.ts` on Next 16). UX only: it checks that a
 * `sid` cookie exists and redirects to /login otherwise. The API enforces everything.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get('sid')?.value) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/queues/:path*', '/my-ticket/:path*', '/operator/:path*'],
};
