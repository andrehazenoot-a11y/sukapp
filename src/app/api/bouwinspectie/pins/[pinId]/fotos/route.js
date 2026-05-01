import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function POST(req, { params }) {
    try {
        const { pinId } = await params;
        const db = await getDbConnection();
        const body = await req.json();
        const { bestand_url, type } = body;
        const [result] = await db.query(
            `INSERT INTO bouwinspectie_fotos (pin_id, bestand_url, type) VALUES (?, ?, ?)`,
            [pinId, bestand_url, type || 'voor']
        );
        const [rows] = await db.query(`SELECT * FROM bouwinspectie_fotos WHERE id = ?`, [result.insertId]);
        return NextResponse.json(rows[0]);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { pinId } = await params;
        const db = await getDbConnection();
        const url = new URL(req.url);
        const fotoId = url.searchParams.get('fotoId');
        if (fotoId) {
            await db.query(`DELETE FROM bouwinspectie_fotos WHERE id = ? AND pin_id = ?`, [fotoId, pinId]);
        } else {
            await db.query(`DELETE FROM bouwinspectie_fotos WHERE pin_id = ?`, [pinId]);
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
