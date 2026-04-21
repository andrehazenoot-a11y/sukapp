'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

const KLEUREN = [
    { id: 'wit',   bg: '#ffffff', border: '#e2e8f0' },
    { id: 'geel',  bg: '#fef9c3', border: '#fde047' },
    { id: 'groen', bg: '#f0fdf4', border: '#86efac' },
    { id: 'blauw', bg: '#eff6ff', border: '#93c5fd' },
];

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

// ── Feestdagen ──
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

// Lees welke feestdagen ingeschakeld zijn vanuit dashboard-instellingen
function getEnabledHolidays() {
    const result = {};
    for (const year of [cy-1, cy, cy+1]) {
        try {
            const enabled = JSON.parse(localStorage.getItem(`schildersapp_feestdagen_${year}`));
            const custom  = JSON.parse(localStorage.getItem(`schildersapp_custom_holidays_${year}`)) || [];
            const yearMap = getDutchHolidays(year);
            // Standaard feestdagen
            for (const [iso, name] of Object.entries(yearMap)) {
                // Als er een instelling is, volg die; anders standaard aan
                if (!enabled || enabled[iso] !== false) result[iso] = name;
            }
            // Custom feestdagen
            for (const h of custom) {
                if (!enabled || enabled[h.key] !== false) result[h.key] = h.name;
            }
        } catch {
            Object.assign(result, getDutchHolidays(year));
        }
    }
    return result;
}

// ── Kalender helpers ──
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
    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month+1, 0);
    const startDow  = (firstDay.getDay()+6)%7;
    const cells = [];
    for (let i=0; i<startDow; i++) cells.push(null);
    for (let d=1; d<=lastDay.getDate(); d++) cells.push(d);
    while (cells.length%7!==0) cells.push(null);
    const rows=[];
    for (let i=0; i<cells.length; i+=7) rows.push(cells.slice(i,i+7));
    return rows;
}

// ── LocalStorage helpers ──
function loadLS(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveLS(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

const VERLOF_TYPES = ['Vakantie','Zorgverlof','Bijzonder verlof','Compensatie uren','Overig'];

// ── Toolbox ──
const TB_KEY = 'schildersapp_toolbox_meetings';
const TB_ONDERWERPEN = ['Veilig werken op hoogte','Gevaarlijke stoffen / CMR','PBM gebruik','Valbeveiliging','Gereedschap & machines','LMRA (Laatste Minuut Risico Analyse)','Orde & netheid op de bouwplaats','Incident/bijna-incident melden','Ergonomie & tillen','Anders'];
function saveTbMeetings(m) { try { localStorage.setItem(TB_KEY, JSON.stringify(m)); } catch {} }
function loadTbMeetings() { try { return JSON.parse(localStorage.getItem(TB_KEY) || '[]'); } catch { return []; } }
const STATUS_STYLE = {
    'In behandeling': { color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
    'Goedgekeurd':    { color:'#10b981', bg:'#f0fdf4', border:'#86efac' },
    'Afgewezen':      { color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
};

export default function MijnSuk() {
    const { user, getProfile, updateProfile } = useAuth();
    const router       = useRouter();
    const searchParams = useSearchParams();
    const fotoRef      = useRef();
    const [tab, setTab] = useState(() => searchParams.get('tab') || 'verlof');

    // ── Profiel ──
    const [profiel, setProfiel]       = useState({});
    const [fotoSaving, setFotoSaving] = useState(false);

    // ── Verlof ──
    const [verlofLijst, setVerlofLijst] = useState([]);
    const [verlofForm, setVerlofForm]   = useState({ type:'Vakantie', van:'', tot:'', opmerking:'' });
    const [verlofOpen, setVerlofOpen]   = useState(false);
    const [verlofSaved, setVerlofSaved] = useState(false);
    const [editId, setEditId]           = useState(null); // null = nieuw, anders = bewerk id

    // Kalender navigatie
    const nowDate = new Date();
    const [kalMonth, setKalMonth]   = useState(nowDate.getMonth());
    const [kalYear, setKalYear]     = useState(nowDate.getFullYear());
    const [holidays, setHolidays]   = useState(ALL_HOLIDAYS_MAP);

    // ── Notities ──
    const [notities, setNotities]                     = useState([]);
    const [notitiesModal, setNotitiesModal]           = useState(null); // null | 'memo' | 'checklist'
    const [notitiesTitel, setNotitiesTitel]           = useState('');
    const [notitiesInhoud, setNotitiesInhoud]         = useState('');
    const [notitiesKleur, setNotitiesKleur]           = useState('wit');
    const [notitiesCheckItems, setNotitiesCheckItems] = useState([]);
    const [notitiesNieuwItem, setNotitiesNieuwItem]   = useState('');
    const notitiesNieuwItemRef                        = useRef();

    // ── Bestellingen ──
    const [bestellingen, setBestellingen] = useState([]);
    const [bestForm, setBestForm]         = useState({ product:'', aantal:'', eenheid:'stuk', project:'', opmerking:'' });
    const [bestOpen, setBestOpen]         = useState(false);
    const [bestSaved, setBestSaved]       = useState(false);
    const [notitieModal, setNotitieModal] = useState(null); // { id, tekst }
    const [notitieInput, setNotitieInput] = useState('');
    const [projecten, setProjecten]       = useState([]);

    // ── Toolbox ──
    const [tbMeetings, setTbMeetings]           = useState([]);
    const [tbView, setTbView]                   = useState('lijst'); // 'lijst' | 'nieuw' | 'detail'
    const [tbSelected, setTbSelected]           = useState(null);
    const [tbForm, setTbForm]                   = useState({ datum: new Date().toISOString().slice(0,10), project:'', onderwerp:'', notities:'' });
    const [tbHandtekeningen, setTbHandtekeningen] = useState([]);
    const [tbNieuwNaam, setTbNieuwNaam]         = useState('');

    useEffect(() => {
        if (!user) return;
        setProfiel(getProfile(user.id));
        const bestaandVerlof = loadLS(`schildersapp_verlof_${user.id}`, []);
        setVerlofLijst(bestaandVerlof);
        setNotities(loadLS(`schildersapp_notities_${user.id}`, []));
        setBestellingen(loadLS(`schildersapp_bestellingen_${user.id}`, []));
        setProjecten((loadLS('schildersapp_projecten', [])).map(p => p.name));
        // Laad eerst lokale meetings, daarna admin-meetings van de server
        setTbMeetings(loadTbMeetings());
        fetch('/api/medewerker-toolbox')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data) && data.length > 0) setTbMeetings(data); })
            .catch(() => {});
        const h = getEnabledHolidays();
        setHolidays(h);
        // Sync bestaande verlofaanvragen direct naar dashboard bij laden
        if (bestaandVerlof.length > 0) {
            const userName = (user.name || 'Onbekend').replace(/\s/g, '_');
            const perJaar = {};
            bestaandVerlof.filter(v => v.status === 'Goedgekeurd').forEach(v => {
                const d = new Date((v.van) + 'T00:00:00');
                const e = new Date((v.tot || v.van) + 'T00:00:00');
                while (d <= e) {
                    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    const dow = d.getDay();
                    if (dow !== 0 && dow !== 6 && !h[iso]) {
                        const yr = d.getFullYear();
                        if (!perJaar[yr]) perJaar[yr] = new Set();
                        perJaar[yr].add(iso);
                    }
                    d.setDate(d.getDate() + 1);
                }
            });
            Object.entries(perJaar).forEach(([yr, set]) => {
                try { localStorage.setItem(`schildersapp_vakantie_${yr}_${userName}`, JSON.stringify([...set].sort())); } catch {}
            });
        }
    }, [user]);

    if (!user) return null;

    const initials = user.name ? user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '??';
    const foto = profiel.foto || null;

    // ── Foto upload ──
    function handleFotoChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFotoSaving(true);
        const canvas = document.createElement('canvas');
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const size = 200;
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            const s = Math.min(img.width, img.height);
            const ox = (img.width - s) / 2;
            const oy = (img.height - s) / 2;
            ctx.drawImage(img, ox, oy, s, s, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            URL.revokeObjectURL(url);
            updateProfile(user.id, { foto: dataUrl });
            setProfiel(p => ({ ...p, foto: dataUrl }));
            setFotoSaving(false);
        };
        img.src = url;
    }

    // ── Verlof acties ──
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

        // Sync naar dashboard-vakantiekalender (schildersapp_vakantie_YEAR_Naam)
        syncVacDays(updated);

        setVerlofSaved(true);
        setTimeout(() => { setVerlofOpen(false); setVerlofSaved(false); setVerlofForm({ type:'Vakantie', van:'', tot:'', opmerking:'' }); setEditId(null); }, 1400);
    }

    function syncVacDays(lijst) {
        // Bouw set van alle goedgekeurde werkdagen uit alle verlofperiodes
        const userName = (user.name || 'Onbekend').replace(/\s/g, '_');
        // Groepeer per jaar zodat we de juiste key gebruiken
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
        // Schrijf per jaar weg
        const alleJaren = new Set([...Object.keys(perJaar), String(new Date().getFullYear())]);
        alleJaren.forEach(yr => {
            const key = `schildersapp_vakantie_${yr}_${userName}`;
            const dagen = perJaar[yr] ? [...perJaar[yr]].sort() : [];
            saveLS(key, dagen);
        });
    }
    function deleteVerlof(id) {
        if (!window.confirm('Weet je zeker dat je dit verlofverzoek wilt verwijderen?')) return;
        const updated = verlofLijst.filter(v => v.id !== id);
        setVerlofLijst(updated);
        saveLS(`schildersapp_verlof_${user.id}`, updated);
        syncVacDays(updated);
    }

    // Tap op kalenderdag → direct aan/uit zetten als vakantiedag
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

    // Verlof range voor kalender
    function inVerlofRange(iso) {
        if (!verlofForm.van || !verlofOpen) return false;
        const lo = verlofForm.van;
        const hi = verlofForm.tot || verlofForm.van;
        return iso >= lo && iso <= hi;
    }

    // ── Notities ──
    function sluitNotitiesModal() {
        setNotitiesModal(null); setNotitiesTitel(''); setNotitiesInhoud('');
        setNotitiesKleur('wit'); setNotitiesCheckItems([]); setNotitiesNieuwItem('');
    }
    function opslaanNotitie() {
        if (!notitiesTitel.trim()) return;
        const item = {
            id: Date.now(), type: notitiesModal,
            titel: notitiesTitel.trim(),
            inhoud: notitiesModal === 'memo' ? notitiesInhoud.trim() : '',
            items: notitiesModal === 'checklist' ? notitiesCheckItems : [],
            datum: new Date().toISOString(), kleur: notitiesKleur,
        };
        const updated = [item, ...notities];
        setNotities(updated);
        saveLS(`schildersapp_notities_${user.id}`, updated);
        sluitNotitiesModal();
    }
    function deleteNotitie(id) {
        if (!window.confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
        const updated = notities.filter(n => n.id !== id);
        setNotities(updated);
        saveLS(`schildersapp_notities_${user.id}`, updated);
    }
    function toggleNotitieCheck(notitieId, itemIdx) {
        const updated = notities.map(n => {
            if (n.id !== notitieId) return n;
            return { ...n, items: n.items.map((it, i) => i === itemIdx ? { ...it, gedaan: !it.gedaan } : it) };
        });
        setNotities(updated);
        saveLS(`schildersapp_notities_${user.id}`, updated);
    }
    function voegNotitieItemToe() {
        if (!notitiesNieuwItem.trim()) return;
        setNotitiesCheckItems(prev => [...prev, { tekst: notitiesNieuwItem.trim(), gedaan: false }]);
        setNotitiesNieuwItem('');
        setTimeout(() => notitiesNieuwItemRef.current?.focus(), 50);
    }

    // ── Bestellingen ──
    function submitBestelling() {
        const entry = { ...bestForm, id:Date.now(), ingediend:new Date().toISOString(), status:'Aangevraagd' };
        const updated = [entry, ...bestellingen];
        setBestellingen(updated);
        saveLS(`schildersapp_bestellingen_${user.id}`, updated);
        setBestSaved(true);
        setTimeout(() => { setBestOpen(false); setBestSaved(false); setBestForm({ product:'', aantal:'', eenheid:'stuk', project:'', opmerking:'' }); }, 1400);
    }
    function deleteBestelling(id) {
        if (!window.confirm('Weet je zeker dat je deze bestelling wilt verwijderen?')) return;
        const updated = bestellingen.filter(b=>b.id!==id);
        setBestellingen(updated);
        saveLS(`schildersapp_bestellingen_${user.id}`, updated);
    }
    // ── Toolbox functies ──
    function tbOpslaan() {
        if (!tbForm.project.trim() || !tbForm.onderwerp) return;
        const meeting = { id: Date.now(), datum: tbForm.datum, project: tbForm.project, onderwerp: tbForm.onderwerp, notities: tbForm.notities, aanwezig: tbHandtekeningen, aangemaaktDoor: user?.name ?? 'Onbekend' };
        const nieuw = [meeting, ...tbMeetings];
        setTbMeetings(nieuw); saveTbMeetings(nieuw);
        setTbView('lijst'); setTbForm({ datum: new Date().toISOString().slice(0,10), project:'', onderwerp:'', notities:'' }); setTbHandtekeningen([]);
    }
    function tbVerwijder(id) {
        if (!window.confirm('Weet je zeker dat je deze meeting wilt verwijderen?')) return;
        const nieuw = tbMeetings.filter(m => m.id !== id);
        setTbMeetings(nieuw); saveTbMeetings(nieuw); setTbView('lijst');
    }
    function tbVoegAanwezigeToe() {
        if (!tbNieuwNaam.trim()) return;
        setTbHandtekeningen(prev => [...prev, { naam: tbNieuwNaam.trim(), getekend: false }]);
        setTbNieuwNaam('');
    }
    function tbToggleGetekend(idx) {
        setTbHandtekeningen(prev => prev.map((h,i) => i===idx ? {...h, getekend:!h.getekend} : h));
    }

    function slaNotitieOp() {
        const updated = bestellingen.map(b => b.id === notitieModal.id ? { ...b, notitie: notitieInput } : b);
        setBestellingen(updated);
        saveLS(`schildersapp_bestellingen_${user.id}`, updated);
        setNotitieModal(null);
        setNotitieInput('');
    }

    const BEST_STATUS = {
        'Aangevraagd': { color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
        'Besteld':     { color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
        'Geleverd':    { color:'#10b981', bg:'#f0fdf4', border:'#86efac' },
    };

    // Verlof dagmap
    const dagMap = {};
    verlofLijst.forEach(v => {
        const st = STATUS_STYLE[v.status] || STATUS_STYLE['In behandeling'];
        verlofDagen(v.van, v.tot).forEach(iso => { dagMap[iso] = { color:st.color, bg:st.bg, v }; });
    });

    const todayIso = fmtIso(nowDate);
    const rows     = buildKalender(kalYear, kalMonth);

    // ── Verloftegoed berekening ──
    const TOTAAL_DAGEN = 25;       // standaard jaarlijks verloftegoed
    const UREN_PER_DAG = 7.5;
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
    const verbruiktDagen = verlofLijst
        .filter(v => v.status === 'Goedgekeurd')
        .reduce((sum, v) => sum + telWerkdagen(v.van, v.tot), 0);
    const resterendDagen = Math.max(0, TOTAAL_DAGEN - verbruiktDagen);
    const resterendUren  = resterendDagen * UREN_PER_DAG;

    return (
        <div style={{ display:'flex', flexDirection:'column' }}>

            {/* ── Header ── */}
            <div style={{ background:'linear-gradient(135deg,#F5850A 0%,#D96800 100%)', padding:'20px 20px 18px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:'-20px', top:'-20px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />

                <div style={{ display:'flex', alignItems:'center', gap:'14px', position:'relative', marginBottom:'14px' }}>
                    {/* Avatar / foto */}
                    <div style={{ position:'relative', flexShrink:0 }}>
                        <div onClick={() => fotoRef.current?.click()} style={{
                            width:'54px', height:'54px', borderRadius:'16px', overflow:'hidden',
                            background:'rgba(255,255,255,0.25)', border:'2px solid rgba(255,255,255,0.45)',
                            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                        }}>
                            {foto
                                ? <img src={foto} alt="Foto" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                : <span style={{ fontSize:'1.2rem', fontWeight:900, color:'#fff' }}>{initials}</span>
                            }
                        </div>
                        <div style={{ position:'absolute', bottom:'-3px', right:'-3px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.2)', cursor:'pointer' }}
                            onClick={() => fotoRef.current?.click()}>
                            <i className="fa-solid fa-camera" style={{ fontSize:'0.55rem', color:'#F5850A' }} />
                        </div>
                        <input ref={fotoRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={handleFotoChange} />
                    </div>

                    <div>
                        <div style={{ fontSize:'1.1rem', fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>{user.name}</div>
                        <div style={{ fontSize:'0.76rem', color:'rgba(255,255,255,0.78)', marginTop:'2px', fontWeight:500 }}>{user.role}</div>
                        {fotoSaving && <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>Foto opslaan…</div>}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display:'flex', gap:'4px', background:'rgba(0,0,0,0.18)', borderRadius:'12px', padding:'4px' }}>
                    {[
                        ['verlof',     'fa-umbrella-beach', 'Verlof'],
                        ['materialen', 'fa-box-open',       'Materialen'],
                        ['toolbox',    'fa-toolbox',        'Toolbox'],
                    ].map(([t,ic,l]) => (
                        <button key={t} onClick={() => setTab(t)}
                            style={{ flex:1, padding:'8px 4px', borderRadius:'9px', border:'none',
                                background:tab===t?'#fff':'transparent',
                                color:tab===t?'#F5850A':'rgba(255,255,255,0.75)',
                                fontWeight:tab===t?700:500, fontSize:'0.75rem', cursor:'pointer',
                                boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.15)':'none',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', transition:'all 0.15s' }}>
                            <i className={`fa-solid ${ic}`} style={{ fontSize:'0.7rem' }} />{l}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab inhoud ── */}
            <div style={{ padding:'14px 16px 8px' }}>

                {/* ════ TAB: VERLOF ════ */}
                {tab === 'verlof' && (
                    <div>
                        {/* Tegoed widget */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                            {[
                                { label:'Resterend', val: resterendDagen, unit:'dagen', color:'#10b981', bg:'#f0fdf4', icon:'fa-umbrella-beach' },
                                { label:'In uren',   val: resterendUren,  unit:'uur',   color:'#3b82f6', bg:'#eff6ff', icon:'fa-clock' },
                                { label:'Verbruikt', val: `${verbruiktDagen}/${TOTAAL_DAGEN}`, unit:'dagen', color:'#F5850A', bg:'#fff8f0', icon:'fa-chart-pie' },
                            ].map(s => (
                                <div key={s.label} style={{ background:s.bg, borderRadius:'14px', padding:'12px 10px', textAlign:'center' }}>
                                    <i className={`fa-solid ${s.icon}`} style={{ color:s.color, fontSize:'0.85rem', marginBottom:'5px', display:'block' }} />
                                    <div style={{ fontSize:'1.3rem', fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                                    <div style={{ fontSize:'0.7rem', color:s.color, opacity:0.7, marginTop:'2px', fontWeight:600 }}>{s.unit}</div>
                                    <div style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:'2px', fontWeight:500 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Header rij */}
                        <div style={{ display:'flex', alignItems:'center', marginBottom:'10px' }}>
                            <div style={{ fontSize:'0.72rem', color:'#94a3b8', fontWeight:500 }}>Tik een werkdag om vakantie aan of uit te zetten</div>
                        </div>

                        {/* Kalender */}
                        <div style={{ background:'#fff', borderRadius:'16px', padding:'14px', marginBottom:'12px', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>

                            {/* Maand navigator */}
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                                <button onClick={() => { let m=kalMonth-1,y=kalYear; if(m<0){m=11;y--;} setKalMonth(m);setKalYear(y); }}
                                    style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'7px 11px', cursor:'pointer', color:'#475569', fontSize:'0.8rem' }}>
                                    <i className="fa-solid fa-chevron-left" />
                                </button>
                                <span style={{ fontSize:'0.9rem', fontWeight:800, color:'#1e293b' }}>{MONTH_NAMES_FULL[kalMonth]} {kalYear}</span>
                                <button onClick={() => { let m=kalMonth+1,y=kalYear; if(m>11){m=0;y++;} setKalMonth(m);setKalYear(y); }}
                                    style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'7px 11px', cursor:'pointer', color:'#475569', fontSize:'0.8rem' }}>
                                    <i className="fa-solid fa-chevron-right" />
                                </button>
                            </div>

                            {/* Dag labels */}
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'3px' }}>
                                {DAY_LABELS.map(d => (
                                    <div key={d} style={{ textAlign:'center', fontSize:'0.7rem', fontWeight:800, color:'#94a3b8', padding:'2px 0', textTransform:'uppercase', letterSpacing:'0.03em' }}>{d}</div>
                                ))}
                            </div>

                            {/* Rijen */}
                            {rows.map((row, ri) => (
                                <div key={ri} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1px', marginBottom:'1px' }}>
                                    {row.map((dag, ci) => {
                                        if (!dag) return <div key={ci} />;
                                        const iso        = `${kalYear}-${String(kalMonth+1).padStart(2,'0')}-${String(dag).padStart(2,'0')}`;
                                        const isToday    = iso === todayIso;
                                        const isWeekend  = ci===5||ci===6;
                                        const isHoliday  = !!holidays[iso];
                                        const hasVerlof  = !!dagMap[iso];
                                        const inSel      = inVerlofRange(iso);
                                        const vInfo      = dagMap[iso];
                                        const blocked    = isWeekend || isHoliday;

                                        let bg = 'transparent';
                                        if (inSel) bg = 'rgba(245,133,10,0.18)';
                                        else if (isHoliday) bg = '#fff8f0';
                                        else if (hasVerlof) bg = vInfo.bg;

                                        const textColor = isToday ? '#F5850A'
                                            : isHoliday ? '#F5850A'
                                            : isWeekend ? '#cbd5e1' : '#1e293b';

                                        return (
                                            <button key={ci} onClick={() => tapDag(iso, isWeekend, isHoliday)}
                                                title={isHoliday ? holidays[iso] : undefined}
                                                style={{
                                                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                                                    aspectRatio:'1', borderRadius:'10px',
                                                    border: isHoliday ? '1.5px solid #fde8cc' : inSel ? '1.5px solid #F5850A' : 'none',
                                                    cursor: blocked ? 'default' : 'pointer',
                                                    background:bg, position:'relative',
                                                    outline: isToday && !inSel ? '2px solid #F5850A' : 'none',
                                                    outlineOffset:'-1px', padding:'2px 0',
                                                    opacity: blocked ? 0.7 : 1,
                                                }}>
                                                {isHoliday && (
                                                    <span style={{ position:'absolute', top:'0px', right:'1px', fontSize:'0.5rem', lineHeight:1, pointerEvents:'none' }}>⭐</span>
                                                )}
                                                <span style={{ fontSize:'0.78rem', fontWeight: isToday||isHoliday||inSel ? 800 : 500, color: inSel ? '#D96800' : textColor }}>{dag}</span>
                                                <div style={{ display:'flex', gap:'2px', marginTop:'1px', height:'5px', alignItems:'center' }}>
                                                    {hasVerlof && <span style={{ width:'4px', height:'4px', borderRadius:'50%', background: vInfo.color }} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Legenda */}
                            <div style={{ display:'flex', gap:'10px', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #f8fafc', flexWrap:'wrap' }}>
                                <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'0.7rem', color:'#94a3b8', fontWeight:600 }}>
                                    <span style={{ fontSize:'0.7rem', lineHeight:1 }}>⭐</span>Feestdag
                                </span>
                                {[['Goedgekeurd', STATUS_STYLE['Goedgekeurd']], ['Afgewezen', STATUS_STYLE['Afgewezen']]].map(([lbl,st]) => (
                                    <span key={lbl} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'0.7rem', color:'#94a3b8', fontWeight:600 }}>
                                        <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:st.color, display:'inline-block' }} />{lbl}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Aanvragenlijst */}
                        {verlofLijst.length > 0 && (
                            <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                                {verlofLijst.map(v => {
                                    const st = STATUS_STYLE[v.status]||STATUS_STYLE['In behandeling'];
                                    return (
                                        <div key={v.id} style={{ background:'#fff', borderRadius:'13px', padding:'11px 14px', boxShadow:'0 1px 5px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:'10px' }}>
                                            <div style={{ flex:1 }}>
                                                <div style={{ fontSize:'0.85rem', fontWeight:800, color:'#1e293b' }}>{v.type}</div>
                                                <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'1px' }}>
                                                    {fmtDate(v.van)}{v.tot&&v.tot!==v.van?` → ${fmtDate(v.tot)}`:''}
                                                    {v.opmerking && ` · ${v.opmerking}`}
                                                </div>
                                            </div>
                                            {v.status === 'Afgewezen' && (
                                                <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:'999px', padding:'3px 9px', fontSize:'0.63rem', fontWeight:700, color:st.color, whiteSpace:'nowrap' }}>{v.status}</div>
                                            )}
                                            <div style={{ display:'flex', gap:'2px' }}>
                                                <button onClick={() => openEdit(v)} style={{ background:'#f1f5f9', border:'none', borderRadius:'7px', padding:'5px 7px', cursor:'pointer', color:'#475569', fontSize:'0.75rem' }}>
                                                    <i className="fa-solid fa-pen" />
                                                </button>
                                                <button onClick={() => deleteVerlof(v.id)} style={{ background:'#fef2f2', border:'none', borderRadius:'7px', padding:'5px 7px', cursor:'pointer', color:'#ef4444', fontSize:'0.75rem' }}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ════ TAB: MATERIALEN ════ */}
                {tab === 'materialen' && (
                    <div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                                <div style={{ width:'3px', height:'14px', background:'#F5850A', borderRadius:'2px' }} />
                                <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' }}>Bestelde materialen</span>
                            </div>
                            <button onClick={() => setBestOpen(true)}
                                style={{ background:'#F5850A', color:'#fff', border:'none', borderRadius:'10px', padding:'7px 12px', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'5px' }}>
                                <i className="fa-solid fa-plus" style={{ fontSize:'0.7rem' }} />Toevoegen
                            </button>
                        </div>
                        {(() => {
                            const totaal = bestellingen.reduce((s, b) => s + (b.prijs || 0), 0);
                            return totaal > 0 ? (
                                <div style={{ background:'linear-gradient(135deg,#F5850A,#D96800)', borderRadius:'12px', padding:'10px 14px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <span style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.78rem', fontWeight:600 }}>{bestellingen.filter(b=>b.prijs).length} producten met prijs</span>
                                    <span style={{ color:'#fff', fontSize:'1rem', fontWeight:800 }}>€ {totaal.toFixed(2).replace('.',',')}</span>
                                </div>
                            ) : null;
                        })()}
                        {bestellingen.length===0 ? (
                            <div style={{ background:'#fff', borderRadius:'16px', padding:'28px 16px', textAlign:'center', border:'1.5px dashed #e2e8f0' }}>
                                <i className="fa-solid fa-box-open" style={{ fontSize:'1.8rem', color:'#cbd5e1', display:'block', marginBottom:'8px' }} />
                                <div style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:600 }}>Nog geen bestellingen</div>
                            </div>
                        ) : bestellingen.map(b => {
                            const st = BEST_STATUS[b.status]||BEST_STATUS['Aangevraagd'];
                            return (
                                <div key={b.id} style={{ background:'#fff', borderRadius:'14px', padding:'12px 14px', marginBottom:'8px', boxShadow:'0 1px 5px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:'10px' }}>
                                    <div style={{ flex:1 }}>
                                        <div style={{ fontSize:'0.87rem', fontWeight:800, color:'#1e293b' }}>{b.product}</div>
                                        <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'1px' }}>{b.aantal} {b.eenheid}{b.project?` · ${b.project}`:''}{b.opmerking?` · ${b.opmerking}`:''}</div>
                                        {b.notitie && <div style={{ fontSize:'0.7rem', color:'#475569', marginTop:'3px', background:'#f8fafc', borderRadius:'6px', padding:'3px 7px', display:'inline-block' }}><i className="fa-solid fa-note-sticky" style={{ color:'#F5850A', marginRight:'4px' }} />{b.notitie}</div>}
                                        {b.ingediend && <div style={{ fontSize:'0.65rem', color:'#94a3b8', marginTop:'3px' }}><i className="fa-solid fa-clock" style={{ marginRight:'3px' }} />{new Date(b.ingediend).toLocaleDateString('nl-NL', { day:'numeric', month:'short', year:'numeric' })}</div>}
                                    </div>
                                    <div style={{ textAlign:'right', flexShrink:0 }}>
                                        {b.prijs != null && <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#F5850A' }}>€ {Number(b.prijs).toFixed(2).replace('.',',')}</div>}
                                        <div style={{ background:st.bg, border:`1px solid ${st.border}`, borderRadius:'999px', padding:'3px 9px', fontSize:'0.63rem', fontWeight:700, color:st.color, whiteSpace:'nowrap', marginTop: b.prijs != null ? '3px' : 0 }}>{b.status}</div>
                                    </div>
                                    <button onClick={() => { setNotitieModal({ id:b.id }); setNotitieInput(b.notitie||''); }}
                                        style={{ background:'none', border:'none', color: b.notitie ? '#F5850A' : '#cbd5e1', cursor:'pointer', fontSize:'0.82rem', padding:'2px' }}
                                        title="Notitie toevoegen">
                                        <i className="fa-solid fa-note-sticky" />
                                    </button>
                                    <button onClick={() => deleteBestelling(b.id)} style={{ background:'none', border:'none', color:'#e2e8f0', cursor:'pointer', fontSize:'0.78rem', padding:'2px' }}>
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </div>
                            );
                        })}
                        <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                            <button onClick={() => router.push('/medewerker/materiaal')}
                                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', padding:'11px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#F5850A,#D96800)', color:'#fff', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', boxShadow:'0 2px 8px rgba(245,133,10,0.25)' }}>
                                <i className="fa-solid fa-magnifying-glass" />
                                Zoek meer materialen
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ════ MODAL: Notitie bestelling ════ */}
            {notitieModal && (
                <>
                    <div onClick={() => setNotitieModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300 }} />
                    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', zIndex:310 }}>
                        <div style={{ width:'40px', height:'4px', background:'#e2e8f0', borderRadius:'2px', margin:'0 auto 18px' }} />
                        <h3 style={{ margin:'0 0 14px', fontSize:'1rem', fontWeight:800, color:'#1e293b' }}>
                            <i className="fa-solid fa-note-sticky" style={{ color:'#F5850A', marginRight:'8px' }} />Notitie
                        </h3>
                        <textarea
                            value={notitieInput}
                            onChange={e => setNotitieInput(e.target.value)}
                            placeholder="Schrijf een notitie bij dit product..."
                            rows={3}
                            style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                            autoFocus
                        />
                        <div style={{ display:'flex', gap:'10px', marginTop:'14px' }}>
                            <button onClick={() => setNotitieModal(null)}
                                style={{ flex:1, padding:'11px', borderRadius:'10px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:700, fontSize:'0.9rem', cursor:'pointer' }}>
                                Annuleren
                            </button>
                            <button onClick={slaNotitieOp}
                                style={{ flex:2, padding:'11px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#F5850A,#D96800)', color:'#fff', fontWeight:700, fontSize:'0.9rem', cursor:'pointer' }}>
                                Opslaan
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ════ MODAL: Verlof aanvragen ════ */}
            {verlofOpen && (
                <>
                    <div onClick={() => setVerlofOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300 }} />
                    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', zIndex:310 }}>
                        <div style={{ width:'40px', height:'4px', background:'#e2e8f0', borderRadius:'2px', margin:'0 auto 18px' }} />
                        {verlofSaved ? (
                            <div style={{ textAlign:'center', padding:'20px', color:'#10b981', fontSize:'0.95rem', fontWeight:700 }}>
                                <i className="fa-solid fa-check-circle" style={{ fontSize:'2rem', display:'block', marginBottom:'8px' }} />Aanvraag ingediend!
                            </div>
                        ) : (<>
                            <h3 style={{ margin:'0 0 16px', fontSize:'1rem', fontWeight:800, color:'#1e293b' }}>
                                <i className="fa-solid fa-umbrella-beach" style={{ color:'#F5850A', marginRight:'8px' }} />{editId ? 'Verlof wijzigen' : 'Verlof aanvragen'}
                            </h3>

                            <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Type verlof</label>
                            <select value={verlofForm.type} onChange={e=>setVerlofForm(f=>({...f,type:e.target.value}))}
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', marginBottom:'14px', fontSize:'0.9rem', background:'#fff' }}>
                                {VERLOF_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Eerste dag</label>
                                    <input type="date" value={verlofForm.van}
                                        onChange={e => setVerlofForm(f => ({ ...f, van:e.target.value, tot: f.tot < e.target.value ? e.target.value : f.tot }))}
                                        style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.88rem', boxSizing:'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Laatste dag</label>
                                    <input type="date" value={verlofForm.tot} min={verlofForm.van}
                                        onChange={e => setVerlofForm(f => ({ ...f, tot:e.target.value }))}
                                        style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.88rem', boxSizing:'border-box' }} />
                                </div>
                            </div>

                            {/* Aantal dagen preview */}
                            {verlofForm.van && (
                                <div style={{ background:'#fff8f0', borderRadius:'10px', padding:'9px 14px', marginBottom:'14px', fontSize:'0.8rem', color:'#D96800', fontWeight:700, display:'flex', alignItems:'center', gap:'7px' }}>
                                    <i className="fa-regular fa-calendar" style={{ fontSize:'0.85rem' }} />
                                    {verlofForm.van === verlofForm.tot || !verlofForm.tot
                                        ? `1 dag — ${fmtDate(verlofForm.van)}`
                                        : (() => {
                                            const van = new Date(verlofForm.van + 'T00:00:00');
                                            const tot = new Date(verlofForm.tot + 'T00:00:00');
                                            let dagen = 0;
                                            const d = new Date(van);
                                            while (d <= tot) {
                                                const dow = d.getDay();
                                                if (dow !== 0 && dow !== 6 && !holidays[fmtIso(d)]) dagen++;
                                                d.setDate(d.getDate()+1);
                                            }
                                            return `${dagen} werkdag${dagen!==1?'en':''} — ${fmtDate(verlofForm.van)} t/m ${fmtDate(verlofForm.tot)}`;
                                        })()
                                    }
                                </div>
                            )}

                            <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Opmerking (optioneel)</label>
                            <input type="text" value={verlofForm.opmerking} onChange={e=>setVerlofForm(f=>({...f,opmerking:e.target.value}))}
                                placeholder="Bijv. familiebezoek, ziekenhuisbezoek..."
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', marginBottom:'18px', fontSize:'0.9rem', boxSizing:'border-box' }} />

                            <button onClick={submitVerlof} disabled={!verlofForm.van}
                                style={{ width:'100%', padding:'14px', background: verlofForm.van ? '#F5850A' : '#e2e8f0', color: verlofForm.van ? '#fff' : '#94a3b8', border:'none', borderRadius:'12px', fontWeight:700, fontSize:'0.95rem', cursor: verlofForm.van ? 'pointer' : 'default' }}>
                                {editId ? 'Wijzigingen opslaan' : 'Aanvraag indienen'}
                            </button>
                        </>)}
                    </div>
                </>
            )}

            {/* ════ TAB: TOOLBOX ════ */}
            {tab === 'toolbox' && (
                <div>
                    {tbView === 'detail' && tbSelected ? (
                        <div>
                            <button onClick={() => setTbView('lijst')} style={{ background:'none', border:'none', color:'#F5850A', fontWeight:700, cursor:'pointer', fontSize:'0.9rem', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>
                                <i className="fa-solid fa-arrow-left" /> Terug
                            </button>
                            <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                                    <div style={{ background:'#FFF3E0', borderRadius:'10px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                        <i className="fa-solid fa-toolbox" style={{ color:'#F5850A', fontSize:'1.1rem' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>{tbSelected.titel || tbSelected.onderwerp}</div>
                                        <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{tbSelected.datum}{tbSelected.project ? ` · ${tbSelected.project}` : ''}</div>
                                    </div>
                                </div>
                                {(tbSelected.aangemaaktDoor || tbSelected.aangemaakt_op) && <>
                                    <div style={{ fontSize:'0.8rem', color:'#64748b', marginBottom:'4px' }}>Aangemaakt door</div>
                                    <div style={{ fontSize:'0.9rem', color:'#1e293b', marginBottom:'16px' }}>{tbSelected.aangemaaktDoor || fmtDate(tbSelected.aangemaakt_op?.slice(0,10))}</div>
                                </>}
                                {(tbSelected.beschrijving || tbSelected.notities) && <>
                                    <div style={{ fontSize:'0.8rem', color:'#64748b', marginBottom:'4px' }}>Omschrijving</div>
                                    <div style={{ fontSize:'0.88rem', color:'#334155', background:'#f8fafc', borderRadius:'8px', padding:'10px 12px', marginBottom:'16px', whiteSpace:'pre-wrap' }}>{tbSelected.beschrijving || tbSelected.notities}</div>
                                </>}
                                {tbSelected.bestanden?.length > 0 && <>
                                    <div style={{ fontSize:'0.8rem', color:'#64748b', marginBottom:'8px' }}>Bestanden ({tbSelected.bestanden.length})</div>
                                    {tbSelected.bestanden.map(b => (
                                        <a key={b.bestand_id} href={`/api/medewerker-toolbox/bestand/${b.bestand_id}`} target="_blank" rel="noreferrer"
                                            style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f8fafc', borderRadius:'9px', marginBottom:'6px', textDecoration:'none', color:'#1e293b' }}>
                                            <i className="fa-solid fa-file" style={{ color:'#F5850A' }} />
                                            <span style={{ fontSize:'0.88rem', fontWeight:600 }}>{b.originele_naam || b.bestandsnaam}</span>
                                            <i className="fa-solid fa-arrow-down-to-line" style={{ marginLeft:'auto', color:'#94a3b8', fontSize:'0.8rem' }} />
                                        </a>
                                    ))}
                                    <div style={{ marginBottom:'10px' }} />
                                </>}
                                <div style={{ fontSize:'0.8rem', color:'#64748b', marginBottom:'8px' }}>Aanwezig ({tbSelected.aanwezig?.length ?? 0})</div>
                                {!tbSelected.aanwezig?.length && <div style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Geen aanwezigen geregistreerd</div>}
                                {tbSelected.aanwezig?.map((h,i) => (
                                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                                        <i className={`fa-solid ${h.getekend?'fa-circle-check':'fa-circle-xmark'}`} style={{ color:h.getekend?'#22c55e':'#94a3b8' }} />
                                        <span style={{ fontSize:'0.9rem', color:'#1e293b' }}>{h.naam}</span>
                                        {h.getekend && <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'#22c55e', fontWeight:600 }}>Getekend</span>}
                                    </div>
                                ))}
                                {!tbSelected.aangemaakt_op && (
                                    <button onClick={() => tbVerwijder(tbSelected.id)} style={{ marginTop:'20px', width:'100%', padding:'11px', borderRadius:'10px', border:'1px solid #fee2e2', background:'#fff5f5', color:'#ef4444', fontWeight:700, cursor:'pointer', fontSize:'0.9rem' }}>
                                        <i className="fa-solid fa-trash" style={{ marginRight:'8px' }} />Verwijderen
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : tbView === 'nieuw' ? (
                        <div>
                            <button onClick={() => setTbView('lijst')} style={{ background:'none', border:'none', color:'#F5850A', fontWeight:700, cursor:'pointer', fontSize:'0.9rem', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>
                                <i className="fa-solid fa-arrow-left" /> Terug
                            </button>
                            <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', display:'flex', flexDirection:'column', gap:'14px' }}>
                                <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>Nieuwe Toolbox Meeting</div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.82rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Datum</label>
                                    <input type="date" value={tbForm.datum} onChange={e=>setTbForm(f=>({...f,datum:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#f8fafc', boxSizing:'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.82rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Project / locatie</label>
                                    <input type="text" placeholder="bijv. Heembouw Delft" value={tbForm.project} onChange={e=>setTbForm(f=>({...f,project:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#f8fafc', boxSizing:'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.82rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Onderwerp</label>
                                    <select value={tbForm.onderwerp} onChange={e=>setTbForm(f=>({...f,onderwerp:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#fff', boxSizing:'border-box' }}>
                                        <option value="">Kies onderwerp...</option>
                                        {TB_ONDERWERPEN.map(o=><option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.82rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Notities (optioneel)</label>
                                    <textarea rows={3} placeholder="Aandachtspunten, afspraken..." value={tbForm.notities} onChange={e=>setTbForm(f=>({...f,notities:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#f8fafc', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }} />
                                </div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.82rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Aanwezigen</label>
                                    <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                                        <input type="text" placeholder="Naam toevoegen..." value={tbNieuwNaam} onChange={e=>setTbNieuwNaam(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tbVoegAanwezigeToe()} style={{ flex:1, padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#f8fafc' }} />
                                        <button onClick={tbVoegAanwezigeToe} style={{ padding:'0 14px', background:'#F5850A', color:'#fff', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer', fontSize:'0.9rem' }}>+</button>
                                    </div>
                                    {tbHandtekeningen.map((h,i)=>(
                                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:'#f8fafc', borderRadius:'8px', marginBottom:'6px' }}>
                                            <button onClick={()=>tbToggleGetekend(i)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:'1.1rem', color:h.getekend?'#22c55e':'#cbd5e1' }}>
                                                <i className={`fa-solid ${h.getekend?'fa-circle-check':'fa-circle'}`} />
                                            </button>
                                            <span style={{ flex:1, fontSize:'0.9rem', color:'#1e293b' }}>{h.naam}</span>
                                            <button onClick={()=>setTbHandtekeningen(prev=>prev.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'0.85rem' }}>
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={tbOpslaan} disabled={!tbForm.project.trim()||!tbForm.onderwerp}
                                    style={{ width:'100%', padding:'13px', borderRadius:'12px', border:'none', background:(tbForm.project.trim()&&tbForm.onderwerp)?'#F5850A':'#e2e8f0', color:(tbForm.project.trim()&&tbForm.onderwerp)?'#fff':'#94a3b8', fontWeight:800, fontSize:'0.95rem', cursor:(tbForm.project.trim()&&tbForm.onderwerp)?'pointer':'default' }}>
                                    <i className="fa-solid fa-floppy-disk" style={{ marginRight:'8px' }} />Opslaan
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                                    <div style={{ width:'3px', height:'14px', background:'#F5850A', borderRadius:'2px' }} />
                                    <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' }}>Toolbox Meetings</span>
                                </div>
                                <button onClick={()=>setTbView('nieuw')} style={{ background:'#F5850A', color:'#fff', border:'none', borderRadius:'10px', padding:'7px 12px', fontWeight:700, cursor:'pointer', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'5px' }}>
                                    <i className="fa-solid fa-plus" style={{ fontSize:'0.7rem' }} />Nieuw
                                </button>
                            </div>
                            {tbMeetings.length === 0 ? (
                                <div style={{ background:'#fff', borderRadius:'14px', padding:'32px 16px', textAlign:'center', border:'1.5px dashed #e2e8f0' }}>
                                    <i className="fa-solid fa-toolbox" style={{ fontSize:'2rem', color:'#e2e8f0', display:'block', marginBottom:'8px' }} />
                                    <div style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:600 }}>Nog geen meetings</div>
                                </div>
                            ) : tbMeetings.map(m => (
                                <button key={m.id} onClick={()=>{setTbSelected(m);setTbView('detail');}} style={{ width:'100%', background:'#fff', border:'none', borderRadius:'14px', padding:'14px 16px', marginBottom:'8px', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', display:'flex', alignItems:'center', gap:'12px' }}>
                                    <div style={{ background:'#FFF3E0', borderRadius:'10px', width:'38px', height:'38px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                        <i className="fa-solid fa-toolbox" style={{ color:'#F5850A', fontSize:'1rem' }} />
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titel || m.onderwerp}</div>
                                        <div style={{ fontSize:'0.82rem', color:'#64748b' }}>{m.datum}{m.project ? ` · ${m.project}` : ''}</div>
                                    </div>
                                    <div style={{ textAlign:'right', flexShrink:0 }}>
                                        <div style={{ fontSize:'0.72rem', color: m.aanwezig.filter(a=>a.getekend).length===m.aanwezig.length&&m.aanwezig.length>0?'#22c55e':'#94a3b8', fontWeight:600 }}>
                                            {m.aanwezig.filter(a=>a.getekend).length}/{m.aanwezig.length} getekend
                                        </div>
                                        <i className="fa-solid fa-chevron-right" style={{ color:'#cbd5e1', fontSize:'0.75rem', marginTop:'4px' }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ════ MODAL: Bestelling ════ */}
            {bestOpen && (
                <>
                    <div onClick={() => setBestOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300 }} />
                    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'480px', background:'#fff', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', zIndex:310 }}>
                        <div style={{ width:'40px', height:'4px', background:'#e2e8f0', borderRadius:'2px', margin:'0 auto 18px' }} />
                        <h3 style={{ margin:'0 0 16px', fontSize:'1rem', fontWeight:800, color:'#1e293b', display:'flex', alignItems:'center', gap:'8px' }}>
                            <i className="fa-solid fa-box-open" style={{ color:'#F5850A' }} />Materiaal aanvragen
                        </h3>
                        {bestSaved ? (
                            <div style={{ textAlign:'center', padding:'20px', color:'#10b981', fontSize:'0.95rem', fontWeight:700 }}>
                                <i className="fa-solid fa-check-circle" style={{ fontSize:'2rem', display:'block', marginBottom:'8px' }} />Aanvraag ingediend!
                            </div>
                        ) : (<>
                            <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Product / materiaal</label>
                            <input type="text" value={bestForm.product} onChange={e=>setBestForm(f=>({...f,product:e.target.value}))} placeholder="Bijv. Sikkens Rubbol BL 2.5L"
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', marginBottom:'12px', fontSize:'0.9rem', boxSizing:'border-box' }} />
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Aantal</label>
                                    <input type="number" min="1" value={bestForm.aantal} onChange={e=>setBestForm(f=>({...f,aantal:e.target.value}))} placeholder="1"
                                        style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', boxSizing:'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Eenheid</label>
                                    <select value={bestForm.eenheid} onChange={e=>setBestForm(f=>({...f,eenheid:e.target.value}))}
                                        style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'0.9rem', background:'#fff' }}>
                                        {['stuk','liter','emmer','rol','pak','meter','doos'].map(e=><option key={e}>{e}</option>)}
                                    </select>
                                </div>
                            </div>
                            {projecten.length>0&&(<>
                                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Project (optioneel)</label>
                                <select value={bestForm.project} onChange={e=>setBestForm(f=>({...f,project:e.target.value}))}
                                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', marginBottom:'12px', fontSize:'0.9rem', background:'#fff' }}>
                                    <option value="">— Geen project —</option>
                                    {projecten.map(p=><option key={p}>{p}</option>)}
                                </select>
                            </>)}
                            <label style={{ display:'block', fontSize:'0.8rem', fontWeight:700, color:'#475569', marginBottom:'5px' }}>Opmerking (optioneel)</label>
                            <input type="text" value={bestForm.opmerking} onChange={e=>setBestForm(f=>({...f,opmerking:e.target.value}))} placeholder="Bijv. kleur, maat, urgentie..."
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:'10px', marginBottom:'18px', fontSize:'0.9rem', boxSizing:'border-box' }} />
                            <button onClick={submitBestelling} disabled={!bestForm.product||!bestForm.aantal}
                                style={{ width:'100%', padding:'14px', background:(bestForm.product&&bestForm.aantal)?'#F5850A':'#e2e8f0', color:(bestForm.product&&bestForm.aantal)?'#fff':'#94a3b8', border:'none', borderRadius:'12px', fontWeight:700, fontSize:'0.95rem', cursor:(bestForm.product&&bestForm.aantal)?'pointer':'default' }}>
                                Aanvraag indienen
                            </button>
                        </>)}
                    </div>
                </>
            )}
        </div>
    );
}
