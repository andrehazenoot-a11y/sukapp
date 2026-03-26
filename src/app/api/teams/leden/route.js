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

// GET /api/teams/leden?teamId=xxx
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'teamId ontbreekt' }, { status: 400 });

    try {
        const token = await getAppToken();

        // Probeer eerst /teams/{id}/members (vereist TeamMember.Read.All)
        const res = await fetch(
            `https://graph.microsoft.com/v1.0/teams/${teamId}/members?$top=100`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
            const data = await res.json();
            const leden = (data.value || [])
                .filter(m => m.displayName && m.id)
                .map(m => ({ id: m.userId || m.id, name: m.displayName, email: m.email || null }));
            return NextResponse.json(leden);
        }

        // Fallback: /groups/{id}/members (vereist GroupMember.Read.All)
        const res2 = await fetch(
            `https://graph.microsoft.com/v1.0/groups/${teamId}/members?$select=id,displayName,mail&$top=100`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res2.ok) return NextResponse.json({ error: await res2.text() }, { status: res2.status });
        const data2 = await res2.json();
        const leden2 = (data2.value || [])
            .filter(m => m.displayName && m.id)
            .map(m => ({ id: m.id, name: m.displayName, email: m.mail || null }));
        return NextResponse.json(leden2);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
