import { NextResponse } from 'next/server';

const SYNO_HOST = process.env.SYNOLOGY_HOST;
const SYNO_USER = process.env.SYNOLOGY_USER;
const SYNO_PASS = process.env.SYNOLOGY_PASS;

// SID cache — voorkomt re-login bij elke bestandsaanvraag
let cachedSid = null;
let sidExpiry = 0;
const SID_TTL_MS = 10 * 60 * 1000; // 10 minuten

async function getSynologySid() {
    const now = Date.now();
    if (cachedSid && now < sidExpiry) return cachedSid;

    const url = `${SYNO_HOST}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(SYNO_USER)}&passwd=${encodeURIComponent(SYNO_PASS)}&session=FileStation&format=sid`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(`Auth mislukt: code ${data.error?.code}`);

    cachedSid = data.data.sid;
    sidExpiry = now + SID_TTL_MS;
    return cachedSid;
}

// GET /api/file?path=/homes/Andrehazenoot/schildersapp/projecten/1/foto.jpg
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ error: 'Pad vereist' }, { status: 400 });
        }

        const sid = await getSynologySid();
        const downloadUrl = `${SYNO_HOST}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=${encodeURIComponent(filePath)}&mode=download&_sid=${sid}`;

        const fileRes = await fetch(downloadUrl);

        if (!fileRes.ok) {
            return NextResponse.json({ error: 'Bestand niet gevonden op Synology' }, { status: 404 });
        }

        const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
        const buffer = await fileRes.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // 24 uur cache
                'Content-Length': buffer.byteLength.toString(),
            },
        });

    } catch (error) {
        console.error('File proxy fout:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
