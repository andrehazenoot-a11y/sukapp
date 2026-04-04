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
                                        <div key={i} style={{ background: beste ? '#f0fdf4' : '#fff', borderRadius: '12px', border: `1.5px solid ${beste ? '#86efac' : '#f1f5f9'}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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

            {/* Suggesties */}
            {messages.length <= 1 && rows.length > 0 && (
                <div style={{ padding: '0 16px 10px', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {suggestions.map(s => (
                        <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                            style={{ padding: '5px 12px', borderRadius: '20px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                            {s}
                        </button>
                    ))}
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
