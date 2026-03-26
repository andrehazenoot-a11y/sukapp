import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: haal de lijst van bijlagen op voor een email
export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Geen id' }, { status: 400 });

    try {
        const r = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${id}/attachments?$select=id,name,size,contentType,isInline&$filter=isInline eq false`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: r.status });

        const data = await r.json();
        const bijlagen = (data.value || []).map(a => ({
            id: a.id,
            name: a.name,
            size: a.size,
            contentType: a.contentType,
        }));
        return NextResponse.json(bijlagen);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
