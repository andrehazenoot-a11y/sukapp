import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTables(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_documenten (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titel VARCHAR(255) NOT NULL,
        bestandsnaam VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        bestand_data LONGBLOB NOT NULL,
        geupload_door VARCHAR(100) NOT NULL,
        categorie VARCHAR(100) DEFAULT NULL,
        zichtbaar_vanaf DATE DEFAULT NULL,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Kolommen toevoegen als ze nog niet bestaan (voor bestaande databases)
    await pool.query(`ALTER TABLE schilders_documenten ADD COLUMN IF NOT EXISTS categorie VARCHAR(100) DEFAULT NULL`);
    await pool.query(`ALTER TABLE schilders_documenten ADD COLUMN IF NOT EXISTS zichtbaar_vanaf DATE DEFAULT NULL`);
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_doc_gelezen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doc_id INT NOT NULL,
        user_id INT NOT NULL,
        naam VARCHAR(100) NOT NULL,
        gelezen_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_doc_user (doc_id, user_id),
        FOREIGN KEY (doc_id) REFERENCES schilders_documenten(id) ON DELETE CASCADE
    )`);
}

// GET /api/documenten — documenten met gelezen-status
// ?alle=1  → alle docs inclusief geplande (admin)
// (geen param) → alleen nu zichtbare docs (medewerkers)
export async function GET(req) {
    try {
        const pool = await getDbConnection();
        await ensureTables(pool);

        const { searchParams } = new URL(req.url);
        const alle = searchParams.get('alle') === '1';

        const whereClause = alle ? '' : 'WHERE zichtbaar_vanaf IS NULL OR zichtbaar_vanaf <= CURDATE()';

        const [docs] = await pool.query(
            `SELECT id, titel, bestandsnaam, mime_type, geupload_door, categorie, zichtbaar_vanaf, aangemaakt_op
             FROM schilders_documenten ${whereClause} ORDER BY aangemaakt_op DESC`
        );
        const [gelezen] = await pool.query(
            `SELECT doc_id, user_id, naam, gelezen_op FROM schilders_doc_gelezen ORDER BY gelezen_op ASC`
        );

        const gelezenPerDoc = {};
        for (const g of gelezen) {
            if (!gelezenPerDoc[g.doc_id]) gelezenPerDoc[g.doc_id] = [];
            gelezenPerDoc[g.doc_id].push({ userId: g.user_id, naam: g.naam, timestamp: g.gelezen_op });
        }

        const result = docs.map(d => ({
            id: d.id,
            titel: d.titel,
            bestandsnaam: d.bestandsnaam,
            type: d.mime_type,
            geuploadDoor: d.geupload_door,
            categorie: d.categorie || null,
            zichtbaarVanaf: d.zichtbaar_vanaf || null,
            datum: d.aangemaakt_op,
            gelezen: gelezenPerDoc[d.id] || [],
        }));

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/documenten — nieuw document uploaden
export async function POST(req) {
    try {
        const { titel, bestandsnaam, type, data, geuploadDoor, zichtbaarVanaf } = await req.json();
        if (!titel || !data || !type) return NextResponse.json({ error: 'Ontbrekende velden' }, { status: 400 });

        const base64 = data.split(',')[1];
        if (!base64) return NextResponse.json({ error: 'Ongeldig bestandsformaat' }, { status: 400 });
        const buffer = Buffer.from(base64, 'base64');

        const pool = await getDbConnection();
        await ensureTables(pool);

        const [result] = await pool.query(
            `INSERT INTO schilders_documenten (titel, bestandsnaam, mime_type, bestand_data, geupload_door, zichtbaar_vanaf) VALUES (?, ?, ?, ?, ?, ?)`,
            [titel, bestandsnaam || titel, type, buffer, geuploadDoor || 'Beheerder', zichtbaarVanaf || null]
        );

        return NextResponse.json({ id: result.insertId, titel, bestandsnaam, type, geuploadDoor, zichtbaarVanaf: zichtbaarVanaf || null, datum: new Date() });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
