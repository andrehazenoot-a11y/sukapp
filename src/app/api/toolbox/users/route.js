import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { requireToolboxAdmin, hashWachtwoord } from '@/lib/toolboxAuth';

// GET: alle medewerkers (admin)
export async function GET(req) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query(
            'SELECT id, naam, email, rol, aangemaakt_op FROM toolbox_users ORDER BY naam'
        );
        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: medewerker aanmaken (admin)
export async function POST(req) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { naam, email, wachtwoord, rol } = await req.json();
    if (!naam || !wachtwoord) return NextResponse.json({ error: 'Naam en wachtwoord verplicht' }, { status: 400 });

    try {
        const pool = await getDbConnection();
        const [bestaand] = await pool.query('SELECT id FROM toolbox_users WHERE naam = ?', [naam]);
        if (bestaand.length) return NextResponse.json({ error: 'Naam al in gebruik' }, { status: 409 });

        const [result] = await pool.query(
            'INSERT INTO toolbox_users (naam, email, wachtwoord_hash, rol) VALUES (?, ?, ?, ?)',
            [naam, email || null, hashWachtwoord(wachtwoord), rol === 'admin' ? 'admin' : 'medewerker']
        );
        return NextResponse.json({ ok: true, id: result.insertId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
