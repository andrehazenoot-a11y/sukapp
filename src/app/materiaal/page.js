'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/components/AuthContext';
import { BESTEK } from '../api/materiaal-advies/bestek.js';

const BTW = 0.21;
const LS_DATA    = 'schildersapp_materiaal_data';
const LS_COLS    = 'schildersapp_materiaal_cols';
const LS_PRIJZEN  = 'schildersapp_materiaal_prijzen'; // { userId: { opslag: 20 } }
const LS_VOLGORDE = 'schildersapp_materiaal_volgorde';

const FIELD_LABELS = {
    naam:         { label: 'Artikelnaam',       icon: 'fa-tag',              color: '#1e293b' },
    code:         { label: 'Artikelcode',        icon: 'fa-barcode',          color: '#64748b' },
    categorie:    { label: 'Categorie',          icon: 'fa-layer-group',      color: '#6366f1' },
    eenheid:      { label: 'Eenheid',            icon: 'fa-ruler',            color: '#10b981' },
    prijs:        { label: 'Inkoopprijs (excl.)',icon: 'fa-euro-sign',        color: '#94a3b8' },
    verkoopprijs: { label: 'Verkoopprijs',       icon: 'fa-euro-sign',        color: '#F5850A' },
    inhoud:       { label: 'Inhoud / verpakking',icon: 'fa-fill-drip',        color: '#06b6d4' },
};
const ALL_FIELDS = ['naam','code','categorie','eenheid','prijs','verkoopprijs','inhoud'];

function loadLS(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function parseEntry(e) {
    if (!e) return {};
    return typeof e === 'string' ? { tds: e } : e;
}

export default function MateriaalPage() {
    const { user } = useAuth();
    const fileRef = useRef(null);

    const [rows, setRows]         = useState([]);
    const [cols, setCols]         = useState({ naam: '', prijs: '', eenheid: '', code: '', categorie: '', verkoopprijs: '' });
    const [headers, setHeaders]   = useState([]);
    const [zoek, setZoek]         = useState('');
    const [tab, setTab]           = useState('zoeken'); // zoeken | instellingen
    const [prijzen, setPrijzen]   = useState({});       // { userId: { opslag } }
    const [toast, setToast]       = useState(null);
    const [loading, setLoading]   = useState(false);
    const [colMap, setColMap]         = useState(false);
    const [fieldOrder, setFieldOrder] = useState(['naam','code','categorie','eenheid','prijs']);
    const [verkoopprijzen, setVerkoopprijzen] = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_materiaal_verkoop') || '{}'); } catch { return {}; } });
    const [opslagen, setOpslagen]             = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_materiaal_opslagen') || '{}'); } catch { return {}; } });
    const [groepOpslag, setGroepOpslag]       = useState('');
    const [tdsLinks, setTdsLinks]             = useState({});
    const [afronden, setAfronden]             = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_materiaal_afronden') || 'false'); } catch { return false; } });
    const tdsRef                              = useRef(null);
    const opslagenBackup                      = useRef(null); // bewaard originele opslagen vóór afronden
    const [tdsUploading, setTdsUploading]     = useState(null);
    const [importing, setImporting]           = useState(false);
    const [importResult, setImportResult]     = useState(null);
    const [bestekMap, setBestekMap]           = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_bestek_producten') || '{}'); } catch { return {}; } });
    const [bestekLocks, setBestekLocks]       = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_bestek_locks') || '{}'); } catch { return {}; } });
    const [bestekCats, setBestekCats]         = useState([Object.keys(BESTEK)[0] || 'OHD']);
    const [bestekZoek, setBestekZoek]         = useState('');
    const [uitgevouweCode, setUitgevouweCode] = useState(null);
    const [actiefLaag, setActiefLaag]         = useState('bijgronden');
    const [actiefLaagCode, setActiefLaagCode] = useState('bijgronden');
    const [actiefSit, setActiefSit]           = useState('buiten');
    const [ingeklapteGroepen, setIngeklapteGroepen] = useState({});
    const [productTags, setProductTags]       = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_product_tags') || '{}'); } catch { return {}; } });

    const isBeheerder = user?.role === 'Beheerder';

    useEffect(() => {
        setRows(loadLS(LS_DATA, []));
        setCols(loadLS(LS_COLS, { naam: '', prijs: '', eenheid: '', code: '', categorie: '', verkoopprijs: '' }));
        setPrijzen(loadLS(LS_PRIJZEN, {}));
        setFieldOrder(loadLS(LS_VOLGORDE, ['naam','code','categorie','eenheid','prijs']));
        setTdsLinks(loadLS('schildersapp_materiaal_tds', {}));
    }, []);

    // Extraheer basisnaam: verwijder inhoud, kleur, maataanduidingen en kleurbasiscodes
    function getBasisNaam(naam) {
        return String(naam ?? '')
            .replace(/\b\d+[.,]?\d*\s*(ltr?|liter|ml|cl|l)\b/gi, '')  // 2.5L, 10 ltr
            .replace(/\b(w\d{2}|n\d{2}|m\d{2}|p\d{2}|b\d{2})\b/gi, '') // W05, N00, M15, P10...
            .replace(/\b(kleur|kl|kl\.|kleurloos|tint|tints?|tu|tc|uit|wit|zwart|white|kluit|mengbaar|base|basis)\b/gi, '')
            .replace(/\/?\b\d{2,4}\b/g, '') // /003, 000, 0030 etc.
            .replace(/\b(xxs|xs|s\b|m\b|xl|xxl|3xl|4xl|5xl|st\b|stuks?)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .toUpperCase();
    }

    // Sikkens-producten herkennen op basisnaam
    const SIKKENS_KEYS = ['alphacryl','rubbol','cetol','sikkens','redox','wapex','alpha rezisto','alpha superlatex','alphatex'];
    function isSikkens(naam) {
        const n = naam.toLowerCase();
        return SIKKENS_KEYS.some(k => n.includes(k));
    }

    // Normaliseert afwerkingsnamen zodat Engels ↔ Nederlands matcht
    // "HIGH GLOSS" = "HOOGGLANS", "SEMI-GLOSS" = "HALFGLANS", etc.
    function normFinish(s) {
        return s
            .replace(/-/g, ' ')
            // Strip prefixes/suffixes die niets toevoegen aan productnaam
            .replace(/^SI\s+/i, '')          // "SI Rubbol..." → "Rubbol..."
            .replace(/\bSET\b/gi, '')         // "...Set HG Set" → "...HG"
            .replace(/\bRAL\b/gi, '')         // "...RAL SET" → "..."
            // Afkortingen uitschrijven
            .replace(/\bHG\b/g, 'HOOGGLANS')
            .replace(/\bHH\b/g, 'HOOGGLANS')
            .replace(/\bSG\b/g, 'HALFGLANS')
            .replace(/\bZG\b/g, 'ZIJDEGLANS')
            .replace(/\bPROT\b/gi, 'PROTECT')
            // Engels → Nederlands
            .replace(/\bhigh\s*gloss\b/gi, 'HOOGGLANS')
            .replace(/\bsemi[\s-]*gloss\b/gi, 'HALFGLANS')
            .replace(/\bsatin\b/gi, 'ZIJDEGLANS')
            // Synoniemen normaliseren
            .replace(/\bzijdeglans\b/gi, 'ZIJDEGLANS')
            .replace(/\bhoogglans\b/gi, 'HOOGGLANS')
            .replace(/\bhalfglans\b/gi, 'HALFGLANS')
            .replace(/\bprimer\b/gi, 'GRONDVERF')
            .replace(/\bgrondlak\b/gi, 'GRONDVERF')
            .replace(/\bgrondverf\b/gi, 'GRONDVERF')
            // BL XPRO / BLXPRO / BLX-PRO → allemaal BLXPRO
            .replace(/\bBL[\s]*X[\s-]*PRO\b/gi, 'BLXPRO')
            .replace(/\bBLX[\s-]*PRO\b/gi, 'BLXPRO')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    async function autoImportTds() {
        setImporting(true);
        setImportResult(null);
        try {
            const res = await fetch('/api/sikkens-tds');
            const { docs, error } = await res.json();
            if (error || !docs) throw new Error(error);

            const bekendeBasis = Array.from(new Set(
                rows.map(r => getBasisNaam(r[cols.naam] ?? '')).filter(Boolean)
            ));
            // Pre-compute normalised versions for fast lookup
            const normMap = Object.fromEntries(bekendeBasis.map(b => [normFinish(b), b]));

            // Start fresh — vorige import weggooien zodat er nooit verouderde data overblijft
            const updated = {};
            let matched = 0;
            docs.forEach(({ productName, href, type }) => {
                const apiKey = getBasisNaam(productName);
                const apiNorm = normFinish(apiKey);

                // Candidates: exact norm match, product starts with apiNorm, or apiNorm starts with product norm
                const matchingKeys = bekendeBasis.filter(b => {
                    const bn = normFinish(b);
                    return bn === apiNorm || bn.startsWith(apiNorm + ' ') || apiNorm.startsWith(bn + ' ');
                });
                if (matchingKeys.length === 0) return;
                const t = (type ?? '').toLowerCase().replace(/\s+/g, '_');
                let countedMatch = false;
                matchingKeys.forEach(key => {
                    const entry = parseEntry(updated[key]);
                    if (t === 'tds' && !entry.tds) { entry.tds = href; if (!countedMatch) { matched++; countedMatch = true; } }
                    else if ((t === 'clp_msds' || t === 'clp msds') && !entry.msds) { entry.msds = href; }
                    else if (t === 'certificates' && !(entry.certs || []).includes(href)) { entry.certs = [...(entry.certs || []), href]; }
                    else if (t === 'leaflets' && !entry.leaflet) { entry.leaflet = href; }
                    updated[key] = entry;
                });
            });

            setTdsLinks(updated);
            localStorage.setItem('schildersapp_materiaal_tds', JSON.stringify(updated));
            setImportResult({ matched, total: docs.length });
        } catch {
            setImportResult({ error: true });
        }
        setImporting(false);
    }

    function moveField(idx, dir) {
        const updated = [...fieldOrder];
        const swap = idx + dir;
        if (swap < 0 || swap >= updated.length) return;
        [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
        setFieldOrder(updated);
        localStorage.setItem(LS_VOLGORDE, JSON.stringify(updated));
    }

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    // ── Prijzen exporteren als XLSX ───────────────────────────────
    async function exportPrijzen() {
        const XLSX = await import('xlsx');
        const data = rows.map((row, gi) => {
            const rk = row[cols.code] || row[cols.naam] || String(gi);
            const { incl } = getPrijs(row);
            const opslag   = parseFloat(opslagen[rk]) || 0;
            const berekend = opslag > 0 ? incl * (1 + opslag / 100) : incl;
            const verkoop  = verkoopprijzen[rk] ? parseFloat(verkoopprijzen[rk]) : berekend;
            return {
                ...row,
                'OPSLAG %':      opslag || '',
                'VERKOOPPRIJS':  verkoop ? Math.ceil(verkoop) : '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Prijzen');
        XLSX.writeFile(wb, `materiaal_prijzen_${new Date().toISOString().slice(0,10)}.xlsx`);
        showToast('Prijzen geëxporteerd');
    }

    // ── XLSX inlezen ──────────────────────────────────────────────
    async function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const XLSX = await import('xlsx');
            const buf  = await file.arrayBuffer();
            const wb   = XLSX.read(buf, { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (!data.length) { showToast('Bestand is leeg of onleesbaar', 'error'); return; }
            const hdrs = Object.keys(data[0]);
            setHeaders(hdrs);
            setRows(data);
            localStorage.setItem(LS_DATA, JSON.stringify(data));
            // Probeer kolommen automatisch te koppelen
            const auto = { naam: '', prijs: '', eenheid: '', code: '', categorie: '', verkoopprijs: '' };
            const lower = h => h.toLowerCase();
            hdrs.forEach(h => {
                const l = lower(h);
                if (!auto.naam      && (l.includes('omschrijving') || l.includes('naam') || l.includes('artikel'))) auto.naam = h;
                if (!auto.prijs     && (l.includes('prijs') || l.includes('price') || l.includes('tarief')))        auto.prijs = h;
                if (!auto.eenheid   && (l.includes('eenheid') || l.includes('unit') || l.includes('verpakking')))  auto.eenheid = h;
                if (!auto.code      && (l.includes('code') || l.includes('nummer') || l.includes('art')))          auto.code = h;
                if (!auto.categorie    && (l.includes('categor') || l.includes('groep') || l.includes('type')))          auto.categorie = h;
                if (!auto.verkoopprijs && (l.includes('verkoop') || l.includes('eindprij') || l.includes('toeslag')))    auto.verkoopprijs = h;
                if (!auto.inhoud      && (l.includes('inhoud') || l.includes('volume') || l.includes('verpakking') || l.includes('liter') || l.includes('ltr') || l.includes('aantal'))) auto.inhoud = h;
            });
            setCols(auto);
            localStorage.setItem(LS_COLS, JSON.stringify(auto));
            setColMap(true);
            showToast(`${data.length} artikelen ingeladen`);
        } catch (err) {
            showToast('Fout bij inladen: ' + err.message, 'error');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    }

    // ── Prijs berekening ──────────────────────────────────────────
    function getPrijs(row) {
        const raw = parseFloat(String(row[cols.prijs] ?? '').replace(',', '.')) || 0;
        const opslag = parseFloat(prijzen[user?.id]?.opslag ?? 0);
        const metOpslag = raw * (1 + opslag / 100);
        const inclBtw   = metOpslag * (1 + BTW);
        // Verkoopprijs kolom overschrijft berekende prijs
        const verkoop = cols.verkoopprijs ? parseFloat(String(row[cols.verkoopprijs] ?? '').replace(',', '.')) || null : null;
        return { excl: metOpslag, incl: verkoop ?? inclBtw, verkoop, opslag };
    }

    function fmt(n) {
        return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    }

    // ── Gefilterde rijen ──────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!zoek.trim() || !rows.length) return rows.slice(0, 100);
        const q = zoek.toLowerCase();
        return rows.filter(r => {
            const naam = String(r[cols.naam] ?? '').toLowerCase();
            const code = String(r[cols.code] ?? '').toLowerCase();
            const cat  = String(r[cols.categorie] ?? '').toLowerCase();
            return naam.includes(q) || code.includes(q) || cat.includes(q);
        }).slice(0, 200);
    }, [rows, zoek, cols]);

    // ── Opslaan prijsinstellingen ──────────────────────────────────
    function deleteRow(row) {
        const updated = rows.filter(r => r !== row);
        setRows(updated);
        localStorage.setItem(LS_DATA, JSON.stringify(updated));
    }

    function savePrijzen(updated) {
        setPrijzen(updated);
        localStorage.setItem(LS_PRIJZEN, JSON.stringify(updated));
        showToast('Prijsinstellingen opgeslagen');
    }

    const alleUsers = loadLS('schilders_users', []);

    // ── UI ────────────────────────────────────────────────────────
    return (
        <div style={{ height: '100%', overflowY: 'auto', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '20px 24px 16px', boxShadow: '0 4px 20px rgba(245,133,10,0.3)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-box-open" style={{ color: '#fff', fontSize: '1.2rem' }} />
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>Materiaalzoeker</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>Zoek artikelen en bekijk prijzen</div>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            {isBeheerder && (
                                <button onClick={() => fileRef.current?.click()} disabled={loading}
                                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                                    {loading ? 'Laden…' : 'XLSX laden'}
                                </button>
                            )}
                            {isBeheerder && rows.length > 0 && (
                                <button onClick={exportPrijzen}
                                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: '#fff', color: '#F5850A', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-floppy-disk" />
                                    Prijzen opslaan
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls" style={{ display: 'none' }} onChange={handleFile} />
                        <input ref={tdsRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file || !tdsUploading) return;
                            const basisNaam = tdsUploading;
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('category', 'materiaal/tds');
                            fd.append('projectId', 'materiaal');
                            try {
                                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                const data = await res.json();
                                if (data.success) {
                                    const updated = { ...tdsLinks, [basisNaam]: data.url };
                                    setTdsLinks(updated);
                                    localStorage.setItem('schildersapp_materiaal_tds', JSON.stringify(updated));
                                    showToast(`TDS opgeslagen voor "${basisNaam}"`);
                                } else {
                                    showToast('Upload mislukt: ' + data.error, 'error');
                                }
                            } catch { showToast('Upload mislukt', 'error'); }
                            setTdsUploading(null);
                            e.target.value = '';
                        }} />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
                        {[['zoeken','fa-magnifying-glass','Zoeken'], ...(isBeheerder ? [['informatiebladen','fa-file-pdf','Informatiebladen'],['bestek','fa-link','Bestek'],['instellingen','fa-sliders','Instellingen']] : [])].map(([t,ic,l]) => (
                            <button key={t} onClick={() => setTab(t)}
                                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#F5850A' : 'rgba(255,255,255,0.85)', fontWeight: tab === t ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <i className={`fa-solid ${ic}`} style={{ fontSize: '0.72rem' }} />{l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>

                {/* ── TAB: ZOEKEN ── */}
                {tab === 'zoeken' && (
                    <div>
                        {rows.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', color: '#cbd5e1', display: 'block', marginBottom: '16px' }} />
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Nog geen materiaal ingeladen</div>
                                {isBeheerder
                                    ? <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Klik op <strong>XLSX laden</strong> rechtsbovenin om je bestand te importeren.</div>
                                    : <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>De beheerder heeft nog geen materiaallijst ingeladen.</div>}
                            </div>
                        ) : (
                            <>
                                {/* Zoekbalk */}
                                <div style={{ position: 'relative', marginBottom: '16px' }}>
                                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }} />
                                    <input
                                        autoFocus
                                        value={zoek}
                                        onChange={e => setZoek(e.target.value)}
                                        placeholder="Zoek op naam, artikelcode of categorie…"
                                        style={{ width: '100%', padding: '13px 14px 13px 40px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                                    />
                                    {zoek && (
                                        <button onClick={() => setZoek('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    )}
                                </div>

                                {/* Kolom-koppeling banner */}
                                {colMap && isBeheerder && (
                                    <div style={{ background: '#fff8f0', border: '1.5px solid #fed7aa', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <i className="fa-solid fa-circle-info" style={{ color: '#F5850A', fontSize: '1rem', flexShrink: 0 }} />
                                        <div style={{ flex: 1, fontSize: '0.82rem', color: '#92400e' }}>
                                            Kolommen automatisch gekoppeld. Klopt dit niet? Pas ze aan via <strong>Instellingen → Kolommen koppelen</strong>.
                                        </div>
                                        <button onClick={() => setColMap(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                )}

                                {/* Groep opslag */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px' }}>
                                    <i className="fa-solid fa-percent" style={{ color: '#6366f1', fontSize: '0.9rem' }} />
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Groepsopslag toepassen op alle rijen</span>
                                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={groepOpslag}
                                            placeholder="0.00"
                                            onChange={e => setGroepOpslag(e.target.value)}
                                            onBlur={e => { if (e.target.value !== '') setGroepOpslag(parseFloat(e.target.value).toFixed(2)); }}
                                            style={{ width: '100px', padding: '6px 22px 6px 8px', border: '1.5px solid #6366f1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right', color: '#1e293b', fontWeight: 700 }}
                                        />
                                        <span style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontSize: '0.8rem', fontWeight: 700 }}>%</span>
                                    </div>
                                    <button onClick={() => {
                                        const pct = parseFloat(groepOpslag);
                                        if (!pct) return;
                                        const updated = {};
                                        filtered.forEach((row) => { const rk = row[cols.code] || row[cols.naam] || String(rows.indexOf(row)); updated[rk] = String(pct); });
                                        const merged = { ...opslagen, ...updated };
                                        setOpslagen(merged);
                                        localStorage.setItem('schildersapp_materiaal_opslagen', JSON.stringify(merged));
                                        // wis handmatige verkoopprijzen voor deze rijen
                                        const vUpdated = { ...verkoopprijzen };
                                        filtered.forEach((row) => { const rk = row[cols.code] || row[cols.naam] || String(rows.indexOf(row)); delete vUpdated[rk]; });
                                        setVerkoopprijzen(vUpdated);
                                        localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(vUpdated));
                                    }}
                                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Toepassen
                                    </button>
                                    <button onClick={() => {
                                        setOpslagen({});
                                        setVerkoopprijzen({});
                                        localStorage.removeItem('schildersapp_materiaal_opslagen');
                                        localStorage.removeItem('schildersapp_materiaal_verkoop');
                                        setGroepOpslag('');
                                    }}
                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                    <button onClick={() => {
                                        const nieuw = !afronden;
                                        setAfronden(nieuw);
                                        localStorage.setItem('schildersapp_materiaal_afronden', JSON.stringify(nieuw));
                                        if (nieuw) {
                                            // Zet AAN: sla originele opslagen op, herbereken op basis van afgeronde prijs
                                            opslagenBackup.current = { ...opslagen };
                                            const oUpdated = { ...opslagen };
                                            const vUpdated = { ...verkoopprijzen };
                                            rows.forEach((row, gi) => {
                                                const rk = row[cols.code] || row[cols.naam] || String(gi);
                                                const { incl } = getPrijs(row);
                                                if (!incl) return;
                                                const rijOpslag = parseFloat(opslagen[rk]) || 0;
                                                const berekend  = rijOpslag > 0 ? incl * (1 + rijOpslag / 100) : incl;
                                                const ceiled    = Math.ceil(berekend);
                                                vUpdated[rk]    = String(ceiled);
                                                oUpdated[rk]    = ((ceiled / incl - 1) * 100).toFixed(2);
                                            });
                                            setVerkoopprijzen(vUpdated);
                                            setOpslagen(oUpdated);
                                            localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(vUpdated));
                                            localStorage.setItem('schildersapp_materiaal_opslagen', JSON.stringify(oUpdated));
                                        } else {
                                            // Zet UIT: herstel originele opslagen, verwijder auto-afgeronde verkoopprijzen
                                            const herstel = opslagenBackup.current ?? {};
                                            setOpslagen(herstel);
                                            localStorage.setItem('schildersapp_materiaal_opslagen', JSON.stringify(herstel));
                                            opslagenBackup.current = null;
                                            const vUpdated = { ...verkoopprijzen };
                                            rows.forEach((row, gi) => {
                                                const rk = row[cols.code] || row[cols.naam] || String(gi);
                                                if (vUpdated[rk] == null) return;
                                                const { incl } = getPrijs(row);
                                                const rijOpslag = parseFloat(herstel[rk]) || 0;
                                                const berekend  = rijOpslag > 0 ? incl * (1 + rijOpslag / 100) : incl;
                                                if (berekend && Math.ceil(berekend) === parseFloat(vUpdated[rk])) {
                                                    delete vUpdated[rk];
                                                }
                                            });
                                            setVerkoopprijzen(vUpdated);
                                            localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(vUpdated));
                                        }
                                    }}
                                        title={afronden ? 'Afronden staat AAN — klik om uit te zetten' : 'Zet afronden aan (verkoopprijzen naar hele euro\'s)'}
                                        style={{ padding: '6px 12px', borderRadius: '8px', border: `1.5px solid ${afronden ? '#10b981' : '#e2e8f0'}`, background: afronden ? '#10b981' : '#f8fafc', color: afronden ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                                        <i className="fa-solid fa-up-long" />€ Afronden
                                    </button>
                                </div>

                                {/* Resultaatinfo */}
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '10px', paddingLeft: '2px' }}>
                                    {zoek ? `${filtered.length} resultaten voor "${zoek}"` : `${rows.length} artikelen — typ om te zoeken`}
                                    {prijzen[user?.id]?.opslag > 0 && <span style={{ marginLeft: '8px', color: '#F5850A', fontWeight: 600 }}>+{prijzen[user?.id]?.opslag}% opslag actief</span>}
                                </div>

                                {/* Artikelkaarten */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {filtered.map((row, i) => {
                                        const gi = rows.indexOf(row);
                                        const rk = row[cols.code] || row[cols.naam] || String(gi); // rij-sleutel op code
                                        const { excl, incl, verkoop } = getPrijs(row);
                                        const fieldValues = {
                                            naam:         row[cols.naam]         ?? '—',
                                            code:         row[cols.code]         ?? '',
                                            eenheid:      row[cols.eenheid]      ?? '',
                                            categorie:    row[cols.categorie]    ?? '',
                                            inhoud:       cols.inhoud ? (row[cols.inhoud] ?? '') : '',
                                            verkoopprijs: cols.verkoopprijs ? (row[cols.verkoopprijs] ?? '') : '',
                                            prijs:        cols.prijs && row[cols.prijs] !== '' && row[cols.prijs] !== undefined,
                                        };
                                        const naamVal = fieldValues.naam;
                                        // Velden in volgorde minus naam (apart weergegeven) en prijs (rechts)
                                        const badgeFields = fieldOrder.filter(f => f !== 'naam' && f !== 'prijs' && f !== 'verkoopprijs');
                                        const toonPrijs   = fieldOrder.includes('prijs') && fieldValues.prijs;
                                        return (
                                            <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #f1f5f9', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'relative' }}>
                                                {isBeheerder && (
                                                    <button onClick={() => deleteRow(row)}
                                                        title="Rij verwijderen"
                                                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', lineHeight: 1 }}
                                                        onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
                                                        <i className="fa-solid fa-trash" />
                                                    </button>
                                                )}
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-cube" style={{ color: '#F5850A', fontSize: '1rem' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {fieldOrder.includes('naam') && (
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.35, flex: 1 }}>{naamVal}</div>
                                                            {(() => {
                                                                const entry = parseEntry(tdsLinks[getBasisNaam(naamVal)]);
                                                                if (!entry.tds && !entry.msds && !entry.certs?.length && !entry.leaflet) return null;
                                                                return (
                                                                    <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                                                        {entry.tds && <a href={entry.tds} target="_blank" rel="noreferrer" title="TDS" style={{ color: '#ef4444', fontSize: '0.85rem', textDecoration: 'none' }}><i className="fa-solid fa-file-pdf" /></a>}
                                                                        {entry.msds && <a href={entry.msds} target="_blank" rel="noreferrer" title="Veiligheidsblad" style={{ color: '#F5850A', fontSize: '0.85rem', textDecoration: 'none' }}><i className="fa-solid fa-triangle-exclamation" /></a>}
                                                                        {entry.certs?.length > 0 && <a href={entry.certs[0]} target="_blank" rel="noreferrer" title="Certificaat" style={{ color: '#10b981', fontSize: '0.85rem', textDecoration: 'none' }}><i className="fa-solid fa-certificate" /></a>}
                                                                        {entry.leaflet && <a href={entry.leaflet} target="_blank" rel="noreferrer" title="Leaflet" style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none' }}><i className="fa-solid fa-newspaper" /></a>}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                        {badgeFields.map(f => {
                                                            const val = fieldValues[f];
                                                            if (!val) return null;
                                                            const styles = {
                                                                categorie:    { bg: '#eef2ff', clr: '#6366f1' },
                                                                eenheid:      { bg: '#f0fdf4', clr: '#10b981' },
                                                                inhoud:       { bg: '#ecfeff', clr: '#06b6d4' },
                                                                code:         { bg: '#f1f5f9', clr: '#64748b' },
                                                            };
                                                            const { bg, clr } = styles[f] || { bg: '#f1f5f9', clr: '#64748b' };
                                                            const txt = f === 'eenheid' ? `per ${val}` : f === 'inhoud' ? `${val}L` : val;
                                                            return <span key={f} style={{ fontSize: '0.7rem', color: clr, background: bg, borderRadius: '6px', padding: '1px 6px' }}>{txt}</span>;
                                                        })}
                                                    </div>
                                                </div>
                                                {toonPrijs && (() => {
                                                    const opslag = parseFloat(opslagen[rk]) || 0;
                                                    const berekend = opslag > 0 ? incl * (1 + opslag / 100) : null;
                                                    const verkPrijs = verkoopprijzen[rk] ? parseFloat(verkoopprijzen[rk]) : berekend;
                                                    return (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                            {/* Inkoopprijs */}
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>INKOOP</div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#64748b' }}>{fmt(incl)}</div>
                                                                {isBeheerder && !verkoop && (
                                                                    <div style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>excl. {fmt(excl)}</div>
                                                                )}
                                                            </div>
                                                            <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>→</span>
                                                            {/* Opslag % */}
                                                            <div style={{ textAlign: 'center' }}>
                                                                <div style={{ fontSize: '0.6rem', color: '#6366f1', fontWeight: 600, marginBottom: '2px' }}>OPSLAG</div>
                                                                <div style={{ position: 'relative' }}>
                                                                    <input
                                                                        type="number" min="0" step="0.01"
                                                                        value={opslagen[rk] != null && opslagen[rk] !== '' ? parseFloat(opslagen[rk]).toFixed(2) : ''}
                                                                        placeholder="0"
                                                                        onChange={e => {
                                                                            const updated = { ...opslagen, [rk]: e.target.value };
                                                                            setOpslagen(updated);
                                                                            localStorage.setItem('schildersapp_materiaal_opslagen', JSON.stringify(updated));
                                                                            if (e.target.value) {
                                                                                const vUpdated = { ...verkoopprijzen };
                                                                                delete vUpdated[rk];
                                                                                setVerkoopprijzen(vUpdated);
                                                                                localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(vUpdated));
                                                                            }
                                                                        }}
                                                                        style={{ width: '84px', padding: '5px 20px 5px 6px', border: `1.5px solid ${opslagen[rk] ? '#6366f1' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right', color: '#1e293b', background: opslagen[rk] ? '#eef2ff' : '#f8fafc', fontWeight: 700 }}
                                                                    />
                                                                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontSize: '0.75rem', fontWeight: 700 }}>%</span>
                                                                </div>
                                                            </div>
                                                            <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>→</span>
                                                            {/* Verkoopprijs */}
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '0.6rem', color: '#F5850A', fontWeight: 600, marginBottom: '2px' }}>VERKOOP</div>
                                                                <div style={{ position: 'relative' }}>
                                                                    <span style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>€</span>
                                                                    <input
                                                                        type="number" min="0" step="0.01"
                                                                        value={(() => {
                                                                            const raw = verkoopprijzen[rk] != null ? parseFloat(verkoopprijzen[rk]) : berekend;
                                                                            if (!raw) return '';
                                                                            return afronden ? String(Math.ceil(raw)) : (verkoopprijzen[rk] ?? berekend.toFixed(2));
                                                                        })()}
                                                                        placeholder="—"
                                                                        onChange={e => {
                                                                            const updated = { ...verkoopprijzen, [rk]: e.target.value };
                                                                            setVerkoopprijzen(updated);
                                                                            localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(updated));
                                                                            // Herbereken opslag% op basis van nieuwe verkoopprijs
                                                                            const vp = parseFloat(e.target.value);
                                                                            if (vp > 0 && incl > 0) {
                                                                                const nieuwOpslag = ((vp / incl - 1) * 100).toFixed(2);
                                                                                const oUpdated = { ...opslagen, [rk]: nieuwOpslag };
                                                                                setOpslagen(oUpdated);
                                                                                localStorage.setItem('schildersapp_materiaal_opslagen', JSON.stringify(oUpdated));
                                                                            }
                                                                        }}
                                                                        style={{ width: '80px', padding: '5px 6px 5px 18px', border: `1.5px solid ${verkPrijs ? '#F5850A' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right', color: '#1e293b', background: verkPrijs ? '#fff8f0' : '#f8fafc', fontWeight: 700 }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {/* TDS PDF link (beheerd via Informatiebladen tab) */}
                                                            {(() => {
                                                                const bn = getBasisNaam(row[cols.naam] ?? '');
                                                                return tdsLinks[bn] ? (
                                                                    <a href={tdsLinks[bn]} target="_blank" rel="noreferrer" title="Productinformatieblad"
                                                                        style={{ color: '#ef4444', fontSize: '1rem', textDecoration: 'none', flexShrink: 0 }}>
                                                                        <i className="fa-solid fa-file-pdf" />
                                                                    </a>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                    {filtered.length === 0 && zoek && (
                                        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.88rem' }}>
                                            <i className="fa-solid fa-face-meh" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px', opacity: 0.4 }} />
                                            Geen artikelen gevonden voor "<strong>{zoek}</strong>"
                                        </div>
                                    )}
                                </div>

                            </>
                        )}
                    </div>
                )}

                {/* ── TAB: INFORMATIEBLADEN ── */}
                {tab === 'informatiebladen' && isBeheerder && (() => {
                    const gezien = new Set();
                    const sikkensBasis = rows
                        .map(r => getBasisNaam(r[cols.naam] ?? ''))
                        .filter(b => b && isSikkens(b) && !gezien.has(b) && gezien.add(b));
                    sikkensBasis.sort();
                    const gefilterdBasis = sikkensBasis.filter(b => !zoek || b.toLowerCase().includes(zoek.toLowerCase()));
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Auto-import knop */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={autoImportTds} disabled={importing || rows.length === 0}
                                    style={{ padding: '9px 18px', borderRadius: '10px', background: importing ? '#e2e8f0' : '#1e293b', border: 'none', color: importing ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: importing || rows.length === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <i className={`fa-solid ${importing ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} />
                                    {importing ? 'Importeren…' : 'Alles automatisch importeren'}
                                </button>
                            </div>
                            {importResult && (
                                <div style={{ background: importResult.error ? '#fff5f5' : '#f0fdf4', border: `1.5px solid ${importResult.error ? '#fecaca' : '#86efac'}`, borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: importResult.error ? '#ef4444' : '#166534', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <i className={`fa-solid ${importResult.error ? 'fa-circle-exclamation' : 'fa-circle-check'}`} />
                                    {importResult.error
                                        ? 'Kon Sikkens-API niet bereiken. Probeer het later opnieuw.'
                                        : `${importResult.matched} TDS-bladen + veiligheidsbladen + certificaten gekoppeld uit ${importResult.total} documenten.`}
                                </div>
                            )}
                            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '12px 16px', fontSize: '0.82rem', color: '#1e40af', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <i className="fa-solid fa-circle-info" style={{ marginTop: '1px', flexShrink: 0 }} />
                                <span>Alle maten (2.5L, 5L, 10L) en kleurvarianten van hetzelfde basisproduct delen automatisch dezelfde documenten. Gebruik "Uploaden" om een TDS handmatig toe te voegen of te vervangen.</span>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
                                <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Filter producten…"
                                    style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', paddingLeft: '2px' }}>
                                {gefilterdBasis.length} producten — {Object.keys(tdsLinks).filter(k => isSikkens(k)).length} met documenten
                            </div>
                            {rows.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Laad eerst een materiaalbestand in via Instellingen.</div>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {gefilterdBasis.map(basisNaam => {
                                    const entry = parseEntry(tdsLinks[basisNaam]);
                                    const heeftDocs = !!(entry.tds || entry.msds || entry.certs?.length || entry.leaflet);
                                    return (
                                        <div key={basisNaam} style={{ background: '#fff', borderRadius: '12px', border: `1.5px solid ${heeftDocs ? '#86efac' : '#f1f5f9'}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: heeftDocs ? '#f0fdf4' : '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={`fa-solid ${heeftDocs ? 'fa-file-pdf' : 'fa-file'}`} style={{ color: heeftDocs ? '#ef4444' : '#F5850A', fontSize: '1rem' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{basisNaam}</div>
                                                <div style={{ fontSize: '0.7rem', color: heeftDocs ? '#10b981' : '#94a3b8', marginTop: '2px' }}>
                                                    {heeftDocs
                                                        ? [entry.tds && 'TDS', entry.msds && 'Veiligh.', entry.certs?.length && `${entry.certs.length} cert.`, entry.leaflet && 'Leaflet'].filter(Boolean).join(' · ')
                                                        : 'Geen documenten'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                {entry.tds && <a href={entry.tds} target="_blank" rel="noreferrer" title="Technisch informatieblad (TDS)" style={{ padding: '5px 10px', borderRadius: '7px', background: '#fff5f5', border: '1.5px solid #fecaca', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fa-solid fa-file-pdf" />TDS</a>}
                                                {entry.msds && <a href={entry.msds} target="_blank" rel="noreferrer" title="Veiligheidsblad (CLP/MSDS)" style={{ padding: '5px 10px', borderRadius: '7px', background: '#fff8f0', border: '1.5px solid #fed7aa', color: '#F5850A', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fa-solid fa-triangle-exclamation" />Veiligh.</a>}
                                                {entry.certs?.map((c, ci) => <a key={ci} href={c} target="_blank" rel="noreferrer" title="Certificaat" style={{ padding: '5px 10px', borderRadius: '7px', background: '#f0fdf4', border: '1.5px solid #86efac', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fa-solid fa-certificate" />Cert.</a>)}
                                                {entry.leaflet && <a href={entry.leaflet} target="_blank" rel="noreferrer" title="Leaflet" style={{ padding: '5px 10px', borderRadius: '7px', background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fa-solid fa-newspaper" />Leaflet</a>}
                                                <button onClick={() => { setTdsUploading(basisNaam); tdsRef.current?.click(); }}
                                                    title="Upload een TDS-PDF handmatig"
                                                    style={{ padding: '5px 10px', borderRadius: '7px', background: entry.tds ? '#f8fafc' : '#F5850A', border: `1.5px solid ${entry.tds ? '#e2e8f0' : '#F5850A'}`, color: entry.tds ? '#64748b' : '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className={`fa-solid ${entry.tds ? 'fa-arrow-rotate-right' : 'fa-arrow-up-from-bracket'}`} />
                                                    {entry.tds ? 'TDS vervangen' : 'TDS uploaden'}
                                                </button>
                                                {heeftDocs && (
                                                    <button onClick={() => {
                                                        const updated = { ...tdsLinks }; delete updated[basisNaam];
                                                        setTdsLinks(updated);
                                                        localStorage.setItem('schildersapp_materiaal_tds', JSON.stringify(updated));
                                                    }} style={{ padding: '5px 8px', borderRadius: '7px', background: '#fff5f5', border: '1.5px solid #fecaca', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>
                                                        <i className="fa-solid fa-trash" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* ── TAB: INSTELLINGEN (alleen beheerder) ── */}
                {tab === 'instellingen' && isBeheerder && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Weergave volgorde */}
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #f1f5f9', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-arrow-up-short-wide" style={{ color: '#F5850A' }} />
                                Weergave kolommen
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>Zet kolommen aan/uit en pas de volgorde aan met de pijlen.</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {ALL_FIELDS.map((f, idx) => {
                                    const meta = FIELD_LABELS[f] || { label: f, icon: 'fa-circle', color: '#64748b' };
                                    const aan = fieldOrder.includes(f);
                                    const pos = fieldOrder.indexOf(f);
                                    return (
                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: aan ? '#f8fafc' : '#fafafa', borderRadius: '10px', border: `1.5px solid ${aan ? '#f1f5f9' : '#f1f5f9'}`, opacity: aan ? 1 : 0.5 }}>
                                            {/* toggle */}
                                            <button onClick={() => {
                                                const updated = aan
                                                    ? fieldOrder.filter(x => x !== f)
                                                    : [...fieldOrder, f];
                                                setFieldOrder(updated);
                                                localStorage.setItem(LS_VOLGORDE, JSON.stringify(updated));
                                            }} style={{ width: '32px', height: '20px', borderRadius: '10px', border: 'none', background: aan ? '#F5850A' : '#e2e8f0', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                                                <span style={{ position: 'absolute', top: '3px', left: aan ? '15px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s', display: 'block' }} />
                                            </button>
                                            <i className={`fa-solid ${meta.icon}`} style={{ color: meta.color, width: '16px', textAlign: 'center', fontSize: '0.85rem' }} />
                                            <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{meta.label}</span>
                                            {aan && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => moveField(pos, -1)} disabled={pos === 0}
                                                        style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: pos === 0 ? '#f8fafc' : '#fff', color: pos === 0 ? '#cbd5e1' : '#475569', cursor: pos === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                                        <i className="fa-solid fa-chevron-up" />
                                                    </button>
                                                    <button onClick={() => moveField(pos, 1)} disabled={pos === fieldOrder.length - 1}
                                                        style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: pos === fieldOrder.length - 1 ? '#f8fafc' : '#fff', color: pos === fieldOrder.length - 1 ? '#cbd5e1' : '#475569', cursor: pos === fieldOrder.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                                        <i className="fa-solid fa-chevron-down" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Live voorbeeld */}
                            {rows.length > 0 && (() => {
                                // Gebruik een product dat TDS-docs heeft zodat het voorbeeld
                                // overeenkomt met hoe het er in de bot uitziet
                                const previewIdx = rows.findIndex(r => {
                                    const entry = parseEntry(tdsLinks[getBasisNaam(r[cols.naam] ?? '')]);
                                    return entry.tds || entry.msds;
                                });
                                const gi  = previewIdx >= 0 ? previewIdx : 0;
                                const row = rows[gi];
                                const rk  = row[cols.code] || row[cols.naam] || String(gi);
                                const { incl } = getPrijs(row);
                                const opslag   = parseFloat(opslagen[rk]) || 0;
                                const berekend = opslag > 0 ? incl * (1 + opslag / 100) : incl;
                                const verkPrijsRaw = verkoopprijzen[rk] ? parseFloat(verkoopprijzen[rk]) : berekend;
                                const verkPrijs = afronden && verkPrijsRaw ? Math.ceil(verkPrijsRaw) : verkPrijsRaw;
                                const fv = {
                                    naam:         row[cols.naam]         ?? '—',
                                    code:         row[cols.code]         ?? '',
                                    eenheid:      row[cols.eenheid]      ?? '',
                                    categorie:    row[cols.categorie]    ?? '',
                                    inhoud:       cols.inhoud ? (row[cols.inhoud] ?? '') : '',
                                    verkoopprijs: cols.verkoopprijs ? (row[cols.verkoopprijs] ?? '') : '',
                                };
                                const badgeFields = fieldOrder.filter(f => f !== 'naam' && f !== 'prijs' && f !== 'verkoopprijs');
                                const badgeStyles = {
                                    categorie: { bg: '#eef2ff', clr: '#6366f1' },
                                    eenheid:   { bg: '#f0fdf4', clr: '#10b981' },
                                    inhoud:    { bg: '#ecfeff', clr: '#06b6d4' },
                                    code:      { bg: '#f1f5f9', clr: '#64748b' },
                                };
                                const tdsEntry = parseEntry(tdsLinks[getBasisNaam(fv.naam)]);
                                return (
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voorbeeld (medewerker ziet dit)</div>
                                        <div style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #f1f5f9', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className="fa-solid fa-cube" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                    {fieldOrder.includes('naam') && (
                                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.35, flex: 1 }}>{fv.naam}</div>
                                                    )}
                                                    {(tdsEntry.tds || tdsEntry.msds || tdsEntry.certs?.length || tdsEntry.leaflet) && (
                                                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                                            {tdsEntry.tds      && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}><i className="fa-solid fa-file-pdf" /></span>}
                                                            {tdsEntry.msds     && <span style={{ color: '#F5850A', fontSize: '0.85rem' }}><i className="fa-solid fa-triangle-exclamation" /></span>}
                                                            {tdsEntry.certs?.length > 0 && <span style={{ color: '#10b981', fontSize: '0.85rem' }}><i className="fa-solid fa-certificate" /></span>}
                                                            {tdsEntry.leaflet  && <span style={{ color: '#6366f1', fontSize: '0.85rem' }}><i className="fa-solid fa-newspaper" /></span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                    {badgeFields.map(f => {
                                                        const val = fv[f];
                                                        if (!val) return null;
                                                        const { bg, clr } = badgeStyles[f] || { bg: '#f1f5f9', clr: '#64748b' };
                                                        const txt = f === 'eenheid' ? `per ${val}` : f === 'inhoud' ? `${val}L` : val;
                                                        return <span key={f} style={{ fontSize: '0.65rem', color: clr, background: bg, borderRadius: '5px', padding: '1px 5px' }}>{txt}</span>;
                                                    })}
                                                </div>
                                            </div>
                                            {fieldOrder.includes('prijs') && (
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F5850A' }}>{fmt(verkPrijs)}</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#F5850A', opacity: 0.7 }}>{fv.eenheid ? `per ${fv.eenheid}` : 'verkoopprijs'}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Kolommen koppelen */}
                        {headers.length > 0 && (
                            <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #f1f5f9', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-table-columns" style={{ color: '#F5850A' }} />
                                    Kolommen koppelen
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[
                                        ['naam',      'Artikelnaam / omschrijving'],
                                        ['code',      'Artikelcode / nummer'],
                                        ['prijs',     'Basisprijs (excl. BTW)'],
                                        ['eenheid',   'Eenheid / verpakking'],
                                        ['categorie',    'Categorie / groep'],
                                        ['verkoopprijs', 'Verkoopprijs / eindprijs'],
                                        ['inhoud',       'Inhoud / verpakkingsgrootte (bijv. 5 voor 5L)'],
                                    ].map(([key, label]) => (
                                        <div key={key}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>{label}</label>
                                            <select value={cols[key]} onChange={e => {
                                                    const updated = { ...cols, [key]: e.target.value };
                                                    setCols(updated);
                                                    localStorage.setItem(LS_COLS, JSON.stringify(updated));
                                                }}
                                                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#1e293b' }}>
                                                <option value="">— niet gebruiken —</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Opslag per gebruiker */}
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #f1f5f9', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-percent" style={{ color: '#F5850A' }} />
                                Opslag per gebruiker
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                                Stel een opslagpercentage in bovenop de basisprijs. De prijs die de gebruiker ziet is: basisprijs × (1 + opslag%) × 1,21 (incl. BTW).
                            </div>
                            {alleUsers.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Geen gebruikers gevonden in het systeem.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {alleUsers.map(u => {
                                        const cur = parseFloat(prijzen[u.id]?.opslag ?? 0);
                                        return (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #f1f5f9' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5850A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>{u.name?.charAt(0)}</span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{u.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{u.role}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input
                                                        type="number" min="0" max="200" step="1"
                                                        value={cur === 0 ? '' : cur}
                                                        placeholder="0"
                                                        onChange={e => {
                                                            const updated = { ...prijzen, [u.id]: { ...prijzen[u.id], opslag: parseFloat(e.target.value) || 0 } };
                                                            setPrijzen(updated);
                                                        }}
                                                        style={{ width: '70px', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right', color: '#1e293b' }}
                                                    />
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => savePrijzen(prijzen)}
                                        style={{ marginTop: '4px', padding: '12px', background: '#F5850A', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '7px' }} />
                                        Opslaan
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Bestand opnieuw laden */}
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #f1f5f9', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-file-excel" style={{ color: '#10b981' }} />
                                XLSX bestand
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
                                {rows.length > 0 ? `${rows.length} artikelen ingeladen.` : 'Nog geen bestand ingeladen.'}
                            </div>
                            <button onClick={() => fileRef.current?.click()} disabled={loading}
                                style={{ padding: '10px 18px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', color: '#15803d', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                                {rows.length > 0 ? 'Bestand vervangen' : 'XLSX inladen'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── TAB: BESTEK KOPPELINGEN ── */}
            {tab === 'bestek' && isBeheerder && (() => {
                const ALLE_PRODUCTEN = [
                    // Hout grondverf / primer syn
                    'Rubbol Primer','Rubbol Primer Extra','Rubbol Primer Express',
                    // Hout grondverf / primer wat
                    'Rubbol BL Primer','Rubbol BL Rezisto Primer','Rubbol BL Uniprimer','Rubbol BL Isoprimer',
                    // Hout dekkend buiten syn
                    'Rubbol SB','Rubbol Express High Gloss','Rubbol Finura High Gloss','Rubbol Finura Satin',
                    'Rubbol DSA Thix','Alphaloxan','Alphaloxan Flex','Alphaxylan SF',
                    // Hout dekkend buiten wat
                    'Rubbol XD High Gloss','Rubbol XD Semi Gloss','Rubbol EPS','Rubbol EPS Thix',
                    'Rubbol Satura','Rubbol WF 376','Rubbol WF 387',
                    // Hout dekkend binnen wat
                    'Rubbol BL Ventura Satin','Rubbol BL Safira','Rubbol BL Satura',
                    'Rubbol BL Rezisto Mat','Rubbol BL Rezisto Satin','Rubbol BL Rezisto Semi-Gloss',
                    'Rubbol BL Rezisto High Gloss','Rubbol BL Rezisto Spray','Rubbol BL Endurance High Gloss',
                    // Hout beits/vernis
                    'Cetol TGX Gloss','Cetol TGL Satin Plus','Cetol Novatech','Cetol HLS Plus','Cetol BLX-Pro',
                    'Cetol BL Decor','Cetol BL Varnish Mat','Cetol BL Natural Mat','Cetol BL Endurance Primer',
                    // Steenachtig primer
                    'Alpha Fixeer',
                    // Steenachtig buiten
                    'Alpha Aqua SI','Alpha Humitex SF','Alpha Isolux SF','Alpha Metallic','Alpha Plafond Extreem Mat',
                    'Alpha Prof Mat','Alpha Projecttex','Alpha Recycle Mat','Alpha Rezisto Anti Marks',
                    'Alpha Rezisto Easy Clean','Alpha Sanocryl','Alpha Topcoat','Alpha Topcoat Flex',
                    'Alphacoat','Alphacryl Easy Spray','Alphacryl Pure Mat SF',
                    'Alphatex 4SO Mat','Alphatex IQ','Alphatex IQ Mat','Alphatex Satin SF','Alphatex SF',
                    // Metaal primer
                    'Redox BL Multi Primer','Redox AK Primer','Sudwest All Grund',
                    // Metaal aflak
                    'Redox BL Forte','Redox BL Metal Protect Satin','Redox PUR Finish High Gloss','Redox PUR Finish Satin',
                    // Vloer primer
                    'Wapex Primer',
                    // Vloer aflak
                    'Wapex 501','Wapex 647 Semi-mat','Wapex 650','Wapex 660','Wapex 660 Mat','Wapex PUR Clearcoat',
                ];

                // Categorieën uit BESTEK
                const catLijst = Object.keys(BESTEK);
                const bestekCat = bestekCats[0] || 'OHD'; // primaire cat voor display
                const huidigeCat = BESTEK[bestekCat] || {};

                // Codes binnen geselecteerde categorie
                const codesInCat = [];
                ['buiten', 'binnen'].forEach(sit => {
                    if (huidigeCat[sit]) {
                        Object.entries(huidigeCat[sit]).forEach(([nr, data]) => {
                            codesInCat.push({ code: `${bestekCat} ${nr}`, naam: data.naam, sit });
                        });
                    }
                });

                const LAGEN = ['bijgronden', 'geheelGronden', 'voorlakken', 'aflakken'];
                const LAAG_LABEL = { bijgronden: 'Bijgronden', geheelGronden: 'Geheel gronden', voorlakken: 'Voorlakken', aflakken: 'Aflakken' };
                const LAAG_KLEUR = { bijgronden: '#ea580c', geheelGronden: '#d97706', voorlakken: '#7c3aed', aflakken: '#16a34a' };

                // Categorieniveau producten — nieuwe structuur: { buiten: { bijgronden: [...] }, binnen: { ... } }
                const catRaw = bestekMap[bestekCat];
                const isNieuwCatFormaat = catRaw && (catRaw.buiten !== undefined || catRaw.binnen !== undefined);

                // ── Standaard productselecties per categorie/situering/laag ────────────
                // OHD/NHD — Hout Dekkend
                const _HD_BUI = {
                    bijgronden:   ['Rubbol Primer','Rubbol Primer Express'],
                    geheelGronden:['Rubbol Primer','Rubbol Primer Express'],
                    voorlakken:   ['Rubbol Primer Extra'],
                    aflakken:     ['Rubbol XD High Gloss','Rubbol XD Semi Gloss','Rubbol SB','Rubbol EPS','Rubbol EPS Thix','Rubbol Satura','Rubbol Express High Gloss','Rubbol Finura High Gloss','Rubbol Finura Satin','Rubbol WF 376','Rubbol WF 387','Alphaloxan','Alphaloxan Flex'],
                };
                const _HD_BIN = {
                    bijgronden:   ['Rubbol BL Primer','Rubbol BL Isoprimer'],
                    geheelGronden:['Rubbol BL Primer','Rubbol BL Isoprimer'],
                    voorlakken:   ['Rubbol BL Rezisto Primer'],
                    aflakken:     ['Rubbol BL Ventura Satin','Rubbol BL Safira','Rubbol BL Satura','Rubbol BL Rezisto Mat','Rubbol BL Rezisto Satin','Rubbol BL Rezisto Semi-Gloss','Rubbol BL Rezisto High Gloss','Rubbol BL Rezisto Spray','Rubbol BL Endurance High Gloss','Alphacoat'],
                };
                // OHT/NHT — Hout Transparante Beits
                const _HT_BUI = {
                    bijgronden:   ['Cetol BL Endurance Primer'],
                    geheelGronden:['Cetol BL Endurance Primer'],
                    voorlakken:   ['Cetol HLS Plus','Cetol TGL Satin Plus'],
                    aflakken:     ['Cetol TGX Gloss','Cetol TGL Satin Plus','Cetol Novatech','Cetol HLS Plus','Cetol BLX-Pro'],
                };
                const _HT_BIN = {
                    bijgronden:   ['Cetol BLX-Pro'],
                    voorlakken:   ['Cetol BLX-Pro'],
                    aflakken:     ['Cetol BL Decor','Cetol BL Varnish Mat','Cetol BL Natural Mat','Cetol BLX-Pro'],
                };
                // OHV/NHV — Hout Vernis
                const _HV_BUI = {
                    bijgronden:   ['Cetol BL Endurance Primer'],
                    geheelGronden:['Cetol BL Endurance Primer'],
                    voorlakken:   ['Cetol TGX Gloss','Cetol BLX-Pro'],
                    aflakken:     ['Cetol TGX Gloss','Cetol BLX-Pro'],
                };
                const _HV_BIN = {
                    voorlakken:   ['Cetol BL Varnish Mat','Cetol BL Natural Mat'],
                    aflakken:     ['Cetol BL Varnish Mat','Cetol BL Natural Mat'],
                };
                // OMS/NMS — Metaal Staal
                const _MS_BUI = {
                    bijgronden:   ['Redox BL Forte','Redox BL Multi Primer','Redox AK Primer','Sudwest All Grund'],
                    geheelGronden:['Redox BL Forte','Redox BL Multi Primer','Redox AK Primer','Sudwest All Grund'],
                    voorlakken:   ['Redox BL Metal Protect Satin'],
                    aflakken:     ['Redox PUR Finish High Gloss','Redox PUR Finish Satin','Redox BL Metal Protect Satin'],
                };
                const _MS_BIN = {
                    bijgronden:   ['Redox BL Forte','Redox BL Multi Primer','Sudwest All Grund'],
                    geheelGronden:['Redox BL Forte','Redox BL Multi Primer','Sudwest All Grund'],
                    voorlakken:   ['Redox BL Metal Protect Satin'],
                    aflakken:     ['Redox PUR Finish High Gloss','Redox PUR Finish Satin','Redox BL Metal Protect Satin'],
                };
                // OMV/NMV — Metaal Verzinkt
                const _MV_BUI = {
                    bijgronden:   ['Redox BL Forte','Redox BL Multi Primer','Rubbol BL Uniprimer','Sudwest All Grund'],
                    geheelGronden:['Redox BL Forte','Redox BL Multi Primer','Rubbol BL Uniprimer','Sudwest All Grund'],
                    voorlakken:   ['Redox BL Metal Protect Satin'],
                    aflakken:     ['Redox PUR Finish High Gloss','Redox PUR Finish Satin','Redox BL Metal Protect Satin'],
                };
                const _MV_BIN = {
                    bijgronden:   ['Redox BL Forte','Redox BL Multi Primer','Rubbol BL Uniprimer'],
                    geheelGronden:['Redox BL Forte','Redox BL Multi Primer','Rubbol BL Uniprimer'],
                    aflakken:     ['Redox PUR Finish High Gloss','Redox PUR Finish Satin','Redox BL Metal Protect Satin'],
                };
                // OMA/NMA — Metaal Aluminium
                const _MA_BUI = {
                    bijgronden:   ['Rubbol BL Uniprimer','Redox BL Multi Primer','Redox BL Forte'],
                    geheelGronden:['Rubbol BL Uniprimer','Redox BL Multi Primer','Redox BL Forte'],
                    voorlakken:   ['Redox PUR Finish High Gloss','Redox PUR Finish Satin'],
                    aflakken:     ['Redox PUR Finish High Gloss','Redox PUR Finish Satin'],
                };
                const _MA_BIN = {
                    bijgronden:   ['Rubbol BL Uniprimer','Redox BL Multi Primer','Redox BL Forte'],
                    aflakken:     ['Redox PUR Finish High Gloss','Redox PUR Finish Satin'],
                };
                // OSD/NSD — Steenachtig Dekkend
                const _SD_BUI = {
                    bijgronden:   ['Alpha Fixeer'],
                    geheelGronden:['Alpha Fixeer'],
                    aflakken:     ['Alpha Aqua SI','Alpha Humitex SF','Alpha Isolux SF','Alpha Projecttex','Alphacoat','Finura'],
                };
                const _SD_BIN = {
                    bijgronden:   ['Alpha Fixeer'],
                    geheelGronden:['Alpha Fixeer'],
                    aflakken:     ['Alpha Prof Mat','Alpha Plafond Extreem Mat','Alpha Recycle Mat','Alpha Rezisto Anti Marks','Alpha Rezisto Easy Clean','Alpha Sanocryl','Alpha Topcoat','Alpha Topcoat Flex','Alpha Projecttex','Alpha Metallic','Alpha Isolux SF','Alphatex SF','Alphatex IQ','Alphatex IQ Mat','Alphatex Satin SF','Alphatex 4SO Mat','Alphacryl Pure Mat SF','Alphacryl Easy Spray'],
                };
                // OSV/NSV — Steenachtig Vloeren
                const _SV_BUI = {
                    bijgronden:   ['Wapex Primer'],
                    geheelGronden:['Wapex Primer'],
                    aflakken:     ['Wapex 647 Semi-mat','Wapex 650','Wapex 660','Wapex 660 Mat','Wapex PUR Clearcoat'],
                };
                const _SV_BIN = {
                    bijgronden:   ['Wapex Primer'],
                    geheelGronden:['Wapex Primer'],
                    aflakken:     ['Wapex 647 Semi-mat','Wapex 650','Wapex 660','Wapex 660 Mat','Wapex PUR Clearcoat'],
                };
                // OKD/NKD — Kunststof Dekkend
                const _KD_BUI = {
                    bijgronden:   ['Rubbol BL Uniprimer','Rubbol Primer'],
                    geheelGronden:['Rubbol BL Uniprimer','Rubbol Primer'],
                    voorlakken:   ['Rubbol Primer Extra'],
                    aflakken:     ['Rubbol XD High Gloss','Rubbol XD Semi Gloss','Rubbol SB','Rubbol EPS','Rubbol EPS Thix','Alphaloxan','Alphaloxan Flex'],
                };
                const _KD_BIN = {
                    bijgronden:   ['Rubbol BL Uniprimer','Rubbol BL Primer'],
                    geheelGronden:['Rubbol BL Uniprimer','Rubbol BL Primer'],
                    voorlakken:   ['Rubbol BL Rezisto Primer'],
                    aflakken:     ['Rubbol BL Ventura Satin','Rubbol BL Safira','Rubbol BL Rezisto Mat','Rubbol BL Rezisto Satin','Alphacoat'],
                };

                const BESTEK_PRODUCTEN_DEFAULT = {
                    OHD: { buiten: _HD_BUI, binnen: _HD_BIN },
                    NHD: { buiten: _HD_BUI, binnen: _HD_BIN },
                    OHT: { buiten: _HT_BUI, binnen: _HT_BIN },
                    NHT: { buiten: _HT_BUI, binnen: _HT_BIN },
                    OHV: { buiten: _HV_BUI, binnen: _HV_BIN },
                    NHV: { buiten: _HV_BUI, binnen: _HV_BIN },
                    OMS: { buiten: _MS_BUI, binnen: _MS_BIN },
                    NMS: { buiten: _MS_BUI, binnen: _MS_BIN },
                    OMV: { buiten: _MV_BUI, binnen: _MV_BIN },
                    NMV: { buiten: _MV_BUI, binnen: _MV_BIN },
                    OMA: { buiten: _MA_BUI, binnen: _MA_BIN },
                    NMA: { buiten: _MA_BUI, binnen: _MA_BIN },
                    OSD: { buiten: _SD_BUI, binnen: _SD_BIN },
                    NSD: { buiten: _SD_BUI, binnen: _SD_BIN },
                    OSV: { buiten: _SV_BUI, binnen: _SV_BIN },
                    NSV: { buiten: _SV_BUI, binnen: _SV_BIN },
                    OKD: { buiten: _KD_BUI, binnen: _KD_BIN },
                    NKD: { buiten: _KD_BUI, binnen: _KD_BIN },
                };

                // Geef de laag-map voor een specifieke situering (buiten/binnen)
                // Default wordt gebruikt voor lagen die de admin nog niet handmatig heeft ingesteld.
                // Expliciet lege arrays ([]) in localStorage worden WEL gerespecteerd (admin heeft gewist).
                function getCatVoorSit(sit) {
                    const def = BESTEK_PRODUCTEN_DEFAULT[bestekCat]?.[sit] || {};
                    if (isNieuwCatFormaat) {
                        const stored = catRaw[sit] || {};
                        // Per laag: gebruik stored als de sleutel bestaat (ook als leeg), anders default
                        const merged = { ...def };
                        Object.keys(stored).forEach(laag => { merged[laag] = stored[laag]; });
                        return merged;
                    }
                    if (catRaw && !Array.isArray(catRaw)) return catRaw;
                    return def;
                }

                const PRODUCT_GROEPEN = [
                    { label: 'Hout grondverf', producten: ['Rubbol Primer','Rubbol Primer Extra','Rubbol Primer Express','Rubbol BL Primer','Rubbol BL Rezisto Primer','Rubbol BL Uniprimer','Rubbol BL Isoprimer','Rubbol BL Endurance Primer','Cetol BL Endurance Primer'] },
                    { label: 'Houtverf buiten syn', producten: ['Rubbol SB','Rubbol Express High Gloss','Rubbol Finura High Gloss','Rubbol Finura Satin','Rubbol DSA Thix'] },
                    { label: 'Houtverf buiten wat', producten: ['Rubbol XD High Gloss','Rubbol XD Semi Gloss','Rubbol EPS','Rubbol EPS Thix','Rubbol Satura','Rubbol WF 376','Rubbol WF 387','Rubbol BL Endurance High Gloss'] },
                    { label: 'Houtverf binnen', producten: ['Rubbol BL Ventura Satin','Rubbol BL Safira','Rubbol BL Satura','Rubbol BL Rezisto Mat','Rubbol BL Rezisto Satin','Rubbol BL Rezisto Semi-Gloss','Rubbol BL Rezisto High Gloss','Rubbol BL Rezisto Spray'] },
                    { label: 'Houtbeits buiten', producten: ['Cetol TGX Gloss','Cetol TGL Satin Plus','Cetol Novatech','Cetol HLS Plus','Cetol BLX-Pro'] },
                    { label: 'Houtbeits binnen', producten: ['Cetol BL Decor','Cetol BL Varnish Mat','Cetol BL Natural Mat'] },
                    { label: 'Buitenmuurverf / gevelverf', producten: ['Alpha Fixeer','Alpha Aqua SI','Alpha Humitex SF','Alpha Isolux SF','Alpha Metallic','Alpha Topcoat','Alpha Topcoat Flex','Alphacoat','Alphacryl Easy Spray','Alphacryl Pure Mat SF','Alphatex 4SO Mat','Alphatex IQ Mat','Alphatex Satin SF','Alphatex SF','Alphaloxan','Alphaloxan Flex','Alphaxylan SF'] },
                    { label: 'Binnenmuurverf / plafondverf', producten: ['Alpha Plafond Extreem Mat','Alpha Prof Mat','Alpha Projecttex','Alpha Recycle Mat','Alpha Rezisto Anti Marks','Alpha Rezisto Easy Clean','Alpha Sanocryl','Alphatex IQ','Finura','Rubbol Finura High Gloss','Rubbol Finura Satin'] },
                    { label: 'Metaalverf', producten: ['Redox BL Multi Primer','Redox AK Primer','Sudwest All Grund','Redox BL Forte','Redox BL Metal Protect Satin','Redox PUR Finish High Gloss','Redox PUR Finish Satin'] },
                    { label: 'Vloerverf', producten: ['Wapex Primer','Wapex 501','Wapex 647 Semi-mat','Wapex 650','Wapex 660','Wapex 660 Mat','Wapex PUR Clearcoat'] },
                ];

                const gefilterdeProducten = ALLE_PRODUCTEN.filter(p =>
                    !bestekZoek || p.toLowerCase().includes(bestekZoek.toLowerCase())
                );

                const MIRROR = { OHD:'NHD',NHD:'OHD',OHT:'NHT',NHT:'OHT',OHV:'NHV',NHV:'OHV',OMS:'NMS',NMS:'OMS',OMV:'NMV',NMV:'OMV',OMA:'NMA',NMA:'OMA',OSD:'NSD',NSD:'OSD',OSV:'NSV',NSV:'OSV',OKD:'NKD',NKD:'OKD' };

                function slaOp(key, laag, lijst, sit = null) {
                    // Schrijf naar opgegeven key + alle andere geselecteerde cats indien key === bestekCat
                    const keys = (key === bestekCat && bestekCats.length > 1)
                        ? bestekCats
                        : [key];
                    let updated = { ...bestekMap };
                    keys.forEach(k => {
                        const huidig = (updated[k] && !Array.isArray(updated[k])) ? updated[k] : {};
                        if (sit) {
                            const sitHuidig = huidig[sit] || {};
                            updated = { ...updated, [k]: { ...huidig, [sit]: { ...sitHuidig, [laag]: lijst } } };
                        } else {
                            updated = { ...updated, [k]: { ...huidig, [laag]: lijst } };
                        }
                        // O↔N spiegelen
                        if (sit && MIRROR[k]) {
                            const mk = MIRROR[k];
                            const lockKey = `${mk}.${sit}.${laag}`;
                            if (!bestekLocks[lockKey]) {
                                const mHuidig = (updated[mk] && !Array.isArray(updated[mk])) ? updated[mk] : {};
                                const mSit = mHuidig[sit] || {};
                                if (!mSit[laag] || mSit[laag].length === 0) {
                                    updated = { ...updated, [mk]: { ...mHuidig, [sit]: { ...mSit, [laag]: lijst } } };
                                }
                            }
                        }
                    });
                    setBestekMap(updated);
                    localStorage.setItem('schildersapp_bestek_producten', JSON.stringify(updated));
                }

                function toggleLock(cat, sit, laag) {
                    const key = `${cat}.${sit}.${laag}`;
                    const updated = { ...bestekLocks, [key]: !bestekLocks[key] };
                    setBestekLocks(updated);
                    localStorage.setItem('schildersapp_bestek_locks', JSON.stringify(updated));
                }

                function toggleCat(sit, laag, product) {
                    const h = getCatVoorSit(sit)[laag] || [];
                    slaOp(bestekCat, laag, h.includes(product) ? h.filter(p => p !== product) : [...h, product], sit);
                }

                function toggleCode(codeStr, laag, product, codeSit) {
                    const codeRaw = bestekMap[codeStr];
                    const codeObj = (codeRaw && !Array.isArray(codeRaw)) ? codeRaw : null;
                    const catVoorCode = getCatVoorSit(codeSit);
                    const basis = codeObj?.[laag] ?? catVoorCode[laag] ?? [];
                    slaOp(codeStr, laag, basis.includes(product) ? basis.filter(p => p !== product) : [...basis, product]);
                }

                function verwijderAfwijking(codeStr) {
                    const updated = { ...bestekMap };
                    delete updated[codeStr];
                    setBestekMap(updated);
                    localStorage.setItem('schildersapp_bestek_producten', JSON.stringify(updated));
                }

                function setTag(product, tag) {
                    const updated = { ...productTags };
                    const huidig = Array.isArray(updated[product]) ? updated[product] : (updated[product] ? [updated[product]] : []);
                    const nieuw = huidig.includes(tag) ? huidig.filter(t => t !== tag) : [...huidig, tag];
                    if (nieuw.length === 0) delete updated[product];
                    else updated[product] = nieuw;
                    setProductTags(updated);
                    localStorage.setItem('schildersapp_product_tags', JSON.stringify(updated));
                }

                function getTags(product) {
                    const stored = productTags[product];
                    const def = PRODUCT_TAGS_DEFAULT[product];
                    if (stored !== undefined) return Array.isArray(stored) ? stored : [stored];
                    return def ? [def] : [];
                }

                const TAG_TYPES = [['verfSyn','verf syn','#F5850A'],['verfWat','verf wat','#f97316'],['beitsSyn','beits syn','#0d9488'],['beitsWat','beits wat','#0891b2'],['bibui','bi/bui','#7c3aed']];
                const PRODUCT_TAGS_DEFAULT = {
                    // Grondverf / primer
                    'Rubbol Primer':                  'verfSyn',
                    'Rubbol Primer Extra':             'verfSyn',
                    'Rubbol Primer Express':                'verfSyn',
                    'Rubbol BL Primer':               'verfWat',
                    'Rubbol BL Rezisto Primer':       'verfWat',
                    'Rubbol BL Uniprimer':            'verfWat',
                    'Rubbol BL Isoprimer':            'verfWat',
                    'Alpha Fixeer':                   'verfWat',
                    'Finura':                         'verfWat',
                    'Wapex Primer':                   'verfWat',
                    'Redox BL Multi Primer':          'verfWat',
                    'Redox AK Primer':                'verfSyn',
                    'Sudwest All Grund':              'verfSyn',
                    // Verf synthetisch — oplosmiddelgedragen dekkende verf
                    'Rubbol Finura High Gloss':       'verfSyn',
                    'Rubbol Finura Satin':            'verfSyn',
                    'Rubbol SB':                      'verfSyn',
                    'Rubbol Express High Gloss':      'verfSyn',
                    'Alphaxylan SF':                  'verfSyn',
                    'Redox PUR Finish High Gloss':    'verfSyn',
                    'Redox PUR Finish Satin':         'verfSyn',
                    // Verf watergedragen — watergedragen dekkende verf (buiten)
                    'Rubbol XD High Gloss':           'verfWat',
                    'Rubbol XD Semi Gloss':           'verfWat',
                    'Rubbol EPS':                     'verfWat',
                    'Rubbol EPS Thix':                'verfWat',
                    'Rubbol Satura':                  'verfWat',
                    'Rubbol WF 376':                  'verfWat',
                    'Rubbol WF 387':                  'verfWat',
                    // Verf watergedragen — BL binnenlak
                    'Rubbol BL Ventura Satin':        'verfWat',
                    'Rubbol BL Safira':               'verfWat',
                    'Rubbol BL Satura':               'verfWat',
                    'Rubbol BL Rezisto Mat':          'verfWat',
                    'Rubbol BL Rezisto Satin':        'verfWat',
                    'Rubbol BL Rezisto Semi-Gloss':   'verfWat',
                    'Rubbol BL Rezisto High Gloss':   'verfWat',
                    'Rubbol BL Rezisto Spray':        'verfWat',
                    'Rubbol BL Endurance High Gloss': 'verfWat',
                    // Verf watergedragen — muurverf / plafondverf
                    'Alpha Aqua SI':                  'verfWat',
                    'Alpha Humitex SF':               'verfWat',
                    'Alpha Isolux SF':                'verfWat',
                    'Alpha Metallic':                 'verfWat',
                    'Alpha Plafond Extreem Mat':      'verfWat',
                    'Alpha Prof Mat':                 'verfWat',
                    'Alpha Projecttex':               'verfWat',
                    'Alpha Recycle Mat':              'verfWat',
                    'Alpha Rezisto Anti Marks':       'verfWat',
                    'Alpha Rezisto Easy Clean':       'verfWat',
                    'Alpha Sanocryl':                 'verfWat',
                    'Alpha Topcoat':                  'verfWat',
                    'Alpha Topcoat Flex':             'verfWat',
                    'Alphacryl Easy Spray':           'verfWat',
                    'Alphacryl Pure Mat SF':          'verfWat',
                    'Alphatex 4SO Mat':               'verfWat',
                    'Alphatex IQ':                    'verfWat',
                    'Alphatex IQ Mat':                'verfWat',
                    'Alphatex Satin SF':              'verfWat',
                    'Alphatex SF':                    'verfWat',
                    'Alphacoat':                      'verfWat',
                    // Verf watergedragen — metaalverf
                    'Redox BL Forte':                 'verfWat',
                    'Redox BL Metal Protect Satin':   'verfWat',
                    // Verf watergedragen — vloerenverf
                    'Wapex 647 Semi-mat':             'verfWat',
                    'Wapex 650':                      'verfWat',
                    'Wapex 660':                      'verfWat',
                    'Wapex 660 Mat':                  'verfWat',
                    'Wapex PUR Clearcoat':            'verfWat',
                    // Beits synthetisch — oplosmiddelgedragen houtbeits / vernis
                    'Rubbol DSA Thix':                'beitsSyn',
                    'Cetol TGX Gloss':                'beitsSyn',
                    'Cetol TGL Satin Plus':           'beitsSyn',
                    'Cetol Novatech':                 'beitsSyn',
                    'Cetol HLS Plus':                 'beitsSyn',
                    // Beits watergedragen — watergedragen houtbeits / vernis
                    'Cetol BLX-Pro':                  'beitsWat',
                    'Cetol BL Decor':                 'beitsWat',
                    'Cetol BL Varnish Mat':           'beitsWat',
                    'Cetol BL Natural Mat':           'beitsWat',
                    'Cetol BL Endurance Primer':      'beitsWat',
                    // Bi/bui — geschikt voor binnen én buiten
                    'Alphacoat':                      'bibui',
                    'Alphaloxan':                     'bibui',
                    'Alphaloxan Flex':                'bibui',
                };
                const BEITS_CATS = ['OHT','OHV','NHT','NHV'];
                const isBeits = BEITS_CATS.includes(bestekCat);
                function tagWaarschuwing(product) {
                    const tags = getTags(product);
                    if (tags.some(t => t === 'beitsSyn' || t === 'beitsWat') && !isBeits) return `Beits-product in dekkende categorie (${bestekCat})`;
                    if (tags.some(t => t === 'verfSyn' || t === 'verfWat') && isBeits) return `Verfproduct in beits-categorie (${bestekCat})`;
                    return null;
                }

                const CAT_OMSCHRIJVING = {
                    OHD: 'Onderhoud · Hout · Dekkend',
                    OHT: 'Onderhoud · Hout · Transparante beits',
                    OHV: 'Onderhoud · Hout · Vernis',
                    OMS: 'Onderhoud · Metaal · Staal',
                    OMV: 'Onderhoud · Metaal · Verzinkt staal',
                    OMA: 'Onderhoud · Metaal · Aluminium / non-ferro',
                    OSD: 'Onderhoud · Steenachtig · Dekkend (gevels, wanden)',
                    OSV: 'Onderhoud · Steenachtig · Vloeren',
                    OKD: 'Onderhoud · Kunststof · Dekkend',
                    NHD: 'Nieuwbouw · Hout · Dekkend',
                    NHT: 'Nieuwbouw · Hout · Transparante beits',
                    NHV: 'Nieuwbouw · Hout · Vernis',
                    NMS: 'Nieuwbouw · Metaal · Staal',
                    NMV: 'Nieuwbouw · Metaal · Verzinkt staal',
                    NMA: 'Nieuwbouw · Metaal · Aluminium / non-ferro',
                    NSD: 'Nieuwbouw · Steenachtig · Dekkend (gevels, wanden)',
                    NSV: 'Nieuwbouw · Steenachtig · Vloeren',
                    NKD: 'Nieuwbouw · Kunststof · Dekkend',
                };

                return (
                    <div>
                        {/* Sub-tabs: categorie kiezer */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                            {catLijst.map(cat => {
                                const d = bestekMap[cat];
                                const heeftData = d && (d.buiten || d.binnen)
                                    ? [...Object.values(d.buiten || {}), ...Object.values(d.binnen || {})].some(l => Array.isArray(l) && l.length > 0)
                                    : false;
                                const geselecteerd = bestekCats.includes(cat);
                                const isPrimair = bestekCat === cat;
                                const lockedCount = ['buiten','binnen'].flatMap(s =>
                                    ['bijgronden','geheelGronden','voorlakken','aflakken'].map(l => `${cat}.${s}.${l}`)
                                ).filter(k => bestekLocks[k]).length;
                                const isCompleet = lockedCount === 8;
                                return (
                                    <button key={cat} onClick={() => { setBestekCats([cat]); setUitgevouweCode(null); setBestekZoek(''); }}
                                        title={CAT_OMSCHRIJVING[cat] || cat}
                                        style={{
                                            padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                            border: isPrimair ? '1.5px solid #F5850A' : isCompleet ? '1.5px solid #16a34a' : '1.5px solid #e2e8f0',
                                            background: isPrimair ? 'rgba(245,133,10,0.1)' : isCompleet ? '#f0fdf4' : '#f8fafc',
                                            color: isPrimair ? '#F5850A' : isCompleet ? '#16a34a' : '#64748b',
                                            position: 'relative',
                                        }}>
                                        {cat}
                                        {isCompleet
                                            ? <span style={{ marginLeft: '4px', fontSize: '0.58rem', fontWeight: 800 }}>✓</span>
                                            : lockedCount > 0
                                                ? <span style={{ marginLeft: '4px', fontSize: '0.58rem', color: '#d97706', fontWeight: 800 }}>{lockedCount}/8</span>
                                                : heeftData && <span style={{ marginLeft: '4px', fontSize: '0.6rem', color: '#F5850A' }}>●</span>
                                        }
                                    </button>
                                );
                            })}
                        </div>

                        {/* Situering tabs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            {[['buiten','Buitenschilderwerk','fa-sun','#0369a1'],['binnen','Binnenschilderwerk','fa-house','#7c3aed']].map(([s, label, icon, kleur]) => (
                                <button key={s} onClick={() => setActiefSit(s)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', border: `2px solid ${actiefSit === s ? kleur : '#e2e8f0'}`, background: actiefSit === s ? kleur : '#f8fafc', color: actiefSit === s ? '#fff' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <i className={`fa-solid ${icon}`} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Één situering tegelijk op volle breedte */}
                        <div>
                            {['buiten', 'binnen'].filter(s => s === actiefSit).map(sit => {
                                const sitKleur = sit === 'buiten' ? '#0369a1' : '#7c3aed';
                                const sitBg    = sit === 'buiten' ? '#f0f9ff' : '#faf5ff';
                                const sitBord  = sit === 'buiten' ? '#bae6fd' : '#e9d5ff';
                                const sitIcon  = sit === 'buiten' ? 'fa-sun' : 'fa-house';
                                const sitLabel = sit === 'buiten' ? 'Buitenschilderwerk' : 'Binnenschilderwerk';
                                const catVoorSit = getCatVoorSit(sit);
                                const groepCodes = codesInCat.filter(c => c.sit === sit);
                                const standaardOpen = true;

                                return (
                                    <div key={sit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                                        {/* ── Standaard-kaart (links, sticky) ── */}
                                        <div style={{ position: 'sticky', top: '80px' }}>
                                        <div style={{ border: `2px solid ${sitKleur}`, borderRadius: '14px', overflow: 'hidden', background: '#fff', boxShadow: `0 0 0 3px ${sitKleur}18` }}>
                                            {/* Uitgevouwen: laag-tabs + producten */}
                                            {standaardOpen && (
                                                <div>
                                                    {/* Laag-tabs + vergrendelknop */}
                                                    <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', alignItems: 'stretch' }}>
                                                        {LAGEN.map(laag => {
                                                            const isActief = actiefLaag === laag;
                                                            const locked = !!bestekLocks[`${bestekCat}.${sit}.${laag}`];
                                                            const n = (catVoorSit[laag] || []).length;
                                                            return (
                                                                <button key={laag} onClick={() => setActiefLaag(laag)}
                                                                    style={{ flex: 1, padding: '8px 4px', border: 'none', borderBottom: isActief ? `3px solid ${LAAG_KLEUR[laag]}` : '3px solid transparent', background: isActief ? '#fff' : '#f8fafc', color: isActief ? LAAG_KLEUR[laag] : '#94a3b8', fontSize: '0.68rem', fontWeight: isActief ? 800 : 500, cursor: 'pointer', lineHeight: 1.3 }}>
                                                                    {LAAG_LABEL[laag]}
                                                                    <span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 700, color: n > 0 ? LAAG_KLEUR[laag] : '#cbd5e1' }}>{n > 0 ? `${n} producten` : 'alles'}</span>
                                                                </button>
                                                            );
                                                        })}
                                                        {/* Opslaan knop */}
                                                        <button onClick={() => {
                                                                    localStorage.setItem('schildersapp_bestek_producten', JSON.stringify(bestekMap));
                                                                    localStorage.setItem('schildersapp_product_tags', JSON.stringify(productTags));
                                                                    localStorage.setItem('schildersapp_bestek_locks', JSON.stringify(bestekLocks));
                                                                    showToast?.('Bestek opgeslagen', 'success');
                                                                }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '6px 12px', border: 'none', borderBottom: '3px solid transparent', background: '#f0fdf4', cursor: 'pointer', flexShrink: 0 }}>
                                                            <i className="fa-solid fa-floppy-disk" style={{ fontSize: '0.8rem', color: '#16a34a' }} />
                                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>opslaan</span>
                                                        </button>
                                                    </div>
                                                    {/* Toolbar */}
                                                    <div style={{ display: 'flex', gap: '6px', padding: '8px 14px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.72rem', color: '#64748b', flex: 1 }}>
                                                            {(catVoorSit[actiefLaag] || []).length === 0 ? 'Geen beperking' : `${(catVoorSit[actiefLaag] || []).length} geselecteerd`}
                                                        </span>
                                                        {(() => {
                                                            const actiefLocked = !!bestekLocks[`${bestekCat}.${sit}.${actiefLaag}`];
                                                            return (
                                                                <button onClick={() => toggleLock(bestekCat, sit, actiefLaag)}
                                                                    title={actiefLocked ? 'Vergrendeld — klik om auto-leren in te schakelen' : 'Auto-leren — klik om te vergrendelen'}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', border: `1.5px solid ${actiefLocked ? '#d97706' : '#e2e8f0'}`, background: actiefLocked ? '#fef3c7' : '#fff', color: actiefLocked ? '#92400e' : '#94a3b8', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                                                                    <i className={`fa-solid ${actiefLocked ? 'fa-lock' : 'fa-lock-open'}`} style={{ fontSize: '0.75rem' }} />
                                                                    {actiefLocked ? 'vergrendeld' : 'auto-leren'}
                                                                </button>
                                                            );
                                                        })()}
                                                        {actiefLaag === 'geheelGronden' && (catVoorSit['bijgronden'] || []).length > 0 && (
                                                            <button onClick={() => slaOp(bestekCat, 'geheelGronden', [...(catVoorSit['bijgronden'] || [])], sit)}
                                                                title="Kopieer de bijgronden-selectie naar geheel gronden"
                                                                style={{ padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>↑ van bijgronden</button>
                                                        )}
                                                        <button onClick={() => slaOp(bestekCat, actiefLaag, [...ALLE_PRODUCTEN], sit)}
                                                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>✓ Alles</button>
                                                        <button onClick={() => slaOp(bestekCat, actiefLaag, [], sit)}
                                                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>✗ Wissen</button>
                                                    </div>
                                                    {/* Product lijst — gegroepeerd */}
                                                    <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                                                        {(() => {
                                                            const lijst = catVoorSit[actiefLaag] || [];
                                                            const renderRij = (product) => {
                                                                const aan = lijst.includes(product);
                                                                const tags = getTags(product);
                                                                const waarschuwing = tagWaarschuwing(product);
                                                                return (
                                                                    <div key={product} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: aan ? `${LAAG_KLEUR[actiefLaag]}08` : '#fff' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                                                            <input type="checkbox" checked={aan} onChange={() => toggleCat(sit, actiefLaag, product)}
                                                                                style={{ accentColor: LAAG_KLEUR[actiefLaag], width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} />
                                                                            <span style={{ fontSize: '0.78rem', color: aan ? '#1e293b' : '#475569', fontWeight: aan ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product}</span>
                                                                            {waarschuwing && <span title={waarschuwing} style={{ color: '#f59e0b', fontSize: '0.75rem', flexShrink: 0 }}>⚠</span>}
                                                                        </label>
                                                                        <div style={{ display: 'flex', gap: '3px', padding: '0 12px 0 0', flexShrink: 0 }}>
                                                                            {TAG_TYPES.map(([type, label, kleur]) => {
                                                                                const actief = tags.includes(type);
                                                                                return (
                                                                                    <button key={type} onClick={() => setTag(product, type)}
                                                                                        style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${actief ? kleur : '#e2e8f0'}`, background: actief ? kleur : '#f8fafc', color: actief ? '#fff' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                                                                        {label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            };
                                                            const aangevinkt = lijst.filter(p => !bestekZoek || p.toLowerCase().includes(bestekZoek.toLowerCase()));
                                                            const groepen = PRODUCT_GROEPEN.map(g => ({
                                                                ...g,
                                                                producten: g.producten.filter(p =>
                                                                    (!bestekZoek || p.toLowerCase().includes(bestekZoek.toLowerCase())) &&
                                                                    !lijst.includes(p)
                                                                )
                                                            })).filter(g => g.producten.length > 0);
                                                            const toggleGroep = (label) => setIngeklapteGroepen(prev => ({ ...prev, [label]: !prev[label] }));
                                                            return (<>
                                                                {aangevinkt.length > 0 && (<>
                                                                    <div onClick={() => toggleGroep('__geselecteerd')} style={{ padding: '6px 14px', fontSize: '0.7rem', fontWeight: 800, color: LAAG_KLEUR[actiefLaag], background: `${LAAG_KLEUR[actiefLaag]}12`, borderBottom: `2px solid ${LAAG_KLEUR[actiefLaag]}40`, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                                                                        <i className={`fa-solid fa-chevron-${ingeklapteGroepen['__geselecteerd'] ? 'right' : 'down'}`} style={{ fontSize: '0.55rem' }} />
                                                                        Geselecteerd
                                                                        <span style={{ marginLeft: 'auto', background: LAAG_KLEUR[actiefLaag], color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.6rem', fontWeight: 700 }}>{aangevinkt.length}</span>
                                                                    </div>
                                                                    {!ingeklapteGroepen['__geselecteerd'] && aangevinkt.map(renderRij)}
                                                                </>)}
                                                                {groepen.map(g => {
                                                                    const ingeklapt = !!ingeklapteGroepen[g.label];
                                                                    return (<div key={g.label}><div onClick={() => toggleGroep(g.label)} style={{ padding: '6px 14px', fontSize: '0.7rem', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                                                                            <i className={`fa-solid fa-chevron-${ingeklapt ? 'right' : 'down'}`} style={{ fontSize: '0.55rem', color: '#94a3b8' }} />
                                                                            {g.label}
                                                                            <span style={{ marginLeft: 'auto', background: '#e2e8f0', color: '#64748b', borderRadius: '10px', padding: '1px 7px', fontSize: '0.6rem', fontWeight: 700 }}>{g.producten.length}</span>
                                                                        </div>
                                                                        {!ingeklapt && g.producten.map(renderRij)}
                                                                    </div>);
                                                                })}
                                                            </>);
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        </div>{/* einde sticky wrapper */}

                                        {/* ── Code-lijst (rechts) ── */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {/* Categorie-label boven code-lijst */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '10px', border: `2px solid ${sitKleur}`, background: sitKleur, color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px', alignSelf: 'flex-start' }}>
                                            <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.03em' }}>{bestekCat}</span>
                                            <span style={{ fontWeight: 500, fontSize: '0.8rem', opacity: 0.85 }}>{CAT_OMSCHRIJVING[bestekCat]}</span>
                                        </div>
                                            {groepCodes.map(({ code, naam }) => {
                                                const codeRaw = bestekMap[code];
                                                const codeObj = (codeRaw && !Array.isArray(codeRaw)) ? codeRaw : null;
                                                const catVoorCode = getCatVoorSit(sit);
                                                const heeftAfwijking = codeObj !== null;
                                                const lagenMet = heeftAfwijking ? LAGEN.filter(l => (codeObj[l] || []).length > 0) : [];
                                                const isOpen = uitgevouweCode === code;

                                                return (
                                                    <div key={code} style={{ border: `1.5px solid ${heeftAfwijking ? '#f59e0b' : '#e2e8f0'}`, borderRadius: '10px', overflow: 'hidden', background: '#fff', boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.07)' : 'none' }}>
                                                        {/* Rij-header */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: heeftAfwijking ? '#fffbeb' : '#fff', cursor: 'pointer', userSelect: 'none' }}
                                                            onClick={() => setUitgevouweCode(isOpen ? null : code)}>
                                                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0369a1', flexShrink: 0, minWidth: '52px' }}>{code}</span>
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{naam}</span>
                                                            {heeftAfwijking
                                                                ? <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                                                    {lagenMet.map(l => (
                                                                        <span key={l} style={{ padding: '2px 7px', borderRadius: '8px', fontSize: '0.62rem', fontWeight: 700, background: `${LAAG_KLEUR[l]}18`, color: LAAG_KLEUR[l] }}>
                                                                            {LAAG_LABEL[l].split(' ')[0]}
                                                                        </span>
                                                                    ))}
                                                                  </div>
                                                                : <span style={{ fontSize: '0.65rem', color: '#cbd5e1', flexShrink: 0 }}>standaard</span>
                                                            }
                                                            <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.62rem', flexShrink: 0 }} />
                                                        </div>

                                                        {/* Uitgevouwen */}
                                                        {isOpen && (
                                                            <div style={{ borderTop: `1.5px solid ${heeftAfwijking ? '#fde68a' : '#f1f5f9'}` }}>
                                                                {/* Laag-tabs */}
                                                                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                                                                    {LAGEN.map(laag => {
                                                                        const isAfwijking = codeObj?.[laag] !== undefined;
                                                                        const n = isAfwijking ? (codeObj[laag] || []).length : (catVoorCode[laag] || []).length;
                                                                        return (
                                                                            <button key={laag} onClick={() => setActiefLaagCode(laag)}
                                                                                style={{ flex: 1, padding: '6px 2px', border: 'none', borderBottom: actiefLaagCode === laag ? `2.5px solid ${LAAG_KLEUR[laag]}` : '2.5px solid transparent', background: actiefLaagCode === laag ? '#fff' : '#f8fafc', color: actiefLaagCode === laag ? LAAG_KLEUR[laag] : '#94a3b8', fontSize: '0.63rem', fontWeight: actiefLaagCode === laag ? 800 : 500, cursor: 'pointer', lineHeight: 1.3 }}>
                                                                                {LAAG_LABEL[laag]}
                                                                                <span style={{ display: 'block', fontSize: '0.55rem', color: isAfwijking ? LAAG_KLEUR[laag] : '#cbd5e1', fontWeight: 700 }}>
                                                                                    {isAfwijking ? `eigen ${n}×` : n > 0 ? `std ${n}×` : 'alles'}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {/* Toolbar */}
                                                                <div style={{ padding: '6px 12px', display: 'flex', gap: '4px', alignItems: 'center', background: '#fafafa', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: '0.68rem', color: '#64748b', flex: 1, minWidth: '100px' }}>
                                                                        {codeObj?.[actiefLaagCode] !== undefined
                                                                            ? `Eigen — ${(codeObj[actiefLaagCode] || []).length} producten`
                                                                            : `Erft ${sit} standaard — ${(catVoorCode[actiefLaagCode] || []).length === 0 ? 'geen beperking' : `${(catVoorCode[actiefLaagCode] || []).length}×`}`}
                                                                    </span>
                                                                    {codeObj?.[actiefLaagCode] !== undefined && (
                                                                        <button onClick={() => {
                                                                            const updated = { ...bestekMap };
                                                                            if (updated[code]) {
                                                                                const { [actiefLaagCode]: _, ...rest } = updated[code];
                                                                                if (Object.keys(rest).length === 0) delete updated[code]; else updated[code] = rest;
                                                                            }
                                                                            setBestekMap(updated);
                                                                            localStorage.setItem('schildersapp_bestek_producten', JSON.stringify(updated));
                                                                        }} style={{ padding: '3px 7px', borderRadius: '5px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}>
                                                                            Laag reset
                                                                        </button>
                                                                    )}
                                                                    {heeftAfwijking && (
                                                                        <button onClick={() => verwijderAfwijking(code)}
                                                                            style={{ padding: '3px 7px', borderRadius: '5px', border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#dc2626', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}>
                                                                            Alles reset
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => slaOp(code, actiefLaagCode, [...ALLE_PRODUCTEN])}
                                                                        style={{ padding: '3px 7px', borderRadius: '5px', border: '1.5px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>✓</button>
                                                                    <button onClick={() => slaOp(code, actiefLaagCode, [])}
                                                                        style={{ padding: '3px 7px', borderRadius: '5px', border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#dc2626', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>✗</button>
                                                                </div>
                                                                {/* Product pills */}
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '8px 12px', maxHeight: '180px', overflowY: 'auto' }}>
                                                                    {[...ALLE_PRODUCTEN].sort((a, b) => {
                                                                        const eff = codeObj?.[actiefLaagCode] ?? catVoorCode[actiefLaagCode] ?? [];
                                                                        return (eff.includes(b) ? 1 : 0) - (eff.includes(a) ? 1 : 0);
                                                                    }).map(product => {
                                                                        const codeGedef = codeObj?.[actiefLaagCode] !== undefined;
                                                                        const effectief = codeObj?.[actiefLaagCode] ?? catVoorCode[actiefLaagCode] ?? [];
                                                                        const aan = effectief.includes(product);
                                                                        const vanCat = (catVoorCode[actiefLaagCode] || []).includes(product);
                                                                        const tags = getTags(product);
                                                                        const waarschuwing = tagWaarschuwing(product);
                                                                        return (
                                                                            <div key={product} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                                <label style={{
                                                                                    display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
                                                                                    borderRadius: '20px', cursor: 'pointer', fontSize: '0.75rem',
                                                                                    border: `1.5px solid ${aan ? LAAG_KLEUR[actiefLaagCode] : '#e2e8f0'}`,
                                                                                    background: aan ? `${LAAG_KLEUR[actiefLaagCode]}12` : '#f8fafc',
                                                                                    color: aan ? LAAG_KLEUR[actiefLaagCode] : '#94a3b8',
                                                                                    fontWeight: aan ? 700 : 400,
                                                                                    opacity: !codeGedef && !vanCat ? 0.35 : 1,
                                                                                }}>
                                                                                    <input type="checkbox" checked={aan} onChange={() => toggleCode(code, actiefLaagCode, product, sit)}
                                                                                        style={{ accentColor: LAAG_KLEUR[actiefLaagCode], width: '12px', height: '12px', cursor: 'pointer' }} />
                                                                                    {product}
                                                                                    {waarschuwing && <span title={waarschuwing} style={{ color: '#f59e0b' }}>⚠</span>}
                                                                                </label>
                                                                                {/* Type-knoppen naast pill */}
                                                                                <div style={{ display: 'flex', gap: '1px' }}>
                                                                                    {TAG_TYPES.map(([type, label, kleur]) => {
                                                                                        const actief = tags.includes(type);
                                                                                        return (
                                                                                            <button key={type} onClick={e => { e.preventDefault(); setTag(product, type); }}
                                                                                                style={{ padding: '1px 4px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer', border: `1px solid ${actief ? kleur : '#e2e8f0'}`, background: actief ? kleur : '#f8fafc', color: actief ? '#fff' : '#cbd5e1' }}>
                                                                                                {label}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#ef4444' : '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 9999, whiteSpace: 'nowrap' }}>
                    <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: '8px' }} />
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
