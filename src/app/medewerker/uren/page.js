'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

const DAY_NAMES = ['Ma','Di','Wo','Do','Vr'];
const MONTH_NAMES = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

const UREN_TYPES = [
    { id: 'normaal',  label: 'Project uren', color: '#F5850A', icon: 'fa-paint-roller' },
    { id: 'meerwerk', label: 'Extra werk',   color: '#f59e0b', icon: 'fa-plus-minus' },
    { id: 'ziek',     label: 'Ziek',         color: '#ef4444', icon: 'fa-briefcase-medical' },
    { id: 'vrij',     label: 'Vrij',         color: '#8b5cf6', icon: 'fa-umbrella-beach' },
];

function getISOWeek(date) {
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
    return DAY_NAMES.map((name, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { short: name, date: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`, iso: d.toISOString().slice(0, 10) };
    });
}

function storageKey(userId, week, year) { return `schildersapp_urv2_u${userId}_w${week}_${year}`; }
function statusKey(userId, week, year) { return `schildersapp_urv2_status_u${userId}_w${week}_${year}`; }
function loadData(userId, week, year) {
    try { const raw = localStorage.getItem(storageKey(userId, week, year)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveData(userId, week, year, data) {
    try { localStorage.setItem(storageKey(userId, week, year), JSON.stringify(data)); } catch {}
}
function loadStatus(userId, week, year) { return localStorage.getItem(statusKey(userId, week, year)) || 'concept'; }
function saveStatus(userId, week, year, s) { localStorage.setItem(statusKey(userId, week, year), s); }

function getProjects() {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const arr = raw ? JSON.parse(raw) : [];
        return arr.length > 0 ? arr.map(p => ({ id: String(p.id), name: p.name })) : [{ id: '1', name: 'Werkplaats / Magazijn' }];
    } catch { return [{ id: '1', name: 'Werkplaats / Magazijn' }]; }
}

const parseVal = v => parseFloat(String(v).replace(',', '.')) || 0;

const defaultRow = () => ({ id: 'p' + Date.now(), projectId: '', types: { normaal: ['','','','',''] }, notes: { normaal: ['','','','',''] }, km: ['','','','',''] });

export default function MedewerkerUren() {
    const { user } = useAuth();
    const today = new Date();
    const [week, setWeek] = useState(getISOWeek(today));
    const [year, setYear] = useState(today.getFullYear());
    const [rows, setRows] = useState([defaultRow()]);
    const [status, setStatus] = useState('concept');
    const [saved, setSaved] = useState(false);
    const [activeType, setActiveType] = useState('normaal');
    const [kmMode, setKmMode] = useState(false);

    const days = getDaysForWeek(week, year);
    const projects = getProjects();

    useEffect(() => {
        if (!user) return;
        const data = loadData(user.id, week, year);
        setRows(data && data.length > 0 ? data : [defaultRow()]);
        setStatus(loadStatus(user.id, week, year));
    }, [user, week, year]);

    function save(newRows, newStatus) {
        if (!user) return;
        saveData(user.id, week, year, newRows);
        saveStatus(user.id, week, year, newStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    }

    function updateVal(rowIdx, dayIdx, val) {
        const updated = rows.map((r, i) => {
            if (i !== rowIdx) return r;
            const types = { ...r.types };
            if (!types[activeType]) types[activeType] = ['','','','',''];
            const arr = [...types[activeType]];
            arr[dayIdx] = val;
            return { ...r, types: { ...types, [activeType]: arr } };
        });
        setRows(updated);
        save(updated, status);
    }

    function updateKm(rowIdx, dayIdx, val) {
        const updated = rows.map((r, i) => {
            if (i !== rowIdx) return r;
            const km = [...(r.km || ['','','','',''])];
            km[dayIdx] = val;
            return { ...r, km };
        });
        setRows(updated);
        save(updated, status);
    }

    function updateNote(rowIdx, dayIdx, val) {
        const updated = rows.map((r, i) => {
            if (i !== rowIdx) return r;
            const notes = { ...r.notes };
            if (!notes[activeType]) notes[activeType] = ['','','','',''];
            const arr = [...notes[activeType]];
            arr[dayIdx] = val;
            return { ...r, notes: { ...notes, [activeType]: arr } };
        });
        setRows(updated);
        save(updated, status);
    }

    function updateProject(rowIdx, val) {
        const updated = rows.map((r, i) => i !== rowIdx ? r : { ...r, projectId: val });
        setRows(updated);
        save(updated, status);
    }

    function addRow() {
        const updated = [...rows, defaultRow()];
        setRows(updated);
        save(updated, status);
    }

    function removeRow(idx) {
        if (rows.length === 1) return;
        const updated = rows.filter((_, i) => i !== idx);
        setRows(updated);
        save(updated, status);
    }

    function submit() {
        const newStatus = status === 'ingediend' ? 'concept' : 'ingediend';
        setStatus(newStatus);
        save(rows, newStatus);
    }

    function prevWeek() {
        if (week === 1) { setWeek(52); setYear(y => y - 1); }
        else setWeek(w => w - 1);
    }
    function nextWeek() {
        if (week === 52) { setWeek(1); setYear(y => y + 1); }
        else setWeek(w => w + 1);
    }

    const dayTotals = days.map((_, di) => rows.reduce((acc, r) => {
        return acc + Object.values(r.types || {}).reduce((s, arr) => s + parseVal(arr[di]), 0);
    }, 0));
    const weekTotal = dayTotals.reduce((a, b) => a + b, 0);
    const isCurrentWeek = week === getISOWeek(today) && year === today.getFullYear();
    const todayIso = today.toISOString().slice(0,10);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-clock" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Urenregistratie</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>Registreer je werkuren per week</div>
                    </div>
                </div>
            </div>
        <div style={{ padding: '16px' }}>
            {/* Week navigatie */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', background: '#fff', borderRadius: '16px', padding: '8px 8px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <button onClick={prevWeek} style={{ background: '#f8fafc', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', letterSpacing: '-0.01em' }}>Week {week}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>{days[0].date} – {days[4].date} {year}</div>
                </div>
                <button onClick={nextWeek} style={{ background: '#f8fafc', border: 'none', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-right" />
                </button>
            </div>

            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.77rem', fontWeight: 700, padding: '5px 11px', borderRadius: '999px', background: status === 'ingediend' ? '#dcfce7' : '#fef9c3', color: status === 'ingediend' ? '#16a34a' : '#92400e', border: `1px solid ${status === 'ingediend' ? '#bbf7d0' : '#fde68a'}` }}>
                    <i className={`fa-solid ${status === 'ingediend' ? 'fa-circle-check' : 'fa-circle-half-stroke'}`} style={{ fontSize: '0.7rem' }} />
                    {status === 'ingediend' ? 'Ingediend' : 'Concept'}
                </span>
                <span style={{ fontSize: '0.78rem', color: weekTotal >= 37.5 ? '#10b981' : '#94a3b8', fontWeight: weekTotal >= 37.5 ? 700 : 400 }}>{weekTotal.toFixed(1)}u / 37,5u</span>
                {saved && <span style={{ fontSize: '0.73rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}><i className="fa-solid fa-check" />Opgeslagen</span>}
            </div>

            {/* Uren-type tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                {UREN_TYPES.map(t => (
                    <button key={t.id} onClick={() => setActiveType(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px',
                        borderRadius: '999px', border: `2px solid ${activeType === t.id ? t.color : '#e2e8f0'}`,
                        background: activeType === t.id ? t.color : '#fff',
                        color: activeType === t.id ? '#fff' : '#94a3b8',
                        fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                    }}>
                        <i className={`fa-solid ${t.icon}`} />
                        {t.label}
                    </button>
                ))}
                <button onClick={() => setKmMode(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px',
                    borderRadius: '999px', border: `2px solid ${kmMode ? '#06b6d4' : '#e2e8f0'}`,
                    background: kmMode ? '#06b6d4' : '#fff', color: kmMode ? '#fff' : '#94a3b8',
                    fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                }}>
                    <i className="fa-solid fa-car" />KM
                </button>
            </div>

            {/* Dag headers */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', paddingLeft: '4px' }}>
                <div style={{ width: '80px', flexShrink: 0 }} />
                {days.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: d.iso === todayIso ? '#F5850A' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.short}</div>
                        <div style={{ fontSize: '0.62rem', color: d.iso === todayIso ? '#F5850A' : '#cbd5e1', fontWeight: d.iso === todayIso ? 600 : 400 }}>{d.date}</div>
                    </div>
                ))}
                <div style={{ width: '28px', flexShrink: 0 }} />
            </div>

            {/* Rows */}
            {rows.map((row, ri) => {
                const proj = projects.find(p => p.id === row.projectId);
                const vals = kmMode ? (row.km || ['','','','','']) : (row.types[activeType] || ['','','','','']);
                const rowTotal = kmMode
                    ? vals.reduce((a,v) => a + (parseFloat(String(v).replace(',','.')) || 0), 0)
                    : Object.values(row.types || {}).reduce((acc, arr) => acc + arr.reduce((s, v) => s + parseVal(v), 0), 0);

                return (
                    <div key={row.id} style={{ background: '#fff', borderRadius: '14px', padding: '13px', marginBottom: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}>
                        {/* Project selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <select value={row.projectId} onChange={e => updateProject(ri, e.target.value)}
                                style={{ flex: 1, padding: '9px 10px', border: `1.5px solid ${row.projectId ? '#FA9F52' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600, color: row.projectId ? '#1e293b' : '#94a3b8', background: row.projectId ? '#fff8f0' : '#fff', cursor: 'pointer' }}>
                                <option value="">— Selecteer project —</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: rowTotal > 0 ? '#F5850A' : '#cbd5e1', minWidth: '40px', textAlign: 'right', letterSpacing: '-0.02em' }}>
                                {rowTotal > 0 ? (kmMode ? rowTotal + 'km' : rowTotal.toFixed(1) + 'u') : '—'}
                            </div>
                            {rows.length > 1 && (
                                <button onClick={() => removeRow(ri)} style={{ background: '#fef2f2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', padding: '7px 8px', fontSize: '0.82rem' }}>
                                    <i className="fa-solid fa-trash" />
                                </button>
                            )}
                        </div>

                        {/* Dag invoer */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', paddingLeft: '4px' }}>
                            <div style={{ width: '76px', flexShrink: 0, fontSize: '0.7rem', color: '#94a3b8', alignSelf: 'center', fontWeight: 700 }}>
                                {kmMode ? 'Km' : UREN_TYPES.find(t => t.id === activeType)?.label}
                            </div>
                            {days.map((d, di) => (
                                <div key={di} style={{ flex: 1 }}>
                                    <input
                                        type="number" min="0" max={kmMode ? 999 : 24} step={kmMode ? 1 : 0.5}
                                        value={vals[di] || ''}
                                        onChange={e => kmMode ? updateKm(ri, di, e.target.value) : updateVal(ri, di, e.target.value)}
                                        style={{
                                            width: '100%', textAlign: 'center', padding: '9px 2px',
                                            border: `1.5px solid ${d.iso === todayIso ? '#FA9F52' : '#e8edf2'}`,
                                            borderRadius: '9px', fontSize: '0.87rem', fontWeight: 700,
                                            background: d.iso === todayIso ? '#fff8f0' : '#fafafa',
                                            color: '#1e293b', boxSizing: 'border-box',
                                        }}
                                        placeholder="–"
                                    />
                                </div>
                            ))}
                            <div style={{ width: '28px', flexShrink: 0 }} />
                        </div>

                        {/* Notitie velden */}
                        {!kmMode && (
                            <div style={{ display: 'flex', gap: '4px', paddingLeft: '4px' }}>
                                <div style={{ width: '76px', flexShrink: 0, fontSize: '0.63rem', color: '#cbd5e1', alignSelf: 'center', fontWeight: 600 }}>Notitie</div>
                                {days.map((d, di) => (
                                    <div key={di} style={{ flex: 1 }}>
                                        <input
                                            type="text"
                                            value={(row.notes[activeType] || [])[di] || ''}
                                            onChange={e => updateNote(ri, di, e.target.value)}
                                            style={{ width: '100%', padding: '4px 2px', border: '1px solid #f1f5f9', borderRadius: '6px', fontSize: '0.65rem', color: '#64748b', boxSizing: 'border-box', background: '#f8fafc' }}
                                            placeholder="..."
                                        />
                                    </div>
                                ))}
                                <div style={{ width: '28px', flexShrink: 0 }} />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Voeg project toe */}
            <button onClick={addRow} style={{ width: '100%', padding: '13px', background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '14px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <i className="fa-solid fa-plus" />Project toevoegen
            </button>

            {/* Dag totalen */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '12px 13px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: '4px', paddingLeft: '4px' }}>
                    <div style={{ width: '76px', flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: '#64748b', alignSelf: 'center' }}>Dag totaal</div>
                    {dayTotals.map((t, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.83rem', fontWeight: 800, color: t > 0 ? '#F5850A' : '#e2e8f0', padding: '6px 0', letterSpacing: '-0.01em' }}>
                            {t > 0 ? t.toFixed(1) : '—'}
                        </div>
                    ))}
                    <div style={{ width: '28px', flexShrink: 0, textAlign: 'center', fontSize: '0.83rem', fontWeight: 900, color: '#F5850A', alignSelf: 'center', letterSpacing: '-0.02em' }}>
                        {weekTotal.toFixed(1)}
                    </div>
                </div>
            </div>

            {/* Indienen knop */}
            <button onClick={submit} style={{
                width: '100%', padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                background: status === 'ingediend' ? '#f1f5f9' : 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)',
                color: status === 'ingediend' ? '#64748b' : '#fff',
                fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em',
                boxShadow: status === 'ingediend' ? 'none' : '0 6px 20px rgba(245,133,10,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'opacity 0.15s',
            }}>
                {status === 'ingediend'
                    ? <><i className="fa-solid fa-rotate-left" />Terugzetten naar concept</>
                    : <><i className="fa-solid fa-paper-plane" />Week indienen</>
                }
            </button>
        </div>
        </div>
    );
}
