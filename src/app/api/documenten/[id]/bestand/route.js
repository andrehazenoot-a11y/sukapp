import { getDbConnection } from '@/lib/db';

// GET /api/documenten/[id]/bestand — serveert het ruwe bestand met juiste Content-Type
export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();
        const [rows] = await pool.query(
            `SELECT bestandsnaam, mime_type, bestand_data FROM schilders_documenten WHERE id = ?`,
            [id]
        );
        if (!rows[0]) return new Response('Niet gevonden', { status: 404 });

        const doc = rows[0];
        return new Response(doc.bestand_data, {
            headers: {
                'Content-Type': doc.mime_type,
                'Content-Disposition': `inline; filename="${doc.bestandsnaam}"`,
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}
