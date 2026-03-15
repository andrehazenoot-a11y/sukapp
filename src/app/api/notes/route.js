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
        
        return NextResponse.json({ success: true, notes: rows });
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
        // date can be a specific date or we let MySql handle it via CURRENT_TIMESTAMP
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
