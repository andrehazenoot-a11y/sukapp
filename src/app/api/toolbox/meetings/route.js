import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getToolboxUser, requireToolboxAdmin } from '@/lib/toolboxAuth';

// GET: alle meetings ophalen
export async function GET(req) {
    const user = await getToolboxUser(req);
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

    try {
        const pool = await getDbConnection();
        const [meetings] = await pool.query(
            'SELECT * FROM toolbox_meetings ORDER BY datum DESC, aangemaakt_op DESC'
        );

        // Voeg voor elke meeting toe: aantal bestanden + of deze user akkoord heeft gegeven
        const [bestanden] = await pool.query('SELECT meeting_id, COUNT(*) as n FROM toolbox_bestanden GROUP BY meeting_id');
        const [bevestigingen] = await pool.query(
            'SELECT meeting_id FROM toolbox_bevestigingen WHERE user_id = ?', [user.id]
        );
        const bestandenMap = Object.fromEntries(bestanden.map(b => [b.meeting_id, b.n]));
        const bevestigdSet = new Set(bevestigingen.map(b => b.meeting_id));

        return NextResponse.json(meetings.map(m => ({
            ...m,
            aantalBestanden: bestandenMap[m.id] || 0,
            akkoordGegeven: bevestigdSet.has(m.id),
        })));
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: nieuwe meeting aanmaken (admin)
export async function POST(req) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { titel, datum, beschrijving } = await req.json();
    if (!titel || !datum) return NextResponse.json({ error: 'Titel en datum verplicht' }, { status: 400 });

    try {
        const pool = await getDbConnection();
        const [result] = await pool.query(
            'INSERT INTO toolbox_meetings (titel, datum, beschrijving) VALUES (?, ?, ?)',
            [titel, datum, beschrijving || null]
        );
        return NextResponse.json({ ok: true, id: result.insertId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
