import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || '/tmp/schilders-tokens';
const SUB_FILE = path.join(STORAGE_PATH, 'subscription.json');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

async function leesSub() {
    try { return JSON.parse(await readFile(SUB_FILE, 'utf8')); } catch { return null; }
}

async function slaSub(data) {
    await mkdir(STORAGE_PATH, { recursive: true });
    await writeFile(SUB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });
    if (!APP_URL) return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL niet ingesteld' }, { status: 500 });

    const notificationUrl = `${APP_URL}/api/outlook/webhook`;

    // Vervaldatum: 3 dagen vanaf nu
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    try {
        const bestaande = await leesSub();

        if (bestaande?.subscriptionId && bestaande?.expirationDateTime) {
            const verlooptOver = new Date(bestaande.expirationDateTime) - Date.now();
            // Meer dan 2 dagen geldig → niet verlengen
            if (verlooptOver > 2 * 24 * 60 * 60 * 1000) {
                return NextResponse.json({ ok: true, status: 'al-geldig', expiry: bestaande.expirationDateTime });
            }

            // Verlengen
            const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${bestaande.subscriptionId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ expirationDateTime: expiry }),
            });
            if (res.ok) {
                const data = await res.json();
                await slaSub({ subscriptionId: data.id, expirationDateTime: data.expirationDateTime });
                return NextResponse.json({ ok: true, status: 'verlengd', expiry: data.expirationDateTime });
            }
            // Bij fout: nieuw aanmaken (subscription verwijderd door Microsoft)
        }

        // Nieuw aanmaken
        const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                changeType: 'created',
                notificationUrl,
                resource: 'me/mailFolders/SentItems/messages',
                expirationDateTime: expiry,
                clientState: 'schilders-app',
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[subscribe] Aanmaken mislukt:', res.status, err);
            return NextResponse.json({ error: err }, { status: res.status });
        }

        const data = await res.json();
        await slaSub({ subscriptionId: data.id, expirationDateTime: data.expirationDateTime });
        return NextResponse.json({ ok: true, status: 'nieuw', expiry: data.expirationDateTime });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
