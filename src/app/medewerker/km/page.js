'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

const MONTH_NAMES = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const MONTH_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

function loadRitten(userId) {
    try { return JSON.parse(localStorage.getItem(`schildersapp_km_${userId}`) || '[]'); } catch { return []; }
}
function saveRitten(userId, data) {
    try { localStorage.setItem(`schildersapp_km_${userId}`, JSON.stringify(data)); } catch {}
}

const leegForm = () => ({
    datum: new Date().toISOString().slice(0, 10),
    van: '', naar: '',
    kmStart: '', kmEind: '',
    project: '', doel: '',
});

export default function KmPage() {
    const { user } = useAuth();
    const [ritten, setRitten]       = useState([]);
    const [modal, setModal]         = useState(false);
    const [form, setForm]           = useState(leegForm());
    const [gpsVeld, setGpsVeld]         = useState(null); // 'van' | 'naar'
    const [gpsLoading, setGpsLoading]   = useState(false);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeKm, setRouteKm]         = useState(null); // berekende km
    const [routeError, setRouteError]   = useState(null);
    const [projecten, setProjecten]     = useState([]);
    const [maand, setMaand]         = useState(() => {
        const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
    });

    useEffect(() => {
        if (!user) return;
        setRitten(loadRitten(user.id));
        try {
            const p = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]');
            setProjecten(p.map(x => x.name));
        } catch {}
    }, [user]);

    const km = form.kmStart && form.kmEind ? Math.max(0, Number(form.kmEind) - Number(form.kmStart)) : null;

    function opslaan() {
        if (!form.van || !form.naar || !form.kmStart || !form.kmEind) return;
        const rit = {
            id: Date.now(),
            datum: form.datum,
            van: form.van.trim(),
            naar: form.naar.trim(),
            kmStart: Number(form.kmStart),
            kmEind: Number(form.kmEind),
            km: Math.max(0, Number(form.kmEind) - Number(form.kmStart)),
            project: form.project.trim(),
            doel: form.doel.trim(),
        };
        const updated = [rit, ...ritten];
        setRitten(updated);
        saveRitten(user.id, updated);
        setModal(false);
        setForm(leegForm());
    }

    function verwijder(id) {
        if (!window.confirm('Weet je zeker dat je deze rit wilt verwijderen?')) return;
        const updated = ritten.filter(r => r.id !== id);
        setRitten(updated);
        saveRitten(user.id, updated);
    }

    function haalGpsLocatie(veld) {
        if (!navigator.geolocation) return;
        setGpsVeld(veld); setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const { latitude: lat, longitude: lon } = pos.coords;
                let adres = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                try {
                    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
                    const d = await r.json();
                    if (d.address) {
                        const a = d.address;
                        adres = [a.road, a.house_number, a.city || a.town || a.village].filter(Boolean).join(' ');
                    }
                } catch {}
                setForm(f => ({ ...f, [veld]: adres }));
                setGpsLoading(false); setGpsVeld(null);
            },
            () => { setGpsLoading(false); setGpsVeld(null); },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    async function berekenRoute() {
        if (!form.van.trim() || !form.naar.trim()) return;
        setRouteLoading(true); setRouteError(null); setRouteKm(null);
        try {
            // 1. Geocodeer beide adressen
            const geocode = async (adres) => {
                const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(adres)}&format=json&limit=1&countrycodes=nl`);
                const d = await r.json();
                if (!d[0]) throw new Error('Adres niet gevonden');
                return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
            };
            const [van, naar] = await Promise.all([geocode(form.van), geocode(form.naar)]);

            // 2. Haal rijafstand op via OSRM
            const osrm = await fetch(`https://router.project-osrm.org/route/v1/driving/${van.lon},${van.lat};${naar.lon},${naar.lat}?overview=false`);
            const route = await osrm.json();
            if (route.code !== 'Ok') throw new Error('Route niet gevonden');
            const km = Math.round(route.routes[0].distance / 1000);
            setRouteKm(km);

            // 3. Vul kmEind automatisch in als kmStart bekend is
            if (form.kmStart) {
                setForm(f => ({ ...f, kmEind: String(Number(f.kmStart) + km) }));
            }
        } catch (e) {
            setRouteError('Kon route niet berekenen. Controleer de adressen.');
        }
        setRouteLoading(false);
    }

    // Gefilterde ritten voor geselecteerde maand
    const rittenMaand = ritten.filter(r => r.datum?.startsWith(maand));
    const totaalMaand = rittenMaand.reduce((s, r) => s + (r.km || 0), 0);

    // Beschikbare maanden
    const maanden = [...new Set(ritten.map(r => r.datum?.slice(0,7)).filter(Boolean))].sort().reverse();
    if (!maanden.includes(maand) && maanden.length > 0) {
        // huidig maand kan leeg zijn, voeg toe voor selector
    }
    const huidigeMaand = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const alleMaanden = [...new Set([huidigeMaand, ...maanden])].sort().reverse();

    const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', color: '#1e293b', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#fff' };

    const kanOpslaan = form.van && form.naar && form.kmStart && form.kmEind && Number(form.kmEind) >= Number(form.kmStart);

    return (
        <div style={{ padding: '14px 16px 8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '22px', background: 'linear-gradient(180deg,#F5850A,#D96800)', borderRadius: '2px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Kilometeradministratie</h2>
                </div>
                <button onClick={() => { setForm(leegForm()); setRouteKm(null); setRouteError(null); setModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 13px', background: 'linear-gradient(135deg,#F5850A,#D96800)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,133,10,0.3)' }}>
                    <i className="fa-solid fa-plus" style={{ fontSize: '0.75rem' }} />Rit
                </button>
            </div>

            {/* Maand selector + totaal */}
            <div style={{ background: 'linear-gradient(135deg,#F5850A,#D96800)', borderRadius: '16px', padding: '16px', marginBottom: '14px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Maandoverzicht</div>
                    <select value={maand} onChange={e => setMaand(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#fff', fontSize: '0.78rem', fontWeight: 700, padding: '4px 8px', cursor: 'pointer' }}>
                        {alleMaanden.map(m => {
                            const [y, mo] = m.split('-');
                            return <option key={m} value={m} style={{ color: '#1e293b', background: '#fff' }}>{MONTH_NAMES[Number(mo)-1]} {y}</option>;
                        })}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{totaalMaand.toLocaleString('nl-NL')}</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>km gereden</div>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.25)', paddingLeft: '12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{rittenMaand.length}</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>rit{rittenMaand.length !== 1 ? 'ten' : ''}</div>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.25)', paddingLeft: '12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>€ {(totaalMaand * 0.23).toFixed(0)}</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>vergoeding (€0,23)</div>
                    </div>
                </div>
            </div>

            {/* Rittenlijst */}
            {rittenMaand.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-car" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px', opacity: 0.25 }} />
                    <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Geen ritten in {MONTH_NAMES[Number(maand.split('-')[1])-1]}</div>
                    <div style={{ fontSize: '0.82rem' }}>Tik op + Rit om te beginnen</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rittenMaand.map(r => (
                        <div key={r.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ height: '3px', background: 'linear-gradient(90deg,#F5850A,#D96800)' }} />
                            <div style={{ padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Van → Naar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{r.van}</span>
                                        <i className="fa-solid fa-arrow-right" style={{ color: '#cbd5e1', fontSize: '0.65rem', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{r.naar}</span>
                                    </div>
                                    {/* Meta */}
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                            {new Date(r.datum + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                                        </span>
                                        {r.project && (
                                            <span style={{ fontSize: '0.68rem', background: '#fff8f0', color: '#F5850A', border: '1px solid #fde8cc', borderRadius: '999px', padding: '1px 7px', fontWeight: 600 }}>{r.project}</span>
                                        )}
                                        {r.doel && (
                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{r.doel}</span>
                                        )}
                                    </div>
                                    {/* Km stand */}
                                    <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '3px' }}>
                                        {r.kmStart.toLocaleString('nl-NL')} → {r.kmEind.toLocaleString('nl-NL')} km
                                    </div>
                                </div>
                                {/* Km badge */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#F5850A', lineHeight: 1 }}>{r.km}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>km</div>
                                    <button onClick={() => verwijder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.75rem', marginTop: '6px', padding: 0 }}>
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: nieuwe rit */}
            {modal && (
                <>
                    <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', zIndex: 310, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 16px' }} />
                        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-car" style={{ color: '#F5850A' }} />Rit registreren
                        </h3>

                        {/* Datum */}
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Datum</label>
                        <input type="date" value={form.datum} onChange={e => setForm(f => ({...f, datum: e.target.value}))}
                            style={{ ...inputStyle, marginBottom: '12px' }} />

                        {/* Van */}
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Van</label>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                            <input type="text" placeholder="Vertrekadres..." value={form.van} onChange={e => setForm(f => ({...f, van: e.target.value}))}
                                style={{ ...inputStyle }} />
                            <button onClick={() => haalGpsLocatie('van')} disabled={gpsLoading && gpsVeld === 'van'}
                                style={{ padding: '0 12px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', cursor: 'pointer', color: '#3b82f6', flexShrink: 0 }}
                                title="Huidige locatie gebruiken">
                                {gpsLoading && gpsVeld === 'van'
                                    ? <i className="fa-solid fa-circle-notch fa-spin" />
                                    : <i className="fa-solid fa-location-crosshairs" />}
                            </button>
                        </div>

                        {/* Naar */}
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Naar</label>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                            <input type="text" placeholder="Bestemmingsadres..." value={form.naar} onChange={e => setForm(f => ({...f, naar: e.target.value}))}
                                style={{ ...inputStyle }} />
                            <button onClick={() => haalGpsLocatie('naar')} disabled={gpsLoading && gpsVeld === 'naar'}
                                style={{ padding: '0 12px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', cursor: 'pointer', color: '#3b82f6', flexShrink: 0 }}
                                title="Huidige locatie gebruiken">
                                {gpsLoading && gpsVeld === 'naar'
                                    ? <i className="fa-solid fa-circle-notch fa-spin" />
                                    : <i className="fa-solid fa-location-crosshairs" />}
                            </button>
                        </div>

                        {/* Bereken route */}
                        {(form.van.trim() && form.naar.trim()) && (
                            <div style={{ marginBottom: '12px' }}>
                                <button onClick={berekenRoute} disabled={routeLoading}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', cursor: routeLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                                    {routeLoading
                                        ? <><i className="fa-solid fa-circle-notch fa-spin" />Route berekenen…</>
                                        : <><i className="fa-solid fa-route" />Bereken rijafstand</>}
                                </button>
                                {routeKm !== null && (
                                    <div style={{ marginTop: '8px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-check-circle" style={{ color: '#10b981', fontSize: '0.9rem' }} />
                                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>{routeKm} km</span>
                                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>· € {(routeKm * 0.23).toFixed(2).replace('.', ',')} vergoeding</span>
                                        {!form.kmStart && <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 'auto' }}>Vul km-start in →</span>}
                                    </div>
                                )}
                                {routeError && <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#ef4444', paddingLeft: '2px' }}>{routeError}</div>}
                            </div>
                        )}

                        {/* KM stand */}
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kilometerstand</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                            <div>
                                <input type="number" placeholder="Begin km" value={form.kmStart} onChange={e => setForm(f => ({...f, kmStart: e.target.value}))}
                                    style={{ ...inputStyle }} />
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', paddingLeft: '2px' }}>Start</div>
                            </div>
                            <div>
                                <input type="number" placeholder="Eind km" value={form.kmEind} onChange={e => setForm(f => ({...f, kmEind: e.target.value}))}
                                    style={{ ...inputStyle }} />
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', paddingLeft: '2px' }}>Eind</div>
                            </div>
                        </div>
                        {km !== null && (
                            <div style={{ background: '#fff8f0', border: '1px solid #fde8cc', borderRadius: '10px', padding: '8px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-route" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                <span style={{ fontWeight: 800, color: '#D96800', fontSize: '0.9rem' }}>{km} km</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>· € {(km * 0.23).toFixed(2).replace('.', ',')} vergoeding</span>
                            </div>
                        )}

                        {/* Project */}
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project (optioneel)</label>
                        {projecten.length > 0 ? (
                            <select value={form.project} onChange={e => setForm(f => ({...f, project: e.target.value}))}
                                style={{ ...inputStyle, marginBottom: '12px', color: form.project ? '#1e293b' : '#94a3b8' }}>
                                <option value="">Geen project</option>
                                {projecten.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        ) : (
                            <input type="text" placeholder="Projectnaam..." value={form.project} onChange={e => setForm(f => ({...f, project: e.target.value}))}
                                style={{ ...inputStyle, marginBottom: '12px' }} />
                        )}

                        {/* Doel */}
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doel / omschrijving (optioneel)</label>
                        <input type="text" placeholder="Bijv. materialen ophalen, klantbezoek..." value={form.doel} onChange={e => setForm(f => ({...f, doel: e.target.value}))}
                            style={{ ...inputStyle, marginBottom: '16px' }} />

                        <button onClick={opslaan} disabled={!kanOpslaan}
                            style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: kanOpslaan ? 'pointer' : 'default',
                                background: kanOpslaan ? 'linear-gradient(135deg,#F5850A,#D96800)' : '#e2e8f0',
                                color: kanOpslaan ? '#fff' : '#94a3b8',
                                boxShadow: kanOpslaan ? '0 2px 10px rgba(245,133,10,0.3)' : 'none' }}>
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '8px' }} />Opslaan
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
