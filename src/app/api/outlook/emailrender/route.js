import { cookies } from 'next/headers';

// GET: render een volledige email als HTML pagina (cid: afbeeldingen worden inline data URIs)
export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return new Response(
        '<html><body style="font-family:sans-serif;color:#94a3b8;padding:16px">Niet verbonden met Outlook</body></html>',
        { status: 401, headers: { 'Content-Type': 'text/html' } }
    );

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response('<html><body>Geen id</body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } });

    try {
        const r = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${id}?$select=body`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return new Response(`<html><body>Email niet gevonden (${r.status})</body></html>`,
            { status: r.status, headers: { 'Content-Type': 'text/html' } });

        const data = await r.json();
        let bodyHtml = data.body?.contentType === 'html' ? data.body.content : null;
        const bodyText = data.body?.contentType === 'text' ? data.body.content : null;

        // Vervang cid: afbeeldingen door inline data URIs zodat ze altijd laden
        if (bodyHtml && bodyHtml.includes('cid:')) {
            const attRes = await fetch(
                `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(id)}/attachments?$select=id,contentId,name,contentType,contentBytes&$top=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (attRes.ok) {
                const attData = await attRes.json();
                for (const att of (attData.value || [])) {
                    if (!att.contentId || !att.contentBytes) continue;
                    const cid = att.contentId.replace(/[<>]/g, '');
                    const dataUrl = `data:${att.contentType || 'image/png'};base64,${att.contentBytes}`;
                    bodyHtml = bodyHtml.split(`cid:${cid}`).join(dataUrl);
                }
            }
        }

        const content = bodyHtml
            ? `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;padding:16px;margin:0;background:#fff}a{color:#3b82f6}img{max-width:100%;height:auto}</style></head><body>${bodyHtml}</body></html>`
            : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre style="font-family:inherit;white-space:pre-wrap;font-size:14px;color:#334155;line-height:1.6">${bodyText || '(leeg bericht)'}</pre></body></html>`;

        return new Response(content, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'private, max-age=300',
                'X-Frame-Options': 'SAMEORIGIN',
            },
        });
    } catch (err) {
        return new Response(`<html><body>Fout: ${err.message}</body></html>`,
            { status: 500, headers: { 'Content-Type': 'text/html' } });
    }
}
