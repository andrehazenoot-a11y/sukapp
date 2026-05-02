import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// DELETE /api/nieuws/[id]
export async function DELETE(req, { params }) {
    try {
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_nieuws WHERE id = ?`, [params.id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
