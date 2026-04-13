import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import fs from 'fs';

// DELETE /api/beheerder-toolbox/[id] — meeting + bestanden verwijderen
export async function DELETE(req, { params }) {
    const { id } = await params;
    try {
        const pool = await getDbConnection();
        const [bestanden] = await pool.query('SELECT bestand_pad FROM toolbox_bestanden WHERE meeting_id = ?', [id]);
        for (const b of bestanden) {
            try { fs.unlinkSync(b.bestand_pad); } catch {}
        }
        await pool.query('DELETE FROM toolbox_bestanden WHERE meeting_id = ?', [id]);
        await pool.query('DELETE FROM toolbox_meetings WHERE id = ?', [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
