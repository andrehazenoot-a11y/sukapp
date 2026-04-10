import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTable(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schilders_werkbon_materialen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            werkbon_id INT NOT NULL,
            naam VARCHAR(200) NOT NULL,
            hoeveelheid VARCHAR(50) DEFAULT '1 stuk',
            aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`ALTER TABLE schilders_werkbon_materialen ADD COLUMN IF NOT EXISTS prijs DECIMAL(10,2) DEFAULT NULL`);
    await pool.query(`ALTER TABLE schilders_werkbon_materialen ADD COLUMN IF NOT EXISTS medewerker_naam VARCHAR(100) DEFAULT NULL`);
}

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const pool = await getDbConnection();
        await ensureTable(pool);
        const [rows] = await pool.query(
            `SELECT id, naam, hoeveelheid, prijs, medewerker_naam, aangemaakt_op FROM schilders_werkbon_materialen WHERE werkbon_id = ? ORDER BY aangemaakt_op ASC`,
            [id]
        );
        return NextResponse.json({ ok: true, materialen: rows.map(r => ({ ...r, prijs: r.prijs ? parseFloat(r.prijs) : null })) });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const { naam, hoeveelheid, medewerkerNaam } = await req.json();
        if (!naam) return NextResponse.json({ error: 'naam verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await ensureTable(pool);
        const [result] = await pool.query(
            `INSERT INTO schilders_werkbon_materialen (werkbon_id, naam, hoeveelheid, medewerker_naam) VALUES (?, ?, ?, ?)`,
            [id, naam, hoeveelheid || '1 stuk', medewerkerNaam || null]
        );
        return NextResponse.json({ ok: true, id: result.insertId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const { matId, prijs } = await req.json();
        if (!matId) return NextResponse.json({ error: 'matId verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(
            `UPDATE schilders_werkbon_materialen SET prijs = ? WHERE id = ? AND werkbon_id = ?`,
            [prijs ?? null, matId, id]
        );
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const { matId } = await req.json();
        if (!matId) return NextResponse.json({ error: 'matId verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(
            `DELETE FROM schilders_werkbon_materialen WHERE id = ? AND werkbon_id = ?`,
            [matId, id]
        );
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
