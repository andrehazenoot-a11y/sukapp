'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/components/AuthContext';

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
    const tdsRef                              = useRef(null);
    const [tdsUploading, setTdsUploading]     = useState(null);
    const [importing, setImporting]           = useState(false);
    const [importResult, setImportResult]     = useState(null);

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
                        {[['zoeken','fa-magnifying-glass','Zoeken'], ...(isBeheerder ? [['informatiebladen','fa-file-pdf','Informatiebladen'],['instellingen','fa-sliders','Instellingen']] : [])].map(([t,ic,l]) => (
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
                                            type="number" min="0" step="1"
                                            value={groepOpslag}
                                            placeholder="0"
                                            onChange={e => setGroepOpslag(e.target.value)}
                                            style={{ width: '70px', padding: '6px 22px 6px 8px', border: '1.5px solid #6366f1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right', color: '#1e293b', fontWeight: 700 }}
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
                                        const updated = { ...verkoopprijzen };
                                        rows.forEach((row, gi) => {
                                            const rk = row[cols.code] || row[cols.naam] || String(gi);
                                            const { incl } = getPrijs(row);
                                            const opslag = parseFloat(opslagen[rk]) || 0;
                                            const berekend = opslag > 0 ? incl * (1 + opslag / 100) : incl;
                                            const huidig = verkoopprijzen[rk] ? parseFloat(verkoopprijzen[rk]) : berekend;
                                            updated[rk] = String(Math.ceil(huidig));
                                        });
                                        setVerkoopprijzen(updated);
                                        localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(updated));
                                    }}
                                        title="Rond alle verkoopprijzen op naar hele euro's"
                                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #10b981', background: '#f0fdf4', color: '#10b981', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                                                                        type="number" min="0" step="1"
                                                                        value={opslagen[rk] ?? ''}
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
                                                                        style={{ width: '70px', padding: '5px 20px 5px 6px', border: `1.5px solid ${opslagen[rk] ? '#6366f1' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', textAlign: 'right', color: '#1e293b', background: opslagen[rk] ? '#eef2ff' : '#f8fafc', fontWeight: 700 }}
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
                                                                        value={verkoopprijzen[rk] ?? (berekend ? berekend.toFixed(2) : '')}
                                                                        placeholder="—"
                                                                        onChange={e => {
                                                                            const updated = { ...verkoopprijzen, [rk]: e.target.value };
                                                                            setVerkoopprijzen(updated);
                                                                            localStorage.setItem('schildersapp_materiaal_verkoop', JSON.stringify(updated));
                                                                            // Herbereken opslag% op basis van nieuwe verkoopprijs
                                                                            const vp = parseFloat(e.target.value);
                                                                            if (vp > 0 && incl > 0) {
                                                                                const nieuwOpslag = Math.round((vp / incl - 1) * 100);
                                                                                const oUpdated = { ...opslagen, [rk]: String(nieuwOpslag) };
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
                                const verkPrijs = verkoopprijzen[rk] ? parseFloat(verkoopprijzen[rk]) : berekend;
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
