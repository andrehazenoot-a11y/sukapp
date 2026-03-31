import { NextResponse } from 'next/server';

const TENANT = 'cd3d3914-6711-4801-9d09-f83f5a0645d3';
const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;

async function getAppToken() {
    const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
        }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('App token ophalen mislukt');
    return data.access_token;
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    const kanaalId = searchParams.get('kanaalId');
    if (!teamId || !kanaalId) return NextResponse.json({ error: 'teamId en kanaalId zijn vereist' }, { status: 400 });

    try {
        const token = req.cookies.get('ms_access_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Niet ingelogd met Microsoft (token mist). Klik op Verbinden met Outlook.' }, { status: 401 });
        }
        
        // 1. Probeer e-mailadres op te halen
        let email = null;
        try {
            const chanRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${kanaalId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (chanRes.ok) {
                const chanData = await chanRes.json();
                email = chanData.email;
            }
        } catch (e) {}

        const res = await fetch(
            `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${kanaalId}/messages?$top=30`,
            { headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en-US' } }
        );
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        const data = await res.json();
        const berichten = (data.value || [])
            .filter(m => m.messageType === 'message' && !m.deletedDateTime)
            .map(m => ({
                id: m.id,
                from: m.from?.user?.displayName || m.from?.application?.displayName || 'App',
                subject: m.subject || '',
                body: m.body?.content || '',
                contentType: m.body?.contentType || 'text',
                tijd: m.createdDateTime,
                bijlagen: m.attachments?.length || 0
            }));
        return NextResponse.json({ email, berichten });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
