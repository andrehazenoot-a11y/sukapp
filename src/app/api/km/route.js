import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_km_ritten (
    id BIGINT NOT NULL,
    medewerker_id VARCHAR(50) NOT NULL,
    medewerker_naam VARCHAR(100) DEFAULT NULL,
    datum DATE NOT NULL,
    van VARCHAR(255) DEFAULT NULL,
    naar VARCHAR(255) DEFAULT NULL,
    km_start INT DEFAULT NULL,
    km_eind INT DEFAULT NULL,
    km INT DEFAULT NULL,
    project VARCHAR(200) DEFAULT NULL,
    doel TEXT DEFAULT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_medewerker (medewerker_id),
    KEY idx_datum (datum)
)`;

// GET /api/km?userId=X          → alle ritten van een medewerker
// GET /api/km?userId=X&jaar=X   → ritten van een jaar
// GET /api/km?userId=X&maand=YYYY-MM → ritten van een maand
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const jaar   = searchParams.get('jaar');
    const maand  = searchParams.get('maand');

    if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });

    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        let rows;
        if (maand) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_km_ritten WHERE medewerker_id = ? AND DATE_FORMAT(datum, '%Y-%m') = ? ORDER BY datum DESC`,
                [String(userId), maand]
            );
        } else if (jaar) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_km_ritten WHERE medewerker_id = ? AND YEAR(datum) = ? ORDER BY datum DESC`,
                [String(userId), Number(jaar)]
            );
        } else {
            [rows] = await pool.query(
                `SELECT * FROM schilders_km_ritten WHERE medewerker_id = ? ORDER BY datum DESC`,
                [String(userId)]
            );
        }

        const parsed = rows.map(r => ({
            id:      Number(r.id),
            datum:   r.datum instanceof Date ? r.datum.toISOString().slice(0, 10) : r.datum,
            van:     r.van || '',
            naar:    r.naar || '',
            kmStart: r.km_start,
            kmEind:  r.km_eind,
            km:      r.km,
            project: r.project || '',
            doel:    r.doel || '',
        }));
        return NextResponse.json(parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/km — upsert één rit
// Body: { userId, userName, rit: { id, datum, van, naar, kmStart, kmEind, km, project, doel } }
export async function POST(req) {
    try {
        const { userId, userName, rit } = await req.json();
        if (!userId || !rit || !rit.id || !rit.datum) {
            return NextResponse.json({ error: 'userId, rit.id en rit.datum zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        await pool.query(
            `INSERT INTO schilders_km_ritten (id, medewerker_id, medewerker_naam, datum, van, naar, km_start, km_eind, km, project, doel)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                medewerker_naam = VALUES(medewerker_naam),
                datum = VALUES(datum),
                van = VALUES(van),
                naar = VALUES(naar),
                km_start = VALUES(km_start),
                km_eind = VALUES(km_eind),
                km = VALUES(km),
                project = VALUES(project),
                doel = VALUES(doel),
                bijgewerkt_op = CURRENT_TIMESTAMP`,
            [
                Number(rit.id),
                String(userId),
                userName || null,
                rit.datum,
                rit.van || null,
                rit.naar || null,
                rit.kmStart != null ? Number(rit.kmStart) : null,
                rit.kmEind  != null ? Number(rit.kmEind)  : null,
                rit.km      != null ? Number(rit.km)      : null,
                rit.project || null,
                rit.doel    || null,
            ]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/km — verwijder één rit
// Body: { id, userId }
export async function DELETE(req) {
    try {
        const { id, userId } = await req.json();
        if (!id || !userId) {
            return NextResponse.json({ error: 'id en userId zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(
            `DELETE FROM schilders_km_ritten WHERE id = ? AND medewerker_id = ?`,
            [Number(id), String(userId)]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
