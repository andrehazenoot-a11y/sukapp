import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDbConnection } from '@/lib/db';
import { hashWachtwoord, genereerToken, getToolboxUser } from '@/lib/toolboxAuth';

const SESSIE_DAGEN = 30;

async function ensureTables(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_users (id INT AUTO_INCREMENT PRIMARY KEY, naam VARCHAR(100) NOT NULL, email VARCHAR(100), wachtwoord_hash VARCHAR(64) NOT NULL, rol ENUM('admin','medewerker') DEFAULT 'medewerker', aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_sessies (token VARCHAR(64) PRIMARY KEY, user_id INT NOT NULL, verlopen_op TIMESTAMP NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_meetings (id INT AUTO_INCREMENT PRIMARY KEY, titel VARCHAR(255) NOT NULL, datum DATE NOT NULL, beschrijving TEXT, aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_bestanden (id INT AUTO_INCREMENT PRIMARY KEY, meeting_id INT NOT NULL, originele_naam VARCHAR(255) NOT NULL, bestand_pad VARCHAR(500) NOT NULL, mime_type VARCHAR(100), grootte INT, geupload_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_bevestigingen (id INT AUTO_INCREMENT PRIMARY KEY, meeting_id INT NOT NULL, user_id INT NOT NULL, gelezen_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_mv (meeting_id, user_id))`);
    const [bestaand] = await pool.query('SELECT COUNT(*) as n FROM toolbox_users');
    if (bestaand[0].n === 0) {
        await pool.query('INSERT INTO toolbox_users (naam, email, wachtwoord_hash, rol) VALUES (?, ?, ?, ?)',
            ['Andre', 'andre@deschilders.nl', hashWachtwoord('admin123'), 'admin']);
    }
}

// POST: inloggen
export async function POST(req) {
    const { naam, wachtwoord } = await req.json();
    if (!naam || !wachtwoord) return NextResponse.json({ error: 'Naam en wachtwoord verplicht' }, { status: 400 });

    try {
        const pool = await getDbConnection();
        await ensureTables(pool);
        const hash = hashWachtwoord(wachtwoord);
        const [rows] = await pool.query(
            'SELECT * FROM toolbox_users WHERE naam = ? AND wachtwoord_hash = ?',
            [naam, hash]
        );
        if (!rows.length) return NextResponse.json({ error: 'Naam of wachtwoord onjuist' }, { status: 401 });

        const user = rows[0];
        const token = genereerToken();
        const verlooptOp = new Date(Date.now() + SESSIE_DAGEN * 86400 * 1000);

        await pool.query(
            'INSERT INTO toolbox_sessies (token, user_id, verlopen_op) VALUES (?, ?, ?)',
            [token, user.id, verlooptOp]
        );

        const jar = await cookies();
        jar.set('toolbox_token', token, {
            httpOnly: true,
            path: '/',
            expires: verlooptOp,
            sameSite: 'lax',
        });

        return NextResponse.json({ ok: true, naam: user.naam, rol: user.rol });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: uitloggen
export async function DELETE() {
    try {
        const jar = await cookies();
        const token = jar.get('toolbox_token')?.value;
        if (token) {
            const pool = await getDbConnection();
            await pool.query('DELETE FROM toolbox_sessies WHERE token = ?', [token]).catch(() => {});
        }
        jar.delete('toolbox_token');
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}

// GET: wie ben ik?
export async function GET(req) {
    const user = await getToolboxUser(req);
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
    return NextResponse.json({ id: user.id, naam: user.naam, rol: user.rol, email: user.email });
}
