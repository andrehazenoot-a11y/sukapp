import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getToken() {
    const jar = await cookies();
    return jar.get('ms_access_token')?.value || null;
}

export async function DELETE(req) {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Niet verbonden met Microsoft' }, { status: 401 });

    const { teamId, kanaalId } = await req.json();
    if (!teamId || !kanaalId) return NextResponse.json({ error: 'teamId en kanaalId zijn vereist' }, { status: 400 });

    const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${kanaalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
}
