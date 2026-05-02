import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_toegang (
    user_id VARCHAR(50) NOT NULL,
    permissions JSON NOT NULL,
    uren_types JSON,
    uren_rol VARCHAR(20),
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
)`;

// GET /api/toegang → alle rechten (alle users)
// GET /api/toegang?userId=X → rechten voor één user
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        let rows;
        if (userId) {
            [rows] = await pool.query(`SELECT * FROM schilders_toegang WHERE user_id = ?`, [String(userId)]);
        } else {
            [rows] = await pool.query(`SELECT * FROM schilders_toegang`);
        }

        const parsed = rows.map(r => ({
            userId: r.user_id,
            permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
            urenTypes: r.uren_types ? (typeof r.uren_types === 'string' ? JSON.parse(r.uren_types) : r.uren_types) : null,
            urenRol: r.uren_rol || null,
        }));
        return NextResponse.json(userId ? (parsed[0] || null) : parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/toegang — upsert rechten voor één user
// Body: { userId, permissions, urenTypes?, urenRol? }
export async function POST(req) {
    try {
        const { userId, permissions, urenTypes, urenRol } = await req.json();
        if (!userId || !Array.isArray(permissions)) {
            return NextResponse.json({ error: 'userId en permissions (array) verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await pool.query(
            `INSERT INTO schilders_toegang (user_id, permissions, uren_types, uren_rol)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE permissions=VALUES(permissions), uren_types=VALUES(uren_types), uren_rol=VALUES(uren_rol), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [String(userId), JSON.stringify(permissions), urenTypes ? JSON.stringify(urenTypes) : null, urenRol || null]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
