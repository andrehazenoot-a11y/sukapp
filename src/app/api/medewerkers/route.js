import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_medewerkers (
    id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'werknemer',
    naam VARCHAR(150) NOT NULL,
    data JSON NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)`;

// GET /api/medewerkers → alle medewerkers/zzp'ers
export async function GET() {
    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const [rows] = await pool.query(
            `SELECT id, type, naam, data FROM schilders_medewerkers ORDER BY naam ASC`
        );
        const items = rows.map(r => ({
            ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
            id: Number(r.id),
            type: r.type,
            naam: r.naam,
        }));
        return NextResponse.json(items);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/medewerkers — upsert één medewerker (body: object met .id)
export async function POST(req) {
    try {
        const item = await req.json();
        if (!item || !item.id) {
            return NextResponse.json({ error: 'item.id verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await pool.query(
            `INSERT INTO schilders_medewerkers (id, type, naam, data)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE type=VALUES(type), naam=VALUES(naam), data=VALUES(data), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [Number(item.id), item.type || 'werknemer', item.naam || '', JSON.stringify(item)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/medewerkers?id=X
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_medewerkers WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
