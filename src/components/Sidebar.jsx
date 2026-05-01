'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, ALL_PAGES } from './AuthContext';
import { useLanguage } from './LanguageContext';

const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 220;

export default function Sidebar({ user, onLogout }) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
    });
    const [expandedItem, setExpandedItem] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [ongelezen, setOngelezen] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [topLangOpen, setTopLangOpen] = useState(false);
    const [alleMeldingen, setAlleMeldingen] = useState([]);
    const notifRef = useRef(null);
    const langRef = useRef(null);

    const { hasAccess } = useAuth();
    const { t, language, setLanguage, languages } = useLanguage();
    const currentLang = languages.find(l => l.code === language);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 1200);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        const laadOngelezen = () => {
            try {
                const meldingen = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
                setAlleMeldingen(meldingen);
                const naam = user?.name || '';
                const count = meldingen.filter(m => m.aan === naam && !m.gelezen).length;
                setOngelezen(count);
            } catch {}
        };
        laadOngelezen();
        const interval = setInterval(laadOngelezen, 5000);
        return () => clearInterval(interval);
    }, [user?.name]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (langRef.current && !langRef.current.contains(e.target)) setTopLangOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
        if (next) setExpandedItem(null);
    };

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
        ...page,
        name: navKeyMap[page.id] ? t(navKeyMap[page.id]) : page.name,
    }));

    if (user?.role === 'Beheerder') {
        navItems.push({ id: 'toegang', name: t('sidebar.accessControl'), path: '/toegang', icon: 'fa-shield-halved', subs: [] });
    }

    const isItemActive = (item) => {
        if (pathname === item.path) return true;
        if (item.path !== '/' && pathname?.startsWith(item.path?.split('?')[0])) return true;
        return false;
    };

    const handleNavClick = (item) => {
        if (!collapsed && item.subs && item.subs.length > 0) {
            setExpandedItem(prev => prev === item.id ? null : item.id);
        }
        router.push(item.path);
    };

    // ── Sidebar content (shared between desktop & mobile overlay) ──
    const sidebarContent = (isOverlay = false) => (
        <div style={{
            width: isOverlay ? EXPANDED_WIDTH : (collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH),
            height: '100%',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            transition: isOverlay ? 'none' : 'width 0.2s ease',
            overflow: 'hidden',
            flexShrink: 0,
        }}>
            {/* Logo header — oranje balk */}
            <div style={{
                background: 'transparent',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOverlay ? 'space-between' : 'center',
                    padding: isOverlay ? '16px 14px' : '0',
                    minHeight: 210,
                }}>
                    {(!collapsed || isOverlay) && (
                        <img src="/ds-logo-vierkant.png" alt="Logo" style={{
                            width: '200px', height: '200px',
                            objectFit: 'contain',
                            borderRadius: '50%',
                            filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.3))',
                            display: 'block',
                        }} />
                    )}
                    {collapsed && !isOverlay && (
                        <img src="/ds-logo-vierkant.png" alt="Logo" style={{
                            width: '36px', height: '36px',
                            objectFit: 'contain',
                            borderRadius: '50%',
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
                            display: 'block',
                        }} />
                    )}
                    {isOverlay && (
                        <button onClick={() => setMobileOpen(false)} style={{
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '7px',
                            width: '30px', height: '30px', color: '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
                            flexShrink: 0,
                        }}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    )}
                </div>
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0', scrollbarWidth: 'none' }}>
                {navItems.map(item => {
                    const active = isItemActive(item);
                    const hasSubs = item.subs && item.subs.length > 0;
                    const isExpanded = expandedItem === item.id;
                    const showExpanded = !collapsed || isOverlay;

                    return (
                        <div key={item.id}>
                            <button
                                title={collapsed && !isOverlay ? item.name : undefined}
                                onClick={() => handleNavClick(item)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    gap: '12px', padding: showExpanded ? '9px 14px 9px 16px' : '9px 0',
                                    justifyContent: showExpanded ? 'flex-start' : 'center',
                                    background: active ? 'rgba(245,133,10,0.14)' : 'transparent',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                    borderLeft: active ? '3px solid #F5850A' : '3px solid transparent',
                                    transition: 'all 0.15s',
                                    borderRadius: 0,
                                    position: 'relative',
                                }}
                                onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <i className={`fa-solid ${item.icon}`} style={{
                                    color: active ? '#F5850A' : 'rgba(255,255,255,0.55)',
                                    fontSize: '0.95rem', width: '18px', textAlign: 'center', flexShrink: 0
                                }} />
                                {showExpanded && (
                                    <>
                                        <span style={{
                                            color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                                            fontSize: '0.82rem', fontWeight: active ? 700 : 500,
                                            flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>{item.name}</span>
                                        {hasSubs && (
                                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{
                                                fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0
                                            }} />
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Sub-items accordion */}
                            {showExpanded && hasSubs && (
                                <div style={{
                                    maxHeight: isExpanded ? `${item.subs.length * 36}px` : '0',
                                    overflow: 'hidden',
                                    transition: 'max-height 0.2s ease',
                                }}>
                                    {item.subs.map(sub => (
                                        <Link key={sub.id} href={item.path} style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '7px 14px 7px 44px',
                                            textDecoration: 'none',
                                            color: 'rgba(255,255,255,0.45)',
                                            fontSize: '0.77rem', fontWeight: 500,
                                            transition: 'color 0.15s',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                                        onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                                        >
                                            <i className={`fa-solid ${sub.icon}`} style={{ fontSize: '0.7rem', width: '14px', textAlign: 'center' }} />
                                            {sub.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Medewerker portaal */}
                <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                <Link href="/medewerker"
                    title={collapsed && !isOverlay ? 'Medewerker portaal' : undefined}
                    style={{
                        display: 'flex', alignItems: 'center',
                        gap: '12px', padding: (!collapsed || isOverlay) ? '9px 14px 9px 16px' : '9px 0',
                        justifyContent: (!collapsed || isOverlay) ? 'flex-start' : 'center',
                        background: pathname?.startsWith('/medewerker') ? 'rgba(245,133,10,0.14)' : 'transparent',
                        borderLeft: pathname?.startsWith('/medewerker') ? '3px solid #F5850A' : '3px solid transparent',
                        textDecoration: 'none', transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { if (!pathname?.startsWith('/medewerker')) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseOut={e => { if (!pathname?.startsWith('/medewerker')) e.currentTarget.style.background = 'transparent'; }}
                >
                    <i className="fa-solid fa-mobile-screen-button" style={{
                        color: pathname?.startsWith('/medewerker') ? '#F5850A' : 'rgba(255,255,255,0.55)',
                        fontSize: '0.95rem', width: '18px', textAlign: 'center', flexShrink: 0
                    }} />
                    {(!collapsed || isOverlay) && (
                        <span style={{
                            color: pathname?.startsWith('/medewerker') ? '#fff' : 'rgba(255,255,255,0.7)',
                            fontSize: '0.82rem', fontWeight: pathname?.startsWith('/medewerker') ? 700 : 500,
                        }}>Medewerker</span>
                    )}
                </Link>
            </nav>

            {/* Bottom: notifs, lang, user, logout, toggle */}
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 0' }}>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        title={collapsed && !isOverlay ? 'Meldingen' : undefined}
                        onClick={() => setNotifOpen(p => !p)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            gap: '12px', padding: (!collapsed || isOverlay) ? '9px 14px 9px 16px' : '9px 0',
                            justifyContent: (!collapsed || isOverlay) ? 'flex-start' : 'center',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ position: 'relative', width: '18px', textAlign: 'center', flexShrink: 0 }}>
                            <i className="fa-regular fa-bell" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem' }} />
                            {ongelezen > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-5px', right: '-6px',
                                    background: '#EF4444', color: '#fff',
                                    fontSize: '0.5rem', fontWeight: 800, width: '14px', height: '14px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>{ongelezen > 9 ? '9+' : ongelezen}</span>
                            )}
                        </div>
                        {(!collapsed || isOverlay) && (
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
                                Meldingen {ongelezen > 0 && <span style={{ color: '#EF4444', fontWeight: 700 }}>({ongelezen})</span>}
                            </span>
                        )}
                    </button>
                    {notifOpen && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: (!collapsed || isOverlay) ? '8px' : '68px',
                            background: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            padding: '8px', minWidth: '240px', zIndex: 200,
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', padding: '4px 8px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>Meldingen</div>
                            {alleMeldingen.filter(m => m.aan === user?.name).length === 0 ? (
                                <div style={{ padding: '12px 8px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>Geen meldingen</div>
                            ) : alleMeldingen.filter(m => m.aan === user?.name).slice(0, 5).map((m, i) => (
                                <div key={i} style={{
                                    padding: '8px', borderRadius: '6px', marginBottom: '2px',
                                    background: m.gelezen ? 'transparent' : 'rgba(245,133,10,0.06)',
                                    borderLeft: m.gelezen ? 'none' : '3px solid #F5850A',
                                }}>
                                    <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: m.gelezen ? 400 : 600 }}>{m.bericht}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>{m.van} · {m.datum}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Language picker */}
                <div ref={langRef} style={{ position: 'relative' }}>
                    <button
                        title={collapsed && !isOverlay ? 'Taal' : undefined}
                        onClick={() => setTopLangOpen(p => !p)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            gap: '12px', padding: (!collapsed || isOverlay) ? '9px 14px 9px 16px' : '9px 0',
                            justifyContent: (!collapsed || isOverlay) ? 'flex-start' : 'center',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <img src={currentLang?.flag} alt="" style={{ width: '18px', height: '13px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />
                        {(!collapsed || isOverlay) && (
                            <>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', flex: 1 }}>{currentLang?.name}</span>
                                <i className={`fa-solid fa-chevron-${topLangOpen ? 'down' : 'right'}`} style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }} />
                            </>
                        )}
                    </button>
                    {topLangOpen && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: (!collapsed || isOverlay) ? '8px' : '68px',
                            background: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            padding: '4px', minWidth: '150px', zIndex: 200,
                        }}>
                            {languages.map(lang => (
                                <button key={lang.code} onClick={() => { setLanguage(lang.code); setTopLangOpen(false); }} style={{
                                    width: '100%', padding: '8px 10px', borderRadius: '6px', border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                                    background: language === lang.code ? 'rgba(245,133,10,0.1)' : 'transparent',
                                    color: language === lang.code ? '#F5850A' : '#4A5568',
                                    fontWeight: language === lang.code ? 600 : 400,
                                }}
                                onMouseOver={e => { if (language !== lang.code) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                                onMouseOut={e => { if (language !== lang.code) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <img src={lang.flag} alt="" style={{ width: '18px', height: '13px', borderRadius: '2px', objectFit: 'cover' }} />
                                    {lang.name}
                                    {language === lang.code && <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: '0.65rem' }} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* User info */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: '10px', padding: (!collapsed || isOverlay) ? '9px 14px 9px 16px' : '9px 0',
                    justifyContent: (!collapsed || isOverlay) ? 'flex-start' : 'center',
                }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', background: '#F5850A',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.7rem', flexShrink: 0
                    }}>{user?.initials || 'JM'}</div>
                    {(!collapsed || isOverlay) && (
                        <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Jan Modaal'}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>{user?.role || 'Beheerder'}</div>
                        </div>
                    )}
                </div>

                {/* Logout */}
                {onLogout && (
                    <button
                        title={collapsed && !isOverlay ? t('sidebar.logout') : undefined}
                        onClick={onLogout}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            gap: '12px', padding: (!collapsed || isOverlay) ? '9px 14px 9px 16px' : '9px 0',
                            justifyContent: (!collapsed || isOverlay) ? 'flex-start' : 'center',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className="fa-solid fa-right-from-bracket" style={{ color: 'rgba(239,68,68,0.7)', fontSize: '0.95rem', width: '18px', textAlign: 'center', flexShrink: 0 }} />
                        {(!collapsed || isOverlay) && (
                            <span style={{ color: 'rgba(239,68,68,0.7)', fontSize: '0.82rem' }}>{t('sidebar.logout')}</span>
                        )}
                    </button>
                )}

                {/* Collapse toggle (desktop only) */}
                {!isOverlay && (
                    <button onClick={toggleCollapsed} style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        gap: '12px', padding: collapsed ? '9px 0' : '9px 14px 9px 16px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className={`fa-solid fa-chevron-${collapsed ? 'right' : 'left'}`} style={{
                            color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', width: '18px', textAlign: 'center'
                        }} />
                        {!collapsed && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Inklappen</span>}
                    </button>
                )}
            </div>
        </div>
    );

    // ── Mobile: floating hamburger + overlay ──
    if (isMobile) {
        return (
            <>
                {/* Floating hamburger button */}
                <button onClick={() => setMobileOpen(true)} style={{
                    position: 'fixed', top: '12px', left: '12px', zIndex: 500,
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: '#0f172a', border: 'none', color: '#fff',
                    fontSize: '1.1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                    <i className="fa-solid fa-bars" />
                </button>

                {/* Overlay */}
                {mobileOpen && (
                    <>
                        <div onClick={() => setMobileOpen(false)} style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                            zIndex: 998, backdropFilter: 'blur(3px)'
                        }} />
                        <div style={{
                            position: 'fixed', top: 0, left: 0, bottom: 0,
                            zIndex: 999,
                        }}>
                            {sidebarContent(true)}
                        </div>
                    </>
                )}
            </>
        );
    }

    // ── Desktop: fixed left sidebar ──
    return (
        <aside style={{
            height: '100vh',
            flexShrink: 0,
            position: 'relative',
            zIndex: 100,
        }}>
            {sidebarContent(false)}
        </aside>
    );
}
