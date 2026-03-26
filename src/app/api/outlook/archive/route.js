import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getToken() {
    const jar = await cookies();
    return jar.get('ms_access_token')?.value || null;
}

async function graphGet(token, url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Graph GET fout: ${r.status} ${await r.text()}`);
    return r.json();
}

async function graphPost(token, url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Graph POST fout: ${r.status} ${await r.text()}`);
    return r.json();
}

async function getOrCreateFolder(token, parentId, naam) {
    const listUrl = parentId
        ? `https://graph.microsoft.com/v1.0/me/mailFolders/${parentId}/childFolders?$filter=displayName eq '${encodeURIComponent(naam)}'`
        : `https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq '${encodeURIComponent(naam)}'`;

    const data = await graphGet(token, listUrl);
    if (data.value && data.value.length > 0) return data.value[0].id;

    const createUrl = parentId
        ? `https://graph.microsoft.com/v1.0/me/mailFolders/${parentId}/childFolders`
        : `https://graph.microsoft.com/v1.0/me/mailFolders`;

    const created = await graphPost(token, createUrl, { displayName: naam });
    return created.id;
}

export async function POST(req) {
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Niet verbonden met Outlook' }, { status: 401 });

    const { outlookId, projectNaam } = await req.json();
    if (!outlookId || !projectNaam) {
        return NextResponse.json({ error: 'outlookId en projectNaam zijn verplicht' }, { status: 400 });
    }

    try {
        const projectenId = await getOrCreateFolder(token, null, 'Projecten');
        const subFolderId = await getOrCreateFolder(token, projectenId, projectNaam);

        await graphPost(
            token,
            `https://graph.microsoft.com/v1.0/me/messages/${outlookId}/move`,
            { destinationId: subFolderId }
        );

        return NextResponse.json({ ok: true, folderId: subFolderId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
