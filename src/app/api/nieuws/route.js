import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTable(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_nieuws (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titel VARCHAR(300) NOT NULL,
        bericht TEXT DEFAULT NULL,
        foto MEDIUMTEXT DEFAULT NULL,
        auteur VARCHAR(100) DEFAULT NULL,
        auteur_id INT DEFAULT NULL,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// GET /api/nieuws — alle berichten ophalen
export async function GET() {
    try {
        const pool = await getDbConnection();
        await ensureTable(pool);
        const [rows] = await pool.query(
            `SELECT * FROM schilders_nieuws ORDER BY aangemaakt_op DESC LIMIT 20`
        );
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/nieuws — nieuw bericht aanmaken
export async function POST(req) {
    try {
        const { titel, bericht, foto, auteur, auteur_id } = await req.json();
        if (!titel?.trim()) return NextResponse.json({ error: 'Titel verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await ensureTable(pool);
        const [result] = await pool.query(
            `INSERT INTO schilders_nieuws (titel, bericht, foto, auteur, auteur_id) VALUES (?, ?, ?, ?, ?)`,
            [titel.trim(), bericht?.trim() || null, foto || null, auteur || null, auteur_id || null]
        );
        const [rows] = await pool.query(`SELECT * FROM schilders_nieuws WHERE id = ?`, [result.insertId]);
        return NextResponse.json(rows[0], { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
