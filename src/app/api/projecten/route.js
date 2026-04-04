import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'projecten.json');

function readData() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
    return NextResponse.json(readData());
}

export async function POST(req) {
    const body = await req.json();
    writeData(body);
    return NextResponse.json({ ok: true });
}

export async function PUT(req) {
    const { project } = await req.json();
    const all = readData();
    const idx = all.findIndex(p => String(p.id) === String(project.id));
    if (idx >= 0) all[idx] = project; else all.push(project);
    writeData(all);
    return NextResponse.json({ ok: true });
}
