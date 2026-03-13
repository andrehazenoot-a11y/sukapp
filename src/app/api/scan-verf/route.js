import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
    try {
        const { image } = await request.json();

        if (!image) {
            return Response.json({ error: 'Geen afbeelding ontvangen' }, { status: 400 });
        }

        // Strip data URL prefix als aanwezig
        const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
        const mediaType = image.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';

        const response = await anthropic.messages.create({
            model: 'claude-opus-4-5',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Data,
                            },
                        },
                        {
                            type: 'text',
                            text: `Je bent een expert in het lezen van verflabels/etiketten voor de Nederlandse schildersindustrie.

Analyseer deze afbeelding van een verflabel en extraheer ALLE zichtbare informatie.

Geef het resultaat als JSON met PRECIES deze velden:

1. "merk" — het verfmerk/fabrikant (bijv. Sikkens, Sigma, Flexa, Trimetal, De Beer, Ralston, Wijzonol, Koopmans, Boss Paints, Dulux)

2. "product" — de volledige productnaam ZONDER merk (bijv. "Rubbol BL Satura", "Contour PU Satin", "Alpha Rezisto Clean Matt", "S2U Nova Satin")

3. "type" — het type verf. Gebruik een van deze waarden:
   - "Watergedragen lakverf" (voor waterbasis lak)
   - "Oplosmiddelhoudende lakverf" (voor terpentinebasis lak)
   - "Watergedragen grondverf" (voor waterbasis primer)
   - "Oplosmiddelhoudende grondverf" (voor terpentinebasis primer)
   - "Watergedragen beits" (voor waterbasis beits)
   - "Oplosmiddelhoudende beits" (voor terpentinebasis beits)
   - "Muurverf" (voor latex/muurverf/saus)

   PRODUCTHERKENNING — gebruik deze kennis om type en categorie te bepalen:

   SIKKENS:
   Binnenverf watergedragen: Rubbol BL Rezisto Satin, Rubbol BL Rezisto Mat, Rubbol BL Rezisto Semi Gloss, Rubbol BL Rezisto High Gloss, Rubbol BL Satura (ook voor houten vloeren)
   Buitenverf watergedragen: Rubbol BL Ventura Satin, Rubbol BL Endurance High Gloss
   Buitenverf oplosmiddelhoudend: Rubbol XD High Gloss, Rubbol XD Semi-Gloss, Rubbol SB (hoogglans buiten), Rubbol Satura (satijnglans buiten), Rubbol EPS (vochtregulerende buitenlak)
   Binnen+buiten: Rubbol AZ (hoogglans, binnen en buiten)
   Primer watergedragen: Rubbol BL Primer, Rubbol BL Rezisto Primer, Rubbol BL Isoprimer, Rubbol BL Uniprimer, Redox BL
   Primer oplosmiddelhoudend: Rubbol Primer Extra, Rubbol Express (sneldrogend), Redox OS
   Beits (buitenverf): Cetol BLX-Pro (watergedragen), Cetol BL Unitop (watergedragen), Cetol HLS Plus (oplosmiddelhoudend), Cetol Novatech (oplosmiddelhoudend), Cetol Filter 7 Plus, Cetol TGL Plus
   Saus (muurverf): Alpha Rezisto Easy Clean (mat), Alpha Rezisto Clean Satin, Alpha Superlatex Mat, Alpha Climate, Alphatex SF, Alpha Sol
   Speciale producten: Wapex 660 (keuken/badkamer vloer-/wandcoating)

   SIGMA:
   Binnenverf watergedragen: S2U Nova Satin (= Contour Aqua PU Satin), S2U Nova Matt, Contour Aqua Gloss
   Buitenverf oplosmiddelhoudend: S2U Gloss (= Contour PU Gloss), S2U Satin (= Contour PU Satin), S2U Allure Satin (= Contour Protect PU Satin, tot 10 jaar bescherming)
   Primer watergedragen: S2U Nova Primer, Multiprimer Aqua
   Primer oplosmiddelhoudend: S2U Allure Primer (= Contour PU Primer), Haftprimer
   Beits (buitenverf): Woodprotect 2in1, Woodprotect Solid, Woodprotect Semi-Transparent
   Saus (muurverf): Muurverf Mat, Muurverf Reinigbaar, Muurverf Extra Mat, Superlatex Mat, Superlatex Satin

   FLEXA:
   Binnenverf watergedragen: Strak in de Lak (binnen), Mooi Makkelijk Lak
   Buitenverf oplosmiddelhoudend: Flexa Hoogglans
   Saus (muurverf): Strak op de Muur, Creations, Powerdek, Mooi Makkelijk Muurverf

   WIJZONOL:
   Binnenverf watergedragen: Aqua Brillant, Aqua Lak
   Buitenverf oplosmiddelhoudend: Lak Halfglans, Lak Zijdeglans, Dekkend
   Primer watergedragen: Aqua Primer
   Primer oplosmiddelhoudend: Grondverf
   Beits (buitenverf): Transparant Extra, Dekkend Extra


   TRIMETAL:
   Binnenverf watergedragen: Permacryl, Permacryl Satin, Permacryl PU
   Buitenverf oplosmiddelhoudend: Permalux, Permalux Satin
   Saus (muurverf): Globacryl, Rollatex, Magnatex

   RALSTON:
   Saus (muurverf): Extra Tex Mat, Extra Tex Mat 2, Clean Mat, Pro Clean Mat
   Binnenverf watergedragen: Aqua Satin PU, Biocote

   KOOPMANS:
   Beits (buitenverf): Ecoleum, Perkoleum, Grondbeits, Impra
   Binnenverf watergedragen: Hoogglans Aqua, Zijdeglans Aqua

   VEVEO:
   Binnenverf watergedragen: Celsor Aqua Zijdeglans, Celsor Aqua Hoogglans, Ralley Aqua Primer
   Buitenverf oplosmiddelhoudend: Celsor Zijdeglans, Celsor Hoogglans
   Saus (muurverf): Collix Mat, Collix Satin, Systeemlatex

   HERBOL:
   Binnenverf watergedragen: Herbolux Aqua PU Satin, Herbolux Aqua PU Gloss, Herbacryl
   Buitenverf oplosmiddelhoudend: Herbolux Gloss
   Saus (muurverf): Herbidur, Zenit PU, Profi DIN

   NELF:
   Binnenverf watergedragen: Nelfamar Aqua Satin, Nelfamar Aqua Primer, Nelfadur Aqua
   Buitenverf oplosmiddelhoudend: Nelfamar Satin, Nelfamar Hoogglans, Nelfamar SD Coating
   Primer oplosmiddelhoudend: Nelfapré Snelgrond (sneldrogend, binnen+buiten)
   Saus (muurverf): Nelfaplan, Nelfalatex

   Herkenningsregels type:
   - "BL" in productnaam → Watergedragen
   - "SB" of "AZ" in productnaam → Oplosmiddelhoudend
   - "Aqua" in productnaam → Watergedragen
   - "PU" in productnaam → vaak Watergedragen
   - "Cetol" → Beits
   - "Alpha" → meestal Muurverf/Saus
   - "Muurverf", "Latex", "Tex" → Muurverf/Saus

4. "kleur" — ALLEEN de technische kleurCODE. Dit is een RAL-nummer, NCS-code of Sikkens-code.
   Voorbeelden: "RAL 9010", "RAL 7016", "NCS S 1005-Y50R", "F6.05.80", "AN.02.82"
   ⚠️ Dit is NOOIT een naam zoals "wit" of "White Clay" — dat hoort bij kleurNaam!

5. "kleurNaam" — de BESCHRIJVENDE naam van de kleur in woorden.
   Voorbeelden: "White Clay", "Gebroken Wit", "Roomwit", "Antracietgrijs", "Zuiver Wit", "Eiken licht"
   ⚠️ Dit is NOOIT een code zoals "RAL 9010" of "F6.05.80" — dat hoort bij kleur!
   ⚠️ Dit is ook NIET de collectienaam — dat hoort bij collectie!
   Op Sikkens etiketten staat dit vaak bij het label "Kleurnaam:" of "Kleur naam:"

6. "inhoud" — het volume van het blik (bijv. "1L", "2.5L", "5L", "10L")

6b. "werkelijkeInhoud" — de WERKELIJKE inhoud zoals vermeld op het etiket, vaak in ml (bijv. "930ml", "2370ml", "4750ml"). Dit staat vaak bij "Werkelijke inhoud:" of "Netto inhoud:" op het etiket.

7. "categorie" — kies PRECIES een van deze 7 categorieën:
   "Binnen aflak" = lakverf/dekkende verf voor binnenshuis (Rubbol BL Rezisto, BL Satura, S2U Nova, Contour Aqua, Strak in de Lak, Permacryl)
   "Binnen primer" = grondverf/primer voor binnenshuis (Rubbol BL Primer, BL Uniprimer, BL Isoprimer, S2U Nova Primer, Multiprimer Aqua, Redox BL)
   "Buiten primer" = grondverf/primer voor buitenshuis (Rubbol Primer Extra, Redox OS, S2U Allure Primer, Nelfapré Snelgrond)
   "Buiten voorlak" = beits/transparante bescherming voor buiten (Cetol BLX-Pro, Cetol HLS Plus, Cetol Novatech, Woodprotect, Ecoleum, Perkoleum)
   "Buiten aflak" = dekkende lakverf voor buitenshuis (Rubbol XD, Rubbol SB, Rubbol AZ, S2U Gloss, S2U Allure Satin, Permalux)
   "Muurverf binnen" = muurverf/latex voor binnen (Alpha Rezisto, Alpha Superlatex, Strak op de Muur, Powerdek, Superlatex, Muurverf Mat)
   "Muurverf buiten" = muurverf/gevelverf voor buiten (gevelsaus, buitenmuurverf)

8. "collectie" — de collectie/serie/kleurenkaart waaruit de kleur komt.
   Voorbeelden: "Zoffany Paints", "Color Collection", "Creative Collection"
   ⚠️ Dit is NIET de productnaam en NIET de kleurnaam!
   Op Sikkens etiketten staat dit bij het label "Collectie:"

9. "datum" — productie- of houdbaarheidsdatum als zichtbaar op het etiket

10. "basis" — de mengbasis (bijv. "W05", "P", "AC", "N00", "W00")

11. "winkel" — de winkelnaam/dealer, vaak DIKGEDRUKT bovenaan het etiket.
   Voorbeelden: "SIKKENS NOORDWIJK 1", "Sigma Verfcentrum Leiden", "Sikkens Lisse"
   Dit is de naam van de verfwinkel/verkooppunt, NIET het verfmerk zelf.

STRIKTE REGELS:
- Lees ALLE tekst op het etiket zeer zorgvuldig
- Negeer waarschuwingsteksten, gevarensymbolen en veiligheidsinformatie
- Als een veld NIET zichtbaar is, vul dan "" in (lege string)
- VERWAR NOOIT kleur (code) met kleurNaam (beschrijvende naam)
- VERWAR NOOIT collectie met product of kleurNaam
- Geef ALLEEN de JSON terug, geen andere tekst, geen markdown
- Zoek expliciet naar labels als "Collectie:", "Kleurnaam:", "Product:", "Basis:", "Inhoud:" op het etiket

Voorbeeld output:
{"merk":"Sikkens","product":"Rubbol BL Rezisto Satin","type":"Watergedragen lakverf","kleur":"F6.05.80","kleurNaam":"White Clay","inhoud":"1L","categorie":"Binnen aflak","collectie":"Zoffany Paints","datum":"26/01/2026","basis":"W05","winkel":"SIKKENS NOORDWIJK 1"}`
                        }
                    ],
                },
            ],
        });

        // Parse Claude's response
        const text = response.content[0].text.trim();

        // Probeer JSON te parsen (Claude kan soms markdown code blocks gebruiken)
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            // Probeer JSON uit markdown code block te halen
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error('Kon geen JSON uit Claude response parsen');
            }
        }

        // Zorg dat alle verwachte velden bestaan
        const result = {
            merk: parsed.merk || '',
            product: parsed.product || '',
            type: parsed.type || '',
            kleur: parsed.kleur || '',
            kleurNaam: parsed.kleurNaam || '',
            inhoud: parsed.inhoud || '',
            categorie: parsed.categorie || '',
            collectie: parsed.collectie || '',
            datum: parsed.datum || '',
            basis: parsed.basis || '',
            winkel: parsed.winkel || '',
        };

        return Response.json({ success: true, result, rawResponse: text });

    } catch (error) {
        console.error('Claude API error:', error);
        return Response.json(
            { error: 'Fout bij analyse: ' + (error.message || 'Onbekende fout') },
            { status: 500 }
        );
    }
}
