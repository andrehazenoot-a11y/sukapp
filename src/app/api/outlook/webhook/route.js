import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const TENANT = 'cd3d3914-6711-4801-9d09-f83f5a0645d3';
const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;
const STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || '/tmp/schilders-tokens';

// Microsoft stuurt een GET met validationToken bij subscription aanmaken
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const validationToken = searchParams.get('validationToken');
    if (validationToken) {
        return new Response(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
    return NextResponse.json({ ok: true });
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    if (!body?.value?.length) return NextResponse.json({ ok: true });

    for (const notif of body.value) {
        if (notif.clientState !== 'schilders-app') continue;

        const emailId = notif.resourceData?.id;
        if (!emailId) continue;

        try {
            // Haal access token op via opgeslagen refresh token
            const refreshToken = await readFile(path.join(STORAGE_PATH, 'ms_refresh_token.txt'), 'utf8').catch(() => null);
            if (!refreshToken) { console.error('[webhook] Geen refresh token gevonden'); continue; }

            const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken.trim(),
                    scope: 'https://graph.microsoft.com/.default offline_access',
                }),
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) { console.error('[webhook] Token ophalen mislukt:', tokenData); continue; }

            // Nieuw refresh token opslaan als Microsoft er een stuurt
            if (tokenData.refresh_token) {
                const { writeFile } = await import('fs/promises');
                await writeFile(path.join(STORAGE_PATH, 'ms_refresh_token.txt'), tokenData.refresh_token, 'utf8').catch(() => {});
            }

            const accessToken = tokenData.access_token;

            // Email ophalen
            const emailRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}?$select=conversationId,subject,from,bodyPreview`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!emailRes.ok) { console.error('[webhook] Email ophalen mislukt:', await emailRes.text()); continue; }
            const email = await emailRes.json();

            // Gesprek opzoeken in mapping
            const mappingTekst = await readFile(path.join(STORAGE_PATH, 'gesprek-mapping.json'), 'utf8').catch(() => '{}');
            const mapping = JSON.parse(mappingTekst);
            const koppeling = mapping[email.conversationId];
            if (!koppeling) continue; // Email niet gekoppeld aan een project

            // Bericht direct posten naar Teams-kanaal via delegated token
            const van = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Onbekend';
            const berichtHtml = `<b>📧 ${email.subject || '(geen onderwerp)'}</b><br><span style="color:#666">Van: ${van}</span><br><br>${email.bodyPreview || ''}`.trim();
            const bericht = await fetch(`https://graph.microsoft.com/v1.0/teams/${koppeling.teamId}/channels/${koppeling.teamsKanaalId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: { contentType: 'html', content: berichtHtml } }),
            });
            if (!bericht.ok) console.error('[webhook] Bericht posten mislukt:', await bericht.text());

        } catch (err) {
            console.error('[webhook] Fout bij verwerken notificatie:', err.message);
        }
    }

    return NextResponse.json({ ok: true });
}
