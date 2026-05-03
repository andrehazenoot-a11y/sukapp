import { NextResponse } from 'next/server';

// Pagina-routes die GEEN login vereisen
const PUBLIC_PAGES = ['/login', '/meerwerk-akkoord', '/intake'];

// API-paden die GEEN login vereisen
const PUBLIC_API_PREFIXES = [
    '/api/auth/',
    '/api/nextauth/',
    '/api/outlook/auth',
    '/api/meerwerk-akkoord',
    '/api/toolbox',
    '/api/beheerder-toolbox',
    '/api/medewerker-toolbox',
];

// Statische bestanden overslaan
const STATIC_PREFIXES = ['/_next/', '/favicon.ico'];

function verifyLegacySession(token) {
    if (!token) return false;
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded.data) {
            const payload = JSON.parse(decoded.data);
            return !!(payload.id && payload.username);
        }
        return !!(decoded.id && decoded.username);
    } catch {
        return false;
    }
}

function verifyNextAuthSession(request) {
    const token =
        request.cookies.get('__Secure-authjs.session-token')?.value ||
        request.cookies.get('authjs.session-token')?.value;
    return !!token;
}

export default function proxy(request) {
    const { pathname } = request.nextUrl;

    // Statische bestanden altijd doorlaten
    if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
    if (pathname.match(/\.(png|ico|jpg|jpeg|svg|css|js|woff2?)$/)) return NextResponse.next();

    // Medewerker-app: toegankelijk voor zowel legacy als Microsoft-gebruikers
    if (pathname.startsWith('/medewerker')) {
        const hasSession =
            verifyNextAuthSession(request) ||
            verifyLegacySession(request.cookies.get('schildersapp_session')?.value);
        if (!hasSession) return NextResponse.redirect(new URL('/login', request.url));
        return NextResponse.next();
    }

    // Publieke pagina's doorlaten
    if (PUBLIC_PAGES.some(p => pathname.startsWith(p))) return NextResponse.next();

    // API-bescherming
    if (pathname.startsWith('/api/')) {
        if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
        const hasSession =
            verifyNextAuthSession(request) ||
            verifyLegacySession(request.cookies.get('schildersapp_session')?.value);
        if (!hasSession) {
            return NextResponse.json(
                { error: 'Niet ingelogd — toegang geweigerd' },
                { status: 401 }
            );
        }
        return NextResponse.next();
    }

    // Dashboard pagina's: redirect naar /login als geen sessie
    const hasSession =
        verifyNextAuthSession(request) ||
        verifyLegacySession(request.cookies.get('schildersapp_session')?.value);
    if (!hasSession) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}
