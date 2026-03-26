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

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { author, content } = await request.json();
        if (!content?.trim()) {
            return NextResponse.json({ success: false, error: 'Reactietekst is verplicht.' }, { status: 400 });
        }
        const notes = readNotes();
        const note = notes.find(n => String(n.id) === String(id));
        if (!note) return NextResponse.json({ success: false, error: 'Notitie niet gevonden' }, { status: 404 });
        if (!note.replies) note.replies = [];
        const reply = {
            id: Date.now(),
            note_id: id,
            author: author || 'Onbekend',
            text: content.trim(),
            date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            created_at: new Date().toISOString(),
        };
        note.replies.push(reply);
        writeNotes(notes);
        return NextResponse.json({ success: true, reply });
    } catch (error) {
        console.error('API Error /api/notes/[id]/replies (POST):', error);
        return NextResponse.json({ success: false, error: 'Kon reactie niet opslaan' }, { status: 500 });
    }
}
