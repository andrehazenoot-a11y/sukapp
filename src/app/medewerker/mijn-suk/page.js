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

const MONTH_NAMES = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

// ── LocalStorage helpers ──
function loadLS(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveLS(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ── Toolbox ──
const TB_KEY = 'schildersapp_toolbox_meetings';
const TB_ONDERWERPEN = ['Veilig werken op hoogte','Gevaarlijke stoffen / CMR','PBM gebruik','Valbeveiliging','Gereedschap & machines','LMRA (Laatste Minuut Risico Analyse)','Orde & netheid op de bouwplaats','Incident/bijna-incident melden','Ergonomie & tillen','Anders'];
function saveTbMeetings(m) { try { localStorage.setItem(TB_KEY, JSON.stringify(m)); } catch {} }
function loadTbMeetings() { try { return JSON.parse(localStorage.getItem(TB_KEY) || '[]'); } catch { return []; } }
export default function MijnSuk() {
    const { user, getProfile, updateProfile } = useAuth();
    const router       = useRouter();
    const searchParams = useSearchParams();
    const fotoRef      = useRef();
    const [tab, setTab] = useState(() => searchParams.get('tab') || 'toolbox');

    // ── Profiel ──
    const [profiel, setProfiel]       = useState({});
    const [fotoSaving, setFotoSaving] = useState(false);

    const nowDate = new Date();

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
    const [tbDocs, setTbDocs]                   = useState([]);
    const [tbGelezen, setTbGelezen]             = useState({}); // { [meetingId]: timestamp }
    const [tbView, setTbView]                   = useState('lijst'); // 'lijst' | 'nieuw' | 'detail'
    const [tbSelected, setTbSelected]           = useState(null);
    const [tbForm, setTbForm]                   = useState({ datum: new Date().toISOString().slice(0,10), project:'', onderwerp:'', notities:'' });
    const [tbHandtekeningen, setTbHandtekeningen] = useState([]);
    const [tbNieuwNaam, setTbNieuwNaam]         = useState('');
    const [docViewer, setDocViewer]             = useState(null);

    useEffect(() => {
        const onMsg = (e) => {
            if (e.data?.type !== 'gelezen') return;
            const { docId, userId: msgUserId, naam: msgNaam, timestamp } = e.data;
            setTbDocs(prev => prev.map(d => d.id !== docId ? d : {
                ...d, gelezen: [...(d.gelezen || []), { userId: msgUserId, naam: msgNaam, timestamp }]
            }));
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, []);

    useEffect(() => {
        if (!user) return;
        setProfiel(getProfile(user.id));
        setNotities(loadLS(`schildersapp_notities_${user.id}`, []));
        setBestellingen(loadLS(`schildersapp_bestellingen_${user.id}`, []));
        setProjecten((loadLS('schildersapp_projecten', [])).map(p => p.name));
        setTbMeetings(loadTbMeetings());
        fetch('/api/medewerker-toolbox')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data) && data.length > 0) setTbMeetings(data); })
            .catch(() => {});
        fetch('/api/documenten')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const nu = new Date();
                    setTbDocs(data.filter(d => !d.zichtbaarVanaf || new Date(d.zichtbaarVanaf) <= nu));
                }
            })
            .catch(() => {});
        try { setTbGelezen(JSON.parse(localStorage.getItem(`schildersapp_tb_gelezen_${user.id}`) || '{}')); } catch {}
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
    function tbMarkeerGelezen(meetingId) {
        const updated = { ...tbGelezen, [meetingId]: new Date().toISOString() };
        setTbGelezen(updated);
        try { localStorage.setItem(`schildersapp_tb_gelezen_${user.id}`, JSON.stringify(updated)); } catch {}
    }
    function tbOpenDetail(m) {
        setTbSelected(m);
        setTbView('detail');
        if (!tbGelezen[m.id]) tbMarkeerGelezen(m.id);
    }
    function tbOndertekend(m) {
        // Controleer of de huidige gebruiker in de aanwezig-lijst staat en getekend heeft
        if (!m.aanwezig?.length) return false;
        const entry = m.aanwezig.find(a => a.naam?.toLowerCase() === (user?.name || '').toLowerCase());
        return entry?.getekend === true;
    }
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
                <div className="tab-nav">
                    {[
                        ['toolbox', 'fa-toolbox', 'Bestanden'],
                    ].map(([t,ic,l]) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`tab-btn${tab === t ? ' active' : ''}`}
                            style={{ flex: 1 }}>
                            <i className={`fa-solid ${ic}`} style={{ fontSize:'0.7rem' }} />{l}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab inhoud ── */}
            <div style={{ padding:'14px 16px 8px' }}>

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

            {/* ════ TAB: TOOLBOX ════ */}
            {tab === 'toolbox' && (
                <div>
                    {tbView === 'detail' && tbSelected ? (
                        <div>
                            <button onClick={() => setTbView('lijst')} style={{ background:'none', border:'none', color:'#F5850A', fontWeight:700, cursor:'pointer', fontSize:'0.9rem', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px', padding:0 }}>
                                <i className="fa-solid fa-arrow-left" /> Terug
                            </button>
                            <div style={{ background:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                                    <div style={{ background:'#FFF3E0', borderRadius:'10px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                        <i className="fa-solid fa-toolbox" style={{ color:'#F5850A', fontSize:'1.1rem' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>{tbSelected.titel || tbSelected.onderwerp}</div>
                                        <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{tbSelected.datum}{tbSelected.project ? ` · ${tbSelected.project}` : ''}</div>
                                    </div>
                                </div>
                                {/* Gelezen / ondertekend badges */}
                                <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
                                    <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#10b981', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'999px', padding:'3px 10px', display:'flex', alignItems:'center', gap:'4px' }}>
                                        <i className="fa-solid fa-eye" style={{ fontSize:'0.65rem' }} />Gelezen
                                        {tbGelezen[tbSelected.id] && <span style={{ fontWeight:400, color:'#6ee7b7', marginLeft:'2px' }}>· {new Date(tbGelezen[tbSelected.id]).toLocaleDateString('nl-NL', { day:'numeric', month:'short' })} {new Date(tbGelezen[tbSelected.id]).toLocaleTimeString('nl-NL', { hour:'2-digit', minute:'2-digit' })}</span>}
                                    </span>
                                    {tbOndertekend(tbSelected) && (
                                        <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#22c55e', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'999px', padding:'3px 10px', display:'flex', alignItems:'center', gap:'4px' }}>
                                            <i className="fa-solid fa-signature" style={{ fontSize:'0.65rem' }} />Ondertekend
                                        </span>
                                    )}
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
                            {/* Toolbox documenten (van beheerder via documenten-systeem) */}
                            {tbDocs.length > 0 && (
                                <div style={{ marginBottom:'14px' }}>
                                    {(() => {
                                        const nogTeLezen = tbDocs.filter(d => !(d.gelezen || []).some(g => String(g.userId) === String(user?.id)));
                                        const alGelezen  = tbDocs.filter(d =>  (d.gelezen || []).some(g => String(g.userId) === String(user?.id)));

                                        function DocKaart({ doc }) {
                                            const gelezenEntry = (doc.gelezen || []).find(g => String(g.userId) === String(user?.id));
                                            const heeftGelezen = !!gelezenEntry;
                                            async function markeerGelezen(e) {
                                                e.preventDefault(); e.stopPropagation();
                                                if (heeftGelezen) return;
                                                try {
                                                    const res = await fetch(`/api/documenten/${doc.id}/gelezen`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId:user.id, naam:user.name }) });
                                                    const data = await res.json();
                                                    if (data.ok) setTbDocs(prev => prev.map(d => d.id !== doc.id ? d : { ...d, gelezen:[...(d.gelezen||[]), { userId:user.id, naam:user.name, timestamp:data.timestamp||new Date().toISOString() }] }));
                                                } catch {}
                                            }
                                            return (
                                                <div style={{ background:'#fff', borderRadius:'12px', border: heeftGelezen ? '1px solid #f1f5f9' : '1.5px solid #fde8cc', padding:'11px 14px', marginBottom:'6px', boxShadow:'0 1px 6px rgba(245,133,10,0.08)', display:'flex', alignItems:'center', gap:'10px' }}>
                                                    <div style={{ background: heeftGelezen ? '#f0fdf4' : '#FFF3E0', borderRadius:'9px', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                        <i className="fa-solid fa-file-pdf" style={{ color: heeftGelezen ? '#10b981' : '#F5850A', fontSize:'0.9rem' }} />
                                                    </div>
                                                    <div style={{ flex:1, minWidth:0 }}>
                                                        <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.titel}</div>
                                                        <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{doc.datum ? new Date(doc.datum).toLocaleDateString('nl-NL', { day:'numeric', month:'short', year:'numeric' }) : ''}</div>
                                                    </div>
                                                    <div style={{ display:'flex', flexDirection:'column', gap:'4px', flexShrink:0 }}>
                                                        <button onClick={() => {
                                                            const isPdf = doc.type === 'application/pdf' || doc.bestandsnaam?.toLowerCase().endsWith('.pdf');
                                                            const gelezenDoor = (doc.gelezen || []).find(g => String(g.userId) === String(user?.id));
                                                            const viewerUrl = isPdf
                                                                ? `/api/documenten/${doc.id}/viewer?userId=${user?.id}&naam=${encodeURIComponent(user?.name || '')}&gelezen=${gelezenDoor ? '1' : '0'}`
                                                                : `/api/documenten/${doc.id}/bestand`;
                                                            setDocViewer({ id: doc.id, titel: doc.titel, url: viewerUrl, type: doc.type });
                                                        }} style={{ padding:'4px 10px', background:'#F5850A', color:'#fff', border:'none', borderRadius:'7px', fontWeight:700, fontSize:'0.72rem', cursor:'pointer' }}>
                                                            Bekijk
                                                        </button>
                                                        {heeftGelezen ? (
                                                            <div style={{ padding:'4px 10px', background:'#f0fdf4', color:'#10b981', border:'1px solid #86efac', borderRadius:'7px', fontWeight:700, fontSize:'0.72rem', display:'flex', alignItems:'center', gap:'3px', justifyContent:'center' }}>
                                                                <i className="fa-solid fa-check" style={{ fontSize:'0.6rem' }} />Gelezen
                                                            </div>
                                                        ) : (
                                                            <button onClick={markeerGelezen} style={{ padding:'4px 10px', background:'#f0fdf4', color:'#10b981', border:'1px solid #86efac', borderRadius:'7px', fontWeight:700, fontSize:'0.72rem', cursor:'pointer' }}>
                                                                Aanvinken
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                {/* Nog te lezen */}
                                                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'7px' }}>
                                                    <div style={{ width:'3px', height:'12px', background:'#F5850A', borderRadius:'2px' }} />
                                                    <span style={{ fontSize:'0.68rem', fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' }}>Nog te lezen</span>
                                                    {nogTeLezen.length > 0 && <span style={{ background:'#F5850A', color:'#fff', fontSize:'0.62rem', fontWeight:700, borderRadius:'999px', padding:'1px 7px' }}>{nogTeLezen.length}</span>}
                                                </div>
                                                {nogTeLezen.length === 0
                                                    ? <div style={{ fontSize:'0.82rem', color:'#10b981', fontWeight:600, padding:'8px 0 10px', display:'flex', alignItems:'center', gap:'6px' }}>
                                                        <i className="fa-solid fa-circle-check" />Alles gelezen!
                                                      </div>
                                                    : nogTeLezen.map(doc => <DocKaart key={doc.id} doc={doc} />)
                                                }

                                                {/* Gelezen */}
                                                {alGelezen.length > 0 && (
                                                    <>
                                                        <div style={{ display:'flex', alignItems:'center', gap:'6px', margin:'10px 0 7px' }}>
                                                            <div style={{ width:'3px', height:'12px', background:'#10b981', borderRadius:'2px' }} />
                                                            <span style={{ fontSize:'0.68rem', fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' }}>Gelezen</span>
                                                            <span style={{ background:'#f0fdf4', color:'#10b981', border:'1px solid #86efac', fontSize:'0.62rem', fontWeight:700, borderRadius:'999px', padding:'1px 7px' }}>{alGelezen.length}</span>
                                                        </div>
                                                        {alGelezen.map(doc => <DocKaart key={doc.id} doc={doc} />)}
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                            {tbMeetings.length === 0 && tbDocs.length === 0 ? (
                                <div style={{ background:'#fff', borderRadius:'14px', padding:'32px 16px', textAlign:'center', border:'1.5px dashed #e2e8f0' }}>
                                    <i className="fa-solid fa-toolbox" style={{ fontSize:'2rem', color:'#e2e8f0', display:'block', marginBottom:'8px' }} />
                                    <div style={{ fontSize:'0.85rem', color:'#94a3b8', fontWeight:600 }}>Nog geen meetings</div>
                                </div>
                            ) : tbMeetings.map(m => {
                                const gelezen = !!tbGelezen[m.id];
                                const ondertekend = tbOndertekend(m);
                                // centrale meetings (aangemaakt_op = DB timestamp) hebben geen aanwezig array
                                const isCentraal = !!m.aangemaakt_op && !m.aangemaaktDoor;
                                return (
                                <button key={m.id} onClick={()=>tbOpenDetail(m)} style={{ width:'100%', background:'#fff', border:`1px solid ${!gelezen && isCentraal ? '#fde8cc' : '#f1f5f9'}`, borderRadius:'14px', padding:'12px 14px', marginBottom:'8px', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'12px' }}>
                                    <div style={{ background: gelezen ? '#f0fdf4' : '#FFF3E0', borderRadius:'10px', width:'38px', height:'38px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                        <i className="fa-solid fa-toolbox" style={{ color: gelezen ? '#10b981' : '#F5850A', fontSize:'1rem' }} />
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#1e293b', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titel || m.onderwerp}</div>
                                        <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{m.datum}{m.project ? ` · ${m.project}` : ''}</div>
                                        <div style={{ display:'flex', gap:'5px', marginTop:'5px', flexWrap:'wrap' }}>
                                            {gelezen
                                                ? <span style={{ fontSize:'0.63rem', fontWeight:700, color:'#10b981', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'999px', padding:'1px 7px', display:'flex', alignItems:'center', gap:'3px' }}><i className="fa-solid fa-eye" style={{ fontSize:'0.55rem' }} />Gelezen</span>
                                                : <span style={{ fontSize:'0.63rem', fontWeight:700, color:'#f59e0b', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'999px', padding:'1px 7px', display:'flex', alignItems:'center', gap:'3px' }}><i className="fa-solid fa-circle-exclamation" style={{ fontSize:'0.55rem' }} />Nieuw</span>
                                            }
                                            {!isCentraal && (ondertekend
                                                ? <span style={{ fontSize:'0.63rem', fontWeight:700, color:'#22c55e', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'999px', padding:'1px 7px', display:'flex', alignItems:'center', gap:'3px' }}><i className="fa-solid fa-signature" style={{ fontSize:'0.55rem' }} />Ondertekend</span>
                                                : m.aanwezig?.length > 0 ? <span style={{ fontSize:'0.63rem', fontWeight:700, color:'#94a3b8', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'999px', padding:'1px 7px', display:'flex', alignItems:'center', gap:'3px' }}><i className="fa-solid fa-pen-to-square" style={{ fontSize:'0.55rem' }} />Niet ondertekend</span> : null
                                            )}
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-chevron-right" style={{ color:'#cbd5e1', fontSize:'0.75rem', flexShrink:0 }} />
                                </button>
                                );
                            })}
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

            {/* ════ MODAL: Document viewer ════ */}
            {docViewer && (
                <>
                    <div onClick={() => setDocViewer(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:400 }} />
                    <div style={{ position:'fixed', inset:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'700px', background:'#fff', zIndex:410, display:'flex', flexDirection:'column' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
                            <span style={{ fontWeight:800, fontSize:'0.95rem', color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80%' }}>{docViewer.titel}</span>
                            <button onClick={() => setDocViewer(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'1.1rem', padding:'2px 6px' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
                            {docViewer.type?.startsWith('image/') ? (
                                <img src={docViewer.url} alt={docViewer.titel} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                            ) : (
                                <iframe src={`${docViewer.url}#view=FitH&pagemode=none`} style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }} title={docViewer.titel} />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
