import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTable(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_verjaardagen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        naam VARCHAR(150) NOT NULL,
        datum VARCHAR(5) NOT NULL,
        notitie VARCHAR(300) DEFAULT NULL,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Bereken hoeveel dagen tot de volgende verjaardag (datum = 'MM-DD')
function dagenTot(datumMMDD) {
    const nu = new Date(); nu.setHours(0, 0, 0, 0);
    const [mm, dd] = datumMMDD.split('-').map(Number);
    const ditJaar = new Date(nu.getFullYear(), mm - 1, dd);
    let diff = Math.round((ditJaar - nu) / 86400000);
    if (diff < 0) diff = Math.round((new Date(nu.getFullYear() + 1, mm - 1, dd) - nu) / 86400000);
    return diff;
}

// GET /api/verjaardagen
export async function GET() {
    try {
        const pool = await getDbConnection();
        await ensureTable(pool);
        const [rows] = await pool.query(`SELECT * FROM schilders_verjaardagen ORDER BY naam ASC`);
        // Voeg dagenTot toe zodat de frontend kan filteren/sorteren
        const data = rows.map(r => ({ ...r, dagenTot: dagenTot(r.datum) }));
        data.sort((a, b) => a.dagenTot - b.dagenTot);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/verjaardagen
export async function POST(req) {
    try {
        const { naam, datum, notitie } = await req.json();
        if (!naam?.trim() || !datum) return NextResponse.json({ error: 'Naam en datum verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await ensureTable(pool);
        const [result] = await pool.query(
            `INSERT INTO schilders_verjaardagen (naam, datum, notitie) VALUES (?, ?, ?)`,
            [naam.trim(), datum, notitie?.trim() || null]
        );
        const [rows] = await pool.query(`SELECT * FROM schilders_verjaardagen WHERE id = ?`, [result.insertId]);
        return NextResponse.json({ ...rows[0], dagenTot: dagenTot(rows[0].datum) }, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
