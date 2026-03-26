import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'tokens', 'notes.json');

function readNotes() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch { return []; }
}

function writeNotes(notes) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        let notes = readNotes();
        if (projectId) notes = notes.filter(n => String(n.project_id) === String(projectId));
        notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return NextResponse.json({ success: true, notes });
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
        const notes = readNotes();
        const newNote = {
            id: Date.now(),
            project_id: projectId,
            author: author || 'Schilder',
            content,
            photo: photo || null,
            date: date || new Date().toISOString().slice(0, 19).replace('T', ' '),
            type: type || 'info',
            created_at: new Date().toISOString(),
            replies: [],
        };
        notes.push(newNote);
        writeNotes(notes);
        return NextResponse.json({ success: true, message: 'Notitie opgeslagen', id: newNote.id });
    } catch (error) {
        console.error('API Error /api/notes (POST):', error);
        return NextResponse.json({ success: false, error: 'Kon notitie niet opslaan' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'id ontbreekt' }, { status: 400 });
        const notes = readNotes().filter(n => String(n.id) !== String(id));
        writeNotes(notes);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
