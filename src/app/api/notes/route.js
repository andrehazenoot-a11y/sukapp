import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        
        let query = 'SELECT * FROM notes ORDER BY created_at DESC';
        let queryParams = [];

        if (projectId) {
            query = 'SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC';
            queryParams = [projectId];
        }

        const pool = await getDbConnection();
        const [rows] = await pool.query(query, queryParams);

        // Laad ook reacties bij elke notitie
        let notesWithReplies = rows;
        if (rows.length > 0) {
            const noteIds = rows.map(n => n.id);
            try {
                const [repliesRows] = await pool.query(
                    'SELECT * FROM note_replies WHERE note_id IN (?) ORDER BY created_at ASC',
                    [noteIds]
                );
                // Voeg reacties toe per notitie
                notesWithReplies = rows.map(note => ({
                    ...note,
                    replies: repliesRows.filter(r => r.note_id === note.id).map(r => ({
                        id: r.id,
                        text: r.content,
                        author: r.author,
                        date: r.created_at ? new Date(r.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
                    }))
                }));
            } catch {
                // note_replies tabel bestaat nog niet — negeer gracefully
            }
        }
        
        return NextResponse.json({ success: true, notes: notesWithReplies });
    } catch (error) {
        console.error('API Error /api/notes (GET):', error);
        return NextResponse.json({ success: false, error: 'Kon notities niet ophalen' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { projectId, author, content, photo, date, type } = body;

        if (!projectId || !content) {
            return NextResponse.json({ success: false, error: 'Project en tekst zijn verplicht.' }, { status: 400 });
        }

        const pool = await getDbConnection();
        const actualDate = date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace('T', ' ');

        const [result] = await pool.query(
            'INSERT INTO notes (project_id, author, content, photo, date, type) VALUES (?, ?, ?, ?, ?, ?)',
            [projectId, author || 'Schilder', content, photo || null, actualDate, type || 'info']
        );

        return NextResponse.json({ 
            success: true, 
            message: 'Notitie opgeslagen in The Cloud',
            id: result.insertId 
        });

    } catch (error) {
        console.error('API Error /api/notes (POST):', error);
        return NextResponse.json({ success: false, error: 'Kon notitie niet opslaan in Database' }, { status: 500 });
    }
}
