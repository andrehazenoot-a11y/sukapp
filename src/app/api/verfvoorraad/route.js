import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_verfvoorraad (
    item_id VARCHAR(50) NOT NULL,
    data JSON NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id)
)`;

// GET /api/verfvoorraad → alle verfitems
export async function GET() {
    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const [rows] = await pool.query(`SELECT data FROM schilders_verfvoorraad ORDER BY item_id`);
        const items = rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
        return NextResponse.json(items);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/verfvoorraad — upsert één item (body: item met .id)
export async function POST(req) {
    try {
        const item = await req.json();
        if (!item || !item.id) {
            return NextResponse.json({ error: 'item.id verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await pool.query(
            `INSERT INTO schilders_verfvoorraad (item_id, data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data), bijgewerkt_op = CURRENT_TIMESTAMP`,
            [String(item.id), JSON.stringify(item)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PUT /api/verfvoorraad — bulk upsert (array)
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
                `INSERT INTO schilders_verfvoorraad (item_id, data)
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

// DELETE /api/verfvoorraad?id=X
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_verfvoorraad WHERE item_id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
