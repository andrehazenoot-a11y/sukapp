import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
    try {
        const { subject, body } = await req.json();
        if (!body && !subject) return NextResponse.json({ taken: [] });

        const tekst = (body || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000);

        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            messages: [{
                role: 'user',
                content: `Je bent assistent voor een schildersbedrijf. Analyseer deze email en extraheer concrete actiepunten die uitgevoerd moeten worden. Alleen echte taken (niet "email lezen", niet "overleg plannen" tenzij heel specifiek). Als er een datum of deadline in de email staat, neem die mee als deadline.

Geef je antwoord uitsluitend als JSON array, zonder uitleg: [{"name": "korte taaknaam", "deadline": "YYYY-MM-DD of null"}]
Als er geen concrete taken zijn, geef een lege array: []

Onderwerp: ${subject || ''}
Email: ${tekst}`,
            }],
        });

        const raw = response.content[0]?.text || '[]';
        const match = raw.match(/\[[\s\S]*\]/);
        const taken = match ? JSON.parse(match[0]) : [];

        return NextResponse.json({ taken });
    } catch (err) {
        return NextResponse.json({ error: err.message, taken: [] }, { status: 500 });
    }
}
