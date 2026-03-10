'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, ALL_PAGES } from './AuthContext';
import { useLanguage } from './LanguageContext';

export default function Sidebar({ user, onLogout }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { hasAccess } = useAuth();
    const { t, language, setLanguage, languages } = useLanguage();

    // Vertaal nav item namen op basis van page.id
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

    // Filter nav items op basis van rechten
    const navItems = ALL_PAGES.filter(page => hasAccess(page.id)).map(page => ({
        name: navKeyMap[page.id] ? t(navKeyMap[page.id]) : page.name,
        path: page.path, icon: page.icon
    }));

    // Beheerder ziet ook de Toegang pagina
    if (user?.role === 'Beheerder') {
        navItems.push({ name: t('sidebar.accessControl'), path: '/toegang', icon: 'fa-shield-halved' });
    }

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'none', position: 'fixed', left: '16px', zIndex: 200,
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #F5850A, #E07000)',
                    border: 'none', cursor: 'pointer', color: '#fff', fontSize: '1.1rem',
                    boxShadow: '0 2px 8px rgba(245,133,10,0.3)',
                    alignItems: 'center', justifyContent: 'center'
                }}
                className="mobile-menu-btn"
            >
                <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>

            <style>{`
                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: flex !important;
                        top: calc(env(safe-area-inset-top, 12px) + 8px);
                    }
                }
            `}</style>

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px 20px 0px', position: 'relative'
                }}>
                    <div style={{ width: '220px', maxHeight: '255px', overflow: 'hidden' }}>
                        <img
                            src="/ds-logo.png"
                            alt="De Schilders uit Katwijk Logo"
                            style={{ width: 'calc(100% + 4px)', height: 'auto', display: 'block', margin: '-2px' }}
                        />
                    </div>
                </div>
                {/* Vloeiende overgang logo → navigatie */}
                <div style={{
                    height: '20px',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
                    marginBottom: '4px'
                }}></div>

                <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <li key={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                                    <Link href={item.path} onClick={() => setIsOpen(false)} style={{ display: 'flex', width: '100%', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                                        <i className={`fa-solid ${item.icon}`}></i>
                                        <span>{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    {/* Taalvlaggetjes onder navigatie */}
                    <div style={{ display: 'flex', gap: '6px', padding: '12px 18px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code)}
                                title={lang.name}
                                style={{
                                    width: '34px', height: '28px', borderRadius: '6px', cursor: 'pointer',
                                    border: language === lang.code ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                                    background: language === lang.code ? 'rgba(255,255,255,0.2)' : 'transparent',
                                    padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <img src={lang.flag} alt={lang.name} style={{ width: '22px', height: '15px', borderRadius: '2px', objectFit: 'cover' }} />
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">

                    <div className="user-profile">
                        <div className="avatar" style={{ background: 'rgba(255,255,255,0.9)', color: '#F5850A' }}>{user?.initials || 'JM'}</div>
                        <div className="user-info">
                            <h4 style={{ color: '#fff' }}>{user?.name || 'Jan Modaal'}</h4>
                            <p style={{ color: 'rgba(255,255,255,0.7)' }}>{user?.role || 'Beheerder'}</p>
                        </div>
                    </div>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            title={t('sidebar.logout')}
                            style={{
                                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                                color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                marginTop: '8px', width: '100%', justifyContent: 'center',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                        >
                            <i className="fa-solid fa-right-from-bracket"></i>
                            {t('sidebar.logout')}
                        </button>
                    )}
                </div>
            </aside>

            {/* Dark overlay when sidebar open on mobile */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                        zIndex: 90, backdropFilter: 'blur(2px)'
                    }}
                />
            )}
        </>
    );
}
