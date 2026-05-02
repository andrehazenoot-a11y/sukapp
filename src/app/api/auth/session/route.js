import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'schildersapp-intern-2024-xK9mP';

function sign(payload) {
    const data = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    return Buffer.from(JSON.stringify({ data, sig })).toString('base64');
}

export function verifyToken(token) {
    if (!token) return null;
    try {
        const { data, sig } = JSON.parse(Buffer.from(token, 'base64').toString());
        const expected = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
        if (sig !== expected) return null;
        return JSON.parse(data);
    } catch { return null; }
}

// POST — login: zet sessie-cookie
export async function POST(req) {
    try {
        const { id, username, role } = await req.json();
        if (!id || !username) return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 });
        const token = sign({ id, username, role, ts: Date.now() });
        const res = NextResponse.json({ ok: true });
        res.cookies.set('schildersapp_session', token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 dagen
        });
        return res;
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE — logout: verwijder sessie-cookie
export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('schildersapp_session');
    return res;
}

// GET — controleer sessie (optioneel)
export async function GET(req) {
    const token = req.cookies.get('schildersapp_session')?.value;
    const payload = verifyToken(token);
    return NextResponse.json({ user: payload });
}
