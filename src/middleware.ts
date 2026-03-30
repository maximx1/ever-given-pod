import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const url = req.nextUrl.clone();
    const pathname = url.pathname.replace(basePath, '');
    const adjustedPathname = basePath ? pathname.replace(basePath, '') : pathname;

    if (adjustedPathname.startsWith('/uploads/')) {
        url.pathname = `/api${adjustedPathname}`;
        return NextResponse.rewrite(url);
    }

    const hasSession = req.cookies.has('session');

    if (hasSession && (adjustedPathname === '/login' || adjustedPathname === '/signup')) {
        const homeUrl = new URL(basePath || '/', req.url);
        return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth endpoints)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/|_next/static|_next/image|favicon.ico).*)',
    ],
};