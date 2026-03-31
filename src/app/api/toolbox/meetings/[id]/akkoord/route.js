import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getToolboxUser } from '@/lib/toolboxAuth';

// POST: akkoord geven
export async function POST(req, { params }) {
    const user = await getToolboxUser(req);
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

    const { id } = await params;
    try {
        const pool = await getDbConnection();
        await pool.query(
            'INSERT IGNORE INTO toolbox_bevestigingen (meeting_id, user_id) VALUES (?, ?)',
            [id, user.id]
        );
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
