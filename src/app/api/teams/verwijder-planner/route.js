import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getToken() {
    const jar = await cookies();
    return jar.get('ms_access_token')?.value || null;
}

export async function DELETE(req) {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Niet verbonden met Microsoft' }, { status: 401 });

    const { planId } = await req.json();
    if (!planId) return NextResponse.json({ error: 'planId is vereist' }, { status: 400 });

    // Planner vereist een ETag bij DELETE
    const getRes = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en-US' },
    });
    if (!getRes.ok) return NextResponse.json({ error: 'Plan niet gevonden' }, { status: 404 });
    const etag = getRes.headers.get('ETag') || '';

    const delRes = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'If-Match': etag },
    });
    if (!delRes.ok && delRes.status !== 204) {
        const err = await delRes.text();
        return NextResponse.json({ error: err }, { status: delRes.status });
    }
    return NextResponse.json({ ok: true });
}
