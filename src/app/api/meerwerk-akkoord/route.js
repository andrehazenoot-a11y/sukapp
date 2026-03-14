import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'meerwerk-tokens.json');

function readTokens() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch { return {}; }
}

function writeTokens(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// POST: maak nieuw akkoord-token aan
export async function POST(request) {
    const body = await request.json();
    const { projectId, meerwerkItem, projectNaam, toName, toEmail } = body;

    const token = crypto.randomUUID();
    const tokens = readTokens();
    tokens[token] = {
        projectId,
        meerwerkItem,
        projectNaam,
        toName,
        toEmail,
        createdAt: new Date().toISOString(),
        status: 'pending',
    };
    writeTokens(tokens);

    return Response.json({ token });
}

// GET: haal token op (voor status check)
export async function GET(request) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return Response.json({ error: 'Token vereist' }, { status: 400 });

    const tokens = readTokens();
    const data = tokens[token];
    if (!data) return Response.json({ error: 'Niet gevonden' }, { status: 404 });

    // Stuur geen signatureData mee (privacy + grootte)
    const { signatureData: _, ...safe } = data;
    return Response.json(safe);
}
