import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function initTables(db) {
    await db.query(`CREATE TABLE IF NOT EXISTS bouwinspectie_projecten (
        id INT AUTO_INCREMENT PRIMARY KEY,
        naam VARCHAR(255) NOT NULL,
        adres VARCHAR(255),
        opdrachtgever VARCHAR(255),
        startdatum DATE,
        status VARCHAR(50) DEFAULT 'actief',
        gemaakt_door VARCHAR(255),
        gemaakt_op DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS bouwinspectie_tekeningen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id BIGINT NOT NULL,
        naam VARCHAR(255) NOT NULL,
        bestand_url TEXT,
        bestandstype VARCHAR(50),
        volgorde INT DEFAULT 0,
        gemaakt_op DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Migreer INT → BIGINT voor bestaande tabellen
    await db.query(`ALTER TABLE bouwinspectie_tekeningen MODIFY COLUMN project_id BIGINT NOT NULL`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS bouwinspectie_pins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tekening_id INT NOT NULL,
        project_id BIGINT NOT NULL,
        volgnummer INT DEFAULT 1,
        x_pct DECIMAL(6,2),
        y_pct DECIMAL(6,2),
        titel VARCHAR(255),
        beschrijving TEXT,
        categorie VARCHAR(100) DEFAULT 'Overig',
        status VARCHAR(50) DEFAULT 'open',
        prioriteit VARCHAR(50) DEFAULT 'normaal',
        toegewezen_aan VARCHAR(255),
        deadline DATE,
        gemaakt_door VARCHAR(255),
        gemaakt_op DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`ALTER TABLE bouwinspectie_pins MODIFY COLUMN project_id BIGINT NOT NULL`).catch(() => {});

    await db.query(`CREATE TABLE IF NOT EXISTS bouwinspectie_fotos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pin_id INT NOT NULL,
        bestand_url TEXT,
        type VARCHAR(50) DEFAULT 'voor',
        gemaakt_op DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export async function GET() {
    try {
        const db = await getDbConnection();
        await initTables(db);
        const [rows] = await db.query(`
            SELECT p.*,
                COUNT(DISTINCT t.id) AS aantal_tekeningen,
                SUM(CASE WHEN pi.status = 'open' THEN 1 ELSE 0 END) AS open_pins,
                COUNT(DISTINCT pi.id) AS totaal_pins
            FROM bouwinspectie_projecten p
            LEFT JOIN bouwinspectie_tekeningen t ON t.project_id = p.id
            LEFT JOIN bouwinspectie_pins pi ON pi.project_id = p.id
            GROUP BY p.id
            ORDER BY p.gemaakt_op DESC
        `);
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const db = await getDbConnection();
        await initTables(db);
        const body = await req.json();
        const { naam, adres, opdrachtgever, startdatum, gemaakt_door } = body;
        const [result] = await db.query(
            `INSERT INTO bouwinspectie_projecten (naam, adres, opdrachtgever, startdatum, gemaakt_door) VALUES (?, ?, ?, ?, ?)`,
            [naam, adres || null, opdrachtgever || null, startdatum || null, gemaakt_door || null]
        );
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_projecten WHERE id = ?`, [result.insertId]);
        return NextResponse.json(rows[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
