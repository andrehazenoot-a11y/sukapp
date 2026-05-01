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

    if (!user) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ color: '#64748b' }}>Laden…</div>
        </div>
    );

    const nieuweMeetings = meetings.filter(m => !m.akkoordGegeven);
    const gedaanMeetings = meetings.filter(m => m.akkoordGegeven);

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
            {/* Header */}
            <div style={{ background: '#1e293b', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ background: '#F5850A', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 16 }}>🔧</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Toolbox Meetings</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Hallo, <strong style={{ color: '#fff' }}>{user.naam}</strong></span>
                    <button onClick={uitloggen} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', color: '#cbd5e1' }}>Uitloggen</button>
                </div>
            </div>

            {/* Badge balk */}
            {nieuweMeetings.length > 0 && (
                <div style={{ background: '#F5850A', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#fff', color: '#F5850A', borderRadius: 20, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 800 }}>{nieuweMeetings.length}</span>
                    <span style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600 }}>nieuwe meeting{nieuweMeetings.length !== 1 ? 's' : ''} om te bekijken</span>
                </div>
            )}

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
                {laden ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>Meetings laden…</div>
                ) : meetings.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48, background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <div style={{ fontWeight: 700, color: '#475569', fontSize: '1rem' }}>Nog geen toolbox meetings</div>
                        <div style={{ fontSize: '0.85rem', marginTop: 6, color: '#94a3b8' }}>Je ontvangt hier een melding als er een nieuwe meeting klaarstaat.</div>
                    </div>
                ) : (
                    <>
                        {nieuweMeetings.length > 0 && (
                            <div style={{ marginBottom: 28 }}>
                                <h2 style={{ margin: '0 0 14px', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 3, height: 16, background: '#ef4444', borderRadius: 2 }} />
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
                                <h2 style={{ margin: '0 0 14px', fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 3, height: 16, background: '#22c55e', borderRadius: 2 }} />
                                    Afgerond ({gedaanMeetings.length})
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

    const borderColor = meeting.akkoordGegeven ? '#bbf7d0' : '#fed7aa';

    return (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `2px solid ${borderColor}`, overflow: 'hidden' }}>
            {/* Kop */}
            <div onClick={toggle} style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: meeting.akkoordGegeven ? '#f0fdf4' : '#FFF3E0', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.1rem' }}>{meeting.akkoordGegeven ? '✓' : '🔧'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{meeting.titel}</span>
                        {meeting.akkoordGegeven && <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>✓ Akkoord</span>}
                        {!meeting.akkoordGegeven && <span style={{ background: '#FFF3E0', color: '#F5850A', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>Actie vereist</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                        {formatDatum(meeting.datum)} · {meeting.aantalBestanden} {meeting.aantalBestanden === 1 ? 'bestand' : 'bestanden'}
                    </div>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
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
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Bestanden</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {bestanden.map(b => (
                                    <a key={b.id} href={`/api/toolbox/bestand/${b.id}`} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, textDecoration: 'none', border: '1px solid #e2e8f0', color: '#1e293b', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                                        <span style={{ fontSize: '1.3rem' }}>{bestandIcoon(b.mime_type)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.originele_naam}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatGrootte(b.grootte)}</div>
                                        </div>
                                        <span style={{ color: '#F5850A', fontSize: '0.8rem', fontWeight: 600 }}>Openen →</span>
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
                            style={{ width: '100%', padding: '13px', background: bezig ? '#fdba74' : '#F5850A', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, cursor: bezig ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                            {bezig ? 'Opslaan…' : '✓ Gelezen & Akkoord'}
                        </button>
                    )}
                    {meeting.akkoordGegeven && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', padding: '8px 0' }}>
                            <span>✓</span>
                            <span>Jij hebt deze meeting bevestigd</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
