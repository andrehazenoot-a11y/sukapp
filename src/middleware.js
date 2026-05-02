import { NextResponse } from 'next/server';

// API-paden die GEEN login vereisen
const PUBLIC_PREFIXES = [
    '/api/auth/',
    '/api/outlook/auth',
    '/api/meerwerk-akkoord',
    '/api/toolbox',
    '/api/beheerder-toolbox',
    '/api/medewerker-toolbox',
];

function verifySession(token) {
    if (!token) return false;
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        // Server-signed format: { data: JSON.stringify(payload), sig }
        if (decoded.data) {
            const payload = JSON.parse(decoded.data);
            return !!(payload.id && payload.username);
        }
        // Client-side format: { id, username, role }
        return !!(decoded.id && decoded.username);
    } catch {
        return false;
    }
}

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Alleen /api/* routes beschermen
    if (!pathname.startsWith('/api/')) return NextResponse.next();

    // Publieke paden doorlaten
    if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();

    // Sessie-cookie controleren
    const token = request.cookies.get('schildersapp_session')?.value;
    if (!verifySession(token)) {
        return NextResponse.json(
            { error: 'Niet ingelogd — toegang geweigerd' },
            { status: 401 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
