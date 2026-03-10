'use client';

import { useState, useEffect } from 'react';

import { AuthProvider, useAuth } from './AuthContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import ChatBot from './ChatBot';

// Wrapper die login/dashboard logica afhandelt
function AppContent({ children }) {
    const { user, logout, loading, isAuthenticated } = useAuth();
    const { t, language, setLanguage, languages } = useLanguage();
    const [topLangOpen, setTopLangOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const currentLang = languages.find(l => l.code === language);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Laad scherm
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0f172a'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fa-solid fa-paint-roller fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: '12px' }}></i>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    // Niet ingelogd → Login pagina
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Ingelogd → App met Sidebar
    return (
        <div className="app-container">
            <Sidebar user={user} onLogout={logout} />

            <main className="main-content">
                <header className="topbar">
                    <div className="search-bar">
                        <i className="fa-solid fa-search"></i>
                        <input type="text" placeholder={isMobile ? 'Zoek...' : t('topbar.searchPlaceholder')} />
                    </div>
                    <div className="topbar-actions">
                        {/* Taalschakelaar */}
                        <div className="topbar-lang" style={{ position: 'relative', marginRight: '4px' }}>
                            <button
                                onClick={() => setTopLangOpen(!topLangOpen)}
                                style={{
                                    background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
                                    padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem',
                                    display: 'flex', alignItems: 'center', gap: '8px', color: '#4A5568',
                                    fontWeight: 500, transition: 'all 0.15s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                                onMouseOut={e => e.currentTarget.style.background = 'none'}
                            >
                                <img src={currentLang?.flag} alt="" style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />
                                <span>{currentLang?.name}</span>
                                <i className={`fa-solid fa-chevron-${topLangOpen ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', marginLeft: '2px' }}></i>
                            </button>
                            {topLangOpen && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setTopLangOpen(false)} />
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                        background: '#fff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '4px',
                                        zIndex: 100, minWidth: '140px'
                                    }}>
                                        {languages.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => { setLanguage(lang.code); setTopLangOpen(false); }}
                                                style={{
                                                    width: '100%', padding: '6px 10px', borderRadius: '6px',
                                                    border: 'none', cursor: 'pointer', display: 'flex',
                                                    alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                                                    background: language === lang.code ? 'rgba(245,133,10,0.1)' : 'transparent',
                                                    color: language === lang.code ? '#F5850A' : '#4A5568',
                                                    fontWeight: language === lang.code ? 600 : 400
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
                                </>
                            )}
                        </div>
                        <span className="topbar-username" style={{
                            fontSize: '0.8rem', color: '#64748b', marginRight: '8px',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            <i className="fa-solid fa-circle" style={{ fontSize: '0.4rem', color: '#22c55e' }}></i>
                            {user.name}
                        </span>
                        <button className="icon-btn notification-btn">
                            <i className="fa-regular fa-bell"></i>
                            <span className="badge">3</span>
                        </button>
                        <button className="icon-btn" onClick={logout} title={t('topbar.logout')}
                            style={{ color: '#ef4444' }}>
                            <i className="fa-solid fa-right-from-bracket"></i>
                        </button>
                    </div>
                </header>

                {children}
            </main>
            <ChatBot />
        </div>
    );
}

export default function AppShell({ children }) {
    return (
        <LanguageProvider>
            <AuthProvider>
                <AppContent>{children}</AppContent>
            </AuthProvider>
        </LanguageProvider>
    );
}
