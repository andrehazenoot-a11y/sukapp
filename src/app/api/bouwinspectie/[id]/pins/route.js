import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

let _migrated = false;
async function ensureMigration(db) {
    if (_migrated) return;
    await db.query(`ALTER TABLE bouwinspectie_tekeningen MODIFY COLUMN project_id BIGINT NOT NULL`).catch(() => {});
    await db.query(`ALTER TABLE bouwinspectie_pins MODIFY COLUMN project_id BIGINT NOT NULL`).catch(() => {});
    await db.query(`ALTER TABLE bouwinspectie_pins ADD COLUMN IF NOT EXISTS checklist JSON`).catch(() => {});
    await db.query(`ALTER TABLE bouwinspectie_pins ADD COLUMN IF NOT EXISTS pdf_page INT DEFAULT 1`).catch(() => {});
    _migrated = true;
}

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        await ensureMigration(db);
        const [pins] = await db.query(
            `SELECT p.*, GROUP_CONCAT(f.bestand_url ORDER BY f.id SEPARATOR '||') AS foto_urls,
             GROUP_CONCAT(f.type ORDER BY f.id SEPARATOR '||') AS foto_types,
             GROUP_CONCAT(f.id ORDER BY f.id SEPARATOR '||') AS foto_ids
             FROM bouwinspectie_pins p
             LEFT JOIN bouwinspectie_fotos f ON f.pin_id = p.id
             WHERE p.project_id = ?
             GROUP BY p.id
             ORDER BY p.tekening_id, p.volgnummer`,
            [id]
        );
        const result = pins.map(p => ({
            ...p,
            checklist: (() => { try { return p.checklist ? JSON.parse(p.checklist) : []; } catch { return []; } })(),
            fotos: p.foto_urls
                ? p.foto_urls.split('||').map((url, i) => ({
                    id: p.foto_ids?.split('||')[i],
                    url,
                    type: p.foto_types?.split('||')[i] || 'voor',
                  }))
                : [],
        }));
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        await ensureMigration(db);
        const body = await req.json();
        const { tekening_id, x_pct, y_pct, pdf_page, titel, beschrijving, categorie, status, prioriteit, toegewezen_aan, deadline, gemaakt_door } = body;

        // Bereken volgnummer voor deze tekening
        const [maxRow] = await db.query(
            `SELECT COALESCE(MAX(volgnummer), 0) + 1 AS next_nr FROM bouwinspectie_pins WHERE tekening_id = ?`,
            [tekening_id]
        );
        const volgnummer = maxRow[0].next_nr;

        const [result] = await db.query(
            `INSERT INTO bouwinspectie_pins (tekening_id, project_id, volgnummer, x_pct, y_pct, pdf_page, titel, beschrijving, categorie, status, prioriteit, toegewezen_aan, deadline, gemaakt_door)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tekening_id, id, volgnummer, x_pct, y_pct, pdf_page || 1, titel || 'Nieuwe bevinding', beschrijving || null,
             categorie || 'Overig', status || 'open', prioriteit || 'normaal',
             toegewezen_aan || null, deadline || null, gemaakt_door || null]
        );
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_pins WHERE id = ?`, [result.insertId]);
        return NextResponse.json({ ...rows[0], fotos: [] });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
