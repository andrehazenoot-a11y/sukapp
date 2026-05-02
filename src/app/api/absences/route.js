import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_absences (
    id BIGINT NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'vakantie',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)`;

// GET /api/absences → alle afwezigheid (optioneel ?userId=X)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const where = userId ? `WHERE user_id = ?` : '';
        const params = userId ? [userId] : [];
        const [rows] = await pool.query(
            `SELECT id, user_id AS userId, type, DATE_FORMAT(start_date,'%Y-%m-%d') AS startDate, DATE_FORMAT(end_date,'%Y-%m-%d') AS endDate FROM schilders_absences ${where} ORDER BY start_date`,
            params
        );
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/absences — upsert één absence
export async function POST(req) {
    try {
        const item = await req.json();
        if (!item || !item.id || !item.userId) {
            return NextResponse.json({ error: 'id en userId verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await pool.query(
            `INSERT INTO schilders_absences (id, user_id, type, start_date, end_date)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE type=VALUES(type), start_date=VALUES(start_date), end_date=VALUES(end_date), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [item.id, item.userId, item.type || 'vakantie', item.startDate, item.endDate]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/absences?id=X
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_absences WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
