import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getToolboxUser, requireToolboxAdmin } from '@/lib/toolboxAuth';
import fs from 'fs';
import path from 'path';

// GET: meeting detail
export async function GET(req, { params }) {
    const user = await getToolboxUser(req);
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

    const { id } = await params;
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query('SELECT * FROM toolbox_meetings WHERE id = ?', [id]);
        if (!rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

        const [bestanden] = await pool.query('SELECT * FROM toolbox_bestanden WHERE meeting_id = ? ORDER BY geupload_op', [id]);
        const [bev] = await pool.query('SELECT * FROM toolbox_bevestigingen WHERE meeting_id = ? AND user_id = ?', [id, user.id]);

        return NextResponse.json({ ...rows[0], bestanden, akkoordGegeven: bev.length > 0 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: meeting verwijderen (admin)
export async function DELETE(req, { params }) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { id } = await params;
    try {
        const pool = await getDbConnection();
        const [bestanden] = await pool.query('SELECT bestand_pad FROM toolbox_bestanden WHERE meeting_id = ?', [id]);

        // Verwijder bestanden van schijf
        for (const b of bestanden) {
            try { fs.unlinkSync(b.bestand_pad); } catch {}
        }
        const dir = path.join(process.cwd(), 'toolbox-uploads', String(id));
        try { fs.rmdirSync(dir); } catch {}

        await pool.query('DELETE FROM toolbox_bevestigingen WHERE meeting_id = ?', [id]);
        await pool.query('DELETE FROM toolbox_bestanden WHERE meeting_id = ?', [id]);
        await pool.query('DELETE FROM toolbox_meetings WHERE id = ?', [id]);

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
