import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function DELETE(req, { params }) {
    try {
        const { tekId } = await params;
        const db = await getDbConnection();
        // Verwijder ook alle pins en fotos van deze tekening
        await db.query(`DELETE FROM bouwinspectie_fotos WHERE pin_id IN (SELECT id FROM bouwinspectie_pins WHERE tekening_id = ?)`, [tekId]);
        await db.query(`DELETE FROM bouwinspectie_pins WHERE tekening_id = ?`, [tekId]);
        await db.query(`DELETE FROM bouwinspectie_tekeningen WHERE id = ?`, [tekId]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
