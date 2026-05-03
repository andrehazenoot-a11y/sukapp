'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import { AuthProvider, useAuth } from './AuthContext';
import { LanguageProvider, useLanguage } from './LanguageContext';
import Sidebar from './Sidebar';
import ChatBot from './ChatBot';
import { ToastProvider } from './Toast';

// Routes die geen auth vereisen
const PUBLIC_ROUTES = ['/meerwerk-akkoord', '/intake', '/login'];

// Wrapper die login/dashboard logica afhandelt
function AppContent({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user: legacyUser, logout: legacyLogout, loading: legacyLoading } = useAuth();
    const { data: nextAuthSession, status: nextAuthStatus } = useSession();
    const { t } = useLanguage();
    const isPublic = PUBLIC_ROUTES.some(r => pathname?.startsWith(r));
    const isMedewerker = pathname?.startsWith('/medewerker');

    // Als Microsoft sessie actief is: wis legacy localStorage zodat medewerker-sessie niet interfereert
    useEffect(() => {
        if (nextAuthStatus === 'authenticated' && nextAuthSession?.user) {
            localStorage.removeItem('schildersapp_user');
        }
    }, [nextAuthStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    // Public routes en medewerker app — geen dashboard shell
    if (isPublic || isMedewerker) return <>{children}</>;

    // Nog aan het laden
    const loading = nextAuthStatus === 'loading' || legacyLoading;
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0f172a'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fa-solid fa-paint-roller fa-spin" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: '12px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    // Bepaal actieve gebruiker: NextAuth (Microsoft) heeft voorrang voor dashboard
    const msUser = nextAuthSession?.user ? {
        id: nextAuthSession.user.email,
        username: nextAuthSession.user.email,
        name: nextAuthSession.user.name || 'Beheerder',
        role: 'Beheerder',
        initials: (nextAuthSession.user.name || 'B').split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 2).toUpperCase(),
        provider: nextAuthSession.user.provider || 'microsoft',
    } : null;

    const activeUser = msUser || legacyUser;

    // Uitloggen: beide sessies opruimen
    async function handleLogout() {
        legacyLogout();
        if (msUser) {
            await nextAuthSignOut({ callbackUrl: '/login' });
        } else {
            router.push('/login');
        }
    }

    // Niet ingelogd → doorsturen naar /login
    if (!activeUser) {
        if (typeof window !== 'undefined') router.replace('/login');
        return null;
    }

    // Ingelogd → App met Sidebar
    return (
        <div className="app-container">
            <Sidebar user={activeUser} onLogout={handleLogout} />
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
                <ToastProvider>
                    <AppContent>{children}</AppContent>
                </ToastProvider>
            </AuthProvider>
        </LanguageProvider>
    );
}
