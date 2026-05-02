import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_bestellingen (
    id BIGINT NOT NULL,
    medewerker_id VARCHAR(50) NOT NULL,
    medewerker_naam VARCHAR(100) DEFAULT NULL,
    product VARCHAR(255) NOT NULL,
    aantal VARCHAR(50) DEFAULT NULL,
    eenheid VARCHAR(50) DEFAULT NULL,
    project VARCHAR(200) DEFAULT NULL,
    opmerking TEXT DEFAULT NULL,
    notitie TEXT DEFAULT NULL,
    prijs DECIMAL(10,2) DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'Aangevraagd',
    ingediend DATETIME DEFAULT NULL,
    bijgewerkt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_medewerker (medewerker_id)
)`;

// GET /api/bestellingen?userId=X
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });

    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        const [rows] = await pool.query(
            `SELECT * FROM schilders_bestellingen WHERE medewerker_id = ? ORDER BY ingediend DESC`,
            [String(userId)]
        );

        const parsed = rows.map(r => ({
            id:        Number(r.id),
            product:   r.product,
            aantal:    r.aantal || '',
            eenheid:   r.eenheid || 'stuk',
            project:   r.project || '',
            opmerking: r.opmerking || '',
            notitie:   r.notitie || '',
            prijs:     r.prijs != null ? Number(r.prijs) : undefined,
            status:    r.status || 'Aangevraagd',
            ingediend: r.ingediend ? new Date(r.ingediend).toISOString() : null,
        }));
        return NextResponse.json(parsed);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/bestellingen — upsert één bestelling
// Body: { userId, userName, bestelling: { id, product, aantal, eenheid, project, opmerking, notitie, prijs, status, ingediend } }
export async function POST(req) {
    try {
        const { userId, userName, bestelling } = await req.json();
        if (!userId || !bestelling || !bestelling.id || !bestelling.product) {
            return NextResponse.json({ error: 'userId, bestelling.id en bestelling.product zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);

        await pool.query(
            `INSERT INTO schilders_bestellingen (id, medewerker_id, medewerker_naam, product, aantal, eenheid, project, opmerking, notitie, prijs, status, ingediend)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                medewerker_naam = VALUES(medewerker_naam),
                product = VALUES(product),
                aantal = VALUES(aantal),
                eenheid = VALUES(eenheid),
                project = VALUES(project),
                opmerking = VALUES(opmerking),
                notitie = VALUES(notitie),
                prijs = VALUES(prijs),
                status = VALUES(status),
                bijgewerkt_op = CURRENT_TIMESTAMP`,
            [
                Number(bestelling.id),
                String(userId),
                userName || null,
                bestelling.product,
                bestelling.aantal || null,
                bestelling.eenheid || 'stuk',
                bestelling.project || null,
                bestelling.opmerking || null,
                bestelling.notitie || null,
                bestelling.prijs != null ? Number(bestelling.prijs) : null,
                bestelling.status || 'Aangevraagd',
                bestelling.ingediend ? new Date(bestelling.ingediend) : new Date(),
            ]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/bestellingen — verwijder één bestelling
// Body: { id, userId }
export async function DELETE(req) {
    try {
        const { id, userId } = await req.json();
        if (!id || !userId) {
            return NextResponse.json({ error: 'id en userId zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        await pool.query(
            `DELETE FROM schilders_bestellingen WHERE id = ? AND medewerker_id = ?`,
            [Number(id), String(userId)]
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PATCH /api/bestellingen — status of notitie updaten
// Body: { id, userId, status?, notitie? }
export async function PATCH(req) {
    try {
        const { id, userId, status, notitie } = await req.json();
        if (!id || !userId) {
            return NextResponse.json({ error: 'id en userId zijn verplicht' }, { status: 400 });
        }

        const pool = await getDbConnection();
        const updates = [];
        const params = [];

        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (notitie !== undefined) { updates.push('notitie = ?'); params.push(notitie); }
        if (!updates.length) return NextResponse.json({ error: 'Niets om bij te werken' }, { status: 400 });

        updates.push('bijgewerkt_op = CURRENT_TIMESTAMP');
        params.push(Number(id), String(userId));

        await pool.query(
            `UPDATE schilders_bestellingen SET ${updates.join(', ')} WHERE id = ? AND medewerker_id = ?`,
            params
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
