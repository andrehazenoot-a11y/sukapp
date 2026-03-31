'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from './AuthContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import ChatBot from './ChatBot';

const PUBLIC_ROUTES = ['/meerwerk-akkoord', '/intake'];

// Wrapper die login/dashboard logica afhandelt
function AppContent({ children }) {
    const pathname = usePathname();
    const { user, logout, loading, isAuthenticated } = useAuth();
    const { t, language, setLanguage, languages } = useLanguage();
    const [topLangOpen, setTopLangOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const currentLang = languages.find(l => l.code === language);

    // Public routes werken zonder login en zonder sidebar
    const isPublic = PUBLIC_ROUTES.some(r => pathname?.startsWith(r));
    if (isPublic) return <>{children}</>;

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
