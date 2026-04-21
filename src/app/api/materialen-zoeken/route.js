import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// GET /api/materialen-zoeken?q=verf
// Zoekt distinct materiaalnamen uit werkbon-historie
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q || q.length < 2) return NextResponse.json([]);
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query(
            `SELECT naam, hoeveelheid, COUNT(*) as cnt
             FROM schilders_werkbon_materialen
             WHERE naam LIKE ?
             GROUP BY naam, hoeveelheid
             ORDER BY cnt DESC, naam ASC
             LIMIT 30`,
            [`%${q}%`]
        );
        // Eén entry per naam (meest gebruikte eenheid)
        const seen = new Map();
        for (const r of rows) {
            if (!seen.has(r.naam)) seen.set(r.naam, r.hoeveelheid || '1 stuk');
        }
        return NextResponse.json([...seen.entries()].map(([naam, hoeveelheid]) => ({ naam, hoeveelheid })));
    } catch {
        return NextResponse.json([]);
    }
}
