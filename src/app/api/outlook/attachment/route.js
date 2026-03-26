import { cookies } from 'next/headers';

// GET: download een bijlage via proxy (token zit server-side)
export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return new Response('Niet verbonden', { status: 401 });

    const { searchParams } = new URL(req.url);
    const msgId = searchParams.get('msgId');
    const attId = searchParams.get('attId');
    const naam = searchParams.get('naam') || 'bijlage';
    if (!msgId || !attId) return new Response('Ontbrekende parameters', { status: 400 });

    try {
        const r = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${msgId}/attachments/${attId}/$value`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!r.ok) return new Response(await r.text(), { status: r.status });

        const contentType = r.headers.get('content-type') || 'application/octet-stream';
        return new Response(r.body, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${naam}"`,
            },
        });
    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}
