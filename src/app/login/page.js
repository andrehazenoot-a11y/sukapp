'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [tab, setTab] = useState('dashboard');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showFallback, setShowFallback] = useState(false);

    async function handleMicrosoftLogin() {
        setLoading(true); setError('');
        await signIn('microsoft-entra-id', { redirectTo: '/' });
    }

    async function handleFallbackLogin(e) {
        e.preventDefault(); setLoading(true); setError('');
        const result = await signIn('noodbeheer', { username, password, redirect: false });
        setLoading(false);
        if (result?.ok) router.push('/');
        else setError('Ongeldige noodtoegang gegevens');
    }

    async function handleMedewerkerLogin(e) {
        e.preventDefault(); setLoading(true); setError('');
        try {
            const res = await fetch('/api/auth/validate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Ongeldige inloggegevens'); setLoading(false); return; }
            const sessRes = await fetch('/api/auth/session', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (sessRes.ok) {
                localStorage.setItem('schildersapp_user', JSON.stringify(data));
                window.location.href = data.role === 'Beheerder' ? '/' : '/medewerker';
            } else setError('Sessie kon niet worden aangemaakt');
        } catch { setError('Verbindingsfout — probeer opnieuw'); }
        setLoading(false);
    }

    const inp = (err) => ({
        width: '100%', padding: '11px 14px', fontSize: '0.93rem',
        border: `1.5px solid ${err ? '#ef4444' : '#e2e8f0'}`,
        borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
        background: '#fff', color: '#111827', transition: 'all 0.2s',
    });

    return (
        <>
        <style>{`
            @keyframes fadeUp {
                from { opacity: 0; transform: translateY(24px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `}</style>
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '24px 16px',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '340px',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                animation: 'fadeUp 0.4s ease',
            }}>
                {/* Oranje header met logo */}
                <div style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)',
                    padding: '36px 32px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    <img
                        src="/logo%20aangepast.png"
                        alt="De Schilders uit Katwijk"
                        style={{
                            width: '240px',
                            height: '240px',
                            borderRadius: '50%',
                            objectFit: 'contain',
                            border: '5px solid rgba(255,255,255,0.95)',
                            boxShadow: '0 10px 32px rgba(0,0,0,0.25)',
                            display: 'block',
                            background: 'transparent',
                        }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                </div>

                {/* Witte onderkaart met formulier */}
                <div style={{ background: '#fff', padding: '28px 32px 32px', height: '320px', display: 'flex', flexDirection: 'column' }}>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '4px',
                        marginBottom: '24px',
                        gap: '4px',
                    }}>
                        {[
                            { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
                            { key: 'medewerker', label: 'Medewerker', icon: 'fa-hard-hat' },
                        ].map(t => (
                            <button key={t.key}
                                onClick={() => { setTab(t.key); setError(''); setUsername(''); setPassword(''); }}
                                style={{
                                    flex: 1, padding: '9px 8px', border: 'none', cursor: 'pointer',
                                    borderRadius: '8px',
                                    background: tab === t.key ? '#f97316' : 'transparent',
                                    color: tab === t.key ? '#fff' : '#6b7280',
                                    fontWeight: tab === t.key ? 700 : 500,
                                    fontSize: '0.85rem', transition: 'all 0.15s',
                                    boxShadow: tab === t.key ? '0 2px 8px rgba(249,115,22,0.35)' : 'none',
                                }}>
                                <i className={`fa-solid ${t.icon}`} style={{ marginRight: '6px' }} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Dashboard — Microsoft */}
                    {tab === 'dashboard' && (
                        <div>
                            <button onClick={handleMicrosoftLogin} disabled={loading}
                                style={{
                                    width: '100%', padding: '13px 16px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', background: '#fff',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    fontSize: '0.93rem', fontWeight: 600, color: '#111827',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.2s',
                                    opacity: loading ? 0.7 : 1,
                                }}
                                onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(249,115,22,0.2)'; }}}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
                            >
                                <svg width="19" height="19" viewBox="0 0 21 21" fill="none">
                                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                                </svg>
                                {loading ? 'Bezig...' : 'Inloggen met Microsoft'}
                            </button>

                            {error && (
                                <div style={{ marginTop: '12px', padding: '10px 13px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <i className="fa-solid fa-circle-exclamation" />{error}
                                </div>
                            )}

                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <button onClick={() => setShowFallback(!showFallback)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '0.73rem' }}>
                                    <i className="fa-solid fa-lock" style={{ marginRight: '4px' }} />Noodtoegang
                                </button>
                            </div>

                            {showFallback && (
                                <form onSubmit={handleFallbackLogin} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <input type="text" placeholder="Gebruikersnaam" value={username} onChange={e => setUsername(e.target.value)} style={inp(false)} autoComplete="username" />
                                    <input type="password" placeholder="Wachtwoord" value={password} onChange={e => setPassword(e.target.value)} style={inp(false)} autoComplete="current-password" />
                                    <button type="submit" disabled={loading} style={{ padding: '11px', borderRadius: '10px', background: '#64748b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                                        {loading ? 'Bezig...' : 'Noodtoegang'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Medewerker */}
                    {tab === 'medewerker' && (
                        <form onSubmit={handleMedewerkerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.83rem', color: '#374151', marginBottom: '6px' }}>
                                    <i className="fa-solid fa-user" style={{ marginRight: '7px', color: '#f97316' }} />Medewerkerscode
                                </label>
                                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                                    placeholder="bijv. jan of jan1985" style={inp(!!error)} autoComplete="username" autoFocus
                                    onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                                    onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.83rem', color: '#374151', marginBottom: '6px' }}>
                                    <i className="fa-solid fa-lock" style={{ marginRight: '7px', color: '#f97316' }} />Wachtwoord
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                                        placeholder="••••••••" style={{ ...inp(!!error), paddingRight: '42px' }} autoComplete="current-password"
                                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }}
                                        onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div style={{ padding: '10px 13px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <i className="fa-solid fa-circle-exclamation" />{error}
                                </div>
                            )}

                            <button type="submit" disabled={loading || !username || !password}
                                style={{
                                    padding: '13px', borderRadius: '12px', border: 'none',
                                    background: (!username || !password || loading) ? '#e5e7eb' : '#f97316',
                                    color: (!username || !password || loading) ? '#9ca3af' : '#fff',
                                    cursor: (!username || !password || loading) ? 'not-allowed' : 'pointer',
                                    fontWeight: 700, fontSize: '0.93rem', transition: 'all 0.2s',
                                    boxShadow: (!username || !password || loading) ? 'none' : '0 4px 16px rgba(249,115,22,0.4)',
                                }}>
                                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '8px' }} />
                                {loading ? 'Bezig...' : 'Inloggen'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}
