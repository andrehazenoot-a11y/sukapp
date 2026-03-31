import { getDbConnection } from '@/lib/db';
import { getToolboxUser } from '@/lib/toolboxAuth';
import fs from 'fs';

// GET: bestand downloaden/bekijken
export async function GET(req, { params }) {
    const user = await getToolboxUser(req);
    if (!user) return new Response('Niet ingelogd', { status: 401 });

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
        return new Response(err.message, { status: 500 });
    }
}

// DELETE: bestand verwijderen (admin)
export async function DELETE(req, { params }) {
    const user = await getToolboxUser(req);
    if (!user || user.rol !== 'admin') return new Response('Geen toegang', { status: 403 });

    const { id } = await params;
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query('SELECT * FROM toolbox_bestanden WHERE id = ?', [id]);
        if (!rows.length) return new Response('Niet gevonden', { status: 404 });

        try { fs.unlinkSync(rows[0].bestand_pad); } catch {}
        await pool.query('DELETE FROM toolbox_bestanden WHERE id = ?', [id]);
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
}
