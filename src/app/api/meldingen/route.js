import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_meldingen (
    id BIGINT NOT NULL,
    van VARCHAR(100) NOT NULL,
    aan VARCHAR(100) NOT NULL,
    bericht TEXT NOT NULL,
    datum DATETIME NOT NULL,
    gelezen TINYINT(1) DEFAULT 0,
    extra JSON DEFAULT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_aan (aan),
    KEY idx_gelezen (aan, gelezen)
)`;

// GET /api/meldingen?aan=X  → meldingen voor één ontvanger
// GET /api/meldingen?alle=1 → alle meldingen (beheerder)
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const aan  = searchParams.get('aan');
    const alle = searchParams.get('alle');

    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        let rows;
        if (aan) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_meldingen WHERE aan = ? ORDER BY datum DESC LIMIT 200`,
                [aan]
            );
        } else if (alle) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_meldingen ORDER BY datum DESC LIMIT 500`
            );
        } else {
            return NextResponse.json({ error: 'aan of alle verplicht' }, { status: 400 });
        }

        const parsed = rows.map(r => ({
            id:      Number(r.id),
            van:     r.van,
            aan:     r.aan,
            bericht: r.bericht,
            datum:   r.datum instanceof Date ? r.datum.toISOString() : r.datum,
            gelezen: !!r.gelezen,
            ...(r.extra ? (() => { try { return JSON.parse(r.extra); } catch { return {}; } })() : {}),
        }));
        return NextResponse.json(parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/meldingen — maak nieuwe melding aan
// Body: { id, van, aan, bericht, datum, gelezen?, ...extra }
export async function POST(req) {
    try {
        const { id, van, aan, bericht, datum, gelezen = false, ...extra } = await req.json();
        if (!id || !van || !aan || !bericht) {
            return NextResponse.json({ error: 'id, van, aan en bericht zijn verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const extraJson = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;
        await pool.query(
            `INSERT INTO schilders_meldingen (id, van, aan, bericht, datum, gelezen, extra)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                bericht = VALUES(bericht),
                datum = VALUES(datum),
                gelezen = VALUES(gelezen),
                extra = VALUES(extra)`,
            [Number(id), van, aan, bericht, datum ? new Date(datum) : new Date(), gelezen ? 1 : 0, extraJson]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PATCH /api/meldingen — markeer als gelezen
// Body: { id } of { aan } (bulk gelezen voor ontvanger)
export async function PATCH(req) {
    try {
        const { id, aan } = await req.json();
        const pool = await getDbConnection();
        if (id) {
            await pool.query(
                `UPDATE schilders_meldingen SET gelezen = 1 WHERE id = ?`,
                [Number(id)]
            );
        } else if (aan) {
            await pool.query(
                `UPDATE schilders_meldingen SET gelezen = 1 WHERE aan = ?`,
                [aan]
            );
        } else {
            return NextResponse.json({ error: 'id of aan verplicht' }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/meldingen?id=X of body { id }
export async function DELETE(req) {
    try {
        let id;
        const { searchParams } = new URL(req.url);
        if (searchParams.get('id')) {
            id = Number(searchParams.get('id'));
        } else {
            const body = await req.json();
            id = Number(body.id);
        }
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_meldingen WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
