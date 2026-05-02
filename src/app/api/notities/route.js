import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_notities (
    id BIGINT NOT NULL,
    medewerker_id VARCHAR(50) NOT NULL,
    medewerker_naam VARCHAR(100) DEFAULT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'memo',
    titel VARCHAR(255) NOT NULL,
    inhoud TEXT DEFAULT NULL,
    items JSON DEFAULT NULL,
    kleur VARCHAR(20) DEFAULT 'wit',
    datum DATETIME NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_medewerker (medewerker_id)
)`;

// GET /api/notities?userId=X
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });

    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        const [rows] = await pool.query(
            `SELECT * FROM schilders_notities WHERE medewerker_id = ? ORDER BY datum DESC`,
            [String(userId)]
        );

        const parsed = rows.map(r => ({
            id:     Number(r.id),
            type:   r.type,
            titel:  r.titel,
            inhoud: r.inhoud || '',
            items:  typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
            kleur:  r.kleur || 'wit',
            datum:  r.datum instanceof Date ? r.datum.toISOString() : r.datum,
        }));
        return NextResponse.json(parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/notities — upsert één notitie
// Body: { userId, userName, notitie: { id, type, titel, inhoud, items, kleur, datum } }
export async function POST(req) {
    try {
        const { userId, userName, notitie } = await req.json();
        if (!userId || !notitie || !notitie.id || !notitie.titel) {
            return NextResponse.json({ error: 'userId, notitie.id en notitie.titel zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        await pool.query(
            `INSERT INTO schilders_notities (id, medewerker_id, medewerker_naam, type, titel, inhoud, items, kleur, datum)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                medewerker_naam = VALUES(medewerker_naam),
                type = VALUES(type),
                titel = VALUES(titel),
                inhoud = VALUES(inhoud),
                items = VALUES(items),
                kleur = VALUES(kleur),
                bijgewerkt_op = CURRENT_TIMESTAMP`,
            [
                Number(notitie.id),
                String(userId),
                userName || null,
                notitie.type || 'memo',
                notitie.titel,
                notitie.inhoud || null,
                JSON.stringify(notitie.items || []),
                notitie.kleur || 'wit',
                notitie.datum ? new Date(notitie.datum) : new Date(),
            ]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/notities — verwijder één notitie
// Body: { id, userId }
export async function DELETE(req) {
    try {
        const { id, userId } = await req.json();
        if (!id || !userId) {
            return NextResponse.json({ error: 'id en userId zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(
            `DELETE FROM schilders_notities WHERE id = ? AND medewerker_id = ?`,
            [Number(id), String(userId)]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
