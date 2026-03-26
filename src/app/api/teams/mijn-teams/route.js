import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value || null;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const res = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data.value.map(t => ({ id: t.id, naam: t.displayName })));
}
