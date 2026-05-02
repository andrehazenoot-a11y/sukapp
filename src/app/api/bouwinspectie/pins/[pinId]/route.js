import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function PUT(req, { params }) {
    try {
        const { pinId } = await params;
        const db = await getDbConnection();
        const body = await req.json();
        const { titel, beschrijving, categorie, status, prioriteit, toegewezen_aan, deadline, checklist } = body;
        await db.query(`ALTER TABLE bouwinspectie_pins ADD COLUMN IF NOT EXISTS checklist JSON`).catch(() => {});
        await db.query(
            `UPDATE bouwinspectie_pins SET titel=?, beschrijving=?, categorie=?, status=?, prioriteit=?, toegewezen_aan=?, deadline=?, checklist=? WHERE id=?`,
            [titel, beschrijving || null, categorie || 'Overig', status || 'open',
             prioriteit || 'normaal', toegewezen_aan || null, deadline || null,
             checklist ? JSON.stringify(checklist) : null, pinId]
        );
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_pins WHERE id = ?`, [pinId]);
        return NextResponse.json(rows[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { pinId } = await params;
        const db = await getDbConnection();
        await db.query(`DELETE FROM bouwinspectie_fotos WHERE pin_id = ?`, [pinId]);
        await db.query(`DELETE FROM bouwinspectie_pins WHERE id = ?`, [pinId]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
