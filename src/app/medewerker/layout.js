'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';

const NAV = [
    { label: 'Vandaag',   icon: 'fa-house',         path: '/medewerker' },
    { label: 'Planning',  icon: 'fa-calendar-days', path: '/medewerker/planning' },
    { label: 'Materiaal', icon: 'fa-box-open',      path: '/medewerker/materiaal' },
    { label: 'Project',   icon: 'fa-folder-open',  path: '/medewerker/werkbon' },
    { label: 'Werkbon',   icon: 'fa-file-pen',     path: '/medewerker/werkbonnen' },
    { label: 'Meer',      icon: 'fa-bars',          path: null },
];

export default function MedewerkerLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [meerOpen, setMeerOpen] = useState(false);

    if (!user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-lock" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }} />
                    <p>Je bent niet ingelogd. <a href="/" style={{ color: '#F5850A' }}>Ga naar login</a></p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
            {/* Top header */}
            <header style={{
                background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)',
                padding: '12px 20px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(245,133,10,0.35)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '12px', padding: '4px', display: 'flex' }}>
                        <img src="/ds-logo-rond-nieuw.png" alt="Logo" style={{ height: '34px', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))' }} />
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                            Medewerker Portaal
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', fontWeight: 500, marginTop: '1px' }}>
                            {user.name} · {user.role}
                        </div>
                    </div>
                </div>
                <Link href="/" style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.7rem' }} />Beheer
                </Link>
            </header>

            {/* Page content */}
            <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                {children}
            </main>

            {/* Bottom nav */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: '480px',
                background: '#fff',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                boxShadow: '0 -6px 24px rgba(0,0,0,0.09)',
                zIndex: 200,
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
                {NAV.map(item => {
                    const isActive = item.path
                        ? (item.path === '/medewerker' ? pathname === '/medewerker' : pathname.startsWith(item.path))
                        : meerOpen;
                    return (
                        <button
                            key={item.label}
                            onClick={() => {
                                if (item.path) { setMeerOpen(false); router.push(item.path); }
                                else setMeerOpen(v => !v);
                            }}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', gap: '4px', padding: '10px 0 8px',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: isActive ? '#F5850A' : '#94a3b8',
                                transition: 'color 0.15s',
                                position: 'relative',
                            }}
                        >
                            <div style={{
                                width: '42px', height: '30px', borderRadius: '15px',
                                background: isActive ? 'rgba(245,133,10,0.12)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.2s',
                            }}>
                                <i className={`fa-solid ${item.icon}`} style={{ fontSize: '1.05rem' }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, letterSpacing: isActive ? '0.01em' : 0 }}>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Meer sheet */}
            {meerOpen && (
                <>
                    <div onClick={() => setMeerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.3)' }} />
                    <div style={{
                        position: 'fixed', bottom: '72px', left: '50%', transform: 'translateX(-50%)',
                        width: '100%', maxWidth: '480px', background: '#fff',
                        borderRadius: '20px 20px 0 0', padding: '8px 0 20px',
                        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', zIndex: 195,
                    }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '8px auto 16px' }} />
                        {[
                            { icon: 'fa-file-alt', label: 'Werkbon', path: '/medewerker/werkbon' },
                            { icon: 'fa-folder-open', label: 'Formulieren & Documenten', path: '/medewerker/formulieren' },
                            { icon: 'fa-user', label: 'Mijn profiel', path: '/profiel' },
                        ].map(item => (
                            <button key={item.path} onClick={() => { setMeerOpen(false); router.push(item.path); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b', textAlign: 'left' }}
                                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={e => e.currentTarget.style.background = 'none'}
                            >
                                <i className={`fa-solid ${item.icon}`} style={{ width: '20px', color: '#F5850A', fontSize: '1rem' }} />
                                {item.label}
                            </button>
                        ))}
                        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />
                        <button onClick={() => { setMeerOpen(false); logout(); router.push('/'); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', color: '#ef4444', textAlign: 'left' }}
                        >
                            <i className="fa-solid fa-right-from-bracket" style={{ width: '20px', fontSize: '1rem' }} />
                            Uitloggen
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
