import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS schilders_gebruikers (
    id VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Medewerker',
    initials VARCHAR(10) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    bsn VARCHAR(20) DEFAULT NULL,
    actief TINYINT(1) DEFAULT 1,
    aangemaakt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
)`;

// Seed hardcoded users if table is leeg
const SEED_USERS = [
    { id: '1', username: 'admin',    password: 'admin123',   name: 'Jan Modaal',    role: 'Beheerder', initials: 'JM', phone: '31612345678' },
    { id: '2', username: 'schilder', password: 'verf2025',   name: 'Piet Kwast',    role: 'Schilder',  initials: 'PK', phone: '31687654321' },
    { id: '3', username: 'zzp',      password: 'zzp2025',    name: 'Klaas Roller',  role: "ZZP'er",    initials: 'KR', phone: '31698765432' },
    { id: '4', username: 'voorman',  password: 'voorman123', name: 'Henk de Vries', role: 'Voorman',   initials: 'HV', phone: '31676543210' },
];

async function ensureSeeded(pool) {
    const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM schilders_gebruikers`);
    if (rows[0].cnt === 0) {
        for (const u of SEED_USERS) {
            const hashed = await bcrypt.hash(u.password, 10);
            await pool.query(
                `INSERT IGNORE INTO schilders_gebruikers (id, username, password, name, role, initials, phone) VALUES (?,?,?,?,?,?,?)`,
                [u.id, u.username, hashed, u.name, u.role, u.initials || null, u.phone || null]
            );
        }
    }
}

// Eenvoudige in-memory rate limiter: max 10 pogingen per IP per 5 minuten
const loginAttempts = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minuten
    const max = 10;
    const entry = loginAttempts.get(ip) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    loginAttempts.set(ip, entry);
    return entry.count > max;
}

// POST /api/auth/validate — publiek toegankelijk (login validatie)
// Body: { username, password }
export async function POST(req) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (isRateLimited(ip)) {
            return NextResponse.json({ error: 'Te veel pogingen. Probeer het over 5 minuten opnieuw.' }, { status: 429 });
        }
        const { username, password } = await req.json();
        if (!username || !password) {
            return NextResponse.json({ error: 'username en password verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await ensureSeeded(pool);

        // Haal user op op basis van username alleen
        const [rows] = await pool.query(
            `SELECT id, username, password, name, role, initials, phone FROM schilders_gebruikers WHERE username = ? AND actief = 1`,
            [username]
        );
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Ongeldige gebruikersnaam of wachtwoord' }, { status: 401 });
        }
        const u = rows[0];
        const stored = u.password;

        // Controleer wachtwoord: bcrypt of plaintext (lazy migration)
        let match = false;
        const isBcrypt = stored.startsWith('$2');
        if (isBcrypt) {
            match = await bcrypt.compare(password, stored);
        } else {
            // Plaintext vergelijking voor bestaande accounts
            match = stored === password;
            if (match) {
                // Migreer direct naar bcrypt
                const hashed = await bcrypt.hash(password, 10);
                await pool.query(`UPDATE schilders_gebruikers SET password = ? WHERE id = ?`, [hashed, u.id]);
            }
        }

        if (!match) {
            return NextResponse.json({ error: 'Ongeldige gebruikersnaam of wachtwoord' }, { status: 401 });
        }

        return NextResponse.json({
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            initials: u.initials || '',
            phone: u.phone || '',
        });
    } catch (e) {
        return NextResponse.json({ error: 'Login mislukt' }, { status: 500 });
    }
}
