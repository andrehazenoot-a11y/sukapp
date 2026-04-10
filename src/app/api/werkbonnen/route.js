import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTable(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_werkbonnen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        medewerker_id INT DEFAULT NULL,
        medewerker_naam VARCHAR(100) DEFAULT NULL,
        naam VARCHAR(200) NOT NULL,
        project_id VARCHAR(50) DEFAULT NULL,
        project_naam VARCHAR(200) DEFAULT NULL,
        opdrachtgever VARCHAR(200) DEFAULT NULL,
        werkadres VARCHAR(200) DEFAULT NULL,
        telefoon VARCHAR(50) DEFAULT NULL,
        project_actief TINYINT(1) DEFAULT NULL,
        datum DATE NOT NULL,
        uren DECIMAL(5,2) DEFAULT NULL,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`ALTER TABLE schilders_werkbonnen ADD COLUMN IF NOT EXISTS naam VARCHAR(200) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE schilders_werkbonnen ADD COLUMN IF NOT EXISTS opdrachtgever VARCHAR(200) DEFAULT NULL`);
    await pool.query(`ALTER TABLE schilders_werkbonnen ADD COLUMN IF NOT EXISTS werkadres VARCHAR(200) DEFAULT NULL`);
    await pool.query(`ALTER TABLE schilders_werkbonnen ADD COLUMN IF NOT EXISTS telefoon VARCHAR(50) DEFAULT NULL`);
    await pool.query(`ALTER TABLE schilders_werkbonnen ADD COLUMN IF NOT EXISTS project_actief TINYINT(1) DEFAULT NULL`);
    try { await pool.query(`ALTER TABLE schilders_werkbonnen MODIFY COLUMN project_naam VARCHAR(200) DEFAULT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE schilders_werkbonnen MODIFY COLUMN medewerker_id INT DEFAULT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE schilders_werkbonnen MODIFY COLUMN medewerker_naam VARCHAR(100) DEFAULT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE schilders_werkbonnen MODIFY COLUMN uren DECIMAL(5,2) DEFAULT NULL`); } catch {}
    await pool.query(`ALTER TABLE schilders_werkbonnen ADD COLUMN IF NOT EXISTS uurloon DECIMAL(8,2) DEFAULT NULL`);
}

// GET /api/werkbonnen
// ?medewerker_id=X  → eigen bonnen van medewerker
// (geen param)      → alle bonnen (admin)
export async function GET(req) {
    try {
        const pool = await getDbConnection();
        await ensureTable(pool);

        const { searchParams } = new URL(req.url);
        const medewerkerId = searchParams.get('medewerker_id');

        let query = `SELECT * FROM schilders_werkbonnen`;
        const params = [];
        if (medewerkerId) {
            query += ` WHERE medewerker_id = ?`;
            params.push(medewerkerId);
        }
        query += ` ORDER BY datum DESC, aangemaakt_op DESC`;

        const [rows] = await pool.query(query, params);
        return NextResponse.json(rows.map(r => ({
            id: r.id,
            medewerkerId: r.medewerker_id,
            medewerkerNaam: r.medewerker_naam,
            naam: r.naam,
            projectId: r.project_id,
            projectNaam: r.project_naam,
            opdrachtgever: r.opdrachtgever,
            werkadres: r.werkadres,
            telefoon: r.telefoon,
            projectActief: r.project_actief,
            datum: r.datum,
            uren: r.uren ? parseFloat(r.uren) : null,
            uurloon: r.uurloon ? parseFloat(r.uurloon) : null,
            aangemaakt: r.aangemaakt_op,
        })));
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/werkbonnen — nieuwe werkbon opslaan
export async function POST(req) {
    try {
        const { medewerkerId, medewerkerNaam, naam, projectId, projectNaam, opdrachtgever, werkadres, telefoon, projectActief, datum, uren } = await req.json();
        if (!naam) {
            return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await ensureTable(pool);

        const [result] = await pool.query(
            `INSERT INTO schilders_werkbonnen (medewerker_id, medewerker_naam, naam, project_id, project_naam, opdrachtgever, werkadres, telefoon, project_actief, datum, uren)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [medewerkerId || null, medewerkerNaam || null, naam, projectId || null, projectNaam || null, opdrachtgever || null, werkadres || null, telefoon || null, projectActief != null ? (projectActief ? 1 : 0) : null, datum || new Date().toISOString().slice(0, 10), uren || null]
        );

        return NextResponse.json({ id: result.insertId, ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
