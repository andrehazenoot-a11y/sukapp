import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS uren_reminder_user_settings (
    medewerker_id VARCHAR(50) PRIMARY KEY,
    actief TINYINT DEFAULT 1
)`;

// GET /api/uren-reminder/user-settings → { [userId]: true/false }
export async function GET() {
    try {
        const db = await getDbConnection();
        await db.query(CREATE_TABLE);
        const [rows] = await db.query('SELECT medewerker_id, actief FROM uren_reminder_user_settings');
        const result = {};
        rows.forEach(r => { result[String(r.medewerker_id)] = !!r.actief; });
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/uren-reminder/user-settings  body: { userId, actief }
export async function POST(req) {
    try {
        const { userId, actief } = await req.json();
        const db = await getDbConnection();
        await db.query(CREATE_TABLE);
        await db.query(
            `INSERT INTO uren_reminder_user_settings (medewerker_id, actief) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE actief = VALUES(actief)`,
            [String(userId), actief ? 1 : 0]
        );
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
