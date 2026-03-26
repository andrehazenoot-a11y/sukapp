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

// POST /api/teams/upload-bijlage
// Body: { teamId, filename, contentBase64, mimeType }
// Uploadt naar SharePoint (team drive) en geeft { webUrl } terug
export async function POST(req) {
    try {
        const { teamId, filename, contentBase64, mimeType } = await req.json();
        if (!teamId || !filename || !contentBase64) {
            return NextResponse.json({ error: 'teamId, filename en contentBase64 zijn vereist' }, { status: 400 });
        }

        const token = await getAppToken();
        const fileBuffer = Buffer.from(contentBase64, 'base64');

        // Upload naar team SharePoint drive: /groups/{id}/drive/root:/SchildersApp/{filename}:/content
        const uploadRes = await fetch(
            `https://graph.microsoft.com/v1.0/groups/${teamId}/drive/root:/SchildersApp/${encodeURIComponent(filename)}:/content`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': mimeType || 'application/octet-stream',
                },
                body: fileBuffer,
            }
        );

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            return NextResponse.json({ error: `Upload mislukt: ${err}` }, { status: uploadRes.status });
        }

        const uploadData = await uploadRes.json();
        return NextResponse.json({ webUrl: uploadData.webUrl, id: uploadData.id });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
