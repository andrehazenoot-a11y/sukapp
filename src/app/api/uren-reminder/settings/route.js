import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS uren_reminder_settings (
    id INT PRIMARY KEY DEFAULT 1,
    dag TINYINT DEFAULT 5,
    tijd VARCHAR(5) DEFAULT '13:00',
    actief TINYINT DEFAULT 1,
    bericht TEXT,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const DEFAULT_BERICHT = 'Beste {naam}, je hebt je uren voor week {week} nog niet ingediend. Kun je dit zo snel mogelijk doen? 🙏';

export async function GET() {
    try {
        const db = await getDbConnection();
        await db.query(CREATE_TABLE);
        const [rows] = await db.query('SELECT * FROM uren_reminder_settings WHERE id = 1');
        if (rows.length === 0) {
            return NextResponse.json({ dag: 5, tijd: '13:00', actief: true, bericht: DEFAULT_BERICHT });
        }
        const r = rows[0];
        return NextResponse.json({ dag: r.dag, tijd: r.tijd, actief: !!r.actief, bericht: r.bericht || DEFAULT_BERICHT });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { dag, tijd, actief, bericht } = await req.json();
        const db = await getDbConnection();
        await db.query(CREATE_TABLE);
        await db.query(
            `INSERT INTO uren_reminder_settings (id, dag, tijd, actief, bericht) VALUES (1, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE dag = VALUES(dag), tijd = VALUES(tijd), actief = VALUES(actief), bericht = VALUES(bericht)`,
            [dag, tijd, actief ? 1 : 0, bericht || DEFAULT_BERICHT]
        );
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
