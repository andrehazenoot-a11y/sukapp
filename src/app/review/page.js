'use client';
import { useState, useEffect } from 'react';

export default function ReviewPage() {
    const [data, setData] = useState(null);
    const [opmerking, setOpmerking] = useState('');
    const [beslissing, setBeslissing] = useState(null); // 'goed' | 'af'
    const [verstuurd, setVerstuurd] = useState(false);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const d = params.get('d');
            if (d) {
                const decoded = JSON.parse(decodeURIComponent(escape(atob(d))));
                setData(decoded);
            }
        } catch (e) {
            console.error('Ongeldige review-link', e);
        }
    }, []);

    const stuurReactie = (keuze) => {
        setBeslissing(keuze);
        const emoji = keuze === 'goed' ? '✅' : '❌';
        const label = keuze === 'goed' ? 'GOEDGEKEURD' : 'AFGEKEURD';
        const msg = encodeURIComponent(
            `${emoji} Contract *${data?.cn}* is ${label}\n` +
            `👷 ZZP: ${data?.naam}\n` +
            `🏗️ Project: ${data?.project}\n` +
            (opmerking ? `\n💬 Opmerking: ${opmerking}` : '\n(Geen opmerkingen)')
        );
        window.open(`https://wa.me/?text=${msg}`, '_blank');
        setVerstuurd(true);
    };

    const font = "'Segoe UI', Arial, sans-serif";

    if (!data) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: font }}>
            <div style={{ textAlign: 'center', color: '#64748b' }}>
                <i className="fa-solid fa-link-slash" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
                <p style={{ fontWeight: 600 }}>Ongeldige of verlopen review-link.</p>
            </div>
        </div>
    );

    return (
        <>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: font, padding: '24px 16px' }}>
                {/* Header */}
                <div style={{ maxWidth: '520px', margin: '0 auto 20px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px 20px', borderRadius: '40px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#F5850A' }}>DS</span>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2c3b4e' }}>Schilders – Contract Review</span>
                    </div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>
                        Concept contract beoordelen
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                        Controleer de onderstaande gegevens en geef jouw beoordeling
                    </p>
                </div>

                {/* Contract kaart */}
                <div style={{ maxWidth: '520px', margin: '0 auto 20px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #F5850A, #d97706)', padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: '2px' }}>CONCEPT CONTRACT</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{data.cn}</div>
                    </div>
                    <div style={{ padding: '20px' }}>
                        {[
                            { icon: 'fa-user-hard-hat', label: 'ZZP / Onderaannemer', value: data.naam },
                            { icon: 'fa-building', label: 'Project', value: data.project },
                            { icon: 'fa-calendar-days', label: 'Looptijd', value: `${data.start} t/m ${data.eind}` },
                            { icon: 'fa-euro-sign', label: 'Aanneemsom', value: `€ ${Number(data.totaal || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW` },
                            { icon: 'fa-clock', label: 'Totaal uren', value: `${data.uren} uur` },
                        ].map(({ icon, label, value }) => (
                            <div key={label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className={`fa-solid ${icon}`} style={{ fontSize: '0.75rem', color: '#64748b' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginBottom: '1px' }}>{label}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Beoordeling */}
                {!verstuurd ? (
                    <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '20px' }}>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
                            <i className="fa-solid fa-comment-dots" style={{ color: '#F5850A', marginRight: '8px' }}></i>
                            Jouw beoordeling
                        </h2>
                        <textarea
                            placeholder="Optionele opmerking... (bijv. 'Startdatum klopt niet' of 'Ziet er goed uit!')"
                            value={opmerking}
                            onChange={e => setOpmerking(e.target.value)}
                            rows={3}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontFamily: font, resize: 'vertical', outline: 'none', marginBottom: '14px', color: '#1e293b' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                onClick={() => stuurReactie('goed')}
                                style={{ padding: '14px', borderRadius: '10px', border: '2px solid #16a34a', background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <i className="fa-solid fa-circle-check" style={{ fontSize: '1.1rem' }}></i>
                                Goedgekeurd
                            </button>
                            <button
                                onClick={() => stuurReactie('af')}
                                style={{ padding: '14px', borderRadius: '10px', border: '2px solid #dc2626', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <i className="fa-solid fa-circle-xmark" style={{ fontSize: '1.1rem' }}></i>
                                Afgekeurd
                            </button>
                        </div>
                        <p style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
                            <i className="fa-brands fa-whatsapp" style={{ marginRight: '4px' }}></i>
                            Jouw reactie wordt via WhatsApp teruggestuurd
                        </p>
                    </div>
                ) : (
                    <div style={{ maxWidth: '520px', margin: '0 auto', background: beslissing === 'goed' ? '#f0fdf4' : '#fef2f2', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', border: `2px solid ${beslissing === 'goed' ? '#16a34a' : '#dc2626'}` }}>
                        <i className={`fa-solid ${beslissing === 'goed' ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ fontSize: '2.5rem', color: beslissing === 'goed' ? '#16a34a' : '#dc2626', marginBottom: '12px', display: 'block' }}></i>
                        <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: beslissing === 'goed' ? '#15803d' : '#dc2626', margin: '0 0 8px' }}>
                            {beslissing === 'goed' ? 'Goedgekeurd ✅' : 'Afgekeurd ❌'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
                            Je reactie is via WhatsApp verstuurd naar de opdrachtgever.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
