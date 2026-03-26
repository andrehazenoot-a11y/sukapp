import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';

// POST: schrijf .msg naar temp-bestand en open direct in Outlook (lokale server)
export async function POST(req) {
    try {
        const { content, name } = await req.json();
        if (!content) return NextResponse.json({ error: 'Geen inhoud' }, { status: 400 });

        const buf = Buffer.from(content, 'base64');
        const bestandsnaam = (name || 'email').replace(/[\\/:*?"<>|]/g, '_');
        const tempPad = join(tmpdir(), `${randomUUID()}_${bestandsnaam}`);

        await writeFile(tempPad, buf);

        // Windows: open met de standaard applicatie (Outlook voor .msg)
        exec(`start "" "${tempPad}"`);

        // Verwijder het tijdelijke bestand na 30 seconden
        setTimeout(() => {
            import('fs').then(fs => fs.unlink(tempPad, () => {}));
        }, 30000);

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
