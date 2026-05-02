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

const SEED_USERS = [
    { id: '1', username: 'admin',    password: 'admin123',   name: 'Jan Modaal',    role: 'Beheerder', initials: 'JM', phone: '31612345678', bsn: '123456782' },
    { id: '2', username: 'schilder', password: 'verf2025',   name: 'Piet Kwast',    role: 'Schilder',  initials: 'PK', phone: '31687654321', bsn: '211320894' },
    { id: '3', username: 'zzp',      password: 'zzp2025',    name: 'Klaas Roller',  role: "ZZP'er",    initials: 'KR', phone: '31698765432', bsn: '987654321' },
    { id: '4', username: 'voorman',  password: 'voorman123', name: 'Henk de Vries', role: 'Voorman',   initials: 'HV', phone: '31676543210', bsn: '345678901' },
];

async function ensureSeeded(pool) {
    const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM schilders_gebruikers`);
    if (rows[0].cnt === 0) {
        for (const u of SEED_USERS) {
            await pool.query(
                `INSERT IGNORE INTO schilders_gebruikers (id, username, password, name, role, initials, phone, bsn) VALUES (?,?,?,?,?,?,?,?)`,
                [u.id, u.username, u.password, u.name, u.role, u.initials || null, u.phone || null, u.bsn || null]
            );
        }
    }
}

// GET /api/gebruikers → alle actieve gebruikers (zonder wachtwoord)
export async function GET() {
    try {
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        await ensureSeeded(pool);
        const [rows] = await pool.query(
            `SELECT id, username, name, role, initials, phone FROM schilders_gebruikers WHERE actief = 1 ORDER BY aangemaakt ASC`
        );
        return NextResponse.json(rows.map(u => ({
            id: u.id,
            username: u.username,
            name: u.name,
            role: u.role,
            initials: u.initials || '',
            phone: u.phone || '',
        })));
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/gebruikers — nieuwe gebruiker of update
// Body: { id?, username, password, name, role, initials?, phone? }
export async function POST(req) {
    try {
        const { id, username, password, name, role, initials, phone } = await req.json();
        if (!username || !password || !name) {
            return NextResponse.json({ error: 'username, password en name zijn verplicht' }, { status: 400 });
        }
        const pool = await getDbConnection();
        await pool.query(CREATE_TABLE);
        const userId = id || ('user_' + Date.now());
        // Bij nieuwe gebruiker (geen id): controleer op dubbele gebruikersnaam
        if (!id) {
            const [existing] = await pool.query(
                'SELECT id FROM schilders_gebruikers WHERE username = ?', [username]
            );
            if (existing.length > 0) {
                return NextResponse.json({ error: 'Gebruikersnaam bestaat al' }, { status: 409 });
            }
        }
        const parts = name.trim().split(' ');
        const calc_initials = initials || (parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase());
        // Hash wachtwoord als het nog geen bcrypt hash is
        const hashedPw = password.startsWith('$2') ? password : await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO schilders_gebruikers (id, username, password, name, role, initials, phone)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                password = VALUES(password),
                name = VALUES(name),
                role = VALUES(role),
                initials = VALUES(initials),
                phone = VALUES(phone)`,
            [userId, username, hashedPw, name, role || 'Medewerker', calc_initials, phone || null]
        );
        return NextResponse.json({ ok: true, id: userId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Gebruikersnaam bestaat al' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PUT /api/gebruikers — update bestaande gebruiker (gedeeltelijk)
// Body: { id, ...velden }
export async function PUT(req) {
    try {
        const { id, ...updates } = await req.json();
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        const allowed = ['username', 'password', 'name', 'role', 'initials', 'phone'];
        const fields = Object.keys(updates).filter(k => allowed.includes(k));
        if (fields.length === 0) return NextResponse.json({ ok: true });
        // Hash nieuw wachtwoord als aanwezig
        if (updates.password && !updates.password.startsWith('$2')) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => updates[f]);
        await pool.query(
            `UPDATE schilders_gebruikers SET ${setClause} WHERE id = ?`,
            [...values, String(id)]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/gebruikers?id=X — deactiveer gebruiker (soft delete)
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 });
        const pool = await getDbConnection();
        await pool.query(
            `UPDATE schilders_gebruikers SET actief = 0 WHERE id = ?`,
            [id]
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
