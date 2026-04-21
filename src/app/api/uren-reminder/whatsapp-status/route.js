import { NextResponse } from 'next/server';
import { getWhatsAppStatus, getWhatsAppClient } from '@/lib/whatsappClient';
import QRCode from 'qrcode';

export async function GET() {
    try {
        // Initialiseer client als nog niet gedaan
        getWhatsAppClient();
        const { status, qrCode } = getWhatsAppStatus();

        let qrImage = null;
        if (qrCode) {
            qrImage = await QRCode.toDataURL(qrCode);
        }

        return NextResponse.json({ status, qrImage });
    } catch (err) {
        return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
    }
}

export async function DELETE() {
    // Verbreek verbinding / reset
    try {
        const { client } = getWhatsAppStatus();
        if (client) await client.destroy();
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
