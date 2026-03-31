import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { requireToolboxAdmin } from '@/lib/toolboxAuth';

// GET: wie heeft deze meeting gelezen (admin)
export async function GET(req, { params }) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { id } = await params;
    try {
        const pool = await getDbConnection();

        const [gelezen] = await pool.query(
            `SELECT u.id, u.naam, u.email, b.gelezen_op
             FROM toolbox_bevestigingen b
             JOIN toolbox_users u ON b.user_id = u.id
             WHERE b.meeting_id = ?
             ORDER BY b.gelezen_op`,
            [id]
        );

        const [alleUsers] = await pool.query(
            'SELECT id, naam, email FROM toolbox_users WHERE rol = ?', ['medewerker']
        );

        const gelezenIds = new Set(gelezen.map(g => g.id));
        const nogNietGelezen = alleUsers.filter(u => !gelezenIds.has(u.id));

        return NextResponse.json({ gelezen, nogNietGelezen });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
