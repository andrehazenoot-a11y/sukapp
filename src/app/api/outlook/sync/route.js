import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getToken() {
    const jar = await cookies();
    return jar.get('ms_access_token')?.value || null;
}

// POST: vlag zetten of email verwijderen vanuit app
export async function POST(req) {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Niet verbonden met Outlook' }, { status: 401 });

    const { outlookId, action, category, categories } = await req.json();
    if (!outlookId) return NextResponse.json({ error: 'Geen outlookId' }, { status: 400 });

    try {
        let body;
        if (action === 'set_category') {
            body = { categories: categories ?? (category ? [category] : []) };
        } else {
            // Alleen vlag zetten — emails nooit verwijderen
            const flagMap = { flag: 'flagged', unflag: 'notFlagged', flag_complete: 'complete' };
            body = { flag: { flagStatus: flagMap[action] || 'notFlagged' } };
        }
        const patchRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${outlookId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!patchRes.ok) {
            const err = await patchRes.text();
            return NextResponse.json({ error: err }, { status: patchRes.status });
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET: check of emails nog bestaan en wat hun vlagstatus is
export async function GET(req) {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Niet verbonden met Outlook' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    if (!ids.length) return NextResponse.json([]);

    try {
        const results = await Promise.all(ids.map(async id => {
            const r = await fetch(
                `https://graph.microsoft.com/v1.0/me/messages/${id}?$select=id,flag,categories,conversationId`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (r.status === 404) return { id, deleted: true };
            if (!r.ok) return { id, deleted: false, error: true };
            const data = await r.json();
            return {
                id,
                deleted: false,
                flagStatus: data.flag?.flagStatus || 'notFlagged',
                categories: data.categories || [],
                category: data.categories?.[0] || null,
                conversationId: data.conversationId || null,
            };
        }));
        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
