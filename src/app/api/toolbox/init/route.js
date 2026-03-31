import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { hashWachtwoord } from '@/lib/toolboxAuth';

export async function GET() {
    try {
        const pool = await getDbConnection();

        await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            naam VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            wachtwoord_hash VARCHAR(64) NOT NULL,
            rol ENUM('admin','medewerker') DEFAULT 'medewerker',
            aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_meetings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titel VARCHAR(255) NOT NULL,
            datum DATE NOT NULL,
            beschrijving TEXT,
            aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_bestanden (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_id INT NOT NULL,
            originele_naam VARCHAR(255) NOT NULL,
            bestand_pad VARCHAR(500) NOT NULL,
            mime_type VARCHAR(100),
            grootte INT,
            geupload_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_bevestigingen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            meeting_id INT NOT NULL,
            user_id INT NOT NULL,
            gelezen_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_mv (meeting_id, user_id)
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS toolbox_sessies (
            token VARCHAR(64) PRIMARY KEY,
            user_id INT NOT NULL,
            verlopen_op TIMESTAMP NOT NULL
        )`);

        // Verwijder verlopen sessies
        await pool.query('DELETE FROM toolbox_sessies WHERE verlopen_op < NOW()').catch(() => {});

        // Maak standaard admin aan als er nog geen gebruikers zijn
        const [bestaand] = await pool.query('SELECT COUNT(*) as n FROM toolbox_users');
        if (bestaand[0].n === 0) {
            await pool.query(
                'INSERT INTO toolbox_users (naam, email, wachtwoord_hash, rol) VALUES (?, ?, ?, ?)',
                ['Andre', 'andre@deschilders.nl', hashWachtwoord('admin123'), 'admin']
            );
        }

        return NextResponse.json({ ok: true, bericht: 'Tabellen aangemaakt, standaard admin: Andre / admin123' });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
