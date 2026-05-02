import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_project_meta (
    project_id VARCHAR(50) NOT NULL,
    sleutel VARCHAR(80) NOT NULL,
    waarde MEDIUMTEXT NOT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, sleutel)
)`;

// GET /api/project-meta?projectId=X → alle meta voor één project
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const [rows] = await pool.query(
            `SELECT sleutel, waarde FROM schilders_project_meta WHERE project_id = ?`,
            [String(projectId)]
        );
        const result = {};
        for (const r of rows) {
            try { result[r.sleutel] = JSON.parse(r.waarde); } catch { result[r.sleutel] = r.waarde; }
        }
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/project-meta — sla één key op
// Body: { projectId, sleutel, waarde }
export async function POST(req) {
    try {
        const { projectId, sleutel, waarde } = await req.json();
        if (!projectId || !sleutel) return NextResponse.json({ error: 'projectId en sleutel verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const opslaan = typeof waarde === 'string' ? waarde : JSON.stringify(waarde);
        await pool.query(
            `INSERT INTO schilders_project_meta (project_id, sleutel, waarde)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE waarde=VALUES(waarde), bijgewerkt_op=CURRENT_TIMESTAMP`,
            [String(projectId), sleutel, opslaan]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PUT /api/project-meta — bulk opslaan (body: { projectId, data: { sleutel: waarde, ... } })
export async function PUT(req) {
    try {
        const { projectId, data } = await req.json();
        if (!projectId || !data || typeof data !== 'object') {
            return NextResponse.json({ error: 'projectId en data verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        for (const [sleutel, waarde] of Object.entries(data)) {
            const opslaan = typeof waarde === 'string' ? waarde : JSON.stringify(waarde);
            await pool.query(
                `INSERT INTO schilders_project_meta (project_id, sleutel, waarde)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE waarde=VALUES(waarde), bijgewerkt_op=CURRENT_TIMESTAMP`,
                [String(projectId), sleutel, opslaan]
            );
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
