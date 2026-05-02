import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

async function ensureTables(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL,
        project_naam VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        user_naam VARCHAR(100) NOT NULL,
        bericht TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        photo VARCHAR(500) DEFAULT NULL,
        media_type VARCHAR(20) DEFAULT NULL,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project (project_id)
    )`);
    await pool.query(`ALTER TABLE schilders_chat ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'info'`);
    await pool.query(`ALTER TABLE schilders_chat ADD COLUMN IF NOT EXISTS photo VARCHAR(500) DEFAULT NULL`);
    await pool.query(`ALTER TABLE schilders_chat ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT NULL`);
    await pool.query(`CREATE TABLE IF NOT EXISTS schilders_chat_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_id INT NOT NULL,
        user_id INT NOT NULL,
        user_naam VARCHAR(100) NOT NULL,
        tekst TEXT NOT NULL,
        aangemaakt_op TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES schilders_chat(id) ON DELETE CASCADE
    )`);
}

// GET /api/chat?projectId=X
export async function GET(req) {
    try {
        const pool = await getDbConnection();
        await ensureTables(pool);
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId vereist' }, { status: 400 });

        const [rows] = await pool.query(
            'SELECT id, user_id, user_naam, bericht, type, photo, media_type, aangemaakt_op FROM schilders_chat WHERE project_id = ? ORDER BY aangemaakt_op ASC LIMIT 300',
            [projectId]
        );
        const ids = rows.map(r => r.id);
        let replies = [];
        if (ids.length > 0) {
            [replies] = await pool.query(
                `SELECT id, chat_id, user_id, user_naam, tekst, aangemaakt_op FROM schilders_chat_replies WHERE chat_id IN (${ids.map(() => '?').join(',')}) ORDER BY aangemaakt_op ASC`,
                ids
            );
        }
        const replyMap = {};
        for (const r of replies) {
            if (!replyMap[r.chat_id]) replyMap[r.chat_id] = [];
            replyMap[r.chat_id].push(r);
        }
        const result = rows.map(r => ({ ...r, replies: replyMap[r.id] || [] }));
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// POST /api/chat — nieuw bericht
export async function POST(req) {
    try {
        const pool = await getDbConnection();
        await ensureTables(pool);
        const { projectId, projectNaam, userId, naam, bericht, type, photo, mediaType } = await req.json();
        if (!projectId || !userId || !naam || (!bericht?.trim() && !photo)) {
            return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 });
        }
        const [result] = await pool.query(
            'INSERT INTO schilders_chat (project_id, project_naam, user_id, user_naam, bericht, type, photo, media_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [projectId, projectNaam || projectId, userId, naam, (bericht || '').trim(), type || 'info', photo || null, mediaType || null]
        );
        const [rows] = await pool.query(
            'SELECT id, user_id, user_naam, bericht, type, photo, media_type, aangemaakt_op FROM schilders_chat WHERE id = ?',
            [result.insertId]
        );
        return NextResponse.json({ ok: true, message: { ...rows[0], replies: [] } });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// PUT /api/chat — bericht bewerken of reply toevoegen
export async function PUT(req) {
    try {
        const pool = await getDbConnection();
        const body = await req.json();
        const { id, userId } = body;
        if (!id) return NextResponse.json({ error: 'id vereist' }, { status: 400 });

        if (body.addReply) {
            const { naam, tekst } = body.addReply;
            const [result] = await pool.query(
                'INSERT INTO schilders_chat_replies (chat_id, user_id, user_naam, tekst) VALUES (?, ?, ?, ?)',
                [id, userId, naam, tekst]
            );
            const [rows] = await pool.query('SELECT * FROM schilders_chat_replies WHERE id = ?', [result.insertId]);
            return NextResponse.json({ ok: true, reply: rows[0] });
        }

        // Bericht bewerken / photo toevoegen
        const [check] = await pool.query('SELECT user_id FROM schilders_chat WHERE id = ?', [id]);
        if (!check.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
        if (String(check[0].user_id) !== String(userId)) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
        if (body.photo !== undefined) {
            await pool.query('UPDATE schilders_chat SET photo = ?, media_type = ? WHERE id = ?', [body.photo, body.mediaType || null, id]);
        } else {
            await pool.query('UPDATE schilders_chat SET bericht = ? WHERE id = ?', [body.bericht, id]);
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}

// DELETE /api/chat?id=X&userId=Y
export async function DELETE(req) {
    try {
        const pool = await getDbConnection();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');
        const replyId = searchParams.get('replyId');

        if (replyId) {
            await pool.query('DELETE FROM schilders_chat_replies WHERE id = ? AND user_id = ?', [replyId, userId]);
            return NextResponse.json({ ok: true });
        }

        const [rows] = await pool.query('SELECT user_id FROM schilders_chat WHERE id = ?', [id]);
        if (!rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
        if (String(rows[0].user_id) !== String(userId)) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
        await pool.query('DELETE FROM schilders_chat WHERE id = ?', [id]);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
    }
}
