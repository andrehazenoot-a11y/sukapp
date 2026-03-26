import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const { teamId, kanaalId, onderwerp, van, inhoud } = await req.json();
    if (!teamId || !kanaalId) {
        return NextResponse.json({ error: 'teamId en kanaalId zijn vereist' }, { status: 400 });
    }

    const berichtHtml = `
        <b>📧 ${onderwerp || '(geen onderwerp)'}</b><br>
        <span style="color:#666">Van: ${van || 'Onbekend'}</span><br><br>
        ${inhoud || ''}
    `.trim();

    try {
        const res = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${kanaalId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                body: { contentType: 'html', content: berichtHtml },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[kanaal-bericht] Mislukt:', res.status, err);
            return NextResponse.json({ error: err }, { status: res.status });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
