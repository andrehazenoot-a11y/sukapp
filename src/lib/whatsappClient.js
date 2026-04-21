import { Client, LocalAuth } from 'whatsapp-web.js';

let client = null;
let qrCode = null;
let status = 'disconnected'; // disconnected | qr | connecting | ready

export function getWhatsAppClient() {
    if (!client) {
        client = new Client({
            authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            },
        });

        client.on('qr', (qr) => {
            qrCode = qr;
            status = 'qr';
            console.log('[WhatsApp] QR code gegenereerd');
        });

        client.on('ready', () => {
            status = 'ready';
            qrCode = null;
            console.log('[WhatsApp] Verbonden en klaar');
        });

        client.on('authenticated', () => {
            status = 'connecting';
            qrCode = null;
        });

        client.on('auth_failure', () => {
            status = 'disconnected';
            client = null;
        });

        client.on('disconnected', () => {
            status = 'disconnected';
            client = null;
        });

        client.initialize().catch(err => {
            console.error('[WhatsApp] Fout bij initialiseren:', err);
            status = 'disconnected';
            client = null;
        });
    }

    return { client, status, qrCode };
}

export function getWhatsAppStatus() {
    return { status, qrCode };
}

export async function sendWhatsAppMessage(phone, message) {
    const { client: c, status: s } = getWhatsAppClient();
    if (s !== 'ready' || !c) throw new Error('WhatsApp niet verbonden');
    const chatId = `${phone}@c.us`;
    await c.sendMessage(chatId, message);
}
