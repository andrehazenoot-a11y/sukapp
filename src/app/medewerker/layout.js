'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

const NAV = [
    { label: 'Vandaag',    icon: 'fa-house',          path: '/medewerker' },
    { label: 'Planning',   icon: 'fa-calendar-days',  path: '/medewerker/planning' },
    { label: 'Projectstatus', icon: 'fa-chart-line',  path: '/medewerker/status' },
    { label: 'Project informatie', icon: 'fa-folder-tree',  path: '/medewerker/werkbon' },
    { label: 'Chat',       icon: 'fa-comments',       path: '/medewerker/chat' },
    { label: 'Materiaalbot', icon: 'fa-box-open',      path: '/medewerker/materiaal' },
    { label: 'Bestellijst', icon: 'fa-cart-shopping',  path: '/medewerker/bestellijst' },
    { label: 'Toolbox bestanden', icon: 'fa-toolbox', path: '/medewerker/mijn-suk' },
    { label: 'Bouwinspectie', icon: 'fa-hard-hat',      path: '/medewerker/bouwinspectie' },
    { label: 'Verlof',     icon: 'fa-umbrella-beach', path: '/medewerker/verlof' },
    { label: 'Formulieren',      icon: 'fa-folder-open',   path: '/medewerker/formulieren' },
    { label: 'Uren',             icon: 'fa-gauge-high',    path: '/medewerker/uren' },
];

export default function MedewerkerLayout({ children }) {
    const pathname = usePathname();
    const router   = useRouter();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);

    // Sluit drawer bij navigatie
    useEffect(() => { setOpen(false); }, [pathname]);

    if (!user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-lock" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }} />
                    <p>Niet ingelogd. <a href="/" style={{ color: '#F5850A' }}>Login</a></p>
                </div>
            </div>
        );
    }

    const isActive = (path) =>
        path === '/medewerker' ? pathname === '/medewerker' : pathname.startsWith(path);

    return (
        <div style={{ height: '100dvh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', maxWidth: '480px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <header style={{
                background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)',
                padding: '0 16px',
                height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 12px rgba(245,133,10,0.3)',
                flexShrink: 0, zIndex: 10, position: 'relative',
            }}>
                {/* Hamburger */}
                <button onClick={() => setOpen(true)} style={{
                    background: 'rgba(255,255,255,0.18)', border: 'none',
                    borderRadius: 9, width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: '1rem',
                }}>
                    <i className="fa-solid fa-bars" />
                </button>

                {/* Logo + naam */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                    <img src="/ds-logo-rond-nieuw.png" alt="Logo" style={{ height: 30, borderRadius: '50%' }} />
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>Medewerker</span>
                </div>

                {/* Beheer */}
                <button onClick={() => router.push('/')} style={{
                    background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '6px 11px',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                }}>
                    <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.9rem' }} />Beheer
                </button>
            </header>

            {/* ── Content ── */}
            <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {children}
            </main>

            {/* ── Backdrop ── */}
            {open && (
                <div onClick={() => setOpen(false)} style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                }} />
            )}

            {/* ── Slide-out drawer ── */}
            <div style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: 260, zIndex: 210,
                background: '#0f172a',
                transform: open ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
                display: 'flex', flexDirection: 'column',
                boxShadow: open ? '4px 0 32px rgba(0,0,0,0.4)' : 'none',
            }}>
                {/* Drawer header */}
                <div style={{
                    background: '#F5850A',
                    padding: '16px 16px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/ds-logo-rond-nieuw.png" alt="Logo" style={{ height: 38, borderRadius: '50%', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.25))' }} />
                        <div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.88rem' }}>{user.name}</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{user.role}</div>
                        </div>
                    </div>
                    <button onClick={() => setOpen(false)} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none',
                        borderRadius: 7, width: 30, height: 30, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '0.85rem',
                    }}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
                    {NAV.map(item => {
                        const active = isActive(item.path);
                        return (
                            <button key={item.path}
                                onClick={() => router.push(item.path)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '12px 18px',
                                    background: active ? 'rgba(245,133,10,0.14)' : 'transparent',
                                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                                    borderLeft: active ? '3px solid #F5850A' : '3px solid transparent',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                }}
                                onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{
                                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                    background: active ? 'rgba(245,133,10,0.2)' : 'rgba(255,255,255,0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className={`fa-solid ${item.icon}`} style={{
                                        color: active ? '#F5850A' : 'rgba(255,255,255,0.45)',
                                        fontSize: '0.85rem',
                                    }} />
                                </div>
                                <span style={{
                                    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                                    fontSize: '0.88rem', fontWeight: active ? 700 : 500,
                                }}>{item.label}</span>
                                {active && <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', color: '#F5850A', fontSize: '0.9rem' }} />}
                            </button>
                        );
                    })}
                </nav>

                {/* Uitloggen */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 0' }}>
                    <button onClick={() => { logout(); router.push('/'); }} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 18px', background: 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: 'rgba(239,68,68,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <i className="fa-solid fa-right-from-bracket" style={{ color: '#ef4444', fontSize: '0.85rem' }} />
                        </div>
                        <span style={{ color: '#ef4444', fontSize: '0.88rem', fontWeight: 500 }}>Uitloggen</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
