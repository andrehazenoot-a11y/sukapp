import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function fetchDetail(token, id) {
    const r = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${id}?$select=id,categories,conversationId,body,bodyPreview`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? r.json() : {};
}

export async function POST(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const { subject, from } = await req.json();
    if (!subject) return NextResponse.json({ error: 'Geen onderwerp opgegeven' }, { status: 400 });

    try {
        let msg = null;

        // Poging 1: zoeken op ASCII-woorden uit het onderwerp
        const asciiWoorden = subject
            .split(/\s+/)
            .filter(w => /^[\x20-\x7E]+$/.test(w) && w.replace(/[^a-zA-Z0-9]/g, '').length > 2)
            .slice(0, 4)
            .join(' ');
        if (asciiWoorden) {
            const url = `https://graph.microsoft.com/v1.0/me/messages?$search=${encodeURIComponent('"' + asciiWoorden + '"')}&$select=id,subject,from,receivedDateTime&$top=5`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (r.ok) {
                const data = await r.json();
                if (data.value?.length) msg = data.value[0];
            }
        }

        // Poging 2: zoeken op afzender-emailadres (fallback)
        if (!msg && from) {
            const url = `https://graph.microsoft.com/v1.0/me/messages?$filter=from/emailAddress/address eq '${from}'&$select=id,subject,from,receivedDateTime&$top=10`;
            const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (r.ok) {
                const data = await r.json();
                if (data.value?.length) {
                    // Kies de email waarvan het subject het meest lijkt op het gezochte onderwerp
                    const subjectLower = subject.toLowerCase();
                    const best = data.value.reduce((prev, cur) => {
                        const score = (cur.subject || '').toLowerCase().split(' ')
                            .filter(w => w.length > 3 && subjectLower.includes(w)).length;
                        const prevScore = (prev?.subject || '').toLowerCase().split(' ')
                            .filter(w => w.length > 3 && subjectLower.includes(w)).length;
                        return score > prevScore ? cur : prev;
                    }, data.value[0]);
                    if (best) msg = best;
                }
            }
        }

        if (!msg) return NextResponse.json({ found: false });

        const detail = await fetchDetail(token, msg.id);
        const category = detail.categories?.[0] || null;
        const conversationId = detail.conversationId || null;
        const bodyHtml = detail.body?.contentType === 'html' ? detail.body.content : null;
        const bodyText = detail.body?.contentType === 'text' ? detail.body.content : (detail.bodyPreview || null);

        return NextResponse.json({ found: true, outlookId: msg.id, category, conversationId, bodyHtml, bodyText });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
