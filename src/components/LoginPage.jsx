'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

export default function LoginPage() {
    const { login } = useAuth();
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError(t('login.invalidCredentials'));
            return;
        }

        setIsLoading(true);
        await new Promise(r => setTimeout(r, 600));

        const result = login(username, password);
        if (!result.success) {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#F5850A',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Decoratieve achtergrond patronen */}
            <div style={{
                position: 'absolute', top: '-200px', right: '-150px',
                width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)'
            }} />
            <div style={{
                position: 'absolute', bottom: '-150px', left: '-100px',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)'
            }} />
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '800px', height: '800px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.06)',
                pointerEvents: 'none'
            }} />

            <div style={{
                width: '440px', maxWidth: '92vw', position: 'relative', zIndex: 1,
                padding: '10px 0'
            }}>
                {/* DS Logo in cirkel */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{
                        width: '200px', height: 'auto',
                        display: 'block',
                        margin: '0 auto 6px',
                        overflow: 'hidden',
                    }}>
                        <img src="/ds-logo.png" alt="DeSchilders Logo" style={{
                            width: 'calc(100% + 4px)', height: 'auto', display: 'block',
                            margin: '-2px'
                        }} />
                    </div>
                </div>

                {/* Login Card */}
                <div style={{
                    background: '#fff', borderRadius: '20px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
                    padding: '24px 28px', overflow: 'hidden'
                }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700, color: '#1a202c' }}>
                        {t('login.welcomeBack')}
                    </h2>
                    <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#6B7280' }}>
                        {t('login.loginSubtitle')}
                    </p>

                    <form onSubmit={handleSubmit}>
                        {/* Gebruikersnaam */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{
                                display: 'block', fontSize: '0.88rem', fontWeight: 600,
                                color: '#4A5568', marginBottom: '4px'
                            }}>
                                <i className="fa-solid fa-user" style={{ marginRight: '8px', color: '#F5850A', fontSize: '0.82rem' }}></i>
                                {t('login.username')}
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => { setUsername(e.target.value); setError(''); }}
                                placeholder={t('login.usernamePlaceholder')}
                                autoComplete="username"
                                autoFocus
                                style={{
                                    width: '100%', padding: '10px 14px', fontSize: '0.92rem',
                                    border: error ? '2px solid #ef4444' : '2px solid #E2E8F0',
                                    borderRadius: '12px', outline: 'none',
                                    background: '#F7FAFC', color: '#1a202c',
                                    transition: 'all 0.2s', boxSizing: 'border-box'
                                }}
                                onFocus={e => { e.target.style.borderColor = '#F5850A'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(245,133,10,0.12)'; }}
                                onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#E2E8F0'; e.target.style.background = '#F7FAFC'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Wachtwoord */}
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{
                                display: 'block', fontSize: '0.88rem', fontWeight: 600,
                                color: '#4A5568', marginBottom: '4px'
                            }}>
                                <i className="fa-solid fa-lock" style={{ marginRight: '8px', color: '#F5850A', fontSize: '0.82rem' }}></i>
                                {t('login.password')}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    placeholder={t('login.passwordPlaceholder')}
                                    autoComplete="current-password"
                                    style={{
                                        width: '100%', padding: '10px 48px 10px 14px', fontSize: '0.92rem',
                                        border: error ? '2px solid #ef4444' : '2px solid #E2E8F0',
                                        borderRadius: '12px', outline: 'none',
                                        background: '#F7FAFC', color: '#1a202c',
                                        transition: 'all 0.2s', boxSizing: 'border-box'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#F5850A'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(245,133,10,0.12)'; }}
                                    onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#E2E8F0'; e.target.style.background = '#F7FAFC'; e.target.style.boxShadow = 'none'; }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e); }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#A0AEC0', fontSize: '1rem', padding: '4px'
                                    }}
                                >
                                    <i className={`fa-solid fa-eye${showPassword ? '-slash' : ''}`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Onthoud mij */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 14px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#6B7280' }}>
                                <input type="checkbox" style={{ accentColor: '#F5850A', width: '16px', height: '16px' }} />
                                {t('login.rememberMe')}
                            </label>
                            <a href="#" onClick={(e) => {
                                e.preventDefault();
                                // Nummer opgesplitst tegen bots/scrapers
                                const p = ['31', '6', '10', '29', '87', '66'];
                                const nr = p.join('');
                                const msg = encodeURIComponent('Hoi André, ik ben mijn wachtwoord vergeten voor de Schilders uit Katwijk App. Kan je me helpen?');
                                window.open(`https://wa.me/${nr}?text=${msg}`, '_blank');
                            }} style={{ fontSize: '0.88rem', color: '#25D366', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                                onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
                                <i className="fa-brands fa-whatsapp" style={{ fontSize: '1rem' }}></i>
                                {t('login.forgotPassword')}
                            </a>
                        </div>

                        {/* Foutmelding */}
                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                                borderRadius: '10px', padding: '12px 16px', marginBottom: '18px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontSize: '0.88rem', color: '#dc2626'
                            }}>
                                <i className="fa-solid fa-circle-exclamation"></i>
                                {error}
                            </div>
                        )}

                        {/* Inloggen knop */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700,
                                background: isLoading ? '#A0AEC0' : '#F5850A',
                                color: '#fff', border: 'none', borderRadius: '12px', cursor: isLoading ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                transition: 'all 0.2s',
                                boxShadow: isLoading ? 'none' : '0 6px 20px rgba(245,133,10,0.35)',
                                letterSpacing: '0.3px'
                            }}
                            onMouseOver={e => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,133,10,0.45)'; e.currentTarget.style.background = '#E07000'; } }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,133,10,0.35)'; e.currentTarget.style.background = '#F5850A'; }}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    {t('login.loggingIn')}
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-right-to-bracket"></i>
                                    {t('login.loginButton')}
                                </>
                            )}
                        </button>
                    </form>
                </div>


                {/* Footer */}
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: '10px', fontWeight: 500 }}>
                    {t('login.copyright')}
                </p>
            </div>
        </div>
    );
}
