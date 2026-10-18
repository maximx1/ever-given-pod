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

    const feedMatch = adjustedPathname.match(/^\/([^/]+)\/([^/]+)\/feed$/);
    if (feedMatch) {
        const [, username, streamName] = feedMatch;
        // Query params set on a middleware rewrite are dropped in production builds, so the
        // names go in the path; the route also reads them from req.url when its params are empty
        url.pathname = `${basePath}/api/feeds/${username}/${streamName}`;
        const token = req.nextUrl.searchParams.get('token');
        url.search = token ? `?token=${encodeURIComponent(token)}` : '';
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
    exclude: [
        '/api/streams/random',
        '/api/episodes/random',
        '/api/feeds/by-name',
        '/api/feeds/:username/:stream*',
    ],
};