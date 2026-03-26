import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: haal alle berichten in een conversation op
export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('id');
    if (!conversationId) return NextResponse.json({ error: 'Geen conversationId' }, { status: 400 });

    const sharedMailbox = searchParams.get('sharedMailbox') || null;

    try {
        const fields = `$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,flag,categories,conversationId&$top=50`;
        const filter = `$filter=conversationId eq '${conversationId}'`;

        // Haal berichten op uit alle relevante mailboxen
        const fetches = [
            // Persoonlijke mailbox — alle mappen (inbox, sent, etc.)
            fetch(`https://graph.microsoft.com/v1.0/me/messages?${filter}&${fields}`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        // Gedeelde mailbox (als geconfigureerd)
        if (sharedMailbox) {
            fetches.push(
                fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sharedMailbox)}/mailFolders/sentitems/messages?${filter}&${fields}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sharedMailbox)}/mailFolders/inbox/messages?${filter}&${fields}`, { headers: { Authorization: `Bearer ${token}` } }),
            );
        }

        const responses = await Promise.all(fetches);
        const alleBerichtenMap = new Map();
        for (const res of responses) {
            const data = res.ok ? await res.json() : { value: [] };
            (data.value || []).forEach(m => alleBerichtenMap.set(m.id, m));
        }

        const berichten = [...alleBerichtenMap.values()].map(m => ({
            id: m.id,
            subject: m.subject,
            from: m.from?.emailAddress
                ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>`.trim()
                : '',
            fromEmail: m.from?.emailAddress?.address?.toLowerCase() || '',
            to: (m.toRecipients || []).map(r => `${r.emailAddress?.name || ''} <${r.emailAddress?.address || ''}>`.trim()).join(', '),
            toEmails: (m.toRecipients || []).map(r => r.emailAddress?.address?.toLowerCase() || '').filter(Boolean),
            date: m.receivedDateTime,
            bodyPreview: m.bodyPreview || '',
            bodyHtml: m.body?.contentType === 'html' ? m.body.content : null,
            body: m.body?.contentType === 'text' ? m.body.content : (m.bodyPreview || ''),
            flagStatus: m.flag?.flagStatus || 'notFlagged',
            categories: m.categories || [],
            conversationId: m.conversationId,
        }));

        return NextResponse.json(berichten);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
