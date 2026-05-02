import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_vakantiedagen (
    user_id INT NOT NULL,
    jaar INT NOT NULL,
    dagen JSON NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, jaar)
)`;

// GET /api/vakantiedagen?userId=X&jaar=Y
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const jaar   = searchParams.get('jaar');
        if (!userId || !jaar) return NextResponse.json({ error: 'userId en jaar verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const [rows] = await pool.query(
            `SELECT dagen FROM schilders_vakantiedagen WHERE user_id = ? AND jaar = ?`,
            [userId, Number(jaar)]
        );
        const dagen = rows.length > 0 ? (typeof rows[0].dagen === 'string' ? JSON.parse(rows[0].dagen) : rows[0].dagen) : [];
        return NextResponse.json(dagen);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/vakantiedagen — sla dag-array op voor user+jaar
// Body: { userId, jaar, dagen: [...] }
export async function POST(req) {
    try {
        const { userId, jaar, dagen } = await req.json();
        if (!userId || !jaar || !Array.isArray(dagen)) {
            return NextResponse.json({ error: 'userId, jaar en dagen (array) verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await pool.query(
            `INSERT INTO schilders_vakantiedagen (user_id, jaar, dagen)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE dagen = VALUES(dagen), bijgewerkt_op = CURRENT_TIMESTAMP`,
            [userId, Number(jaar), JSON.stringify(dagen)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
