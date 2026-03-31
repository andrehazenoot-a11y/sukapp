import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { requireToolboxAdmin } from '@/lib/toolboxAuth';
import fs from 'fs';
import path from 'path';

// POST: bestand uploaden (admin)
export async function POST(req, { params }) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { id } = await params;
    try {
        const formData = await req.formData();
        const file = formData.get('bestand');
        if (!file) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 });

        const uploadDir = path.join(process.cwd(), 'toolbox-uploads', String(id));
        fs.mkdirSync(uploadDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Unieke bestandsnaam om conflicten te voorkomen
        const veiligNaam = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const bestandPad = path.join(uploadDir, veiligNaam);
        fs.writeFileSync(bestandPad, buffer);

        const pool = await getDbConnection();
        const [result] = await pool.query(
            'INSERT INTO toolbox_bestanden (meeting_id, originele_naam, bestand_pad, mime_type, grootte) VALUES (?, ?, ?, ?, ?)',
            [id, file.name, bestandPad, file.type || 'application/octet-stream', buffer.length]
        );

        return NextResponse.json({ ok: true, id: result.insertId, naam: file.name });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET: bestandenlijst
export async function GET(req, { params }) {
    const { id } = await params;
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query('SELECT * FROM toolbox_bestanden WHERE meeting_id = ? ORDER BY geupload_op', [id]);
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
