import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const url = req.nextUrl.clone();

    const adjustedPathname = url.pathname.replace(basePath, '');

    if (adjustedPathname.startsWith('/uploads/')) {
        url.pathname = `/api${adjustedPathname}`;
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}