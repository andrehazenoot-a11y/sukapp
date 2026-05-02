import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || '/tmp/schilders-tokens';

async function slaRefreshTokenOp(token) {
    try {
        await mkdir(STORAGE_PATH, { recursive: true });
        await writeFile(path.join(STORAGE_PATH, 'ms_refresh_token.txt'), token, 'utf8');
    } catch (e) {
        console.error('[auth] Refresh token opslaan mislukt:', e.message);
    }
}

const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/outlook/auth';
const TENANT = 'cd3d3914-6711-4801-9d09-f83f5a0645d3';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        const returnTo = searchParams.get('returnTo') || '/projecten';
        const state = Buffer.from(returnTo).toString('base64');
        const url = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?` +
            `client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&scope=Mail.ReadWrite+Mail.ReadWrite.Shared+offline_access+MailboxSettings.Read+Calendars.ReadWrite+Contacts.Read+Channel.Create+Channel.ReadBasic.All+ChannelSettings.ReadWrite.All+Tasks.ReadWrite+Team.ReadBasic.All+TeamsTab.Create+ChannelMessage.Send+ChannelMessage.Read.All&response_mode=query` +
            `&state=${encodeURIComponent(state)}`;
        return NextResponse.redirect(url);
    }

    try {
        const resp = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
        });
        const tokens = await resp.json();
        if (!tokens.access_token) throw new Error('Geen access token ontvangen');

        if (tokens.refresh_token) {
            await slaRefreshTokenOp(tokens.refresh_token);
        }

        const stateParam = searchParams.get('state') || '';
        let returnTo = '/projecten';
        try {
            const decoded = Buffer.from(stateParam, 'base64').toString('utf8');
            // Alleen interne paden toestaan — geen externe redirects
            if (decoded && decoded.startsWith('/') && !decoded.startsWith('//')) {
                returnTo = decoded;
            }
        } catch {}
        const res = NextResponse.redirect(new URL(returnTo, req.url));
        res.cookies.set('ms_access_token', tokens.access_token, { httpOnly: true, maxAge: 3600, path: '/' });
        if (tokens.refresh_token) {
            res.cookies.set('ms_refresh_token', tokens.refresh_token, { httpOnly: true, maxAge: 30 * 86400, path: '/' });
        }

        // Subscription aanmaken/verlengen voor SentItems webhook
        try {
            await fetch(new URL('/api/outlook/subscribe', req.url).toString(), { method: 'POST' });
        } catch {}

        return res;
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
