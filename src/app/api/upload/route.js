import { NextResponse } from 'next/server';
import { Client } from 'ssh2';
import { Readable } from 'stream';

const SYNO_HOST = process.env.SYNOLOGY_HOST_IP || '192.168.1.70';
const SYNO_USER = process.env.SYNOLOGY_USER;
const SYNO_PASS = process.env.SYNOLOGY_PASS;
const SYNO_BASE = process.env.SYNOLOGY_UPLOAD_PATH || '/home/schildersapp';

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

function sftpUploadStream(webStream, remotePath) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.sftp((err, sftp) => {
                if (err) { conn.end(); return reject(err); }

                const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
                const mkdirRecursive = (d, cb) => {
                    sftp.mkdir(d, (e) => {
                        if (!e || e.code === 4) return cb(); // 4 = already exists
                        const parent = d.substring(0, d.lastIndexOf('/'));
                        if (!parent || parent === d) return cb(e);
                        mkdirRecursive(parent, (pe) => { if (pe) return cb(pe); sftp.mkdir(d, cb); });
                    });
                };

                mkdirRecursive(dir, (mkErr) => {
                    if (mkErr) { conn.end(); return reject(mkErr); }
                    const writeStream = sftp.createWriteStream(remotePath);
                    writeStream.on('close', () => { conn.end(); resolve(); });
                    writeStream.on('error', (e) => { conn.end(); reject(e); });
                    Readable.fromWeb(webStream).pipe(writeStream);
                });
            });
        });
        conn.on('error', reject);
        conn.connect({ host: SYNO_HOST, port: 22, username: SYNO_USER, password: SYNO_PASS });
    });
}

function verifySession(token) {
    if (!token) return false;
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded.data) { const p = JSON.parse(decoded.data); return !!(p.id && p.username); }
        return !!(decoded.id && decoded.username);
    } catch { return false; }
}

export async function POST(request) {
    try {
        const token = request.cookies.get('schildersapp_session')?.value;
        if (!verifySession(token)) {
            return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
        }
        const formData = await request.formData();
        const file = formData.get('file');
        const projectId = formData.get('projectId') || 'algemeen';
        const category = formData.get('category') || 'uploads';

        if (!file) {
            return NextResponse.json({ success: false, error: 'Geen bestand meegestuurd' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'Bestand is te groot (max 200 MB)' }, { status: 413 });
        }

        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const uploadDir = `${SYNO_BASE}/projecten/${projectId}/${category}`;
        const remotePath = `${uploadDir}/${safeName}`;

        await sftpUploadStream(file.stream(), remotePath);

        return NextResponse.json({
            success: true,
            url: `/api/file?path=${encodeURIComponent(uploadDir + '/' + safeName)}`,
            filename: safeName,
            originalName: file.name,
            size: file.size,
            projectId,
            category,
        });

    } catch (error) {
        console.error('Upload fout:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
