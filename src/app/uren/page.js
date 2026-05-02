'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/Toast';

// == Datum helpers ==
const DAY_NAMES = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getMondayOfWeek(week, year) {
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday;
}

function getDaysForWeek(week, year) {
    const monday = getMondayOfWeek(week, year);
    return DAY_NAMES.map((name, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { short: name, date: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}` };
    });
}

const UREN_TYPES = [
    { id: 'normaal',           label: 'Project uren',      icon: 'fa-paint-roller',    color: '#F5850A' },
    { id: 'meerwerk',          label: 'Extra werk',         icon: 'fa-plus-minus',      color: '#f59e0b' },
    { id: 'oplevering',        label: 'Oplevering',        icon: 'fa-flag-checkered',  color: '#06b6d4' },
    { id: 'werkvoorbereiding', label: 'Werkvoorbereiding', icon: 'fa-clipboard-list',  color: '#6366f1' },
    { id: 'ziek',              label: 'Ziek',              icon: 'fa-briefcase-medical', color: '#ef4444' },
    { id: 'vrij',              label: 'Vrij',              icon: 'fa-umbrella-beach',  color: '#8b5cf6' },
];

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

// == PROJECT DROPDOWN ==
function ProjectSelect({ value, onChange, onRemove, canRemove }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const projects = getAppProjects();
    const selected = projects.find(p => p.id === value);
    const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <div
                    onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
                    style={{
                        padding: '6px 10px',
                        background: '#fff', border: '1px solid var(--border-color)',
                        borderRadius: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontWeight: 600, fontSize: '0.85rem', color: '#1e293b'
                    }}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selected ? selected.name : 'Selecteer project...'}
                    </span>
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.6rem', color: 'var(--text-grey)', marginLeft: '8px', flexShrink: 0 }}></i>
                </div>
                {isOpen && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsOpen(false)} />
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: '2px', maxHeight: '200px',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{ padding: '6px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <input type="text" placeholder="Zoek..." value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()} autoFocus
                                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.82rem', border: '1px solid var(--accent)', borderRadius: '5px', outline: 'none' }}
                                />
                            </div>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto' }}>
                                {filtered.map(p => (
                                    <li key={p.id}
                                        onClick={() => { onChange(p.id); setIsOpen(false); }}
                                        style={{
                                            padding: '7px 12px', fontSize: '0.82rem', cursor: 'pointer',
                                            background: p.id === value ? 'rgba(250,160,82,0.1)' : 'transparent',
                                            fontWeight: p.id === value ? 600 : 'normal'
                                        }}
                                        onMouseOver={e => { if (p.id !== value) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                                        onMouseOut={e => { if (p.id !== value) e.currentTarget.style.background = 'transparent'; }}
                                    >{p.name}</li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
            {canRemove && (
                <button onClick={onRemove} title="Verwijderen"
                    style={{
                        width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                        border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)',
                        color: '#ef4444', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                    }}
                >
                    <i className="fa-solid fa-trash-can"></i>
                </button>
            )}
        </div>
    );
}

// == TYPE TOEVOEGEN MENU ==
function AddTypeMenu({ existingTypes, onAdd }) {
    const [open, setOpen] = useState(false);
    const available = UREN_TYPES.filter(t => t.id !== 'normaal' && !existingTypes.includes(t.id));
    if (available.length === 0) return null;

    return (
        <div style={{ position: 'relative', marginTop: '4px' }}>
            <button onClick={() => setOpen(!open)}
                style={{
                    width: '100%', padding: '4px', border: '1px dashed var(--border-color)',
                    borderRadius: '5px', background: 'transparent', color: 'var(--text-grey)',
                    cursor: 'pointer', fontSize: '0.72rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'flex-start', gap: '4px'
                }}
                onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'var(--text-grey)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
                <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem' }}></i> Type toevoegen
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginBottom: '4px',
                        zIndex: 100, minWidth: '180px', padding: '4px'
                    }}>
                        {available.map(type => (
                            <div key={type.id}
                                onClick={() => { onAdd(type.id); setOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '6px 10px', borderRadius: '5px', cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <i className={`fa-solid ${type.icon}`} style={{ color: type.color, fontSize: '0.7rem', width: '14px', textAlign: 'center' }}></i>
                                <span>{type.label}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// == DAG GRID — dynamisch aantal kolommen ==
const dayGridStyle = (count = 7) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${count}, 1fr)`,
    gap: '6px',
});

function DayGrid({ hours, notes = [], onChangeHour, onChangeNote, color = 'var(--accent)', showWeekend = true, days = [], todayIdx = -1 }) {
    const visibleDays = showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
    const [editIdx, setEditIdx] = useState(null);
    const [noteIdx, setNoteIdx] = useState(null);
    const [hoveredIdx, setHoveredIdx] = useState(null);

    return (
        <div style={dayGridStyle(visibleDays.length)}>
            {visibleDays.map(i => {
                const day = days[i] || { short: DAY_NAMES[i], date: '' };
                const val = hours[i] || '';
                const num = parseFloat(String(val).replace(',', '.')) || 0;
                const filled = num > 0;
                const weekend = i >= 5;
                const editing = editIdx === i;
                const isToday = i === todayIdx;
                const hasNote = notes[i] && notes[i].trim().length > 0;
                const showCorner = hoveredIdx === i || hasNote || noteIdx === i;

                let bgColor = '#fff';
                let borderStyle = `1px solid ${weekend ? 'rgba(250,160,82,0.25)' : 'var(--border-color)'}`;
                if (hasNote) {
                    bgColor = 'rgba(250,160,82,0.12)';
                    borderStyle = '2px solid var(--accent)';
                } else if (filled) {
                    bgColor = `${color}12`;
                    borderStyle = `2px solid ${color}`;
                } else if (isToday && !filled) {
                    bgColor = 'rgba(59,130,246,0.06)';
                    borderStyle = '2px dashed rgba(59,130,246,0.4)';
                } else if (editing) {
                    borderStyle = `2px solid ${color}`;
                } else if (weekend) {
                    bgColor = 'rgba(250,160,82,0.03)';
                }

                return (
                    <div key={i}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        style={{
                            height: '44px', borderRadius: '8px', cursor: 'pointer',
                            border: borderStyle, background: bgColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s', position: 'relative', overflow: 'hidden'
                        }}
                        onClick={() => setEditIdx(i)}
                    >
                        {editing ? (
                            <input type="text" autoFocus value={val} placeholder="0"
                                onChange={e => onChangeHour(i, e.target.value)}
                                onBlur={() => setEditIdx(null)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); setEditIdx(i < 6 ? i + 1 : null); } }}
                                style={{
                                    width: '100%', height: '100%', textAlign: 'center',
                                    border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: '1rem', fontWeight: 700, color: hasNote ? 'var(--accent-deep)' : color
                                }}
                            />
                        ) : filled ? (
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: hasNote ? 'var(--accent-deep)' : color }}>{num}</span>
                        ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: isToday ? 'rgba(59,130,246,0.5)' : 'rgba(0,0,0,0.12)' }}>—</span>
                        )}

                        {/* Oranje hoekje (driehoek rechtsboven) */}
                        {showCorner && onChangeNote && (
                            <div
                                onClick={(e) => { e.stopPropagation(); setNoteIdx(noteIdx === i ? null : i); }}
                                title={hasNote ? notes[i] : 'Opmerking toevoegen'}
                                style={{
                                    position: 'absolute', top: 0, right: 0,
                                    width: '0', height: '0',
                                    borderTop: `12px solid ${hasNote ? 'var(--accent)' : 'rgba(250,160,82,0.4)'}`,
                                    borderLeft: '12px solid transparent',
                                    cursor: 'pointer', zIndex: 2,
                                    transition: 'border-color 0.15s'
                                }}
                            />
                        )}

                        {/* Notitie modaal venster */}
                        {noteIdx === i && onChangeNote && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.4)' }} onClick={(e) => { e.stopPropagation(); setNoteIdx(null); }} />
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        zIndex: 1000,
                                        background: '#fff', borderRadius: '14px',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                                        padding: '24px', width: '400px', maxWidth: '90vw'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fa-regular fa-comment" style={{ color: 'var(--accent)' }}></i>
                                            Opmerking — {day.short} {day.date}
                                        </h3>
                                        <button onClick={(e) => { e.stopPropagation(); setNoteIdx(null); }} style={{
                                            background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-grey)',
                                            cursor: 'pointer', padding: '4px', lineHeight: 1
                                        }}>
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={notes[i] || ''}
                                        placeholder="Typ hier je opmerking...&#10;Bijv. reistijd, wachttijd, extra werk..."
                                        onChange={(e) => onChangeNote(i, e.target.value)}
                                        rows={5}
                                        style={{
                                            width: '100%', padding: '12px 14px', fontSize: '0.95rem',
                                            border: '2px solid var(--border-color)', borderRadius: '8px',
                                            outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                                            lineHeight: 1.5, color: '#1e293b', background: '#fafafa',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#fff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = '#fafafa'; }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); onChangeNote(i, ''); setNoteIdx(null); }}
                                            style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="fa-solid fa-trash-can"></i>Wissen
                                        </button>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={(e) => { e.stopPropagation(); setNoteIdx(null); }}
                                                className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                                Sluiten
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setNoteIdx(null); }}
                                                className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                                                <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>Opslaan
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// == HOOFD PAGINA ==
export default function UrenPage() {
    const today = new Date();
    const currentWeekNum = getISOWeekNumber(today);
    const currentYearNum = today.getFullYear();
    useEffect(() => { document.title = 'Uren & Verlof | SchildersApp Katwijk'; }, []);

    // Ingelogde gebruiker (voor persoonlijke localStorage-sleutels)
    const { user } = useAuth();
    const toast = useToast();
    const userName = (user?.name || 'Onbekend').replace(/\s/g, '_');
    // Vakantie-sleutel: gebruikerspecifiek zodat iedere medewerker zijn eigen data heeft
    // én zodat de bezettingsplanner (die _YEAR_NAME leest) de data direct vindt
    const vacKey = `schildersapp_vakantie_${currentYearNum}_${userName}`;

    // Vandaag-index (0=Ma, 1=Di, ..., 6=Zo) voor huidige week highlight
    const todayDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1; // JS: 0=Zo, convert to 0=Ma

    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const isBeheerder = user?.role === 'Beheerder';
    const [activeTab, setActiveTab] = useState(tabFromUrl === 'planner' ? 'planner' : tabFromUrl === 'overzicht' ? 'overzicht' : tabFromUrl === 'goedkeuring' ? 'goedkeuring' : 'verlof');
    // Sync tab when URL params change (sidebar navigation)
    useEffect(() => {
        if (tabFromUrl === 'planner') setActiveTab('planner');
        else if (tabFromUrl === 'overzicht') setActiveTab('overzicht');
        else if (tabFromUrl === 'goedkeuring') setActiveTab('goedkeuring');
        else setActiveTab('verlof');
    }, [tabFromUrl]);

    // Verlof goedkeuring (beheerder)
    const [verlofAanvragen, setVerlofAanvragen] = useState([]);
    const [verlofLaden, setVerlofLaden] = useState(false);
    useEffect(() => {
        if (!isBeheerder) return;
        setVerlofLaden(true);
        fetch(`/api/verlof?jaar=${currentYearNum}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => { setVerlofAanvragen(Array.isArray(data) ? data : []); setVerlofLaden(false); })
            .catch(() => setVerlofLaden(false));
    }, [isBeheerder, currentYearNum]); // eslint-disable-line react-hooks/exhaustive-deps

    const keurVerlof = async (id, status) => {
        try {
            const res = await fetch('/api/verlof', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            if (!res.ok) throw new Error();
            setVerlofAanvragen(prev => prev.map(v => v.id === id ? { ...v, status } : v));
            toast.success(status === 'Goedgekeurd' ? 'Verlof goedgekeurd' : 'Verlof afgewezen');
        } catch {
            toast.error('Opslaan mislukt — probeer opnieuw');
        }
    };
    const [showWeekend, setShowWeekend] = useState(false);
    const [weekNum, setWeekNum] = useState(currentWeekNum);
    const [yearNum, setYearNum] = useState(currentYearNum);
    const [weekStatus, setWeekStatus] = useState('concept'); // concept | ingediend
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Vakantiedagen state — laad vanuit API, dan localStorage
    const [selectedVacDays, setSelectedVacDays] = useState([]);
    useEffect(() => {
        if (!user) return;
        fetch(`/api/vakantiedagen?userId=${user.id}&jaar=${currentYearNum}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setSelectedVacDays(data);
                    localStorage.setItem(vacKey, JSON.stringify(data));
                } else {
                    try {
                        const existing = JSON.parse(localStorage.getItem(vacKey));
                        if (existing) { setSelectedVacDays(existing); return; }
                        const old = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${currentYearNum}`));
                        if (old) setSelectedVacDays(old);
                    } catch {}
                }
            })
            .catch(() => {
                try {
                    const existing = JSON.parse(localStorage.getItem(vacKey));
                    if (existing) setSelectedVacDays(existing);
                } catch {}
            });
    }, [user?.id, vacKey]); // eslint-disable-line react-hooks/exhaustive-deps
    const toggleVacDay = (dateStr) => {
        setSelectedVacDays(prev => {
            const next = prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr];
            localStorage.setItem(vacKey, JSON.stringify(next));
            fetch('/api/vakantiedagen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, jaar: currentYearNum, dagen: next }) }).catch(() => {});
            return next;
        });
    };

    // Feestdagen beheer state
    const [showHolidayAdmin, setShowHolidayAdmin] = useState(false);
    // Build holiday definitions (Pasen 2026 = 5 april)
    const YEAR = today.getFullYear();
    const easter = new Date(YEAR, 3, 5);
    const addD = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const fmtD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ALL_HOLIDAYS = [
        { key: `${YEAR}-01-01`, name: 'Nieuwjaarsdag', date: '1 januari' },
        { key: fmtD(addD(easter, -2)), name: 'Goede Vrijdag', date: fmtD(addD(easter, -2)).slice(5) },
        { key: fmtD(easter), name: '1e Paasdag', date: fmtD(easter).slice(5) },
        { key: fmtD(addD(easter, 1)), name: '2e Paasdag', date: fmtD(addD(easter, 1)).slice(5) },
        { key: `${YEAR}-04-27`, name: 'Koningsdag', date: '27 april' },
        { key: `${YEAR}-05-05`, name: 'Bevrijdingsdag', date: '5 mei' },
        { key: fmtD(addD(easter, 39)), name: 'Hemelvaartsdag', date: fmtD(addD(easter, 39)).slice(5) },
        { key: fmtD(addD(easter, 49)), name: '1e Pinksterdag', date: fmtD(addD(easter, 49)).slice(5) },
        { key: fmtD(addD(easter, 50)), name: '2e Pinksterdag', date: fmtD(addD(easter, 50)).slice(5) },
        { key: `${YEAR}-12-25`, name: '1e Kerstdag', date: '25 december' },
        { key: `${YEAR}-12-26`, name: '2e Kerstdag', date: '26 december' },
    ];
    
    // Eigen feestdagen
    const [customHolidays, setCustomHolidays] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`schildersapp_custom_holidays_${YEAR}`)) || []; } catch { return []; }
    });
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');

    const COMBINED_HOLIDAYS = [...ALL_HOLIDAYS, ...customHolidays].sort((a, b) => a.key.localeCompare(b.key));
    const defaultEnabled = Object.fromEntries(COMBINED_HOLIDAYS.map(h => [h.key, true]));
    const [enabledHolidays, setEnabledHolidays] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(`schildersapp_feestdagen_${YEAR}`));
            return stored || defaultEnabled;
        } catch { return defaultEnabled; }
    });
    const toggleHoliday = (key) => {
        setEnabledHolidays(prev => {
            const next = { ...prev, [key]: !prev[key] };
            localStorage.setItem(`schildersapp_feestdagen_${YEAR}`, JSON.stringify(next));
            return next;
        });
    };

    const addCustomHoliday = () => {
        if (!newHolidayName || !newHolidayDate) return;
        const [y, m, d] = newHolidayDate.split('-');
        const mNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
        const dateStr = `${parseInt(d)} ${mNames[parseInt(m)-1]}`;
        const item = { key: newHolidayDate, name: newHolidayName, date: dateStr, isCustom: true };
        const updated = [...customHolidays, item].sort((a,b) => a.key.localeCompare(b.key));
        setCustomHolidays(updated);
        localStorage.setItem(`schildersapp_custom_holidays_${YEAR}`, JSON.stringify(updated));
        
        setEnabledHolidays(prev => {
            const next = { ...prev, [newHolidayDate]: true };
            localStorage.setItem(`schildersapp_feestdagen_${YEAR}`, JSON.stringify(next));
            return next;
        });
        setNewHolidayName('');
        setNewHolidayDate('');
    };

    const removeCustomHoliday = (key) => {
        const updated = customHolidays.filter(h => h.key !== key);
        setCustomHolidays(updated);
        localStorage.setItem(`schildersapp_custom_holidays_${YEAR}`, JSON.stringify(updated));
    };

    const DAYS = getDaysForWeek(weekNum, yearNum);
    const isCurrentWeek = weekNum === currentWeekNum && yearNum === currentYearNum;
    const todayIdx = isCurrentWeek ? todayDayIdx : -1; // Only highlight today in current week

    const prevWeek = () => {
        if (weekNum <= 1) { setWeekNum(52); setYearNum(yearNum - 1); }
        else setWeekNum(weekNum - 1);
    };
    const nextWeek = () => {
        if (weekNum >= 52) { setWeekNum(1); setYearNum(yearNum + 1); }
        else setWeekNum(weekNum + 1);
    };
    const goCurrentWeek = () => { setWeekNum(currentWeekNum); setYearNum(currentYearNum); };

    // Default projects
    const defaultProjects = [
        { id: 'p1', projectId: '1', types: { normaal: Array(7).fill('') }, notes: { normaal: Array(7).fill('') } },
    ];

    const [projects, setProjects] = useState(defaultProjects);

    // localStorage persistence per week
    const storageKey = `schildersapp_uren_w${weekNum}_${yearNum}`;
    const statusKey = `schildersapp_uren_status_w${weekNum}_${yearNum}`;

    // Load from localStorage on week change
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setProjects(JSON.parse(saved));
            } else {
                setProjects(defaultProjects);
            }
            const savedStatus = localStorage.getItem(statusKey);
            setWeekStatus(savedStatus || 'concept');
        } catch { setProjects(defaultProjects); }
    }, [weekNum, yearNum]);

    // Save to localStorage on project changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(projects));
        } catch { }
    }, [projects, storageKey]);

    // Quick-fill: 7.5u × 5 werkdagen for the first type of each project
    const quickFill = () => {
        setProjects(prev => prev.map(p => {
            const firstType = Object.keys(p.types)[0];
            if (!firstType) return p;
            const newTypes = { ...p.types };
            newTypes[firstType] = newTypes[firstType].map((h, i) => i < 5 ? '7.5' : (h || ''));
            return { ...p, types: newTypes };
        }));
    };

    // Leegmaken: reset alle uren + status
    const clearWeek = () => {
        if (!confirm('Weet je zeker dat je de weekstaat wilt leegmaken?')) return;
        setProjects(defaultProjects);
        setWeekStatus('concept');
        localStorage.removeItem(statusKey);
    };

    // Submit handler
    const handleSubmit = () => {
        setWeekStatus('ingediend');
        localStorage.setItem(statusKey, 'ingediend');
        setShowSubmitModal(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    };

    const addProject = () => setProjects([...projects, { id: 'p' + Date.now(), projectId: null, types: { normaal: Array(7).fill('') }, notes: { normaal: Array(7).fill('') } }]);
    const removeProject = (i) => { if (projects.length > 1) setProjects(projects.filter((_, idx) => idx !== i)); };
    const changeProjectId = (i, id) => { const u = [...projects]; u[i].projectId = id; setProjects(u); };
    const addType = (pi, typeId) => { const u = [...projects]; u[pi].types[typeId] = Array(7).fill(''); u[pi].notes = u[pi].notes || {}; u[pi].notes[typeId] = Array(7).fill(''); setProjects(u); };
    const removeType = (pi, typeId) => { const u = [...projects]; delete u[pi].types[typeId]; if (u[pi].notes) delete u[pi].notes[typeId]; setProjects(u); };
    const changeHours = (pi, typeId, hours) => { const u = [...projects]; u[pi].types[typeId] = hours; setProjects(u); };
    const changeNotes = (pi, typeId, notes) => { const u = [...projects]; u[pi].notes = u[pi].notes || {}; u[pi].notes[typeId] = notes; setProjects(u); };

    const parseVal = (v) => parseFloat(String(v).replace(',', '.')) || 0;

    // Totalen
    const dayTotals = Array(7).fill(0);
    const klusTotals = Array(7).fill(0);
    projects.forEach(p => Object.entries(p.types).forEach(([t, hrs]) => {
        hrs.forEach((h, d) => {
            const v = parseVal(h);
            if (t === 'werkvoorbereiding') klusTotals[d] += v;
            else if (t !== 'ziek' && t !== 'vrij') dayTotals[d] += v;
        });
    }));
    const extraUren = dayTotals.map(v => v > 7.5 ? +(v - 7.5).toFixed(1) : 0);
    const cappedWeek = dayTotals.map(v => +Math.min(v, 7.5).toFixed(1));
    const sumWeek = cappedWeek.reduce((a, b) => a + b, 0);
    const sumExtra = extraUren.reduce((a, b) => a + b, 0);
    const sumKlus = klusTotals.reduce((a, b) => a + b, 0);

    return (
        <div className="content-area">
            <div className="page-header" style={{ marginBottom: '16px' }}>
                <h1 style={{ marginBottom: '4px', fontSize: '1.6rem' }}>Uren & Verlof</h1>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>Registreer je gewerkte uren of vraag vrije dagen aan.</p>
            </div>

            <div className="tab-nav" style={{ marginBottom: '14px' }}>
                <button className={`tab-btn${activeTab === 'verlof' ? ' active' : ''}`} onClick={() => setActiveTab('verlof')}>Verlof Aanvragen</button>
                <button className={`tab-btn${activeTab === 'planner' ? ' active' : ''}`} onClick={() => setActiveTab('planner')}>Personeelsplanner</button>
                <button className={`tab-btn${activeTab === 'overzicht' ? ' active' : ''}`} onClick={() => setActiveTab('overzicht')}>
                    <i className="fa-solid fa-table-list" style={{ marginRight: '6px' }} />Totaal Overzicht
                </button>
                {isBeheerder && (
                    <button className={`tab-btn${activeTab === 'goedkeuring' ? ' active' : ''}`} onClick={() => setActiveTab('goedkeuring')} style={{ position: 'relative' }}>
                        <i className="fa-solid fa-clipboard-check" style={{ marginRight: '6px' }} />Verlof Goedkeuren
                        {verlofAanvragen.filter(v => v.status === 'In behandeling').length > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', minWidth: '16px', textAlign: 'center' }}>
                                {verlofAanvragen.filter(v => v.status === 'In behandeling').length}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {activeTab === 'uren' && (
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>

                    {/* ═══ PROGRESS BAR ═══ */}
                    {(() => {
                        const totalFilled = dayTotals.reduce((a, b) => a + b, 0);
                        const target = 37.5;
                        const pct = Math.min((totalFilled / target) * 100, 100);
                        const barColor = pct >= 100 ? '#22c55e' : pct >= 50 ? '#FA9F52' : '#ef4444';
                        return (
                            <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ flex: 1, height: '10px', borderRadius: '5px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '5px', width: `${pct}%`,
                                        background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
                                        transition: 'width 0.4s ease, background 0.3s'
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: barColor, whiteSpace: 'nowrap', minWidth: '100px', textAlign: 'right' }}>
                                    {totalFilled} / {target}u ({Math.round(pct)}%)
                                </span>
                            </div>
                        );
                    })()}

                    {/* ═══ WEEK HEADER ═══ */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '460px 380px 60px', columnGap: '25px',
                        alignItems: 'center',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.01)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                                <i className="fa-regular fa-calendar" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                                Weekstaat — Week {weekNum} {yearNum !== currentYearNum ? `(${yearNum})` : ''}
                            </span>
                            {/* Status badge */}
                            <span style={{
                                padding: '3px 12px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px',
                                textTransform: 'uppercase',
                                background: weekStatus === 'ingediend' ? 'rgba(34,197,94,0.1)' : 'rgba(250,160,82,0.1)',
                                color: weekStatus === 'ingediend' ? '#16a34a' : '#F5850A',
                                border: `1px solid ${weekStatus === 'ingediend' ? 'rgba(34,197,94,0.3)' : 'rgba(250,160,82,0.3)'}`,
                            }}>
                                {weekStatus === 'ingediend' ? '✓ Ingediend' : '● Concept'}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={prevWeek} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}><i className="fa-solid fa-chevron-left"></i></button>
                                <button onClick={goCurrentWeek} className={`btn ${isCurrentWeek ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Huidige</button>
                                <button onClick={nextWeek} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}><i className="fa-solid fa-chevron-right"></i></button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* Quick-fill button */}
                            <button onClick={quickFill}
                                className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                                title="Vul 7.5u per werkdag in">
                                <i className="fa-solid fa-bolt" style={{ fontSize: '0.7rem', color: '#f59e0b' }}></i>
                                7.5u × 5
                            </button>
                            {/* Leegmaken button — alleen in concept modus */}
                            {weekStatus !== 'ingediend' && (
                                <button onClick={clearWeek}
                                    className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    title="Weekstaat leegmaken">
                                    <i className="fa-solid fa-eraser" style={{ fontSize: '0.7rem', color: '#ef4444' }}></i>
                                    Leegmaken
                                </button>
                            )}
                            <button onClick={() => setShowWeekend(!showWeekend)}
                                className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <i className={`fa-solid fa-${showWeekend ? 'eye-slash' : 'eye'}`} style={{ fontSize: '0.7rem' }}></i>
                                {showWeekend ? 'Za/Zo verbergen' : 'Za/Zo tonen'}
                            </button>
                        </div>
                        <div></div>
                    </div>

                    {/* Spacer */}
                    <div style={{ height: '8px' }}></div>

                    {/* ═══ DAG HEADER ROW ═══ */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '460px 380px 60px', columnGap: '25px',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.015)'
                    }}>
                        <div style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Project
                        </div>
                        <div style={{ ...dayGridStyle(showWeekend ? 7 : 5), padding: '6px 8px' }}>
                            {(showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]).map(i => (
                                <div key={i} style={{
                                    textAlign: 'center', fontSize: '0.82rem', fontWeight: i === todayIdx ? 800 : 600,
                                    color: i === todayIdx ? '#3b82f6' : (i >= 5 ? 'var(--accent)' : 'var(--text-grey)'),
                                    textTransform: 'uppercase', letterSpacing: '0.3px',
                                    borderBottom: i === todayIdx ? '2px solid #3b82f6' : '2px solid transparent',
                                    paddingBottom: '2px', borderRadius: '0'
                                }}>
                                    {DAYS[i].short} <span style={{ fontWeight: 400, fontSize: '0.72rem', display: 'block', opacity: i === todayIdx ? 1 : 0.7 }}>{DAYS[i].date}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-grey)', textTransform: 'uppercase' }}>
                            Tot.
                        </div>
                    </div>

                    {/* ═══ PROJECT RIJEN ═══ */}
                    {projects.map((proj, pi) => {
                        const projTotal = Object.entries(proj.types).reduce((sum, [t, hrs]) => {
                            if (t === 'werkvoorbereiding' || t === 'ziek' || t === 'vrij') return sum;
                            return sum + hrs.reduce((a, h) => a + parseVal(h), 0);
                        }, 0);

                        return (
                            <div key={proj.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {Object.entries(proj.types).map(([typeId, hours], typeIdx) => {
                                    const typeInfo = UREN_TYPES.find(t => t.id === typeId);
                                    const typeTotal = hours.reduce((a, h) => a + parseVal(h), 0);
                                    const isFirst = typeIdx === 0;

                                    return (
                                        <div key={typeId} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '460px 380px 60px', columnGap: '25px',
                                            alignItems: 'center',
                                            borderBottom: typeIdx < Object.keys(proj.types).length - 1 ? '1px dashed rgba(0,0,0,0.05)' : 'none'
                                        }}>
                                            {/* Label kolom */}
                                            <div style={{ padding: '10px 20px' }}>
                                                {isFirst ? (
                                                    <ProjectSelect
                                                        value={proj.projectId}
                                                        onChange={(id) => changeProjectId(pi, id)}
                                                        onRemove={() => removeProject(pi)}
                                                        canRemove={projects.length > 1}
                                                    />
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
                                                        <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.65rem', color: typeInfo.color, width: '14px', textAlign: 'center' }}></i>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: typeInfo.color }}>{typeInfo.label}</span>
                                                        <button onClick={() => removeType(pi, typeId)} style={{
                                                            marginLeft: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                                            color: '#ef4444', cursor: 'pointer', fontSize: '0.65rem',
                                                            padding: '3px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center',
                                                            transition: 'all 0.15s'
                                                        }}
                                                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                                                        >
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Dag grid */}
                                            <div style={{ padding: '6px 8px' }}>
                                                <DayGrid
                                                    hours={hours}
                                                    notes={(proj.notes && proj.notes[typeId]) || []}
                                                    color={typeInfo.color}
                                                    showWeekend={showWeekend}
                                                    days={DAYS}
                                                    todayIdx={todayIdx}
                                                    onChangeHour={(d, v) => {
                                                        const nh = [...hours]; nh[d] = v;
                                                        changeHours(pi, typeId, nh);
                                                    }}
                                                    onChangeNote={(d, v) => {
                                                        const nn = [...((proj.notes && proj.notes[typeId]) || Array(7).fill(''))];
                                                        nn[d] = v;
                                                        changeNotes(pi, typeId, nn);
                                                    }}
                                                />
                                            </div>

                                            {/* Rij totaal */}
                                            <div style={{
                                                textAlign: 'center', fontWeight: 700,
                                                fontSize: '1rem', padding: '8px 4px',
                                                color: typeTotal > 0 ? typeInfo.color : 'rgba(0,0,0,0.15)'
                                            }}>
                                                {typeTotal > 0 ? typeTotal : '—'}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Type toevoegen */}
                                <div style={{ padding: '0 16px 6px', maxWidth: '750px' }}>
                                    <AddTypeMenu existingTypes={Object.keys(proj.types)} onAdd={(t) => addType(pi, t)} />
                                </div>
                            </div>
                        );
                    })}

                    {/* ═══ PROJECT TOEVOEGEN ═══ */}
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <button onClick={addProject} style={{
                            maxWidth: '750px', padding: '6px', border: '1px dashed var(--border-color)',
                            borderRadius: '6px', background: 'transparent', color: 'var(--text-grey)',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-grey)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                        >
                            <i className="fa-solid fa-plus"></i> Project toevoegen
                        </button>
                    </div>

                    {/* ═══ TOTALEN ═══ */}
                    <div style={{ background: 'rgba(0,0,0,0.02)' }}>
                        {/* Week Totaal */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '460px 380px 60px', columnGap: '25px',
                            alignItems: 'center', borderBottom: '1px solid var(--border-color)',
                            padding: '0'
                        }}>
                            <div style={{ padding: '10px 20px', fontWeight: 700, fontSize: '0.95rem' }}>Week Totaal</div>
                            <div style={{ ...dayGridStyle(showWeekend ? 7 : 5), padding: '6px 8px' }}>
                                {(showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]).map(i => (
                                    <div key={i} style={{
                                        height: '30px', borderRadius: '5px',
                                        background: cappedWeek[i] > 0 ? 'rgba(250,160,82,0.1)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.95rem',
                                        color: cappedWeek[i] > 0 ? 'var(--accent-deep)' : 'rgba(0,0,0,0.12)'
                                    }}>
                                        {cappedWeek[i] > 0 ? cappedWeek[i] : '—'}
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                textAlign: 'center', fontWeight: 800, fontSize: '1.1rem',
                                color: 'var(--accent-deep)',
                                background: 'rgba(250,160,82,0.12)', borderRadius: '6px',
                                padding: '4px 2px', margin: '4px 6px'
                            }}>
                                {sumWeek}
                            </div>
                        </div>

                        {/* Extra uren */}
                        {sumExtra > 0 && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: '460px 380px 60px', columnGap: '25px',
                                alignItems: 'center', borderBottom: '1px solid var(--border-color)'
                            }}>
                                <div style={{ padding: '6px 16px', fontWeight: 600, fontSize: '0.78rem', color: '#ef4444' }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '5px' }}></i>Extra uren
                                </div>
                                <div style={{ ...dayGridStyle(showWeekend ? 7 : 5), padding: '4px 8px' }}>
                                    {(showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]).map(i => (
                                        <div key={i} style={{
                                            height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: extraUren[i] > 0 ? 700 : 400, fontSize: '0.78rem',
                                            color: extraUren[i] > 0 ? '#ef4444' : 'rgba(0,0,0,0.1)'
                                        }}>
                                            {extraUren[i] > 0 ? extraUren[i] : '—'}
                                        </div>
                                    ))}
                                </div>
                                <div style={{
                                    textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#ef4444',
                                    background: 'rgba(239,68,68,0.08)', borderRadius: '5px',
                                    padding: '2px', margin: '2px 6px'
                                }}>
                                    {sumExtra}
                                </div>
                            </div>
                        )}

                        {/* Werkvoorbereiding — alleen zichtbaar als type geselecteerd */}
                        {projects.some(p => 'werkvoorbereiding' in p.types) && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: '460px 380px 60px', columnGap: '25px',
                                alignItems: 'center', borderBottom: '1px solid var(--border-color)'
                            }}>
                                <div style={{ padding: '6px 16px', fontWeight: 600, fontSize: '0.78rem', color: '#6366f1' }}>
                                    <i className="fa-solid fa-clipboard-list" style={{ marginRight: '5px' }}></i>Werkvoorbereiding
                                </div>
                                <div style={{ ...dayGridStyle(showWeekend ? 7 : 5), padding: '4px 8px' }}>
                                    {(showWeekend ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]).map(i => (
                                        <div key={i} style={{
                                            height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: klusTotals[i] > 0 ? 700 : 400, fontSize: '0.78rem',
                                            color: klusTotals[i] > 0 ? '#6366f1' : 'rgba(0,0,0,0.1)'
                                        }}>
                                            {klusTotals[i] > 0 ? klusTotals[i] : '—'}
                                        </div>
                                    ))}
                                </div>
                                <div style={{
                                    textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: sumKlus > 0 ? '#6366f1' : 'rgba(0,0,0,0.12)',
                                    background: sumKlus > 0 ? 'rgba(99,102,241,0.08)' : 'transparent', borderRadius: '5px',
                                    padding: '2px', margin: '2px 6px'
                                }}>
                                    {sumKlus > 0 ? sumKlus : '—'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ INDIENEN ═══ */}
                    <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.01)' }}>
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            disabled={weekStatus === 'ingediend'}
                            className="btn btn-primary"
                            style={{
                                maxWidth: '800px', width: '100%', justifyContent: 'center', padding: '10px',
                                opacity: weekStatus === 'ingediend' ? 0.5 : 1,
                                cursor: weekStatus === 'ingediend' ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {weekStatus === 'ingediend'
                                ? <><i className="fa-solid fa-check-circle"></i> Weekstaat Ingediend</>
                                : <><i className="fa-solid fa-paper-plane"></i> Weekstaat Indienen</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'verlof' && (
                <>
                <div className="panel">
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Verlof Aanvragen</h2>
                        <button onClick={() => setShowHolidayAdmin(!showHolidayAdmin)}
                            className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className={`fa-solid fa-${showHolidayAdmin ? 'times' : 'gear'}`}></i>
                            Feestdagen beheren
                        </button>
                    </div>

                    {/* ═══ FEESTDAGEN BEHEER PANEEL ═══ */}
                    {showHolidayAdmin && (
                        <div style={{
                            margin: '0 0 16px', padding: '16px 20px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(250,160,82,0.05), rgba(250,160,82,0.02))',
                            border: '1px solid rgba(250,160,82,0.2)'
                        }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-calendar-days" style={{ color: '#F5850A' }}></i>
                                Feestdagen {YEAR} — aan/uit
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                                {COMBINED_HOLIDAYS.map(h => (
                                    <div key={h.key} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px 14px', borderRadius: '8px',
                                        background: enabledHolidays[h.key] ? 'rgba(250,160,82,0.08)' : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${enabledHolidays[h.key] ? 'rgba(250,160,82,0.25)' : 'rgba(0,0,0,0.06)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: enabledHolidays[h.key] ? '#1e293b' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {h.name}
                                                {h.isCustom && <i className="fa-solid fa-user-pen" style={{ fontSize: '0.6rem', color: '#cbd5e1' }} title="Zelf toegevoegd" />}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{h.date}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {/* Toggle switch */}
                                            <div onClick={() => toggleHoliday(h.key)} style={{
                                                width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
                                                background: enabledHolidays[h.key] ? '#F5850A' : '#cbd5e1',
                                                position: 'relative', transition: 'background 0.2s',
                                                flexShrink: 0
                                            }}>
                                                <div style={{
                                                    width: '18px', height: '18px', borderRadius: '50%',
                                                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                                    position: 'absolute', top: '3px',
                                                    left: enabledHolidays[h.key] ? '23px' : '3px',
                                                    transition: 'left 0.2s'
                                                }} />
                                            </div>
                                            {h.isCustom && (
                                                <button onClick={() => removeCustomHoliday(h.key)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Toevoegen custom feestdag */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'flex-end', padding: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Nieuwe Feestdag Naam</label>
                                    <input value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} placeholder="Bijv: Carnaval, Bedrijfsuitje..." style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Datum</label>
                                    <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', width: '130px' }} />
                                </div>
                                <button onClick={addCustomHoliday} disabled={!newHolidayName || !newHolidayDate} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: (!newHolidayName || !newHolidayDate) ? '#cbd5e1' : '#F5850A', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: (!newHolidayName || !newHolidayDate) ? 'not-allowed' : 'pointer' }}>
                                    <i className="fa-solid fa-plus" /> Toevoegen
                                </button>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#94a3b8' }}>
                                <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }}></i>
                                Uitgeschakelde feestdagen worden niet meer op de kalender getoond. Wijzigingen worden direct opgeslagen.
                            </div>
                        </div>
                    )}

                    {/* Jaarkalender voor vakantiedagen */}
                    {(() => {
                        const MONTH_LABELS = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
                        const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

                        // Build active holiday set from admin toggles
                        const holidayNames = {};
                        COMBINED_HOLIDAYS.forEach(h => { if (enabledHolidays[h.key]) holidayNames[h.key] = h.name; });
                        const holidaySet = new Set(Object.keys(holidayNames));

                        // Load team vacation data for calendar overlay
                        const teamMembers = [
                            { name: 'Piet Kwast', initials: 'PK', color: '#3b82f6' },
                            { name: 'Klaas Roller', initials: 'KR', color: '#22c55e' },
                            { name: 'Henk de Vries', initials: 'HV', color: '#8b5cf6' },
                        ];
                        const teamVacMap = {}; // dateStr -> [{ name, initials, color }]
                        teamMembers.forEach(member => {
                            let days = [];
                            try { days = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}_${member.name.replace(/\s/g, '_')}`)) || []; } catch { }
                            days.forEach(d => {
                                if (!teamVacMap[d]) teamVacMap[d] = [];
                                teamVacMap[d].push(member);
                            });
                        });

                        const totalVacation = 25;
                        const usedDays = selectedVacDays.length;
                        const remainingDays = totalVacation - usedDays;
                        const remainingHours = remainingDays * 7.5;
                        const pctUsed = Math.round((usedDays / totalVacation) * 100);

                        return (
                            <>
                                {/* Updated balance cards */}
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                    <div style={{
                                        flex: 1, minWidth: '180px', padding: '14px 18px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
                                        border: '1px solid rgba(34,197,94,0.2)'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                                            <i className="fa-solid fa-calendar-check" style={{ marginRight: '6px', color: '#22c55e' }}></i>Resterend
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: remainingDays > 5 ? '#16a34a' : '#ef4444' }}>{remainingDays}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>dagen</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        flex: 1, minWidth: '180px', padding: '14px 18px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
                                        border: '1px solid rgba(59,130,246,0.2)'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                                            <i className="fa-solid fa-clock" style={{ marginRight: '6px', color: '#3b82f6' }}></i>Resterende uren
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{remainingHours}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>uur</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        flex: 1, minWidth: '180px', padding: '14px 18px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, rgba(250,160,82,0.08), rgba(250,160,82,0.02))',
                                        border: '1px solid rgba(250,160,82,0.2)'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                                            <i className="fa-solid fa-chart-pie" style={{ marginRight: '6px', color: '#F5850A' }}></i>Verbruik
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                            <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pctUsed}%`, borderRadius: '4px', background: 'linear-gradient(90deg, #FA9F52, #F5850A)', transition: 'width 0.4s' }} />
                                            </div>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F5850A' }}>{usedDays}/{totalVacation}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
                                    {[
                                        { color: '#22c55e', label: 'Jouw vakantiedag' },
                                        { color: '#F5850A', label: 'Feestdag' },
                                        { color: '#8b5cf6', label: 'Collega vrij' },
                                        { color: '#3b82f6', border: true, label: 'Vandaag' },
                                    ].map(l => (
                                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                                            <div style={{
                                                width: '14px', height: '14px', borderRadius: '4px',
                                                background: l.border ? 'transparent' : l.color + '20',
                                                border: l.border ? `2px solid ${l.color}` : `2px solid ${l.color}`,
                                            }} />
                                            {l.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Year calendar grid: 4 columns × 3 rows */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
                                }}>
                                    {Array.from({ length: 12 }, (_, m) => {
                                        const firstDay = new Date(YEAR, m, 1);
                                        const daysInMonth = new Date(YEAR, m + 1, 0).getDate();
                                        // 0=Ma offset
                                        let startDay = firstDay.getDay() - 1;
                                        if (startDay < 0) startDay = 6;

                                        return (
                                            <div key={m} style={{
                                                border: '1px solid var(--border-color)', borderRadius: '10px',
                                                padding: '10px', background: '#fff'
                                            }}>
                                                <div style={{
                                                    textAlign: 'center', fontWeight: 700, fontSize: '0.82rem',
                                                    marginBottom: '6px', color: '#1e293b'
                                                }}>{MONTH_LABELS[m]}</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                                    {DAY_LABELS.map(d => (
                                                        <div key={d} style={{
                                                            textAlign: 'center', fontSize: '0.6rem', fontWeight: 600,
                                                            color: (d === 'Za' || d === 'Zo') ? '#cbd5e1' : '#94a3b8',
                                                            paddingBottom: '2px'
                                                        }}>{d}</div>
                                                    ))}
                                                    {Array.from({ length: startDay }, (_, i) => (
                                                        <div key={`empty-${i}`} />
                                                    ))}
                                                    {Array.from({ length: daysInMonth }, (_, d) => {
                                                        const day = d + 1;
                                                        const date = new Date(YEAR, m, day);
                                                        const dow = date.getDay(); // 0=Zo, 6=Za
                                                        const isWeekend = dow === 0 || dow === 6;
                                                        const dateStr = `${YEAR}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                        const isSelected = selectedVacDays.includes(dateStr);
                                                        const isHoliday = holidaySet.has(dateStr);
                                                        const isToday2 = date.toDateString() === today.toDateString();
                                                        const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                        const colleaguesOff = teamVacMap[dateStr] || [];

                                                        let bg = 'transparent';
                                                        let color = '#334155';
                                                        let border = '2px solid transparent';
                                                        let fontW = 500;
                                                        let cursor = 'pointer';

                                                        if (isWeekend) {
                                                            color = '#cbd5e1';
                                                            cursor = 'default';
                                                        } else if (isSelected) {
                                                            bg = 'rgba(34,197,94,0.15)';
                                                            color = '#16a34a';
                                                            border = '2px solid #22c55e';
                                                            fontW = 700;
                                                        } else if (isHoliday) {
                                                            bg = 'rgba(250,160,82,0.12)';
                                                            color = '#F5850A';
                                                            border = '2px solid rgba(250,160,82,0.4)';
                                                            fontW = 700;
                                                        } else if (colleaguesOff.length > 0) {
                                                            bg = 'rgba(139,92,246,0.06)';
                                                            border = '2px solid rgba(139,92,246,0.2)';
                                                        } else if (isPast) {
                                                            color = '#c8cdd3';
                                                        }

                                                        if (isToday2) {
                                                            border = '2px solid #3b82f6';
                                                        }

                                                        // Build tooltip
                                                        let tooltip = '';
                                                        if (isHoliday) tooltip = holidayNames[dateStr];
                                                        else if (isSelected && colleaguesOff.length > 0) tooltip = `Jij + ${colleaguesOff.map(c => c.name).join(', ')} vrij`;
                                                        else if (isSelected) tooltip = 'Klik om te verwijderen';
                                                        else if (colleaguesOff.length > 0) tooltip = `${colleaguesOff.map(c => c.name).join(', ')} vrij`;
                                                        else tooltip = 'Klik voor vakantiedag';

                                                        return (
                                                            <div
                                                                key={day}
                                                                onClick={() => !isWeekend && !isHoliday && toggleVacDay(dateStr)}
                                                                style={{
                                                                    textAlign: 'center', fontSize: '0.72rem', fontWeight: fontW,
                                                                    padding: '2px 0 1px', borderRadius: '5px', cursor,
                                                                    background: bg, color, border,
                                                                    transition: 'all 0.12s',
                                                                    lineHeight: '1.2',
                                                                    position: 'relative',
                                                                }}
                                                                title={tooltip}
                                                            >
                                                                {day}
                                                                {/* Feestdag ster badge */}
                                                                {isHoliday && (
                                                                    <span style={{ position:'absolute', top:'0px', right:'1px', fontSize:'0.5rem', lineHeight:1, pointerEvents:'none' }}>⭐</span>
                                                                )}
                                                                {/* Colleague dots */}
                                                                {colleaguesOff.length > 0 && !isWeekend && (
                                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1px', marginTop: '0px' }}>
                                                                        {colleaguesOff.slice(0, 3).map((c, ci) => (
                                                                            <div key={ci} style={{
                                                                                width: '4px', height: '4px', borderRadius: '50%',
                                                                                background: c.color,
                                                                            }} />
                                                                        ))}
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

                                {/* Geselecteerde dagen overzicht */}
                                {usedDays > 0 && (
                                    <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                                            <i className="fa-solid fa-check-circle" style={{ marginRight: '6px' }}></i>
                                            {usedDays} vakantiedag{usedDays > 1 ? 'en' : ''} geselecteerd ({usedDays * 7.5} uur)
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {[...selectedVacDays].sort().map(d => {
                                                const [y, mo, da] = d.split('-');
                                                const dt = new Date(+y, +mo - 1, +da);
                                                const dayName = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][dt.getDay()];
                                                return (
                                                    <span key={d} onClick={() => toggleVacDay(d)} style={{
                                                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem',
                                                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                                                        color: '#16a34a', fontWeight: 600, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        {dayName} {+da} {MONTH_LABELS[+mo - 1].slice(0, 3)}
                                                        <i className="fa-solid fa-xmark" style={{ fontSize: '0.6rem', opacity: 0.6 }}></i>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                            </>
                        );
                    })()}
                </div>

                </>
            )}

            {/* ═══════ VERLOF GOEDKEURING TAB ═══════ */}
            {activeTab === 'goedkeuring' && isBeheerder && (() => {
                const pending = verlofAanvragen.filter(v => v.status === 'In behandeling');
                const rest = verlofAanvragen.filter(v => v.status !== 'In behandeling');
                const sorted = [...pending, ...rest];

                const statusColor = (s) => s === 'Goedgekeurd' ? '#16a34a' : s === 'Afgewezen' ? '#ef4444' : '#F5850A';
                const statusBg = (s) => s === 'Goedgekeurd' ? 'rgba(34,197,94,0.08)' : s === 'Afgewezen' ? 'rgba(239,68,68,0.08)' : 'rgba(250,160,82,0.08)';
                const statusBorder = (s) => s === 'Goedgekeurd' ? 'rgba(34,197,94,0.25)' : s === 'Afgewezen' ? 'rgba(239,68,68,0.25)' : 'rgba(250,160,82,0.3)';
                const statusIcon = (s) => s === 'Goedgekeurd' ? 'fa-check-circle' : s === 'Afgewezen' ? 'fa-times-circle' : 'fa-clock';

                const fmtDate = (d) => {
                    if (!d) return '—';
                    const dt = new Date(d + 'T00:00:00');
                    if (isNaN(dt)) return d;
                    return dt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
                };

                const countDays = (van, tot) => {
                    if (!van || !tot) return 0;
                    const a = new Date(van + 'T00:00:00');
                    const b = new Date(tot + 'T00:00:00');
                    let count = 0;
                    const cur = new Date(a);
                    while (cur <= b) {
                        const dow = cur.getDay();
                        if (dow !== 0 && dow !== 6) count++;
                        cur.setDate(cur.getDate() + 1);
                    }
                    return count;
                };

                return (
                    <div className="panel">
                        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>
                                <i className="fa-solid fa-clipboard-check" style={{ marginRight: '8px', color: '#F5850A' }}></i>
                                Verlof Aanvragen
                                {pending.length > 0 && (
                                    <span style={{ marginLeft: '10px', background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px' }}>
                                        {pending.length} in behandeling
                                    </span>
                                )}
                            </h2>
                            <button onClick={() => {
                                fetch(`/api/verlof?jaar=${YEAR}`, { credentials: 'include' })
                                    .then(r => r.json())
                                    .then(data => { if (Array.isArray(data)) setVerlofAanvragen(data); })
                                    .catch(() => {});
                            }} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                                <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i>Vernieuwen
                            </button>
                        </div>

                        {sorted.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                                <i className="fa-solid fa-inbox" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', opacity: 0.4 }}></i>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Geen verlofaanvragen</div>
                                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Er zijn nog geen aanvragen ingediend voor {YEAR}.</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {sorted.map(v => {
                                    const days = countDays(v.van, v.tot);
                                    const isPending = v.status === 'In behandeling';
                                    return (
                                        <div key={v.id} style={{
                                            padding: '14px 18px', borderRadius: '12px',
                                            background: statusBg(v.status),
                                            border: `1px solid ${statusBorder(v.status)}`,
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            flexWrap: 'wrap'
                                        }}>
                                            {/* Status icon */}
                                            <div style={{ flexShrink: 0 }}>
                                                <i className={`fa-solid ${statusIcon(v.status)}`} style={{ fontSize: '1.4rem', color: statusColor(v.status) }}></i>
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '2px' }}>
                                                    {v.naam || `Medewerker #${v.id}`}
                                                    <span style={{
                                                        marginLeft: '8px', fontSize: '0.7rem', fontWeight: 600,
                                                        padding: '2px 8px', borderRadius: '999px',
                                                        background: statusBg(v.status), color: statusColor(v.status),
                                                        border: `1px solid ${statusBorder(v.status)}`
                                                    }}>
                                                        {v.status}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                                    <span>
                                                        <i className="fa-solid fa-tag" style={{ marginRight: '4px', color: '#94a3b8', fontSize: '0.7rem' }}></i>
                                                        {v.type || 'Verlof'}
                                                    </span>
                                                    <span>
                                                        <i className="fa-solid fa-calendar-days" style={{ marginRight: '4px', color: '#94a3b8', fontSize: '0.7rem' }}></i>
                                                        {fmtDate(v.van)} — {fmtDate(v.tot)}
                                                    </span>
                                                    <span>
                                                        <i className="fa-solid fa-sun" style={{ marginRight: '4px', color: '#94a3b8', fontSize: '0.7rem' }}></i>
                                                        {days} werkdag{days !== 1 ? 'en' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actieknoppen — alleen bij 'In behandeling' */}
                                            {isPending && (
                                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                                    <button
                                                        onClick={() => keurVerlof(v.id, 'Goedgekeurd')}
                                                        style={{
                                                            padding: '7px 16px', borderRadius: '8px', border: 'none',
                                                            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                                            color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                                        }}>
                                                        <i className="fa-solid fa-check"></i> Goedkeuren
                                                    </button>
                                                    <button
                                                        onClick={() => keurVerlof(v.id, 'Afgewezen')}
                                                        style={{
                                                            padding: '7px 16px', borderRadius: '8px', border: 'none',
                                                            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                                            color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                                        }}>
                                                        <i className="fa-solid fa-xmark"></i> Afwijzen
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ═══════ PERSONEELSPLANNER TAB ═══════ */}
            {activeTab === 'planner' && (() => {
                const MONTH_NAMES = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
                const MONTH_FULL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
                const team = [
                    { name: 'Jan Modaal', role: 'Beheerder', initials: 'JM', color: '#F5850A' },
                    { name: 'Piet Kwast', role: 'Schilder', initials: 'PK', color: '#3b82f6' },
                    { name: 'Klaas Roller', role: "ZZP'er", initials: 'KR', color: '#22c55e' },
                    { name: 'Henk de Vries', role: 'Voorman', initials: 'HV', color: '#8b5cf6' },
                ];

                // Build active holidays set
                const activeHolidays = {};
                COMBINED_HOLIDAYS.forEach(h => { if (enabledHolidays[h.key]) activeHolidays[h.key] = h.name; });
                const holidaySet = new Set(Object.keys(activeHolidays));

                // Load vacation days for each employee from localStorage
                const teamData = team.map(member => {
                    let days = [];
                    try { days = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}_${member.name.replace(/\s/g, '_')}`)) || []; } catch { }
                    // Also check the global vacation key for the logged-in user
                    if (member.name === 'Jan Modaal') {
                        try { days = JSON.parse(localStorage.getItem(`schildersapp_vakantie_${YEAR}`)) || []; } catch { }
                    }
                    return { ...member, vacDays: days };
                });

                // Count total off per month
                const monthlyOff = Array.from({ length: 12 }, (_, m) => {
                    return teamData.reduce((count, emp) => {
                        return count + emp.vacDays.filter(d => {
                            const [, mo] = d.split('-');
                            return parseInt(mo) === m + 1;
                        }).length;
                    }, 0);
                });

                return (
                    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                    <i className="fa-solid fa-users" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                                    Personeelsplanner {YEAR}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(34,197,94,0.3)', border: '1px solid #22c55e', display: 'inline-block' }}></span>
                                    Vakantie
                                </span>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(250,160,82,0.3)', border: '1px solid #F5850A', display: 'inline-block' }}></span>
                                    Feestdag
                                </span>
                            </div>
                        </div>

                        {/* Grid: employee rows × month columns */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.015)' }}>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', minWidth: '180px', position: 'sticky', left: 0, background: '#fafafa', zIndex: 1 }}>
                                            Medewerker
                                        </th>
                                        {MONTH_NAMES.map((m, i) => (
                                            <th key={i} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.78rem', minWidth: '80px' }}>
                                                {m}
                                            </th>
                                        ))}
                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>Totaal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamData.map((emp, ei) => (
                                        <tr key={ei} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%',
                                                        background: emp.color + '18', color: emp.color,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: '0.72rem', border: `2px solid ${emp.color}40`
                                                    }}>{emp.initials}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{emp.name}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{emp.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {Array.from({ length: 12 }, (_, m) => {
                                                const daysInMonth = new Date(YEAR, m + 1, 0).getDate();
                                                const vacThisMonth = emp.vacDays.filter(d => {
                                                    const [, mo] = d.split('-');
                                                    return parseInt(mo) === m + 1;
                                                });
                                                const holidaysThisMonth = COMBINED_HOLIDAYS.filter(h => {
                                                    if (!enabledHolidays[h.key]) return false;
                                                    const [, mo] = h.key.split('-');
                                                    return parseInt(mo) === m + 1;
                                                });
                                                const totalOff = vacThisMonth.length + holidaysThisMonth.length;
                                                return (
                                                    <td key={m} style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        {totalOff > 0 ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center' }}>
                                                                {vacThisMonth.map(d => {
                                                                    const day = +d.split('-')[2];
                                                                    return (
                                                                        <div key={d} title={`${emp.name} - ${day} ${MONTH_FULL[m]}`} style={{
                                                                            width: '16px', height: '16px', borderRadius: '3px',
                                                                            background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.5)',
                                                                            fontSize: '0.55rem', fontWeight: 700, color: '#16a34a',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                        }}>{day}</div>
                                                                    );
                                                                })}
                                                                {holidaysThisMonth.map(h => {
                                                                    const day = +h.key.split('-')[2];
                                                                    return (
                                                                        <div key={h.key} title={h.name} style={{
                                                                            width: '16px', height: '16px', borderRadius: '3px',
                                                                            background: 'rgba(250,160,82,0.15)', border: '1px solid rgba(250,160,82,0.4)',
                                                                            fontSize: '0.55rem', fontWeight: 700, color: '#F5850A',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                        }}>{day}</div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#e2e8f0' }}>—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: '0.92rem', color: emp.vacDays.length > 0 ? emp.color : '#e2e8f0' }}>
                                                {emp.vacDays.length > 0 ? `${emp.vacDays.length}d` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totaal rij */}
                                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderTop: '2px solid var(--border-color)' }}>
                                        <td style={{ padding: '10px 16px', fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', position: 'sticky', left: 0, background: '#f8f8f8', zIndex: 1 }}>
                                            <i className="fa-solid fa-chart-bar" style={{ marginRight: '6px', color: '#F5850A' }}></i>
                                            Totaal vrij
                                        </td>
                                        {monthlyOff.map((count, i) => (
                                            <td key={i} style={{
                                                padding: '10px 6px', textAlign: 'center', fontWeight: 700,
                                                fontSize: '0.82rem', color: count > 0 ? '#F5850A' : '#e2e8f0'
                                            }}>
                                                {count > 0 ? count : '—'}
                                            </td>
                                        ))}
                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#F5850A' }}>
                                            {teamData.reduce((a, e) => a + e.vacDays.length, 0)}d
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Per-medewerker kaarten */}
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                                <i className="fa-solid fa-id-card" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
                                Vakantiesaldo per medewerker
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                                {teamData.map((emp, i) => {
                                    const remaining = 25 - emp.vacDays.length;
                                    const pct = Math.round((emp.vacDays.length / 25) * 100);
                                    return (
                                        <div key={i} style={{
                                            padding: '12px 16px', borderRadius: '10px',
                                            background: `linear-gradient(135deg, ${emp.color}08, ${emp.color}02)`,
                                            border: `1px solid ${emp.color}25`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{emp.name}</span>
                                                <span style={{ fontSize: '0.72rem', color: emp.color, fontWeight: 700 }}>{remaining} dagen over</span>
                                            </div>
                                            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', width: `${pct}%`, borderRadius: '3px',
                                                    background: `linear-gradient(90deg, ${emp.color}88, ${emp.color})`,
                                                    transition: 'width 0.4s'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                                                {emp.vacDays.length}/25 dagen opgenomen · {remaining * 7.5}u resterend
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ─── TAB 4: TOTAAL OVERZICHT (beheer per medewerker/week) ─── */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'overzicht' && (() => {
                // Lees alle uren-registraties uit wa_uren_log (medewerker + datum + uren)
                let urenLog = [];
                try { urenLog = JSON.parse(localStorage.getItem('wa_uren_log') || '[]'); } catch {}

                // Haal alle medewerkers op via AuthContext
                const { getAllUsers } = useAuth ? { getAllUsers: undefined } : {};
                // getAllUsers is al ingeladen bovenaan als `allUsers` — haal via prop
                // We gebruiken allUsers via de uren component context:
                // Definieer inline vereiste helpers
                const parseUrenDate = (dateStr) => {
                    if (!dateStr) return null;
                    const d = new Date(dateStr + 'T00:00:00');
                    return isNaN(d) ? null : d;
                };
                const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

                // Bereken ISO-weeknummer voor uren-regels
                const getWeekKey = (dateStr) => {
                    const d = parseUrenDate(dateStr);
                    if (!d) return null;
                    const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                    copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
                    const ys = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
                    const wk = Math.ceil(((copy - ys) / 86400000 + 1) / 7);
                    return `${copy.getUTCFullYear()}-W${String(wk).padStart(2,'0')}`;
                };

                // Groepeer per week
                const weekData = {};
                urenLog.forEach(entry => {
                    const wk = getWeekKey(entry.datum);
                    if (!wk) return;
                    if (!weekData[wk]) weekData[wk] = {};
                    const naam = entry.medewerkerNaam || 'Onbekend';
                    if (!weekData[wk][naam]) weekData[wk][naam] = { uren: 0, overuren: 0, entries: [] };
                    weekData[wk][naam].uren += (entry.uren || 0);
                    weekData[wk][naam].overuren += (entry.overuren || 0);
                    weekData[wk][naam].entries.push(entry);
                });

                // Huidige week-key voor highlight
                const nowKey = getWeekKey(fmtDate(new Date()));
                const sortedWeeks = Object.keys(weekData).sort().reverse();

                // Alle medewerkers die ooit uren hebben geregistreerd
                const allNamen = [...new Set(urenLog.map(e => e.medewerkerNaam || 'Onbekend'))].sort();

                // Kleuren per medewerker (recycled)
                const COLORS = ['#F5850A', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
                const getColor = (naam) => COLORS[allNamen.indexOf(naam) % COLORS.length];
                const getInitials = (naam) => naam.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

                const TARGET_WEEK_HOURS = 37.5;

                return (
                    <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #fff 0%, #f8fbff 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-table-list" style={{ color: '#F5850A' }} />
                                        Totaal Overzicht Urenregistratie
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                        Alle medewerkers · {urenLog.length} registraties · {sortedWeeks.length} weken
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {/* Samenvatting badges */}
                                    {[...new Set(urenLog.map(e => e.medewerkerNaam))].slice(0,4).map(naam => (
                                        <div key={naam} style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(naam), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0, marginLeft: '-6px', border: '2px solid #fff' }}>
                                            {getInitials(naam)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {urenLog.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '14px' }}>
                                <i className="fa-solid fa-clock" style={{ fontSize: '3rem', color: '#e2e8f0' }} />
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#94a3b8' }}>Nog geen uren geregistreerd</div>
                                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', textAlign: 'center', maxWidth: '300px' }}>
                                    Uren die via WhatsApp worden geregistreerd verschijnen hier automatisch.
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* Samenvatting per medewerker (totaal ooit) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                    {allNamen.map(naam => {
                                        const totaalUren = urenLog.filter(e => e.medewerkerNaam === naam).reduce((s, e) => s + (e.uren || 0) + (e.overuren || 0), 0);
                                        const aantalDagen = new Set(urenLog.filter(e => e.medewerkerNaam === naam).map(e => e.datum)).size;
                                        const color = getColor(naam);
                                        return (
                                            <div key={naam} style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: `1.5px solid ${color}30`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                                        {getInitials(naam)}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{naam}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{aantalDagen} werkdagen geregistreerd</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: color }}>{totaalUren.toFixed(1)}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>uur totaal</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Per-week-overzicht */}
                                {sortedWeeks.map(wk => {
                                    const [wkYear, wkNum] = wk.split('-W').map(Number);
                                    const isCurrentWk = wk === nowKey;
                                    const weekEmployees = weekData[wk];

                                    return (
                                        <div key={wk} style={{
                                            background: isCurrentWk ? 'linear-gradient(135deg, #fffbf5, #fff)' : '#fff',
                                            borderRadius: '14px', border: isCurrentWk ? '2px solid #F5850A40' : '1px solid #f1f5f9',
                                            overflow: 'hidden', boxShadow: isCurrentWk ? '0 4px 16px rgba(245,133,10,0.08)' : '0 1px 4px rgba(0,0,0,0.04)'
                                        }}>
                                            {/* Week header */}
                                            <div style={{
                                                padding: '10px 16px', background: isCurrentWk ? 'rgba(245,133,10,0.06)' : '#f8fafc',
                                                borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {isCurrentWk && <span style={{ background: '#F5850A', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', borderRadius: '10px' }}>HUIDIGE WEEK</span>}
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Week {wkNum} · {wkYear}</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>·</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{getMondayOfWeek(wkNum, wkYear).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                                                    {Object.values(weekEmployees).reduce((s, e) => s + e.uren + e.overuren, 0).toFixed(1)}u totaal
                                                </span>
                                            </div>

                                            {/* Rijen per medewerker */}
                                            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {Object.entries(weekEmployees).map(([naam, data]) => {
                                                    const totaal = data.uren + data.overuren;
                                                    const pct = Math.min((totaal / TARGET_WEEK_HOURS) * 100, 100);
                                                    const color = getColor(naam);
                                                    const isOk = totaal >= TARGET_WEEK_HOURS;
                                                    const isPartial = totaal > 0 && totaal < TARGET_WEEK_HOURS;
                                                    const statusIcon = isOk ? '✅' : isPartial ? '⚠️' : '❌';
                                                    // Unieke projecten voor deze medewerker deze week
                                                    const projs = [...new Set(data.entries.map(e => e.projectNaam || '—'))].filter(Boolean);

                                                    return (
                                                        <div key={naam} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px', gap: '12px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                                                            {/* Medewerker */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700, flexShrink: 0 }}>
                                                                    {getInitials(naam)}
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{naam.split(' ')[0]}</div>
                                                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{data.entries.length} dag{data.entries.length !== 1 ? 'en' : ''}</div>
                                                                </div>
                                                            </div>

                                                            {/* Voortgangsbalk + projecten */}
                                                            <div>
                                                                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '4px' }}>
                                                                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: isOk ? 'linear-gradient(90deg, #22c55e, #16a34a)' : isPartial ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)', transition: 'width 0.4s' }} />
                                                                </div>
                                                                <div style={{ fontSize: '0.62rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {projs.join(' · ')}
                                                                </div>
                                                            </div>

                                                            {/* Totaal uren */}
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isOk ? '#16a34a' : isPartial ? '#d97706' : '#ef4444' }}>
                                                                    {statusIcon} {totaal.toFixed(1)}u
                                                                </span>
                                                                {data.overuren > 0 && (
                                                                    <div style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 600 }}>+{data.overuren.toFixed(1)}u over</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ─── SUBMIT CONFIRMATIE MODAL ─── */}
            {
                showSubmitModal && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSubmitModal(false)} />
                        <div style={{
                            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            zIndex: 9999, background: '#fff', borderRadius: '16px', padding: '28px',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.25)', width: '420px', maxWidth: '90vw',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Weekstaat indienen?</h3>
                            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                                Week {weekNum} wordt ingediend met <b>{dayTotals.reduce((a, b) => a + b, 0)} uur</b> verdeeld over {projects.filter(p => p.projectId).length} project(en).
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={() => setShowSubmitModal(false)}
                                    className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Annuleren</button>
                                <button onClick={handleSubmit}
                                    className="btn btn-primary" style={{ padding: '8px 24px', fontSize: '0.85rem' }}>
                                    <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i>Bevestigen
                                </button>
                            </div>
                        </div>
                    </>
                )
            }

            {/* ─── SUCCES TOAST ─── */}
            {
                showToast && (
                    <div style={{
                        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                        zIndex: 10000, background: '#fff', borderRadius: '12px', padding: '12px 24px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        animation: 'toastSlideUp 0.3s ease-out'
                    }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'rgba(34,197,94,0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-check" style={{ color: '#22c55e', fontSize: '0.8rem' }}></i>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Weekstaat ingediend! ✅</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Week {weekNum} is succesvol verstuurd.</div>
                        </div>
                    </div>
                )
            }

            <style>{`
                @keyframes toastSlideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div >
    );
}
