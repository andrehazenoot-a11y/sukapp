'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

const BTW = 0.21;

function loadLS(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function fmt(n) {
    return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

// Extraheer basisnaam identiek aan admin pagina
function getBasisNaam(naam) {
    return String(naam ?? '')
        .replace(/\b\d+[.,]?\d*\s*(ltr?|liter|ml|cl|l)\b/gi, '')
        .replace(/\b(w\d{2}|n\d{2}|m\d{2}|p\d{2}|b\d{2})\b/gi, '')
        .replace(/\b(kleur|kl|kl\.|kleurloos|tint|tints?|tu|tc|uit|wit|zwart|white|kluit|mengbaar|base|basis)\b/gi, '')
        .replace(/\/?\b\d{2,4}\b/g, '') // /003, 000, 0030 etc.
        .replace(/\b(xxs|xs|s\b|m\b|xl|xxl|3xl|4xl|5xl|st\b|stuks?)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .toUpperCase();
}

function parseEntry(e) {
    if (!e) return {};
    return typeof e === 'string' ? { tds: e } : e;
}

// Bouw directe TDS-PDF URL op basis van productnaam
function getTdsUrl(naam) {
    if (!naam) return null;
    // Verwijder verpakkingsgrootte, kleurindicaties en maataanduidingen
    const schoon = naam
        .replace(/\b\d+[.,]?\d*\s*(ltr?|liter|ml|cl|l\b)/gi, '')
        .replace(/\b(kleur|kl|kl\.|kleurloos|tint|tints?|tu|tc|uit|wit|zwart|white|kluit|mengbaar|base|basis)\b/gi, '')
        .replace(/\/?\b\d{2,4}\b/g, '') // /003, 000, 0030 etc.
        .replace(/\b(stuk|st|maat|xxs|xs|s|m|xl|xxl|3xl|4xl|5xl)\b/gi, '')
        .replace(/\bsf\s*\d+\b/gi, s => s) // behoud SF als productnaam
        .replace(/\s{2,}/g, ' ')
        .trim()
        .toLowerCase();

    const metUnderscores = schoon.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const metStreepjes   = schoon.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const n = naam.toLowerCase();
    // Sikkens / AkzoNobel
    if (n.includes('sikkens') || n.includes('alphacryl') || n.includes('rubbol') || n.includes('cetol') || n.includes('alpha ') || n.includes('redox') || n.includes('wapex')) {
        return `https://msp.images.akzonobel.com/prd/dh/enlexp/documents/sikkens_${metUnderscores}.pdf`;
    }
    // Sigma
    if (n.includes('sigma') || n.includes('s2u') || n.includes('contour')) {
        return `https://data.decoprof.nl/productblad/sigma-${metStreepjes}.pdf`;
    }
    // Flexa
    if (n.includes('flexa')) {
        return `https://data.decoprof.nl/productblad/flexa-${metStreepjes}.pdf`;
    }
    // Ralston
    if (n.includes('ralston')) {
        return `https://data.decoprof.nl/productblad/ralston-${metStreepjes}.pdf`;
    }
    // Generiek via decoprof
    return `https://data.decoprof.nl/productblad/${metStreepjes}.pdf`;
}

// Probeer inhoud (aantal liter/stuks) te extraheren
function getInhoud(row, cols) {
    // 1. Uit gekoppelde inhoud-kolom
    if (cols.inhoud && row[cols.inhoud]) {
        const v = parseFloat(String(row[cols.inhoud]).replace(',', '.'));
        if (v > 0) return v;
    }
    // 2. Uit productnaam: zoek patronen zoals "5L", "10 ltr", "2.5L", "500ml", "12 stuks"
    const naam = String(row[cols.naam] ?? '');
    const match = naam.match(/(\d+[.,]?\d*)\s*(ltr?|liter|ml|cl|stuks?|st\b|kg|gram|gr\b)/i);
    if (match) {
        let val = parseFloat(match[1].replace(',', '.'));
        const unit = match[2].toLowerCase();
        if (unit === 'ml' || unit === 'cl') val = unit === 'ml' ? val / 1000 : val / 100; // naar liter
        if (val > 0) return val;
    }
    return null;
}

function getVerkoopprijs(row, cols, verkoopprijzen, opslagen, prijzen, rowIndex) {
    // Sleutel op artikelcode (zelfde als admin), fallback op naam dan index
    const rk = row[cols.code] || row[cols.naam] || String(rowIndex);
    // 1. Handmatige verkoopprijs (beheerder) — altijd prioriteit
    if (verkoopprijzen[rk] != null && verkoopprijzen[rk] !== '') {
        const v = parseFloat(verkoopprijzen[rk]);
        if (v > 0) return { prijs: v, bron: 'verkoop' };
    }
    // 2. Bereken via inkoopprijs + globale opslag + BTW + per-rij opslag
    const raw = parseFloat(String(row[cols.prijs] ?? '').replace(',', '.')) || 0;
    if (raw > 0) {
        const globalOpslag = parseFloat(Object.values(prijzen ?? {})[0]?.opslag ?? 0);
        const metGlobaal   = raw * (1 + globalOpslag / 100);
        const inclBtw      = metGlobaal * (1 + BTW);
        const rijOpslag    = parseFloat(opslagen[rk]) || 0;
        const verkoop      = rijOpslag > 0 ? inclBtw * (1 + rijOpslag / 100) : inclBtw;
        return { prijs: verkoop, bron: 'berekend' };
    }
    return null;
}

export default function MateriaalBotPage() {
    const { user } = useAuth();
    const [rows, setRows]               = useState([]);
    const [cols, setCols]               = useState({});
    const [verkoopprijzen, setVp]       = useState({});
    const [opslagen, setOp]             = useState({});
    const [prijzen, setPrijzen]         = useState({});
    const [messages, setMessages]       = useState([]);
    const [input, setInput]             = useState('');
    const [typing, setTyping]           = useState(false);
    const [flow, setFlow]               = useState(null); // { type:'m2', results, query }
    const [opslaanModal, setOpslaanModal] = useState(null); // { data } — open modal
    const [projecten, setProjecten]     = useState([]);
    const [tdsLinks, setTdsLinks]       = useState({});
    const [fieldOrder, setFieldOrder]   = useState(['naam','code','categorie','eenheid','prijs']);
    const bottomRef                     = useRef(null);
    const inputRef                      = useRef(null);

    // Trefwoorden die sauswerk/verfwerk aanduiden
    const SAUSWERK_KEYS = ['saus','verf','primer','grond','muur','plafond','latex','muurverf','coating','beits','lak','stucco','spackle'];
    function isSauswerk(q) {
        const woorden = q.toLowerCase().split(/[\s,;]+/);
        return SAUSWERK_KEYS.some(k => woorden.includes(k));
    }

    // Kleurtype detectie in productnaam
    const KLEUR_DONKER = ['n00','donker','zwart','diep','intens','dark'];
    const KLEUR_MIDDEN = ['m15','medium','midden','middel'];
    const KLEUR_LICHT  = ['w05','wit','licht','helder','white','pastel'];
    function detectKleurTypes(results) {
        const check = keys => results.some(({ row }) => keys.some(k => String(row[cols.naam] ?? '').toLowerCase().includes(k)));
        return { heeftDonker: check(KLEUR_DONKER), heeftMidden: check(KLEUR_MIDDEN), heeftLicht: check(KLEUR_LICHT) };
    }
    function filterOpKleur(results, keuze) {
        const keys = keuze === 'donker' ? KLEUR_DONKER : keuze === 'midden' ? KLEUR_MIDDEN : KLEUR_LICHT;
        const gefilterd = results.filter(({ row }) => keys.some(k => String(row[cols.naam] ?? '').toLowerCase().includes(k)));
        return gefilterd.length > 0 ? gefilterd : results;
    }

    // Standaard dekking in m² per liter/eenheid (als geen dekking-kolom beschikbaar)
    const DEKKING_DEFAULT = 10; // 10 m² per liter

    useEffect(() => {
        setRows(loadLS('schildersapp_materiaal_data', []));
        setCols(loadLS('schildersapp_materiaal_cols', {}));
        setVp(loadLS('schildersapp_materiaal_verkoop', {}));
        setOp(loadLS('schildersapp_materiaal_opslagen', {}));
        setPrijzen(loadLS('schildersapp_materiaal_prijzen', {}));
        setProjecten(loadLS('schildersapp_projecten', []));
        setTdsLinks(loadLS('schildersapp_materiaal_tds', {}));
        setFieldOrder(loadLS('schildersapp_materiaal_volgorde', ['naam','code','categorie','eenheid','prijs']));
        // Welkomstbericht
        setMessages([{
            id: 1, from: 'bot',
            text: `Hoi ${user?.name?.split(' ')[0] ?? ''}! 👋 Ik help je snel de prijs van materialen opzoeken. Typ een productnaam en ik zoek het voor je op.`,
            results: null,
        }]);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    function search(query) {
        const q = query.toLowerCase().trim();
        if (!q || rows.length === 0) return [];
        return rows.map((row, i) => ({ row, i })).filter(({ row }) => {
            const naam = String(row[cols.naam] ?? '').toLowerCase();
            const code = String(row[cols.code] ?? '').toLowerCase();
            const cat  = String(row[cols.categorie] ?? '').toLowerCase();
            if (naam.includes(q) || code.includes(q) || cat.includes(q)) return true;
            return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q));
        }).slice(0, 20);
    }

    function addBot(text, results = null, extra = {}) {
        setMessages(prev => [...prev, { id: Date.now() + Math.random(), from: 'bot', text, results, ...extra }]);
    }

    function send() {
        const q = input.trim();
        if (!q) return;
        setInput('');

        const userMsg = { id: Date.now(), from: 'user', text: q };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        setTimeout(() => {
            setTyping(false);

            // ── Flow: kleurkeuze verwacht ──
            if (flow?.type === 'kleur') {
                const keuze = q.toLowerCase().includes('donker') || q.toLowerCase().includes('n00') ? 'donker'
                            : q.toLowerCase().includes('midden') || q.toLowerCase().includes('m15') ? 'midden'
                            : q.toLowerCase().includes('licht')  || q.toLowerCase().includes('w05')  ? 'licht'
                            : null;
                if (!keuze) {
                    addBot('Kies een kleurtype:', null, { knoppen: flow.knoppen });
                    return;
                }
                const gefilterd = filterOpKleur(flow.allResults, keuze);
                setFlow({ type: 'm2', results: gefilterd, query: flow.query });
                addBot(`${keuze === 'donker' ? 'Donkere' : 'Lichte'} kleuren geselecteerd (${gefilterd.length} artikel${gefilterd.length !== 1 ? 'en' : ''}). Hoeveel m² gaat het om?`);
                return;
            }

            // ── Flow: verpakkingsgrootte antwoord verwacht ──
            if (flow?.type === 'verpakking') {
                const maten = [10, 5, 2.5, 1];
                const gekozen = maten.find(m => q.includes(String(m)));
                if (!gekozen) {
                    addBot('Kies een verpakkingsgrootte:', null, { knoppen: [10,5,2.5,1].map(l => ({ label: `${l}L`, waarde: String(l) })) });
                    return;
                }
                setFlow(null);
                const { results, m2, query } = flow;
                const benodigdL = m2 / DEKKING_DEFAULT;
                const aantalVerpakkingen = n => Math.ceil(benodigdL / n);

                // Filter producten op gekozen verpakkingsgrootte
                const metMaat = results.filter(({ row }) => {
                    const inhoud = getInhoud(row, cols);
                    return inhoud === gekozen;
                });
                const bron = metMaat.length > 0 ? metMaat : results;

                // Bereken totaalprijs per product en sorteer op prijs
                const berekend = bron.map(({ row, i }) => {
                    const prijsInfo = getVerkoopprijs(row, cols, verkoopprijzen, opslagen, prijzen, i);
                    const inhoud = getInhoud(row, cols) ?? gekozen;
                    const aantal = aantalVerpakkingen(inhoud);
                    const totaal = prijsInfo ? prijsInfo.prijs * aantal : null;
                    return { row, i, prijsInfo, inhoud, aantal, totaal };
                }).sort((a, b) => (a.totaal ?? Infinity) - (b.totaal ?? Infinity));

                const beste = berekend[0];
                addBot(
                    `Voor ${m2} m² met ${gekozen}L verpakkingen: je hebt ~${aantalVerpakkingen(gekozen)} emmers nodig. Beste optie:`,
                    null,
                    {
                        verpakkingResults: berekend,
                        gekozenMaat: gekozen,
                        opslaanData: {
                            product: beste ? String(beste.row[cols.naam] ?? '') : query,
                            m2,
                            verpakking: `${gekozen}L`,
                            aantalEmmers: beste?.aantal,
                            totaalprijs: beste?.totaal ? `€${beste.totaal.toFixed(2).replace('.', ',')}` : null,
                            datum: new Date().toLocaleDateString('nl-NL'),
                        },
                    }
                );

                return;
            }

            // ── Flow: m² antwoord verwacht ──
            if (flow?.type === 'm2') {
                const m2 = parseFloat(q.replace(',', '.'));
                if (!m2 || m2 <= 0) {
                    addBot('Dat lijkt geen geldig aantal m². Typ bijvoorbeeld: 45');
                    return;
                }
                // Na m² → vraag verpakkingsgrootte
                const { results, query } = flow;
                setFlow({ type: 'verpakking', results, m2, query });
                setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: `${m2} m² — welke verpakkingsgrootte wil je gebruiken?`, results: null, knoppen: [10,5,2.5,1].map(l => ({ label: `${l}L`, waarde: String(l) })) }]);
                return;
            }

            // ── Normale zoekopdracht ──
            const results = search(q);
            let text, botResults = null;

            if (rows.length === 0) {
                text = 'Er is nog geen materiaallijst beschikbaar. Vraag de beheerder om de lijst in te laden.';
            } else if (results.length === 0) {
                text = `Ik kon niets vinden voor "${q}". Probeer een andere zoekterm, zoals een deel van de productnaam of artikelcode.`;
            } else if (isSauswerk(q) && results.length > 0) {
                const kleurOpties = [
                    { label: 'Donker (N00)', waarde: 'donker' },
                    { label: 'Middel (M15)', waarde: 'midden' },
                    { label: 'Licht (W05)',  waarde: 'licht'  },
                ];
                setFlow({ type: 'kleur', allResults: results, query: q, knoppen: kleurOpties });
                setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: `Welk type kleur zoek je voor "${q}"?`, results: null, knoppen: kleurOpties }]);
                return;
            } else {
                // Bereken prijs per eenheid voor eerlijke vergelijking
                const metPrijs = results.map(({ row, i }) => {
                    const prijsInfo = getVerkoopprijs(row, cols, verkoopprijzen, opslagen, prijzen, i);
                    const inhoud    = getInhoud(row, cols);
                    const perEenheid = prijsInfo && inhoud ? prijsInfo.prijs / inhoud : prijsInfo?.prijs ?? null;
                    return { row, i, prijsInfo, inhoud, perEenheid };
                }).filter(r => r.perEenheid !== null);

                const besteIdx = metPrijs.length > 1
                    ? metPrijs.reduce((best, r) => r.perEenheid < best.perEenheid ? r : best, metPrijs[0])?.i
                    : null;
                const aantalMetPrijs = metPrijs.length;
                text = `Ik vond ${results.length} artikel${results.length > 1 ? 'en' : ''} voor "${q}"${aantalMetPrijs > 1 ? ` — goedkoopste per eenheid is gemarkeerd` : ''}:`;
                botResults = results.map(r => {
                    const gevonden = metPrijs.find(m => m.i === r.i);
                    return { ...r, beste: r.i === besteIdx && aantalMetPrijs > 1, inhoud: gevonden?.inhoud, perEenheid: gevonden?.perEenheid };
                });

            }

            const opslaanData = botResults ? {
                product: botResults[0] ? String(botResults[0].row[cols.naam] ?? '') : q,
                zoekterm: q,
                aantalResultaten: botResults.length,
                datum: new Date().toLocaleDateString('nl-NL'),
            } : null;
            setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text, results: botResults, opslaanData }]);
        }, 600);
    }

    const suggestions = ['primer', 'verf', 'kwast', 'roller', 'tape', 'kit', 'schuurpapier'];

    const WIZARD_STAPPEN = [
        { key: 'aard',      label: 'Aard van het werk',       opties: ['Bestaande ondergrond', 'Nieuwe ondergrond'] },
        { key: 'situering', label: 'Situering',                opties: ['Binnen', 'Buiten'] },
        { key: 'ondergrond',label: 'Ondergrond',               opties: ['Hout', 'Kunststof', 'Metaal, non-ferro', 'Staal', 'Staal, verzinkt', 'Steenachtig, vloeren', 'Steenachtig, wanden en plafonds'] },
        { key: 'conditie',  label: 'Conditie verfsysteem',     opties: ['Redelijk', 'Matig', 'Slecht', 'n.v.t.', 'Onbehandeld'] },
        { key: 'opbouw',    label: 'Opbouw verfsysteem',       opties: [
            'A: Compleet herschildersysteem — volledig schuren, gronden en aflakken',
            'B: Uitgebreid herschildersysteem — schuren, bijgronden en aflakken',
            'D: Eenvoudig herschildersysteem — geheel aflakken, geen grondlaag',
            'N0: Nieuw verfsysteem — volledige opbouw op onbehandeld hout/metaal/steen',
            'N1: Concept I — grondverf + 1 aflaklaag',
            'N2: Concept II — grondverf + 2 aflaklagen',
            'N3: Concept III — plamuur + grondverf + 2 aflaklagen',
            'N4: Fabrieksmatig gegrond + aflakken op de bouw',
            'N5: Gronden in de bouw — alleen grondlaag aanbrengen',
            'N6: Nieuw systeem op onbehandelde bestaande ondergrond',
        ] },
        { key: 'dekking',   label: 'Dekkend / transparant',    opties: ['Afwerking dekkend', 'Afwerking transparant'] },
        { key: 'glansgraad',label: 'Glansgraad eindlaag',      opties: ['Alle glansgraden', 'Hoogglans', 'Halfglans', 'Hoge zijdeglans', 'Zijdeglans', 'Lage zijdeglans', 'Mat', 'Kalkmat', 'Glans'] },
        { key: 'kenmerk',   label: 'Speciaal kenmerk',         opties: ['n.v.t.', '2-componenten product', 'Ademende muurverf', 'Bacteriebestendige muurverf', 'Carbonatatieremmende muurverf', 'Doorwerk product', 'Één-pot-systeem', 'Extreem duurzame lak', 'Haarscheuroverbruggende muurverf', 'Hoogglans watergedragen buitenlak', 'Huidvetresistente grondverf', 'Huidvetresistente lak', 'Hydrofoberend', 'Isolerende grondverf', 'Isolerende muurverf', 'Metallic muurverf', 'Muurverf voor plafonds', 'Muurverf voor vochtige ruimten', 'Natuurlijke houten uitstraling', 'Sneldrogend watergedragen voor metaal', 'Spuitapplicatie product', 'Structuur muurverf', 'Vlekafstotende muurverf', 'Watergedragen grondverf'] },
        { key: 'eindlaag',  label: 'Productnaam eindlaag',     opties: ['n.v.t.', 'Rubbol XD High Gloss', 'Rubbol XD Semi Gloss', 'Rubbol SB', 'Rubbol EPS', 'Rubbol EPS Thix', 'Rubbol Satura', 'Rubbol BL Ventura Satin', 'Rubbol Express High Gloss', 'Rubbol BL Safira', 'Rubbol BL Satura', 'Rubbol BL Rezisto Mat', 'Rubbol BL Rezisto Satin', 'Rubbol BL Rezisto Semi-Gloss', 'Rubbol BL Rezisto High Gloss', 'Rubbol BL Rezisto Spray', 'Rubbol BL Endurance High Gloss', 'Rubbol Primer', 'Rubbol Primer Express', 'Rubbol BL Primer', 'Rubbol BL Isoprimer', 'Rubbol BL Rezisto Primer', 'Rubbol DSA Thix', 'Rubbol WF 376', 'Rubbol WF 387', 'Cetol TGX Gloss', 'Cetol TGL Satin Plus', 'Cetol Novatech', 'Cetol HLS Plus', 'Cetol BLX-Pro', 'Cetol BL Decor', 'Cetol BL Varnish Mat', 'Cetol BL Natural Mat', 'Cetol BL Endurance Primer', 'Alpha Aqua SI', 'Alpha Humitex SF', 'Alpha Isolux SF', 'Alpha Metallic', 'Alpha Plafond Extreem Mat', 'Alpha Prof Mat', 'Alpha Projecttex', 'Alpha Recycle Mat', 'Alpha Rezisto Anti Marks', 'Alpha Rezisto Easy Clean', 'Alpha Sanocryl', 'Alpha Topcoat', 'Alpha Topcoat Flex', 'Alphacoat', 'Alphacryl Easy Spray', 'Alphacryl Pure Mat SF', 'Alphaloxan', 'Alphaloxan Flex', 'Alphatex 4SO Mat', 'Alphatex IQ', 'Alphatex IQ Mat', 'Alphatex Satin SF', 'Alphatex SF', 'Alphaxylan SF', 'Redox BL Forte', 'Redox BL Metal Protect Satin', 'Redox PUR Finish High Gloss', 'Redox PUR Finish Satin', 'Wapex 647 Semi-mat', 'Wapex 650', 'Wapex 660', 'Wapex 660 Mat', 'Wapex PUR Clearcoat'] },
    ];

    const EINDLAAG_FILTER = {
        hout: {
            dekkend:     ['n.v.t.', 'Rubbol XD High Gloss', 'Rubbol XD Semi Gloss', 'Rubbol SB', 'Rubbol EPS', 'Rubbol EPS Thix', 'Rubbol Satura', 'Rubbol BL Ventura Satin', 'Rubbol Express High Gloss', 'Rubbol BL Safira', 'Rubbol BL Satura', 'Rubbol BL Rezisto Mat', 'Rubbol BL Rezisto Satin', 'Rubbol BL Rezisto Semi-Gloss', 'Rubbol BL Rezisto High Gloss', 'Rubbol BL Endurance High Gloss', 'Rubbol DSA Thix', 'Rubbol WF 376', 'Rubbol WF 387'],
            transparant: ['n.v.t.', 'Cetol TGX Gloss', 'Cetol TGL Satin Plus', 'Cetol Novatech', 'Cetol HLS Plus', 'Cetol BLX-Pro', 'Cetol BL Decor', 'Cetol BL Varnish Mat', 'Cetol BL Natural Mat'],
        },
        kunststof: {
            dekkend:     ['n.v.t.', 'Rubbol BL Rezisto Mat', 'Rubbol BL Rezisto Satin', 'Rubbol BL Rezisto Semi-Gloss', 'Rubbol BL Rezisto High Gloss', 'Rubbol BL Rezisto Spray', 'Rubbol BL Safira', 'Rubbol BL Endurance High Gloss'],
            transparant: ['n.v.t.'],
        },
        metaal: {
            dekkend:     ['n.v.t.', 'Redox BL Forte', 'Redox BL Metal Protect Satin', 'Redox PUR Finish High Gloss', 'Redox PUR Finish Satin', 'Rubbol XD High Gloss', 'Rubbol XD Semi Gloss', 'Rubbol SB'],
            transparant: ['n.v.t.'],
        },
        staal: {
            dekkend:     ['n.v.t.', 'Redox BL Forte', 'Redox BL Metal Protect Satin', 'Redox PUR Finish High Gloss', 'Redox PUR Finish Satin', 'Rubbol XD High Gloss', 'Rubbol XD Semi Gloss'],
            transparant: ['n.v.t.'],
        },
        steenachtig: {
            dekkend:     ['n.v.t.', 'Alpha Aqua SI', 'Alpha Humitex SF', 'Alpha Isolux SF', 'Alpha Metallic', 'Alpha Plafond Extreem Mat', 'Alpha Prof Mat', 'Alpha Projecttex', 'Alpha Recycle Mat', 'Alpha Rezisto Anti Marks', 'Alpha Rezisto Easy Clean', 'Alpha Sanocryl', 'Alpha Topcoat', 'Alpha Topcoat Flex', 'Alphacoat', 'Alphacryl Easy Spray', 'Alphacryl Pure Mat SF', 'Alphaloxan', 'Alphaloxan Flex', 'Alphatex 4SO Mat', 'Alphatex IQ', 'Alphatex IQ Mat', 'Alphatex Satin SF', 'Alphatex SF', 'Alphaxylan SF'],
            transparant: ['n.v.t.', 'Alphaloxan', 'Alphaloxan Flex'],
        },
        vloeren: {
            dekkend:     ['n.v.t.', 'Wapex 647 Semi-mat', 'Wapex 650', 'Wapex 660', 'Wapex 660 Mat', 'Wapex PUR Clearcoat'],
            transparant: ['n.v.t.', 'Wapex PUR Clearcoat'],
        },
    };

    function getEindlaagOpties(keuzes) {
        const ond = (keuzes.ondergrond || '').toLowerCase();
        const cat = ond.includes('hout') ? 'hout'
                  : ond.includes('kunststof') ? 'kunststof'
                  : ond.includes('non-ferro') ? 'metaal'
                  : ond.includes('staal') ? 'staal'
                  : ond.includes('vloeren') ? 'vloeren'
                  : ond.includes('steenachtig') ? 'steenachtig'
                  : null;
        const dek = (keuzes.dekking || '').includes('transparant') ? 'transparant' : 'dekkend';
        if (!cat || !EINDLAAG_FILTER[cat]) return WIZARD_STAPPEN.find(s => s.key === 'eindlaag').opties;
        return EINDLAAG_FILTER[cat][dek] || EINDLAAG_FILTER[cat].dekkend;
    }

    const KENMERK_FILTER = {
        'n.v.t.':                               ['hout', 'kunststof', 'metaal', 'staal', 'steenachtig', 'vloeren'],
        '2-componenten product':                ['hout', 'metaal', 'staal', 'kunststof', 'steenachtig', 'vloeren'],
        'Ademende muurverf':                    ['steenachtig'],
        'Bacteriebestendige muurverf':          ['steenachtig'],
        'Carbonatatieremmende muurverf':        ['steenachtig'],
        'Doorwerk product':                     ['hout', 'kunststof', 'metaal', 'staal'],
        'Één-pot-systeem':                      ['hout', 'metaal', 'staal', 'kunststof'],
        'Extreem duurzame lak':                 ['hout', 'metaal', 'staal', 'kunststof'],
        'Haarscheuroverbruggende muurverf':     ['steenachtig'],
        'Hoogglans watergedragen buitenlak':    ['hout', 'kunststof'],
        'Huidvetresistente grondverf':          ['metaal', 'staal'],
        'Huidvetresistente lak':                ['metaal', 'staal'],
        'Hydrofoberend':                        ['steenachtig'],
        'Isolerende grondverf':                 ['metaal', 'staal'],
        'Isolerende muurverf':                  ['steenachtig'],
        'Metallic muurverf':                    ['steenachtig'],
        'Muurverf voor plafonds':               ['steenachtig'],
        'Muurverf voor vochtige ruimten':       ['steenachtig'],
        'Natuurlijke houten uitstraling':       ['hout'],
        'Sneldrogend watergedragen voor metaal':['metaal', 'staal'],
        'Spuitapplicatie product':              ['hout', 'kunststof', 'metaal', 'staal', 'steenachtig', 'vloeren'],
        'Structuur muurverf':                   ['steenachtig'],
        'Vlekafstotende muurverf':              ['steenachtig'],
        'Watergedragen grondverf':              ['hout', 'kunststof', 'metaal', 'staal', 'steenachtig', 'vloeren'],
    };

    function getKenmerkOpties(keuzes) {
        const ond = (keuzes.ondergrond || '').toLowerCase();
        const cat = ond.includes('hout') ? 'hout'
                  : ond.includes('kunststof') ? 'kunststof'
                  : ond.includes('non-ferro') ? 'metaal'
                  : ond.includes('staal') ? 'staal'
                  : ond.includes('vloeren') ? 'vloeren'
                  : ond.includes('steenachtig') ? 'steenachtig'
                  : null;
        if (!cat) return Object.keys(KENMERK_FILTER);
        return Object.keys(KENMERK_FILTER).filter(k => KENMERK_FILTER[k].includes(cat));
    }

    const [wizard, setWizard] = useState(null);
    const [systeemModal, setSysteemModal] = useState(null);

    async function laadSysteem(productnaam, wizardContext) {
        setSysteemModal({ product: productnaam, loading: true, systeem: null, error: false });
        try {
            const res = await fetch('/api/materiaal-advies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modus: 'systeem', product: productnaam, wizardContext: wizardContext || {} }),
            });
            const { systeem, onderhoud, error } = await res.json();
            if (error || !systeem) throw new Error();
            setSysteemModal(prev => ({ ...prev, loading: false, systeem, onderhoud }));
        } catch {
            setSysteemModal(prev => ({ ...prev, loading: false, error: true }));
        }
    }

    function zoekOpWizard(keuzes) {
        const terms = [keuzes.ondergrond, keuzes.glansgraad, keuzes.eindlaag !== 'n.v.t.' ? keuzes.eindlaag : null]
            .filter(Boolean)
            .map(s => s.toLowerCase().split(/[\s,]+/)[0]);
        return rows.map((row, i) => ({ row, i })).filter(({ row }) => {
            const tekst = [row[cols.naam], row[cols.categorie]].join(' ').toLowerCase();
            return terms.some(t => tekst.includes(t));
        }).slice(0, 15);
    }

    function kiesWizardOptie(waarde) {
        const huidigeStap = WIZARD_STAPPEN[wizard.stap];
        const nieuweKeuzes = { ...wizard.keuzes, [huidigeStap.key]: waarde };
        const volgendeStap = wizard.stap + 1;
        if (volgendeStap >= WIZARD_STAPPEN.length) {
            const samenvatting = Object.values(nieuweKeuzes).filter(v => v && v !== 'n.v.t.').join(' · ');
            setMessages(prev => [...prev, { id: Date.now(), from: 'user', text: samenvatting }]);
            setWizard(null);
            // Als eindlaag gekozen (en niet n.v.t.) → direct systeemopbouw tonen
            if (huidigeStap.key === 'eindlaag' && waarde !== 'n.v.t.') {
                laadSysteem(waarde, nieuweKeuzes);
            } else {
                setTyping(true);
                setTimeout(() => {
                    setTyping(false);
                    const resultaten = zoekOpWizard(nieuweKeuzes);
                    const tekst = resultaten.length > 0
                        ? `${resultaten.length} producten gevonden voor jouw situatie:`
                        : 'Geen exacte match gevonden. Bekijk het volledige verfadvies op Sikkens:';
                    setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: tekst, results: resultaten.length > 0 ? resultaten : null, sikkensLink: true }]);
                }, 700);
            }
        } else {
            setWizard({ stap: volgendeStap, keuzes: nieuweKeuzes });
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-box-open" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Materiaalbot</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>
                            {rows.length > 0 ? `${rows.length} artikelen beschikbaar` : 'Geen materiaallijst geladen'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Berichten */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start', gap: '8px' }}>
                        {/* Tekstballon */}
                        <div style={{
                            maxWidth: '80%', padding: '10px 14px', borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: msg.from === 'user' ? '#F5850A' : '#fff',
                            color: msg.from === 'user' ? '#fff' : '#1e293b',
                            fontSize: '0.88rem', lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}>
                            {msg.text}
                        </div>

                        {/* Normale resultatenkaarten */}
                        {msg.results && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {msg.results.map(({ row, i, beste, inhoud, perEenheid }) => {
                                    const naam      = row[cols.naam]      ?? '—';
                                    const eenheid   = row[cols.eenheid]   ?? '';
                                    const prijsInfo = getVerkoopprijs(row, cols, verkoopprijzen, opslagen, prijzen, i);
                                    const badgeFields = fieldOrder.filter(f => f !== 'naam' && f !== 'prijs' && f !== 'verkoopprijs');
                                    const badgeStyles = {
                                        categorie: { bg: '#eef2ff', clr: '#6366f1' },
                                        eenheid:   { bg: '#f0fdf4', clr: '#10b981' },
                                        inhoud:    { bg: '#ecfeff', clr: '#06b6d4' },
                                        code:      { bg: '#f1f5f9', clr: '#64748b' },
                                    };
                                    const fv = {
                                        naam:      naam,
                                        code:      row[cols.code]      ?? '',
                                        eenheid:   eenheid,
                                        categorie: row[cols.categorie] ?? '',
                                        inhoud:    cols.inhoud ? (row[cols.inhoud] ?? '') : '',
                                    };
                                    return (
                                        <div key={i} style={{ background: beste ? '#f0fdf4' : '#fff', borderRadius: '12px', border: `1.5px solid ${beste ? '#86efac' : '#f1f5f9'}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className="fa-solid fa-cube" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.35, flex: 1 }}>{naam}</div>
                                                    {(() => {
                                                        const entry = parseEntry(tdsLinks[getBasisNaam(naam)]);
                                                        if (!entry.tds && !entry.msds && !entry.certs?.length && !entry.leaflet) return null;
                                                        return (
                                                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                {entry.tds && <a href={entry.tds} target="_blank" rel="noreferrer" title="Technisch informatieblad (TDS)"
                                                                    style={{ color: '#ef4444', fontSize: '0.85rem', padding: '2px 3px', borderRadius: '4px', lineHeight: 1, textDecoration: 'none' }}>
                                                                    <i className="fa-solid fa-file-pdf" /></a>}
                                                                {entry.msds && <a href={entry.msds} target="_blank" rel="noreferrer" title="Veiligheidsblad"
                                                                    style={{ color: '#F5850A', fontSize: '0.85rem', padding: '2px 3px', borderRadius: '4px', lineHeight: 1, textDecoration: 'none' }}>
                                                                    <i className="fa-solid fa-triangle-exclamation" /></a>}
                                                                {entry.certs?.length > 0 && <a href={entry.certs[0]} target="_blank" rel="noreferrer" title="Certificaat"
                                                                    style={{ color: '#10b981', fontSize: '0.85rem', padding: '2px 3px', borderRadius: '4px', lineHeight: 1, textDecoration: 'none' }}>
                                                                    <i className="fa-solid fa-certificate" /></a>}
                                                                {entry.leaflet && <a href={entry.leaflet} target="_blank" rel="noreferrer" title="Leaflet"
                                                                    style={{ color: '#6366f1', fontSize: '0.85rem', padding: '2px 3px', borderRadius: '4px', lineHeight: 1, textDecoration: 'none' }}>
                                                                    <i className="fa-solid fa-newspaper" /></a>}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                    {badgeFields.map(f => {
                                                        const val = fv[f]; if (!val) return null;
                                                        const { bg, clr } = badgeStyles[f] || { bg: '#f1f5f9', clr: '#64748b' };
                                                        const txt = f === 'eenheid' ? `per ${val}` : f === 'inhoud' ? `${val}L` : val;
                                                        return <span key={f} style={{ fontSize: '0.65rem', color: clr, background: bg, borderRadius: '5px', padding: '1px 5px' }}>{txt}</span>;
                                                    })}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                {beste && <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}><i className="fa-solid fa-crown" />BESTE PRIJS/EEN.</div>}
                                                {prijsInfo
                                                    ? <>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: beste ? '#10b981' : '#F5850A' }}>{fmt(prijsInfo.prijs)}</div>
                                                        {inhoud && perEenheid && (
                                                            <div style={{ fontSize: '0.65rem', color: beste ? '#10b981' : '#F5850A', fontWeight: 600, opacity: 0.75 }}>
                                                                {fmt(perEenheid)} / {eenheid || 'L'}
                                                            </div>
                                                        )}
                                                        {!inhoud && <div style={{ fontSize: '0.62rem', color: '#F5850A', opacity: 0.7 }}>{eenheid ? `per ${eenheid}` : 'verkoopprijs'}</div>}
                                                      </>
                                                    : <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Op aanvraag</div>}
                                            </div>
                                        </div>
                                        {/* Systeemopbouw knop */}
                                        <button onClick={() => laadSysteem(naam, wizard?.keuzes || {})}
                                            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#6366f1', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                                            <i className="fa-solid fa-layer-group" />
                                            Systeemopbouw
                                        </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Kleurkeuze knoppen */}
                        {msg.knoppen && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {msg.knoppen.map(knop => (
                                    <button key={knop.waarde} onClick={() => {
                                        setInput(knop.waarde);
                                        setTimeout(() => {
                                            setInput('');
                                            const userMsg = { id: Date.now(), from: 'user', text: knop.label };
                                            setMessages(prev => [...prev, userMsg]);
                                            setTyping(true);
                                            setTimeout(() => {
                                                setTyping(false);
                                                const keuze = knop.waarde;
                                                if (flow?.type === 'kleur') {
                                                    const gefilterd = filterOpKleur(flow.allResults, keuze);
                                                    setFlow({ type: 'm2', results: gefilterd, query: flow.query });
                                                    setMessages(prev => [...prev, { id: Date.now() + 1, from: 'bot', text: `${keuze === 'donker' ? 'Donkere' : 'Lichte'} kleuren geselecteerd (${gefilterd.length} artikel${gefilterd.length !== 1 ? 'en' : ''}). Hoeveel m² gaat het om?`, results: null }]);
                                                }
                                            }, 500);
                                        }, 0);
                                    }}
                                        style={{ padding: '9px 18px', borderRadius: '20px', border: '2px solid #F5850A', background: knop.waarde === 'donker' ? '#1e293b' : knop.waarde === 'midden' ? '#f59e0b' : '#fff', color: knop.waarde === 'donker' ? '#fff' : knop.waarde === 'midden' ? '#fff' : '#F5850A', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className={`fa-solid ${knop.waarde === 'donker' ? 'fa-moon' : knop.waarde === 'midden' ? 'fa-circle-half-stroke' : 'fa-sun'}`} />
                                        {knop.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Verpakkings advieskaarten */}
                        {msg.verpakkingResults && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {msg.verpakkingResults.map(({ row, i, prijsInfo, inhoud, aantal, totaal }, idx) => {
                                    const naam    = row[cols.naam]    ?? '—';
                                    const eenheid = row[cols.eenheid] ?? 'L';
                                    const isBeste = idx === 0 && msg.verpakkingResults.length > 1;
                                    return (
                                        <div key={i} style={{ background: isBeste ? '#f0fdf4' : '#fff', borderRadius: '12px', border: `1.5px solid ${isBeste ? '#86efac' : '#f1f5f9'}`, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                            {isBeste && <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#10b981', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}><i className="fa-solid fa-crown" />BESTE DEAL</div>}
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{naam}</div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '7px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#475569' }}>{inhoud ?? msg.gekozenMaat}L</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>PER EMMER</div>
                                                </div>
                                                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '7px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#475569' }}>{aantal}×</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>EMMERS</div>
                                                </div>
                                                {prijsInfo && <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '7px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>{fmt(prijsInfo.prijs)}</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>PER EMMER</div>
                                                </div>}
                                                {totaal && <div style={{ flex: 1, background: isBeste ? '#dcfce7' : '#fff8f0', borderRadius: '8px', padding: '7px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: isBeste ? '#15803d' : '#F5850A' }}>{fmt(totaal)}</div>
                                                    <div style={{ fontSize: '0.6rem', color: isBeste ? '#86efac' : '#fbbf24', fontWeight: 600 }}>TOTAAL</div>
                                                </div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* m² advieskaarten */}
                        {msg.m2Results && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {msg.m2Results.map(({ row, i, benodigdL, totaal, prijsInfo }) => {
                                    const naam    = row[cols.naam]      ?? '—';
                                    const eenheid = row[cols.eenheid]   ?? 'L';
                                    return (
                                        <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #bbf7d0', padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-paint-roller" style={{ color: '#10b981', fontSize: '0.85rem' }} />
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{naam}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d' }}>{benodigdL} {eenheid}</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#86efac', fontWeight: 600 }}>BENODIGD</div>
                                                </div>
                                                <div style={{ flex: 1, background: '#fff8f0', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                                                    {totaal
                                                        ? <><div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#F5850A' }}>{fmt(totaal)}</div>
                                                            <div style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 600 }}>TOTAALPRIJS</div></>
                                                        : <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '6px' }}>Op aanvraag</div>}
                                                </div>
                                                {prijsInfo && (
                                                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#64748b' }}>{fmt(prijsInfo.prijs)}</div>
                                                        <div style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 600 }}>PER {eenheid.toUpperCase()}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', paddingTop: '2px' }}>
                                    * Gebaseerd op ~{DEKKING_DEFAULT} m² per liter. Werkelijk verbruik kan afwijken.
                                </div>
                            </div>
                        )}

                        {/* Sikkens bestekservice link */}
                        {msg.sikkensLink && (
                            <a href="https://bestekservice.sikkens.nl/wizard" target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'linear-gradient(135deg,#F5850A,#D96800)', borderRadius: '12px', color: '#fff', textDecoration: 'none', boxShadow: '0 2px 8px rgba(245,133,10,0.3)' }}>
                                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '1rem', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Volledig verfadvies op Sikkens</div>
                                    <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '1px' }}>Voer dezelfde keuzes in voor een compleet verfsysteem met lagen</div>
                                </div>
                            </a>
                        )}

                        {/* Opslaan bij project knop */}
                        {msg.opslaanData && (
                            <button
                                onClick={() => setOpslaanModal(msg.opslaanData)}
                                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '20px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <i className="fa-solid fa-floppy-disk" style={{ color: '#F5850A' }} />
                                Opslaan bij project
                            </button>
                        )}
                    </div>
                ))}

                {/* Typing indicator */}
                {typing && (
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ background: '#fff', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {[0,1,2].map(n => (
                                <div key={n} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1', animation: `bounce 1s ${n * 0.15}s infinite` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Verfadvies wizard */}
            {messages.length <= 1 && rows.length > 0 && !wizard && (
                <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
                    <button onClick={() => setWizard({ stap: 0, keuzes: {} })}
                        style={{ width: '100%', padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#F5850A,#D96800)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', boxShadow: '0 2px 8px rgba(245,133,10,0.3)' }}>
                        <i className="fa-solid fa-paint-roller" />
                        Verfadvies op maat
                        <span style={{ fontWeight: 400, opacity: 0.85, fontSize: '0.75rem' }}>stap voor stap</span>
                    </button>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {suggestions.map(s => (
                            <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                style={{ padding: '5px 12px', borderRadius: '20px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Wizard actief */}
            {wizard && (
                <div style={{ padding: '10px 16px 12px', flexShrink: 0, background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                    {/* Voortgangsbalk */}
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
                        {WIZARD_STAPPEN.map((_, i) => (
                            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= wizard.stap ? '#F5850A' : '#e2e8f0', transition: 'background 0.2s' }} />
                        ))}
                    </div>
                    {/* Breadcrumb + annuleer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.7rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                        <button onClick={() => setWizard(null)}
                            style={{ background: 'none', border: 'none', color: '#F5850A', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '0.7rem' }}>
                            ↩ Annuleren
                        </button>
                        {wizard.stap > 0 && (
                            <button onClick={() => setWizard(w => {
                                const entries = Object.entries(w.keuzes);
                                return { ...w, stap: w.stap - 1, keuzes: Object.fromEntries(entries.slice(0, w.stap - 1)) };
                            })}
                                style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.7rem' }}>
                                ← Vorige
                            </button>
                        )}
                        {Object.values(wizard.keuzes).filter(Boolean).map((v, i) => (
                            <span key={i} style={{ background: '#f1f5f9', borderRadius: '10px', padding: '1px 7px', color: '#475569' }}>· {v}</span>
                        ))}
                    </div>
                    {/* Stap label + stap nr */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{WIZARD_STAPPEN[wizard.stap].label}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Stap {wizard.stap + 1} / {WIZARD_STAPPEN.length}</div>
                    </div>
                    {/* Knoppen */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto' }}>
                        {(WIZARD_STAPPEN[wizard.stap].key === 'kenmerk' ? getKenmerkOpties(wizard.keuzes)
                          : WIZARD_STAPPEN[wizard.stap].key === 'eindlaag' ? getEindlaagOpties(wizard.keuzes)
                          : WIZARD_STAPPEN[wizard.stap].opties).map(opt => (
                            <button key={opt} onClick={() => kiesWizardOptie(opt)}
                                style={{ padding: '6px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Invoer */}
            <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    placeholder="Zoek een product…"
                    style={{ flex: 1, padding: '11px 14px', borderRadius: '24px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b' }}
                />
                <button onClick={send} disabled={!input.trim()}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', border: 'none', background: input.trim() ? '#F5850A' : '#e2e8f0', color: '#fff', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                    <i className="fa-solid fa-paper-plane" style={{ fontSize: '0.9rem' }} />
                </button>
            </div>

            <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>

            {/* Systeemopbouw modal */}
            {systeemModal && (
                <>
                    <div onClick={() => setSysteemModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '0 0 32px', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', zIndex: 310 }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '10px auto 0' }} />
                        <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>Systeemopbouw</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{systeemModal.product}</div>
                        </div>
                        {systeemModal.loading && (
                            <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} />
                                Verfadvies ophalen…
                            </div>
                        )}
                        {systeemModal.error && (
                            <div style={{ padding: '28px', textAlign: 'center', color: '#ef4444', fontSize: '0.85rem' }}>
                                Kon geen systeemadvies ophalen. Probeer opnieuw.
                            </div>
                        )}
                        {systeemModal.systeem && (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
                                {systeemModal.systeem.map((stap, i) => {
                                    const laagStijl = {
                                        plamuurlaag: { bg: '#faf5ff', clr: '#7c3aed', icon: 'fa-fill-drip' },
                                        grondlaag:   { bg: '#fff7ed', clr: '#ea580c', icon: 'fa-layer-group' },
                                        tussenlaag:  { bg: '#f0f9ff', clr: '#0284c7', icon: 'fa-layer-group' },
                                        eindlaag:    { bg: '#f0fdf4', clr: '#16a34a', icon: 'fa-paint-roller' },
                                    }[stap.laag] || { bg: '#f8fafc', clr: '#64748b', icon: 'fa-layer-group' };
                                    return (
                                        <div key={i} style={{ background: laagStijl.bg, borderRadius: '12px', padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: laagStijl.clr, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className={`fa-solid ${laagStijl.icon}`} style={{ color: '#fff', fontSize: '0.75rem' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: laagStijl.clr, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stap.laag}</div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{stap.product}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: '40px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#fff', borderRadius: '6px', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fa-solid fa-paintbrush" />{stap.verwerking}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#fff', borderRadius: '6px', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fa-solid fa-clone" />{stap.aantal_lagen}
                                                </span>
                                                {stap.opmerking && (
                                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>{stap.opmerking}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {systeemModal.onderhoud && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #86efac' }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className="fa-solid fa-calendar-check" style={{ color: '#fff', fontSize: '0.75rem' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Onderhoudsverwachting</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#15803d' }}>{systeemModal.onderhoud}</div>
                                        </div>
                                    </div>
                                )}
                                <a href="https://bestekservice.sikkens.nl/wizard" target="_blank" rel="noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'linear-gradient(135deg,#F5850A,#D96800)', borderRadius: '12px', color: '#fff', textDecoration: 'none', marginTop: '4px' }}>
                                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '1rem', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Controleer op Sikkens bestekservice</div>
                                        <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '1px' }}>Voor officieel verfsysteem met bestektekst</div>
                                    </div>
                                </a>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Opslaan bij project modal */}
            {opslaanModal && (
                <>
                    <div onClick={() => setOpslaanModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '8px 0 32px', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', zIndex: 310 }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '8px auto 16px' }} />
                        <div style={{ padding: '0 20px 12px', fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>Opslaan bij project</div>

                        {/* Samenvatting */}
                        <div style={{ margin: '0 20px 14px', background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
                            <div><strong>{opslaanModal.product}</strong></div>
                            {opslaanModal.m2 && <div>{opslaanModal.m2} m² · {opslaanModal.verpakking} · {opslaanModal.aantalEmmers}× emmers</div>}
                            {opslaanModal.totaalprijs && <div style={{ color: '#F5850A', fontWeight: 700 }}>{opslaanModal.totaalprijs}</div>}
                            {opslaanModal.zoekterm && !opslaanModal.m2 && <div>Zoekopdracht: "{opslaanModal.zoekterm}" · {opslaanModal.aantalResultaten} resultaten</div>}
                        </div>

                        {/* Projectenlijst */}
                        <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                            {projecten.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Geen projecten gevonden</div>
                            )}
                            {projecten.map(project => (
                                <button key={project.id}
                                    onClick={() => {
                                        // Sla op in project.materiaal array
                                        const bijgewerkt = projecten.map(p => {
                                            if (p.id !== project.id) return p;
                                            const materiaal = p.materiaal ?? [];
                                            return { ...p, materiaal: [...materiaal, { id: Date.now(), ...opslaanModal, opgeslagenDoor: user?.name }] };
                                        });
                                        localStorage.setItem('schildersapp_projecten', JSON.stringify(bijgewerkt));
                                        setProjecten(bijgewerkt);
                                        setOpslaanModal(null);
                                        addBot(`Opgeslagen bij "${project.name}".`, null, { isAdvies: false });
                                    }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                                >
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: project.color ?? '#94a3b8', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{project.name}</div>
                                        {project.client && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{project.client}</div>}
                                    </div>
                                    <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.75rem' }} />
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
