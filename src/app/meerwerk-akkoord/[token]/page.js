'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Amsterdam',
    });
};

const fmtBedrag = (n) =>
    Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MeerwerkAkkoordPage() {
    const { token } = useParams();
    const canvasRef = useRef(null);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [drawing, setDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(null); // {signedAt}
    const lastPos = useRef({});
    const now = new Date();

    useEffect(() => {
        fetch(`/api/meerwerk-akkoord/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { setError(d.error); setLoading(false); return; }
                setData(d);
                if (d.signerName) setSignerName(d.signerName);
                if (d.status === 'signed') setDone({ signedAt: d.signedAt, name: d.signerName });
                setLoading(false);
            })
            .catch(() => { setError('Kan de akkoordaanvraag niet laden.'); setLoading(false); });
    }, [token]);

    // Canvas setup
    useEffect(() => {
        if (!data || done) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const ctx = canvas.getContext('2d');
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.offsetWidth;
            canvas.height = 180;
            ctx.putImageData(img, 0, 0);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };
        resize();
    }, [data, done]);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const startDraw = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const pos = getPos(e, canvas);
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        lastPos.current = pos;
        setDrawing(true);
    };
    const draw = (e) => {
        e.preventDefault();
        if (!drawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
        setHasSignature(true);
    };
    const endDraw = () => setDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const submit = async () => {
        if (!signerName.trim()) { alert('Vul uw naam in ter bevestiging.'); return; }
        if (!hasSignature) { alert('Plaats uw handtekening in het veld.'); return; }
        setSubmitting(true);
        const canvas = canvasRef.current;
        const signatureData = canvas.toDataURL('image/png');
        try {
            const res = await fetch(`/api/meerwerk-akkoord/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureData, signerName: signerName.trim() }),
            });
            const result = await res.json();
            if (result.success) {
                setDone({ signedAt: result.signedAt, name: signerName.trim() });
            } else {
                alert(result.error || 'Kon akkoord niet opslaan.');
            }
        } catch {
            alert('Netwerkfout. Probeer opnieuw.');
        }
        setSubmitting(false);
    };

    // ── Laadscherm ──
    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                <div style={{ fontSize: '14px' }}>Akkoordaanvraag laden...</div>
            </div>
        </div>
    );

    // ── Foutscherm ──
    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px' }}>
            <div style={{ maxWidth: '480px', background: '#fff', borderRadius: '12px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⛔</div>
                <h1 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1e293b' }}>Link ongeldig</h1>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{error}</p>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '16px' }}>Neem contact op via <strong>06-10 29 87 66</strong> of <strong>andre@deschildersuitkatwijk.nl</strong></p>
            </div>
        </div>
    );

    const mw = data.meerwerkItem;

    // ── Bevestigingsscherm (al ondertekend) ──
    if (done) return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ maxWidth: '520px', width: '100%' }}>
                <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #d1fae5' }}>
                    <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>✓</div>
                        <h1 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 800 }}>Akkoord ontvangen</h1>
                        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>Uw goedkeuring is geregistreerd</p>
                    </div>
                    <div style={{ padding: '32px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '20px' }}>
                            <tbody>
                                <tr><td style={{ padding: '8px 0', color: '#64748b', borderBottom: '1px solid #f1f5f9', width: '45%' }}>Project</td><td style={{ padding: '8px 0', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{data.projectNaam}</td></tr>
                                <tr><td style={{ padding: '8px 0', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Meerwerk</td><td style={{ padding: '8px 0', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{mw.omschrijving}</td></tr>
                                <tr><td style={{ padding: '8px 0', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Bedrag</td><td style={{ padding: '8px 0', fontWeight: 700, color: '#16a34a', borderBottom: '1px solid #f1f5f9' }}>EUR {fmtBedrag(mw.bedrag)}</td></tr>
                                <tr><td style={{ padding: '8px 0', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Akkoord door</td><td style={{ padding: '8px 0', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{done.name}</td></tr>
                                <tr><td style={{ padding: '8px 0', color: '#64748b' }}>Datum &amp; tijd</td><td style={{ padding: '8px 0', fontWeight: 600, color: '#1e293b' }}>{fmt(done.signedAt)}</td></tr>
                            </tbody>
                        </table>
                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#15803d' }}>
                            <strong>De Schilders uit Katwijk</strong> ontvangt automatisch een melding en zal spoedig starten met de uitvoering van het meerwerk.
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
                            Vragen? <strong>06-10 29 87 66</strong> · <strong>andre@deschildersuitkatwijk.nl</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Handtekenpagina ──
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, Helvetica, sans-serif', padding: '16px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ background: '#E07000', borderRadius: '12px 12px 0 0', padding: '24px 28px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '22px' }}>📋</span>
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>Akkoord meerwerk</div>
                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '2px' }}>{data.projectNaam}</div>
                        </div>
                    </div>
                </div>

                {/* Meerwerk details */}
                <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '24px 28px' }}>
                    <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#1e293b', lineHeight: 1.6 }}>
                        Geachte {data.toName || 'opdrachtgever'},<br /><br />
                        Hieronder vindt u de specificatie van het aanvullende werk. Lees dit zorgvuldig door en geef uw akkoord onderaan deze pagina.
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '20px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ textAlign: 'left', padding: '10px 14px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }} colSpan={2}>Meerwerk specificatie</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0', color: '#64748b', width: '40%', fontWeight: 600 }}>Omschrijving</td><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{mw.omschrijving}</td></tr>
                            {mw.toelichting && <tr><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Toelichting</td><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0', color: '#475569' }}>{mw.toelichting}</td></tr>}
                            {mw.uren > 0 && <tr><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Extra uren</td><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0' }}>{mw.uren} uur</td></tr>}
                            <tr><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Datum aanvraag</td><td style={{ padding: '9px 14px', border: '1px solid #e2e8f0' }}>{mw.datum}</td></tr>
                            <tr style={{ background: '#fff8f0' }}><td style={{ padding: '11px 14px', border: '2px solid #e2e8f0', fontWeight: 700, color: '#92400e' }}>Totaalbedrag</td><td style={{ padding: '11px 14px', border: '2px solid #e2e8f0', fontWeight: 800, fontSize: '16px', color: '#92400e' }}>EUR {fmtBedrag(mw.bedrag)}</td></tr>
                        </tbody>
                    </table>

                    <div style={{ background: '#fff8f0', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#92400e', marginBottom: '24px' }}>
                        <strong>Belangrijke mededeling:</strong> Dit meerwerk wordt uitsluitend uitgevoerd na uw schriftelijke goedkeuring via dit formulier. Door akkoord te geven bevestigt u kennis te hebben genomen van de bovenstaande specificatie en het bijbehorende bedrag.
                    </div>

                    {/* Datum aanduiding */}
                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                        <span style={{ fontSize: '18px' }}>🕐</span>
                        <div>Datum en tijd van ondertekening wordt automatisch vastgelegd:<br />
                            <strong style={{ color: '#1e293b' }}>{fmt(now.toISOString())}</strong>
                        </div>
                    </div>

                    {/* Naam invoer */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Uw naam (ter bevestiging) *
                        </label>
                        <input
                            type="text"
                            value={signerName}
                            onChange={e => setSignerName(e.target.value)}
                            placeholder="Volledige naam"
                            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            onFocus={e => e.target.style.borderColor = '#E07000'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Handtekening canvas */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Handtekening *
                            </label>
                            <button onClick={clearCanvas}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 6px' }}>
                                Wissen
                            </button>
                        </div>
                        <div style={{ position: 'relative', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff', cursor: 'crosshair' }}>
                            <canvas
                                ref={canvasRef}
                                style={{ display: 'block', width: '100%', height: '180px', touchAction: 'none' }}
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={endDraw}
                                onMouseLeave={endDraw}
                                onTouchStart={startDraw}
                                onTouchMove={draw}
                                onTouchEnd={endDraw}
                            />
                            {!hasSignature && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#cbd5e1', fontSize: '14px', userSelect: 'none' }}>
                                    Teken hier uw handtekening
                                </div>
                            )}
                            <div style={{ position: 'absolute', bottom: '8px', left: '14px', right: '14px', borderTop: '1px solid #e2e8f0', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    {/* Akkoord knop */}
                    <button
                        onClick={submit}
                        disabled={submitting}
                        style={{ width: '100%', padding: '14px', background: submitting ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', letterSpacing: '0.3px' }}>
                        {submitting ? 'Bezig...' : 'Akkoord geven en ondertekenen'}
                    </button>

                    <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '14px', marginBottom: 0 }}>
                        Door te ondertekenen bevestigt u akkoord te geven voor het bovengenoemde meerwerk.
                        De datum en tijd worden automatisch geregistreerd.
                    </p>
                </div>

                {/* Footer */}
                <div style={{ background: '#1e293b', borderRadius: '0 0 12px 12px', padding: '16px 28px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.7 }}>
                    <strong style={{ color: '#fff' }}>De Schilders uit Katwijk</strong> &middot; Ambachtsweg 12, 2223 AM Katwijk<br />
                    <span style={{ color: '#E07000' }}>andre@deschildersuitkatwijk.nl</span> &middot; 06-10 29 87 66
                </div>
            </div>
        </div>
    );
}
