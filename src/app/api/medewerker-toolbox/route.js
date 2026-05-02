import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTables(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titel VARCHAR(255) NOT NULL,
        datum DATE NOT NULL,
        beschrijving TEXT,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_bestanden (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        originele_naam VARCHAR(255) NOT NULL,
        bestandsnaam VARCHAR(255) NOT NULL,
        bestand_pad VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        grootte INT,
        geupload_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_toolbox_eigen (
        id BIGINT NOT NULL,
        user_id INT NOT NULL,
        data JSON NOT NULL,
        bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    )`).catch(() => {});
}

// GET /api/medewerker-toolbox — centrale meetings
// GET /api/medewerker-toolbox?eigen=1&userId=X — eigen meetings van medewerker
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const pool = await getDbConnection();
        await ensureTables(pool);

        if (searchParams.get('eigen') === '1') {
            const userId = searchParams.get('userId');
            if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });
            const [rows] = await pool.query(
                `SELECT id, user_id AS userId, data FROM schilders_toolbox_eigen WHERE user_id = ? ORDER BY id DESC`,
                [userId]
            );
            const items = rows.map(r => ({ ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data), id: Number(r.id) }));
            return NextResponse.json(items);
        }

        const [meetings] = await pool.query(
            `SELECT id, titel, datum, beschrijving, aangemaakt_op FROM toolbox_meetings ORDER BY datum DESC LIMIT 20`
        );
        const [bestanden] = await pool.query(
            `SELECT tb.meeting_id, tb.id as bestand_id, tb.originele_naam
             FROM toolbox_bestanden tb
             WHERE tb.meeting_id IN (${meetings.length > 0 ? meetings.map(() => '?').join(',') : 'NULL'})`,
            meetings.map(m => m.id)
        );
        const bestandenMap = {};
        for (const b of bestanden) {
            if (!bestandenMap[b.meeting_id]) bestandenMap[b.meeting_id] = [];
            bestandenMap[b.meeting_id].push(b);
        }
        return NextResponse.json(meetings.map(m => ({
            ...m,
            bestanden: bestandenMap[m.id] || [],
        })));
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/medewerker-toolbox — sla eigen meeting op (body: meeting met .id en .userId)
export async function POST(req) {
    try {
        const item = await req.json();
        if (!item || !item.id || !item.userId) {
            return NextResponse.json({ error: 'id en userId verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await ensureTables(pool);
        await pool.query(
            `INSERT INTO schilders_toolbox_eigen (id, user_id, data)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE data=VALUES(data), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [item.id, item.userId, JSON.stringify(item)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/medewerker-toolbox?id=X
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_toolbox_eigen WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
