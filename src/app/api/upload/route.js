import { NextResponse } from 'next/server';
import FormData from 'form-data';

const SYNO_HOST = process.env.SYNOLOGY_HOST;
const SYNO_USER = process.env.SYNOLOGY_USER;
const SYNO_PASS = process.env.SYNOLOGY_PASS;
const SYNO_BASE = process.env.SYNOLOGY_UPLOAD_PATH || '/homes/Andrehazenoot/schildersapp';

// SID cache — 10 minuten geldig
let cachedSid = null;
let sidExpiry = 0;

async function getSynologySid() {
    const now = Date.now();
    if (cachedSid && now < sidExpiry) return cachedSid;
    const url = `${SYNO_HOST}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(SYNO_USER)}&passwd=${encodeURIComponent(SYNO_PASS)}&session=FileStation&format=sid`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) { cachedSid = null; throw new Error(`Synology auth mislukt: code ${data.error?.code}`); }
    cachedSid = data.data.sid;
    sidExpiry = now + 10 * 60 * 1000;
    return cachedSid;
}

// Maak een map aan als die niet bestaat
async function ensureFolder(sid, folderPath) {
    const parts = folderPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
        const parent = current || '/';
        current = `${current}/${part}`;
        const url = `${SYNO_HOST}/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&version=2&method=create&folder_path=${encodeURIComponent(parent)}&name=${encodeURIComponent(part)}&force_parent=true&_sid=${sid}`;
        await fetch(url).catch(() => {}); // negeer als map al bestaat
    }
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const projectId = formData.get('projectId') || 'algemeen';
        const category = formData.get('category') || 'uploads'; // 'notities', 'taken', 'documenten', etc.

        if (!file) {
            return NextResponse.json({ success: false, error: 'Geen bestand meegestuurd' }, { status: 400 });
        }

        // Bestandsnaam veilig maken
        const ext = file.name.split('.').pop().toLowerCase();
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const uploadPath = `${SYNO_BASE}/projecten/${projectId}/${category}`;

        // Login op Synology
        const sid = await getSynologySid();

        // Map aanmaken
        await ensureFolder(sid, uploadPath);

        // Bestand uploaden via File Station API
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        const uploadForm = new FormData();
        uploadForm.append('api', 'SYNO.FileStation.Upload');
        uploadForm.append('version', '2');
        uploadForm.append('method', 'upload');
        uploadForm.append('path', uploadPath);
        uploadForm.append('create_parents', 'true');
        uploadForm.append('overwrite', 'true');
        uploadForm.append('_sid', sid);
        uploadForm.append('file', fileBuffer, {
            filename: safeName,
            contentType: file.type || 'application/octet-stream',
        });

        const uploadRes = await fetch(`${SYNO_HOST}/webapi/entry.cgi`, {
            method: 'POST',
            body: uploadForm,
            headers: uploadForm.getHeaders(),
        });

        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
            throw new Error(`Upload mislukt: code ${uploadData.error?.code}`);
        }

        // Directe URL bouwen (via File Station sharing of directe pad)
        const fileUrl = `${SYNO_HOST}/fbdownload/${encodeURIComponent(uploadPath)}/${encodeURIComponent(safeName)}?_sid=${sid}`;

        // Betere URL: gebruik de download link
        const dlLink = await fetch(`${SYNO_HOST}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=${encodeURIComponent(uploadPath + '/' + safeName)}&mode=download&_sid=${sid}`);

        return NextResponse.json({
            success: true,
            url: `/api/file?path=${encodeURIComponent(uploadPath + '/' + safeName)}`,
            filename: safeName,
            originalName: file.name,
            size: fileBuffer.length,
            projectId,
            category,
        });

    } catch (error) {
        console.error('Upload fout:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
