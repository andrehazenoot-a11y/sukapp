import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

let _migrated = false;
async function ensureMigration(db) {
    if (_migrated) return;
    await db.query(`ALTER TABLE bouwinspectie_tekeningen MODIFY COLUMN project_id BIGINT NOT NULL`).catch(() => {});
    await db.query(`ALTER TABLE bouwinspectie_pins MODIFY COLUMN project_id BIGINT NOT NULL`).catch(() => {});
    _migrated = true;
}

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        await ensureMigration(db);
        const [rows] = await db.query(
            `SELECT * FROM bouwinspectie_tekeningen WHERE project_id = ? ORDER BY volgorde, id`,
            [id]
        );
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        await ensureMigration(db);
        const body = await req.json();
        const { naam, bestand_url, bestandstype, volgorde } = body;
        const [result] = await db.query(
            `INSERT INTO bouwinspectie_tekeningen (project_id, naam, bestand_url, bestandstype, volgorde) VALUES (?, ?, ?, ?, ?)`,
            [id, naam, bestand_url, bestandstype || 'image/jpeg', volgorde || 0]
        );
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_tekeningen WHERE id = ?`, [result.insertId]);
        return NextResponse.json(rows[0]);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
