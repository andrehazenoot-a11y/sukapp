'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const BOT_NAME = 'DS Assistent';
const BOT_AVATAR = '🤖';

// App URL voor WhatsApp links (pas aan naar je productie-URL)
const APP_URL = 'https://schildersapp-katwijk.nl';

// Laad echte projecten uit localStorage — zelfde ID als in de URL (/projecten/[id])
function loadProjectsFromStorage() {
    try {
        const raw = localStorage.getItem('schildersapp_projecten') || localStorage.getItem('schildersapp_projects');
        if (raw) {
            const projects = JSON.parse(raw);
            if (Array.isArray(projects) && projects.length > 0) {
                // Gebruik p.id exact — dit is dezelfde waarde als in de URL /projecten/[id]
                return projects.map(p => ({ id: String(p.id), name: p.name || p.projectName || 'Project ' + p.id }));
            }
        }
    } catch {}
    // Fallback: demo projecten (IDs 1-4, zelfde als INITIAL_PROJECTS)
    return [
        { id: '1', name: 'Nieuwbouw Villa Wassenaar' },
        { id: '2', name: 'Onderhoud Rijtjeshuizen Leiden' },
        { id: '3', name: 'Kantoorpand Voorschoten' },
        { id: '4', name: 'Woonhuis Den Haag' },
    ];
}

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

function getWeekKey() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getWeekNumber() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Storage helpers — IDENTIEK aan urenregistratie/page.js
function uren2StorageKey(userId, week, year) {
    return `schildersapp_urv2_u${userId}_w${week}_${year}`;
}
function uren2LoadData(userId, week, year) {
    try { const r = localStorage.getItem(uren2StorageKey(userId, week, year)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function uren2SaveData(userId, week, year, data) {
    try { localStorage.setItem(uren2StorageKey(userId, week, year), JSON.stringify(data)); } catch {}
}
function uren2HasHours(userId, week, year) {
    const proj = uren2LoadData(userId, week, year);
    if (!proj) return false;
    return proj.some(p => Object.entries(p.types || {}).some(([tid, hrs]) =>
        tid !== 'ziek' && tid !== 'vrij' && hrs.some(h => parseFloat(h) > 0)
    ));
}

function getDayName() {
    const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    return days[new Date().getDay()];
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Goedemorgen';
    if (h < 18) return 'Goedemiddag';
    return 'Goedenavond';
}

// Urentypen — zelfde als urenregistratie page
const UREN_TYPES = [
    { id: 'normaal',           label: 'Project uren',       color: '#F5850A', icon: 'fa-paint-roller' },
    { id: 'meerwerk',          label: 'Extra werk',           color: '#f59e0b', icon: 'fa-plus-minus' },
    { id: 'oplevering',        label: 'Oplevering',         color: '#06b6d4', icon: 'fa-flag-checkered' },
    { id: 'werkvoorbereiding', label: 'Werkvoorbereiding',  color: '#6366f1', icon: 'fa-clipboard-list' },
    { id: 'ziek',              label: 'Ziek (hele dag)',     color: '#ef4444', icon: 'fa-briefcase-medical', noHours: true },
    { id: 'vrij',              label: 'Vrij (hele dag)',     color: '#8b5cf6', icon: 'fa-umbrella-beach', noHours: true },
];

// Lees per-gebruiker toegestane urentypen uit localStorage (ingesteld door beheerder)
function getUserUrenTypes(userId) {
    try {
        const saved = localStorage.getItem(`schildersapp_urentypes_${userId}`);
        if (saved) {
            const allowed = JSON.parse(saved);
            // Normaal is altijd inbegrepen
            const allIds = allowed.includes('normaal') ? allowed : ['normaal', ...allowed];
            return UREN_TYPES.filter(t => allIds.includes(t.id));
        }
    } catch {}
    // Standaard: normaal + meerwerk + ziek + vrij
    return UREN_TYPES.filter(t => ['normaal', 'meerwerk', 'ziek', 'vrij'].includes(t.id));
}

// ── Zoekbaar project-combobox ─────────────────────────────────────
function ProjectSearch({ items, value, onChange, placeholder = 'Zoek...', accentColor = '#F5850A' }) {
    // items: [{ id, label }]
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const selectedItem = items.find(p => p.id === value);
    const displayText = query !== '' ? query : (selectedItem?.label || '');

    const filtered = query.length > 0
        ? items.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
        : items;

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const select = (item) => {
        onChange(item.id);
        setQuery('');
        setOpen(false);
    };

    return (
        <div ref={ref} style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={open ? query : (selectedItem?.label || '')}
                    onClick={() => { setQuery(''); setOpen(true); }}
                    onFocus={() => { setQuery(''); setOpen(true); }}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    placeholder={placeholder}
                    style={{
                        width: '100%', padding: '5px 26px 5px 8px', fontSize: '0.72rem', fontWeight: 600,
                        border: `1.5px solid ${value ? accentColor + '55' : '#e2e8f0'}`,
                        borderRadius: '6px', color: value ? '#1e293b' : '#94a3b8',
                        background: value ? accentColor + '06' : '#f8fafc',
                        outline: 'none', boxSizing: 'border-box', cursor: 'text',
                        transition: 'border-color 0.15s'
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                        if (e.key === 'Enter' && filtered.length > 0) { select(filtered[0]); }
                    }}
                />
                <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`}
                    style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.55rem', color: '#94a3b8', pointerEvents: 'none' }}
                />
            </div>
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    background: '#fff', border: '1.5px solid ' + accentColor + '44',
                    borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                    maxHeight: '160px', overflowY: 'auto', marginTop: '3px'
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '8px 10px', fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>Geen resultaten</div>
                    ) : filtered.map(item => (
                        <div
                            key={item.id}
                            onMouseDown={(e) => { e.preventDefault(); select(item); }}
                            style={{
                                padding: '7px 10px', fontSize: '0.72rem', fontWeight: item.id === value ? 700 : 400,
                                color: item.id === value ? accentColor : '#1e293b',
                                background: item.id === value ? accentColor + '0d' : 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = accentColor + '15'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = item.id === value ? accentColor + '0d' : 'transparent'; }}
                        >
                            {item.id === value && <i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: accentColor }} />}
                            {item.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Inline urenstaat mini-form (werknemer)
function InlineUrenstaat({ onSave, onCancel, allowedTypes }) {
    const PROJECTS = loadProjectsFromStorage(); // laad echte projecten
    const types = allowedTypes && allowedTypes.length > 0 ? allowedTypes : UREN_TYPES.filter(t => ['normaal', 'meerwerk', 'ziek', 'vrij'].includes(t.id));
    const initialTypeId = types[0]?.id || 'normaal';

    const [rows, setRows] = useState([
        { projectId: '1', hours: initialTypeId === 'meerwerk' ? ['','','','',''] : ['8', '8', '8', '8', '8'], typeId: initialTypeId, note: '', photo: null, datum: new Date().toISOString().split('T')[0], materiaal: '', showMateriaal: false, isRecordingNote: false, isRecordingMateriaal: false, meerwerkSoort: 'uren', postBedrag: '' }
    ]);
    const recognitionRef = useRef(null);

    const updateHour = (ri, di, val) => {
        let parsedVal = val;
        if (parsedVal && parseFloat(parsedVal) < 0) {
            parsedVal = "0";
        }
        const u = [...rows];
        u[ri] = { ...u[ri], hours: [...u[ri].hours] };
        u[ri].hours[di] = parsedVal;
        setRows(u);
    };

    const updateProject = (ri, pid) => {
        const u = [...rows];
        u[ri] = { ...u[ri], projectId: pid };
        setRows(u);
    };

    const updateType = (ri, typeId) => {
        const u = [...rows];
        const isNoHours = types.find(t => t.id === typeId)?.noHours;
        u[ri] = { ...u[ri], typeId, hours: isNoHours ? ['✓', '✓', '✓', '✓', '✓'] : ['8', '8', '8', '8', '8'] };
        setRows(u);
    };

    const updateNote = (ri, note) => {
        setRows(prev => prev.map((r, i) => i === ri ? { ...r, note } : r));
    };

    const updateDatum = (ri, datum) => {
        setRows(prev => prev.map((r, i) => i === ri ? { ...r, datum } : r));
    };

    const updateMateriaal = (ri, materiaal) => {
        setRows(prev => prev.map((r, i) => i === ri ? { ...r, materiaal } : r));
    };

    const toggleDictation = (ri, isMateriaal = false) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
            if (isHttp) {
                alert('Spraakherkenning vereist een beveiligde verbinding.\n\nGebruik op je telefoon:\nhttps://' + window.location.hostname + ':' + window.location.port + window.location.pathname);
            } else {
                alert('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome of Safari.');
            }
            return;
        }

        const isRecording = isMateriaal ? rows[ri].isRecordingMateriaal : rows[ri].isRecordingNote;

        if (isRecording) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setRows(prev => prev.map((r, i) => i === ri ? { 
                ...r, 
                isRecordingNote: false, 
                isRecordingMateriaal: false,
                ...(isMateriaal ? { showMateriaal: true } : {}) 
            } : r));
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        setRows(prev => prev.map((r, i) => i === ri ? { 
            ...r, 
            isRecordingNote: !isMateriaal, 
            isRecordingMateriaal: isMateriaal,
            ...(isMateriaal ? { showMateriaal: false } : {})
        } : { 
            ...r, 
            isRecordingNote: false, 
            isRecordingMateriaal: false 
        }));

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'nl-NL';
        recognition.continuous = true;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setRows(prev => prev.map((r, i) => {
                if (i !== ri) return r;
                if (isMateriaal) {
                    return { ...r, materiaal: (r.materiaal ? r.materiaal + ' ' : '') + transcript };
                } else {
                    return { ...r, note: (r.note ? r.note + ' ' : '') + transcript };
                }
            }));
        };

        recognition.onend = () => {
            setRows(prev => prev.map((r, i) => {
                if (i !== ri) return r;
                if (isMateriaal && r.isRecordingMateriaal) {
                    return { ...r, isRecordingNote: false, isRecordingMateriaal: false, showMateriaal: true };
                }
                return { ...r, isRecordingNote: false, isRecordingMateriaal: false };
            }));
        };

        recognition.start();
    };

    const handleFileChange = (ri, e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            // Comprimeer foto naar max 400x400 zodat localStorage niet vol raakt
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 400;
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
                    else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const compressed = canvas.toDataURL('image/jpeg', 0.5); // 50% kwaliteit
                    setRows(prev => prev.map((r, i) => i === ri ? { ...r, photo: compressed } : r));
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setRows(prev => prev.map((r, i) => i === ri ? { ...r, photo: ev.target.result } : r));
            };
            reader.readAsDataURL(file);
        }
    };


    const addRow = () => {
        setRows([...rows, { projectId: '', hours: ['', '', '', '', ''], typeId: types[0]?.id || 'normaal', note: '', photo: null, datum: new Date().toISOString().split('T')[0], materiaal: '', showMateriaal: false, isRecordingNote: false, isRecordingMateriaal: false, meerwerkSoort: 'uren', postBedrag: '' }]);
    };

    const removeRow = (ri) => {
        if (rows.length > 1) setRows(rows.filter((_, i) => i !== ri));
    };

    const getTotal = () => {
        return rows.reduce((sum, r) => {
            const typeInfo = types.find(t => t.id === r.typeId);
            if (typeInfo?.noHours) return sum;
            return sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
        }, 0);
    };

    return (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
            maxWidth: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <i className="fa-regular fa-calendar" style={{ color: '#FA9F52' }}></i>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                    Week {getWeekNumber()} — {types.length === 1 && types[0].id === 'meerwerk' ? 'Extra werk invoeren' : 'Uren invoeren'}
                </span>
            </div>

            {rows.map((row, ri) => {
                const typeInfo = types.find(t => t.id === row.typeId) || types[0];
                const isNoHours = typeInfo.noHours;
                return (
                    <div key={ri} style={{ marginBottom: '10px', padding: '8px', borderRadius: '8px', background: `${typeInfo.color}08`, border: `1px solid ${typeInfo.color}22` }}>
                    {/* Project zoeker + verwijder knop */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                            <ProjectSearch
                                items={PROJECTS.map(p => ({ id: p.id, label: p.name }))}
                                value={row.projectId}
                                onChange={(id) => updateProject(ri, id)}
                                placeholder="Zoek project..."
                                accentColor="#F5850A"
                            />
                            {rows.length > 1 && (
                                <button onClick={() => removeRow(ri)} style={{
                                    width: '26px', height: '26px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)',
                                    background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0
                                }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>

                        {/* Urentype select — alleen tonen als er meer dan 1 optie is */}
                        {types.length > 1 && (
                            <div style={{ marginBottom: '6px' }}>
                                <select
                                    value={row.typeId}
                                    onChange={(e) => updateType(ri, e.target.value)}
                                    style={{
                                        width: '100%', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700,
                                        border: `1px solid ${typeInfo.color}55`, borderRadius: '6px',
                                        color: typeInfo.color, background: `${typeInfo.color}0d`,
                                        cursor: 'pointer', outline: 'none', WebkitAppearance: 'none'
                                    }}
                                >
                                    {types.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Day inputs of ziek/vrij balken (VERBORGEN BIJ MEERWERK) */}
                        {row.typeId !== 'meerwerk' && (
                            isNoHours ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                                    {DAY_LABELS.map((day, di) => (
                                        <div key={di} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>{day}</div>
                                            <div style={{
                                                height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: `${typeInfo.color}15`, border: `1.5px solid ${typeInfo.color}44`
                                            }}>
                                                <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.7rem', color: typeInfo.color }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                                    {DAY_LABELS.map((day, di) => (
                                        <div key={di} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>{day}</div>
                                            <input
                                                type="text"
                                                value={row.hours[di]}
                                                onChange={(e) => updateHour(ri, di, e.target.value)}
                                                placeholder="0"
                                                style={{
                                                    width: '100%', height: '30px', textAlign: 'center',
                                                    border: `1.5px solid ${parseFloat(row.hours[di]) > 0 ? typeInfo.color : '#e2e8f0'}`,
                                                    borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                                                    color: parseFloat(row.hours[di]) > 0 ? typeInfo.color : '#94a3b8',
                                                    background: parseFloat(row.hours[di]) > 0 ? `${typeInfo.color}0d` : '#fff',
                                                    outline: 'none', boxSizing: 'border-box'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = typeInfo.color; e.currentTarget.select(); }}
                                                onBlur={(e) => { if (!parseFloat(e.currentTarget.value)) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* MEERWERK EXTRA VELDEN */}
                        {row.typeId === 'meerwerk' && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${typeInfo.color}33` }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>🗓️ Datum extra werk</label>
                                <input
                                    type="date"
                                    value={row.datum || ''}
                                    onChange={(e) => updateDatum(ri, e.target.value)}
                                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px', border: `1px solid ${typeInfo.color}66`, color: '#1e293b', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, margin: 0 }}>
                                        {row.meerwerkSoort === 'post' ? '💰 Aangenomen Post' : '⏱️ Totaal uren'}
                                    </label>
                                    <button 
                                        onClick={() => setRows(prev => prev.map((r, i) => i === ri ? { ...r, meerwerkSoort: row.meerwerkSoort === 'post' ? 'uren' : 'post', postBedrag: '', hours: ['','','','',''] } : r))}
                                        style={{ background: 'none', border: 'none', color: typeInfo.color, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                    >
                                        {row.meerwerkSoort === 'post' ? 'Vul uren in' : 'Vaste prijs opgeven'}
                                    </button>
                                </div>

                                {row.meerwerkSoort !== 'post' ? (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        <input 
                                            type="number" 
                                            min="0"
                                            placeholder="0" 
                                            value={row.hours[0] === '0' ? '' : row.hours[0]} 
                                            onChange={(e) => updateHour(ri, 0, e.target.value)}
                                            style={{ width: '56px', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', borderRadius: '4px', border: `1.5px solid ${typeInfo.color}`, color: typeInfo.color, outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>
                                            <span>Uren voor deze notitie</span>
                                            {parseFloat(row.hours[0]) > 7.5 && (
                                                <span style={{ color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>{(parseFloat(row.hours[0]) - 7.5).toFixed(1).replace('.0','')}u overwerk (boven 7.5u).</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 8px', border: `1.5px solid ${typeInfo.color}`, borderRight: 'none', borderRadius: '4px 0 0 4px', color: '#64748b', fontWeight: 700 }}>€</div>
                                        <input 
                                            type="number" 
                                            placeholder="Bedrag (optioneel)..." 
                                            value={row.postBedrag} 
                                            onChange={(e) => setRows(prev => prev.map((r, idx) => idx === ri ? { ...r, postBedrag: e.target.value } : r))}
                                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '0 4px 4px 0', border: `1.5px solid ${typeInfo.color}`, outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}

                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>📝 Notities Extra Werk</label>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    <textarea
                                        placeholder="Typ of dicteer hier wat er gedaan is..."
                                        value={row.note || ''}
                                        onChange={(e) => updateNote(ri, e.target.value)}
                                        rows="3"
                                        style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={() => toggleDictation(ri)}
                                            title={row.isRecordingNote ? "Stop dicteren" : "Dicteren"}
                                            style={{ width: '36px', height: '36px', background: row.isRecordingNote ? '#ef4444' : typeInfo.color, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                        >
                                            <i className={`fa-solid ${row.isRecordingNote ? 'fa-stop fa-fade' : 'fa-microphone'}`}></i>
                                        </button>
                                        {row.note && (
                                            <button
                                                onClick={() => updateNote(ri, '')}
                                                title="Wis notitie"
                                                style={{ width: '36px', height: '36px', background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>📸 Foto/video bewijs</label>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    <label style={{ flex: 1, padding: '6px', background: `${typeInfo.color}10`, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', color: typeInfo.color, fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                        <i className="fa-solid fa-camera"></i> Camera
                                        <input type="file" accept="image/*,video/*" capture="environment" onChange={(e) => handleFileChange(ri, e)} style={{ display: 'none' }} />
                                    </label>
                                    <label style={{ flex: 1, padding: '6px', background: `${typeInfo.color}10`, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', color: typeInfo.color, fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                        <i className="fa-regular fa-image"></i> Galerij
                                        <input type="file" accept="image/*,video/*" onChange={(e) => handleFileChange(ri, e)} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                {row.photo && (
                                    <div style={{ marginTop: '-4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <img src={row.photo} alt="Foto preview" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #bbf7d0', cursor: 'pointer' }}
                                            onClick={() => window.open(row.photo, '_blank')} />
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: 700 }}><i className="fa-solid fa-check-circle" style={{ marginRight: '4px' }} />Foto gekoppeld</div>
                                            <button onClick={() => setRows(prev => prev.map((r, i) => i === ri ? { ...r, photo: null } : r))}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.6rem', cursor: 'pointer', padding: 0, marginTop: '2px', textDecoration: 'underline' }}>Verwijder foto</button>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>
                                        <i className="fa-solid fa-boxes-stacked" style={{ marginRight: '4px' }}></i> Gebruikt Materiaal
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <textarea
                                            placeholder="Controleer/pas aan of typ hier (bijv. 2 blikken)..."
                                            value={row.materiaal || ''}
                                            onChange={(e) => updateMateriaal(ri, e.target.value)}
                                            rows="3"
                                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px', border: `1px solid ${typeInfo.color}44`, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <button
                                                onClick={() => toggleDictation(ri, true)}
                                                title={row.isRecordingMateriaal ? "Stop inspreken" : "Extra Materiaal Inspreken"}
                                                style={{ width: '36px', height: '36px', background: row.isRecordingMateriaal ? '#ef4444' : typeInfo.color, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                            >
                                                <i className={`fa-solid ${row.isRecordingMateriaal ? 'fa-stop fa-fade' : 'fa-microphone'}`}></i>
                                            </button>
                                            {row.materiaal && (
                                                <button
                                                    onClick={() => updateMateriaal(ri, '')}
                                                    title="Wis materiaal"
                                                    style={{ width: '36px', height: '36px', background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add project button — verberg als slechts 1 type beschikbaar */}
            {types.length > 0 && (
            <button onClick={addRow} style={{
                width: '100%', padding: '4px', border: '1px dashed #d0d5dd', borderRadius: '6px',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px'
            }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FA9F52'; e.currentTarget.style.borderColor = '#FA9F52'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#d0d5dd'; }}
            >
                <i className="fa-solid fa-plus"></i> Rij toevoegen
            </button>
            )}

            {/* Totaal + buttons */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0 0', borderTop: '1px solid #e2e8f0'
            }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                    Totaal: <span style={{ color: '#F5850A', fontSize: '0.85rem' }}>{getTotal()}u</span>
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={onCancel} style={{
                        padding: '5px 12px', fontSize: '0.7rem', borderRadius: '16px',
                        border: '1px solid #e2e8f0', background: '#fff', color: '#64748b',
                        cursor: 'pointer', fontWeight: 600
                    }}>Annuleren</button>
                    <button onClick={() => onSave(rows)} style={{
                        padding: '5px 14px', fontSize: '0.7rem', borderRadius: '16px', border: 'none',
                        background: 'linear-gradient(135deg, #FA9F52, #F5850A)', color: '#fff',
                        cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <i className="fa-solid fa-check"></i> Opslaan
                    </button>
                </div>
            </div>
        </div>
    );
}

// Inline notitie / planning mini-form
function InlineNotitie({ onSave, onCancel }) {
    const PROJECTS = loadProjectsFromStorage(); // laad echte projecten
    const NOTE_TYPES = [
        { id: 'info',     label: 'Info',     color: '#3b82f6', icon: 'fa-circle-info' },
        { id: 'actie',    label: 'Actie',    color: '#f59e0b', icon: 'fa-bolt' },
        { id: 'probleem', label: 'Probleem', color: '#ef4444', icon: 'fa-triangle-exclamation' },
        { id: 'klant',    label: 'Klant',    color: '#10b981', icon: 'fa-user' },
        { id: 'planning', label: 'Planning', color: '#8b5cf6', icon: 'fa-calendar-days' },
    ];

    const [projectId, setProjectId] = useState('1');
    const [noteType, setNoteType] = useState('info');
    const [note, setNote] = useState('');
    const [photo, setPhoto] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);

    const toggleDictation = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
            if (isHttp) {
                alert('Spraakherkenning vereist een beveiligde verbinding.\n\nGebruik op je telefoon:\nhttps://' + window.location.hostname + ':' + window.location.port + window.location.pathname);
            } else {
                alert('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome of Safari.');
            }
            return;
        }
        if (isRecording) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setIsRecording(false);
            return;
        }
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsRecording(true);

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'nl-NL';
        recognition.continuous = true;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setNote(prev => (prev ? prev + ' ' : '') + transcript);
        };
        recognition.onend = () => {
            setIsRecording(false);
        };
        recognition.start();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                        } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        setPhoto(canvas.toDataURL('image/jpeg', 0.6));
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setPhoto(ev.target.result);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const currentType = NOTE_TYPES.find(t => t.id === noteType) || NOTE_TYPES[0];

    return (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
            maxWidth: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <i className="fa-regular fa-comment-dots" style={{ color: '#FA9F52' }}></i>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                    Project Notitie / Planning
                </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <ProjectSearch
                    items={PROJECTS.map(p => ({ id: p.id, label: p.name }))}
                    value={projectId}
                    onChange={setProjectId}
                    placeholder="Kies project..."
                    accentColor="#F5850A"
                />
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {NOTE_TYPES.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setNoteType(t.id)}
                        style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0,
                            border: `1px solid ${noteType === t.id ? t.color : '#e2e8f0'}`,
                            background: noteType === t.id ? `${t.color}15` : '#f8fafc',
                            color: noteType === t.id ? t.color : '#64748b',
                            cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <i className={`fa-solid ${t.icon}`}></i> {t.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <textarea
                    placeholder="Typ of dicteer hier de notitie, vraag of planning..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows="4"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem', borderRadius: '6px', border: `1px solid ${currentType.color}55`, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                        onClick={toggleDictation}
                        title={isRecording ? "Stop dicteren" : "Dicteren"}
                        style={{ width: '38px', height: '38px', background: isRecording ? '#ef4444' : currentType.color, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    >
                        <i className={`fa-solid ${isRecording ? 'fa-stop fa-fade' : 'fa-microphone'}`}></i>
                    </button>
                    {note && (
                        <button
                            onClick={() => setNote('')}
                            title="Wis notitie"
                            style={{ width: '38px', height: '38px', background: `${currentType.color}15`, color: currentType.color, border: `1px solid ${currentType.color}44`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                    )}
                </div>
            </div>

            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: currentType.color, marginBottom: '4px', display: 'block' }}>📸 Voeg foto/video toe (optioneel)</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <label style={{ flex: 1, padding: '6px', background: `${currentType.color}10`, border: `1px solid ${currentType.color}44`, borderRadius: '4px', color: currentType.color, fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                    <i className="fa-solid fa-camera"></i> Camera
                    <input type="file" accept="image/*,video/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
                <label style={{ flex: 1, padding: '6px', background: `${currentType.color}10`, border: `1px solid ${currentType.color}44`, borderRadius: '4px', color: currentType.color, fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                    <i className="fa-regular fa-image"></i> Galerij
                    <input type="file" accept="image/*,video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
            </div>
            {photo && (
                <div style={{ marginTop: '2px', marginBottom: '10px', fontSize: '0.6rem', color: '#16a34a', fontWeight: 600 }}>
                    <i className="fa-solid fa-check-circle" style={{ marginRight: '4px' }}></i> Bestand gekoppeld
                </div>
            )}

            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0 0', borderTop: '1px solid #e2e8f0', marginTop: '6px'
            }}>
                <button onClick={onCancel} style={{
                    padding: '6px 14px', fontSize: '0.72rem', borderRadius: '16px',
                    border: '1px solid #e2e8f0', background: '#fff', color: '#64748b',
                    cursor: 'pointer', fontWeight: 600
                }}>Annuleren</button>
                <button onClick={() => onSave({ projectId, type: noteType, text: note, photo })} disabled={!note && !photo} style={{
                    padding: '6px 16px', fontSize: '0.72rem', borderRadius: '16px', border: 'none',
                    background: (!note && !photo) ? '#94a3b8' : `linear-gradient(135deg, ${currentType.color}dd, ${currentType.color})`, color: '#fff',
                    cursor: (!note && !photo) ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                }}>
                    <i className="fa-solid fa-check"></i> Opslaan
                </button>
            </div>
        </div>
    );
}

// ─── ZZP Uren invoer (koppelt aan contractnummer) ───────────────────────────
function InlineUrenstaatZZP({ onSave, onCancel, allowedTypes }) {
    const types = allowedTypes && allowedTypes.length > 0 ? allowedTypes : UREN_TYPES.filter(t => ['normaal', 'meerwerk'].includes(t.id));

    // Laad contracten uit localStorage
    const contracten = (() => {
        try { return JSON.parse(localStorage.getItem('wa_contracten') || '[]'); } catch { return []; }
    })();

    const initialTypeId = types[0]?.id || 'normaal';
    const [rows, setRows] = useState([{
        contractId: contracten[0]?.id || '',
        hours: initialTypeId === 'meerwerk' ? ['','','','',''] : ['8', '8', '8', '8', '8'],
        typeId: initialTypeId,
        note: '',
        photo: null,
        datum: new Date().toISOString().split('T')[0],
        materiaal: '',
        showMateriaal: false,
        isRecordingNote: false,
        isRecordingMateriaal: false,
        meerwerkSoort: 'uren',
        postBedrag: ''
    }]);
    const recognitionRef = useRef(null);

    const updateHour = (ri, di, val) => {
        let parsedVal = val;
        if (parsedVal && parseFloat(parsedVal) < 0) {
            parsedVal = "0";
        }
        setRows(prev => prev.map((r, i) => i !== ri ? r : { ...r, hours: r.hours.map((h, j) => j === di ? parsedVal : h) }));
    };
    const updateContract = (ri, cid) => {
        setRows(prev => prev.map((r, i) => i !== ri ? r : { ...r, contractId: cid }));
    };
    const updateType = (ri, typeId) => {
        const isNoHours = types.find(t => t.id === typeId)?.noHours;
        setRows(prev => prev.map((r, i) => i !== ri ? r : { ...r, typeId, hours: isNoHours ? ['✓','✓','✓','✓','✓'] : ['8','8','8','8','8'] }));
    };
    const updateNote = (ri, note) => {
        setRows(prev => prev.map((r, i) => i === ri ? { ...r, note } : r));
    };

    const updateDatum = (ri, datum) => {
        setRows(prev => prev.map((r, i) => i === ri ? { ...r, datum } : r));
    };
    const updateMateriaal = (ri, materiaal) => {
        setRows(prev => prev.map((r, i) => i === ri ? { ...r, materiaal } : r));
    };

    const toggleDictation = (ri, isMateriaal = false) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Spraakherkenning wordt niet ondersteund in deze browser.');
            return;
        }

        const isRecording = isMateriaal ? rows[ri].isRecordingMateriaal : rows[ri].isRecordingNote;

        if (isRecording) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setRows(prev => prev.map((r, i) => i === ri ? { 
                ...r, 
                isRecordingNote: false, 
                isRecordingMateriaal: false
            } : r));
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        setRows(prev => prev.map((r, i) => i === ri ? { 
            ...r, 
            isRecordingNote: !isMateriaal, 
            isRecordingMateriaal: isMateriaal
        } : { 
            ...r, 
            isRecordingNote: false, 
            isRecordingMateriaal: false 
        }));

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'nl-NL';
        recognition.continuous = true;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setRows(prev => prev.map((r, i) => {
                if (i !== ri) return r;
                if (isMateriaal) {
                    return { ...r, materiaal: (r.materiaal ? r.materiaal + ' ' : '') + transcript };
                } else {
                    return { ...r, note: (r.note ? r.note + ' ' : '') + transcript };
                }
            }));
        };

        recognition.onend = () => {
            setRows(prev => prev.map((r, i) => {
                if (i !== ri) return r;
                return { ...r, isRecordingNote: false, isRecordingMateriaal: false };
            }));
        };

        recognition.start();
    };
    const handleFileChange = (ri, e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setRows(prev => prev.map((r, i) => i === ri ? { ...r, photo: ev.target.result } : r));
            };
            reader.readAsDataURL(file);
        }
    };
    const addRow = () => setRows(prev => [...prev, { contractId: contracten[0]?.id || '', hours: ['','','','',''], typeId: types[0]?.id || 'normaal', note: '', photo: null, datum: new Date().toISOString().split('T')[0], materiaal: '', showMateriaal: false, isRecordingNote: false, isRecordingMateriaal: false, meerwerkSoort: 'uren', postBedrag: '' }]);
    const removeRow = (ri) => { if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== ri)); };
    const getTotal = () => rows.reduce((sum, r) => {
        const typeInfo = types.find(t => t.id === r.typeId);
        if (typeInfo?.noHours) return sum;
        return sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
    }, 0);

    return (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', maxWidth: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-file-contract" style={{ color: '#6366f1', fontSize: '0.75rem' }} />
                </div>
                <div>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>Week {getWeekNumber()} — {types.length === 1 && types[0].id === 'meerwerk' ? 'Extra werk invoeren' : 'Uren invoeren'}</span>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{types.length === 1 && types[0].id === 'meerwerk' ? 'Koppel je notities aan een contractnummer' : 'Koppel je uren aan een contractnummer'}</div>
                </div>
            </div>

            {contracten.length === 0 && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-triangle-exclamation" />
                    Geen contracten gevonden. Maak eerst een contract aan.
                </div>
            )}

            {rows.map((row, ri) => {
                const typeInfo = types.find(t => t.id === row.typeId) || types[0];
                const isNoHours = typeInfo?.noHours;
                const contract = contracten.find(c => c.id === row.contractId);
                return (
                    <div key={ri} style={{ marginBottom: '10px', padding: '8px', borderRadius: '8px', background: `${typeInfo.color}08`, border: `1px solid ${typeInfo.color}22` }}>
                        {/* Contract zoeker */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                            <ProjectSearch
                                items={contracten.map(c => ({
                                    id: c.id,
                                    label: `${c.contractnummer || c.id}${c.klant ? ' — ' + c.klant : ''}`
                                }))}
                                value={row.contractId}
                                onChange={(id) => updateContract(ri, id)}
                                placeholder="Zoek contractnummer..."
                                accentColor="#6366f1"
                            />
                            {rows.length > 1 && (
                                <button onClick={() => removeRow(ri)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            )}
                        </div>
                        {/* Contract info badge */}
                        {contract && (
                            <div style={{ marginBottom: '6px', fontSize: '0.65rem', color: '#6366f1', background: 'rgba(99,102,241,0.06)', padding: '3px 8px', borderRadius: '4px', display: 'flex', gap: '6px' }}>
                                {contract.omschrijving && <span><i className="fa-solid fa-tag" style={{ marginRight: '3px' }} />{contract.omschrijving}</span>}
                                {contract.aanneemsom && <span><i className="fa-solid fa-euro-sign" style={{ marginRight: '3px' }} />{Number(contract.aanneemsom).toLocaleString('nl-NL')}</span>}
                            </div>
                        )}
                        {/* Type select */}
                        {types.length > 1 && (
                            <div style={{ marginBottom: '6px' }}>
                                <select
                                    value={row.typeId}
                                    onChange={(e) => updateType(ri, e.target.value)}
                                    style={{ width: '100%', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${typeInfo.color}55`, borderRadius: '6px', color: typeInfo.color, background: `${typeInfo.color}0d`, cursor: 'pointer', outline: 'none' }}
                                >
                                    {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                        )}
                        {/* Day inputs of ziek/vrij balken (VERBORGEN BIJ MEERWERK) */}
                        {row.typeId !== 'meerwerk' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                                {DAY_LABELS.map((day, di) => (
                                    <div key={di} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>{day}</div>
                                        {isNoHours ? (
                                            <div style={{ height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${typeInfo.color}15`, border: `1.5px solid ${typeInfo.color}44` }}>
                                                <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.7rem', color: typeInfo.color }} />
                                            </div>
                                        ) : (
                                            <input
                                                type="text" value={row.hours[di]} placeholder="0"
                                                onChange={(e) => updateHour(ri, di, e.target.value)}
                                                style={{ width: '100%', height: '30px', textAlign: 'center', border: `1.5px solid ${parseFloat(row.hours[di]) > 0 ? typeInfo.color : '#e2e8f0'}`, borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, color: parseFloat(row.hours[di]) > 0 ? typeInfo.color : '#94a3b8', background: parseFloat(row.hours[di]) > 0 ? `${typeInfo.color}0d` : '#fff', outline: 'none', boxSizing: 'border-box' }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = typeInfo.color; e.currentTarget.select(); }}
                                                onBlur={(e) => { if (!parseFloat(e.currentTarget.value)) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* MEERWERK EXTRA VELDEN ZZP */}
                        {row.typeId === 'meerwerk' && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${typeInfo.color}33` }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>🗓️ Datum extra werk</label>
                                <input
                                    type="date"
                                    value={row.datum || ''}
                                    onChange={(e) => updateDatum(ri, e.target.value)}
                                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px', border: `1px solid ${typeInfo.color}66`, color: '#1e293b', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, margin: 0 }}>
                                        {row.meerwerkSoort === 'post' ? '💰 Aangenomen Post' : '⏱️ Totaal uren'}
                                    </label>
                                    <button 
                                        onClick={() => setRows(prev => prev.map((r, i) => i === ri ? { ...r, meerwerkSoort: row.meerwerkSoort === 'post' ? 'uren' : 'post', postBedrag: '', hours: ['','','','',''] } : r))}
                                        style={{ background: 'none', border: 'none', color: typeInfo.color, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                    >
                                        {row.meerwerkSoort === 'post' ? 'Vul uren in' : 'Vaste prijs opgeven'}
                                    </button>
                                </div>

                                {row.meerwerkSoort !== 'post' ? (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        <input 
                                            type="number" 
                                            min="0"
                                            placeholder="0" 
                                            value={row.hours[0] === '0' ? '' : row.hours[0]} 
                                            onChange={(e) => updateHour(ri, 0, e.target.value)}
                                            style={{ width: '56px', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', borderRadius: '4px', border: `1.5px solid ${typeInfo.color}`, color: typeInfo.color, outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>
                                            <span>Uren voor deze notitie</span>
                                            {parseFloat(row.hours[0]) > 7.5 && (
                                                <span style={{ color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>{(parseFloat(row.hours[0]) - 7.5).toFixed(1).replace('.0','')}u overwerk (boven 7.5u).</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 8px', border: `1.5px solid ${typeInfo.color}`, borderRight: 'none', borderRadius: '4px 0 0 4px', color: '#64748b', fontWeight: 700 }}>€</div>
                                        <input 
                                            type="number" 
                                            placeholder="Bedrag (optioneel)..." 
                                            value={row.postBedrag} 
                                            onChange={(e) => setRows(prev => prev.map((r, idx) => idx === ri ? { ...r, postBedrag: e.target.value } : r))}
                                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '0 4px 4px 0', border: `1.5px solid ${typeInfo.color}`, outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}

                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>📝 Notities Extra Werk</label>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    <textarea
                                        placeholder="Typ of dicteer hier wat er gedaan is..."
                                        value={row.note || ''}
                                        onChange={(e) => updateNote(ri, e.target.value)}
                                        rows="3"
                                        style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={() => toggleDictation(ri)}
                                            title={row.isRecordingNote ? "Stop dicteren" : "Dicteren"}
                                            style={{ width: '36px', height: '36px', background: row.isRecordingNote ? '#ef4444' : typeInfo.color, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                        >
                                            <i className={`fa-solid ${row.isRecordingNote ? 'fa-stop fa-fade' : 'fa-microphone'}`}></i>
                                        </button>
                                        {row.note && (
                                            <button
                                                onClick={() => updateNote(ri, '')}
                                                title="Wis notitie"
                                                style={{ width: '36px', height: '36px', background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>📸 Foto/video bewijs</label>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    <label style={{ flex: 1, padding: '6px', background: `${typeInfo.color}10`, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', color: typeInfo.color, fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                        <i className="fa-solid fa-camera"></i> Camera
                                        <input type="file" accept="image/*,video/*" capture="environment" onChange={(e) => handleFileChange(ri, e)} style={{ display: 'none' }} />
                                    </label>
                                    <label style={{ flex: 1, padding: '6px', background: `${typeInfo.color}10`, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', color: typeInfo.color, fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                        <i className="fa-regular fa-image"></i> Galerij
                                        <input type="file" accept="image/*,video/*" onChange={(e) => handleFileChange(ri, e)} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                {row.photo && (
                                    <div style={{ marginTop: '-4px', marginBottom: '8px', fontSize: '0.6rem', color: '#16a34a', fontWeight: 600 }}>
                                        <i className="fa-solid fa-check-circle" style={{ marginRight: '4px' }}></i> Bestand gekoppeld
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: typeInfo.color, marginBottom: '2px', display: 'block' }}>
                                        <i className="fa-solid fa-boxes-stacked" style={{ marginRight: '4px' }}></i> Gebruikt Materiaal
                                    </label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <textarea
                                            placeholder="Controleer/pas aan of typ hier (bijv. 2 blikken)..."
                                            value={row.materiaal || ''}
                                            onChange={(e) => updateMateriaal(ri, e.target.value)}
                                            rows="3"
                                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '4px', border: `1px solid ${typeInfo.color}44`, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <button
                                                onClick={() => toggleDictation(ri, true)}
                                                title={row.isRecordingMateriaal ? "Stop inspreken" : "Extra Materiaal Inspreken"}
                                                style={{ width: '36px', height: '36px', background: row.isRecordingMateriaal ? '#ef4444' : typeInfo.color, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                            >
                                                <i className={`fa-solid ${row.isRecordingMateriaal ? 'fa-stop fa-fade' : 'fa-microphone'}`}></i>
                                            </button>
                                            {row.materiaal && (
                                                <button
                                                    onClick={() => updateMateriaal(ri, '')}
                                                    title="Wis materiaal"
                                                    style={{ width: '36px', height: '36px', background: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44`, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <button onClick={addRow} style={{ width: '100%', padding: '4px', border: '1px dashed #d0d5dd', borderRadius: '6px', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = '#6366f1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#d0d5dd'; }}
            >
                <i className="fa-solid fa-plus" /> Contract toevoegen
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>Totaal: <span style={{ color: '#6366f1', fontSize: '0.85rem' }}>{getTotal()}u</span></span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: '0.7rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Annuleren</button>
                    <button onClick={() => onSave(rows)} style={{ padding: '5px 14px', fontSize: '0.7rem', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-check" /> Opslaan
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChatBot() {
    const { user, getAllUsers } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [hasNotified, setHasNotified] = useState(false);
    const [showPulse, setShowPulse] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);
    const [templateOverride, setTemplateOverride] = useState(null);
    const [showZZPTemplate, setShowZZPTemplate] = useState(false);
    const [showEmployeePicker, setShowEmployeePicker] = useState(false);
    const [showNotitieForm, setShowNotitieForm] = useState(false);
    const [PROJECTS, setPROJECTS] = useState(() => loadProjectsFromStorage());
    const messagesEndRef = useRef(null);
    const userName = user?.name?.split(' ')[0] || 'daar';
    const userNameRef = useRef(userName);
    useEffect(() => { userNameRef.current = userName; }, [userName]);
    const allEmployees = getAllUsers ? getAllUsers().filter(u => u.phone && u.id !== user?.id) : [];

    // Laad echte projecten elke keer dat chatbot opengaat
    useEffect(() => {
        if (isOpen) setPROJECTS(loadProjectsFromStorage());
    }, [isOpen]);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showTemplate, showZZPTemplate, showEmployeePicker, showNotitieForm]);

    // Check urenstaat + contract tracker — runs ONCE only
    useEffect(() => {
        // TEMP WIPE V0OR TESTEN: Wis alle zware foto's/video's bij laden chatbot om dataverlies wegens tests op te lossen.
        try {
            const keysToRemove = [];
            for(let i=0; i<localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('schildersapp_photos_')) keysToRemove.push(k);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch(e) {}

        if (hasNotified) return;

        const timer = setTimeout(() => {
            const name = userNameRef.current;
            const greeting = getGreeting();
            const day = getDayName();

            // ── 1. Urenstaat check (nieuwe sleutel) ──
            const weekNum = getWeekNumber();
            const year = new Date().getFullYear();
            const hasHours = uren2HasHours(user?.id, weekNum, year);

            // ── 2. Contract tracker check ──
            const contracten = JSON.parse(localStorage.getItem('wa_contracten') || '[]');
            const today = new Date();
            const openTermijnen = [];
            const verlopenTermijnen = [];

            contracten.forEach(c => {
                const termijnen = c.termijnBedragen || [];
                const betalingen = c.betalingen || {};
                termijnen.forEach((bedrag, i) => {
                    if (betalingen[i]) return; // al betaald
                    const verwacht = c.termijnData?.[i] ? new Date(c.termijnData[i]) : null;
                    const label = `${c.contractnummer || c.id} — Termijn ${i + 1} (€${bedrag.toLocaleString('nl-NL')})`;
                    if (verwacht && verwacht < today) verlopenTermijnen.push(label);
                    else openTermijnen.push(label);
                });
            });

            const msgs = [
                { id: 1, from: 'bot', text: `${greeting} ${name}! 👋`, time: new Date() },
            ];

            // Urenstaat bericht
            const isZZP = (() => {
                try {
                    const saved = localStorage.getItem(`schildersapp_urenrol_${user?.id}`);
                    if (saved) return saved === 'zzp';
                } catch {}
                return user?.role === "ZZP'er";
            })();
            let baseActions = [];
            if (isZZP) {
                baseActions = [
                    { label: '📋 Uren boeken (ZZP)', action: 'fill_zzp' },
                    { label: '➕ Extra Werk Noteren', action: 'fill_meerwerk_zzp' },
                    { label: '📄 Naar Contracten', action: 'goto_contracten' },
                    { label: '⏰ Herinner mij later', action: 'later' }
                ];
            } else {
                baseActions = [
                    { label: '📝 Uren boeken', action: 'fill_template' },
                    { label: '➕ Extra Werk Noteren', action: 'fill_meerwerk' },
                    { label: '🗒️ Notitie / Planning', action: 'add_note' },
                    { label: '🗂️ Naar Projecten', action: 'goto_projecten' },
                    { label: '📉 Naar Materieel', action: 'goto_materieel' },
                    { label: '⏰ Herinner mij later', action: 'later' }
                ];
            }

            if (user?.role === 'Beheerder') {
                baseActions.push({ label: '💬 Stuur uren-herinnering', action: 'whatsapp_reminder' });
            }

            if (!hasHours) {
                msgs.push({
                    id: 2, from: 'bot',
                    text: `⏱️ Je bent momenteel in de *${isZZP ? "ZZP" : "Werknemer"}* modus.\n\nHet is ${day} en je urenstaat voor deze week is nog niet ingevuld.`,
                    time: new Date(),
                    actions: baseActions
                });
                setShowPulse(true);
            } else {
                msgs.push({ 
                    id: 2, from: 'bot', 
                    text: `✅ Je bent momenteel in de *${isZZP ? "ZZP" : "Werknemer"}* modus.\nUrenstaat week ${getWeekNumber()} is al ingevuld. Goed bezig! 💪\n\nWat wil je doen?`, 
                    time: new Date(),
                    actions: baseActions
                });
            }

            // Contract tracker bericht (alleen relevant voor ZZP modus / profielen)
            if (isZZP) {
                if (verlopenTermijnen.length > 0) {
                    msgs.push({
                        id: 3, from: 'bot',
                        text: `🔴 *Openstaande termijnen (verlopen)*:\n${verlopenTermijnen.map(t => `• ${t}`).join('\n')}\n\nDeze termijnen zijn al over de verwachte betaaldatum.`,
                        time: new Date(),
                        actions: [{ label: '📄 Ga naar Contracten', action: 'goto_contracten' }]
                    });
                    setShowPulse(true);
                } else if (openTermijnen.length > 0) {
                    msgs.push({
                        id: 3, from: 'bot',
                        text: `🟡 *Openstaande termijnen (${openTermijnen.length})*:\n${openTermijnen.slice(0, 4).map(t => `• ${t}`).join('\n')}${openTermijnen.length > 4 ? `\n• ...en ${openTermijnen.length - 4} meer` : ''}`,
                        time: new Date(),
                        actions: [{ label: '📄 Bekijk Contracten', action: 'goto_contracten' }]
                    });
                } else if (contracten.length > 0) {
                    msgs.push({ id: 3, from: 'bot', text: `✅ Alle termijnen van ${contracten.length} contracten zijn voldaan!`, time: new Date() });
                }
            }

            setMessages(msgs);
            setHasNotified(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []); // ← lege deps: eenmalig bij mount

    const addBotMessage = (text, actions) => {
        setMessages(prev => [...prev, {
            id: Date.now(), from: 'bot', text, time: new Date(), actions
        }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, {
            id: Date.now(), from: 'user', text, time: new Date()
        }]);
    };

    const handleSaveNotitie = async ({ projectId, type, text, photo }) => {
        try {
            const authorName = user?.name || 'DS Assistent';
            
            // Verzend de notitie naar de NAS Database API
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    author: authorName,
                    type: type,
                    content: text || (photo ? 'Foto/video bewijs toegevoegd' : ''),
                    photo: photo || null,
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Serverfout bij opslaan notitie');
            }

            // Oude functionaliteit: ook toevoegen in localStorage photo cache voor het algemene Foto-overzicht 
            // of we kunnen een 'photos-updated' event afvuren. 
            if (photo) {
                try {
                    const photoKey = `schildersapp_photos_${projectId}`;
                    const photos = JSON.parse(localStorage.getItem(photoKey) || '[]');
                    const ts = Date.now();
                    photos.push({ 
                        id: ts, 
                        url: photo, 
                        name: `Notitie/Planning Bijlage (${new Date().toLocaleString('nl-NL')})`, 
                        category: type === 'probleem' ? 'problemen' : 'overig', 
                        date: new Date().toISOString().split('T')[0] 
                    });
                    localStorage.setItem(photoKey, JSON.stringify(photos));
                    window.dispatchEvent(new CustomEvent('photos-updated', { detail: { projectId } }));
                } catch(pe) {
                    console.warn('Foto pas niet in algemeen overzicht (quota)', pe);
                }
            }

            // Stuur event, zodat het ProjectDossier (als dat openstaat in een ander venster) weet dat er iets gewijzigd is in the cloud
            window.dispatchEvent(new CustomEvent('notes-updated', { detail: { projectId } }));

            setShowNotitieForm(false);
            const projectName = PROJECTS.find(p => p.id === projectId)?.name || 'het project';
            addBotMessage(`✅ De notitie is succesvol opgeslagen in de The Cloud database van ${projectName}.`, [
                { label: '🗂️ Ga naar Project', action: `goto_project_${projectId}` }
            ]);

        } catch (e) {
            console.error('Fout bij opslaan notitie:', e);
            alert('Kan de notitie niet opslaan in de Database. Controleer de verbinding.');
        }
    };

    const handleSaveTemplate = (rows) => {
        const weekNum = getWeekNumber();
        const year = new Date().getFullYear();
        const total = rows.reduce((sum, r) => {
            const typeInfo = UREN_TYPES.find(t => t.id === r.typeId);
            if (typeInfo?.noHours) return sum;
            return sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
        }, 0);
        const projectNames = rows.filter(r => r.projectId).map(r => PROJECTS.find(p => p.id === r.projectId)?.name || 'Onbekend');

        // Sla op in NIEUWE format (zelfde als MijnUren component)
        // Laad bestaande weekdata om niet alles te wissen!
        const existingData = uren2LoadData(user?.id, weekNum, year) || [];

        rows.forEach((r, i) => {
            const pid = r.projectId || '1';
            const typeId = r.typeId || 'normaal';
            
            let projObj = existingData.find(p => p.projectId === pid);
            if (!projObj) {
                projObj = {
                    id: 'p' + Date.now() + i,
                    projectId: pid,
                    types: {},
                    notes: {}
                };
                existingData.push(projObj);
            }
            
            if (!projObj.types[typeId]) projObj.types[typeId] = ['','','','','','',''];
            if (!projObj.notes) projObj.notes = {};
            if (!projObj.notes[typeId]) projObj.notes[typeId] = ['','','','','','',''];

            const typeInfo = UREN_TYPES.find(t => t.id === typeId);
            
            let displayNote = r.note || '';
            if (r.materiaal) {
                displayNote += (displayNote ? '\n' : '') + 'Materiaal: ' + r.materiaal;
            }

            if (typeInfo?.noHours) {
                // Ziek/vrij: overwrite met ziek/vrij marker
                projObj.types[typeId] = ['1','1','1','1','1'];
                if (displayNote) {
                    projObj.notes[typeId][0] = projObj.notes[typeId][0] ? projObj.notes[typeId][0] + '\n' + displayNote : displayNote;
                }
            } else {
                const isPost = (r.typeId === 'meerwerk' && r.meerwerkSoort === 'post');
                for (let di = 0; di < 5; di++) {
                    if (isPost) continue;
                    const addedHrs = parseFloat(r.hours[di]) || 0;
                    if (addedHrs > 0) {
                        const currentHrs = parseFloat(projObj.types[typeId][di]) || 0;
                        projObj.types[typeId][di] = String(currentHrs + addedHrs);
                        if (displayNote) {
                            projObj.notes[typeId][di] = projObj.notes[typeId][di] ? projObj.notes[typeId][di] + '\n' + displayNote : displayNote;
                        }
                    }
                }
                if (isPost && displayNote) {
                    let placed = false;
                    for (let di = 0; di < 5; di++) {
                        if (parseFloat(projObj.types[typeId][di]) > 0) {
                            projObj.notes[typeId][di] = projObj.notes[typeId][di] ? projObj.notes[typeId][di] + '\n' + displayNote : displayNote;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        projObj.notes[typeId][0] = projObj.notes[typeId][0] ? projObj.notes[typeId][0] + '\n' + displayNote : displayNote;
                    }
                }
            }

            // --- MEERWERK KOPPELING NAAR PROJECTMAP ---
            if (typeId === 'meerwerk') {
                try {
                    const mwStoreKey = `schildersapp_meerwerk_${pid}`;
                    const existingMw = JSON.parse(localStorage.getItem(mwStoreKey) || '[]');
                    const isPost = r.meerwerkSoort === 'post';
                    const totalHours = isPost ? 0 : r.hours.reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
                    const postBedrag = isPost ? (parseFloat(r.postBedrag) || 0) : 0;
                    
                    if (totalHours > 0 || isPost || r.note || r.photo) {
                        existingMw.push({
                            id: Date.now() + i,
                            omschrijving: `Via Chatbot: ${r.note ? r.note : (isPost ? 'Vaste Post' : 'Extra werk')}`,
                            uren: totalHours,
                            bedrag: postBedrag,
                            toelichting: r.note || (isPost ? 'Vaste aangenomen post ingevoerd via chatbot.' : 'Ingevoerd via de WhatsApp chatbot.'),
                            materiaal: r.materiaal || '',
                            datum: r.datum || new Date().toISOString().split('T')[0],
                            status: 'aanvraag',
                            akkoordDatum: '',
                            foto: r.photo || null
                        });
                        try {
                            localStorage.setItem(mwStoreKey, JSON.stringify(existingMw));
                        } catch (err) {
                            if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                                console.warn('Storage quota bereikt voor meerwerk. Foto wordt genegeerd om ruimte te besparen.');
                                existingMw[existingMw.length - 1].foto = null; // Verwijder de zware foto
                                try {
                                    localStorage.setItem(mwStoreKey, JSON.stringify(existingMw));
                                } catch(finalErr) {
                                    console.error("Zelfs zonder foto past het niet meer.", finalErr);
                                }
                            } else {
                                throw err;
                            }
                        }
                    }
                } catch (e) {
                    console.error('Fout bij opslaan meerwerk:', e);
                }
            }
        });
        uren2SaveData(user?.id, weekNum, year, existingData);

        setShowTemplate(false);
        const typeSummary = [...new Set(rows.map(r => UREN_TYPES.find(t => t.id === r.typeId)?.label || r.typeId))].join(', ');
        addBotMessage(`✅ Opgeslagen! ${total} uur verdeeld over ${projectNames.join(', ')}.\nType(n): ${typeSummary}\n\nJe weekstaat voor week ${weekNum} is bijgewerkt. Je ziet ze direct in de Urenregistratie!`, [
            { label: '📋 Naar Urenregistratie', action: 'goto_uren' }
        ]);
    };

    // ZZP uren opslaan (koppelt aan contract)
    const handleSaveZZPTemplate = (rows) => {
        const weekNum = getWeekNumber();
        const year = new Date().getFullYear();
        const contracten = (() => { try { return JSON.parse(localStorage.getItem('wa_contracten') || '[]'); } catch { return []; } })();
        const total = rows.reduce((sum, r) => {
            const typeInfo = UREN_TYPES.find(t => t.id === r.typeId);
            if (typeInfo?.noHours) return sum;
            if (r.typeId === 'meerwerk' && r.meerwerkSoort === 'post') return sum;
            return sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
        }, 0);

        // Bouw projecten-structuur op met contract-ID als projectId
        // Laad bestaande weekdata om niet alles te wissen!
        const existingData = uren2LoadData(user?.id, weekNum, year) || [];

        rows.forEach((r, i) => {
            const cid = r.contractId || 'zzp_overig';
            const typeId = r.typeId || 'normaal';
            
            let projObj = existingData.find(p => p.projectId === cid);
            if (!projObj) {
                projObj = {
                    id: 'pzzp' + Date.now() + i,
                    projectId: cid,        // contract-ID als referentie
                    contractId: cid,        // extra veld voor herkenbaarheid
                    types: {},
                    notes: {}
                };
                existingData.push(projObj);
            }
            
            if (!projObj.types[typeId]) projObj.types[typeId] = ['','','','','','',''];
            if (!projObj.notes) projObj.notes = {};
            if (!projObj.notes[typeId]) projObj.notes[typeId] = ['','','','','','',''];

            const typeInfo = UREN_TYPES.find(t => t.id === typeId);
            
            let displayNote = r.note || '';
            if (r.materiaal) {
                displayNote += (displayNote ? '\n' : '') + 'Materiaal: ' + r.materiaal;
            }

            if (typeInfo?.noHours) {
                projObj.types[typeId] = ['1','1','1','1','1'];
                if (displayNote) {
                    projObj.notes[typeId][0] = projObj.notes[typeId][0] ? projObj.notes[typeId][0] + '\n' + displayNote : displayNote;
                }
            } else {
                const isPost = (r.typeId === 'meerwerk' && r.meerwerkSoort === 'post');
                for (let di = 0; di < 5; di++) {
                    if (isPost) continue;
                    const addedHrs = parseFloat(r.hours[di]) || 0;
                    if (addedHrs > 0) {
                        const currentHrs = parseFloat(projObj.types[typeId][di]) || 0;
                        projObj.types[typeId][di] = String(currentHrs + addedHrs);
                        if (displayNote) {
                            projObj.notes[typeId][di] = projObj.notes[typeId][di] ? projObj.notes[typeId][di] + '\n' + displayNote : displayNote;
                        }
                    }
                }
                if (isPost && displayNote) {
                    let placed = false;
                    for (let di = 0; di < 5; di++) {
                        if (parseFloat(projObj.types[typeId][di]) > 0) {
                            projObj.notes[typeId][di] = projObj.notes[typeId][di] ? projObj.notes[typeId][di] + '\n' + displayNote : displayNote;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        projObj.notes[typeId][0] = projObj.notes[typeId][0] ? projObj.notes[typeId][0] + '\n' + displayNote : displayNote;
                    }
                }
            }

            // --- MEERWERK KOPPELING NAAR ZZP CONTRACT ---
            if (typeId === 'meerwerk') {
                try {
                    const mwStoreKey = `schildersapp_meerwerk_${cid}`;
                    const existingMw = JSON.parse(localStorage.getItem(mwStoreKey) || '[]');
                    const isPost = r.meerwerkSoort === 'post';
                    const totalHours = isPost ? 0 : r.hours.reduce((sum, h) => sum + (parseFloat(h) || 0), 0);
                    const postBedrag = isPost ? (parseFloat(r.postBedrag) || 0) : 0;
                    
                    if (totalHours > 0 || isPost || r.note || r.photo) {
                        existingMw.push({
                            id: Date.now() + i,
                            omschrijving: `ZZP via Chatbot: ${r.note ? r.note : (isPost ? 'Vaste Post' : 'Extra werk')}`,
                            uren: totalHours,
                            bedrag: postBedrag,
                            toelichting: r.note || (isPost ? 'Vaste aangenomen post ingevoerd via ZZP chatbot.' : 'Ingevoerd via ZZP WhatsApp chatbot formulier.'),
                            materiaal: r.materiaal || '',
                            datum: r.datum || new Date().toISOString().split('T')[0],
                            status: 'aanvraag',
                            akkoordDatum: '',
                            foto: r.photo || null
                        });
                        localStorage.setItem(mwStoreKey, JSON.stringify(existingMw));
                    }
                } catch (e) {
                    console.error('Fout bij opslaan ZZP meerwerk:', e);
                }
            }
        });
        uren2SaveData(user?.id, weekNum, year, existingData);

        // Sla ook uren-link op per contract
        rows.forEach(r => {
            if (!r.contractId) return;
            if (r.typeId === 'meerwerk' && r.meerwerkSoort === 'post') return;
            const dayTotal = r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
            const urenLinks = JSON.parse(localStorage.getItem(`wa_contract_uren_${r.contractId}`) || '[]');
            urenLinks.push({ weekNum, year, uren: dayTotal, typeId: r.typeId, savedAt: new Date().toISOString() });
            localStorage.setItem(`wa_contract_uren_${r.contractId}`, JSON.stringify(urenLinks));
        });

        setShowZZPTemplate(false);
        const contractLabels = rows.map(r => {
            const c = contracten.find(x => x.id === r.contractId);
            return c ? (c.contractnummer || c.id) : 'onbekend';
        });
        addBotMessage(`✅ ${total} uur geboekt als ZZP'er op contract${contractLabels.length > 1 ? 'en' : ''}: ${[...new Set(contractLabels)].join(', ')} (week ${weekNum}).`, [
            { label: '📋 Naar Urenregistratie', action: 'goto_uren' }
        ]);
    };

    const handleAction = (action) => {
        const isZZP = (() => {
            try {
                const saved = localStorage.getItem(`schildersapp_urenrol_${user?.id}`);
                if (saved) return saved === 'zzp';
            } catch {}
            return user?.role === "ZZP'er";
        })();
        if (action === 'fill_zzp') {
            addUserMessage("Uren boeken (ZZP)");
            setTimeout(() => {
                addBotMessage('Koppel je uren aan een contractnummer 📋');
                setTimeout(() => {
                    setTemplateOverride(null);
                    setShowZZPTemplate(true);
                }, 300);
            }, 400);
        } else if (action === 'fill_meerwerk_zzp') {
            addUserMessage("Extra werkzaamheden tussendoor toevoegen (ZZP)");
            setTimeout(() => {
                addBotMessage('Koppel je extra werk aan een contractnummer 👇');
                setTimeout(() => { 
                    setTemplateOverride(['meerwerk']); 
                    setShowZZPTemplate(true); 
                }, 300);
            }, 400);
        } else if (action === 'fill_meerwerk') {
            addUserMessage("Extra werkzaamheden tussendoor toevoegen");
            setTimeout(() => {
                addBotMessage('Koppel je uren en notities the het juiste project 👇');
                setTimeout(() => { 
                    setTemplateOverride(['meerwerk']); 
                    setShowTemplate(true); 
                }, 300);
            }, 400);
        } else if (action === 'fill_template') {
            addUserMessage(isZZP ? "Uren boeken als ZZP'er" : 'Uren boeken als werknemer');
            setTimeout(() => {
                addBotMessage(isZZP
                    ? 'Koppel je uren aan een contractnummer 📋'
                    : 'Hier is je weekstaat! Vul je uren in per project per dag 👇'
                );
                setTimeout(() => { 
                    setTemplateOverride(null);
                    isZZP ? setShowZZPTemplate(true) : setShowTemplate(true); 
                }, 300);
            }, 400);
        } else if (action === 'goto_uren') {
            addUserMessage('Ga naar Urenregistratie');
            setTimeout(() => {
                addBotMessage('Top! Ik open de urenregistratie voor je. 📋');
                setTimeout(() => { window.location.href = '/urenregistratie'; }, 800);
            }, 500);
        } else if (action === 'later') {
            addUserMessage('Later');
            setTimeout(() => {
                addBotMessage('Oké, ik herinner je er later aan! ⏰ Vergeet het niet voor vrijdag 😊');
            }, 500);
        } else if (action === 'whatsapp_reminder') {
            addUserMessage('WhatsApp herinnering');
            setTimeout(() => {
                if (allEmployees.length === 0) {
                    addBotMessage('Er zijn geen medewerkers met telefoonnummers gevonden. Voeg telefoonnummers toe in Toegangsbeheer.');
                    return;
                }
                addBotMessage(`Naar wie wil je de herinnering sturen? 📱\n\n${allEmployees.map((e, i) => `${i + 1}. ${e.name} (${e.role})`).join('\n')}`, [
                    { label: '📨 Stuur naar iedereen', action: 'send_all_wa' },
                    { label: '👤 Kies medewerker', action: 'pick_employee_wa' }
                ]);
            }, 400);
        } else if (action === 'send_all_wa') {
            addUserMessage('Stuur naar iedereen');
            setTimeout(() => {
                const msg = `Hoi! 👋 Dit is een herinnering van SchildersApp.\n\nJe urenstaat voor deze week is nog niet ingevuld.\n\n📋 Vul je uren in: ${APP_URL}/uren\n\nReageer met ✅ als je klaar bent!`;
                allEmployees.forEach((emp, i) => {
                    setTimeout(() => {
                        window.open(`https://wa.me/${emp.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }, i * 1500);
                });
                const names = allEmployees.map(e => e.name).join(', ');
                addBotMessage(`📨 WhatsApp wordt geopend voor ${allEmployees.length} medewerkers:\n${names}\n\nElke medewerker kan direct reageren in het WhatsApp-gesprek!`);
            }, 500);
        } else if (action === 'pick_employee_wa') {
            addUserMessage('Kies medewerker');
            setTimeout(() => {
                setShowEmployeePicker(true);
            }, 300);
        } else if (action === 'uren_klaar_wa') {
            addUserMessage('✅ Uren ingevuld!');
            setTimeout(() => {
                const msg = `✅ Mijn urenstaat voor week ${getWeekNumber()} is ingevuld! — ${userName}`;
                const adminPhone = allEmployees[0]?.phone || '31612345678';
                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                addBotMessage('Top! 🎉 Je reactie wordt via WhatsApp verstuurd.');
            }, 500);
        } else if (action === 'uren_later_wa') {
            addUserMessage('⏰ Doe ik later');
            setTimeout(() => {
                const msg = `⏰ Ik vul mijn urenstaat later deze week in. — ${userName}`;
                const adminPhone = allEmployees[0]?.phone || '31612345678';
                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                addBotMessage('Oké, je reactie wordt via WhatsApp verstuurd. Vergeet het niet! 😊');
            }, 500);
        } else if (action === 'add_note') {
            addUserMessage('Notitie / Planning toevoegen');
            setTimeout(() => {
                addBotMessage('Waar gaat de notitie over? Kies een project en type 👇');
                setTimeout(() => { 
                    setShowNotitieForm(true); 
                }, 300);
            }, 400);
        } else if (action === 'goto_projecten') {
            addUserMessage('Ga naar Projecten');
            setTimeout(() => { window.location.href = '/projecten'; }, 500);
        } else if (action.startsWith('goto_project_')) {
            const pid = action.replace('goto_project_', '');
            addUserMessage('Ga naar Project');
            setTimeout(() => { window.location.href = `/projecten/${pid}`; }, 500);
        } else if (action === 'goto_materieel') {
            addUserMessage('Ga naar Materieel');
            setTimeout(() => { window.location.href = '/materieel'; }, 500);
        } else if (action === 'goto_contracten') {
            addUserMessage('Bekijk Contracten');
            setTimeout(() => { window.location.href = '/whatsapp?tab=contracten'; }, 500);
        }
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        addUserMessage(text);
        setInput('');

        setTimeout(() => {
            const lower = text.toLowerCase();

            // ── NLP: uren invullen via chatbot ──
            const hourMatch = lower.match(/(\d+[,.]?\d*)\s*(?:uur|u\b)/);
            const hours = hourMatch ? parseFloat(hourMatch[1].replace(',', '.')) : null;

            // Dag detectie
            const DAY_MAP = {
                'vandaag': new Date().getDay() === 0 ? -1 : new Date().getDay() - 1,
                'gisteren': new Date().getDay() <= 1 ? -1 : new Date().getDay() - 2,
                'maandag': 0, 'ma': 0,
                'dinsdag': 1, 'di': 1,
                'woensdag': 2, 'wo': 2,
                'donderdag': 3, 'do': 3,
                'vrijdag': 4, 'vr': 4,
            };
            let dayIdx = -1;
            for (const [word, idx] of Object.entries(DAY_MAP)) {
                if (lower.includes(word)) { dayIdx = idx; break; }
            }
            if (dayIdx === -1 && lower.includes('vandaag')) {
                dayIdx = Math.max(0, new Date().getDay() - 1);
            }

            // Project detectie
            const matchedProject = PROJECTS.find(p =>
                p.name.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word))
            );

            // Directe uren-invulling via NLP
            if (hours !== null && hours > 0 && hours <= 24 && dayIdx >= 0) {
                if (lower.includes('extra') || lower.includes('meerwerk')) {
                    addBotMessage('Extra werk uren gevonden! ➕ Om extra werkzaamheden goed te boeken met notities/foto\'s, klik aub op de volgende knop 👇', [
                        { label: '➕ Extra Werk Noteren', action: 'fill_meerwerk' }
                    ]);
                    return;
                }

                const weekNum = getWeekNumber();
                const year = new Date().getFullYear();
                const proj = uren2LoadData(user?.id, weekNum, year) || [];
                
                // Vind of maak project
                const pTargetId = matchedProject ? matchedProject.id : '1';
                let target = proj.find(p => p.projectId === pTargetId);
                if (!target) {
                    target = { 
                        id: 'p' + Date.now(), projectId: pTargetId, 
                        types: { normaal: ['','','','','','',''] }, notes: { normaal: ['','','','','','',''] } 
                    };
                    proj.push(target);
                }
                
                // Optellen ipv overschrijven
                if (!target.types) target.types = {};
                if (!target.types.normaal) target.types.normaal = ['','','','','','',''];
                if (!target.notes) target.notes = {};
                if (!target.notes.normaal) target.notes.normaal = ['','','','','','',''];
                
                const currentHrs = parseFloat(target.types.normaal[dayIdx]) || 0;
                target.types.normaal[dayIdx] = String(currentHrs + hours);
                
                uren2SaveData(user?.id, weekNum, year, proj);
                const DAY_NAMES = ['maandag','dinsdag','woensdag','donderdag','vrijdag'];
                const projName = PROJECTS.find(p => p.id === pTargetId)?.name || 'project';
                addBotMessage(`✅ Aangevuld! ${hours} extra uur erbij op ${DAY_NAMES[dayIdx]} voor ${projName}.\n\nWeek ${weekNum} bijgewerkt. 💪`, [
                    { label: '📋 Bekijk Urenregistratie', action: 'goto_uren' },
                    { label: '📝 Meer invullen', action: 'fill_template' },
                ]);
                return;
            }

            // Ziek / vrij detectie
            if (lower.includes('ziek') || lower.includes('ziekmelding')) {
                addBotMessage('Wil je een ziekmelding doorgeven voor vandaag? 🤒', [
                    { label: '🤒 Ja, meld ziek', action: 'fill_template' },
                    { label: '❌ Nee', action: 'later' }
                ]);
            } else if (lower.includes('uren') || lower.includes('urenstaat') || lower.includes('invullen') || lower.includes('uur')) {
                addBotMessage('Wil je je uren direct hier invullen of naar de volledige pagina? 📋', [
                    { label: '📝 Vul hier in', action: 'fill_template' },
                    { label: '📋 Naar Urenregistratie', action: 'goto_uren' }
                ]);
            } else if (lower.includes('project')) {
                addBotMessage('Wil je naar de projectenplanning? 📊', [
                    { label: '📊 Ga naar Projecten', action: 'goto_projecten' }
                ]);
            } else if (lower.includes('materieel') || lower.includes('gereedschap')) {
                addBotMessage('Wil je naar het materieelbeheer? 🔧', [
                    { label: '🔧 Ga naar Materieel', action: 'goto_materieel' }
                ]);
            } else if (lower.includes('hallo') || lower.includes('hey') || lower.includes('hoi')) {
                addBotMessage(`Hoi ${userName}! 👋 Hoe kan ik je helpen?\n\nJe kunt o.a. typen:\n• "vandaag 7.5 uur" om uren in te vullen\n• "maandag 8 uur op Bakker"\n• "uren invullen" voor het formulier`);
            } else if (lower.includes('help')) {
                addBotMessage('Ik kan je helpen met:\n• ⏱️ "vandaag 7.5 uur" → direct invullen\n• "maandag 8 uur op Bakker" → specifieke dag + project\n• 📝 "uren invullen" → weekformulier\n• 📊 "projecten" → projectplanning\n• 🔧 "materieel" → gereedschapsbeheer');
            } else {
                addBotMessage(`Tips om uren in te vullen:\n• Typ "vandaag 7.5 uur"\n• Of "maandag 8 uur op Wassenaar"\n\nOf typ "help" voor alle opties. 😊`);
            }
        }, 600);
    };

    const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    if (!user) return null;

    return (
        <>
            {/* ── Floating chatbot knop ── */}
            <button
                onClick={() => { setIsOpen(!isOpen); setShowPulse(false); }}
                style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    width: '64px', height: '64px',
                    borderRadius: '12px',
                    border: 'none', cursor: 'pointer', zIndex: 10000,
                    background: 'transparent',
                    padding: 0,
                    boxShadow: '0 4px 20px rgba(245,133,10,0.5), 0 2px 8px rgba(0,0,0,0.18)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: showPulse ? 'chatPulse 2s infinite' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.06)';
                    e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,133,10,0.7), 0 2px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,133,10,0.5), 0 2px 8px rgba(0,0,0,0.18)';
                }}
            >
                {isOpen
                    ? (
                        <div style={{
                            width: '100%', height: '100%',
                            background: 'linear-gradient(145deg, #FA9F52, #F5850A)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <i className="fa-solid fa-xmark" style={{ fontSize: '1.5rem', color: '#fff' }}></i>
                        </div>
                    )
                    : (
                        <img
                            src="/logo aangepast.png?v=1"
                            alt="DS Assistent"
                            style={{ width: '64px', height: '64px', display: 'block', objectFit: 'cover' }}
                        />
                    )
                }
            </button>

            {showPulse && !isOpen && (
                <div style={{
                    position: 'fixed', bottom: '68px', right: '24px', zIndex: 10001,
                    background: '#ef4444', color: '#fff', borderRadius: '12px',
                    padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700,
                    animation: 'chatBounce 1s infinite'
                }}>1</div>
            )}

            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '92px', right: '24px', width: '380px', maxHeight: '560px',
                    borderRadius: '16px', overflow: 'hidden', zIndex: 10000,
                    boxShadow: '0 12px 48px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex', flexDirection: 'column', background: '#fff',
                    animation: 'chatSlideIn 0.25s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #FA9F52, #F5850A)',
                        padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px',
                        flexShrink: 0
                    }}>
                        <img
                            src="/logo aangepast.png?v=1"
                            alt="DS Assistent"
                            style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'block', objectFit: 'cover' }}
                        />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{BOT_NAME}</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                                <i className="fa-solid fa-circle" style={{ fontSize: '0.3rem', color: '#4ade80', marginRight: '4px' }}></i>
                                Online • SchildersApp
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '14px', display: 'flex',
                        flexDirection: 'column', gap: '10px', background: '#f8fafc',
                        maxHeight: '400px', minHeight: '180px'
                    }}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '88%', padding: '9px 13px', borderRadius: '12px',
                                    fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-line',
                                    background: msg.from === 'user'
                                        ? 'linear-gradient(135deg, #FA9F52, #F5850A)' : '#fff',
                                    color: msg.from === 'user' ? '#fff' : '#1e293b',
                                    boxShadow: msg.from === 'user'
                                        ? '0 2px 8px rgba(245,133,10,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                                    borderBottomRightRadius: msg.from === 'user' ? '4px' : '12px',
                                    borderBottomLeftRadius: msg.from === 'bot' ? '4px' : '12px',
                                }}>
                                    {msg.text}
                                </div>
                                {msg.actions && (
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {msg.actions.map((a, i) => (
                                            <button key={i} onClick={() => handleAction(a.action)}
                                                style={{
                                                    padding: '5px 12px', borderRadius: '18px', border: '1px solid #FA9F52',
                                                    background: '#fff', color: '#F5850A', fontSize: '0.7rem',
                                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF7ED'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                                            >{a.label}</button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginTop: '3px', paddingLeft: '4px' }}>
                                    {formatTime(msg.time)}
                                </div>
                            </div>
                        ))}

                        {showTemplate && (
                            <div style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                                <InlineUrenstaat
                                    onSave={(rows) => { handleSaveTemplate(rows); setTemplateOverride(null); }}
                                    onCancel={() => { setShowTemplate(false); setTemplateOverride(null); addBotMessage('Geen probleem! Je kunt later invullen. ⏰'); }}
                                    allowedTypes={(() => {
                                        if (templateOverride) return UREN_TYPES.filter(t => templateOverride.includes(t.id));
                                        return getUserUrenTypes(user?.id);
                                    })()}
                                />
                            </div>
                        )}

                        {showZZPTemplate && (
                            <div style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                                <InlineUrenstaatZZP
                                    onSave={(rows) => { handleSaveZZPTemplate(rows); setTemplateOverride(null); }}
                                    onCancel={() => { setShowZZPTemplate(false); setTemplateOverride(null); addBotMessage('Geen probleem! Je kunt later invullen. ⏰'); }}
                                    allowedTypes={(() => {
                                        if (templateOverride) return UREN_TYPES.filter(t => templateOverride.includes(t.id));
                                        return getUserUrenTypes(user?.id);
                                    })()}
                                />
                            </div>
                        )}
                        {showNotitieForm && (
                            <div style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                                <InlineNotitie
                                    onSave={handleSaveNotitie}
                                    onCancel={() => { setShowNotitieForm(false); addBotMessage('Geen probleem! Notitie geannuleerd.'); }}
                                />
                            </div>
                        )}

                        {/* Employee WhatsApp picker */}
                        {showEmployeePicker && (
                            <div style={{
                                alignSelf: 'flex-start', maxWidth: '100%', width: '100%',
                                background: '#fff', borderRadius: '12px', padding: '12px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '1.1rem' }}></i>
                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>Kies medewerker</span>
                                </div>
                                {allEmployees.map(emp => (
                                    <div key={emp.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
                                        border: '1px solid #e2e8f0', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#25D366'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                        onClick={() => {
                                            const msg = `Hoi ${emp.name.split(' ')[0]}! 👋 Dit is een herinnering van SchildersApp.\n\nJe urenstaat voor deze week is nog niet ingevuld.\n\n📋 Vul je uren in: ${APP_URL}/uren\n\nReageer met ✅ als je klaar bent!`;
                                            window.open(`https://wa.me/${emp.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                            setShowEmployeePicker(false);
                                            addBotMessage(`📱 WhatsApp geopend voor ${emp.name}! Ze kunnen direct antwoorden.`);
                                        }}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #FA9F52, #F5850A)',
                                            color: '#fff', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0
                                        }}>{emp.initials}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{emp.role} • +{emp.phone}</div>
                                        </div>
                                        <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '1.2rem' }}></i>
                                    </div>
                                ))}
                                <button onClick={() => { setShowEmployeePicker(false); }}
                                    style={{
                                        width: '100%', padding: '5px', marginTop: '4px',
                                        border: '1px solid #e2e8f0', borderRadius: '6px',
                                        background: '#fff', color: '#94a3b8', cursor: 'pointer',
                                        fontSize: '0.68rem', fontWeight: 600
                                    }}>Sluiten</button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '10px 14px', borderTop: '1px solid #e2e8f0',
                        display: 'flex', gap: '8px', background: '#fff', flexShrink: 0
                    }}>
                        <input
                            type="text" value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                            placeholder="Typ een bericht..."
                            style={{
                                flex: 1, border: '1px solid #e2e8f0', borderRadius: '24px',
                                padding: '8px 14px', fontSize: '0.8rem', outline: 'none',
                                background: '#f8fafc', color: '#1e293b'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#FA9F52'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                        />
                        <button onClick={handleSend} style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #FA9F52, #F5850A)',
                            color: '#fff', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem',
                            flexShrink: 0
                        }}>
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes chatPulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(245,133,10,0.4); }
                    50% { box-shadow: 0 4px 30px rgba(245,133,10,0.7), 0 0 0 8px rgba(245,133,10,0.15); }
                }
                @keyframes chatBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes chatSlideIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
