'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

// ── Datum helpers ──
const DAY_NAMES_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getMondayOfWeek(week, year) {
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const mon = new Date(jan4);
    mon.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
    return mon;
}

function getDaysForWeek(week, year) {
    const monday = getMondayOfWeek(week, year);
    return DAY_NAMES_SHORT.map((name, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { short: name, date: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`, iso: d.toISOString().slice(0, 10) };
    });
}

// Projecten dynamisch laden uit app-data (localStorage), anders fallback
const PROJECTS_FALLBACK = [
    { id: '1', name: 'Nieuwbouw Villa Wassenaar' },
    { id: '2', name: 'Werkplaats / Magazijn' },
];
function getAppProjects() {
    if (typeof window === 'undefined') return PROJECTS_FALLBACK;
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const arr = raw ? JSON.parse(raw) : [];
        return arr.length > 0 ? arr.map(p => ({ id: String(p.id), name: p.name })) : PROJECTS_FALLBACK;
    } catch { return PROJECTS_FALLBACK; }
}

const UREN_TYPES = [
    { id: 'normaal',           label: 'Project uren',       color: '#F5850A', icon: 'fa-paint-roller',    inputType: 'hours' },
    { id: 'meerwerk',          label: 'Extra werk',           color: '#f59e0b', icon: 'fa-plus-minus',      inputType: 'hours' },
    { id: 'oplevering',        label: 'Oplevering',         color: '#06b6d4', icon: 'fa-flag-checkered',  inputType: 'hours' },
    { id: 'werkvoorbereiding', label: 'Werkvoorbereiding',  color: '#6366f1', icon: 'fa-clipboard-list',  inputType: 'hours' },
    { id: 'ziek',              label: 'Ziek',               color: '#ef4444', icon: 'fa-briefcase-medical', inputType: 'icon' },
    { id: 'vrij',              label: 'Vrij',               color: '#8b5cf6', icon: 'fa-umbrella-beach',  inputType: 'icon' },
];

const TARGET_WEEK = 37.5;

function fmtLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function getISOWeekAndYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return { week, year: d.getUTCFullYear() };
}

function syncProjectsToRegistraties(userId, weekNum, yearNum, projects) {
    try {
        const monday = getMondayOfWeek(weekNum, yearNum);
        const raw = localStorage.getItem('schildersapp_uren_registraties');
        const all = raw ? JSON.parse(raw) : [];
        // Verwijder oude urv2-sync entries voor deze user+week
        const filtered = all.filter(e => {
            if (!e._fromUrv2 || e.userId !== userId) return true;
            const { week, year } = getISOWeekAndYear(new Date(e.date + 'T00:00:00'));
            return !(week === weekNum && year === yearNum);
        });
        // Voeg nieuwe entries toe vanuit urv2
        projects.forEach(row => {
            if (!row.projectId) return;
            Object.entries(row.types || {}).forEach(([typeId, hrs]) => {
                if (typeId === 'ziek' || typeId === 'vrij') return;
                (hrs || []).forEach((h, di) => {
                    const hours = parseFloat(h) || 0;
                    if (hours <= 0) return;
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + di);
                    const dateIso = fmtLocal(d);
                    filtered.push({
                        id: `urv2_${row.projectId}_${di}_${userId}`,
                        userId,
                        projectId: row.projectId,
                        date: dateIso,
                        hours,
                        note: row.notes?.[typeId]?.[di] || '',
                        _fromUrv2: true,
                    });
                });
            });
        });
        localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(filtered));
    } catch {}
}

// ── Storage helpers ──
function storageKey(userId, week, year) { return `schildersapp_urv2_u${userId}_w${week}_${year}`; }
function statusStorageKey(userId, week, year) { return `schildersapp_urv2_status_u${userId}_w${week}_${year}`; }
function loadData(userId, week, year) {
    try { const raw = localStorage.getItem(storageKey(userId, week, year)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveData(userId, week, year, data) {
    try { localStorage.setItem(storageKey(userId, week, year), JSON.stringify(data)); } catch { }
}
function loadStatus(userId, week, year) { return localStorage.getItem(statusStorageKey(userId, week, year)) || 'concept'; }
function saveStatus(userId, week, year, status) { localStorage.setItem(statusStorageKey(userId, week, year), status); }

const defaultProjects = () => [{ id: 'p' + Date.now(), projectId: '1', types: { normaal: ['', '', '', '', ''] }, notes: { normaal: ['', '', '', '', ''] } }];
const parseVal = v => parseFloat(String(v).replace(',', '.')) || 0;

// ── Zoekbaar project dropdown ──
function ProjectPicker({ value, onChange, showAll = false }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const projects = getAppProjects();
    const sel = value === 'all' ? null : projects.find(p => p.id === value);
    const filtered = projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    const displayLabel = value === 'all' ? '— Alle projecten —' : (sel ? sel.name : 'Selecteer project...');
    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <div onClick={() => { setOpen(!open); setQ(''); }}
                style={{ padding: '7px 10px', background: '#fff', border: `1px solid ${value === 'all' ? '#e2e8f0' : '#FA9F52'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.82rem', color: value === 'all' ? '#64748b' : '#1e293b', gap: '6px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
                <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', color: '#94a3b8', flexShrink: 0 }} />
            </div>
            {open && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: '3px' }}>
                    <div style={{ padding: '6px' }}>
                        <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} onClick={e => e.stopPropagation()}
                            placeholder="Zoek project..." style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem', border: '1.5px solid #FA9F52', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                        {showAll && (
                            <li onClick={() => { onChange('all'); setOpen(false); }}
                                style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: value === 'all' ? 700 : 400, background: value === 'all' ? 'rgba(100,116,139,0.08)' : 'transparent', color: '#64748b', fontStyle: 'italic' }}
                                onMouseOver={e => { if (value !== 'all') e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseOut={e => { if (value !== 'all') e.currentTarget.style.background = 'transparent'; }}>
                                — Alle projecten —
                            </li>
                        )}
                        {filtered.length === 0 && <li style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#94a3b8' }}>Geen projecten gevonden</li>}
                        {filtered.map(p => (
                            <li key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                                style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: p.id === value ? 700 : 400, background: p.id === value ? 'rgba(245,133,10,0.08)' : 'transparent' }}
                                onMouseOver={e => { if (p.id !== value) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseOut={e => { if (p.id !== value) e.currentTarget.style.background = 'transparent'; }}
                            >{p.name}</li>
                        ))}
                    </ul>
                </div>
            </>)}
        </div>
    );
}

// ── + Type toevoegen menu ──
function AddTypeMenu({ existingTypes, onAdd }) {
    const [open, setOpen] = useState(false);
    const available = UREN_TYPES.filter(t => t.id !== 'normaal' && !existingTypes.includes(t.id));
    if (available.length === 0) return null;
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setOpen(!open)}
                style={{ padding: '3px 10px', border: '1px dashed #d0d5dd', borderRadius: '6px', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                onMouseOver={e => { e.currentTarget.style.color = '#F5850A'; e.currentTarget.style.borderColor = '#FA9F52'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#d0d5dd'; }}>
                <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem' }} /> Type toevoegen
            </button>
            {open && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
                <div style={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginBottom: '4px', minWidth: '160px', padding: '4px' }}>
                    {available.map(t => (
                        <div key={t.id} onClick={() => { onAdd(t.id); setOpen(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', color: '#1e293b' }}
                            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <i className={`fa-solid ${t.icon}`} style={{ color: t.color, fontSize: '0.7rem', width: '14px', textAlign: 'center' }} />
                            {t.label}
                        </div>
                    ))}
                </div>
            </>)}
        </div>
    );
}

// ══════════════════════════════════════════
// MIJN UREN — Gecombineerd beste van beide
// (Progress card van Urenregistratie +
//  project+types grid van Urenstaat)
// ══════════════════════════════════════════
function MijnUren({ userId, userObj, adminMode = false, adminUserName = null }) {
    const today = new Date();
    const curWeek = getISOWeekNumber(today);
    const curYear = today.getFullYear();
    const todayDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

    const [weekNum, setWeekNum] = useState(curWeek);
    const [yearNum, setYearNum] = useState(curYear);
    const [projects, setProjects] = useState(defaultProjects());
    const [status, setStatus] = useState('concept');
    const [showToast, setShowToast] = useState('');
    const [showSubmit, setShowSubmit] = useState(false);
    const [noteModal, setNoteModal] = useState(null); // { pi, typeId, di, value }
    const [showUrenstaat, setShowUrenstaat] = useState(false);

    const DAYS = getDaysForWeek(weekNum, yearNum);
    const isCurWeek = weekNum === curWeek && yearNum === curYear;
    const todayIdx = isCurWeek ? todayDayIdx : -1;

    // loadedRef: voorkomt dat de save-effect de externe data overschrijft op mount
    const loadedRef = useRef(false);

    useEffect(() => {
        loadedRef.current = false; // Reset bij elke week/user-wissel
        const saved = loadData(userId, weekNum, yearNum);
        setProjects(saved || defaultProjects());
        setStatus(loadStatus(userId, weekNum, yearNum));
    }, [userId, weekNum, yearNum]);

    useEffect(() => {
        if (!loadedRef.current) {
            loadedRef.current = true; // Eerste run overslaan (data nog niet geladen)
            return;
        }
        saveData(userId, weekNum, yearNum, projects);
        syncProjectsToRegistraties(userId, weekNum, yearNum, projects);
    }, [projects, userId, weekNum, yearNum]);

    // Berekeningen
    const dayTotals = [0, 0, 0, 0, 0];
    projects.forEach(p => Object.entries(p.types).forEach(([tid, hrs]) => {
        if (tid === 'ziek' || tid === 'vrij') return;
        hrs.forEach((h, i) => { if (i < 5) dayTotals[i] += parseVal(h); });
    }));
    const weekTotal = dayTotals.reduce((a, b) => a + b, 0);
    const extraUren = dayTotals.map(v => v > 7.5 ? +(v - 7.5).toFixed(1) : 0);
    const sumExtra = extraUren.reduce((a, b) => a + b, 0);
    const cappedWeek = dayTotals.map(v => +Math.min(v, 7.5).toFixed(1));
    const sumCapped = cappedWeek.reduce((a, b) => a + b, 0);
    const pct = Math.min((weekTotal / TARGET_WEEK) * 100, 100);
    const barColor = pct >= 100 ? '#22c55e' : pct >= 60 ? '#F5850A' : '#ef4444';

    const prevWeek = () => { if (weekNum <= 1) { setWeekNum(52); setYearNum(y => y - 1); } else setWeekNum(w => w - 1); };
    const nextWeek = () => { if (weekNum >= 52) { setWeekNum(1); setYearNum(y => y + 1); } else setWeekNum(w => w + 1); };

    const addProject = () => setProjects(prev => [...prev, { id: 'p' + Date.now(), projectId: '', types: { normaal: ['', '', '', '', ''] }, notes: { normaal: ['', '', '', '', ''] } }]);
    const removeProject = pi => { if (projects.length > 1) setProjects(prev => prev.filter((_, i) => i !== pi)); };
    const changeProjectId = (pi, id) => setProjects(prev => prev.map((p, i) => i !== pi ? p : { ...p, projectId: id }));
    const addType = (pi, tid) => setProjects(prev => prev.map((p, i) => i !== pi ? p : { ...p, types: { ...p.types, [tid]: ['', '', '', '', ''] }, notes: { ...p.notes, [tid]: ['', '', '', '', ''] } }));
    const removeType = (pi, tid) => setProjects(prev => prev.map((p, i) => { if (i !== pi) return p; const t = { ...p.types }; const n = { ...p.notes }; delete t[tid]; delete n[tid]; return { ...p, types: t, notes: n }; }));
    const changeHours = (pi, tid, di, val) => setProjects(prev => prev.map((p, i) => { if (i !== pi) return p; const hrs = [...p.types[tid]]; hrs[di] = val; return { ...p, types: { ...p.types, [tid]: hrs } }; }));
    const changeNote = (pi, tid, di, val) => setProjects(prev => prev.map((p, i) => { if (i !== pi) return p; const nts = [...(p.notes[tid] || ['','','','',''])]; nts[di] = val; return { ...p, notes: { ...p.notes, [tid]: nts } }; }));
    const openNote = (pi, tid, di) => setNoteModal({ pi, typeId: tid, di, value: (projects[pi].notes?.[tid]?.[di]) || '' });
    const saveNote = () => { if (!noteModal) return; changeNote(noteModal.pi, noteModal.typeId, noteModal.di, noteModal.value); setNoteModal(null); };
    const quickFill75 = () => setProjects(prev => prev.map(p => { const t = { ...p.types }; if (t.normaal) t.normaal = ['7.5', '7.5', '7.5', '7.5', '7.5']; return { ...p, types: t }; }));

    const handleSubmit = () => {
        setStatus('ingediend'); saveStatus(userId, weekNum, yearNum, 'ingediend');
        setShowSubmit(false); setShowToast('Weekstaat ingediend! ✅');
        setTimeout(() => setShowToast(''), 3500);
    };

    const statusCfg = {
        concept: { label: 'Concept', color: '#F5850A', bg: 'rgba(245,133,10,0.1)', border: 'rgba(245,133,10,0.3)' },
        ingediend: { label: '✓ Ingediend', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
        goedgekeurd: { label: '✓ Goedgekeurd', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    };
    const sc = statusCfg[status] || statusCfg.concept;

    if (showUrenstaat && userObj) {
        return <UrenstaatPrint user={userObj} week={weekNum} year={yearNum} onBack={() => setShowUrenstaat(false)} />;
    }

    return (
        <div>
            {/* Beheerder-banner: uren invullen namens medewerker */}
            {adminMode && adminUserName && (
                <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.06))', border: '1.5px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '12px 18px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-pencil" style={{ color: '#3b82f6', fontSize: '0.85rem' }} />
                    <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.88rem' }}>
                        Je vult uren in namens <strong>{adminUserName}</strong>. Wijzigingen worden direct opgeslagen.
                    </span>
                </div>
            )}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 24px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-chart-simple" style={{ color: barColor }} />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Week {weekNum} voortgang</span>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: barColor }}>{weekTotal} / {TARGET_WEEK}u</span>
                </div>
                <div style={{ height: '10px', borderRadius: '5px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '5px', background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', marginTop: '10px' }}>
                    {dayTotals.map((h, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 4 ? '1px solid #f1f5f9' : 'none', padding: '0 4px' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: i === todayIdx ? '#3b82f6' : '#94a3b8', marginBottom: '2px', textTransform: 'uppercase' }}>{DAYS[i]?.short}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: h > 7.5 ? '#ef4444' : h > 0 ? barColor : '#d1d5db' }}>{h > 0 ? h : '—'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Weekstaat grid (stijl van Urenstaat) ── */}
            <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>

                {/* Header — Weekstaat stijl */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: 'rgba(0,0,0,0.01)', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <i className="fa-regular fa-calendar" style={{ color: '#F5850A' }} />
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap' }}>Weekstaat — Week {weekNum}{yearNum !== curYear ? ` ${yearNum}` : ''}</span>
                        <button onClick={prevWeek} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.65rem', color: '#64748b' }}><i className="fa-solid fa-chevron-left" /></button>
                        <button onClick={() => { setWeekNum(curWeek); setYearNum(curYear); }} style={{ padding: '4px 12px', borderRadius: '7px', border: '1px solid #e2e8f0', background: isCurWeek ? '#fff' : 'rgba(245,133,10,0.06)', color: isCurWeek ? '#64748b' : '#F5850A', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Huidige</button>
                        <button onClick={nextWeek} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.65rem', color: '#64748b' }}><i className="fa-solid fa-chevron-right" /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={quickFill75} title="7.5u per dag" style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-bolt" style={{ color: '#f59e0b', fontSize: '0.6rem' }} /> 7.5u × 5
                        </button>
                        <button onClick={() => setShowUrenstaat(true)} title="Weekstaat afdrukken" style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-print" style={{ fontSize: '0.6rem' }} /> Afdrukken
                        </button>
                        {status === 'concept' && weekTotal > 0 && (
                            <button onClick={() => setShowSubmit(true)} style={{ padding: '5px 14px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-paper-plane" /> Indienen
                            </button>
                        )}
                        {status === 'ingediend' && <span style={{ padding: '5px 14px', borderRadius: '7px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700 }}>✓ Weekstaat Ingediend</span>}
                        {status === 'goedgekeurd' && <span style={{ padding: '5px 14px', borderRadius: '7px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 700 }}>✓ Goedgekeurd</span>}
                    </div>
                </div>

                {/* Dag-header */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 52px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <div style={{ padding: '8px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '6px 8px' }}>
                        {DAYS.map((d, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: i === todayIdx ? 800 : 600, color: i === todayIdx ? '#3b82f6' : '#94a3b8', textTransform: 'uppercase', borderBottom: `2px solid ${i === todayIdx ? '#3b82f6' : 'transparent'}`, paddingBottom: '2px' }}>
                                {d.short} <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 400, opacity: 0.8 }}>{d.date}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '8px 4px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.5px' }}>Tot.</div>
                </div>

                {/* Project rijen met types als sub-rijen (van Urenstaat) */}
                {projects.map((proj, pi) => {
                    const projTotal = Object.entries(proj.types).reduce((sum, [tid, hrs]) => {
                        if (tid === 'ziek' || tid === 'vrij') return sum;
                        return sum + hrs.slice(0, 5).reduce((a, h) => a + parseVal(h), 0);
                    }, 0);
                    const typeKeys = Object.keys(proj.types);
                    return (
                        <div key={proj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {typeKeys.map((typeId, typeIdx) => {
                                const hours = proj.types[typeId];
                                const typeInfo = UREN_TYPES.find(t => t.id === typeId) || UREN_TYPES[0];
                                const typeTotal = hours.slice(0, 5).reduce((a, h) => a + parseVal(h), 0);
                                const isFirst = typeIdx === 0;
                                return (
                                    <div key={typeId} style={{ display: 'grid', gridTemplateColumns: '280px 1fr 52px', alignItems: 'center', borderBottom: typeIdx < typeKeys.length - 1 ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                                        {/* Project / Type label */}
                                        <div style={{ padding: '8px 16px' }}>
                                            {isFirst ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ flex: 1 }}><ProjectPicker value={proj.projectId} onChange={id => changeProjectId(pi, id)} /></div>
                                                    {projects.length > 1 && (
                                                        <button onClick={() => removeProject(pi)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', fontSize: '0.55rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
                                                    <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.6rem', color: typeInfo.color, width: '12px', textAlign: 'center' }} />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: typeInfo.color }}>{typeInfo.label}</span>
                                                    <button onClick={() => removeType(pi, typeId)} style={{ marginLeft: 'auto', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', fontSize: '0.6rem' }}>
                                                        <i className="fa-solid fa-trash-can" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Dag invoer + opmerking weergave */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '6px 8px' }}>
                                            {hours.slice(0, 5).map((h, di) => {
                                                const filled = parseVal(h) > 0;
                                                const isToday = di === todayIdx;
                                                const noteText = proj.notes?.[typeId]?.[di] || '';
                                                const hasNote = !!noteText;
                                                const isIconOnly = typeInfo.inputType === 'icon';
                                                if (isIconOnly) return (
                                                    <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div onClick={() => openNote(pi, typeId, di)}
                                                            style={{ height: '40px', borderRadius: '8px', background: `${typeInfo.color}18`, border: `2px solid ${typeInfo.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                                                            <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.7rem', color: typeInfo.color }} />
                                                            {hasNote && <span style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 10px 10px 0', borderColor: `transparent ${typeInfo.color} transparent transparent`, borderTopRightRadius: '6px' }} />}
                                                        </div>
                                                        {hasNote && (
                                                            <div onClick={() => openNote(pi, typeId, di)} title={noteText}
                                                                style={{ fontSize: '0.58rem', fontWeight: 600, color: typeInfo.color, background: `${typeInfo.color}12`, borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <i className="fa-solid fa-message" style={{ fontSize: '0.48rem', flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{noteText}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                                return (
                                                    <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input type="text" value={h} placeholder="0"
                                                                onChange={e => changeHours(pi, typeId, di, e.target.value)}
                                                                style={{ width: '100%', height: '40px', textAlign: 'center', border: `2px solid ${filled ? typeInfo.color : isToday ? 'rgba(59,130,246,0.3)' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, color: filled ? typeInfo.color : '#94a3b8', background: filled ? `${typeInfo.color}0d` : isToday ? 'rgba(59,130,246,0.03)' : '#fff', outline: 'none', boxSizing: 'border-box', transition: 'all 0.15s' }}
                                                                onFocus={e => { e.currentTarget.style.borderColor = typeInfo.color; e.currentTarget.select(); }}
                                                                onBlur={e => { if (!parseVal(e.currentTarget.value)) e.currentTarget.style.borderColor = isToday ? 'rgba(59,130,246,0.3)' : '#e2e8f0'; }}
                                                            />
                                                            {hasNote && (
                                                                <span onClick={() => openNote(pi, typeId, di)}
                                                                    style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 10px 10px 0', borderColor: 'transparent #F5850A transparent transparent', borderTopRightRadius: '6px', cursor: 'pointer', zIndex: 2 }} />
                                                            )}
                                                        </div>
                                                        {/* Notitie knop + altijd zichtbare tekst */}
                                                        <div>
                                                            {hasNote ? (
                                                                <div onClick={() => openNote(pi, typeId, di)}
                                                                    style={{ fontSize: '0.58rem', fontWeight: 600, color: '#F5850A', background: 'rgba(245,133,10,0.1)', border: '1px solid rgba(245,133,10,0.3)', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <i className="fa-solid fa-message" style={{ fontSize: '0.45rem', flexShrink: 0 }} />
                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{noteText}</span>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => openNote(pi, typeId, di)}
                                                                    style={{ width: '100%', height: '16px', border: '1px solid rgba(245,133,10,0.2)', borderRadius: '4px', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                                    <i className="fa-regular fa-message" style={{ fontSize: '0.45rem', color: '#cbd5e1' }} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Totaal */}
                                        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: isFirst ? '1rem' : '0.85rem', color: isFirst ? (projTotal > 0 ? '#F5850A' : '#d1d5db') : (typeTotal > 0 ? typeInfo.color : '#d1d5db'), padding: '8px 4px' }}>
                                            {isFirst ? (projTotal > 0 ? projTotal : '—') : (typeTotal > 0 ? typeTotal : '—')}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* + Type toevoegen */}
                            <div style={{ padding: '4px 16px 8px' }}>
                                <AddTypeMenu existingTypes={Object.keys(proj.types)} onAdd={tid => addType(pi, tid)} />
                            </div>
                        </div>
                    );
                })}

                {/* + Project toevoegen */}
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <button onClick={addProject}
                        style={{ padding: '5px 14px', border: '1px dashed #d0d5dd', borderRadius: '8px', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                        onMouseOver={e => { e.currentTarget.style.color = '#F5850A'; e.currentTarget.style.borderColor = '#FA9F52'; }}
                        onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#d0d5dd'; }}>
                        <i className="fa-solid fa-plus" /> Project toevoegen
                    </button>
                </div>

                {/* Week Totaal + Extra uren */}
                <div style={{ background: '#fafafa', borderTop: '2px solid #f1f5f9' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 52px', alignItems: 'center' }}>
                        <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Week Totaal</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '6px 8px' }}>
                            {cappedWeek.map((h, i) => (
                                <div key={i} style={{ height: '34px', borderRadius: '8px', background: h > 0 ? 'rgba(245,133,10,0.08)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: h > 0 ? '#F5850A' : '#d1d5db' }}>
                                    {h > 0 ? h : '—'}
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: barColor, padding: '8px 4px' }}>{sumCapped || '—'}</div>
                    </div>
                    {sumExtra > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 52px', alignItems: 'center', borderTop: '1px dashed rgba(239,68,68,0.2)' }}>
                            <div style={{ padding: '6px 16px', fontWeight: 600, fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '0.65rem' }} /> Extra uren
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '4px 8px' }}>
                                {extraUren.map((h, i) => (
                                    <div key={i} style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: h > 0 ? 700 : 400, fontSize: '0.78rem', color: h > 0 ? '#ef4444' : 'rgba(0,0,0,0.1)' }}>
                                        {h > 0 ? h : '—'}
                                    </div>
                                ))}
                            </div>
                            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', padding: '4px' }}>{sumExtra}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Note modal */}
            {noteModal && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(0,0,0,0.35)' }} onClick={() => setNoteModal(null)} />
                <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9998, background: '#fff', borderRadius: '16px', padding: '24px', width: '380px', maxWidth: '90vw', boxShadow: '0 16px 60px rgba(0,0,0,0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(245,133,10,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-message" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Opmerking toevoegen</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {projects[noteModal.pi] && UREN_TYPES.find(t => t.id === noteModal.typeId)?.label} · {DAYS[noteModal.di]?.short} {DAYS[noteModal.di]?.date}
                            </div>
                        </div>
                    </div>
                    <textarea
                        autoFocus
                        value={noteModal.value}
                        onChange={e => setNoteModal(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) saveNote(); if (e.key === 'Escape') setNoteModal(null); }}
                        placeholder="Bijv. 2u extra werk wegens lekkage reparatie..."
                        rows={3}
                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #FA9F52', borderRadius: '10px', fontSize: '0.88rem', color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>Ctrl+Enter om op te slaan · Esc om te sluiten</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'flex-end' }}>
                        {noteModal.value && (
                            <button onClick={() => { setNoteModal(prev => ({ ...prev, value: '' })); }} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Verwijderen</button>
                        )}
                        <button onClick={() => setNoteModal(null)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Annuleren</button>
                        <button onClick={saveNote} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Opslaan</button>
                    </div>
                </div>
            </>) }

            {/* Submit modal */}
            {showSubmit && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowSubmit(false)} />
                <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9999, background: '#fff', borderRadius: '18px', padding: '32px', width: '400px', maxWidth: '90vw', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '14px' }}>📋</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>Weekstaat indienen?</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
                        Week <b>{weekNum}</b> — totaal <b>{weekTotal} uur</b> over {projects.filter(p => p.projectId).length} project(en).
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={() => setShowSubmit(false)} style={{ padding: '9px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>Annuleren</button>
                        <button onClick={handleSubmit} style={{ padding: '9px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 }}>
                            <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }} />Bevestigen
                        </button>
                    </div>
                </div>
            </>)}

            {/* Toast */}
            {showToast && (
                <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: '#fff', borderRadius: '12px', padding: '12px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                    <i className="fa-solid fa-check-circle" style={{ color: '#22c55e', fontSize: '1.1rem' }} /> {showToast}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════
// TEAM OVERZICHT — Beheerder dashboard
// ══════════════════════════════════════════
function TeamOverzicht({ weekNum, yearNum, setWeekNum, setYearNum, allUsers, curWeek, curYear }) {
    const DAYS = getDaysForWeek(weekNum, yearNum);
    const [refreshKey, setRefreshKey] = useState(0);
    const [expandedUser, setExpandedUser] = useState(null);

    const teamData = allUsers
        .filter(u => u.role !== "ZZP'er")
        .map(u => {
            const projects = loadData(u.id, weekNum, yearNum) || [];
            const status = loadStatus(u.id, weekNum, yearNum);
            const dayTotals = [0, 0, 0, 0, 0];
            projects.forEach(p => Object.entries(p.types || {}).forEach(([tid, hrs]) => {
                const typeInfo = UREN_TYPES.find(t => t.id === tid);
                if (typeInfo?.inputType === 'icon') return;
                (hrs || []).forEach((h, i) => { if (i < 5) dayTotals[i] += parseVal(h); });
            }));
            const total = dayTotals.reduce((a, b) => a + b, 0);
            return { ...u, projects, dayTotals, total, status };
        });

    const exportCSV = () => {
        const header = ['Medewerker', 'Rol', ...DAYS.map(d => `${d.short} ${d.date}`), 'Totaal', 'Status'];
        const rows = teamData.map(u => [u.name, u.role, ...u.dayTotals.map(h => h || 0), u.total, u.status]);
        const csv = [header, ...rows].map(r => r.join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `uren_week${weekNum}_${yearNum}.csv`; a.click();
    };

    const getStatusBadge = (status, total) => {
        if (status === 'goedgekeurd') return { label: '✅ Goedgekeurd', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' };
        if (status === 'ingediend')   return { label: '📤 Ingediend',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' };
        if (total >= TARGET_WEEK)     return { label: '⚠️ Concept vol', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
        if (total > 0)                return { label: '⚠️ Deels ingevuld', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
        return { label: '❌ Leeg', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
    };

    const approveUser = (userId) => {
        saveStatus(userId, weekNum, yearNum, 'goedgekeurd');
        setRefreshKey(k => k + 1);
    };

    const totalTeam = teamData.reduce((s, u) => s + u.total, 0);

    return (
        <div key={refreshKey}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
                {[
                    { label: 'Team uren', value: `${totalTeam}u`, sub: `van ${teamData.length * TARGET_WEEK}u doel`, color: '#F5850A', icon: 'fa-clock' },
                    { label: 'Ingediend', value: teamData.filter(u => u.status === 'ingediend' || u.status === 'goedgekeurd').length, sub: `van ${teamData.length} medewerkers`, color: '#3b82f6', icon: 'fa-paper-plane' },
                    { label: 'Goedgekeurd', value: teamData.filter(u => u.status === 'goedgekeurd').length, sub: `van ${teamData.length} medewerkers`, color: '#22c55e', icon: 'fa-check-circle' },
                ].map((card, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`fa-solid ${card.icon}`} style={{ color: card.color, fontSize: '0.9rem' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>{card.sub}</div>
                    </div>
                ))}
            </div>

            {/* Week navigatie + export */}
            <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-regular fa-calendar" style={{ color: '#F5850A' }} />
                        <button onClick={() => { if (weekNum <= 1) { setWeekNum(52); setYearNum(y => y - 1); } else setWeekNum(w => w - 1); }}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.7rem', color: '#64748b' }}><i className="fa-solid fa-chevron-left" /></button>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>Week {weekNum}{yearNum !== curYear ? ` ${yearNum}` : ''}</span>
                        <button onClick={() => { if (weekNum >= 52) { setWeekNum(1); setYearNum(y => y + 1); } else setWeekNum(w => w + 1); }}
                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.7rem', color: '#64748b' }}><i className="fa-solid fa-chevron-right" /></button>
                        {(weekNum !== curWeek || yearNum !== curYear) && (
                            <button onClick={() => { setWeekNum(curWeek); setYearNum(curYear); }} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #FA9F52', background: 'rgba(245,133,10,0.06)', color: '#F5850A', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Huidige week</button>
                        )}
                    </div>
                    <button onClick={exportCSV} style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-file-csv" /> Export CSV
                    </button>
                </div>

                {/* Dag-header */}
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 90px 120px 110px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', padding: '8px 16px', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Medewerker</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' }}>
                        {DAYS.map((d, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                {d.short}<span style={{ display: 'block', fontSize: '0.58rem', fontWeight: 400 }}>{d.date}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Totaal</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Status</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Actie</div>
                </div>

                {/* Medewerker rijen */}
                {teamData.map((u, idx) => {
                    const badge = getStatusBadge(u.status, u.total);
                    const pctUser = Math.min((u.total / TARGET_WEEK) * 100, 100);
                    const isExpanded = expandedUser === u.id;
                    const hasProjects = u.projects && u.projects.length > 0 && u.projects.some(p => Object.values(p.types || {}).some(hrs => hrs.some(h => parseVal(h) > 0)));

                    return (
                        <div key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            {/* Samenvatting rij — klikbaar om uit te klappen */}
                            <div onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                style={{ display: 'grid', gridTemplateColumns: '260px 1fr 90px 120px 110px', padding: '12px 16px', gap: '8px', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(245,133,10,0.03)' : (idx % 2 === 0 ? '#fff' : '#fafffe'), borderLeft: `3px solid ${isExpanded ? '#F5850A' : 'transparent'}`, transition: 'all 0.15s' }}
                                onMouseOver={e => { if (!isExpanded) e.currentTarget.style.background = '#fafafa'; }}
                                onMouseOut={e => { if (!isExpanded) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafffe'; }}>

                                {/* Avatar + naam */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>{u.initials}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {u.name}
                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', color: '#94a3b8' }} />
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{u.role}</div>
                                    </div>
                                </div>

                                {/* Dag totalen */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' }}>
                                    {u.dayTotals.map((h, di) => (
                                        <div key={di} style={{ textAlign: 'center', height: '32px', borderRadius: '6px', background: h > 0 ? 'rgba(245,133,10,0.07)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontWeight: h > 0 ? 700 : 400, fontSize: '0.88rem', color: h > 0 ? '#F5850A' : '#d1d5db' }}>{h > 0 ? h : '—'}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totaal + progress */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: u.total >= TARGET_WEEK ? '#22c55e' : u.total > 0 ? '#F5850A' : '#d1d5db' }}>{u.total > 0 ? `${u.total}u` : '—'}</div>
                                    <div style={{ height: '4px', borderRadius: '2px', background: '#f1f5f9', overflow: 'hidden', marginTop: '4px', width: '60px', margin: '4px auto 0' }}>
                                        <div style={{ height: '100%', width: `${pctUser}%`, borderRadius: '2px', background: pctUser >= 100 ? '#22c55e' : '#FA9F52' }} />
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>{badge.label}</span>
                                </div>

                                {/* Actie knop */}
                                <div style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    {u.status === 'ingediend' && (
                                        <button onClick={() => approveUser(u.id)} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#34d399,#22c55e)', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>✅ Goedkeuren</button>
                                    )}
                                    {u.status === 'goedgekeurd' && <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 600 }}>✔ Goedgekeurd</span>}
                                    {u.status !== 'ingediend' && u.status !== 'goedgekeurd' && <span style={{ fontSize: '0.72rem', color: '#d1d5db' }}>—</span>}
                                </div>
                            </div>

                            {/* Uitklap detail — volledige weekstaat breakdown */}
                            {isExpanded && (
                                <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '12px 24px 16px' }}>
                                    {!hasProjects ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                            <i className="fa-regular fa-clock" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                                            Geen uren ingevuld voor deze week
                                        </div>
                                    ) : (
                                        <>
                                            {/* Kolom-headers in de uitklapdetail */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 52px', marginBottom: '6px', padding: '0 4px' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Project / Type</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' }}>
                                                    {DAYS.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{d.short}</div>)}
                                                </div>
                                                <div style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Tot.</div>
                                            </div>

                                            {u.projects.map((proj, pi) => {
                                                const projName = getAppProjects().find(p => p.id === proj.projectId)?.name || 'Onbekend project';
                                                const typeKeys = Object.keys(proj.types || {});
                                                return (
                                                    <div key={proj.id} style={{ marginBottom: '6px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                        {typeKeys.map((tid, typeIdx) => {
                                                            const hours = proj.types[tid] || ['', '', '', '', ''];
                                                            const typeInfo = UREN_TYPES.find(t => t.id === tid) || UREN_TYPES[0];
                                                            const typeTotal = typeInfo.inputType !== 'icon' ? hours.slice(0, 5).reduce((a, h) => a + parseVal(h), 0) : null;
                                                            const isFirst = typeIdx === 0;
                                                            return (
                                                                <div key={tid} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 52px', alignItems: 'center', borderBottom: typeIdx < typeKeys.length - 1 ? '1px dashed #f1f5f9' : 'none', padding: '6px 8px' }}>
                                                                    {/* Label */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: isFirst ? 0 : '8px' }}>
                                                                        {isFirst ? (
                                                                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                <i className="fa-solid fa-folder-open" style={{ color: '#F5850A', marginRight: '5px', fontSize: '0.65rem' }} />
                                                                                {projName}
                                                                            </span>
                                                                        ) : (
                                                                            <>
                                                                                <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.58rem', color: typeInfo.color, width: '12px', textAlign: 'center' }} />
                                                                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: typeInfo.color }}>{typeInfo.label}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {/* Dag-cellen (read-only) */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' }}>
                                                                        {hours.slice(0, 5).map((h, di) => {
                                                                            const val = parseVal(h);
                                                                            const noteText = proj.notes?.[tid]?.[di] || '';
                                                                            return (
                                                                                <div key={di} style={{ height: '30px', borderRadius: '6px', background: val > 0 ? `${typeInfo.color}10` : typeInfo.inputType === 'icon' ? `${typeInfo.color}10` : 'transparent', border: `1px solid ${val > 0 ? typeInfo.color + '44' : typeInfo.inputType === 'icon' ? typeInfo.color + '30' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', position: 'relative' }} title={noteText || undefined}>
                                                                                    {typeInfo.inputType === 'icon' ? (
                                                                                        <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.6rem', color: typeInfo.color }} />
                                                                                    ) : (
                                                                                        <span style={{ fontSize: '0.82rem', fontWeight: val > 0 ? 700 : 400, color: val > 0 ? typeInfo.color : '#d1d5db' }}>{val > 0 ? val : '—'}</span>
                                                                                    )}
                                                                                    {noteText && <span style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 7px 7px 0', borderColor: `transparent #F5850A transparent transparent`, borderTopRightRadius: '4px' }} />}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {/* Totaal */}
                                                                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: isFirst ? (typeTotal > 0 || typeKeys.length > 1 ? '#F5850A' : '#d1d5db') : (typeTotal > 0 ? typeInfo.color : '#d1d5db') }}>
                                                                        {typeInfo.inputType === 'icon' ? <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.6rem', color: typeInfo.color }} /> : (typeTotal > 0 ? typeTotal : '—')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


// ══════════════════════════════════════════
// URENSTAAT PRINT — A4 per persoon / week
// ══════════════════════════════════════════
// ── Herbruikbaar urenstaat document (zonder knoppen) ──
function UrenstaatBody({ user, week, weeks, year }) {
    const today = new Date();
    const allWeeks = weeks || [week];

    const profielRaw  = typeof window !== 'undefined' ? localStorage.getItem(`schildersapp_profiel_${user.id}`) : null;
    const profiel     = profielRaw ? JSON.parse(profielRaw) : null;
    const bsn         = profiel?.bsn || user.bsn || '—';
    const briefpapier = typeof window !== 'undefined' ? localStorage.getItem('wa_briefpapier') : null;

    const ALL_DAYS = ['Ma','Di','Wo','Do','Vr'];
    const fmtDate  = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;

    // Bouw per-week data op
    const weekData = allWeeks.map(w => {
        const monday = getMondayOfWeek(w, year);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const rows = [];
        (loadData(user.id, w, year) || []).forEach((proj, pi) => {
            const projName = getAppProjects().find(p => p.id === proj.projectId)?.name || 'Onbekend project';
            Object.keys(proj.types || {}).forEach(tid => {
                const typeInfo = UREN_TYPES.find(t => t.id === tid);
                if (!typeInfo || typeInfo.inputType === 'icon') return;
                const hrs = proj.types[tid] || [];
                const dayHours = ALL_DAYS.map((_, di) => parseVal(hrs[di] || 0));
                const total = dayHours.reduce((a, b) => a + b, 0);
                if (total === 0) return;
                rows.push({ opdrachtgever: `${pi + 1}. Projecten`, project: projName, type: typeInfo.label, dayHours, total });
            });
        });
        const weekTotal = rows.reduce((a, r) => a + r.total, 0);
        return { week: w, monday, sunday, rows, weekTotal };
    }).filter(d => d.rows.length > 0);

    const grandTotal = weekData.reduce((a, d) => a + d.weekTotal, 0);
    const periodeLabel = weekData.length > 0
        ? `${fmtDate(weekData[0].monday)} – ${fmtDate(weekData[weekData.length - 1].sunday)}`
        : '—';

    const FONT = "'Carlito','Calibri','Segoe UI',Arial,sans-serif";
    const PT = briefpapier ? 110 : 40;
    const PB = briefpapier ? 100 : 40;
    const PS = 48;

    const tdH = { border: '1px solid #e2e8f0', padding: '6px 8px', fontSize: '11px', fontFamily: FONT, color: '#334155' };
    const thH = { border: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1', padding: '6px 8px', fontSize: '10px', fontFamily: FONT, background: '#fff', fontWeight: 800, whiteSpace: 'nowrap', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };
    const weekThS = { fontSize: '10px', fontWeight: 800, color: '#fff', background: '#F5850A', padding: '2px 8px', letterSpacing: '0.04em', textTransform: 'uppercase', border: '1px solid #F5850A' };

    return (
        <div className="urenstaat-doc" style={{
            position: 'relative', width: '620px', minHeight: '876px',
            margin: '0 auto', background: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', borderRadius: '8px',
            overflow: 'hidden',
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @media screen {
                    .editable-title { 
                        transition: background 0.2s; 
                        border-radius: 4px; 
                        background: #fff7ed; 
                        border: 1px dashed #FA9F52; 
                        padding: 2px 8px; 
                        margin-left: -8px; 
                        display: inline-block;
                    }
                    .editable-title:hover { background: #ffedd5; cursor: text; }
                    .editable-title::after { content: "\\f304"; font-family: "Font Awesome 6 Free"; font-weight: 900; font-size: 10px; opacity: 0.6; margin-left: 8px; color: #F5850A; }
                }
            `}} />
            {briefpapier && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: `url(${briefpapier})`,
                    backgroundSize: '100% auto', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none', zIndex: 0,
                }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, padding: `${PT}px ${PS}px ${PB}px`, fontFamily: FONT }}>
                {/* Titel */}
                <h1 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 8px', color: '#1e293b', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '2px solid #1e293b', paddingBottom: '4px', fontFamily: FONT }}>
                    <span className="editable-title" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>Urenstaat</span>
                </h1>

                {/* Medewerker + periode naast elkaar */}
                <div style={{ display: 'flex', gap: '32px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <table style={{ borderCollapse: 'collapse', flex: 1 }}>
                        <tbody>
                            {[['Werkkracht', user.name], ['BSN nummer', bsn]].map(([label, value]) => (
                                <tr key={label}>
                                    <td style={{ fontWeight: 700, fontSize: '10px', padding: '1px 10px 1px 0', color: '#2c3b4e', width: '90px', fontFamily: FONT, verticalAlign: 'top' }}>{label}</td>
                                    <td style={{ fontSize: '10px', color: '#2c3b4e', fontFamily: FONT, padding: '1px 0' }}>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <table style={{ borderCollapse: 'collapse' }}>
                        <tbody>
                            {[
                                allWeeks.length === 1 ? ['Weeknummer', allWeeks[0]] : ['Weken', `${allWeeks[0]} – ${allWeeks[allWeeks.length-1]}`],
                                ['Jaar', year],
                                ['Periode', periodeLabel],
                            ].map(([label, value]) => (
                                <tr key={label}>
                                    <td style={{ ...thH, width: '100px', textAlign: 'left' }}>{label}</td>
                                    <td style={{ ...tdH, whiteSpace: 'nowrap' }}>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Per-week secties */}
                {weekData.length === 0 ? (
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', fontFamily: FONT }}>Geen uren ingevuld voor deze periode</p>
                ) : (
                    <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '10px' }}>
                        {weekData.map(({ week: w, monday, sunday, rows, weekTotal }, index) => (
                            <tbody key={`wk-${w}`}>
                                {/* Week-header rij */}
                                <tr key={`wh-${w}`}>
                                    <td colSpan={9} style={{ ...weekThS, borderTop: index > 0 ? '6px solid #f1f5f9' : '1px solid #F5850A' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>Week {w}</span>
                                            <span>·</span>
                                            <span style={{color: 'rgba(255,255,255,0.9)', fontWeight: 600}}>{fmtDate(monday)} – {fmtDate(sunday)}</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr key={`ch-${w}`}>
                                    {['Medewerker','Project','Type uur','Ma','Di','Wo','Do','Vr','Totaal'].map(h => (
                                        <th key={h} style={{ ...thH, textAlign: ['Ma','Di','Wo','Do','Vr','Totaal'].includes(h) ? 'center' : 'left', fontSize: '10px' }}>{h}</th>
                                    ))}
                                </tr>
                                    {rows.map((r, ri) => (
                                        <tr key={`${w}-${ri}`} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ ...tdH, verticalAlign: 'top' }}>
                                                <div style={{ fontWeight: 800, color: '#1e293b' }}>{user.name}</div>
                                                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>BSN: {bsn || '—'}</div>
                                            </td>
                                            <td style={{ ...tdH, maxWidth: '110px', verticalAlign: 'top' }}>{r.project}</td>
                                            <td style={tdH}>{r.type}</td>
                                            {r.dayHours.map((h, di) => (
                                                <td key={di} style={{ ...tdH, textAlign: 'center', fontWeight: h > 0 ? 700 : 400, color: h > 0 ? '#1e293b' : '#d1d5db' }}>{h > 0 ? h : ''}</td>
                                            ))}
                                            <td style={{ ...tdH, textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{r.total}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        ))}
                        <tfoot>
                            <tr style={{ background: '#F5850A' }}>
                                <td colSpan={8} style={{ padding: '8px', textAlign: 'right', color: '#fff', fontWeight: 800, fontSize: '11px', fontFamily: FONT, border: '1px solid #e07008' }}>Totaal uren</td>
                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, color: '#fff', background: '#e07008', fontSize: '12px', fontFamily: FONT, border: '1px solid #c96007' }}>{grandTotal}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}

                {/* Handtekening blokken */}
                <div style={{ display: 'flex', gap: '40px', marginTop: '16px' }}>
                    {['Handtekening uitvoerder', 'Handtekening De Schilders uit Katwijk'].map(label => (
                        <div key={label} style={{ flex: 1 }}>
                            <div style={{ height: '30px', borderBottom: '1.5px solid #2c3b4e', marginBottom: '4px' }}></div>
                            <div style={{ fontSize: '8px', color: '#64748b', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
                        </div>
                    ))}
                </div>

                <p style={{ fontSize: '9px', color: '#94a3b8', margin: '20px 0 0', fontFamily: FONT }}>
                    Afgedrukt op {today.toLocaleDateString('nl-NL')} om {today.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

// Print wordt afgehandeld via window.open() — zelfde aanpak als modelovereenkomsten
const URENSTAAT_PRINT_STYLE = ``;

function UrenstaatPrint({ user, week, weeks, year, onBack }) {
    const handlePrint = () => {
        const docEl = document.querySelector('.urenstaat-doc');
        if (!docEl) return;
        const win = window.open('', '_blank', 'width=900,height=700');
        const allW = weeks || [week];
        const editableTitle = docEl.querySelector('.editable-title');
        const customTitle = editableTitle && editableTitle.innerText.trim() ? editableTitle.innerText.trim() : null;
        const titel = customTitle || `Urenstaat ${user.name} - ${allW.length === 1 ? 'Week ' + allW[0] : 'Weken ' + allW[0] + '-' + allW[allW.length-1]} ${year}`;
        win.document.write(`<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"/><title>${titel}</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.urenstaat-doc{position:relative;width:620px!important;height:876px!important;zoom:1.28!important;overflow:hidden!important;margin:0!important;border:none!important;box-shadow:none!important;border-radius:0!important;}@page{size:A4 portrait;margin:0;}</style></head><body>${docEl.outerHTML}<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`);
        win.document.close();
    };

    return (
        <>
            {/* Toolbar */}
            <div className="no-print" style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: '#1e293b', padding: '10px 24px',
                display: 'flex', gap: '10px', alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
                <button onClick={onBack}
                    style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                    <i className="fa-solid fa-arrow-left" /> Terug
                </button>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', flex: 1 }}>
                    Urenstaat — {user.name} · {weeks ? `Weken ${weeks[0]}–${weeks[weeks.length-1]}` : `Week ${week}`} {year}
                </span>
                <button onClick={handlePrint}
                    style={{ padding: '7px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <i className="fa-solid fa-print" /> Afdrukken
                </button>
            </div>
            {/* Grijze preview-achtergrond, wit A4-vel gecentreerd */}
            <div style={{ background: '#e5e7eb', minHeight: 'calc(100vh - 50px)', padding: '32px 16px' }}>
                <UrenstaatBody user={user} week={week} weeks={weeks} year={year} />
            </div>
        </>
    );
}

// ── Samenvoegd overzicht: alle medewerkers + weken in één tabel ──
function SamengevoegdBody({ entries, year }) {
    const today     = new Date();
    const briefpapier = typeof window !== 'undefined' ? localStorage.getItem('wa_briefpapier') : null;
    const ALL_DAYS  = ['Ma','Di','Wo','Do','Vr'];
    const fmtDate   = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    const FONT      = "'Carlito','Calibri','Segoe UI',Arial,sans-serif";

    const alleWeken = [...new Set(entries.flatMap(e => e.weeks))].sort((a, b) => a - b);

    const weekData = alleWeken.map(w => {
        const monday = getMondayOfWeek(w, year);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const rows = [];
        entries.forEach(({ user }) => {
            (loadData(user.id, w, year) || []).forEach((proj, pi) => {
                Object.keys(proj.types || {}).forEach(tid => {
                    const typeInfo = UREN_TYPES.find(t => t.id === tid);
                    if (!typeInfo || typeInfo.inputType === 'icon') return;
                    const hrs = proj.types[tid] || [];
                    const dayHours = ALL_DAYS.map((_, di) => parseVal(hrs[di] || 0));
                    const total = dayHours.reduce((a, b) => a + b, 0);
                    if (total === 0) return;
                    const projName = getAppProjects().find(p => p.id === proj.projectId)?.name || 'Onbekend';
                    const profielRaw = typeof window !== 'undefined' ? localStorage.getItem(`schildersapp_profiel_${user.id}`) : null;
                    const bsn = (profielRaw ? JSON.parse(profielRaw)?.bsn : null) || user.bsn || '—';
                    rows.push({ user, bsn, projName, type: typeInfo.label, dayHours, total });
                });
            });
        });
        return { week: w, monday, sunday, rows, weekTotal: rows.reduce((a, r) => a + r.total, 0) };
    }).filter(d => d.rows.length > 0);

    const grandTotal = weekData.reduce((a, d) => a + d.weekTotal, 0);
    const PT = briefpapier ? 110 : 40;
    const PB = briefpapier ? 100 : 40;
    const PS = 48;
    const tdH = { border: '1px solid #e2e8f0', padding: '6px 8px', fontSize: '11px', fontFamily: FONT, color: '#334155' };
    const thH = { border: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1', padding: '6px 8px', fontSize: '10px', fontFamily: FONT, background: '#fff', fontWeight: 800, whiteSpace: 'nowrap', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };

    return (
        <div className="urenstaat-doc" style={{
            position: 'relative', width: '620px', minHeight: '876px',
            margin: '0 auto', background: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden',
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @media screen {
                    .editable-title { 
                        transition: background 0.2s; 
                        border-radius: 4px; 
                        background: #fff7ed; 
                        border: 1px dashed #FA9F52; 
                        padding: 2px 8px; 
                        margin-left: -8px; 
                        display: inline-block;
                    }
                    .editable-title:hover { background: #ffedd5; cursor: text; }
                    .editable-title::after { content: "\\f304"; font-family: "Font Awesome 6 Free"; font-weight: 900; font-size: 10px; opacity: 0.6; margin-left: 8px; color: #F5850A; }
                }
            `}} />
            {briefpapier && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${briefpapier})`, backgroundSize: '100% auto', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 0 }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, padding: `${PT}px ${PS}px ${PB}px`, fontFamily: FONT }}>
                <h1 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 6px', color: '#1e293b', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '2px solid #1e293b', paddingBottom: '4px', fontFamily: FONT }}>
                    <span className="editable-title" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>Urenstaat — Samenvoegd overzicht</span>
                </h1>
                <div style={{ marginBottom: '8px', fontSize: '10px', color: '#4a5568', fontFamily: FONT }}>
                    <strong>Medewerkers:</strong> {entries.map(e => e.user.name).join(', ')} &nbsp;·&nbsp; <strong>Jaar:</strong> {year}
                    {weekData.length > 0 && <> &nbsp;·&nbsp; <strong>Periode:</strong> {fmtDate(weekData[0].monday)} – {fmtDate(weekData[weekData.length-1].sunday)}</>}
                </div>
                <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '10px' }}>
                    {weekData.map(({ week: w, monday, sunday, rows, weekTotal }, index) => (
                        <tbody key={`wk-${w}`}>
                            <tr key={`wh-${w}`}>
                                <td colSpan={9} style={{ fontSize: '10px', fontWeight: 800, color: '#fff', background: '#F5850A', padding: '2px 8px', letterSpacing: '0.04em', textTransform: 'uppercase', border: '1px solid #F5850A', borderTop: index > 0 ? '6px solid #f1f5f9' : '1px solid #F5850A' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Week {w}</span>
                                        <span>·</span>
                                        <span style={{color: 'rgba(255,255,255,0.9)', fontWeight: 600}}>{fmtDate(monday)} – {fmtDate(sunday)}</span>
                                    </div>
                                </td>
                            </tr>
                            <tr key={`ch-${w}`}>
                                {['Medewerker','Project','Type uur','Ma','Di','Wo','Do','Vr','Totaal'].map(h => (
                                    <th key={h} style={{ ...thH, textAlign: ['Ma','Di','Wo','Do','Vr','Totaal'].includes(h) ? 'center' : 'left', fontSize: '10px' }}>{h}</th>
                                ))}
                            </tr>
                                {rows.map((r, ri) => (
                                    <tr key={`${w}-${ri}`} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ ...tdH, verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{r.user.name}</div>
                                            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>BSN: {r.bsn || '—'}</div>
                                        </td>
                                        <td style={{ ...tdH, maxWidth: '110px', verticalAlign: 'top' }}>{r.projName}</td>
                                        <td style={tdH}>{r.type}</td>
                                        {r.dayHours.map((h, di) => (
                                            <td key={di} style={{ ...tdH, textAlign: 'center', fontWeight: h > 0 ? 700 : 400, color: h > 0 ? '#1e293b' : '#d1d5db' }}>{h > 0 ? h : ''}</td>
                                        ))}
                                        <td style={{ ...tdH, textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{r.total}</td>
                                    </tr>
                                ))}
                        </tbody>
                    ))}
                    <tfoot>
                        <tr style={{ background: '#F5850A' }}>
                            <td colSpan={8} style={{ padding: '8px', textAlign: 'right', color: '#fff', fontWeight: 800, fontSize: '11px', fontFamily: FONT, border: '1px solid #e07008' }}>Totaal uren</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, color: '#fff', background: '#e07008', fontSize: '12px', fontFamily: FONT, border: '1px solid #c96007' }}>{grandTotal}</td>
                        </tr>
                    </tfoot>
                </table>
                <div style={{ display: 'flex', gap: '40px', marginTop: '16px' }}>
                    {['Handtekening uitvoerder', 'Handtekening De Schilders uit Katwijk'].map(label => (
                        <div key={label} style={{ flex: 1 }}>
                            <div style={{ height: '30px', borderBottom: '1.5px solid #2c3b4e', marginBottom: '4px' }} />
                            <div style={{ fontSize: '8px', color: '#64748b', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: '9px', color: '#94a3b8', margin: '12px 0 0', fontFamily: FONT }}>
                    Afgedrukt op {today.toLocaleDateString('nl-NL')} om {today.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}

function BatchUrenstaatPrint({ entries, year, onBack }) {
    const [viewMode, setViewMode] = useState('per-medewerker');

    const handlePrint = () => {
        const docs = document.querySelectorAll('.urenstaat-doc');
        if (!docs.length) return;
        const editableTitle = docs[0] ? docs[0].querySelector('.editable-title') : null;
        const customTitle = editableTitle && editableTitle.innerText.trim() ? editableTitle.innerText.trim() : 'Batch urenstaten';

        const pageStyle = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.urenstaat-doc{position:relative;width:620px!important;height:876px!important;zoom:1.28!important;overflow:hidden!important;margin:0!important;border:none!important;box-shadow:none!important;border-radius:0!important;page-break-after:always;break-after:page;}.urenstaat-doc:last-child{page-break-after:auto;break-after:auto;}@page{size:A4 portrait;margin:0;}`;
        const html = [...docs].map(d => d.outerHTML).join('');
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"/><title>${customTitle}</title><style>${pageStyle}</style></head><body>${html}<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`);
        win.document.close();
    };

    const btnToggle = (active) => ({
        padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px',
        background: active ? '#fff' : 'transparent',
        color: active ? '#1e293b' : '#94a3b8',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
    });

    return (
        <>
            <div className="no-print" style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: '#1e293b', padding: '10px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    <button onClick={onBack}
                        style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                        <i className="fa-solid fa-arrow-left" /> Terug
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                        Kies hier de afdrukweergave:
                    </span>
                    <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px' }}>
                        <button onClick={() => setViewMode('per-medewerker')} style={btnToggle(viewMode === 'per-medewerker')}>
                            <i className="fa-solid fa-user" /> Per medewerker
                        </button>
                        <button onClick={() => setViewMode('samenvoegd')} style={btnToggle(viewMode === 'samenvoegd')}>
                            <i className="fa-solid fa-layer-group" /> Samengevoegde weergave voor alle medewerkers
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handlePrint}
                        style={{ padding: '7px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <i className="fa-solid fa-print" /> Afdrukken
                    </button>
                </div>
            </div>
            <div style={{ background: '#e5e7eb', minHeight: 'calc(100vh - 50px)', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {viewMode === 'per-medewerker' ? (
                    entries.map(({ user, weeks: entryWeeks }) => (
                        <div key={user.id}>
                            <UrenstaatBody user={user} weeks={entryWeeks} year={year} />
                        </div>
                    ))
                ) : (
                    <SamengevoegdBody entries={entries} year={year} />
                )}
            </div>
        </>
    );
}

// ══════════════════════════════════════════
// MANDAGREGISTER — Afdrukbaar per project
// ══════════════════════════════════════════
function MandagRegister({ allUsers }) {
    const today   = new Date();
    const curWeek = getISOWeekNumber(today);
    const curYear = today.getFullYear();

    const [selectedProject, setSelectedProject] = useState('all');
    const [selectedUser, setSelectedUser]       = useState('all');
    const [year, setYear]                       = useState(curYear);
    const [fromWeek, setFromWeek]               = useState(Math.max(1, curWeek - 2));
    const [toWeek, setToWeek]                   = useState(curWeek);
    const [showUrenstaat, setShowUrenstaat]     = useState(null);
    const [printSelectie, setPrintSelectie]     = useState(new Set());
    const [showBatch, setShowBatch]             = useState(false);

    const MONTH_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
    const ALL_DAYS    = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

    const getMon = (w) => {
        const jan4 = new Date(year, 0, 4);
        const dow  = jan4.getDay() || 7;
        const mon  = new Date(jan4);
        mon.setDate(jan4.getDate() - (dow - 1) + (w - 1) * 7);
        return mon;
    };
    const fmtD = d => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
    const selStyle = { padding: '8px 12px', borderRadius: '9px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none' };
    const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' };

    // ── Dataverzameling: week-secties ──
    const wFrom = Math.min(fromWeek, toWeek);
    const wTo   = Math.max(fromWeek, toWeek);
    const usersToShow = selectedUser === 'all' ? allUsers : allUsers.filter(u => String(u.id) === selectedUser);

    const weekSections = [];
    for (let w = wFrom; w <= wTo; w++) {
        const monday = getMon(w);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        const rows = [];
        usersToShow.forEach(u => {
            const userData = loadData(u.id, w, year) || [];
            userData.forEach((proj, pi) => {
                if (selectedProject !== 'all' && proj.projectId !== selectedProject) return;
                const projName = getAppProjects().find(p => p.id === proj.projectId)?.name || 'Onbekend project';
                Object.entries(proj.types || {}).forEach(([tid, hrs]) => {
                    const typeInfo = UREN_TYPES.find(t => t.id === tid);
                    if (!typeInfo) return;
                    const dayHours = [0,1,2,3,4,5,6].map(i => parseVal(hrs[i] || 0));
                    const total = dayHours.reduce((a, b) => a + b, 0);
                    if (total === 0) return;
                    rows.push({ user: u, projName, category: `${pi + 1}. Projecten`, typeInfo, dayHours, total });
                });
            });
        });
        if (rows.length > 0) weekSections.push({ week: w, monday, sunday, rows });
    }

    const grandTotal = weekSections.reduce((a, s) => a + s.rows.reduce((b, r) => b + r.total, 0), 0);

    // ── Render guards ──
    if (showBatch && printSelectie.size > 0) {
        // printSelectie bevat userId's — verzamel alle weken per user uit weekSections
        const toPrint = [...printSelectie].map(uid => {
            const u = allUsers.find(u => String(u.id) === String(uid));
            const userWeeks = weekSections.filter(s => s.rows.some(r => String(r.user.id) === String(uid))).map(s => s.week);
            return (u && userWeeks.length > 0) ? { user: u, weeks: userWeeks } : null;
        }).filter(Boolean);
        return <BatchUrenstaatPrint entries={toPrint} year={year} onBack={() => setShowBatch(false)} />;
    }
    if (showUrenstaat) {
        const userWeeks = weekSections.filter(s => s.rows.some(r => String(r.user.id) === String(showUrenstaat.id))).map(s => s.week);
        return <UrenstaatPrint user={showUrenstaat} weeks={userWeeks} year={year} onBack={() => setShowUrenstaat(null)} />;
    }

    const thS = { padding: '8px 10px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '2px solid #e8f5e9', whiteSpace: 'nowrap', textAlign: 'center' };
    const tdS = { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem', verticalAlign: 'middle' };

    return (
        <>
            <style>{`
                @media print {
                    .sidebar, .topbar, .no-print { display: none !important; }
                    .content-area { padding: 0 !important; margin: 0 !important; }
                    body { background: white !important; }
                }
            `}</style>

            {/* ── Filter panel ── */}
            <div className="no-print" style={{ background: '#fff', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px' }}>
                    <div style={{ minWidth: '230px' }}>
                        <label style={labelStyle}>Project</label>
                        <ProjectPicker value={selectedProject} onChange={setSelectedProject} showAll />
                    </div>
                    <div>
                        <label style={labelStyle}>Medewerker</label>
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                            style={{ ...selStyle, minWidth: '180px', border: `1.5px solid ${selectedUser !== 'all' ? '#F5850A' : '#e2e8f0'}`, color: selectedUser !== 'all' ? '#F5850A' : '#1e293b' }}>
                            <option value="all">— Alle medewerkers —</option>
                            {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Van week</label>
                        <select value={fromWeek} onChange={e => setFromWeek(Number(e.target.value))} style={{ ...selStyle, minWidth: '120px' }}>
                            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Week {w}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>T/m week</label>
                        <select value={toWeek} onChange={e => setToWeek(Number(e.target.value))} style={{ ...selStyle, minWidth: '120px' }}>
                            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Week {w}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Jaar</label>
                        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selStyle, width: '90px' }}>
                            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        {printSelectie.size > 0 && (
                            <button onClick={() => setShowBatch(true)}
                                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <i className="fa-solid fa-print" /> Print selectie ({printSelectie.size})
                            </button>
                        )}
                        <button onClick={() => window.print()}
                            style={{ padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-print" /> Afdrukken
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Samenvatting ── */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '12px', fontSize: '0.8rem', color: '#64748b', alignItems: 'center' }}>
                <span><strong style={{ color: '#1e293b' }}>{weekSections.length}</strong> week{weekSections.length !== 1 ? 'en' : ''} met uren</span>
                <span>·</span>
                <span><strong style={{ color: '#F5850A' }}>{grandTotal.toFixed(1)}</strong> uur totaal</span>
                {selectedProject !== 'all' && <span>· <strong style={{ color: '#1e293b' }}>{getAppProjects().find(p => p.id === selectedProject)?.name}</strong></span>}
            </div>

            {/* ── Week secties ── */}
            {weekSections.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                    <i className="fa-regular fa-clock" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>Geen uren gevonden</div>
                    <div style={{ fontSize: '0.85rem' }}>Pas de filters aan om uren te zien.</div>
                </div>
            ) : weekSections.map(({ week, monday, sunday, rows }) => {
                const weekTotal = rows.reduce((a, r) => a + r.total, 0);
                const weekUsers = [...new Set(rows.map(r => r.user.id))];
                return (
                    <div key={week} style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #d1fae5' }}>
                        {/* Groene week-header */}
                        <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em' }}>Week {week}</span>
                                <span style={{ fontSize: '0.82rem', opacity: 0.85, background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '2px 8px' }}>
                                    {fmtD(monday)} – {fmtD(sunday)} {year}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', opacity: 0.92 }}>
                                <span><i className="fa-solid fa-users" style={{ marginRight: '4px' }} />{weekUsers.length} medewerker{weekUsers.length !== 1 ? 's' : ''}</span>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{weekTotal.toFixed(1)} uur</span>
                            </div>
                        </div>

                        {/* Tabel */}
                        <div style={{ overflowX: 'auto', background: '#fff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thS, textAlign: 'left', paddingLeft: '16px', minWidth: '200px' }}>Project</th>
                                        <th style={{ ...thS, textAlign: 'left', minWidth: '160px' }}>Werkkracht</th>
                                        <th style={{ ...thS, textAlign: 'left', minWidth: '140px' }}>Type uur</th>
                                        {ALL_DAYS.map(d => <th key={d} style={{ ...thS, minWidth: '42px' }}>{d}</th>)}
                                        <th style={{ ...thS, minWidth: '60px', color: '#16a34a' }}>Totaal</th>
                                        <th style={{ ...thS, minWidth: '90px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, ri) => (
                                        <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                                            <td style={{ ...tdS, paddingLeft: '16px' }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.projName}</div>
                                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>{r.category}</div>
                                            </td>
                                            <td style={{ ...tdS }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.6rem', flexShrink: 0 }}>{r.user.initials}</div>
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.user.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...tdS }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: r.typeInfo.color, fontWeight: 600, fontSize: '0.78rem', background: `${r.typeInfo.color}12`, borderRadius: '5px', padding: '2px 7px' }}>
                                                    <i className={`fa-solid ${r.typeInfo.icon}`} style={{ fontSize: '0.6rem' }} />
                                                    {r.typeInfo.label}
                                                </span>
                                            </td>
                                            {r.dayHours.map((h, di) => (
                                                <td key={di} style={{ ...tdS, textAlign: 'center', fontWeight: h > 0 ? 700 : 400, color: h > 0 ? '#1e293b' : '#e2e8f0', fontSize: h > 0 ? '0.85rem' : '0.75rem' }}>
                                                    {h > 0 ? h : ''}
                                                </td>
                                            ))}
                                            <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>{r.total.toFixed(1)}</td>
                                            <td style={{ ...tdS, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                                    <input type="checkbox"
                                                        checked={printSelectie.has(r.user.id)}
                                                        onChange={e => setPrintSelectie(prev => { const s = new Set(prev); e.target.checked ? s.add(r.user.id) : s.delete(r.user.id); return s; })}
                                                        style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                                                        title={`Selecteer ${r.user.name} (alle weken)`}
                                                    />
                                                    <button onClick={() => setShowUrenstaat(r.user)} title={`Urenstaat ${r.user.name} (alle weken)`}
                                                        style={{ padding: '3px 8px', borderRadius: '6px', border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.07)', color: '#3b82f6', fontWeight: 600, fontSize: '0.68rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                                        <i className="fa-solid fa-file-lines" style={{ fontSize: '0.6rem' }} /> Urenstaat
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f0fdf4', borderTop: '2px solid #d1fae5' }}>
                                        <td colSpan={10} style={{ padding: '8px 16px', fontWeight: 700, color: '#15803d', fontSize: '0.82rem', textAlign: 'right' }}>
                                            <i className="fa-solid fa-sigma" style={{ marginRight: '5px' }} />
                                            Week {week} totaal
                                        </td>
                                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#16a34a', fontSize: '0.95rem' }}>{weekTotal.toFixed(1)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                );
            })}
        </>
    );
}

// ══════════════════════════════════════════
// MAAND OVERZICHT
// ══════════════════════════════════════════
function MaandOverzicht({ userId, userName, allUsers, isBeheerder }) {
    const today = new Date();
    const [maand, setMaand] = useState(today.getMonth());
    const [jaar, setJaar] = useState(today.getFullYear());

    const MAAND_NAMEN = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

    // Bereken alle weken die (deels) in de maand vallen
    function getWeeksInMonth(m, y) {
        const weeks = [];
        const d = new Date(y, m, 1);
        while (d.getMonth() === m) {
            const w = getISOWeekNumber(d);
            const yw = d.getFullYear();
            if (!weeks.find(x => x.week === w && x.year === yw)) weeks.push({ week: w, year: yw });
            d.setDate(d.getDate() + 7 - (d.getDay() || 7) + 1);
            if (d.getDay() !== 1) { d.setDate(d.getDate() - (d.getDay() - 1 + 7) % 7); }
        }
        // eenvoudiger: loop per dag en verzamel unieke weken
        const weeks2 = [];
        const d2 = new Date(y, m, 1);
        while (d2.getMonth() === m) {
            const w = getISOWeekNumber(d2);
            const yw = d2.getDay() === 0 && d2.getDate() <= 3 ? y - 1 : (d2.getDay() !== 0 && d2.getMonth() === 11 && d2.getDate() >= 29 ? y + 1 : y);
            if (!weeks2.find(x => x.week === w && x.year === yw)) weeks2.push({ week: w, year: yw });
            d2.setDate(d2.getDate() + 1);
        }
        return weeks2;
    }

    const weeks = getWeeksInMonth(maand, jaar);

    function getUserHoursPerWeek(uid) {
        return weeks.map(({ week, year }) => {
            const raw = localStorage.getItem(storageKey(uid, week, year));
            if (!raw) return 0;
            const data = JSON.parse(raw);
            return (data || []).reduce((sum, proj) => {
                return sum + Object.values(proj.types || {}).reduce((s, arr) => {
                    if (!Array.isArray(arr)) return s;
                    return s + arr.reduce((ss, v) => ss + parseVal(v), 0);
                }, 0);
            }, 0);
        });
    }

    function getUserTotalHours(uid) {
        return getUserHoursPerWeek(uid).reduce((a, b) => a + b, 0);
    }

    // CSV export
    function exportCSV() {
        const users = isBeheerder && allUsers ? allUsers : [{ id: userId, name: userName }];
        const header = ['Medewerker', ...weeks.map(w => `Week ${w.week}`), 'Totaal'];
        const rows = users.map(u => {
            const perWeek = getUserHoursPerWeek(u.id);
            const totaal = perWeek.reduce((a, b) => a + b, 0);
            return [u.name, ...perWeek.map(h => h.toFixed(1)), totaal.toFixed(1)];
        });
        const csv = [header, ...rows].map(r => r.join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `uren_${MAAND_NAMEN[maand]}_${jaar}.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    const users = isBeheerder && allUsers ? allUsers : [{ id: userId, name: userName }];

    return (
        <div style={{ padding: '0 0 40px' }}>
            {/* Navigatie balk */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => { const d = new Date(jaar, maand - 1, 1); setMaand(d.getMonth()); setJaar(d.getFullYear()); }}
                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', minWidth: '160px', textAlign: 'center' }}>
                    {MAAND_NAMEN[maand]} {jaar}
                </span>
                <button onClick={() => { const d = new Date(jaar, maand + 1, 1); setMaand(d.getMonth()); setJaar(d.getFullYear()); }}
                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <i className="fa-solid fa-chevron-right" />
                </button>
                <button onClick={() => { setMaand(today.getMonth()); setJaar(today.getFullYear()); }}
                    style={{ padding: '6px 12px', border: '1px solid #FA9F52', borderRadius: '8px', background: 'rgba(245,133,10,0.07)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#F5850A' }}>
                    Huidige maand
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button onClick={() => window.print()}
                        style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-print" style={{ fontSize: '0.7rem' }} /> Afdrukken
                    </button>
                    <button onClick={exportCSV}
                        style={{ padding: '6px 12px', border: '1px solid #22c55e', borderRadius: '8px', background: 'rgba(34,197,94,0.07)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-file-csv" style={{ fontSize: '0.7rem' }} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Tabel */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Medewerker</th>
                            {weeks.map(w => (
                                <th key={`${w.week}-${w.year}`} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', minWidth: '80px' }}>
                                    Wk {w.week}
                                </th>
                            ))}
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#1e293b', borderBottom: '2px solid #e2e8f0', background: 'rgba(245,133,10,0.06)' }}>Totaal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u, idx) => {
                            const perWeek = getUserHoursPerWeek(u.id);
                            const totaal = perWeek.reduce((a, b) => a + b, 0);
                            return (
                                <tr key={u.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{u.name}</td>
                                    {perWeek.map((h, i) => (
                                        <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', color: h === 0 ? '#cbd5e1' : '#1e293b', fontWeight: h > 0 ? 600 : 400 }}>
                                            {h === 0 ? '—' : h.toFixed(1)}
                                        </td>
                                    ))}
                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: totaal >= TARGET_WEEK * weeks.length * 0.8 ? '#16a34a' : '#F5850A', borderBottom: '1px solid #f1f5f9', background: 'rgba(245,133,10,0.04)' }}>
                                        {totaal.toFixed(1)} u
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td style={{ padding: '10px 14px', color: '#64748b', borderTop: '2px solid #e2e8f0' }}>Totaal</td>
                            {weeks.map((w, i) => {
                                const colTotal = users.reduce((sum, u) => {
                                    const perWeek = getUserHoursPerWeek(u.id);
                                    return sum + (perWeek[i] || 0);
                                }, 0);
                                return (
                                    <td key={i} style={{ padding: '10px 12px', textAlign: 'center', borderTop: '2px solid #e2e8f0', color: '#1e293b' }}>
                                        {colTotal.toFixed(1)}
                                    </td>
                                );
                            })}
                            <td style={{ padding: '10px 14px', textAlign: 'center', borderTop: '2px solid #e2e8f0', color: '#F5850A', background: 'rgba(245,133,10,0.06)' }}>
                                {users.reduce((sum, u) => sum + getUserTotalHours(u.id), 0).toFixed(1)} u
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════
// PROJECT OVERZICHT — Alle uren per project
// ══════════════════════════════════════════
function ProjectOverzicht({ allUsers }) {
    const today = new Date();
    const curWeek = getISOWeekNumber(today);
    const curYear = today.getFullYear();
    const [year, setYear] = useState(curYear);
    const [fromWeek, setFromWeek] = useState(Math.max(1, curWeek - 4));
    const [toWeek, setToWeek] = useState(curWeek);
    const [selectedProject, setSelectedProject] = useState('all');

    const wFrom = Math.min(fromWeek, toWeek);
    const wTo = Math.max(fromWeek, toWeek);

    const projectData = {};
    allUsers.forEach(u => {
        for (let w = wFrom; w <= wTo; w++) {
            const userData = loadData(u.id, w, year) || [];
            userData.forEach(proj => {
                if (selectedProject !== 'all' && proj.projectId !== selectedProject) return;
                const pid = proj.projectId;

                Object.entries(proj.types || {}).forEach(([tid, hrs]) => {
                    const tLabel = UREN_TYPES.find(t=>t.id===tid)?.label || tid;
                    const dayHours = [0,1,2,3,4,5,6].map(i => parseVal(hrs[i] || 0));
                    const total = dayHours.reduce((a,b)=>a+b, 0);
                    if (total === 0) return;

                    if (!projectData[pid]) {
                        const pInfo = getAppProjects().find(p => p.id === pid);
                        projectData[pid] = {
                            id: pid,
                            name: pInfo?.name || 'Onbekend',
                            client: pInfo?.clientName || 'Diverse',
                            total: 0,
                            rows: []
                        };
                    }

                    projectData[pid].total += total;
                    const profielRaw = typeof window !== 'undefined' ? localStorage.getItem(`schildersapp_profiel_${u.id}`) : null;
                    const bsn = (profielRaw ? JSON.parse(profielRaw)?.bsn : null) || u.bsn || '—';
                    projectData[pid].rows.push({
                        user: u,
                        bsn,
                        week: w,
                        type: tLabel,
                        dayHours,
                        total
                    });
                });
            });
        }
    });

    const projectArray = Object.values(projectData).sort((a,b) => b.total - a.total);
    const grandTotal = projectArray.reduce((acc, p) => acc + p.total, 0);

    const FONT = "'Inter', system-ui, sans-serif";
    const tdH = { border: '1px solid #e2e8f0', padding: '6px 8px', fontSize: '11px', fontFamily: FONT, color: '#334155' };
    const thH = { border: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1', padding: '6px 8px', fontSize: '10px', fontFamily: FONT, background: '#fff', fontWeight: 800, whiteSpace: 'nowrap', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' };
    const projThS = { fontSize: '11px', fontWeight: 800, color: '#fff', background: '#F5850A', padding: '4px 10px', letterSpacing: '0.04em', textTransform: 'uppercase', border: '1px solid #F5850A', fontFamily: FONT };

    return (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            {/* Toolbar */}
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '24px', alignItems: 'flex-end', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Jaar</label>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', width: '80px', outline: 'none' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Van week</label>
                    <input type="number" value={fromWeek} min={1} max={52} onChange={e => setFromWeek(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', width: '80px', outline: 'none' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>T/m week</label>
                    <input type="number" value={toWeek} min={1} max={52} onChange={e => setToWeek(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', width: '80px', outline: 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Project filter</label>
                    <ProjectPicker value={selectedProject} onChange={setSelectedProject} showAll />
                </div>
                <button onClick={() => window.print()} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #FA9F52, #F5850A)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <i className="fa-solid fa-print" /> Afdrukken
                </button>
            </div>

            <div className="print-area">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media screen {
                        .editable-title { transition: background 0.2s; border-radius: 4px; padding: 2px 8px; margin-left: -8px; background: #fff7ed; border: 1px dashed #FA9F52; display: inline-block; }
                        .editable-title:hover { background: #ffedd5; cursor: text; }
                        .editable-title::after { content: "\\f304"; font-family: "Font Awesome 6 Free"; font-weight: 900; font-size: 10px; color: #F5850A; opacity: 0.6; margin-left: 8px; }
                    }
                    @media print {
                        .sidebar, .topbar, .no-print { display: none !important; }
                        body, .content-area { background: #fff !important; margin: 0 !important; padding: 0 !important; }
                        .print-area { zoom: 0.82; }
                    }
                `}} />
                
                <div style={{ marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 6px', color: '#1e293b', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '2px solid #1e293b', paddingBottom: '4px', fontFamily: FONT }}>
                        <span className="editable-title" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>Project uren overzicht (Gedetailleerd)</span>
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Periode: Week {wFrom} t/m {wTo} ({year}) &nbsp;·&nbsp; <span style={{ color: '#F5850A', fontWeight: 600 }}>Totaal {projectArray.length} project{projectArray.length !== 1 && 'en'}</span></p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '40px' }}>
                        {projectArray.length === 0 ? (
                            <tbody><tr><td style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Geen uren gevonden in deze geselecteerde periode.</td></tr></tbody>
                        ) : projectArray.map((p, index) => (
                            <tbody key={p.id}>
                                <tr key={`ph-${p.id}`}>
                                    <td colSpan={9} style={{ ...projThS, borderTop: index > 0 ? '2px solid #1e293b' : '1px solid #F5850A' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '11px' }}>{p.client} — {p.name}</span>
                                            <span>·</span>
                                            <span style={{color: 'rgba(255,255,255,0.9)', fontWeight: 600}}>Project Totaal: {p.total.toFixed(1)} uur</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr key={`ch-${p.id}`}>
                                    {['Medewerker','Week','Type uur','Ma','Di','Wo','Do','Vr','Totaal'].map(h => (
                                        <th key={h} style={{ ...thH, textAlign: ['Ma','Di','Wo','Do','Vr','Totaal'].includes(h) ? 'center' : 'left', fontSize: '10px' }}>{h}</th>
                                    ))}
                                </tr>
                                {p.rows.sort((a,b) => a.week - b.week).map((r, ri) => (
                                    <tr key={`${p.id}-${ri}`} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ ...tdH, verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{r.user.name}</div>
                                            {r.bsn && r.bsn !== '—' && <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>BSN: {r.bsn}</div>}
                                        </td>
                                        <td style={{ ...tdH, fontWeight: 600, color: '#64748b', verticalAlign: 'top' }}>Week {r.week}</td>
                                        <td style={tdH}>{r.type}</td>
                                        {r.dayHours.map((h, di) => (
                                            <td key={di} style={{ ...tdH, textAlign: 'center', fontWeight: h > 0 ? 700 : 400, color: h > 0 ? '#1e293b' : '#d1d5db' }}>{h > 0 ? h : ''}</td>
                                        ))}
                                        <td style={{ ...tdH, textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{r.total}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={9} style={{ height: '6px', border: 'none', background: '#fff' }}></td>
                                </tr>
                            </tbody>
                        ))}
                        {projectArray.length > 0 && (
                            <tfoot>
                                <tr style={{ background: '#fff' }}>
                                    <td colSpan={8} style={{ padding: '8px', textAlign: 'right', color: '#1e293b', fontWeight: 800, borderTop: '2px solid #1e293b', fontSize: '11px', fontFamily: FONT }}>Eindtotaal Alle Projecten:</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, color: '#000', borderTop: '2px solid #1e293b', background: '#f8fafc', fontSize: '12px', fontFamily: FONT }}>{grandTotal.toFixed(1)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════
// HOOFD PAGINA
// ══════════════════════════════════════════
export default function UrenregistratiePage() {
    const { user, getAllUsers } = useAuth();
    const today = new Date();
    const curWeek = getISOWeekNumber(today);
    const curYear = today.getFullYear();
    const [activeTab, setActiveTab] = useState('mijn');
    const [teamWeek, setTeamWeek] = useState(curWeek);
    const [teamYear, setTeamYear] = useState(curYear);

    const isBeheerder = user?.role === 'Beheerder' || user?.role === 'Voorman';
    const allUsers = getAllUsers ? getAllUsers() : [];
    const [adminEditUserId, setAdminEditUserId] = useState(null); // null = eigen uren
    const effectiveUserId = (isBeheerder && adminEditUserId) ? adminEditUserId : user.id;

    if (!user) return null;

    const tabs = [
        { id: 'mijn', label: 'Mijn Uren', icon: 'fa-pen-to-square' },
        { id: 'maand', label: 'Maandoverzicht', icon: 'fa-calendar-days' },
        ...(isBeheerder ? [{ id: 'team', label: 'Team Overzicht', icon: 'fa-users' }] : []),
        ...(isBeheerder ? [{ id: 'mandag', label: 'Mandagregister', icon: 'fa-table-list' }] : []),
        ...(isBeheerder ? [{ id: 'project', label: 'Projectoverzicht', icon: 'fa-building' }] : []),
    ];

    return (
        <div className="content-area">
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#FA9F52,#F5850A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-user-clock" style={{ color: '#fff', fontSize: '1.3rem' }} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 800 }}>Urenregistratie</h1>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                            Registreer uren per project · week navigatie · {isBeheerder ? 'team overzicht + goedkeuring' : 'indienen bij beheerder'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="tab-nav" style={{ marginBottom: '20px', width: 'fit-content' }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}>
                        <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '0.8rem' }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'mijn' && (
                <>
                    {/* Beheerder: namens wie uren invullen? */}
                    {isBeheerder && (
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 20px', marginBottom: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-user-gear" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Uren invullen voor</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {/* Eigen uren */}
                                <button onClick={() => setAdminEditUserId(null)}
                                    style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${!adminEditUserId ? '#F5850A' : '#e2e8f0'}`, background: !adminEditUserId ? 'rgba(245,133,10,0.1)' : '#f8f9fb', color: !adminEditUserId ? '#F5850A' : '#64748b', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: !adminEditUserId ? '#F5850A' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>{user.initials}</div>
                                    {user.name} <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>(jij)</span>
                                </button>
                                {/* Andere medewerkers */}
                                {allUsers.filter(u => u.id !== user.id).map(u => (
                                    <button key={u.id} onClick={() => setAdminEditUserId(u.id)}
                                        style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${adminEditUserId === u.id ? '#3b82f6' : '#e2e8f0'}`, background: adminEditUserId === u.id ? 'rgba(59,130,246,0.1)' : '#f8f9fb', color: adminEditUserId === u.id ? '#3b82f6' : '#64748b', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: adminEditUserId === u.id ? '#3b82f6' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>{u.initials}</div>
                                        {u.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <MijnUren userId={effectiveUserId} userObj={(isBeheerder && adminEditUserId) ? allUsers.find(u => u.id === adminEditUserId) : user} adminMode={isBeheerder && !!adminEditUserId} adminUserName={adminEditUserId ? allUsers.find(u => u.id === adminEditUserId)?.name : null} />
                </>
            )}
            {activeTab === 'maand' && (
                <MaandOverzicht userId={effectiveUserId} userName={adminEditUserId ? allUsers.find(u => u.id === adminEditUserId)?.name : user.name} allUsers={isBeheerder ? allUsers : null} isBeheerder={isBeheerder} />
            )}
            {activeTab === 'team' && isBeheerder && (
                <TeamOverzicht weekNum={teamWeek} yearNum={teamYear} setWeekNum={setTeamWeek} setYearNum={setTeamYear} allUsers={allUsers} curWeek={curWeek} curYear={curYear} />
            )}
            {activeTab === 'mandag' && isBeheerder && (
                <MandagRegister allUsers={allUsers} />
            )}
            {activeTab === 'project' && isBeheerder && (
                <ProjectOverzicht allUsers={allUsers} />
            )}
        </div>
    );
}
