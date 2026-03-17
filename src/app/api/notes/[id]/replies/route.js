import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// POST /api/notes/[id]/replies — sla een reactie op een notitie op
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { author, content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ success: false, error: 'Reactietekst is verplicht.' }, { status: 400 });
        }

        const pool = await getDbConnection();

        // Maak de tabel aan als die nog niet bestaat
        await pool.query(`
            CREATE TABLE IF NOT EXISTS note_replies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                note_id INT NOT NULL,
                author VARCHAR(255) DEFAULT 'Onbekend',
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_note_id (note_id)
            )
        `);

        const [result] = await pool.query(
            'INSERT INTO note_replies (note_id, author, content) VALUES (?, ?, ?)',
            [id, author || 'Onbekend', content.trim()]
        );

        return NextResponse.json({
            success: true,
            reply: {
                id: result.insertId,
                note_id: id,
                author: author || 'Onbekend',
                text: content.trim(),
                date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            }
        });

    } catch (error) {
        console.error('API Error /api/notes/[id]/replies (POST):', error);
        return NextResponse.json({ success: false, error: 'Kon reactie niet opslaan' }, { status: 500 });
    }
}
