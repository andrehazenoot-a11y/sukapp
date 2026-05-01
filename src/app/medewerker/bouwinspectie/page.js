'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BouwinspectiePage() {
    const router = useRouter();
    const [projecten, setProjecten] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/projecten')
            .then(r => r.json())
            .then(data => { setProjecten(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f5f9' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '18px 20px 16px' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>Bouwinspectie</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>{projecten.length} project{projecten.length !== 1 ? 'en' : ''}</div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px', flex: 1 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                        Laden…
                    </div>
                ) : projecten.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                        <i className="fa-solid fa-hard-hat" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px', color: '#64748b' }}>Geen projecten gevonden</div>
                        <div style={{ fontSize: '0.8rem' }}>Projecten worden aangemaakt via het beheerderspaneel</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {projecten.map(p => (
                            <div key={p.id} onClick={() => { sessionStorage.setItem(`bi_project_${p.id}`, JSON.stringify(p)); router.push(`/medewerker/bouwinspectie/${p.id}`); }}
                                style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="fa-solid fa-hard-hat" style={{ color: '#F5850A', fontSize: '1.1rem' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.naam}</div>
                                    {p.adres && (
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <i className="fa-solid fa-location-dot" style={{ marginRight: '4px', fontSize: '0.65rem' }} />{p.adres}
                                        </div>
                                    )}
                                    {p.opdrachtgever && (
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <i className="fa-solid fa-building" style={{ marginRight: '4px', fontSize: '0.65rem' }} />{p.opdrachtgever}
                                        </div>
                                    )}
                                </div>
                                <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.75rem', flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
