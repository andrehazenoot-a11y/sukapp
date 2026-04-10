import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// GET /api/documenten/[id]/gelezen — alle bevestigingen voor dit document
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();
        const [rows] = await pool.query(
            `SELECT user_id, naam, gelezen_op FROM schilders_doc_gelezen WHERE doc_id = ? ORDER BY gelezen_op ASC`,
            [id]
        );
        return NextResponse.json(rows.map(r => ({ userId: r.user_id, naam: r.naam, timestamp: r.gelezen_op })));
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/documenten/[id]/gelezen — document als gelezen markeren
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const { userId, naam } = await req.json();
        if (!userId || !naam) return NextResponse.json({ error: 'userId en naam zijn verplicht' }, { status: 400 });

        const pool = await getDbConnection();
        await pool.query(
            `INSERT INTO schilders_doc_gelezen (doc_id, user_id, naam) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE gelezen_op = gelezen_op`,
            [id, userId, naam]
        );

        const [rows] = await pool.query(
            `SELECT gelezen_op FROM schilders_doc_gelezen WHERE doc_id = ? AND user_id = ?`,
            [id, userId]
        );

        return NextResponse.json({ ok: true, timestamp: rows[0]?.gelezen_op });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
