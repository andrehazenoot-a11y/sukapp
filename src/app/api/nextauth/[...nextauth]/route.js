import { handlers } from '@/auth';

export async function GET(req, ctx) {
    try {
        return await handlers.GET(req, ctx);
    } catch (e) {
        console.error('[NextAuth GET error]', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function POST(req, ctx) {
    try {
        return await handlers.POST(req, ctx);
    } catch (e) {
        console.error('[NextAuth POST error]', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
