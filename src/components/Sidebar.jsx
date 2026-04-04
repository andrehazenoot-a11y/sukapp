'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, ALL_PAGES } from './AuthContext';
import { useLanguage } from './LanguageContext';

export default function Sidebar({ user, onLogout }) {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [topLangOpen, setTopLangOpen] = useState(false);
    const [ongelezen, setOngelezen] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [alleMeldingen, setAlleMeldingen] = useState([]);
    const notifRef = useRef(null);
    const moreRef = useRef(null);
    const langRef = useRef(null);

    useEffect(() => {
        const laadOngelezen = () => {
            try {
                const meldingen = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                const naam = user?.name || '';
                const count = meldingen.filter(m => m.aan === naam && !m.gelezen).length;
                setOngelezen(count);
            } catch {}
        };
        laadOngelezen();
        const interval = setInterval(laadOngelezen, 5000);
        return () => clearInterval(interval);
    }, [user?.name]);

    const { hasAccess } = useAuth();
    const { t, language, setLanguage, languages } = useLanguage();
    const currentLang = languages.find(l => l.code === language);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 1200); // 1200px threshold for desktop so we don't squish elements
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
            if (langRef.current && !langRef.current.contains(event.target)) setTopLangOpen(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navKeyMap = {
        'dashboard': 'nav.dashboard',
        'uren': 'nav.hours',
        'verlof': 'nav.verlof',
        'materieel': 'nav.materials',
        'verfvoorraad': 'nav.verfvoorraad',
        'projecten': 'nav.projects',
        'zzp': 'nav.zzp',
        'whatsapp': 'WhatsApp Business'
    };

    const navItems = ALL_PAGES.filter(page => hasAccess(page.id)).map(page => ({
        name: navKeyMap[page.id] ? t(navKeyMap[page.id]) : page.name,
        path: page.path, 
        icon: page.icon
    }));

    if (user?.role === 'Beheerder') {
        navItems.push({ name: t('sidebar.accessControl'), path: '/toegang', icon: 'fa-shield-halved' });
    }


    const maxVisible = isMobile ? 0 : 5; 
    const visibleItems = navItems.slice(0, maxVisible);
    const moreItems = navItems.slice(maxVisible);

    return (
        <header className="global-topnav" style={{
            background: 'linear-gradient(90deg, #F5850A 0%, #E07000 100%)',
            boxShadow: '0 2px 16px rgba(245, 133, 10, 0.25)',
            display: 'flex',
            alignItems: 'center',
            height: '64px',
            padding: '0 24px',
            position: 'relative',
            zIndex: 100,
            flexShrink: 0
        }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '32px' }}>
                <img src="/ds-logo-rond-nieuw.png" alt="De Schilders uit Katwijk" style={{ height: '44px', width: 'auto', backgroundColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>

            {/* Nav Items (Desktop) */}
            {!isMobile && (
                <nav style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                    {visibleItems.map(item => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.path} href={item.path} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px',
                                textDecoration: 'none', color: '#fff',
                                background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.9rem',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            onMouseOut={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                            >
                                <i className={`fa-solid ${item.icon}`}></i>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}

                    {moreItems.length > 0 && (
                        <div ref={moreRef} style={{ position: 'relative' }}>
                            <button onClick={() => setMoreOpen(!moreOpen)} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px',
                                border: 'none', background: moreOpen ? 'rgba(255,255,255,0.2)' : 'transparent',
                                color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => !moreOpen && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            onMouseOut={e => !moreOpen && (e.currentTarget.style.background = 'transparent')}
                            >
                                <i className="fa-solid fa-ellipsis"></i>
                                <span>Meer</span>
                                <i className={`fa-solid fa-chevron-${moreOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
                            </button>
                            {moreOpen && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                                    background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    padding: '8px', minWidth: '220px', zIndex: 101, display: 'flex', flexDirection: 'column'
                                }}>
                                    {moreItems.map(item => {
                                        const isActive = pathname === item.path;
                                        return (
                                            <Link key={item.path} href={item.path} onClick={() => setMoreOpen(false)} style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '10px 12px', borderRadius: '6px',
                                                textDecoration: 'none',
                                                color: isActive ? '#F5850A' : '#4A5568',
                                                background: isActive ? 'rgba(245,133,10,0.06)' : 'transparent',
                                                fontWeight: isActive ? 600 : 500,
                                                fontSize: '0.9rem'
                                            }}
                                            onMouseOver={e => !isActive && (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                                            onMouseOut={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <i className={`fa-solid ${item.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </nav>
            )}

            {/* Mobile Hamburger toggle */}
            {isMobile && (
                <div style={{ flex: 1, display: 'flex' }}>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px',
                        width: '40px', height: '40px', color: '#fff', fontSize: '1.2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}>
                        <i className="fa-solid fa-bars"></i>
                    </button>
                </div>
            )}

            {/* Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
                {/* Medewerker Portaal knop */}
                <Link href="/medewerker" style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 13px', borderRadius: '8px', textDecoration: 'none',
                    background: pathname.startsWith('/medewerker') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: '0.82rem', fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = pathname.startsWith('/medewerker') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}
                >
                    <i className="fa-solid fa-mobile-screen-button"></i>
                    {!isMobile && <span>Medewerker</span>}
                </Link>
                <div ref={langRef} style={{ position: 'relative' }}>
                    <button onClick={() => setTopLangOpen(!topLangOpen)} style={{
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                        padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem',
                        display: 'flex', alignItems: 'center', gap: '8px', color: '#fff',
                        fontWeight: 500, transition: 'all 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                        <img src={currentLang?.flag} alt="" style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />
                        {!isMobile && <span>{currentLang?.name}</span>}
                        <i className={`fa-solid fa-chevron-${topLangOpen ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', marginLeft: '2px' }}></i>
                    </button>
                    {topLangOpen && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                            background: '#fff', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px',
                            zIndex: 102, minWidth: '140px'
                        }}>
                            {languages.map(lang => (
                                <button key={lang.code} onClick={() => { setLanguage(lang.code); setTopLangOpen(false); }} style={{
                                    width: '100%', padding: '8px 10px', borderRadius: '6px',
                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                                    background: language === lang.code ? 'rgba(245,133,10,0.1)' : 'transparent',
                                    color: language === lang.code ? '#F5850A' : '#4A5568', fontWeight: language === lang.code ? 600 : 400
                                }}
                                onMouseOver={e => { if (language !== lang.code) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                                onMouseOut={e => { if (language !== lang.code) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <img src={lang.flag} alt="" style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />
                                    <span>{lang.name}</span>
                                    {language === lang.code && <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}></i>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#fff', color: '#F5850A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem'
                        }}>{user?.initials || 'JM'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.name || 'Jan Modaal'}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{user?.role || 'Beheerder'}</span>
                        </div>
                    </div>
                )}

                <button style={{
                    background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem',
                    cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '8px'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                    <i className="fa-regular fa-bell"></i>
                    {ongelezen > 0 && (
                        <span style={{
                            position: 'absolute', top: '2px', right: '2px', background: '#EF4444', color: '#fff',
                            fontSize: '0.55rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #F5850A'
                        }}>{ongelezen > 9 ? '9+' : ongelezen}</span>
                    )}
                </button>

                {onLogout && (
                    <button onClick={onLogout} title={t('sidebar.logout')} style={{
                        background: 'transparent', border: 'none', color: '#fff', fontSize: '1.1rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '36px', height: '36px', borderRadius: '8px', opacity: 0.9
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.opacity = 1; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.9; }}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </button>
                )}
            </div>

            {/* Mobile Sidebar Overlay Menu */}
            {isMobile && mobileMenuOpen && (
                <>
                    <div onClick={() => setMobileMenuOpen(false)} style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(3px)'
                    }} />
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#fff', zIndex: 1001,
                        boxShadow: '4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '50%', background: '#fff', color: '#F5850A',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem'
                                }}>{user?.initials || 'JM'}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{user?.name || 'Jan Modaal'}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{user?.role || 'Beheerder'}</div>
                                </div>
                            </div>
                        </div>
                        <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
                            {navItems.map(item => {
                                const isActive = pathname === item.path;
                                return (
                                    <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px',
                                        textDecoration: 'none', color: isActive ? '#F5850A' : '#4A5568', background: isActive ? 'rgba(245,133,10,0.08)' : 'transparent',
                                        fontWeight: isActive ? 600 : 500, fontSize: '0.95rem', marginBottom: '4px'
                                    }}>
                                        <i className={`fa-solid ${item.icon}`} style={{ width: '24px', textAlign: 'center', fontSize: '1.1rem' }}></i>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <button onClick={() => { onLogout?.(); setMobileMenuOpen(false); }} style={{
                                width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                                <i className="fa-solid fa-right-from-bracket"></i>
                                {t('sidebar.logout')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}
