import fs from 'fs';
import path from 'path';

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

// GET: haal token data op (voor de handtekenpagina)
export async function GET(request, { params }) {
    const { token } = await params;   // Next.js 15/16: params is a Promise
    const tokens = readTokens();
    const data = tokens[token];
    if (!data) return Response.json({ error: 'Link ongeldig of verlopen' }, { status: 404 });

    const { signatureData: _, ...safe } = data;
    return Response.json(safe);
}

// POST: sla handtekening op
export async function POST(request, { params }) {
    const { token } = await params;   // Next.js 15/16: params is a Promise
    const body = await request.json();
    const { signatureData, signerName, signerEmail } = body;

    const tokens = readTokens();
    if (!tokens[token]) return Response.json({ error: 'Token niet gevonden' }, { status: 404 });
    if (tokens[token].status === 'signed') {
        return Response.json({ error: 'Dit akkoord is al gegeven' }, { status: 409 });
    }

    const now = new Date();
    tokens[token].status = 'signed';
    tokens[token].signedAt = now.toISOString();
    tokens[token].signerName = signerName;
    tokens[token].signerEmail = signerEmail;
    tokens[token].signatureData = signatureData;
    writeTokens(tokens);

    return Response.json({
        success: true,
        signedAt: tokens[token].signedAt,
    });
}
