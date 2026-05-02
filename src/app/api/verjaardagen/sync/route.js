import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// POST /api/verjaardagen/sync
// Body: { medewerkers: [{ naam, geboortedatum }] }
// Vervangt alle bestaande verjaardagen met de meegestuurde lijst
export async function POST(req) {
    try {
        const { medewerkers } = await req.json();
        if (!Array.isArray(medewerkers)) return NextResponse.json({ error: 'medewerkers array verplicht' }, { status: 400 });

        const pool = await getDbConnection();
        await pool.query(`CREATE TABLE IF NOT EXISTS schilders_verjaardagen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            naam VARCHAR(150) NOT NULL,
            datum VARCHAR(5) NOT NULL,
            notitie VARCHAR(300) DEFAULT NULL,
            aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Verwijder alle gesynchroniseerde (auto) vermeldingen — handmatig toegevoegd blijft staan via notitie marker
        await pool.query(`DELETE FROM schilders_verjaardagen WHERE notitie IS NULL OR notitie = '' OR notitie = 'auto'`);

        const ingevoegd = [];
        for (const m of medewerkers) {
            if (!m.naam || !m.geboortedatum) continue;
            // geboortedatum is YYYY-MM-DD → bewaar als MM-DD
            const mmdd = String(m.geboortedatum).slice(5, 10);
            if (!mmdd || mmdd.length !== 5) continue;
            const [result] = await pool.query(
                `INSERT INTO schilders_verjaardagen (naam, datum, notitie) VALUES (?, ?, 'auto')`,
                [m.naam, mmdd]
            );
            ingevoegd.push({ id: result.insertId, naam: m.naam, datum: mmdd });
        }

        return NextResponse.json({ ok: true, ingevoegd: ingevoegd.length });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
