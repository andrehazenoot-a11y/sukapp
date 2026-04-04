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

function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
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

export default function MedewerkerHome() {
    const { user } = useAuth();
    const router = useRouter();
    const [vandaag, setVandaag] = useState([]);
    const [weekUren, setWeekUren] = useState(0);
    const [openTaken, setOpenTaken] = useState([]);
    const [ziekModal, setZiekModal] = useState(false);
    const [ziekForm, setZiekForm] = useState({ datum: new Date().toISOString().slice(0,10), reden: '', terug: '' });
    const [ziekSaved, setZiekSaved] = useState(false);

    useEffect(() => {
        if (!user) return;
        setVandaag(getTodayProjects(user.id));
        setWeekUren(getWeekHours(user.id));
        setOpenTaken(getMyOpenTasks(user.id));
    }, [user]);

    const today = new Date();
    const todayLabel = `${DAY_NAMES[today.getDay()]} ${today.getDate()} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
    const TARGET = 37.5;
    const pct = Math.min(100, Math.round((weekUren / TARGET) * 100));

    function handleZiekMelden() {
        const key = `schildersapp_ziek_${user.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ ...ziekForm, naam: user.name, ingediend: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
        setZiekSaved(true);
        setTimeout(() => { setZiekModal(false); setZiekSaved(false); }, 1500);
    }

    return (
        <div style={{ padding: '16px 16px 8px' }}>
            {/* Datum + Welkom */}
            <div style={{ marginBottom: '18px', paddingTop: '4px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '3px', fontWeight: 500 }}>{todayLabel}</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Hoi, {user?.name?.split(' ')[0]} 👋</div>
            </div>

            {/* Week uren kaart */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', borderRadius: '20px', padding: '20px 22px', marginBottom: '22px', color: '#fff', boxShadow: '0 6px 24px rgba(245,133,10,0.35)', position: 'relative', overflow: 'hidden' }}>
                {/* Decoratie cirkel */}
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: '30px', bottom: '-30px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', position: 'relative' }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Week {getISOWeek(today)} · Gewerkte uren</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{weekUren.toFixed(1)}<span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.75, letterSpacing: 0 }}> / {TARGET}u</span></div>
                    </div>
                    <button onClick={() => router.push('/medewerker/uren')} style={{
                        background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px',
                        color: '#fff', padding: '9px 16px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                        backdropFilter: 'blur(4px)',
                    }}>+ Uren</button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: '999px', height: '7px', position: 'relative' }}>
                    <div style={{ background: '#fff', borderRadius: '999px', height: '7px', width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 0 8px rgba(255,255,255,0.5)' }} />
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '7px', opacity: 0.82, fontWeight: 500 }}>{pct}% van weekdoelstelling behaald</div>
            </div>

            {/* Vandaag ingepland */}
            <div style={{ marginBottom: '22px' }}>
                <SectionHeader title="Vandaag ingepland" linkLabel="Planning" linkPath="/medewerker/planning" />
                {vandaag.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '22px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1.5px dashed #e2e8f0' }}>
                        <i className="fa-regular fa-calendar" style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'block', opacity: 0.5 }} />
                        Geen projecten vandaag ingepland
                    </div>
                ) : vandaag.map((item, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '0', marginBottom: '8px', display: 'flex', alignItems: 'stretch', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: '5px', background: item.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.projectName}</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.taskName}</div>
                            </div>
                            <div style={{ fontSize: '0.71rem', color: '#94a3b8', flexShrink: 0, background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>t/m {formatDate(item.endDate)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Openstaande taken */}
            <div style={{ marginBottom: '22px' }}>
                <SectionHeader title="Openstaande taken" linkLabel={openTaken.length > 3 ? `Alle ${openTaken.length}` : null} linkPath="/medewerker/taken" />
                {openTaken.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '22px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1.5px dashed #e2e8f0' }}>
                        <i className="fa-solid fa-circle-check" style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'block', color: '#10b981', opacity: 0.8 }} />
                        Geen openstaande taken — goed bezig!
                    </div>
                ) : openTaken.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '0', marginBottom: '8px', display: 'flex', alignItems: 'stretch', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: '5px', background: t.color, flexShrink: 0, opacity: 0.7 }} />
                        <div style={{ flex: 1, minWidth: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.taskName}</div>
                                <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>{t.projectName}</div>
                            </div>
                            {t.endDate && <div style={{ fontSize: '0.71rem', color: '#94a3b8', flexShrink: 0, background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{formatDate(t.endDate)}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Snelknoppen */}
            <div style={{ marginBottom: '8px' }}>
                <SectionHeader title="Snel melden" />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <QuickCard icon="fa-briefcase-medical" label="Ziek melden" color="#ef4444" onClick={() => setZiekModal(true)} />
                    <QuickCard icon="fa-umbrella-beach" label="Verlof aanvragen" color="#8b5cf6" onClick={() => router.push('/medewerker/formulieren')} />
                    <QuickCard icon="fa-camera" label="Foto uploaden" color="#06b6d4" onClick={() => router.push('/medewerker/formulieren')} />
                    <QuickCard icon="fa-file-alt" label="Werkbon" color="#10b981" onClick={() => router.push('/medewerker/werkbon')} />
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
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Verwacht terug op</label>
                            <input type="date" value={ziekForm.terug} onChange={e => setZiekForm(f => ({...f, terug: e.target.value}))}
                                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            <button onClick={handleZiekMelden} style={{ width: '100%', padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                                Ziekmelding versturen
                            </button>
                        </>)}
                    </div>
                </>
            )}
        </div>
    );
}
