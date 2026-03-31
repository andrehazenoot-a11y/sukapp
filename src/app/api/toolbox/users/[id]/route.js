import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { requireToolboxAdmin, hashWachtwoord } from '@/lib/toolboxAuth';

// PUT: wachtwoord of naam bijwerken (admin)
export async function PUT(req, { params }) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { id } = await params;
    const { naam, email, wachtwoord, rol } = await req.json();

    try {
        const pool = await getDbConnection();
        const updates = [];
        const values = [];

        if (naam) { updates.push('naam = ?'); values.push(naam); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
        if (wachtwoord) { updates.push('wachtwoord_hash = ?'); values.push(hashWachtwoord(wachtwoord)); }
        if (rol) { updates.push('rol = ?'); values.push(rol === 'admin' ? 'admin' : 'medewerker'); }

        if (!updates.length) return NextResponse.json({ error: 'Niets te wijzigen' }, { status: 400 });

        values.push(id);
        await pool.query(`UPDATE toolbox_users SET ${updates.join(', ')} WHERE id = ?`, values);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: medewerker verwijderen (admin)
export async function DELETE(req, { params }) {
    const admin = await requireToolboxAdmin(req);
    if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });

    const { id } = await params;
    try {
        const pool = await getDbConnection();
        await pool.query('DELETE FROM toolbox_sessies WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM toolbox_bevestigingen WHERE user_id = ?', [id]);
        await pool.query('DELETE FROM toolbox_users WHERE id = ?', [id]);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
