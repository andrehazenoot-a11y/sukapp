import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_materieel (
    item_id VARCHAR(30) NOT NULL,
    data JSON NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id)
)`;

// GET /api/materieel → alle items
export async function GET() {
    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const [rows] = await pool.query(`SELECT data FROM schilders_materieel ORDER BY item_id`);
        const items = rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
        return NextResponse.json(items);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/materieel — upsert één item
// Body: item object (moet .id hebben)
export async function POST(req) {
    try {
        const item = await req.json();
        if (!item || !item.id) {
            return NextResponse.json({ error: 'item.id verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await pool.query(
            `INSERT INTO schilders_materieel (item_id, data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data), bijgewerkt_op = CURRENT_TIMESTAMP`,
            [String(item.id), JSON.stringify(item)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PUT /api/materieel — bulk upsert (array van items)
// Body: array van items
export async function PUT(req) {
    try {
        const items = await req.json();
        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Array verwacht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        for (const item of items) {
            if (!item?.id) continue;
            await pool.query(
                `INSERT INTO schilders_materieel (item_id, data)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE data = VALUES(data), bijgewerkt_op = CURRENT_TIMESTAMP`,
                [String(item.id), JSON.stringify(item)]
            );
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/materieel?id=X — verwijder één item
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_materieel WHERE item_id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
