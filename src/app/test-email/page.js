'use client';
import { useState } from 'react';

const DEFAULT_MEERWERK = {
    naam: 'André de Schilders',
    email: 'andre@deschildersuitkatwijk.nl',
    project: 'Villa Wassenaar – buitenschilderwerk',
    omschrijving: 'Extra schilderwerk badkamer – schimmelbehandeling wanden',
    toelichting: 'Beschadigde wanden aangetroffen achter het bad, behandeling nodig voor aanvang aflak.',
    uren: 6,
    bedrag: 480,
    datum: new Date().toISOString().split('T')[0],
};

export default function TestEmailPage() {
    const [tab, setTab] = useState('meerwerk');
    const [form, setForm] = useState(DEFAULT_MEERWERK);
    const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const sendMeerwerk = async () => {
        setStatus('sending');
        setErrorMsg('');
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: form.email,
                    toName: form.naam,
                    contractNummer: `MW-TEST-${Date.now()}`,
                    projectNaam: form.project,
                    isMeerwerk: true,
                    meerwerkItem: {
                        omschrijving: form.omschrijving,
                        toelichting: form.toelichting,
                        uren: Number(form.uren),
                        bedrag: Number(form.bedrag),
                        datum: form.datum,
                    },
                }),
            });
            const data = await res.json();
            if (data.success) setStatus('ok');
            else { setStatus('error'); setErrorMsg(data.error || 'Onbekende fout'); }
        } catch (e) {
            setStatus('error');
            setErrorMsg(e.message);
        }
    };

    const input = (label, key, type = 'text', opts = {}) => (
        <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <input
                type={type}
                value={form[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#E07000'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                {...opts}
            />
        </div>
    );

    const textarea = (label, key) => (
        <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <textarea
                value={form[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', background: '#fff', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#E07000'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '40px 24px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>Email Testpagina</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
                        Verstuur een test-e-mail om de opmaak en bezorging te controleren.
                    </p>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    {['meerwerk', 'contract'].map(t => (
                        <button key={t} onClick={() => { setTab(t); setStatus(null); }}
                            style={{ padding: '8px 18px', borderRadius: '8px', border: '2px solid', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                                borderColor: tab === t ? '#E07000' : '#e2e8f0',
                                background: tab === t ? '#E07000' : '#fff',
                                color: tab === t ? '#fff' : '#64748b',
                            }}>
                            {t === 'meerwerk' ? 'Meerwerk akkoord' : 'Contract ondertekening'}
                        </button>
                    ))}
                </div>

                {/* Form card */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>

                    <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #E07000' }}>
                        De e-mail wordt verzonden vanuit het SMTP-account in <code>.env.local</code> naar het ingevulde adres.
                    </p>

                    {/* Ontvanger */}
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Ontvanger</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {input('Naam', 'naam')}
                            {input('E-mailadres', 'email', 'email')}
                        </div>
                        {input('Projectnaam', 'project')}
                    </div>

                    {/* Meerwerk velden */}
                    {tab === 'meerwerk' && (<>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Meerwerk details</div>
                        {input('Omschrijving', 'omschrijving')}
                        {textarea('Toelichting (optioneel)', 'toelichting')}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            {input('Extra uren', 'uren', 'number')}
                            {input('Bedrag (EUR)', 'bedrag', 'number')}
                            {input('Datum', 'datum', 'date')}
                        </div>
                    </>)}

                    {/* Contract velden */}
                    {tab === 'contract' && (<>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Contract details</div>
                        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
                            Contract-emails worden normaal vanuit de contractenpagina verstuurd. Deze test verstuurt een contract zonder PDF.
                        </p>
                        {input('Contract URL (ondertekeningslink)', 'contractUrl', 'url', { placeholder: 'https://...' })}
                    </>)}

                    {/* Verzendknop */}
                    <button
                        onClick={sendMeerwerk}
                        disabled={status === 'sending'}
                        style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '8px', border: 'none', background: status === 'sending' ? '#94a3b8' : '#E07000', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: status === 'sending' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                        {status === 'sending' ? 'Bezig met verzenden...' : 'Test e-mail versturen'}
                    </button>

                    {/* Status feedback */}
                    {status === 'ok' && (
                        <div style={{ marginTop: '14px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#15803d', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>&#10003;</span>
                            E-mail succesvol verzonden naar <strong>{form.email}</strong>. Controleer de inbox (en ongewenste email map).
                        </div>
                    )}
                    {status === 'error' && (
                        <div style={{ marginTop: '14px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontWeight: 600, fontSize: '14px' }}>
                            <strong>Fout:</strong> {errorMsg || 'E-mail kon niet worden verzonden. Controleer de SMTP-instellingen in .env.local.'}
                        </div>
                    )}
                </div>

                {/* Tips */}
                <div style={{ marginTop: '20px', background: '#fff', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>Checklist na ontvangst</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '2' }}>
                        <li>E-mail staat in de inbox (niet in spam)</li>
                        <li>Opmaak ziet er professioneel uit</li>
                        <li>Gegevens kloppen (naam, bedrag, datum)</li>
                        <li>Afzender toont &quot;De Schilders uit Katwijk&quot;</li>
                        <li>Antwoorden gaat naar andre@deschildersuitkatwijk.nl</li>
                        <li>Geen vreemde tekens of kapotte opmaak</li>
                    </ul>
                </div>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#94a3b8' }}>
                    Testpagina — alleen toegankelijk intern via <code>localhost:3000/test-email</code>
                </p>
            </div>
        </div>
    );
}
