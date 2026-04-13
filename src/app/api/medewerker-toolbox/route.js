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
}

// GET /api/medewerker-toolbox
// Geeft toolbox meetings terug voor de medewerker app (geen aparte toolbox-auth nodig)
export async function GET() {
    try {
        const pool = await getDbConnection();
        await ensureTables(pool);
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
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
