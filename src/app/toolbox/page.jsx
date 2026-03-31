'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ToolboxLogin() {
    const router = useRouter();
    const [naam, setNaam] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [fout, setFout] = useState('');
    const [laden, setLaden] = useState(false);

    const login = async (e) => {
        e.preventDefault();
        setFout('');
        setLaden(true);
        try {
            const res = await fetch('/api/toolbox/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naam, wachtwoord }),
            });
            const data = await res.json();
            if (!res.ok) { setFout(data.error || 'Inloggen mislukt'); return; }
            router.push(data.rol === 'admin' ? '/toolbox/admin' : '/toolbox/dashboard');
        } catch {
            setFout('Verbindingsfout, probeer opnieuw');
        } finally {
            setLaden(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
                        🔧
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Toolbox Meeting</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.875rem' }}>De Schilders uit Katwijk</p>
                </div>

                <form onSubmit={login}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Naam</label>
                        <input
                            type="text"
                            value={naam}
                            onChange={e => setNaam(e.target.value)}
                            placeholder="Jouw naam"
                            autoComplete="username"
                            required
                            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s' }}
                            onFocus={e => e.target.style.borderColor = '#2563eb'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Wachtwoord</label>
                        <input
                            type="password"
                            value={wachtwoord}
                            onChange={e => setWachtwoord(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s' }}
                            onFocus={e => e.target.style.borderColor = '#2563eb'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {fout && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: '0.85rem' }}>
                            {fout}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={laden}
                        style={{ width: '100%', padding: '12px', background: laden ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600, cursor: laden ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                    >
                        {laden ? 'Inloggen…' : 'Inloggen'}
                    </button>
                </form>
            </div>
        </div>
    );
}
