import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'materiaal-data.json');

function readData() {
    if (!fs.existsSync(DATA_FILE)) return { rijen: [], kolommen: {} };
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { rijen: [], kolommen: {} }; }
}
function writeData(data) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

// GET — materiaaldata ophalen (voor medewerker app)
export async function GET() {
    return NextResponse.json(readData());
}

// POST — materiaaldata opslaan (vanuit beheerder app)
export async function POST(req) {
    try {
        const body = await req.json();
        const huidig = readData();
        writeData({
            rijen:         body.rijen         ?? huidig.rijen ?? [],
            kolommen:      body.kolommen      ?? huidig.kolommen ?? {},
            opslagen:      body.opslagen      ?? huidig.opslagen ?? {},
            verkoopprijzen: body.verkoopprijzen ?? huidig.verkoopprijzen ?? {},
            bestekMap:     body.bestekMap     ?? huidig.bestekMap ?? {},
            bestekLocks:   body.bestekLocks   ?? huidig.bestekLocks ?? {},
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
