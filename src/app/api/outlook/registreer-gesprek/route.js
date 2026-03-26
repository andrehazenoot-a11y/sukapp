import { NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || '/tmp/schilders-tokens';
const MAPPING_FILE = path.join(STORAGE_PATH, 'gesprek-mapping.json');

async function leesMapping() {
    try {
        const inhoud = await readFile(MAPPING_FILE, 'utf8');
        return JSON.parse(inhoud);
    } catch {
        return {};
    }
}

async function slaMapping(mapping) {
    await mkdir(STORAGE_PATH, { recursive: true });
    await writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), 'utf8');
}

export async function POST(req) {
    const { conversationId, teamsKanaalId, teamId } = await req.json();
    if (!conversationId || !teamsKanaalId || !teamId) {
        return NextResponse.json({ error: 'conversationId, teamsKanaalId en teamId zijn vereist' }, { status: 400 });
    }

    try {
        const mapping = await leesMapping();
        mapping[conversationId] = { teamsKanaalId, teamId };
        await slaMapping(mapping);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Intern gebruik door webhook: opzoeken zonder HTTP
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'conversationId ontbreekt' }, { status: 400 });

    try {
        const mapping = await leesMapping();
        const entry = mapping[conversationId] || null;
        return NextResponse.json(entry);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
