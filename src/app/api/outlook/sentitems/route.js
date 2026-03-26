import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: haal recente verzonden emails op uit Sent Items
export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const top = parseInt(searchParams.get('top') || '25', 10);

    try {
        const fields = `id,subject,from,toRecipients,sentDateTime,bodyPreview,body,categories,conversationId`;
        const url = `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=${top}&$orderby=sentDateTime desc&$select=${fields}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return NextResponse.json({ error: 'Graph API fout' }, { status: res.status });

        const data = await res.json();
        const berichten = (data.value || []).map(m => ({
            id: m.id,
            subject: m.subject,
            from: m.from?.emailAddress
                ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>`.trim()
                : '',
            fromEmail: m.from?.emailAddress?.address?.toLowerCase() || '',
            to: (m.toRecipients || []).map(r => `${r.emailAddress?.name || ''} <${r.emailAddress?.address || ''}>`.trim()).join(', '),
            toEmails: (m.toRecipients || []).map(r => r.emailAddress?.address?.toLowerCase() || '').filter(Boolean),
            date: m.sentDateTime,
            bodyPreview: m.bodyPreview || '',
            bodyHtml: m.body?.contentType === 'html' ? m.body.content : null,
            body: m.body?.contentType === 'text' ? m.body.content : (m.bodyPreview || ''),
            categories: m.categories || [],
            conversationId: m.conversationId,
        }));

        return NextResponse.json(berichten);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
