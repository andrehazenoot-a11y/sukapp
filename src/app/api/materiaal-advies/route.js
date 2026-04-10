import Anthropic from '@anthropic-ai/sdk';
import { getBestekOpties, BESTEK } from './bestek.js';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { producten, m2, gekozenMaat, besteProduct, besteTotaal, besteAantal, modus, product, wizardContext } = body;

        // ── Systeemopbouw modus ───────────────────────────────────────────
        if (modus === 'systeem') {
            if (!product) return Response.json({ error: 'Geen product opgegeven' }, { status: 400 });
            const ctx = wizardContext || {};

            // Bestek code direct uit wizardContext (gebruiker heeft zelf gekozen)
            let bestekCode = null, bestekNaam = null, bestekStappen = [];
            if (ctx.bestekCode) {
                const [codedeel, ...naamDelen] = ctx.bestekCode.split(' — ');
                const delen = codedeel.trim().split(' ');
                const catCode = delen[0];   // bijv. "OHD"
                const nr = delen[1];        // bijv. "03"
                bestekCode = codedeel.trim();
                const sitKey = ctx.situering === 'Buiten' ? 'buiten' : 'binnen';
                const entry = BESTEK[catCode]?.[sitKey]?.[nr] || BESTEK[catCode]?.['buiten']?.[nr];
                bestekNaam = naamDelen.join(' — ') || entry?.naam || null;
                bestekStappen = entry?.stappen || [];
            }

            // Bestek stappen in prompt opnemen als referentie
            const bestekRegel = bestekCode
                ? `\nOnderhoudNL bestek ${bestekCode} — "${bestekNaam}":\nStandaard bewerkingsstappen:\n${bestekStappen.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
                : '';

            // Per-laag productbeperkingen meegeven aan Claude
            const LAAG_VERTALING = {
                bijgronden:    'grondlaag (bijwerken kale plekken)',
                geheelGronden: 'grondlaag (geheel aanbrengen)',
                voorlakken:    'voorlak',
                aflakken:      'aflaklaag',
            };
            const lagenRegel = ctx.bestekLagen
                ? `\nDoor beheerder ingestelde producten per laag — gebruik UITSLUITEND deze producten, dit heeft VOORRANG op de systeemtabel:\n` +
                  Object.entries(ctx.bestekLagen)
                      .filter(([, ps]) => ps && ps.length > 0)
                      .map(([l, ps]) => `- ${LAAG_VERTALING[l] || l}: ${ps.join(', ')}`)
                      .join('\n') + '\n'
                : '';

            const response = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 900,
                messages: [{
                    role: 'user',
                    content: `Je bent een Sikkens verfadviseur. Geef de systeemopbouw als JSON. Gebruik ALLEEN de productnamen uit de tabel hieronder.

Eindproduct (aflaklaag): ${product}
Ondergrond: ${ctx.ondergrond || '?'} | Situering: ${ctx.situering || '?'} | Aard: ${ctx.aard || '?'} | Opbouw: ${ctx.opbouw || '?'}
${bestekRegel}
VASTE SYSTEEMTABEL — gebruik deze producten ALLEEN als er geen beheerder-override is ingesteld:
Hout buiten dekkend:     grondlaag=Rubbol Primer 1x | voorlak=Rubbol Primer Extra 1x | aflaklaag=${product} 1x
Hout buiten transparant: grondlaag=Cetol BL Endurance Primer 1x | voorlak=Cetol HLS Plus 1x | aflaklaag=${product} 1x
Hout binnen dekkend:     grondlaag=Rubbol BL Primer 1x | voorlak=Rubbol Primer Extra 1x | aflaklaag=${product} 1x
Metaal/non-ferro buiten: grondlaag=Redox BL Forte 1x | voorlak=Redox BL Metal Protect Satin 1x | aflaklaag=${product} 1x
Staal buiten:            grondlaag=Redox BL Forte 2x | voorlak=Redox BL Metal Protect Satin 1x | aflaklaag=${product} 1x
Steenachtig buiten:      grondlaag=Alpha Fixeer 1x | aflaklaag=${product} 2x
Steenachtig binnen:      grondlaag=Alpha Fixeer 1x | aflaklaag=${product} 2x
Vloeren:                 grondlaag=Wapex Primer 1x | aflaklaag=${product} 2x

Uitzonderingen op opbouw:
- Conditie "1.5 beurt": grondlaag=plaatselijk bijwerken 1x | aflaklaag=${product} geheel 1x
- Conditie "2.0 beurt": grondlaag=passende grondverf geheel 1x | aflaklaag=${product} geheel 1x
- Conditie "2.5 beurt": grondlaag=plaatselijk bijwerken 1x | voorlak=${product} geheel 1x | aflaklaag=${product} geheel 1x
- Conditie "3.0 beurt": grondlaag=passende grondverf geheel 1x | voorlak=${product} geheel 1x | aflaklaag=${product} geheel 1x
- S1 (1x bijwerken + 1x dekkend sauzen): grondlaag=bijwerken kale plekken 1x | aflaklaag=${product} 1x
- S2 (2x dekkend sauzen): aflaklaag=${product} 2x
- S3 (alleen bijwerken): grondlaag=bijwerken kale plekken 1x | aflaklaag=${product} 1x
- S4 (1x fixeren + 2x dekkend sauzen): grondlaag=Alpha Fixeer 1x | aflaklaag=${product} 2x
- S5 (1x fixeren + 1x dekkend sauzen): grondlaag=Alpha Fixeer 1x | aflaklaag=${product} 1x
- S6 (2x dekkend sauzen): aflaklaag=${product} 2x
- Opbouw bevat "bijgronden" of "geheel aflakken": grondlaag=Rubbol Primer bijgronden kale plekken 1x | aflaklaag=${product} 1x (geen voorlak)
- Opbouw bevat "alleen aflakken": alleen aflaklaag=${product} 1x
${lagenRegel ? `\n⚠️ BEHEERDER-OVERRIDE — de volgende producten zijn door de beheerder ingesteld en hebben ABSOLUTE VOORRANG op de VASTE SYSTEEMTABEL hierboven. Gebruik UITSLUITEND deze producten voor de aangegeven lagen:\n${lagenRegel}` : ''}
REGELS: voorlak is NOOIT hetzelfde als aflaklaag. Bij steenachtig en vloeren geen voorlak.
1-POT SYSTEMEN: Als aflaklaag "Redox BL Forte" of "Redox BL Metal Protect Satin" is, dan is dit een 1-pot systeem: grondverf, voorlak en aflak zijn hetzelfde product. Geef dan slechts 1 laag in systeem: laag="1-pot systeem", product=${product}, aantal_lagen="3x geheel", opmerking="grondverf, voorlak en aflak in één product".

Geef JSON met velden:
- "systeem": array van lagen met: laag ("grondlaag"/"voorlak"/"aflaklaag"), product, verwerking ("kwast/roller"), aantal_lagen ("1x geheel" of "2x geheel"), opmerking (optioneel, max 1 zin)
- "onderhoud": string bijv. "6 - 8 jaar"

Antwoord ALLEEN met JSON object, geen tekst erbuiten.`,
                }],
            });
            try {
                let tekst = response.content[0].text.trim();
                // Strip markdown code blocks if present
                tekst = tekst.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
                const start = tekst.indexOf('{');
                const end = tekst.lastIndexOf('}');
                if (start === -1 || end === -1) throw new Error('Geen JSON gevonden');
                const parsed = JSON.parse(tekst.slice(start, end + 1));
                return Response.json({ systeem: parsed.systeem, onderhoud: parsed.onderhoud, bestekCode, bestekNaam });
            } catch (parseErr) {
                console.error('Parse error:', parseErr.message, response.content[0]?.text?.slice(0, 200));
                return Response.json({ error: 'Kon systeem niet parsen', detail: parseErr.message }, { status: 500 });
            }
        }

        // ── Productadvies modus (bestaand) ───────────────────────────────
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
