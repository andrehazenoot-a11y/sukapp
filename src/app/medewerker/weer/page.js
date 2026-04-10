'use client';

import { useState, useEffect } from 'react';

const WMO = {
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

const DAY_FULL = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
const DAY_3    = ['Zo','Ma','Di','Wo','Do','Vr','Za'];

function wmo(code)      { return WMO[code] ?? { nl: 'Onbekend', emoji: '🌡️', cat: 'unknown' }; }
function fmtTime(iso)   { return iso ? iso.slice(11, 16) : ''; }
function fmtDatum(iso)  { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()}-${d.getMonth()+1}`; }

function windKleur(kmh) {
    if (kmh > 40) return '#ef4444';
    if (kmh > 25) return '#f59e0b';
    return '#10b981';
}

function heroBg(cat, isDay) {
    if (!isDay) return 'linear-gradient(160deg,#1e293b,#0f172a)';
    return { sun:'linear-gradient(160deg,#F5850A,#f59e0b)', cloud:'linear-gradient(160deg,#64748b,#475569)', rain:'linear-gradient(160deg,#2563eb,#1e40af)', storm:'linear-gradient(160deg,#374151,#111827)', snow:'linear-gradient(160deg,#7dd3fc,#38bdf8)', fog:'linear-gradient(160deg,#94a3b8,#64748b)' }[cat] ?? 'linear-gradient(160deg,#F5850A,#D96800)';
}

function werkAdvies(cur) {
    if (!cur) return null;
    const w = wmo(cur.weathercode);
    if (w.cat==='storm') return { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', icon:'fa-cloud-bolt',       text:'Onweer — werk stilleggen' };
    if (w.cat==='snow')  return { color:'#0ea5e9', bg:'#f0f9ff', border:'#bae6fd', icon:'fa-snowflake',        text:'Sneeuw/vorst — buiten verven niet mogelijk' };
    if (w.cat==='rain')  return { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', icon:'fa-cloud-rain',       text:'Regen — buiten verven niet mogelijk' };
    if (w.cat==='fog')   return { color:'#64748b', bg:'#f8fafc', border:'#e2e8f0', icon:'fa-smog',             text:'Mist — zichtbaarheid beperkt' };
    if (cur.windspeed_10m>40) return { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', icon:'fa-wind',        text:`Harde wind ${Math.round(cur.windspeed_10m)} km/u — pas op met lakken` };
    if (cur.windspeed_10m>25) return { color:'#f59e0b', bg:'#fffbeb', border:'#fde68a', icon:'fa-wind',        text:`Wind ${Math.round(cur.windspeed_10m)} km/u — pas op met lakken` };
    if (cur.temperature_2m<5) return { color:'#0ea5e9', bg:'#f0f9ff', border:'#bae6fd', icon:'fa-temperature-low',  text:`${Math.round(cur.temperature_2m)}°C — verf droogt slecht` };
    if (cur.temperature_2m>35)return { color:'#ef4444', bg:'#fef2f2', border:'#fecaca', icon:'fa-temperature-high', text:`${Math.round(cur.temperature_2m)}°C — verf droogt te snel` };
    if (cur.relative_humidity_2m>85) return { color:'#6366f1', bg:'#f5f3ff', border:'#ddd6fe', icon:'fa-droplet', text:`Vochtigheid ${Math.round(cur.relative_humidity_2m)}% — hechting risico` };
    return null;
}

function uurAdvies(code, wind, precip) {
    const w = WMO[code] ?? { cat:'unknown' };
    if (w.cat==='storm')        return { color:'#ef4444', icon:'fa-cloud-bolt', tip:'Onweer' };
    if (w.cat==='rain')         return { color:'#3b82f6', icon:'fa-cloud-rain', tip:'Regen' };
    if (w.cat==='snow')         return { color:'#0ea5e9', icon:'fa-snowflake',  tip:'Sneeuw' };
    if (precip>=60)             return { color:'#3b82f6', icon:'fa-cloud-rain', tip:`${precip}%` };
    if (wind>40)                return { color:'#ef4444', icon:'fa-wind',       tip:`${wind}km/u` };
    if (wind>25||precip>=30)    return { color:'#f59e0b', icon:'fa-wind',       tip:wind>25?`${wind}km/u`:`${precip}%` };
    return { color:'#10b981', icon:'fa-circle-check', tip:'OK' };
}

function SectieLabel({ label }) {
    return (
        <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'10px' }}>
            <div style={{ width:'3px', height:'14px', background:'#F5850A', borderRadius:'2px' }} />
            <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
        </div>
    );
}

export default function MedewerkerWeer() {
    const [location, setLocation]       = useState(null);
    const [city, setCity]               = useState('');
    const [weather, setWeather]         = useState(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [locError, setLocError]       = useState(false);
    const [refreshing, setRefreshing]   = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [uurDag, setUurDag]           = useState(0);
    const [openDag, setOpenDag]         = useState(null);

    async function fetchWeather(lat, lon) {
        const p = new URLSearchParams({
            latitude:lat, longitude:lon,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,winddirection_10m,is_day',
            hourly:  'temperature_2m,precipitation_probability,weathercode,windspeed_10m',
            daily:   'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,sunrise,sunset',
            timezone:'Europe/Amsterdam', forecast_days:'7',
        });
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`);
        if (!r.ok) throw new Error();
        return r.json();
    }

    async function fetchCity(lat, lon) {
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=nl`, { headers:{'User-Agent':'SukApp/1.0'} });
            const d = await r.json();
            return d.address?.city || d.address?.town || d.address?.village || d.address?.municipality || '';
        } catch { return ''; }
    }

    async function load(lat, lon) {
        try {
            const [w, c] = await Promise.all([fetchWeather(lat, lon), fetchCity(lat, lon)]);
            setWeather(w);
            if (c) setCity(c);
            setLastUpdated(new Date());
        } catch { setError(true); }
        finally { setLoading(false); setRefreshing(false); }
    }

    function detect() {
        setLoading(true); setError(null);
        if (!navigator.geolocation) { load(52.3676, 4.9041); return; }
        navigator.geolocation.getCurrentPosition(
            p => { const { latitude:la, longitude:lo } = p.coords; setLocation({lat:la,lon:lo}); load(la,lo); },
            ()  => { setLocError(true); load(52.3676, 4.9041); },
            { timeout:8000 }
        );
    }

    useEffect(() => { detect(); }, []);
    function refresh() { setRefreshing(true); if (location) load(location.lat, location.lon); else detect(); }

    if (loading) return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'55vh', gap:'12px' }}>
            <div style={{ fontSize:'3rem' }}>⛅</div>
            <div style={{ color:'#64748b', fontSize:'0.88rem', fontWeight:600 }}>Weerdata ophalen...</div>
        </div>
    );

    if (error) return (
        <div style={{ padding:'24px', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'8px' }}>⚠️</div>
            <div style={{ color:'#ef4444', fontWeight:700, marginBottom:'16px' }}>Laden mislukt</div>
            <button onClick={refresh} style={{ padding:'11px 22px', background:'#F5850A', color:'#fff', border:'none', borderRadius:'12px', fontWeight:700, cursor:'pointer' }}>
                <i className="fa-solid fa-rotate" style={{ marginRight:'6px' }} />Opnieuw
            </button>
        </div>
    );

    const { current, hourly, daily } = weather;
    const now      = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const nowHour  = now.toISOString().slice(0, 13);
    const cur      = wmo(current.weathercode);
    const adv      = werkAdvies(current);
    const bg       = heroBg(cur.cat, current.is_day === 1);

    // Uurdata voor gekozen dag
    const gekozenDag = daily.time[uurDag] ?? todayIso;
    const dagUren = hourly.time.reduce((acc, t, hi) => {
        if (t.slice(0, 10) === gekozenDag) acc.push({
            time:   t,
            temp:   Math.round(hourly.temperature_2m[hi]),
            precip: hourly.precipitation_probability[hi],
            code:   hourly.weathercode[hi],
            wind:   Math.round(hourly.windspeed_10m[hi]),
            isNow:  uurDag === 0 && t.slice(0, 13) === nowHour,
        });
        return acc;
    }, []);

    return (
        <div style={{ paddingBottom:'16px' }}>

            {/* ━━ 1. HERO ━━ */}
            <div style={{ background:bg, padding:'20px 18px 24px', position:'relative', overflow:'hidden', marginBottom:'0' }}>
                <div style={{ position:'absolute', right:'-20px', top:'-20px', width:'130px', height:'130px', borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />

                {/* Locatie + refresh */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                    <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.73rem', display:'flex', alignItems:'center', gap:'5px' }}>
                        <i className="fa-solid fa-location-dot" style={{ fontSize:'0.65rem' }} />
                        {city || 'Locatie'}{locError ? ' (Amsterdam)' : ''}
                        {lastUpdated && <span style={{ opacity:0.55, marginLeft:'4px' }}>· {lastUpdated.getHours()}:{String(lastUpdated.getMinutes()).padStart(2,'0')}</span>}
                    </div>
                    <button onClick={refresh} disabled={refreshing} style={{ background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'8px', padding:'6px 11px', color:'#fff', cursor:'pointer', fontSize:'0.82rem', opacity:refreshing?0.4:1 }}>
                        <i className={`fa-solid fa-rotate${refreshing?' fa-spin':''}`} />
                    </button>
                </div>

                {/* Temp + conditie */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:'14px', marginBottom:'20px' }}>
                    <div style={{ fontSize:'5.5rem', lineHeight:1 }}>{cur.emoji}</div>
                    <div>
                        <div style={{ fontSize:'4rem', fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-0.03em' }}>
                            {Math.round(current.temperature_2m)}°
                        </div>
                        <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.8)', marginTop:'5px' }}>
                            {cur.nl}
                        </div>
                        <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>
                            Voelt als {Math.round(current.apparent_temperature)}°
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'16px' }}>
                    {[
                        { icon:'fa-wind',    label:'Wind',        val:`${Math.round(current.windspeed_10m)} km/u` },
                        { icon:'fa-droplet', label:'Vochtigheid', val:`${Math.round(current.relative_humidity_2m)}%` },
                        { icon:'fa-sun',     label:'Op · onder',  val:`${daily.sunrise[0]?.slice(11,16)} · ${daily.sunset[0]?.slice(11,16)}` },
                    ].map(s => (
                        <div key={s.label} style={{ background:'rgba(255,255,255,0.15)', borderRadius:'12px', padding:'10px 8px', textAlign:'center', backdropFilter:'blur(6px)' }}>
                            <i className={`fa-solid ${s.icon}`} style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.85rem', marginBottom:'5px', display:'block' }} />
                            <div style={{ fontSize:'0.83rem', fontWeight:800, color:'#fff' }}>{s.val}</div>
                            <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Per uur — ingebouwd in hero */}
                <div style={{ background:'rgba(0,0,0,0.15)', borderRadius:'14px', padding:'10px 10px 8px', backdropFilter:'blur(6px)' }}>
                    {/* Navigator */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                        <span style={{ fontSize:'0.65rem', fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Per uur</span>
                        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                            <button onClick={() => setUurDag(v => Math.max(0,v-1))} disabled={uurDag===0}
                                style={{ background:'rgba(255,255,255,0.18)', border:'none', borderRadius:'7px', padding:'4px 9px', cursor:uurDag===0?'default':'pointer', color:uurDag===0?'rgba(255,255,255,0.3)':'#fff', fontSize:'0.72rem' }}>
                                <i className="fa-solid fa-chevron-left" />
                            </button>
                            <div style={{ textAlign:'center', minWidth:'68px' }}>
                                <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.55)', fontWeight:600 }}>{fmtDatum(gekozenDag)}</div>
                                <div style={{ fontSize:'0.78rem', fontWeight:800, color:'#fff' }}>
                                    {uurDag===0?'Vandaag':uurDag===1?'Morgen':DAY_FULL[new Date(gekozenDag+'T00:00:00').getDay()]}
                                </div>
                            </div>
                            <button onClick={() => setUurDag(v => Math.min(daily.time.length-1,v+1))} disabled={uurDag===daily.time.length-1}
                                style={{ background:'rgba(255,255,255,0.18)', border:'none', borderRadius:'7px', padding:'4px 9px', cursor:uurDag===daily.time.length-1?'default':'pointer', color:uurDag===daily.time.length-1?'rgba(255,255,255,0.3)':'#fff', fontSize:'0.72rem' }}>
                                <i className="fa-solid fa-chevron-right" />
                            </button>
                        </div>
                    </div>

                    {/* Uurkaartjes */}
                    <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'2px', scrollbarWidth:'none' }}>
                        {dagUren.map((h, i) => {
                            const hw = wmo(h.code);
                            const ua = uurAdvies(h.code, h.wind, h.precip);
                            return (
                                <div key={i} style={{
                                    flexShrink:0, width:'56px', textAlign:'center', padding:'8px 3px 6px',
                                    background: h.isNow ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)',
                                    borderRadius:'12px',
                                    border: h.isNow ? '1.5px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.12)',
                                }}>
                                    <div style={{ fontSize:'0.58rem', fontWeight:700, color: h.isNow?'#fff':'rgba(255,255,255,0.55)', marginBottom:'4px' }}>
                                        {h.isNow ? 'Nu' : fmtTime(h.time)}
                                    </div>
                                    <div style={{ fontSize:'1.2rem', marginBottom:'3px' }}>{hw.emoji}</div>
                                    <div style={{ fontSize:'0.85rem', fontWeight:900, color:'#fff', marginBottom:'2px' }}>{h.temp}°</div>
                                    <div style={{ fontSize:'0.56rem', fontWeight:700, color:'rgba(255,255,255,0.65)', marginBottom:'5px' }}>
                                        <i className="fa-solid fa-droplet" style={{ fontSize:'0.48rem', marginRight:'2px' }} />{h.precip}%
                                    </div>
                                    <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:'5px', padding:'2px', display:'flex', alignItems:'center', justifyContent:'center', gap:'2px' }}>
                                        <i className={`fa-solid ${ua.icon}`} style={{ fontSize:'0.52rem', color:h.isNow?'#fff':ua.color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ━━ 2. WERK-ADVIES ━━ */}
            {adv && (
                <div style={{ margin:'12px 14px 0', background:adv.bg, border:`2px solid ${adv.border}`, borderRadius:'14px', padding:'13px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:adv.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={`fa-solid ${adv.icon}`} style={{ color:adv.color, fontSize:'1rem' }} />
                    </div>
                    <span style={{ fontSize:'0.85rem', color:adv.color, fontWeight:800 }}>{adv.text}</span>
                </div>
            )}

            <div style={{ padding:'16px 14px 0' }}>

            {/* ━━ 4. 7-DAAGSE ━━ */}
            <div style={{ background:'#fff', borderRadius:'16px', overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', border:'1px solid #f1f5f9', marginBottom:'16px' }}>
                <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #f1f5f9' }}>
                    <SectieLabel label="7 dagen" />
                </div>

                {/* Horizontale dag-kaartjes */}
                <div style={{ display:'flex', gap:'8px', overflowX:'auto', scrollbarWidth:'none', padding:'12px 12px 10px' }}>
                    {daily.time.map((dateStr, di) => {
                        const dw      = wmo(daily.weathercode[di]);
                        const dateObj = new Date(dateStr+'T00:00:00');
                        const dagLbl  = di===0?'Van':di===1?'Mor':DAY_3[dateObj.getDay()];
                        const tMax    = Math.round(daily.temperature_2m_max[di]);
                        const tMin    = Math.round(daily.temperature_2m_min[di]);
                        const precip  = daily.precipitation_probability_max[di];
                        const wind    = Math.round(daily.windspeed_10m_max[di]);
                        const isOpen  = openDag === di;

                        return (
                            <div key={dateStr} onClick={() => setOpenDag(isOpen?null:di)} style={{
                                flexShrink:0, width:'60px', textAlign:'center', padding:'10px 4px',
                                borderRadius:'14px', cursor:'pointer', userSelect:'none',
                                background: isOpen ? '#F5850A' : di===0 ? '#fff8f0' : '#f8fafc',
                                border: isOpen ? 'none' : di===0 ? '1.5px solid #fde8cc' : '1px solid #f1f5f9',
                                boxShadow: isOpen ? '0 4px 14px rgba(245,133,10,0.35)' : 'none',
                                color: isOpen ? '#fff' : '#1e293b',
                            }}>
                                <div style={{ fontSize:'0.58rem', fontWeight:600, opacity:0.55, marginBottom:'1px' }}>{fmtDatum(dateStr)}</div>
                                <div style={{ fontSize:'0.75rem', fontWeight:800, marginBottom:'6px', color:isOpen?'#fff':di===0?'#F5850A':'#334155' }}>{dagLbl}</div>
                                <div style={{ fontSize:'1.4rem', marginBottom:'5px' }}>{dw.emoji}</div>
                                <div style={{ fontSize:'0.85rem', fontWeight:900 }}>{tMax}°</div>
                                <div style={{ fontSize:'0.7rem', opacity:0.55, marginBottom:'6px' }}>{tMin}°</div>
                                <div style={{ fontSize:'0.62rem', fontWeight:700, color:isOpen?'rgba(255,255,255,0.85)':precip>50?'#3b82f6':'#cbd5e1', marginBottom:'2px' }}>
                                    <i className="fa-solid fa-droplet" style={{ fontSize:'0.52rem', marginRight:'1px' }} />{precip}%
                                </div>
                                <div style={{ fontSize:'0.62rem', fontWeight:700, color:isOpen?'rgba(255,255,255,0.85)':windKleur(wind) }}>
                                    <i className="fa-solid fa-wind" style={{ fontSize:'0.52rem', marginRight:'1px' }} />{wind}
                                </div>
                                <div style={{ marginTop:'6px', opacity:0.5 }}>
                                    <i className={`fa-solid fa-chevron-${isOpen?'up':'down'}`} style={{ fontSize:'0.6rem' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail uitgeklapte dag */}
                {openDag !== null && (() => {
                    const dateStr  = daily.time[openDag];
                    const dateObj  = new Date(dateStr+'T00:00:00');
                    const dagLabel = openDag===0?'Vandaag':openDag===1?'Morgen':DAY_FULL[dateObj.getDay()];
                    const tMax     = Math.round(daily.temperature_2m_max[openDag]);
                    const tMin     = Math.round(daily.temperature_2m_min[openDag]);
                    const wind     = Math.round(daily.windspeed_10m_max[openDag]);
                    const isToday  = openDag === 0;

                    const segs = Array.from({length:13}, (_,i) => {
                        const hi = hourly.time.findIndex(t => t.startsWith(`${dateStr}T${String(i+6).padStart(2,'0')}`));
                        return hi>=0 ? hourly.precipitation_probability[hi] : 0;
                    });

                    return (
                        <div style={{ padding:'0 14px 14px', borderTop:'1px solid #f1f5f9' }}>
                            <div style={{ background:'#f8fafc', borderRadius:'14px', padding:'14px' }}>
                                <div style={{ fontSize:'0.82rem', fontWeight:800, color:'#334155', marginBottom:'12px' }}>
                                    {fmtDatum(dateStr)} — {dagLabel}
                                </div>

                                {/* Regen-tijdlijn */}
                                <div style={{ fontSize:'0.62rem', color:'#94a3b8', fontWeight:700, marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Neerslag per uur</div>
                                <div style={{ display:'flex', gap:'3px', alignItems:'flex-end', height:'44px' }}>
                                    {segs.map((pct,si) => {
                                        const barH = Math.max(4,(pct/100)*40);
                                        const color = pct>=70?'#1d4ed8':pct>=40?'#60a5fa':pct>=15?'#bfdbfe':'#e2e8f0';
                                        const isNow = isToday && now.getHours()===si+6;
                                        return (
                                            <div key={si} style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'44px' }}>
                                                <div style={{ width:'100%', height:`${barH}px`, background:color, borderRadius:'3px 3px 0 0', outline:isNow?'2px solid #F5850A':'none', outlineOffset:'1px' }} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display:'flex', gap:'3px', marginTop:'4px', marginBottom:'12px' }}>
                                    {segs.map((_,si) => (
                                        <div key={si} style={{ flex:1 }}>
                                            {(si+6)%3===0 && <span style={{ fontSize:'0.58rem', color:'#94a3b8', fontWeight:600 }}>{si+6}:00</span>}
                                        </div>
                                    ))}
                                </div>

                                {/* Tegels */}
                                <div style={{ display:'flex', gap:'8px' }}>
                                    <div style={{ flex:1, background:'#fff', borderRadius:'10px', padding:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
                                        <i className="fa-solid fa-wind" style={{ color:windKleur(wind), fontSize:'1rem' }} />
                                        <div>
                                            <div style={{ fontSize:'0.9rem', fontWeight:800, color:windKleur(wind) }}>{wind} km/u</div>
                                            <div style={{ fontSize:'0.62rem', color:'#94a3b8' }}>max wind</div>
                                        </div>
                                    </div>
                                    <div style={{ flex:1, background:'#fff', borderRadius:'10px', padding:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
                                        <i className="fa-solid fa-temperature-half" style={{ color:'#F5850A', fontSize:'1rem' }} />
                                        <div>
                                            <div style={{ fontSize:'0.9rem', fontWeight:800, color:'#1e293b' }}>{tMax}° / {tMin}°</div>
                                            <div style={{ fontSize:'0.62rem', color:'#94a3b8' }}>max / min</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Legenda */}
                <div style={{ padding:'10px 14px 12px', borderTop:'1px solid #f8fafc', display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'0.65rem', color:'#64748b' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'9px', height:'9px', borderRadius:'2px', background:'#bfdbfe', display:'inline-block' }} />Lichte kans</span>
                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'9px', height:'9px', borderRadius:'2px', background:'#60a5fa', display:'inline-block' }} />Kans op regen</span>
                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'9px', height:'9px', borderRadius:'2px', background:'#1d4ed8', display:'inline-block' }} />Regen verwacht</span>
                </div>
            </div>

            {/* ━━ 5. WIND LEGENDA ━━ */}
            <div style={{ background:'#fff', borderRadius:'16px', padding:'12px 14px', boxShadow:'0 1px 8px rgba(0,0,0,0.07)', border:'1px solid #f1f5f9' }}>
                <SectieLabel label="Wind kleurcode" />
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {[
                        { color:'#10b981', label:'Gunstig', sub:'< 25 km/u' },
                        { color:'#f59e0b', label:'Pas op met lakken', sub:'> 25 km/u' },
                        { color:'#ef4444', label:'Niet lakken', sub:'> 40 km/u' },
                    ].map(l => (
                        <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'12px', height:'12px', borderRadius:'4px', background:l.color, flexShrink:0 }} />
                            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#334155' }}>{l.label}</div>
                            <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginLeft:'auto' }}>{l.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            </div>
        </div>
    );
}
