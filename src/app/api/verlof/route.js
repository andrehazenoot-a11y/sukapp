import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_verlof (
    id BIGINT NOT NULL,
    medewerker_id VARCHAR(50) NOT NULL,
    medewerker_naam VARCHAR(100) DEFAULT NULL,
    type VARCHAR(50) NOT NULL,
    van DATE NOT NULL,
    tot DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'In behandeling',
    opmerking TEXT DEFAULT NULL,
    ingediend DATETIME DEFAULT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_medewerker (medewerker_id)
)`;

// GET /api/verlof?userId=X  → alle verlofaanvragen van een medewerker
// GET /api/verlof?jaar=X    → alle verlofaanvragen van een jaar (voor beheerder)
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const jaar   = searchParams.get('jaar');

    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        let rows;
        if (userId) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_verlof WHERE medewerker_id = ? ORDER BY van DESC`,
                [String(userId)]
            );
        } else if (jaar) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_verlof WHERE YEAR(van) = ? ORDER BY van DESC`,
                [Number(jaar)]
            );
        } else {
            return NextResponse.json({ error: 'userId of jaar verplicht' }, { status: 400 });
        }

        const parsed = rows.map(r => ({
            id:        Number(r.id),
            type:      r.type,
            van:       r.van instanceof Date ? r.van.toISOString().slice(0,10) : r.van,
            tot:       r.tot instanceof Date ? r.tot.toISOString().slice(0,10) : r.tot,
            status:    r.status,
            naam:      r.medewerker_naam,
            opmerking: r.opmerking || '',
            ingediend: r.ingediend ? new Date(r.ingediend).toISOString() : null,
        }));
        return NextResponse.json(parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/verlof — upsert één verlofentry
// Body: { userId, userName, entry: { id, type, van, tot, status, opmerking, ingediend } }
export async function POST(req) {
    try {
        const { userId, userName, entry } = await req.json();
        if (!userId || !entry || !entry.id || !entry.van || !entry.type) {
            return NextResponse.json({ error: 'userId, entry.id, entry.van en entry.type zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        await pool.query(
            `INSERT INTO schilders_verlof (id, medewerker_id, medewerker_naam, type, van, tot, status, opmerking, ingediend)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                medewerker_naam = VALUES(medewerker_naam),
                type = VALUES(type),
                van = VALUES(van),
                tot = VALUES(tot),
                status = VALUES(status),
                opmerking = VALUES(opmerking),
                bijgewerkt_op = CURRENT_TIMESTAMP`,
            [
                Number(entry.id),
                String(userId),
                userName || null,
                entry.type,
                entry.van,
                entry.tot || entry.van,
                entry.status || 'In behandeling',
                entry.opmerking || null,
                entry.ingediend ? new Date(entry.ingediend) : new Date(),
            ]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/verlof — verwijder één verlofentry
// Body: { id, userId }
export async function DELETE(req) {
    try {
        const { id, userId } = await req.json();
        if (!id || !userId) {
            return NextResponse.json({ error: 'id en userId zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(
            `DELETE FROM schilders_verlof WHERE id = ? AND medewerker_id = ?`,
            [Number(id), String(userId)]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PATCH /api/verlof — status updaten (voor beheerder)
// Body: { id, status }
export async function PATCH(req) {
    try {
        const { id, status } = await req.json();
        if (!id || !status) {
            return NextResponse.json({ error: 'id en status zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(
            `UPDATE schilders_verlof SET status = ?, bijgewerkt_op = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, Number(id)]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
