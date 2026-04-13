import { getDbConnection } from '@/lib/db';
import fs from 'fs';

// GET /api/medewerker-toolbox/bestand/[id]
// Serveert toolbox bestanden zonder toolbox-auth (toegankelijk voor medewerker app)
export async function GET(req, { params }) {
    const { id } = await params;
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query('SELECT * FROM toolbox_bestanden WHERE id = ?', [id]);
        if (!rows.length) return new Response('Niet gevonden', { status: 404 });

        const bestand = rows[0];
        if (!fs.existsSync(bestand.bestand_pad)) return new Response('Bestand niet gevonden', { status: 404 });

        const data = fs.readFileSync(bestand.bestand_pad);
        const inline = bestand.mime_type?.startsWith('image/') || bestand.mime_type === 'application/pdf';

        return new Response(data, {
            headers: {
                'Content-Type': bestand.mime_type || 'application/octet-stream',
                'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(bestand.originele_naam)}"`,
                'Content-Length': String(data.length),
            },
        });
    } catch (err) {
        return new Response('Serverfout', { status: 500 });
    }
}
