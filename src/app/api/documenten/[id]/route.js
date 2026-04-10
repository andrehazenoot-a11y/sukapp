import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// GET /api/documenten/[id] — document ophalen inclusief bestandsdata
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();
        const [rows] = await pool.query(
            `SELECT id, titel, bestandsnaam, mime_type, bestand_data, geupload_door, categorie, aangemaakt_op FROM schilders_documenten WHERE id = ?`,
            [id]
        );
        if (!rows[0]) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });

        const doc = rows[0];
        const base64 = doc.bestand_data.toString('base64');
        const dataUrl = `data:${doc.mime_type};base64,${base64}`;

        return NextResponse.json({
            id: doc.id,
            titel: doc.titel,
            bestandsnaam: doc.bestandsnaam,
            type: doc.mime_type,
            data: dataUrl,
            geuploadDoor: doc.geupload_door,
            categorie: doc.categorie || null,
            datum: doc.aangemaakt_op,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/documenten/[id] — categorie of titel bijwerken
export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const pool = await getDbConnection();

        if ('categorie' in body) {
            await pool.query(`UPDATE schilders_documenten SET categorie = ? WHERE id = ?`, [body.categorie || null, id]);
        }
        if ('titel' in body) {
            await pool.query(`UPDATE schilders_documenten SET titel = ? WHERE id = ?`, [body.titel, id]);
        }
        if ('zichtbaarVanaf' in body) {
            await pool.query(`UPDATE schilders_documenten SET zichtbaar_vanaf = ? WHERE id = ?`, [body.zichtbaarVanaf || null, id]);
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/documenten/[id] — document verwijderen
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();
        await pool.query(`DELETE FROM schilders_documenten WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
