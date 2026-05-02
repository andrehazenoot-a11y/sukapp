import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTables(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titel VARCHAR(255) NOT NULL,
        datum DATE NOT NULL,
        beschrijving TEXT,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_bestanden (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        originele_naam VARCHAR(255) NOT NULL,
        bestandsnaam VARCHAR(255) NOT NULL,
        bestand_pad VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        grootte INT,
        geupload_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// GET /api/beheerder-toolbox — alle meetings + bestanden
export async function GET() {
    try {
        const pool = await getDbConnection();
        await ensureTables(pool);
        const [meetings] = await pool.query(
            `SELECT id, titel, datum, beschrijving, aangemaakt_op FROM toolbox_meetings ORDER BY datum DESC`
        );
        if (meetings.length === 0) return NextResponse.json([]);
        const [bestanden] = await pool.query(
            `SELECT id as bestand_id, meeting_id, originele_naam, bestandsnaam FROM toolbox_bestanden WHERE meeting_id IN (${meetings.map(() => '?').join(',')})`,
            meetings.map(m => m.id)
        );
        const bestandenMap = {};
        for (const b of bestanden) {
            if (!bestandenMap[b.meeting_id]) bestandenMap[b.meeting_id] = [];
            bestandenMap[b.meeting_id].push(b);
        }
        return NextResponse.json(meetings.map(m => ({ ...m, bestanden: bestandenMap[m.id] || [] })));
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/beheerder-toolbox — nieuwe meeting aanmaken
export async function POST(req) {
    try {
        const { titel, datum, beschrijving } = await req.json();
        if (!titel?.trim() || !datum) return NextResponse.json({ error: 'Titel en datum verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await ensureTables(pool);
        const [result] = await pool.query(
            `INSERT INTO toolbox_meetings (titel, datum, beschrijving) VALUES (?, ?, ?)`,
            [titel.trim(), datum, beschrijving?.trim() || null]
        );
        return NextResponse.json({ ok: true, id: result.insertId }, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
