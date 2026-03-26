import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: haal de volledige HTML body op + attachment-lijst voor cid: vervanging client-side
export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Geen id' }, { status: 400 });

    try {
        const r = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${id}?$select=body`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: r.status });

        const data = await r.json();
        const bodyHtml = data.body?.contentType === 'html' ? data.body.content : null;
        const bodyText = data.body?.contentType === 'text' ? data.body.content : null;

        // Vervang cid: afbeeldingen door inline data URIs (contentBytes) — werkt altijd in srcdoc iframes
        let resolvedHtml = bodyHtml;
        if (bodyHtml && bodyHtml.includes('cid:')) {
            const attRes = await fetch(
                `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(id)}/attachments?$select=id,contentId,name,contentType,contentBytes&$top=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (attRes.ok) {
                const attData = await attRes.json();
                for (const att of (attData.value || [])) {
                    if (!att.contentId || !att.contentBytes) continue;
                    const cid = att.contentId.replace(/[<>]/g, '');
                    const dataUrl = `data:${att.contentType || 'image/png'};base64,${att.contentBytes}`;
                    resolvedHtml = resolvedHtml.split(`cid:${cid}`).join(dataUrl);
                }
            }
        }

        return NextResponse.json({ bodyHtml: resolvedHtml, bodyText, attachments: [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
