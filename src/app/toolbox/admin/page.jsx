'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const formatDatum = (d) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
const formatTijd = (d) => new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const formatGrootte = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
const MIME_ICOON = { 'application/pdf': '📄', 'image/jpeg': '🖼️', 'image/png': '🖼️', 'video/mp4': '🎬', 'video/quicktime': '🎬', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝', 'application/msword': '📝', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊' };
const icoon = (mime) => MIME_ICOON[mime] || '📎';

export default function ToolboxAdmin() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [tab, setTab] = useState('meetings');
    const [meetings, setMeetings] = useState([]);
    const [users, setUsers] = useState([]);
    const [openMeetingId, setOpenMeetingId] = useState(null);
    const [bevestigingen, setBevestigingen] = useState({});
    const [bestandenCache, setBestandenCache] = useState({});

    // Nieuw meeting formulier
    const [nwTitel, setNwTitel] = useState('');
    const [nwDatum, setNwDatum] = useState(new Date().toISOString().split('T')[0]);
    const [nwBeschrijving, setNwBeschrijving] = useState('');
    const [nwLaden, setNwLaden] = useState(false);

    // Nieuw gebruiker formulier
    const [nwNaam, setNwNaam] = useState('');
    const [nwEmail, setNwEmail] = useState('');
    const [nwWw, setNwWw] = useState('');
    const [nwRol, setNwRol] = useState('medewerker');
    const [nwULaden, setNwULaden] = useState(false);

    // Upload
    const [uploading, setUploading] = useState({});
    const uploadRef = useRef({});

    useEffect(() => {
        fetch('/api/toolbox/auth').then(r => {
            if (!r.ok) { router.replace('/toolbox'); return null; }
            return r.json();
        }).then(d => {
            if (d) {
                if (d.rol !== 'admin') { router.replace('/toolbox/dashboard'); return; }
                setUser(d);
            }
        });
    }, []);

    useEffect(() => { if (user) { laadMeetings(); laadUsers(); } }, [user]);
    useEffect(() => { if (tab === 'lezers' && openMeetingId) laadBevestigingen(openMeetingId); }, [tab, openMeetingId]);

    const laadMeetings = () => fetch('/api/toolbox/meetings').then(r => r.json()).then(d => setMeetings(Array.isArray(d) ? d : []));
    const laadUsers = () => fetch('/api/toolbox/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    const laadBevestigingen = (id) => fetch(`/api/toolbox/meetings/${id}/bevestigingen`).then(r => r.json()).then(d => setBevestigingen(p => ({ ...p, [id]: d })));

    const uitloggen = async () => { await fetch('/api/toolbox/auth', { method: 'DELETE' }); router.replace('/toolbox'); };

    const maakMeeting = async (e) => {
        e.preventDefault();
        if (!nwTitel || !nwDatum) return;
        setNwLaden(true);
        const res = await fetch('/api/toolbox/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titel: nwTitel, datum: nwDatum, beschrijving: nwBeschrijving }) });
        if (res.ok) { setNwTitel(''); setNwDatum(new Date().toISOString().split('T')[0]); setNwBeschrijving(''); await laadMeetings(); }
        setNwLaden(false);
    };

    const verwijderMeeting = async (id) => {
        if (!confirm('Meeting en alle bestanden verwijderen?')) return;
        await fetch(`/api/toolbox/meetings/${id}`, { method: 'DELETE' });
        if (openMeetingId === id) setOpenMeetingId(null);
        await laadMeetings();
    };

    const uploadBestand = async (meetingId, file) => {
        setUploading(p => ({ ...p, [meetingId]: true }));
        const fd = new FormData();
        fd.append('bestand', file);
        await fetch(`/api/toolbox/meetings/${meetingId}/bestanden`, { method: 'POST', body: fd });
        const r = await fetch(`/api/toolbox/meetings/${meetingId}/bestanden`);
        const d = await r.json();
        setBestandenCache(p => ({ ...p, [meetingId]: d }));
        setUploading(p => ({ ...p, [meetingId]: false }));
        await laadMeetings();
    };

    const verwijderBestand = async (bestandId, meetingId) => {
        await fetch(`/api/toolbox/bestand/${bestandId}`, { method: 'DELETE' });
        setBestandenCache(p => ({ ...p, [meetingId]: (p[meetingId] || []).filter(b => b.id !== bestandId) }));
        await laadMeetings();
    };

    const openMeeting = async (id) => {
        const nieuw = openMeetingId === id ? null : id;
        setOpenMeetingId(nieuw);
        if (nieuw && !bestandenCache[nieuw]) {
            const r = await fetch(`/api/toolbox/meetings/${nieuw}/bestanden`);
            const data = await r.json();
            setBestandenCache(p => ({ ...p, [nieuw]: data }));
        }
        if (nieuw && tab === 'lezers') laadBevestigingen(nieuw);
    };

    const maakUser = async (e) => {
        e.preventDefault();
        setNwULaden(true);
        const res = await fetch('/api/toolbox/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ naam: nwNaam, email: nwEmail, wachtwoord: nwWw, rol: nwRol }) });
        if (res.ok) { setNwNaam(''); setNwEmail(''); setNwWw(''); setNwRol('medewerker'); await laadUsers(); }
        else { const d = await res.json(); alert(d.error || 'Fout'); }
        setNwULaden(false);
    };

    const verwijderUser = async (id, naam) => {
        if (!confirm(`${naam} verwijderen?`)) return;
        await fetch(`/api/toolbox/users/${id}`, { method: 'DELETE' });
        await laadUsers();
    };

    const resetWachtwoord = async (id, naam) => {
        const nieuw = prompt(`Nieuw wachtwoord voor ${naam}:`);
        if (!nieuw) return;
        await fetch(`/api/toolbox/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wachtwoord: nieuw }) });
        alert('Wachtwoord gewijzigd');
    };

    if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}><div style={{ color: '#64748b' }}>Laden…</div></div>;

    // Statistieken berekenen
    const totaalMeetings = meetings.length;
    const totaalMedewerkers = users.filter(u => u.rol === 'medewerker').length;

    const tabStyle = (t) => ({
        padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
        background: tab === t ? '#F5850A' : 'transparent',
        color: tab === t ? '#fff' : '#64748b',
        transition: 'all 0.15s',
    });

    const inputSt = { padding: '9px 13px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Header */}
            <div style={{ background: '#1e293b', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: '#F5850A', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 16 }}>🔧</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Toolbox Admin</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{user.naam}</span>
                    <button onClick={uitloggen} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', color: '#cbd5e1' }}>Uitloggen</button>
                </div>
            </div>

            {/* Statistieken balk */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: '#FFF3E0', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1rem' }}>📋</span>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>{totaalMeetings}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>MEETINGS</div>
                    </div>
                </div>
                <div style={{ width: 1, background: '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: '#f0fdf4', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1rem' }}>👥</span>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>{totaalMedewerkers}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>MEDEWERKERS</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 20px', display: 'flex', gap: 4, alignItems: 'center', height: 48 }}>
                <button style={tabStyle('meetings')} onClick={() => setTab('meetings')}>📋 Meetings</button>
                <button style={tabStyle('lezers')} onClick={() => setTab('lezers')}>👁️ Wie heeft gelezen</button>
                <button style={tabStyle('medewerkers')} onClick={() => setTab('medewerkers')}>👥 Medewerkers</button>
            </div>

            <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>

                {/* TAB: MEETINGS */}
                {tab === 'meetings' && (
                    <div>
                        {/* Nieuwe meeting */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <div style={{ width: 3, height: 16, background: '#F5850A', borderRadius: 2 }} />
                                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Nieuwe toolbox meeting aanmaken</h2>
                            </div>
                            <form onSubmit={maakMeeting}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginBottom: 12 }}>
                                    <input value={nwTitel} onChange={e => setNwTitel(e.target.value)} placeholder="Titel van de meeting *" required style={inputSt} />
                                    <input type="date" value={nwDatum} onChange={e => setNwDatum(e.target.value)} required style={inputSt} />
                                </div>
                                <textarea value={nwBeschrijving} onChange={e => setNwBeschrijving(e.target.value)} placeholder="Beschrijving / agenda (optioneel)" rows={3} style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
                                <button type="submit" disabled={nwLaden} style={{ padding: '10px 22px', background: nwLaden ? '#fdba74' : '#F5850A', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.9rem', cursor: nwLaden ? 'not-allowed' : 'pointer' }}>
                                    {nwLaden ? 'Opslaan…' : '+ Meeting aanmaken'}
                                </button>
                            </form>
                        </div>

                        {/* Meetings lijst */}
                        {meetings.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 36, background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>Nog geen meetings aangemaakt.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {meetings.map(m => {
                                    const bestanden = bestandenCache[m.id] || [];
                                    const isOpen = openMeetingId === m.id;
                                    return (
                                        <div key={m.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                                            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => openMeeting(m.id)}>
                                                <div style={{ background: '#FFF3E0', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span>📋</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{m.titel}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{formatDatum(m.datum)} · {m.aantalBestanden} bestand{m.aantalBestanden !== 1 ? 'en' : ''}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <button onClick={(e) => { e.stopPropagation(); verwijderMeeting(m.id); }} style={{ padding: '5px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer' }}>Verwijder</button>
                                                    <span style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                                                </div>
                                            </div>

                                            {isOpen && (
                                                <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 18px 18px' }}>
                                                    {m.beschrijving && <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{m.beschrijving}</p>}

                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Bestanden</div>
                                                    {bestanden.length > 0 && (
                                                        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {bestanden.map(b => (
                                                                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 9, border: '1px solid #e2e8f0' }}>
                                                                    <span>{icoon(b.mime_type)}</span>
                                                                    <a href={`/api/toolbox/bestand/${b.id}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: '#1e293b', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>{b.originele_naam}</a>
                                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatGrootte(b.grootte)}</span>
                                                                    <button onClick={() => verwijderBestand(b.id, m.id)} style={{ padding: '3px 8px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Upload zone */}
                                                    <div
                                                        onClick={() => uploadRef.current[m.id]?.click()}
                                                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#F5850A'; e.currentTarget.style.background = '#FFF3E0'; }}
                                                        onDragLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                                                        onDrop={async (e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; const files = Array.from(e.dataTransfer.files); for (const f of files) await uploadBestand(m.id, f); }}
                                                        style={{ border: '2px dashed #e2e8f0', borderRadius: 10, padding: '14px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.15s' }}>
                                                        {uploading[m.id]
                                                            ? <span style={{ color: '#F5850A', fontSize: '0.85rem' }}>Uploaden…</span>
                                                            : <><span style={{ fontSize: '1.3rem' }}>📁</span><div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Bestand uploaden — sleep hier of klik</div></>}
                                                    </div>
                                                    <input type="file" multiple ref={el => uploadRef.current[m.id] = el} style={{ display: 'none' }} onChange={async (e) => { for (const f of Array.from(e.target.files)) await uploadBestand(m.id, f); e.target.value = ''; }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: WIE HEEFT GELEZEN */}
                {tab === 'lezers' && (
                    <div>
                        {meetings.length === 0 ? (
                            <div style={{ color: '#94a3b8', textAlign: 'center', padding: 36, background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>Geen meetings.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {meetings.map(m => {
                                    const isOpen = openMeetingId === m.id;
                                    const bev = bevestigingen[m.id];
                                    const aantalGelezen = bev?.gelezen?.length ?? 0;
                                    const aantalNog = bev?.nogNietGelezen?.length ?? 0;
                                    return (
                                        <div key={m.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                                            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }} onClick={() => { const n = openMeetingId === m.id ? null : m.id; setOpenMeetingId(n); if (n) laadBevestigingen(n); }}>
                                                <div style={{ background: '#FFF3E0', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span>👁️</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{m.titel}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        <span>{formatDatum(m.datum)}</span>
                                                        {bev && <>
                                                            <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {aantalGelezen} gelezen</span>
                                                            {aantalNog > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>✗ {aantalNog} nog niet</span>}
                                                        </>}
                                                    </div>
                                                </div>
                                                <span style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                                            </div>
                                            {isOpen && (
                                                <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 18px 18px' }}>
                                                    {!bev ? (
                                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Laden…</div>
                                                    ) : (
                                                        <>
                                                            {bev.gelezen?.length > 0 && (
                                                                <div style={{ marginBottom: 16 }}>
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>✓ Gelezen ({bev.gelezen.length})</div>
                                                                    {bev.gelezen.map(u => (
                                                                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginBottom: 5, border: '1px solid #bbf7d0' }}>
                                                                            <span style={{ fontWeight: 600, color: '#15803d', fontSize: '0.9rem' }}>{u.naam}</span>
                                                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{formatTijd(u.gelezen_op)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {bev.nogNietGelezen?.length > 0 && (
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>✗ Nog niet gelezen ({bev.nogNietGelezen.length})</div>
                                                                    {bev.nogNietGelezen.map(u => (
                                                                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, marginBottom: 5, border: '1px solid #fecaca' }}>
                                                                            <span style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.9rem' }}>{u.naam}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {bev.gelezen?.length === 0 && bev.nogNietGelezen?.length === 0 && (
                                                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nog niemand heeft deze meeting gelezen.</div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: MEDEWERKERS */}
                {tab === 'medewerkers' && (
                    <div>
                        {/* Nieuw gebruiker */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <div style={{ width: 3, height: 16, background: '#F5850A', borderRadius: 2 }} />
                                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Medewerker toevoegen</h2>
                            </div>
                            <form onSubmit={maakUser}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                    <input value={nwNaam} onChange={e => setNwNaam(e.target.value)} placeholder="Naam *" required style={inputSt} />
                                    <input value={nwEmail} onChange={e => setNwEmail(e.target.value)} placeholder="E-mail (optioneel)" type="email" style={inputSt} />
                                    <input value={nwWw} onChange={e => setNwWw(e.target.value)} placeholder="Wachtwoord *" type="text" required style={inputSt} />
                                    <select value={nwRol} onChange={e => setNwRol(e.target.value)} style={{ ...inputSt, background: '#fff' }}>
                                        <option value="medewerker">Medewerker</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={nwULaden} style={{ padding: '10px 22px', background: nwULaden ? '#fdba74' : '#F5850A', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.9rem', cursor: nwULaden ? 'not-allowed' : 'pointer' }}>
                                    {nwULaden ? 'Opslaan…' : '+ Toevoegen'}
                                </button>
                            </form>
                        </div>

                        {/* Gebruikerslijst */}
                        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 3, height: 16, background: '#F5850A', borderRadius: 2 }} />
                                Gebruikers ({users.length})
                            </div>
                            {users.length === 0 ? (
                                <div style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>Geen gebruikers.</div>
                            ) : (
                                users.map((u, i) => (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: i < users.length - 1 ? '1px solid #f8fafc' : 'none', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.rol === 'admin' ? '#FFF3E0' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: u.rol === 'admin' ? '#F5850A' : '#64748b', fontSize: '0.9rem', flexShrink: 0 }}>
                                            {u.naam[0].toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{u.naam}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {u.email || 'Geen e-mail'} · <span style={{ color: u.rol === 'admin' ? '#F5850A' : '#64748b', fontWeight: 600 }}>{u.rol}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => resetWachtwoord(u.id, u.naam)} style={{ padding: '5px 10px', background: '#FFF3E0', color: '#F5850A', border: 'none', borderRadius: 7, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>Ww reset</button>
                                            {u.naam !== user.naam && <button onClick={() => verwijderUser(u.id, u.naam)} style={{ padding: '5px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 7, fontSize: '0.78rem', cursor: 'pointer' }}>Verwijder</button>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
