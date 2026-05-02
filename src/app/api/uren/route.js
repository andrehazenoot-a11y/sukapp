import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_uren_weken (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medewerker_id VARCHAR(50) NOT NULL,
    medewerker_naam VARCHAR(100) DEFAULT NULL,
    week INT NOT NULL,
    jaar INT NOT NULL,
    data JSON NOT NULL,
    status VARCHAR(20) DEFAULT 'concept',
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_med_week_jaar (medewerker_id, week, jaar)
)`;

// GET /api/uren?week=X&jaar=Y               → alle medewerkers voor een week
// GET /api/uren?userId=X&week=X&jaar=Y      → één medewerker één week
// GET /api/uren?userId=X&jaar=Y             → alle weken van een jaar
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const week   = searchParams.get('week');
    const jaar   = searchParams.get('jaar');

    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        let rows;
        if (userId && week && jaar) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_uren_weken WHERE medewerker_id = ? AND week = ? AND jaar = ?`,
                [userId, Number(week), Number(jaar)]
            );
        } else if (userId && jaar) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_uren_weken WHERE medewerker_id = ? AND jaar = ? ORDER BY week ASC`,
                [userId, Number(jaar)]
            );
        } else if (week && jaar) {
            [rows] = await pool.query(
                `SELECT * FROM schilders_uren_weken WHERE week = ? AND jaar = ? ORDER BY medewerker_naam ASC`,
                [Number(week), Number(jaar)]
            );
        } else {
            return NextResponse.json({ error: 'week+jaar of userId vereist' }, { status: 400 });
        }

        // data is JSON string in DB, parse it
        const parsed = rows.map(r => ({ ...r, data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data }));
        return NextResponse.json(parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/uren — UPSERT week data
// Body: { userId, userName, week, jaar, data, status }
export async function POST(req) {
    try {
        const { userId, userName, week, jaar, data, status } = await req.json();
        if (!userId || !week || !jaar || !data) {
            return NextResponse.json({ error: 'userId, week, jaar en data zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        await pool.query(
            `INSERT INTO schilders_uren_weken (medewerker_id, medewerker_naam, week, jaar, data, status)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                medewerker_naam = VALUES(medewerker_naam),
                data = VALUES(data),
                status = VALUES(status),
                bijgewerkt_op = CURRENT_TIMESTAMP`,
            [String(userId), userName || null, Number(week), Number(jaar), JSON.stringify(data), status || 'concept']
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PATCH /api/uren — alleen status updaten
// Body: { userId, week, jaar, status }
export async function PATCH(req) {
    try {
        const { userId, week, jaar, status } = await req.json();
        if (!userId || !week || !jaar || !status) {
            return NextResponse.json({ error: 'userId, week, jaar en status zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        await pool.query(
            `UPDATE schilders_uren_weken SET status = ?, bijgewerkt_op = CURRENT_TIMESTAMP
             WHERE medewerker_id = ? AND week = ? AND jaar = ?`,
            [status, String(userId), Number(week), Number(jaar)]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/uren — verwijder één week van één medewerker
// Body: { userId, week, jaar }
export async function DELETE(req) {
    try {
        const { userId, week, jaar } = await req.json();
        if (!userId || !week || !jaar) {
            return NextResponse.json({ error: 'userId, week en jaar zijn verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(
            `DELETE FROM schilders_uren_weken WHERE medewerker_id = ? AND week = ? AND jaar = ?`,
            [String(userId), Number(week), Number(jaar)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
