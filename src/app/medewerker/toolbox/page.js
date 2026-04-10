'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

const STORAGE_KEY = 'schildersapp_toolbox_meetings';

function saveMeetings(meetings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings)); } catch {}
}
function loadMeetings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

const ONDERWERPEN = [
    'Veilig werken op hoogte',
    'Gevaarlijke stoffen / CMR',
    'PBM gebruik',
    'Valbeveiliging',
    'Gereedschap & machines',
    'LMRA (Laatste Minuut Risico Analyse)',
    'Orde & netheid op de bouwplaats',
    'Incident/bijna-incident melden',
    'Ergonomie & tillen',
    'Anders',
];

export default function ToolboxPage() {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [view, setView] = useState('lijst'); // 'lijst' | 'nieuw' | 'detail'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ datum: new Date().toISOString().slice(0, 10), project: '', onderwerp: '', notities: '', aanwezig: '' });
    const [handtekeningen, setHandtekeningen] = useState([]);
    const [nieuwNaam, setNieuwNaam] = useState('');

    useEffect(() => { setMeetings(loadMeetings()); }, []);

    function opslaan() {
        if (!form.project || !form.onderwerp) return;
        const meeting = {
            id: Date.now(),
            datum: form.datum,
            project: form.project,
            onderwerp: form.onderwerp,
            notities: form.notities,
            aanwezig: handtekeningen,
            aangemaaktDoor: user?.name ?? 'Onbekend',
        };
        const nieuw = [meeting, ...meetings];
        setMeetings(nieuw);
        saveMeetings(nieuw);
        setView('lijst');
        setForm({ datum: new Date().toISOString().slice(0, 10), project: '', onderwerp: '', notities: '', aanwezig: '' });
        setHandtekeningen([]);
    }

    function verwijder(id) {
        if (!window.confirm('Weet je zeker dat je deze meeting wilt verwijderen?')) return;
        const nieuw = meetings.filter(m => m.id !== id);
        setMeetings(nieuw);
        saveMeetings(nieuw);
        setView('lijst');
    }

    function voegAanwezigeToE() {
        if (!nieuwNaam.trim()) return;
        setHandtekeningen(prev => [...prev, { naam: nieuwNaam.trim(), getekend: false }]);
        setNieuwNaam('');
    }

    function toggleGetekend(idx) {
        setHandtekeningen(prev => prev.map((h, i) => i === idx ? { ...h, getekend: !h.getekend } : h));
    }

    // ── Detail view ──
    if (view === 'detail' && selected) {
        return (
            <div style={{ padding: '16px', maxWidth: '480px' }}>
                <button onClick={() => setView('lijst')} style={{ background: 'none', border: 'none', color: '#F5850A', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                    <i className="fa-solid fa-arrow-left" /> Terug
                </button>
                <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ background: '#FFF3E0', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-toolbox" style={{ color: '#F5850A', fontSize: '1.1rem' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{selected.onderwerp}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{selected.datum} · {selected.project}</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Aangemaakt door</div>
                    <div style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '16px' }}>{selected.aangemaaktDoor}</div>
                    {selected.notities && <>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Notities</div>
                        <div style={{ fontSize: '0.88rem', color: '#334155', background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>{selected.notities}</div>
                    </>}
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>Aanwezig ({selected.aanwezig.length})</div>
                    {selected.aanwezig.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Geen aanwezigen geregistreerd</div>}
                    {selected.aanwezig.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <i className={`fa-solid ${h.getekend ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: h.getekend ? '#22c55e' : '#94a3b8' }} />
                            <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{h.naam}</span>
                            {h.getekend && <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#22c55e', fontWeight: 600 }}>Getekend</span>}
                        </div>
                    ))}
                    <button onClick={() => verwijder(selected.id)} style={{ marginTop: '20px', width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                        <i className="fa-solid fa-trash" style={{ marginRight: '8px' }} />Verwijderen
                    </button>
                </div>
            </div>
        );
    }

    // ── Nieuw formulier ──
    if (view === 'nieuw') {
        const kanOpslaan = form.project.trim() && form.onderwerp;
        return (
            <div style={{ padding: '16px', maxWidth: '480px' }}>
                <button onClick={() => setView('lijst')} style={{ background: 'none', border: 'none', color: '#F5850A', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                    <i className="fa-solid fa-arrow-left" /> Terug
                </button>
                <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>Nieuwe Toolbox Meeting</div>

                    <div>
                        <label style={labelStyle}>Datum</label>
                        <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Project / locatie</label>
                        <input type="text" placeholder="bijv. Heembouw Delft" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Onderwerp</label>
                        <select value={form.onderwerp} onChange={e => setForm(f => ({ ...f, onderwerp: e.target.value }))} style={inputStyle}>
                            <option value="">Kies onderwerp...</option>
                            {ONDERWERPEN.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Notities (optioneel)</label>
                        <textarea rows={3} placeholder="Aandachtspunten, afspraken..." value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>

                    <div>
                        <label style={labelStyle}>Aanwezigen</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input type="text" placeholder="Naam toevoegen..." value={nieuwNaam} onChange={e => setNieuwNaam(e.target.value)} onKeyDown={e => e.key === 'Enter' && voegAanwezigeToE()} style={{ ...inputStyle, flex: 1, margin: 0 }} />
                            <button onClick={voegAanwezigeToE} style={{ padding: '0 14px', background: '#F5850A', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>+</button>
                        </div>
                        {handtekeningen.map((h, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '6px' }}>
                                <button onClick={() => toggleGetekend(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '1.1rem', color: h.getekend ? '#22c55e' : '#cbd5e1' }}>
                                    <i className={`fa-solid ${h.getekend ? 'fa-circle-check' : 'fa-circle'}`} />
                                </button>
                                <span style={{ flex: 1, fontSize: '0.9rem', color: '#1e293b' }}>{h.naam}</span>
                                <button onClick={() => setHandtekeningen(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button onClick={opslaan} disabled={!kanOpslaan} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: kanOpslaan ? '#F5850A' : '#e2e8f0', color: kanOpslaan ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.95rem', cursor: kanOpslaan ? 'pointer' : 'default', transition: 'background 0.2s' }}>
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '8px' }} />Opslaan
                    </button>
                </div>
            </div>
        );
    }

    // ── Lijst ──
    return (
        <div style={{ padding: '16px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                        <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toolbox Meetings</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', paddingLeft: '10px' }}>{meetings.length} bijeenkomst{meetings.length !== 1 ? 'en' : ''}</div>
                </div>
                <button onClick={() => setView('nieuw')} style={{ background: '#F5850A', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-plus" /> Nieuw
                </button>
            </div>

            {meetings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-toolbox" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', color: '#e2e8f0' }} />
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Nog geen meetings</div>
                    <div style={{ fontSize: '0.85rem' }}>Tik op "Nieuw" om een toolbox meeting te registreren</div>
                </div>
            )}

            {meetings.map(m => (
                <button key={m.id} onClick={() => { setSelected(m); setView('detail'); }} style={{ width: '100%', background: '#fff', border: 'none', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#FFF3E0', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-toolbox" style={{ color: '#F5850A', fontSize: '1rem' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.onderwerp}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.datum} · {m.project}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.75rem', color: m.aanwezig.filter(a => a.getekend).length === m.aanwezig.length && m.aanwezig.length > 0 ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                            {m.aanwezig.filter(a => a.getekend).length}/{m.aanwezig.length} getekend
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.75rem', marginTop: '4px' }} />
                    </div>
                </button>
            ))}
        </div>
    );
}

const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box', outline: 'none' };
