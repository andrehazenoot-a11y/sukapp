import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

async function getUserToken() {
    const jar = await cookies();
    return jar.get('ms_access_token')?.value || null;
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'planId ontbreekt' }, { status: 400 });

    try {
        const token = await getAppToken();
        const res = await fetch(`https://graph.microsoft.com/v1.0/planner/plans/${planId}/tasks`, {
            headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en-US' },
        });
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        const data = await res.json();
        return NextResponse.json(data.value || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    const { planId, title, bucketId, startDateTime, dueDateTime, appliedCategories, assignments } = await req.json();
    if (!planId || !title) return NextResponse.json({ error: 'planId en title zijn vereist' }, { status: 400 });

    try {
        const token = await getAppToken();
        const body = { planId, title };
        if (bucketId) body.bucketId = bucketId;
        if (startDateTime) body.startDateTime = startDateTime;
        if (dueDateTime) body.dueDateTime = dueDateTime;
        if (appliedCategories) body.appliedCategories = appliedCategories;
        if (assignments) body.assignments = assignments;

        const res = await fetch('https://graph.microsoft.com/v1.0/planner/tasks', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Language': 'en-US' },
            body: JSON.stringify(body),
        });
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        return NextResponse.json(await res.json());
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    const { taskId, etag } = await req.json();
    if (!taskId || !etag) return NextResponse.json({ error: 'taskId en etag zijn vereist' }, { status: 400 });

    try {
        const token = await getUserToken();
        const res = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, 'If-Match': etag },
        });
        if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    const { taskId, percentComplete, etag, startDateTime, dueDateTime, appliedCategories, assignments } = await req.json();

    const body = {};
    if (percentComplete !== undefined) body.percentComplete = percentComplete;
    if (startDateTime !== undefined) body.startDateTime = startDateTime;
    if (dueDateTime !== undefined) body.dueDateTime = dueDateTime;
    if (appliedCategories !== undefined) body.appliedCategories = appliedCategories;
    if (assignments !== undefined) body.assignments = assignments;

    try {
        const token = await getUserToken();
        const res = await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}`, {
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
