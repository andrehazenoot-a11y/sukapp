'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

const MONTH_NAMES      = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const MONTH_NAMES_FULL = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const DAY_LABELS       = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function fmtIso(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getEaster(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    return new Date(year,Math.floor((h+l-7*m+114)/31)-1,((h+l-7*m+114)%31)+1);
}
function getDutchHolidays(year) {
    const e = getEaster(year);
    const add = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
    const fmt = d => fmtIso(d);
    return {
        [fmt(new Date(year,0,1))]:   'Nieuwjaarsdag',
        [fmt(add(e,-2))]:            'Goede Vrijdag',
        [fmt(e)]:                    'Eerste Paasdag',
        [fmt(add(e,1))]:             'Tweede Paasdag',
        [fmt(new Date(year,3,27))]:  'Koningsdag',
        [fmt(new Date(year,4,5))]:   'Bevrijdingsdag',
        [fmt(add(e,39))]:            'Hemelvaartsdag',
        [fmt(add(e,49))]:            'Eerste Pinksterdag',
        [fmt(add(e,50))]:            'Tweede Pinksterdag',
        [fmt(new Date(year,11,25))]: 'Eerste Kerstdag',
        [fmt(new Date(year,11,26))]: 'Tweede Kerstdag',
    };
}
const cy = new Date().getFullYear();
const ALL_HOLIDAYS_MAP = Object.assign({}, getDutchHolidays(cy-1), getDutchHolidays(cy), getDutchHolidays(cy+1));

function getEnabledHolidays() {
    const result = {};
    for (const year of [cy-1, cy, cy+1]) {
        try {
            const enabled = JSON.parse(localStorage.getItem(`schildersapp_feestdagen_${year}`));
            const custom  = JSON.parse(localStorage.getItem(`schildersapp_custom_holidays_${year}`)) || [];
            const yearMap = getDutchHolidays(year);
            for (const [iso, name] of Object.entries(yearMap)) {
                if (!enabled || enabled[iso] !== false) result[iso] = name;
            }
            for (const h of custom) {
                if (!enabled || enabled[h.key] !== false) result[h.key] = h.name;
            }
        } catch {
            Object.assign(result, getDutchHolidays(year));
        }
    }
    return result;
}

function verlofDagen(van, tot) {
    const days = new Set();
    if (!van) return days;
    const end = tot || van;
    const d = new Date(van + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    while (d <= e) { days.add(fmtIso(d)); d.setDate(d.getDate()+1); }
    return days;
}
function buildKalender(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month+1, 0);
    const startDow = (firstDay.getDay()+6)%7;
    const cells = [];
    for (let i=0; i<startDow; i++) cells.push(null);
    for (let d=1; d<=lastDay.getDate(); d++) cells.push(d);
    while (cells.length%7!==0) cells.push(null);
    const rows=[];
    for (let i=0; i<cells.length; i+=7) rows.push(cells.slice(i,i+7));
    return rows;
}

function loadLS(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveLS(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

const VERLOF_TYPES = ['Vakantie','Zorgverlof','Bijzonder verlof','Compensatie uren','Overig'];
const TOTAAL_DAGEN = 25;
const UREN_PER_DAG = 7.5;

const STATUS_STYLE = {
    'In behandeling': { color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
    'Goedgekeurd':    { color:'#10b981', bg:'#f0fdf4', border:'#86efac' },
    'Afgewezen':      { color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
};

export default function VerlofPage() {
    const { user } = useAuth();
    const nowDate = new Date();
    const todayIso = fmtIso(nowDate);

    const [verlofLijst, setVerlofLijst] = useState([]);
    const [verlofForm, setVerlofForm]   = useState({ type:'Vakantie', van:'', tot:'', opmerking:'' });
    const [verlofOpen, setVerlofOpen]   = useState(false);
    const [verlofSaved, setVerlofSaved] = useState(false);
    const [editId, setEditId]           = useState(null);
    const [holidays, setHolidays]       = useState(ALL_HOLIDAYS_MAP);

    const [kalMonth, setKalMonth] = useState(nowDate.getMonth());
    const [kalYear, setKalYear]   = useState(nowDate.getFullYear());

    useEffect(() => {
        if (!user) return;
        setVerlofLijst(loadLS(`schildersapp_verlof_${user.id}`, []));
        setHolidays(getEnabledHolidays());
    }, [user]);

    if (!user) return null;

    function telWerkdagen(van, tot) {
        if (!van) return 0;
        let count = 0;
        const d = new Date(van + 'T00:00:00');
        const e = new Date((tot || van) + 'T00:00:00');
        while (d <= e) {
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6 && !holidays[fmtIso(d)]) count++;
            d.setDate(d.getDate() + 1);
        }
        return count;
    }

    function syncVacDays(lijst) {
        const userName = (user.name || 'Onbekend').replace(/\s/g, '_');
        const perJaar = {};
        lijst.filter(v => v.status === 'Goedgekeurd').forEach(v => {
            const d = new Date((v.van) + 'T00:00:00');
            const e = new Date((v.tot || v.van) + 'T00:00:00');
            while (d <= e) {
                const iso = fmtIso(d);
                const dow = d.getDay();
                if (dow !== 0 && dow !== 6 && !holidays[iso]) {
                    const yr = d.getFullYear();
                    if (!perJaar[yr]) perJaar[yr] = new Set();
                    perJaar[yr].add(iso);
                }
                d.setDate(d.getDate() + 1);
            }
        });
        const alleJaren = new Set([...Object.keys(perJaar), String(new Date().getFullYear())]);
        alleJaren.forEach(yr => {
            saveLS(`schildersapp_vakantie_${yr}_${userName}`, perJaar[yr] ? [...perJaar[yr]].sort() : []);
        });
    }

    function openNieuw(iso) {
        setEditId(null);
        setVerlofForm({ type:'Vakantie', van: iso || todayIso, tot: iso || todayIso, opmerking:'' });
        setVerlofOpen(true);
    }
    function openEdit(v) {
        setEditId(v.id);
        setVerlofForm({ type:v.type, van:v.van, tot:v.tot||v.van, opmerking:v.opmerking||'' });
        setVerlofOpen(true);
    }
    function submitVerlof() {
        if (!verlofForm.van) return;
        const van = verlofForm.van;
        const tot = verlofForm.tot && verlofForm.tot >= van ? verlofForm.tot : van;
        let updated;
        if (editId) {
            updated = verlofLijst.map(v => v.id === editId ? { ...v, ...verlofForm, van, tot } : v);
        } else {
            const entry = { ...verlofForm, van, tot, id:Date.now(), ingediend:new Date().toISOString(), status:'Goedgekeurd', naam:user.name };
            updated = [entry, ...verlofLijst];
        }
        setVerlofLijst(updated);
        saveLS(`schildersapp_verlof_${user.id}`, updated);
        syncVacDays(updated);
        setVerlofSaved(true);
        setTimeout(() => { setVerlofOpen(false); setVerlofSaved(false); setVerlofForm({ type:'Vakantie', van:'', tot:'', opmerking:'' }); setEditId(null); }, 1400);
    }
    function deleteVerlof(id) {
        if (!window.confirm('Weet je zeker dat je dit verlofverzoek wilt verwijderen?')) return;
        const updated = verlofLijst.filter(v => v.id !== id);
        setVerlofLijst(updated);
        saveLS(`schildersapp_verlof_${user.id}`, updated);
        syncVacDays(updated);
    }
    function tapDag(iso, isWeekend, isHoliday) {
        if (isWeekend || isHoliday || !user) return;
        const bestaand = verlofLijst.find(v => v.van === iso && (v.tot === iso || !v.tot));
        let updated;
        if (bestaand) {
            updated = verlofLijst.filter(v => v.id !== bestaand.id);
        } else {
            const entry = { type:'Vakantie', van:iso, tot:iso, id:Date.now(), ingediend:new Date().toISOString(), status:'Goedgekeurd', naam:user.name, opmerking:'' };
            updated = [entry, ...verlofLijst];
        }
        setVerlofLijst(updated);
        saveLS(`schildersapp_verlof_${user.id}`, updated);
        syncVacDays(updated);
    }
    function inVerlofRange(iso) {
        if (!verlofForm.van || !verlofOpen) return false;
        return iso >= verlofForm.van && iso <= (verlofForm.tot || verlofForm.van);
    }

    const verbruiktDagen = verlofLijst
        .filter(v => v.status === 'Goedgekeurd')
        .reduce((sum, v) => sum + telWerkdagen(v.van, v.tot), 0);
    const resterendDagen = Math.max(0, TOTAAL_DAGEN - verbruiktDagen);
    const resterendUren  = resterendDagen * UREN_PER_DAG;

    const dagMap = {};
    verlofLijst.forEach(v => {
        const st = STATUS_STYLE[v.status] || STATUS_STYLE['In behandeling'];
        verlofDagen(v.van, v.tot).forEach(iso => { dagMap[iso] = { color:st.color, bg:st.bg, v }; });
    });

    const rows = buildKalender(kalYear, kalMonth);

    return (
        <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: '16px', height: '100dvh', boxSizing: 'border-box', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#F5850A,#D96800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-umbrella-beach" style={{ color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Verlof</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{resterendDagen} dagen resterend · {verbruiktDagen}/{TOTAAL_DAGEN} verbruikt</div>
                </div>
                <button onClick={() => openNieuw(todayIso)}
                    style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#F5850A,#D96800)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(245,133,10,0.3)' }}>
                    <i className="fa-solid fa-plus" style={{ fontSize: '0.7rem' }} />Aanvragen
                </button>
            </div>

            {/* Tegoed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                    { label: 'Resterend', val: resterendDagen, unit: 'dagen', color: '#10b981', bg: '#f0fdf4', icon: 'fa-umbrella-beach' },
                    { label: 'In uren',   val: resterendUren,  unit: 'uur',   color: '#3b82f6', bg: '#eff6ff', icon: 'fa-clock' },
                    { label: 'Verbruikt', val: `${verbruiktDagen}/${TOTAAL_DAGEN}`, unit: 'dagen', color: '#F5850A', bg: '#fff8f0', icon: 'fa-chart-pie' },
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '14px', padding: '12px 10px', textAlign: 'center' }}>
                        <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '0.85rem', marginBottom: '5px', display: 'block' }} />
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                        <div style={{ fontSize: '0.7rem', color: s.color, opacity: 0.7, marginTop: '2px', fontWeight: 600 }}>{s.unit}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Kalender */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, marginBottom: '10px' }}>Tik een werkdag om vakantie aan of uit te zetten</div>

                {/* Maand navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <button onClick={() => { let m=kalMonth-1,y=kalYear; if(m<0){m=11;y--;} setKalMonth(m);setKalYear(y); }}
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 11px', cursor: 'pointer', color: '#475569', fontSize: '0.8rem' }}>
                        <i className="fa-solid fa-chevron-left" />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{MONTH_NAMES_FULL[kalMonth]} {kalYear}</span>
                    <button onClick={() => { let m=kalMonth+1,y=kalYear; if(m>11){m=0;y++;} setKalMonth(m);setKalYear(y); }}
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 11px', cursor: 'pointer', color: '#475569', fontSize: '0.8rem' }}>
                        <i className="fa-solid fa-chevron-right" />
                    </button>
                </div>

                {/* Dag labels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '3px' }}>
                    {DAY_LABELS.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', padding: '2px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{d}</div>
                    ))}
                </div>

                {/* Rijen */}
                {rows.map((row, ri) => (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px', marginBottom: '1px' }}>
                        {row.map((dag, ci) => {
                            if (!dag) return <div key={ci} />;
                            const iso       = `${kalYear}-${String(kalMonth+1).padStart(2,'0')}-${String(dag).padStart(2,'0')}`;
                            const isToday   = iso === todayIso;
                            const isWeekend = ci===5||ci===6;
                            const isHoliday = !!holidays[iso];
                            const hasVerlof = !!dagMap[iso];
                            const inSel     = inVerlofRange(iso);
                            const vInfo     = dagMap[iso];
                            const blocked   = isWeekend || isHoliday;

                            let bg = 'transparent';
                            if (inSel) bg = 'rgba(245,133,10,0.18)';
                            else if (isHoliday) bg = '#fff8f0';
                            else if (hasVerlof) bg = vInfo.bg;

                            const textColor = isToday ? '#F5850A' : isHoliday ? '#F5850A' : isWeekend ? '#cbd5e1' : '#1e293b';

                            return (
                                <button key={ci} onClick={() => tapDag(iso, isWeekend, isHoliday)}
                                    title={isHoliday ? holidays[iso] : undefined}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        aspectRatio: '1', borderRadius: '10px',
                                        border: isHoliday ? '1.5px solid #fde8cc' : inSel ? '1.5px solid #F5850A' : 'none',
                                        cursor: blocked ? 'default' : 'pointer',
                                        background: bg, position: 'relative',
                                        outline: isToday && !inSel ? '2px solid #F5850A' : 'none',
                                        outlineOffset: '-1px', padding: '2px 0',
                                        opacity: blocked ? 0.7 : 1,
                                    }}>
                                    {isHoliday && <span style={{ position: 'absolute', top: '0px', right: '1px', fontSize: '0.5rem', lineHeight: 1, pointerEvents: 'none' }}>⭐</span>}
                                    <span style={{ fontSize: '0.78rem', fontWeight: isToday||isHoliday||inSel ? 800 : 500, color: inSel ? '#D96800' : textColor }}>{dag}</span>
                                    <div style={{ display: 'flex', gap: '2px', marginTop: '1px', height: '5px', alignItems: 'center' }}>
                                        {hasVerlof && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: vInfo.color }} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ))}

                {/* Legenda */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f8fafc', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                        <span style={{ fontSize: '0.7rem' }}>⭐</span>Feestdag
                    </span>
                    {[['Goedgekeurd', STATUS_STYLE['Goedgekeurd']], ['Afgewezen', STATUS_STYLE['Afgewezen']]].map(([lbl, st]) => (
                        <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.color, display: 'inline-block' }} />{lbl}
                        </span>
                    ))}
                </div>
            </div>

            {/* Aanvragenlijst */}
            {verlofLijst.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingBottom: '16px', flexShrink: 0, maxHeight: '35vh' }}>
                    {[...verlofLijst].sort((a, b) => (a.van || '') > (b.van || '') ? 1 : -1).map(v => {
                        const st = STATUS_STYLE[v.status] || STATUS_STYLE['In behandeling'];
                        return (
                            <div key={v.id} style={{ background: '#fff', borderRadius: '10px', padding: '7px 10px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{v.type}</span>
                                        {v.status === 'Afgewezen' && (
                                            <span style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: '999px', padding: '1px 6px', fontSize: '0.6rem', fontWeight: 700, color: st.color }}>{v.status}</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                                        {fmtDate(v.van)}{v.tot && v.tot !== v.van ? ` → ${fmtDate(v.tot)}` : ''}
                                        {v.opmerking && ` · ${v.opmerking}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                    <button onClick={() => openEdit(v)} style={{ background: 'none', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.7rem' }}>
                                        <i className="fa-solid fa-pen" />
                                    </button>
                                    <button onClick={() => deleteVerlof(v.id)} style={{ background: 'none', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: '#fca5a5', fontSize: '0.7rem' }}>
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Verlof aanvragen */}
            {verlofOpen && (
                <>
                    <div onClick={() => setVerlofOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', zIndex: 310 }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 18px' }} />
                        {verlofSaved ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontSize: '0.95rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-check-circle" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }} />Aanvraag ingediend!
                            </div>
                        ) : (<>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                                <i className="fa-solid fa-umbrella-beach" style={{ color: '#F5850A', marginRight: '8px' }} />{editId ? 'Verlof wijzigen' : 'Verlof aanvragen'}
                            </h3>

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Type verlof</label>
                            <select value={verlofForm.type} onChange={e => setVerlofForm(f => ({ ...f, type: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', marginBottom: '14px', fontSize: '0.9rem', background: '#fff' }}>
                                {VERLOF_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Eerste dag</label>
                                    <input type="date" value={verlofForm.van}
                                        onChange={e => setVerlofForm(f => ({ ...f, van: e.target.value, tot: f.tot < e.target.value ? e.target.value : f.tot }))}
                                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Laatste dag</label>
                                    <input type="date" value={verlofForm.tot} min={verlofForm.van}
                                        onChange={e => setVerlofForm(f => ({ ...f, tot: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            {verlofForm.van && (
                                <div style={{ background: '#fff8f0', borderRadius: '10px', padding: '9px 14px', marginBottom: '14px', fontSize: '0.8rem', color: '#D96800', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <i className="fa-regular fa-calendar" style={{ fontSize: '0.85rem' }} />
                                    {verlofForm.van === verlofForm.tot || !verlofForm.tot
                                        ? `1 dag — ${fmtDate(verlofForm.van)}`
                                        : (() => {
                                            const dagen = telWerkdagen(verlofForm.van, verlofForm.tot);
                                            return `${dagen} werkdag${dagen !== 1 ? 'en' : ''} — ${fmtDate(verlofForm.van)} t/m ${fmtDate(verlofForm.tot)}`;
                                        })()
                                    }
                                </div>
                            )}

                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Opmerking (optioneel)</label>
                            <input type="text" value={verlofForm.opmerking} onChange={e => setVerlofForm(f => ({ ...f, opmerking: e.target.value }))}
                                placeholder="Bijv. familiebezoek, ziekenhuisbezoek..."
                                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', marginBottom: '18px', fontSize: '0.9rem', boxSizing: 'border-box' }} />

                            <button onClick={submitVerlof} disabled={!verlofForm.van}
                                style={{ width: '100%', padding: '14px', background: verlofForm.van ? '#F5850A' : '#e2e8f0', color: verlofForm.van ? '#fff' : '#94a3b8', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: verlofForm.van ? 'pointer' : 'default' }}>
                                {editId ? 'Wijzigingen opslaan' : 'Aanvraag indienen'}
                            </button>
                        </>)}
                    </div>
                </>
            )}
        </div>
    );
}
