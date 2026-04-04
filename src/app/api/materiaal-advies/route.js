import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { producten, m2, gekozenMaat, besteProduct, besteTotaal, besteAantal } = body;

        if (!producten || producten.length === 0) {
            return Response.json({ error: 'Geen producten opgegeven' }, { status: 400 });
        }

        const lijst = producten.map((p, i) => `${i + 1}. ${p}`).join('\n');

        let contextZin = '';
        if (m2 && besteProduct) {
            contextZin = `\n\nSituatie: voor ${m2} m², beste keuze is "${besteProduct}" — ${besteAantal}× ${gekozenMaat}L emmers, totaalprijs €${besteTotaal}.`;
        }

        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: `Je bent een ervaren schilder in Nederland. Geef een kort, praktisch advies over ${producten.length === 1 ? 'dit product' : 'deze producten'} voor een collega-schilder.

${producten.length === 1 ? 'Product' : 'Producten'}:
${lijst}${contextZin}

Geef in maximaal 2-3 zinnen:
- Waarvoor is het product geschikt (binnen/buiten, welk oppervlak)?
- 1 praktische tip${m2 ? '\n- Beoordeel of de prijs realistisch is voor dit project' : ''}

Schrijf informeel en direct, geen opsomming, gewoon lopende tekst. Geen inleiding, direct het advies.`,
                },
            ],
        });

        return Response.json({ advies: response.content[0].text.trim() });

    } catch (error) {
        console.error('Advies API error:', error);
        return Response.json({ error: 'Kon geen advies ophalen' }, { status: 500 });
    }
}
