import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLES = [
    `CREATE TABLE IF NOT EXISTS schilders_contracten (
        id BIGINT NOT NULL,
        medewerker_id VARCHAR(50),
        data JSON NOT NULL,
        bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    )`,
    `CREATE TABLE IF NOT EXISTS schilders_wa_instellingen (
        sleutel VARCHAR(50) NOT NULL,
        waarde MEDIUMTEXT NOT NULL,
        bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (sleutel)
    )`,
];

async function ensureTables(pool) {
    for (const sql of CREATE_TABLES) await pool.query(sql);
}

// GET /api/contracten → alle contracten
// GET /api/contracten?instellingen=1 → wa-instellingen (briefpapier, templates)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const pool = await getDbConnection();
        await ensureTables(pool);

        if (searchParams.get('instellingen') === '1') {
            const [rows] = await pool.query(`SELECT sleutel, waarde FROM schilders_wa_instellingen`);
            const result = {};
            for (const r of rows) {
                try { result[r.sleutel] = JSON.parse(r.waarde); } catch { result[r.sleutel] = r.waarde; }
            }
            return NextResponse.json(result);
        }

        const [rows] = await pool.query(`SELECT data FROM schilders_contracten ORDER BY id DESC`);
        const items = rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
        return NextResponse.json(items);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/contracten — upsert één contract (body: contract met .id)
export async function POST(req) {
    try {
        const item = await req.json();
        if (!item || !item.id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await ensureTables(pool);
        await pool.query(
            `INSERT INTO schilders_contracten (id, medewerker_id, data)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE medewerker_id=VALUES(medewerker_id), data=VALUES(data), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [Number(item.id), item.medewerkerId ? String(item.medewerkerId) : null, JSON.stringify(item)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PUT /api/contracten — sla wa-instelling op (body: { sleutel, waarde })
export async function PUT(req) {
    try {
        const { sleutel, waarde } = await req.json();
        if (!sleutel) return NextResponse.json({ error: 'sleutel verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await ensureTables(pool);
        const opslaan = typeof waarde === 'string' ? waarde : JSON.stringify(waarde);
        await pool.query(
            `INSERT INTO schilders_wa_instellingen (sleutel, waarde)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE waarde=VALUES(waarde), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [sleutel, opslaan]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/contracten?id=X
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_contracten WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
