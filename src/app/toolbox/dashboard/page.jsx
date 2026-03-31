'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ICOON = { 'application/pdf': '📄', 'image/jpeg': '🖼️', 'image/png': '🖼️', 'image/gif': '🖼️', 'video/mp4': '🎬', 'video/quicktime': '🎬', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝', 'application/msword': '📝', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊', 'application/vnd.ms-excel': '📊' };
const bestandIcoon = (mime) => ICOON[mime] || '📎';

export default function ToolboxDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [meetings, setMeetings] = useState([]);
    const [openId, setOpenId] = useState(null);
    const [laden, setLaden] = useState(true);
    const [bezig, setBezig] = useState({});

    useEffect(() => {
        fetch('/api/toolbox/auth').then(r => {
            if (!r.ok) { router.replace('/toolbox'); return null; }
            return r.json();
        }).then(d => { if (d) { setUser(d); if (d.rol === 'admin') router.replace('/toolbox/admin'); } });
    }, []);

    useEffect(() => {
        if (!user) return;
        laadMeetings();
    }, [user]);

    const laadMeetings = () => {
        setLaden(true);
        fetch('/api/toolbox/meetings').then(r => r.json()).then(d => { setMeetings(Array.isArray(d) ? d : []); setLaden(false); }).catch(() => setLaden(false));
    };

    const uitloggen = async () => {
        await fetch('/api/toolbox/auth', { method: 'DELETE' });
        router.replace('/toolbox');
    };

    const geefAkkoord = async (meetingId) => {
        setBezig(p => ({ ...p, [meetingId]: true }));
        await fetch(`/api/toolbox/meetings/${meetingId}/akkoord`, { method: 'POST' });
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, akkoordGegeven: true } : m));
        setBezig(p => ({ ...p, [meetingId]: false }));
    };

    const formatDatum = (d) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatGrootte = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

    if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}><div style={{ color: '#64748b' }}>Laden…</div></div>;

    const nieuweMeetings = meetings.filter(m => !m.akkoordGegeven);
    const gedaanMeetings = meetings.filter(m => m.akkoordGegeven);

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>🔧</span>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>Toolbox Meetings</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Hallo, <strong>{user.naam}</strong></span>
                    <button onClick={uitloggen} style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', color: '#475569' }}>Uitloggen</button>
                </div>
            </div>

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
                {laden ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>Meetings laden…</div>
                ) : meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                        <div style={{ fontWeight: 600, color: '#475569' }}>Nog geen toolbox meetings</div>
                        <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Je ontvangt hier een melding als er een nieuwe meeting klaarstaat.</div>
                    </div>
                ) : (
                    <>
                        {nieuweMeetings.length > 0 && (
                            <div style={{ marginBottom: 28 }}>
                                <h2 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: '0.75rem' }}>{nieuweMeetings.length}</span>
                                    Te bekijken
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {nieuweMeetings.map(m => (
                                        <MeetingKaart key={m.id} meeting={m} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} onAkkoord={() => geefAkkoord(m.id)} bezig={bezig[m.id]} formatDatum={formatDatum} formatGrootte={formatGrootte} bestandIcoon={bestandIcoon} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {gedaanMeetings.length > 0 && (
                            <div>
                                <h2 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    ✓ Afgerond ({gedaanMeetings.length})
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {gedaanMeetings.map(m => (
                                        <MeetingKaart key={m.id} meeting={m} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} onAkkoord={null} bezig={false} formatDatum={formatDatum} formatGrootte={formatGrootte} bestandIcoon={bestandIcoon} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function MeetingKaart({ meeting, open, onToggle, onAkkoord, bezig, formatDatum, formatGrootte, bestandIcoon }) {
    const [bestanden, setBestanden] = useState(null);

    const toggle = async () => {
        onToggle();
        if (!open && !bestanden) {
            const r = await fetch(`/api/toolbox/meetings/${meeting.id}`);
            const d = await r.json();
            setBestanden(d.bestanden || []);
        }
    };

    return (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: meeting.akkoordGegeven ? '2px solid #bbf7d0' : '2px solid #bfdbfe', overflow: 'hidden' }}>
            {/* Kop */}
            <div onClick={toggle} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{meeting.titel}</span>
                        {meeting.akkoordGegeven && <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>✓ Akkoord</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 3 }}>
                        {formatDatum(meeting.datum)} · {meeting.aantalBestanden} {meeting.aantalBestanden === 1 ? 'bestand' : 'bestanden'}
                    </div>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '1.1rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>

            {/* Uitklapinhoud */}
            {open && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 18px 18px' }}>
                    {meeting.beschrijving && (
                        <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{meeting.beschrijving}</p>
                    )}

                    {/* Bestanden */}
                    {bestanden === null ? (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 14 }}>Bestanden laden…</div>
                    ) : bestanden.length > 0 ? (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Bestanden</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {bestanden.map(b => (
                                    <a key={b.id} href={`/api/toolbox/bestand/${b.id}`} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, textDecoration: 'none', border: '1px solid #e2e8f0', color: '#1e293b', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                                        <span style={{ fontSize: '1.3rem' }}>{bestandIcoon(b.mime_type)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.originele_naam}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatGrootte(b.grootte)}</div>
                                        </div>
                                        <span style={{ color: '#3b82f6', fontSize: '0.8rem' }}>Openen →</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 14 }}>Geen bestanden bijgevoegd.</div>
                    )}

                    {/* Akkoord knop */}
                    {onAkkoord && !meeting.akkoordGegeven && (
                        <button onClick={onAkkoord} disabled={bezig}
                            style={{ width: '100%', padding: '13px', background: bezig ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, cursor: bezig ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                            {bezig ? 'Opslaan…' : '✓ Gelezen & Akkoord'}
                        </button>
                    )}
                    {meeting.akkoordGegeven && (
                        <div style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', padding: '8px 0' }}>
                            ✓ Jij hebt deze meeting bevestigd
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
