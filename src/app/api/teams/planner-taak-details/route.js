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

// GET /api/teams/planner-taak-details?taskId=xxx
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId ontbreekt' }, { status: 400 });

    try {
        const token = await getAppToken();
        const res = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}/details`, {
            headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en-US' },
        });
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        return NextResponse.json(await res.json());
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/teams/planner-taak-details  { taskId, description, checklist, etag }
export async function PATCH(req) {
    const { taskId, description, checklist, references, etag } = await req.json();
    if (!taskId || !etag) return NextResponse.json({ error: 'taskId en etag zijn vereist' }, { status: 400 });

    const body = {};
    if (description !== undefined) body.description = description;
    if (checklist !== undefined) body.checklist = checklist;
    if (references !== undefined) body.references = references;

    try {
        const token = await getAppToken();
        const res = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}/details`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'If-Match': etag,
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
