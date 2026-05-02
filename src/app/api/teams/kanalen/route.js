import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    if (!groupId) return NextResponse.json({ error: 'groupId ontbreekt' }, { status: 400 });

    try {
        const jar = await cookies();
        const token = jar.get('ms_access_token')?.value;
        if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });
        const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${groupId}/channels`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        const data = await res.json();
        return NextResponse.json((data.value || []).map(c => ({ id: c.id, naam: c.displayName, url: c.webUrl })));
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
