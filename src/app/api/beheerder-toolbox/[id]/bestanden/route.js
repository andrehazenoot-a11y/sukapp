import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// POST /api/beheerder-toolbox/[id]/bestanden — bestand uploaden
export async function POST(req, { params }) {
    const { id } = await params;
    try {
        const formData = await req.formData();
        const file = formData.get('bestand');
        if (!file) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 });

        const uploadDir = path.join(process.cwd(), 'toolbox-uploads', String(id));
        fs.mkdirSync(uploadDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const veiligNaam = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const bestandPad = path.join(uploadDir, veiligNaam);
        fs.writeFileSync(bestandPad, buffer);

        const pool = await getDbConnection();
        const [result] = await pool.query(
            'INSERT INTO toolbox_bestanden (meeting_id, originele_naam, bestandsnaam, bestand_pad, mime_type, grootte) VALUES (?, ?, ?, ?, ?, ?)',
            [id, file.name, veiligNaam, bestandPad, file.type || 'application/octet-stream', buffer.length]
        );
        return NextResponse.json({ ok: true, bestand_id: result.insertId, originele_naam: file.name });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE /api/beheerder-toolbox/[id]/bestanden?bestand_id=X
export async function DELETE(req, { params }) {
    const { id } = await params;
    const bestandId = new URL(req.url).searchParams.get('bestand_id');
    if (!bestandId) return NextResponse.json({ error: 'bestand_id verplicht' }, { status: 400 });
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query('SELECT bestand_pad FROM toolbox_bestanden WHERE id = ? AND meeting_id = ?', [bestandId, id]);
        if (rows[0]) { try { fs.unlinkSync(rows[0].bestand_pad); } catch {} }
        await pool.query('DELETE FROM toolbox_bestanden WHERE id = ?', [bestandId]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
