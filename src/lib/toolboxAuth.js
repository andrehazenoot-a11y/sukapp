import { getDbConnection } from './db';
import crypto from 'crypto';

export function hashWachtwoord(wachtwoord) {
    return crypto.createHash('sha256').update(wachtwoord).digest('hex');
}

export function genereerToken() {
    return crypto.randomBytes(32).toString('hex');
}

export async function getToolboxUser(req) {
    const token = req.cookies.get('toolbox_token')?.value;
    if (!token) return null;
    try {
        const pool = await getDbConnection();
        const [rows] = await pool.query(
            'SELECT u.* FROM toolbox_sessies s JOIN toolbox_users u ON s.user_id = u.id WHERE s.token = ? AND s.verlopen_op > NOW()',
            [token]
        );
        return rows[0] || null;
    } catch {
        return null;
    }
}

export async function requireToolboxUser(req) {
    const user = await getToolboxUser(req);
    if (!user) return null;
    return user;
}

export async function requireToolboxAdmin(req) {
    const user = await getToolboxUser(req);
    if (!user || user.rol !== 'admin') return null;
    return user;
}
