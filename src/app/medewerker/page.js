'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

const MONTH_NAMES = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const DAY_NAMES = ['Zo','Ma','Di','Wo','Do','Vr','Za'];


function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function isTodayInRange(startIso, endIso) {
    const today = new Date(); today.setHours(0,0,0,0);
    const s = new Date(startIso + 'T00:00:00'); s.setHours(0,0,0,0);
    const e = new Date(endIso + 'T00:00:00'); e.setHours(0,0,0,0);
    return today >= s && today <= e;
}

function getTodayProjects(userId) {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const projects = raw ? JSON.parse(raw) : [];
        const result = [];
        for (const p of projects) {
            if (!p.tasks) continue;
            for (const t of p.tasks) {
                const assigned = t.assignedTo || [];
                const userIds = assigned.map(x => typeof x === 'object' ? x.id : x).map(Number);
                if (userIds.includes(Number(userId)) && t.startDate && t.endDate && isTodayInRange(t.startDate, t.endDate) && !t.completed) {
                    result.push({ projectId: p.id, projectName: p.name, color: p.color || '#F5850A', taskName: t.name, taskId: t.id, endDate: t.endDate });
                }
            }
        }
        return result;
    } catch { return []; }
}

function getWeekHours(userId) {
    try {
        const today = new Date();
        const week = getISOWeek(today);
        const year = today.getFullYear();
        const key = `schildersapp_urv2_u${userId}_w${week}_${year}`;
        const raw = localStorage.getItem(key);
        if (!raw) return 0;
        const data = JSON.parse(raw);
        let total = 0;
        for (const p of data) {
            for (const type of Object.keys(p.types || {})) {
                for (const v of (p.types[type] || [])) {
                    total += parseFloat(String(v).replace(',', '.')) || 0;
                }
            }
        }
        return total;
    } catch { return 0; }
}

function getMyOpenTasks(userId) {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const projects = raw ? JSON.parse(raw) : [];
        const result = [];
        for (const p of projects) {
            if (!p.tasks) continue;
            for (const t of p.tasks) {
                const assigned = t.assignedTo || [];
                const userIds = assigned.map(x => typeof x === 'object' ? x.id : x).map(Number);
                if (userIds.includes(Number(userId)) && !t.completed) {
                    result.push({ projectName: p.name, color: p.color || '#F5850A', taskName: t.name, endDate: t.endDate });
                }
            }
        }
        return result.sort((a, b) => (a.endDate || '9999') > (b.endDate || '9999') ? 1 : -1);
    } catch { return []; }
}

function QuickCard({ icon, label, color, onClick }) {
    return (
        <button onClick={onClick} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px',
            padding: '14px 6px 12px', background: '#fff', border: '1.5px solid #f1f5f9',
            borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer',
            transition: 'transform 0.12s, box-shadow 0.12s',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
        >
            <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1.05rem' }} />
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
        </button>
    );
}

function SectionHeader({ title, linkLabel, linkPath }) {
    const router = useRouter();
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h3>
            </div>
            {linkLabel && <button onClick={() => router.push(linkPath)} style={{ background: '#fff8f0', border: '1.5px solid #fde8cc', borderRadius: '8px', cursor: 'pointer', color: '#F5850A', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}>{linkLabel} →</button>}
        </div>
    );
}

const WMO_WEER = {
    0:  { nl: 'Heldere lucht',        emoji: '☀️',  cat: 'sun' },
    1:  { nl: 'Overwegend helder',    emoji: '🌤️', cat: 'sun' },
    2:  { nl: 'Gedeeltelijk bewolkt', emoji: '⛅',  cat: 'cloud' },
    3:  { nl: 'Bewolkt',              emoji: '☁️',  cat: 'cloud' },
    45: { nl: 'Mist',                 emoji: '🌫️', cat: 'fog' },
    48: { nl: 'IJsmist',              emoji: '🌫️', cat: 'fog' },
    51: { nl: 'Lichte motregen',      emoji: '🌦️', cat: 'rain' },
    53: { nl: 'Motregen',             emoji: '🌦️', cat: 'rain' },
    55: { nl: 'Zware motregen',       emoji: '🌧️', cat: 'rain' },
    61: { nl: 'Lichte regen',         emoji: '🌧️', cat: 'rain' },
    63: { nl: 'Regen',                emoji: '🌧️', cat: 'rain' },
    65: { nl: 'Zware regen',          emoji: '🌧️', cat: 'rain' },
    71: { nl: 'Lichte sneeuw',        emoji: '🌨️', cat: 'snow' },
    73: { nl: 'Sneeuw',               emoji: '❄️',  cat: 'snow' },
    75: { nl: 'Zware sneeuw',         emoji: '❄️',  cat: 'snow' },
    77: { nl: 'Sneeuwkorrels',        emoji: '🌨️', cat: 'snow' },
    80: { nl: 'Lichte buien',         emoji: '🌦️', cat: 'rain' },
    81: { nl: 'Buien',                emoji: '🌧️', cat: 'rain' },
    82: { nl: 'Zware buien',          emoji: '⛈️', cat: 'storm' },
    85: { nl: 'Sneeuwbuien',          emoji: '🌨️', cat: 'snow' },
    86: { nl: 'Zware sneeuwbuien',    emoji: '❄️',  cat: 'snow' },
    95: { nl: 'Onweer',               emoji: '⛈️', cat: 'storm' },
    96: { nl: 'Onweer met hagel',     emoji: '⛈️', cat: 'storm' },
    99: { nl: 'Zwaar onweer',         emoji: '🌩️', cat: 'storm' },
};

function getWeerWmo(code) { return WMO_WEER[code] ?? { nl: 'Onbekend', emoji: '🌡️', cat: 'unknown' }; }

function werkAdviesKort(current) {
    if (!current) return null;
    const wmo = getWeerWmo(current.weathercode);
    if (wmo.cat === 'storm') return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: 'Onweer — werk stilleggen' };
    if (wmo.cat === 'rain')  return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', text: 'Regen — buiten verven niet mogelijk' };
    if (wmo.cat === 'snow')  return { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', text: 'Sneeuw/vorst — buiten verven niet mogelijk' };
    if (current.windspeed_10m > 40) return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: `Harde wind ${Math.round(current.windspeed_10m)} km/u — spuitwerk gevaarlijk` };
    if (current.temperature_2m < 5) return { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', text: `${Math.round(current.temperature_2m)}°C — verf droogt slecht` };
    return { color: '#10b981', bg: '#f0fdf4', border: '#86efac', text: 'Gunstig weer voor verfwerk' };
}

export default function MedewerkerHome() {
    const { user } = useAuth();
    const router = useRouter();
    const [vandaag, setVandaag] = useState([]);
    const [weekUren, setWeekUren] = useState(0);
    const [openTaken, setOpenTaken] = useState([]);
    const [openTakenUitgeklapt, setOpenTakenUitgeklapt] = useState(false);
    const [ziekModal, setZiekModal] = useState(false);
    const [ziekForm, setZiekForm] = useState({ datum: new Date().toISOString().slice(0,10), reden: '' });
    const [ziekSaved, setZiekSaved] = useState(false);
    const [weerData, setWeerData] = useState(null);
    const [weerLoading, setWeerLoading] = useState(true);
    const [weerUitgeklapt, setWeerUitgeklapt] = useState(false);
    const [verjaardagen, setVerjaardagen] = useState([]);
    const [toolboxMeetings, setToolboxMeetings] = useState([]);
    const [toolboxApiMeetings, setToolboxApiMeetings] = useState([]);
    const [gelezenDocsOpen, setGelezenDocsOpen] = useState(false);
    const [docs, setDocs]               = useState([]);
    const [docViewer, setDocViewer]     = useState(null);

    useEffect(() => {
        if (!user) return;
        setVandaag(getTodayProjects(user.id));
        setWeekUren(getWeekHours(user.id));
        setOpenTaken(getMyOpenTasks(user.id));

        // Verjaardagen worden geladen via API hieronder


        // Verjaardagen laden via API (alleen komende 14 dagen tonen)
        fetch('/api/verjaardagen').then(r => r.json()).then(data => {
            if (Array.isArray(data)) setVerjaardagen(data.filter(v => v.dagenTot <= 14));
        }).catch(() => {});

        // Toolbox meetings laden
        try {
            const rawTb = localStorage.getItem('schildersapp_toolbox_meetings');
            setToolboxMeetings(rawTb ? JSON.parse(rawTb) : []);
        } catch {}

        // Documenten laden
        fetch('/api/documenten').then(r => r.json()).then(data => {
            if (Array.isArray(data)) {
                const nu = new Date();
                setDocs(data.filter(d => !d.zichtbaarVanaf || new Date(d.zichtbaarVanaf) <= nu));
            }
        }).catch(() => {});

        // Toolbox meetings van API laden (voor akkoordGegeven status)
        fetch('/api/medewerker-toolbox').then(r => r.json()).then(data => { if (Array.isArray(data)) setToolboxApiMeetings(data); }).catch(() => {});

        // Luister naar aanvinken vanuit de PDF viewer iframe
        const onMsg = (e) => {
            if (e.data?.type !== 'gelezen') return;
            const { docId, userId, naam, timestamp } = e.data;
            setDocs(prev => prev.map(d => d.id !== docId ? d : {
                ...d, gelezen: [...(d.gelezen || []), { userId, naam, timestamp }]
            }));
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);


    }, [user]);

    useEffect(() => {
        function fetchWeer(lat, lon) {
            const params = new URLSearchParams({
                latitude: lat, longitude: lon,
                current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,precipitation_probability',
                daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                timezone: 'Europe/Amsterdam', forecast_days: '4',
            });
            fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
                .then(r => r.json())
                .then(d => setWeerData(d))
                .catch(() => {})
                .finally(() => setWeerLoading(false));
        }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                p => fetchWeer(p.coords.latitude, p.coords.longitude),
                ()  => fetchWeer(52.3676, 4.9041),
                { timeout: 6000 }
            );
        } else {
            fetchWeer(52.3676, 4.9041);
        }
    }, []);

    const today = new Date();
    const todayLabel = `${DAY_NAMES[today.getDay()]} ${today.getDate()} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
    async function bevestigGelezen(id) {
        try {
            const res = await fetch(`/api/documenten/${id}/gelezen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, naam: user.name }),
            });
            const data = await res.json();
            if (data.ok) {
                setDocs(prev => prev.map(d => d.id !== id ? d : {
                    ...d,
                    gelezen: [...(d.gelezen || []), { userId: user.id, naam: user.name, timestamp: data.timestamp }],
                }));
            }
        } catch {}
    }

    function bekijkDoc(doc) {
        const isPdf = doc.type === 'application/pdf';
        const gelezenDoor = (doc.gelezen || []).find(g => g.userId === user?.id);
        const viewerUrl = isPdf
            ? `/api/documenten/${doc.id}/viewer?userId=${user?.id}&naam=${encodeURIComponent(user?.name || '')}&gelezen=${gelezenDoor ? '1' : '0'}`
            : `/api/documenten/${doc.id}/bestand`;
        setDocViewer({ id: doc.id, titel: doc.titel, url: viewerUrl, type: doc.type });
    }


    function handleZiekMelden() {
        // Sla ziekmelding op
        const key = `schildersapp_ziek_${user.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ ...ziekForm, naam: user.name, ingediend: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));

        // Voeg ook toe aan urenregistratie
        const urenEntry = {
            id: 'ziek_' + Date.now(),
            userId: user.id,
            projectId: null,
            taskId: null,
            taskName: 'Ziekmelding',
            date: ziekForm.datum,
            type: 'ziek',
            note: ziekForm.reden.trim() || 'Ziek gemeld',
        };
        try {
            const raw = localStorage.getItem('schildersapp_uren_registraties');
            const all = raw ? JSON.parse(raw) : [];
            all.push(urenEntry);
            localStorage.setItem('schildersapp_uren_registraties', JSON.stringify(all));
        } catch {}

        setZiekSaved(true);
        setTimeout(() => { setZiekModal(false); setZiekSaved(false); }, 1500);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-house" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Hoi, {user?.name?.split(' ')[0]} 👋</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>{todayLabel}</div>
                    </div>
                </div>
            </div>

        <div style={{ padding: '16px 16px 8px' }}>
            {/* Datum + Welkom verwijderd — staat nu in header */}

            {/* Vandaag planning */}
            <div style={{ marginBottom: '22px' }}>
                <SectionHeader title="Vandaag" linkLabel="Planning" linkPath="/medewerker/planning" />
                {vandaag.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #f1f5f9', padding: '16px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fa-regular fa-calendar-check" style={{ color: '#cbd5e1', fontSize: '1rem' }} />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Geen taken ingepland voor vandaag</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {vandaag.map(t => (
                            <div key={t.taskId} onClick={() => router.push('/medewerker/planning')}
                                style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #fde8cc', padding: '13px 15px', boxShadow: '0 1px 6px rgba(245,133,10,0.08)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color || '#F5850A', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.taskName}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{t.projectName}</div>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#F5850A', fontWeight: 700, flexShrink: 0 }}>
                                    t/m {t.endDate ? new Date(t.endDate + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Open taken */}
            {openTaken.length > 0 && (() => {
                const zichtbaar = openTakenUitgeklapt ? openTaken : openTaken.slice(0, 3);
                const isLaat = (t) => t.endDate && new Date(t.endDate + 'T00:00:00') < new Date();
                return (
                    <div style={{ marginBottom: '22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                                <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Openstaande taken</h3>
                            </div>
                            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, borderRadius: '999px', padding: '2px 8px' }}>
                                {openTaken.length}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            {zichtbaar.map((t, i) => (
                                <div key={i} onClick={() => router.push('/medewerker/planning')}
                                    style={{ background: '#fff', borderRadius: '12px', border: `1.5px solid ${isLaat(t) ? '#fecaca' : '#f1f5f9'}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color || '#F5850A', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.taskName}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>{t.projectName}</div>
                                    </div>
                                    {t.endDate && (
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isLaat(t) ? '#ef4444' : '#94a3b8', flexShrink: 0 }}>
                                            {isLaat(t) ? '⚠ ' : ''}{new Date(t.endDate + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {openTaken.length > 3 && (
                            <button onClick={() => setOpenTakenUitgeklapt(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginTop: '6px', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <i className={`fa-solid fa-chevron-${openTakenUitgeklapt ? 'up' : 'down'}`} style={{ fontSize: '0.6rem' }} />
                                {openTakenUitgeklapt ? 'Minder tonen' : `${openTaken.length - 3} meer taken`}
                            </button>
                        )}
                        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                            Deze week: <strong style={{ color: '#475569' }}>{weekUren}u</strong> geregistreerd
                        </div>
                    </div>
                );
            })()}

            {/* Verjaardagen */}
            {verjaardagen.length > 0 && (
                <div style={{ marginBottom: '22px' }}>
                    <SectionHeader title="Verjaardagen" />
                    {verjaardagen.map((v) => (
                        <div key={v.id} style={{
                            background: v.dagenTot === 0 ? '#f0fdf4' : '#fff8f0',
                            borderRadius: '12px',
                            border: `1px solid ${v.dagenTot === 0 ? '#86efac' : '#fde8cc'}`,
                            padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px',
                            marginBottom: '8px',
                        }}>
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🎂</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                                    {v.dagenTot === 0
                                        ? `${v.naam} is vandaag jarig! 🎉`
                                        : `${v.naam} is over ${v.dagenTot} dag${v.dagenTot === 1 ? '' : 'en'} jarig`}
                                </div>
                                {v.notitie && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{v.notitie}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Weer widget */}
            {!weerLoading && weerData && (() => {
                const cur = weerData.current;
                const daily = weerData.daily;
                const wmo = getWeerWmo(cur.weathercode);
                const advies = werkAdviesKort(cur);
                const DAY_S = ['zo','ma','di','wo','do','vr','za'];
                return (
                    <div style={{ marginBottom: '22px' }}>
                        <SectionHeader title="Weerbericht vandaag" linkLabel="Volledig" linkPath="/medewerker/weer" />
                        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}>

                            {/* Compact rij — altijd zichtbaar */}
                            <div
                                onClick={() => setWeerUitgeklapt(v => !v)}
                                style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{wmo.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em' }}>{Math.round(cur.temperature_2m)}°C</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>voelt als {Math.round(cur.apparent_temperature)}°</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{wmo.nl}</div>
                                </div>
                                {/* Werk-advies dot */}
                                {advies && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: advies.bg, border: `1px solid ${advies.border}`, borderRadius: '999px', padding: '4px 9px', flexShrink: 0 }}>
                                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: advies.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.68rem', color: advies.color, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {advies.color === '#10b981' ? 'Gunstig' : 'Let op'}
                                        </span>
                                    </div>
                                )}
                                {/* Toggle pijl */}
                                <i className={`fa-solid fa-chevron-${weerUitgeklapt ? 'up' : 'down'}`} style={{ color: '#cbd5e1', fontSize: '0.75rem', flexShrink: 0 }} />
                            </div>

                            {/* Uitklapbaar gedeelte */}
                            {weerUitgeklapt && (
                                <>
                                    {/* Details rij */}
                                    <div style={{ padding: '0 16px 14px', display: 'flex', gap: '10px' }}>
                                        {[
                                            { icon: 'fa-wind',    val: `${Math.round(cur.windspeed_10m)} km/u`, lbl: 'wind' },
                                            { icon: 'fa-droplet', val: `${cur.precipitation_probability}%`,     lbl: 'regen' },
                                        ].map(s => (
                                            <div key={s.lbl} style={{ flex: 1, background: '#f8fafc', borderRadius: '10px', padding: '9px 10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                <i className={`fa-solid ${s.icon}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{s.lbl}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Werk-advies banner */}
                                    {advies && (
                                        <div style={{ margin: '0 12px 12px', background: advies.bg, border: `1px solid ${advies.border}`, borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fa-solid fa-hard-hat" style={{ color: advies.color, fontSize: '0.82rem', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.78rem', color: advies.color, fontWeight: 700 }}>{advies.text}</span>
                                        </div>
                                    )}

                                    {/* 4-daagse mini forecast */}
                                    <div style={{ display: 'flex', borderTop: '1px solid #f8fafc' }}>
                                        {(daily.time || []).slice(0, 4).map((dateStr, di) => {
                                            const dw = getWeerWmo(daily.weathercode[di]);
                                            const dateObj = new Date(dateStr + 'T00:00:00');
                                            const label = di === 0 ? 'Van' : di === 1 ? 'Mor' : DAY_S[dateObj.getDay()];
                                            const precip = daily.precipitation_probability_max[di];
                                            return (
                                                <div key={dateStr} style={{ flex: 1, padding: '11px 4px', textAlign: 'center', borderRight: di < 3 ? '1px solid #f8fafc' : 'none' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: di === 0 ? '#F5850A' : '#94a3b8', textTransform: 'capitalize', marginBottom: '4px' }}>{label}</div>
                                                    <div style={{ fontSize: '1.25rem', marginBottom: '3px' }}>{dw.emoji}</div>
                                                    <div style={{ fontSize: '0.77rem', fontWeight: 800, color: '#1e293b' }}>{Math.round(daily.temperature_2m_max[di])}°</div>
                                                    <div style={{ fontSize: '0.63rem', color: precip > 40 ? '#3b82f6' : '#cbd5e1', fontWeight: 600, marginTop: '2px' }}>{precip}%</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Link naar volledig */}
                                    <button
                                        onClick={e => { e.stopPropagation(); router.push('/medewerker/weer'); }}
                                        style={{ width: '100%', padding: '11px', background: '#f8fafc', border: 'none', borderTop: '1px solid #f1f5f9', color: '#F5850A', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                    >
                                        <i className="fa-solid fa-cloud-sun" />
                                        Volledig weerbericht bekijken
                                        <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Documenten */}
            {docs.length > 0 && (() => {
                const ongelezen = docs.filter(d => !(d.gelezen || []).some(g => g.userId === user?.id));
                const gelezen   = docs.filter(d =>  (d.gelezen || []).some(g => g.userId === user?.id));
                return (
                    <div style={{ marginBottom: '22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                                <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Documenten</h3>
                            </div>
                            {ongelezen.length > 0 && (
                                <span style={{ background: '#F5850A', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: '999px', padding: '2px 8px' }}>
                                    {ongelezen.length} nieuw
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ongelezen.map(doc => (
                                <div key={doc.id} style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #fde8cc', padding: '11px 14px', boxShadow: '0 1px 6px rgba(245,133,10,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ background: '#FFF3E0', borderRadius: '9px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fa-solid ${doc.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}`} style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titel}</div>
                                        {doc.omschrijving && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.omschrijving}</div>}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                                        <button onClick={() => bekijkDoc(doc)} style={{ padding: '4px 10px', background: '#F5850A', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Bekijk</button>
                                        <button onClick={() => bevestigGelezen(doc.id)} style={{ padding: '4px 10px', background: '#f0fdf4', color: '#10b981', border: '1px solid #86efac', borderRadius: '7px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Aanvinken</button>
                                    </div>
                                </div>
                            ))}
                            {gelezen.length > 0 && (
                                <button onClick={() => setGelezenDocsOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textAlign: 'left', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <i className={`fa-solid fa-chevron-${gelezenDocsOpen ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }} />
                                    {gelezen.length} gelezen document{gelezen.length !== 1 ? 'en' : ''}
                                </button>
                            )}
                            {gelezenDocsOpen && gelezen.map(doc => (
                                <div key={doc.id} style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.75 }}>
                                    <i className="fa-solid fa-check-circle" style={{ color: '#10b981', fontSize: '0.9rem', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titel}</div>
                                    </div>
                                    <button onClick={() => bekijkDoc(doc)} style={{ padding: '4px 10px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '7px', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer' }}>Bekijk</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Toolbox Meetings — alleen niet-afgevinkt */}
            {(() => {
                const openMeetings = toolboxMeetings.filter(m => {
                    const volledigGetekend = m.aanwezig?.length > 0 && m.aanwezig.every(a => a.getekend);
                    const api = toolboxApiMeetings.find(a => a.id === m.id);
                    return !volledigGetekend && !api?.akkoordGegeven;
                });
                if (openMeetings.length === 0) return null;
                return (
                    <div style={{ marginBottom: '22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                                <h3 style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toolbox — nog te tekenen</h3>
                            </div>
                            <button onClick={() => router.push('/medewerker/mijn-suk?tab=toolbox')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#F5850A', fontWeight: 700 }}>Alles bekijken</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {openMeetings.slice(0, 3).map(m => (
                                <button key={m.id} onClick={() => router.push('/medewerker/mijn-suk?tab=toolbox')}
                                    style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px', padding: '11px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                                    <div style={{ background: '#FFF3E0', borderRadius: '9px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className="fa-solid fa-toolbox" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.onderwerp}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{m.datum} · {m.project}</div>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>
                                        {m.aanwezig?.filter(a => a.getekend).length ?? 0}/{m.aanwezig?.length ?? 0} ✓
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })()}


            {/* Document viewer modal */}
            {docViewer && (() => {
                return (
                <>
                    <div onClick={() => setDocViewer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400 }} />
                    <div style={{ position: 'fixed', inset: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '700px', background: '#fff', zIndex: 410, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{docViewer.titel}</span>
                            <button onClick={() => setDocViewer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: '2px 6px' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                            {docViewer.type?.startsWith('image/') ? (
                                <img src={docViewer.url} alt={docViewer.titel} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <iframe src={`${docViewer.url}#view=FitH&pagemode=none`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} title={docViewer.titel} />
                            )}
                        </div>
                    </div>
                </>
                );
            })()}



            {/* Snelknoppen */}
            <div style={{ marginBottom: '8px' }}>
                <SectionHeader title="Snel naar" />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <QuickCard icon="fa-file-pen" label="Werkbon" color="#F5850A" onClick={() => router.push('/medewerker/werkbonnen')} />
                    <QuickCard icon="fa-folder-tree" label="Project info" color="#3b82f6" onClick={() => router.push('/medewerker/werkbon')} />
                </div>
            </div>

            {/* Ziek melden modal */}
            {ziekModal && (
                <>
                    <div onClick={() => setZiekModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', zIndex: 310 }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 20px' }} />
                        <h3 style={{ margin: '0 0 18px', fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>
                            <i className="fa-solid fa-briefcase-medical" style={{ marginRight: '8px' }} />Ziek melden
                        </h3>
                        {ziekSaved ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontSize: '1rem', fontWeight: 600 }}>
                                <i className="fa-solid fa-check-circle" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }} />
                                Ziekmelding verstuurd!
                            </div>
                        ) : (<>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Datum ziekmelding</label>
                            <input type="date" value={ziekForm.datum} onChange={e => setZiekForm(f => ({...f, datum: e.target.value}))}
                                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', marginBottom: '14px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Reden (optioneel)</label>
                            <input type="text" value={ziekForm.reden} onChange={e => setZiekForm(f => ({...f, reden: e.target.value}))}
                                placeholder="Bijv. griep, rugklachten..."
                                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', marginBottom: '14px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            <button onClick={handleZiekMelden} style={{ width: '100%', padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                                Ziekmelding versturen
                            </button>
                        </>)}
                    </div>
                </>
            )}
        </div>
        </div>
    );
}
