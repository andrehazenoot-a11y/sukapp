'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

const MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const BTW = 0.21;

function zoekVerkoopprijs(naam) {
    try {
        const rows      = JSON.parse(localStorage.getItem('schildersapp_materiaal_data') || '[]');
        const cols      = JSON.parse(localStorage.getItem('schildersapp_materiaal_cols') || '{}');
        const vkPrijzen = JSON.parse(localStorage.getItem('schildersapp_materiaal_verkoop') || '{}');
        const opslagen  = JSON.parse(localStorage.getItem('schildersapp_materiaal_opslagen') || '{}');
        const afronden  = JSON.parse(localStorage.getItem('schildersapp_materiaal_afronden') || 'false');
        if (!rows.length || !cols.naam) return null;

        const q = String(naam ?? '').toLowerCase().trim();
        let matchRow = null, matchIdx = -1;
        for (let i = 0; i < rows.length; i++) {
            if (String(rows[i][cols.naam] ?? '').toLowerCase().trim() === q) {
                matchRow = rows[i]; matchIdx = i; break;
            }
        }
        if (!matchRow) return null;

        const rk = matchRow[cols.code] || matchRow[cols.naam] || String(matchIdx);

        // 1. Handmatige verkoopprijs-override
        if (vkPrijzen[rk] != null && vkPrijzen[rk] !== '') return parseFloat(vkPrijzen[rk]) || null;

        // 2. Verkoopprijs kolom in de XLSX
        if (cols.verkoopprijs) {
            const vk = parseFloat(String(matchRow[cols.verkoopprijs] ?? '').replace(',', '.')) || null;
            if (vk) return vk;
        }

        // 3. Inkoopprijs + BTW + rij-opslag (geen userId nodig)
        const raw = parseFloat(String(matchRow[cols.prijs] ?? '').replace(',', '.')) || 0;
        if (!raw) return null;
        const inclBtw  = raw * (1 + BTW);
        const rijOpslag = parseFloat(opslagen[rk]) || 0;
        const berekend  = rijOpslag > 0 ? inclBtw * (1 + rijOpslag / 100) : inclBtw;
        return afronden ? Math.ceil(berekend) : Math.round(berekend * 100) / 100;
    } catch { return null; }
}

export default function WerkbonnenBeheer() {
    const { user } = useAuth();
    const router = useRouter();
    const [werkbonnen, setWerkbonnen] = useState([]);
    const [projecten, setProjecten] = useState([]);
    const [loading, setLoading] = useState(true);
    const [koppelId, setKoppelId] = useState(null);
    const [koppelZoek, setKoppelZoek] = useState('');
    const [koppelProject, setKoppelProject] = useState(null);
    const [openBon, setOpenBon] = useState(null);
    const [bonMateriaal, setBonMateriaal] = useState({});
    const [bonUrenPerDag, setBonUrenPerDag] = useState({});
    const [editNaamId, setEditNaamId] = useState(null);
    const [editNaamWaarde, setEditNaamWaarde] = useState('');
    const [editUurloon, setEditUurloon] = useState({});
    const [matPrijsInput, setMatPrijsInput] = useState({});
    const [medUurlonen, setMedUurlonen] = useState(() => {
        try {
            const handmatig = JSON.parse(localStorage.getItem('schildersapp_uurloon_medewerker') || '{}');
            const teamLeden = JSON.parse(localStorage.getItem('wa_medewerkers') || '[]');
            const merged = { ...handmatig };
            // Index op ID én op naam voor flexibele koppeling
            for (const lid of teamLeden) {
                const vk = parseFloat(lid.verkoopUurloon) || null;
                if (!vk) continue;
                if (lid.id && !merged[lid.id]) merged[lid.id] = vk;
                if (lid.naam && !merged[lid.naam]) merged[lid.naam] = vk;
            }
            return merged;
        } catch { return {}; }
    });

    // Ververs medewerker-uurtarieven vanuit API
    useEffect(() => {
        fetch('/api/medewerkers')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!Array.isArray(data)) return;
                localStorage.setItem('wa_medewerkers', JSON.stringify(data));
                setMedUurlonen(prev => {
                    const updated = { ...prev };
                    for (const lid of data) {
                        const vk = parseFloat(lid.verkoopUurloon) || null;
                        if (!vk) continue;
                        if (lid.id && !updated[lid.id]) updated[lid.id] = vk;
                        if (lid.naam && !updated[lid.naam]) updated[lid.naam] = vk;
                    }
                    return updated;
                });
            })
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        Promise.all([
            fetch('/api/werkbonnen').then(r => r.json()),
            fetch('/api/projecten').then(r => r.json()),
        ]).then(([wb, pr]) => {
            if (Array.isArray(pr)) setProjecten(pr);
            if (!Array.isArray(wb)) return;

            // Lees uren + materialen direct uit localStorage (zelfde browser)
            try {
                const urenRaw = localStorage.getItem('schildersapp_uren_registraties');
                const urenAll = urenRaw ? JSON.parse(urenRaw) : [];
                const dagRaw = localStorage.getItem('schildersapp_dag_materialen');
                const dagAll = dagRaw ? JSON.parse(dagRaw) : [];

                const matPerBon = {};
                const urenPerBon = {};

                for (const bon of wb) {
                    // Vind ALLE werkbon-koppelingen voor deze bon (meerdere dagen mogelijk)
                    const wbEntries = urenAll.filter(e =>
                        e.type === 'werkbon' &&
                        (String(e.werkbonId) === String(bon.id) || e.werkbonNaam === bon.naam)
                    );
                    const taskIds = new Set(wbEntries.map(e => String(e.taskId)));

                    // Materialen: alle dagen waarop deze werkbon is gebruikt
                    const mat = dagAll.filter(e => taskIds.has(String(e.taskId)));
                    if (mat.length > 0) matPerBon[bon.id] = mat;

                    // Uren: som over alle gekoppelde dagen (altijd berekenen, ook als DB al een waarde heeft)
                    const urenEntries = urenAll.filter(e =>
                        taskIds.has(String(e.taskId)) &&
                        e.type !== 'werkbon' && e.type !== 'ziek' && e.type !== 'andere'
                    );
                    const totaal = Math.round(urenEntries.reduce((s, e) => s + (e.hours || 0), 0) * 10) / 10;
                    if (totaal > 0) urenPerBon[bon.id] = totaal;
                    // Per-dag uren groeperen (inclusief medewerkersnamen)
                    const perDag = {};
                    for (const e of urenEntries) {
                        const d = String(e.date).slice(0, 10);
                        if (!perDag[d]) perDag[d] = { uren: 0, namen: new Set() };
                        perDag[d].uren += (e.hours || 0);
                        if (e.userName) perDag[d].namen.add(e.userName);
                    }
                    if (Object.keys(perDag).length > 0) {
                        urenPerBon[`${bon.id}_perDag`] = Object.entries(perDag)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([date, { uren, namen }]) => ({
                                date,
                                uren: Math.round(uren * 10) / 10,
                                namen: [...namen],
                            }));
                    }
                }

                // Materialen in state zetten
                if (Object.keys(matPerBon).length > 0) setBonMateriaal(prev => ({ ...prev, ...matPerBon }));
                // Per-dag uren in state
                const perDagMap = {};
                for (const [k, v] of Object.entries(urenPerBon)) {
                    if (k.endsWith('_perDag')) perDagMap[k.replace('_perDag', '')] = v;
                }
                if (Object.keys(perDagMap).length > 0) setBonUrenPerDag(prev => ({ ...prev, ...perDagMap }));

                // Uren bijwerken in weergave (en naar DB sturen)
                const bijgewerkt = wb.map(bon => {
                    if (urenPerBon[bon.id]) {
                        fetch(`/api/werkbonnen/${bon.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uren: urenPerBon[bon.id] }),
                        }).catch(() => {});
                        return { ...bon, uren: urenPerBon[bon.id] };
                    }
                    return bon;
                });
                setWerkbonnen(bijgewerkt);
            } catch {
                setWerkbonnen(wb);
            }
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    function toggleKoppel(id) {
        setKoppelId(prev => prev === id ? null : id);
        setKoppelZoek('');
        setKoppelProject(null);
    }

    function selectBon(id) {
        if (openBon === id) return;
        setOpenBon(id);
        setKoppelId(null);
        fetch(`/api/werkbonnen/${id}/materialen`)
            .then(r => r.json())
            .then(async data => {
                if (!data.ok) return;
                const dbItems = data.materialen || [];
                const dbNamen = new Set(dbItems.map(m => m.naam));
                const lokaal  = (bonMateriaal[id] || []).filter(m => !dbNamen.has(m.naam));
                const alles   = [...dbItems, ...lokaal];

                // Vul ontbrekende prijzen op vanuit de materiaalzoeker (localStorage)
                const gevuld = await Promise.all(alles.map(async m => {
                    if (m.prijs != null && m.prijs > 0) return m;
                    const gevondenPrijs = zoekVerkoopprijs(m.naam);
                    if (gevondenPrijs == null) return m;
                    // Sla automatisch op in DB
                    fetch(`/api/werkbonnen/${id}/materialen`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ matId: m.id, prijs: gevondenPrijs }),
                    }).catch(() => {});
                    return { ...m, prijs: gevondenPrijs };
                }));

                const inputUpdates = {};
                for (const m of gevuld) {
                    if (m.id && m.prijs != null && m.prijs > 0) {
                        inputUpdates[m.id] = m.prijs;
                    }
                }
                if (Object.keys(inputUpdates).length > 0) {
                    setMatPrijsInput(prev => ({ ...prev, ...inputUpdates }));
                }
                setBonMateriaal(prev => ({ ...prev, [id]: gevuld }));
            })
            .catch(() => {});
    }

    async function slaUurloonOp(bonId) {
        const uurloon = parseFloat(editUurloon[bonId]) || null;
        setEditUurloon(prev => { const n = { ...prev }; delete n[bonId]; return n; });
        await fetch(`/api/werkbonnen/${bonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uurloon }),
        }).catch(() => {});
        setWerkbonnen(prev => prev.map(b => b.id === bonId ? { ...b, uurloon } : b));
    }

    async function slaMatPrijsOp(bonId, matId, prijs) {
        const p = parseFloat(prijs) || null;
        setMatPrijsInput(prev => ({ ...prev, [matId]: p != null ? p : '' }));
        await fetch(`/api/werkbonnen/${bonId}/materialen`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matId, prijs: p }),
        }).catch(() => {});
        setBonMateriaal(prev => ({
            ...prev,
            [bonId]: (prev[bonId] || []).map(m => m.id === matId ? { ...m, prijs: p } : m),
        }));
    }

    async function slaWerkbonNaamOp(id) {
        const naam = editNaamWaarde.trim();
        setEditNaamId(null);
        if (!naam) return;
        await fetch(`/api/werkbonnen/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ naam }),
        }).catch(() => {});
        setWerkbonnen(prev => prev.map(b => b.id === id ? { ...b, naam } : b));
    }

    async function koppelAanProject(werkbonId, project, taak) {
        await fetch(`/api/werkbonnen/${werkbonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: String(project.id),
                projectNaam: project.name,
                opdrachtgever: project.client || null,
                werkadres: project.address || null,
                telefoon: project.phone || null,
                projectActief: project.status === 'active',
                taskId: taak?.id || null,
                taskNaam: taak?.name || null,
            }),
        }).catch(() => {});
        setWerkbonnen(prev => prev.map(w => w.id === werkbonId
            ? { ...w, projectId: String(project.id), projectNaam: project.name, opdrachtgever: project.client || null, taskId: taak?.id || null, taskNaam: taak?.name || null }
            : w
        ));
        setKoppelId(null);
        setKoppelProject(null);
        router.push(`/projecten/${project.id}?tab=bewaking`);
    }

    const totaalUren = Math.round(werkbonnen.reduce((s, w) => s + (parseFloat(w.uren) || 0), 0) * 10) / 10;
    const aantalGekoppeld = werkbonnen.filter(w => w.projectNaam).length;
    const gefilterd = projecten.filter(p =>
        !koppelZoek ||
        p.name?.toLowerCase().includes(koppelZoek.toLowerCase()) ||
        p.client?.toLowerCase().includes(koppelZoek.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#f8fafc' }}>

            {/* ─── LINKER PANEL: lijst ─── */}
            <div style={{ width: '380px', flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* List header */}
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <Link href="/" style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.65rem' }} /> Dashboard
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                            <i className="fa-solid fa-file-pen" style={{ color: '#F5850A', marginRight: '7px' }} />Werkbonnen
                        </h1>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', borderRadius: '20px', padding: '2px 8px' }}>{werkbonnen.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <div style={{ flex: 1, background: '#f0f9ff', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0891b2' }}>{totaalUren}u</div>
                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Uren</div>
                        </div>
                        <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>{aantalGekoppeld}/{werkbonnen.length}</div>
                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Gekoppeld</div>
                        </div>
                    </div>
                </div>

                {/* Scrollbare lijst */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <i className="fa-solid fa-spinner fa-spin" />
                        </div>
                    ) : werkbonnen.length === 0 ? (
                        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Geen werkbonnen</div>
                    ) : werkbonnen.map(bon => (
                        <div key={bon.id} onClick={() => selectBon(bon.id)}
                            style={{ padding: '11px 16px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: openBon === bon.id ? '#fff8f0' : '#fff', borderLeft: `3px solid ${openBon === bon.id ? '#F5850A' : 'transparent'}` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ minWidth: '34px', textAlign: 'center', background: bon.uren ? '#f0f9ff' : '#f8fafc', borderRadius: '7px', padding: '4px 2px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: bon.uren ? '#0891b2' : '#cbd5e1', lineHeight: 1 }}>{bon.uren || '—'}</div>
                                    {bon.uren && <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>uur</div>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.83rem', color: bon.naam ? (openBon === bon.id ? '#ea580c' : '#1e293b') : '#cbd5e1', fontStyle: bon.naam ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {bon.naam || 'Nader in te vullen…'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {bon.medewerkerNaam} · {formatDate(bon.datum)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── RECHTER PANEL: detail ─── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                {!openBon || !werkbonnen.find(b => b.id === openBon) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '10px', minHeight: '300px' }}>
                        <i className="fa-solid fa-file-pen" style={{ fontSize: '3rem', opacity: 0.2 }} />
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#64748b' }}>Selecteer een werkbon</div>
                        <div style={{ fontSize: '0.82rem' }}>Klik op een werkbon in de lijst links</div>
                    </div>
                ) : (() => {
                    const bon = werkbonnen.find(b => b.id === openBon);
                    const totaalUren = bon.uren || (bonUrenPerDag[bon.id] ? Math.round(bonUrenPerDag[bon.id].reduce((s, d) => s + d.uren, 0) * 10) / 10 : 0);
                    const uurloonWaarde = bon.uurloon ?? medUurlonen[bon.medewerkerId] ?? medUurlonen[bon.medewerkerNaam] ?? null;
                    const arbeidskosten = (uurloonWaarde && totaalUren) ? Math.round(uurloonWaarde * totaalUren * 100) / 100 : null;
                    const materialen = bonMateriaal[bon.id] || [];
                    const matKosten = materialen.reduce((s, m) => { const qty = parseFloat(m.hoeveelheid) || 1; return s + (m.prijs ? m.prijs * qty : 0); }, 0);
                    const matKostenRound = Math.round(matKosten * 100) / 100;
                    const totaalKosten = (arbeidskosten !== null || matKosten > 0) ? Math.round(((arbeidskosten || 0) + matKostenRound) * 100) / 100 : null;
                    return (
                        <div>
                            {/* Detail header */}
                            <div style={{ marginBottom: '20px' }}>
                                {editNaamId === bon.id ? (
                                    <input autoFocus value={editNaamWaarde} onChange={e => setEditNaamWaarde(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') slaWerkbonNaamOp(bon.id); if (e.key === 'Escape') setEditNaamId(null); }}
                                        onBlur={() => slaWerkbonNaamOp(bon.id)}
                                        style={{ fontWeight: 800, fontSize: '1.4rem', border: 'none', borderBottom: '2px solid #F5850A', outline: 'none', background: 'transparent', width: '100%', color: '#1e293b', padding: '0', marginBottom: '6px' }} />
                                ) : (
                                    <h2 onClick={() => { setEditNaamId(bon.id); setEditNaamWaarde(bon.naam || ''); }}
                                        style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, color: bon.naam ? '#1e293b' : '#cbd5e1', fontStyle: bon.naam ? 'normal' : 'italic', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        {bon.naam || 'Nader in te vullen…'}
                                        <i className="fa-solid fa-pen" style={{ fontSize: '0.75rem', color: '#F5850A', opacity: 0.5 }} />
                                    </h2>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>{bon.medewerkerNaam}</span>
                                    <span style={{ color: '#e2e8f0' }}>·</span>
                                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{formatDate(bon.datum)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                    {bon.projectId ? (
                                        <Link href={`/projecten/${bon.projectId}?tab=bewaking`}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '9px', fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textDecoration: 'none' }}>
                                            <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                                            Bekijk in bewaking
                                        </Link>
                                    ) : null}
                                    <button onClick={() => toggleKoppel(bon.id)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: koppelId === bon.id ? '#f1f5f9' : '#fff8f0', border: `1.5px solid ${koppelId === bon.id ? '#e2e8f0' : '#F5850A'}`, borderRadius: '9px', fontSize: '0.78rem', fontWeight: 700, color: koppelId === bon.id ? '#64748b' : '#F5850A', cursor: 'pointer' }}>
                                        <i className={`fa-solid ${koppelId === bon.id ? 'fa-xmark' : 'fa-folder-open'}`} style={{ fontSize: '0.7rem' }} />
                                        {koppelId === bon.id ? 'Annuleren' : bon.projectId ? 'Project/taak wijzigen' : 'Koppel aan taak'}
                                    </button>
                                </div>
                            </div>


                            {/* Koppel panel — stap 1: project kiezen */}
                            {koppelId === bon.id && !koppelProject && (
                                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>Stap 1 — Kies project</div>
                                    <input value={koppelZoek} onChange={e => setKoppelZoek(e.target.value)} placeholder="Zoek project of opdrachtgever..." autoFocus
                                        style={{ width: '100%', maxWidth: '400px', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {gefilterd.slice(0, 16).map(p => (
                                            <button key={p.id} onClick={() => { setKoppelProject(p); setKoppelZoek(''); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer', textAlign: 'left' }}>
                                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: p.color || '#F5850A', flexShrink: 0, display: 'inline-block' }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                    {p.client && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.client}</div>}
                                                </div>
                                            </button>
                                        ))}
                                        {gefilterd.length === 0 && <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>Geen projecten gevonden</div>}
                                    </div>
                                </div>
                            )}

                            {/* Koppel panel — stap 2: taak kiezen */}
                            {koppelId === bon.id && koppelProject && (
                                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <button onClick={() => setKoppelProject(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0', fontSize: '0.8rem' }}>
                                            <i className="fa-solid fa-chevron-left" /> Terug
                                        </button>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stap 2 — Kies taak in <strong style={{ color: '#1e293b' }}>{koppelProject.name}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                                        {(koppelProject.tasks || []).map(t => (
                                            <button key={t.id} onClick={() => koppelAanProject(bon.id, koppelProject, t)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer', textAlign: 'left' }}>
                                                <i className={`fa-solid ${t.completed ? 'fa-circle-check' : 'fa-circle'}`} style={{ color: t.completed ? '#10b981' : '#cbd5e1', fontSize: '0.85rem', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                                    {(t.startDate || t.endDate) && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.startDate} → {t.endDate}</div>}
                                                </div>
                                            </button>
                                        ))}
                                        {(!koppelProject.tasks || koppelProject.tasks.length === 0) && (
                                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>Geen taken in dit project</div>
                                        )}
                                        <button onClick={() => koppelAanProject(bon.id, koppelProject, null)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#fff', border: '1.5px dashed #e2e8f0', borderRadius: '9px', cursor: 'pointer', textAlign: 'left', color: '#94a3b8', fontSize: '0.78rem' }}>
                                            <i className="fa-solid fa-folder" />
                                            Koppel alleen aan project (geen specifieke taak)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Inhoud: uren + materialen links, kostenoverzicht rechts */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 500px', gap: '20px', alignItems: 'start' }}>

                                {/* Links: uren + materialen */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                    {/* Gewerkte uren */}
                                    {bonUrenPerDag[bon.id] && bonUrenPerDag[bon.id].length > 0 && (
                                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ padding: '9px 14px', background: '#f0f9ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                <i className="fa-solid fa-clock" style={{ color: '#0891b2', fontSize: '0.78rem' }} />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gewerkte uren</span>
                                            </div>
                                            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {bonUrenPerDag[bon.id].map(({ date, uren, namen }) => {
                                                    const dagTotaal = uurloonWaarde ? Math.round(uren * uurloonWaarde * 100) / 100 : null;
                                                    return (
                                                        <div key={date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '7px', padding: '5px 12px', fontSize: '0.8rem', gap: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                                                                <span style={{ color: '#1e40af', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDate(date)}</span>
                                                                {namen && namen.length > 0 && <span style={{ color: '#3b82f6', fontWeight: 500 }}>· {namen.join(', ')}</span>}
                                                                <span style={{ color: '#94a3b8', fontSize: '0.71rem' }}>
                                                                    {uurloonWaarde ? `· €${uurloonWaarde.toFixed(2)}/u` : <span style={{ fontStyle: 'italic' }}>· geen uurloon</span>}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                                                <span style={{ color: '#1d4ed8', fontWeight: 800 }}>{uren}u</span>
                                                                <span style={{ color: dagTotaal !== null ? '#1e40af' : '#cbd5e1', fontWeight: 700, minWidth: '64px', textAlign: 'right', fontSize: '0.8rem' }}>
                                                                    {dagTotaal !== null ? `€ ${dagTotaal.toFixed(2)}` : '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px', background: '#0891b2', borderRadius: '7px', fontSize: '0.78rem', marginTop: '2px' }}>
                                                    <span style={{ color: '#fff', fontWeight: 700 }}>Totaal gewerkt</span>
                                                    <span style={{ color: '#fff', fontWeight: 900 }}>{totaalUren}u</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Materialen */}
                                    {!bonMateriaal[bon.id] ? (
                                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />Materialen laden…
                                        </div>
                                    ) : materialen.length > 0 ? (
                                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ padding: '9px 14px', background: '#fff8f0', borderBottom: '1px solid #fde8cc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <i className="fa-solid fa-box" style={{ color: '#F5850A', fontSize: '0.78rem' }} />
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gebruikte materialen</span>
                                                </div>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', background: '#fde8cc', borderRadius: '20px', padding: '2px 8px' }}>{materialen.length} items</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', padding: '5px 14px', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #f1f5f9' }}>
                                                <span>Materiaal</span>
                                                <span style={{ textAlign: 'right' }}>Aantal</span>
                                                <span style={{ textAlign: 'right' }}>€/stuk</span>
                                            </div>
                                            {materialen.map((m, mi) => (
                                                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', alignItems: 'center', padding: '7px 14px', borderBottom: mi < materialen.length - 1 ? '1px solid #fef3c7' : 'none', background: mi % 2 === 0 ? '#fff' : '#fffbf5' }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{m.naam}</div>
                                                        <div style={{ fontSize: '0.67rem', color: '#b45309', opacity: 0.75, marginTop: '1px' }}>
                                                            {formatDate(m.aangemaakt_op || m.date)} · {m.medewerker_naam || m.userName || bon.medewerkerNaam || ''}
                                                        </div>
                                                    </div>
                                                    <span style={{ textAlign: 'right', color: '#b45309', fontSize: '0.78rem', fontWeight: 500 }}>{m.hoeveelheid}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', background: '#fff8f0', border: '1.5px solid #fde8cc', borderRadius: '7px', padding: '4px 10px', marginLeft: '8px' }}>
                                                        <span style={{ color: '#b45309', fontSize: '0.7rem', fontWeight: 600 }}>€</span>
                                                        <input key={m.id} type="number" step="0.01" min="0" placeholder="0.00"
                                                            value={matPrijsInput[m.id] !== undefined ? matPrijsInput[m.id] : (m.prijs != null ? m.prijs : '')}
                                                            onChange={e => setMatPrijsInput(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                                            onBlur={e => { if (e.target.value !== '' && parseFloat(e.target.value) > 0) slaMatPrijsOp(bon.id, m.id, e.target.value); }}
                                                            style={{ width: '52px', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', color: '#92400e', fontWeight: 700, textAlign: 'right', padding: '0' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                                            <i className="fa-solid fa-box-open" style={{ fontSize: '1.5rem', opacity: 0.25, display: 'block', marginBottom: '8px' }} />
                                            Geen materialen geregistreerd
                                        </div>
                                    )}
                                </div>

                                {/* Rechts: kostenoverzicht */}
                                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', position: 'sticky', top: '0' }}>
                                    <div style={{ background: '#7c3aed', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-calculator" style={{ color: '#fff', fontSize: '0.8rem' }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kostenoverzicht</span>
                                    </div>
                                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Medewerker + uurloon */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-user-tie" style={{ color: '#7c3aed', fontSize: '0.75rem' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{bon.medewerkerNaam || 'Medewerker'}</div>
                                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{totaalUren}u gewerkt</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#fff', border: '1.5px solid #ddd6fe', borderRadius: '8px', padding: '5px 9px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700 }}>€</span>
                                                <input type="number" step="0.01" min="0" placeholder="0.00"
                                                    defaultValue={uurloonWaarde != null ? uurloonWaarde : ''}
                                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                                    onBlur={e => {
                                                        const val = parseFloat(e.target.value) || null;
                                                        fetch(`/api/werkbonnen/${bon.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uurloon: val }) }).catch(() => {});
                                                        setWerkbonnen(prev => prev.map(b => b.id === bon.id ? { ...b, uurloon: val } : b));
                                                        if (bon.medewerkerId && val) {
                                                            const updated = { ...medUurlonen, [bon.medewerkerId]: val };
                                                            setMedUurlonen(updated);
                                                            try { localStorage.setItem('schildersapp_uurloon_medewerker', JSON.stringify(updated)); } catch {}
                                                        }
                                                    }}
                                                    style={{ width: '48px', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: '#1e293b', fontWeight: 700, textAlign: 'right', padding: '0' }} />
                                                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>/u</span>
                                            </div>
                                        </div>
                                        {/* Arbeidskosten */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.81rem', padding: '0 2px' }}>
                                            <span style={{ color: '#64748b' }}>Arbeid <span style={{ color: '#94a3b8', fontSize: '0.71rem' }}>({totaalUren}u × €{uurloonWaarde ? uurloonWaarde.toFixed(2) : '?'}/u)</span></span>
                                            <span style={{ fontWeight: 700, color: arbeidskosten !== null ? '#1e293b' : '#94a3b8' }}>{arbeidskosten !== null ? `€ ${arbeidskosten.toFixed(2)}` : '—'}</span>
                                        </div>
                                        {/* Materiaalkosten */}
                                        {materialen.length > 0 && (
                                            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                {materialen.map(m => {
                                                    const qty = parseFloat(m.hoeveelheid) || 1;
                                                    const regel = m.prijs != null ? Math.round(m.prijs * qty * 100) / 100 : null;
                                                    return (
                                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', gap: '8px' }}>
                                                            <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                {m.naam}<span style={{ color: '#94a3b8', fontSize: '0.7rem' }}> ×{qty}</span>
                                                            </span>
                                                            <span style={{ fontWeight: 700, color: regel !== null ? '#1e293b' : '#94a3b8', flexShrink: 0 }}>{regel !== null ? `€ ${regel.toFixed(2)}` : '—'}</span>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.81rem', padding: '6px 0 0', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>
                                                    <span style={{ color: '#64748b', fontWeight: 600 }}>Materialen</span>
                                                    <span style={{ fontWeight: 700, color: matKostenRound > 0 ? '#1e293b' : '#94a3b8' }}>{matKostenRound > 0 ? `€ ${matKostenRound.toFixed(2)}` : '—'}</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* Totaal */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: totaalKosten !== null ? '#7c3aed' : '#f1f5f9', borderRadius: '10px', marginTop: '2px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: totaalKosten !== null ? '#fff' : '#94a3b8' }}>Totaal</span>
                                            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: totaalKosten !== null ? '#fff' : '#94a3b8' }}>
                                                {totaalKosten !== null ? `€ ${totaalKosten.toFixed(2)}` : 'Vul uurloon in →'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
