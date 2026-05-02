import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_projecten WHERE id = ?`, [id]);
        if (!rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        const body = await req.json();
        const { naam, adres, opdrachtgever, startdatum, status } = body;
        await db.query(
            `UPDATE bouwinspectie_projecten SET naam=?, adres=?, opdrachtgever=?, startdatum=?, status=? WHERE id=?`,
            [naam, adres || null, opdrachtgever || null, startdatum || null, status || 'actief', id]
        );
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_projecten WHERE id = ?`, [id]);
        return NextResponse.json(rows[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const db = await getDbConnection();
        await db.query(`DELETE FROM bouwinspectie_fotos WHERE pin_id IN (SELECT id FROM bouwinspectie_pins WHERE project_id = ?)`, [id]);
        await db.query(`DELETE FROM bouwinspectie_pins WHERE project_id = ?`, [id]);
        await db.query(`DELETE FROM bouwinspectie_tekeningen WHERE project_id = ?`, [id]);
        await db.query(`DELETE FROM bouwinspectie_projecten WHERE id = ?`, [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
