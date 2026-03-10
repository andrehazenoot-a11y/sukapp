'use client';
// Carlito = metrisch identiek aan Calibri (Google Fonts open-source)
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ContractSignPage() {
    const params = useParams();
    const contractId = params.id;
    const canvasRef = useRef(null);
    const paraafRefs = useRef({});
    const [contract, setContract] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [briefpapier, setBriefpapier] = useState(null);
    const [activeTemplate, setActiveTemplate] = useState({
        paddingTop: 110, paddingBottom: 120, paddingSides: 48, fontSize: 0.72, titleSize: 0.82, labelWidth: 120
    });
    const [zoom, setZoom] = useState(1.0);
    const zoomIn = () => setZoom(z => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))));
    const zoomOut = () => setZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(1))));

    // ─── Paraaf setup ───
    const initParaaf = (canvas) => {
        if (!canvas || canvas._paraafReady) return;
        canvas._paraafReady = true;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        ctx.strokeStyle = '#1a2332';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let drawing = false, lx = 0, ly = 0;
        const pos = (e) => { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left), y: (t.clientY - r.top) }; };
        const start = (e) => { e.preventDefault(); drawing = true; const p = pos(e); lx = p.x; ly = p.y; };
        const draw = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(p.x, p.y); ctx.stroke(); lx = p.x; ly = p.y; };
        const end = () => { drawing = false; };
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', end); canvas.addEventListener('mouseleave', end);
        canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', end);
    };
    const clearParaaf = (key) => {
        const canvas = paraafRefs.current[key];
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Load contract, briefpapier, and template from localStorage
    useEffect(() => {
        try {
            const contracten = JSON.parse(localStorage.getItem('wa_contracten')) || [];
            const found = contracten.find(c => c.id === contractId);
            if (found) {
                setContract(found);
                if (found.getekend) setSigned(true);
            }
        } catch { }
        try {
            const bp = localStorage.getItem('wa_briefpapier');
            if (bp) setBriefpapier(bp);
        } catch { }
        try {
            const templates = JSON.parse(localStorage.getItem('wa_contract_templates'));
            const activeId = localStorage.getItem('wa_active_template') || 'standaard';
            if (templates && templates.length) {
                const tpl = templates.find(t => t.id === activeId) || templates[0];
                setActiveTemplate(prev => ({ ...prev, ...tpl }));
            }
        } catch { }
    }, [contractId]);

    // Canvas drawing
    useEffect(() => {
        if (!canvasRef.current || !isSigning) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let drawing = false;
        let lastX = 0, lastY = 0;

        const getPos = (e) => {
            const r = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return { x: touch.clientX - r.left, y: touch.clientY - r.top };
        };

        const start = (e) => { e.preventDefault(); drawing = true; const pos = getPos(e); lastX = pos.x; lastY = pos.y; };
        const draw = (e) => {
            if (!drawing) return; e.preventDefault();
            const pos = getPos(e);
            ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(pos.x, pos.y); ctx.stroke();
            lastX = pos.x; lastY = pos.y; setHasDrawn(true);
        };
        const end = () => { drawing = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('mouseleave', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', end);

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', end);
            canvas.removeEventListener('mouseleave', end);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', end);
        };
    }, [isSigning]);

    const clearCanvas = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasDrawn(false);
    };

    const confirmSignature = () => {
        if (!hasDrawn || !contract) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            const contracten = JSON.parse(localStorage.getItem('wa_contracten')) || [];
            const updated = contracten.map(c => c.id === contractId ? { ...c, getekend: true, getekendDatum: today, status: 'getekend' } : c);
            localStorage.setItem('wa_contracten', JSON.stringify(updated));
        } catch { }
        setContract(prev => ({ ...prev, getekend: true, getekendDatum: today, status: 'getekend' }));
        setSigned(true);
        setIsSigning(false);
    };

    // ─── Not Found ───
    if (!contract) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px' }}>📄</div>
                    <h2 style={{ fontSize: '1.2rem', color: '#64748b', margin: '0 0 8px' }}>Contract niet gevonden</h2>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Dit contract bestaat niet of is verlopen.</p>
                </div>
            </div>
        );
    }

    // ─── Professional Document Styles (Carlito = Calibri equivalent) ───
    const FONT = "'Carlito', 'Calibri', 'Segoe UI', Arial, sans-serif";
    const pageS = {
        height: '100%', overflowY: 'auto', background: '#dde1e7',
        fontFamily: FONT,
    };
    const contractS = { maxWidth: '660px', margin: '0 auto', padding: '16px 16px 80px' };
    const sectionTitle = {
        fontSize: '0.78rem', fontWeight: 700, color: '#2c3b4e',
        margin: '8px 0 4px', paddingBottom: '3px',
        borderBottom: '1px solid #c8d0d8',
        letterSpacing: '0.05em', fontFamily: FONT,
        textTransform: 'uppercase',
    };
    const paraS = { fontSize: '0.72rem', lineHeight: 1.6, color: '#2c3b4e', margin: '0 0 3px 0', textAlign: 'justify', hyphens: 'auto', fontFamily: FONT };
    const listS = { fontSize: '0.7rem', lineHeight: 1.6, color: '#2c3b4e', paddingLeft: '18px', margin: '0 0 2px 0', textAlign: 'left', fontFamily: FONT };
    const fieldBlock = { display: 'inline', fontWeight: 700, color: '#2c3b4e' };
    const tableS = { width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', marginBottom: '8px', border: '1px solid #b8c4ce', fontFamily: FONT };
    const thS = {
        padding: '5px 10px', textAlign: 'left',
        background: '#e8ecf0',
        color: '#2c3b4e',
        fontWeight: 700, fontSize: '0.67rem',
        letterSpacing: '0.03em',
        borderBottom: '2px solid #9aaab8',
        fontFamily: FONT,
    };
    const tdS = { padding: '4px 8px', borderBottom: '1px solid #c8d2da', borderRight: '1px solid #dde3e8', color: '#2c3b4e', fontSize: '0.68rem', fontFamily: FONT };
    const tdLabelS = { ...tdS, fontWeight: 600, color: '#2c3b4e', width: '160px', background: '#f4f6f8' };
    const pvRow = { fontSize: '0.68rem', lineHeight: 1.6, marginBottom: '2px', display: 'flex', gap: '4px', fontFamily: FONT };
    const pvLabel = { fontWeight: 600, color: '#4a5568', minWidth: '110px', fontSize: '0.66rem', fontFamily: FONT };

    const c = contract; // shorthand
    const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

    // ─── Signed Confirmation ───
    if (signed) {
        return (
            <div style={pageS}>
                <div style={{ background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)', padding: '24px 16px', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Overeenkomst van Onderaanneming</div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>De Schilders uit Katwijk</h1>
                </div>
                <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', border: '2px solid #22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.1)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem', color: '#22c55e' }}>✅</div>
                        <h2 style={{ fontSize: '1.1rem', color: '#166534', margin: '0 0 8px' }}>Contract Ondertekend!</h2>
                        <p style={{ fontSize: '0.85rem', color: '#15803d', margin: '0 0 16px' }}>
                            De overeenkomst voor &quot;{c.projectNaam}&quot; is succesvol ondertekend op {c.getekendDatum}.
                        </p>
                        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#f0fdf4', fontSize: '0.78rem', color: '#15803d', textAlign: 'left' }}>
                            <strong>Overzicht:</strong><br />
                            📍 Project: {c.projectNaam}<br />
                            💶 Uurtarief: € {c.uurtarief}<br />
                            ⏱️ Totaal: {c.totaalUren} uur<br />
                            📅 {c.startDatum} t/m {c.eindDatum || 'nader te bepalen'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Full Contract View ───
    return (
        <div style={pageS}>
            {/* Print CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap');

                @media print {
                    /* Verberg alles buiten het contract */
                    .no-print { display: none !important; }
                    nav, header, footer, aside { display: none !important; }

                    /* Pagina-instelling: staand A4, geen marges */
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }

                    /* Body en achtergrond */
                    html, body {
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        width: 210mm;
                        height: 297mm;
                    }

                    /* Container: geen gap, geen padding */
                    .print-contract {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        gap: 0 !important;
                        display: block !important;
                    }

                    /* Elke pagina = exact 1 A4-blad */
                    .print-contract > div {
                        position: relative !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        max-width: 210mm !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        overflow: hidden !important;
                        page-break-after: always;
                        break-after: page;
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    /* Laatste pagina geen extra witregel */
                    .print-contract > div:last-of-type {
                        page-break-after: auto;
                        break-after: auto;
                    }

                    /* Achtergrond afbeeldingen (briefpapier) wél printen */
                    .print-contract > div * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />


            {/* Let op balk */}
            <div className="no-print" style={{ background: 'rgba(250,160,82,0.08)', borderLeft: '4px solid #F5850A', padding: '12px 20px', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5, maxWidth: '800px', margin: '0 auto' }}>
                <strong>⚠️ Lees de overeenkomst zorgvuldig door.</strong> Scroll naar beneden om digitaal te ondertekenen.
            </div>

            {/* Floating Print/PDF Buttons */}
            <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 100 }}>
                <button onClick={() => {
                    const contractEl = document.querySelector('.print-contract');
                    if (!contractEl) return;
                    const html = contractEl.innerHTML;
                    const win = window.open('', '_blank', 'width=900,height=700');
                    win.document.write(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <title>Contract — ${c.projectNaam || 'De Schilders uit Katwijk'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    .print-wrap {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .print-wrap > div {
      position: relative;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .print-wrap > div:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { width: 210mm; }
      .print-wrap > div {
        width: 210mm !important;
        height: 297mm !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-wrap">${html}</div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`);
                    win.document.close();
                }} style={{
                    padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff',
                    fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 16px rgba(59,130,246,0.4)'
                }}>
                    💾 Opslaan als PDF
                </button>
                <button onClick={() => window.print()} style={{
                    padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', color: '#fff',
                    fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 16px rgba(30,41,59,0.3)'
                }}>
                    🖨️ Printen
                </button>
            </div>

            {/* Zoom controls */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px 0', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(221,225,231,0.92)', backdropFilter: 'blur(6px)' }}>
                <button onClick={zoomOut} title="Uitzoomen" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#1e293b', color: '#fff', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>−</button>
                <span style={{ minWidth: '54px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', background: '#fff', borderRadius: '8px', padding: '4px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} title="Inzoomen" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#1e293b', color: '#fff', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>+</button>
                <button onClick={() => setZoom(1.0)} title="Reset zoom" style={{ marginLeft: '4px', padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>Reset</button>
            </div>

            <div className="print-contract" style={{ ...contractS, display: 'flex', flexDirection: 'column', gap: '24px', transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
                {/* ═══ MULTI-PAGE LAYOUT — elke pagina heeft eigen briefpapier ═══ */}
                {[
                    // ═══ PAGE 1: Header + A. Partijen + Uitgangspunten 1-3 ═══
                    <>
                        {/* Document Title */}
                        <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '5px', borderBottom: '2px solid #1e293b' }}>
                            <h2 style={{ margin: '0 0 2px', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.05em' }}>OVEREENKOMST VAN ONDERAANNEMING</h2>
                        </div>

                        {/* ══ A. PARTIJEN ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>A.</span> De partijen bij de overeenkomst</h3>
                        <p style={paraS}>Ondergetekenden:</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '5px' }}>
                            <div style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d8dfe8', background: '#f8f9fb' }}>
                                <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#5a7a96', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Aannemer</div>
                                <div style={pvRow}><span style={pvLabel}>naam:</span><span>De Schilders uit Katwijk</span></div>
                                <div style={pvRow}><span style={pvLabel}>straat:</span><span>Ambachtsweg 12</span></div>
                                <div style={pvRow}><span style={pvLabel}>postcode/plaats:</span><span>2223 AM Katwijk</span></div>
                                <div style={pvRow}><span style={pvLabel}>telefoonnummer:</span><span>071-1234567</span></div>
                                <div style={pvRow}><span style={pvLabel}>KvK-nr:</span><span>12345678</span></div>
                                <div style={pvRow}><span style={pvLabel}>btw-nr:</span><span>NL123456789B01</span></div>
                            </div>
                            <div style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d8dfe8', background: '#f8f9fb' }}>
                                <div style={{ fontSize: '0.52rem', fontWeight: 700, color: '#5a7a96', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Onderaannemer</div>
                                <div style={pvRow}><span style={pvLabel}>naam:</span><span style={fieldBlock}>{c.medewerkerNaam}</span></div>
                                <div style={pvRow}><span style={pvLabel}>straat:</span><span style={fieldBlock}>{c.medewerkerAdres || '—'}</span></div>
                                <div style={pvRow}><span style={pvLabel}>postcode/plaats:</span><span style={fieldBlock}>{c.medewerkerPostcode || '—'}</span></div>
                                <div style={pvRow}><span style={pvLabel}>telefoonnummer:</span><span style={fieldBlock}>{c.medewerkerTelefoon}</span></div>
                                <div style={pvRow}><span style={pvLabel}>KvK-nr:</span><span style={fieldBlock}>{c.medewerkerKvk || '—'}</span></div>
                                <div style={pvRow}><span style={pvLabel}>btw-nr:</span><span style={fieldBlock}>{c.medewerkerBtw || '—'}</span></div>
                            </div>
                        </div>

                        <p style={{ ...paraS, fontWeight: 600, marginTop: '3px' }}>Redenen om de overeenkomst van onderaanneming aan te gaan:</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Partijen willen met deze overeenkomst aangeven dat ze geen arbeidsovereenkomst noch gezagsverhouding in de zin van artikel 7:610 e.v. BW willen afsluiten maar een overeenkomst van aanneming van werk aangaan in de zin van artikel 7:750 BW.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Partijen willen de afspraken die zij hebben gemaakt schriftelijk vastleggen in deze overeenkomst van onderaanneming.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Aannemer hecht waarde aan verduurzaming en wil om die reden deze overeenkomst gebruiken als raamwerk voor nader te verstrekken digitale opdrachten.</p>

                        <p style={{ ...paraS, fontWeight: 600, marginTop: '3px' }}>Uitgangspunten bij de overeenkomst van onderaanneming:</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>1. Onderaannemer accepteert de opdracht en aanvaardt daarmee de volle verantwoordelijkheid voor het op juiste wijze uitvoeren van de overeengekomen werkzaamheden en de oplevering van het overeengekomen resultaat.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>2. Onderaannemer deelt zijn werkzaamheden zelfstandig in. Wel vindt afstemming plaats met de aannemer, voor zover dat in geval van samenwerking met anderen voor de uitvoering van de opdracht nodig is.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>3. Aannemer verstrekt onderaannemer alle bevoegdheid en informatie benodigd voor een goede uitvoering van de opdracht.</p>
                    </>,

                    // ═══ PAGE 2: Uitgangspunten 4-14 + B + C ═══
                    <>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>4. Onderaannemer is bij het uitvoeren van de overeengekomen werkzaamheden geheel zelfstandig.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>5. De voor de uitvoering van de opdracht benodigde verfmaterialen (waaronder verf, primers, vulmiddelen, afplaktape en beschermingsfolie) worden door de aannemer ter beschikking gesteld. Partijen kiezen bewust voor deze praktische en economisch doelmatige werkwijze: de aannemer beschikt over vaste leverancierscontracten en volume-inkoopafspraken waardoor de materiaalkosten voor het project zo laag mogelijk worden gehouden — en daarmee ook de totale opdrachtsom voor de eindopdrachtgever. Het ter beschikking stellen van materialen door de aannemer wordt door partijen uitdrukkelijk aangemerkt als een zakelijke keuze die de zelfstandige positie van de onderaannemer op geen enkele wijze aantast. Onderaannemer blijft in alle overige opzichten zelfstandig ondernemer: hij beschikt over eigen vervoer, professioneel gereedschap en werkkleding, bepaalt zelfstandig zijn werkwijze en werktijden, en is vrij opdrachten van derden te aanvaarden.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>6. Onderaannemer verklaart dat hij geen werknemers zal aannemen of uitzendkrachten zal inlenen voor de uitvoering van de opdracht.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>7. De onderaannemer is niet gerechtigd derden in te schakelen, daar er sprake is van specifieke vaardigheden en kwaliteiten van de onderaannemer.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>8. De opdracht zal worden uitgevoerd met inachtneming van wettelijke voorschriften.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>9. Indien de opdracht wordt uitgevoerd op een bouwplaats waar ook werknemers werkzaam zijn, is de aannemer verantwoordelijk voor de naleving van de sectorale arbo-catalogus. De aannemer dient hiervoor de noodzakelijke voorzieningen te treffen.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>10. Onderaannemer verstrekt de aannemer <strong><span style={{ color: '#5a7a96' }}>{c.vcaCertificaat ? 'wel' : 'geen'}</span></strong> kopie van een geldig certificaat VOL VCA waaruit blijkt dat hij in het bezit is van de basis kennis over veiligheid, gezondheid en welzijn op de werkplek.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>11. De onderaannemer is volledig vrij in het aannemen van opdrachten van derden.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>12. De onderaannemer is niet afhankelijk van één opdrachtgever.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>13. De onderaannemer is verantwoordelijk voor schade die hij jegens derden veroorzaakt.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>14. De onderaannemer is ingeschreven bij de Kamer van Koophandel en heeft een btw-identificatienummer.</p>

                        <p style={{ ...paraS, fontSize: '0.52rem', fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>Deze overeenkomst is gebaseerd op de door de Belastingdienst op 1 maart 2016 onder nummer 9081625181 beoordeelde overeenkomst. De goedkeuring en verlenging van deze overeenkomst is bij de Belastingdienst geregistreerd onder nummer 90821.22312.1.0. of 90820.2122312.1.0</p>
                    </>,

                    // ═══ PAGE 3: B + C + D + E ═══
                    <>
                        {/* ══ B. HET WERK ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>B.</span> Het werk</h3>
                        <p style={paraS}>De aannemer verstrekt de afzonderlijke opdrachten per email aan de onderaannemer waarin wordt verwezen naar deze getekende overeenkomst van onderaanneming.</p>
                        <p style={paraS}>Onderaannemer zal middels zijn gegeven akkoord, per e-mail (zie bijlage 1), de opdracht aanvaarden en overeenkomstig deze overeenkomst uitvoeren.</p>
                        <p style={{ ...paraS, fontWeight: 600 }}>In deze email worden de volgende zaken benoemd:</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}><tbody>
                            <tr><td style={{ ...tdS, fontWeight: 600, width: '160px' }}>Plaats/locatie:</td><td style={tdS}><span style={fieldBlock}>{c.projectLocatie}</span></td></tr>
                            <tr><td style={{ ...tdS, fontWeight: 600 }}>Projectnummer:</td><td style={tdS}><span style={fieldBlock}>{c.projectId}</span></td></tr>
                            <tr><td style={{ ...tdS, fontWeight: 600 }}>Beschrijving van het werk:</td><td style={tdS}><span style={fieldBlock}>{c.werkzaamheden}</span></td></tr>
                            <tr><td style={{ ...tdS, fontWeight: 600 }}>Start werkzaamheden:</td><td style={tdS}><span style={fieldBlock}>{c.startDatum}</span></td></tr>
                            <tr><td style={{ ...tdS, fontWeight: 600 }}>Einddatum werkzaamheden:</td><td style={tdS}><span style={fieldBlock}>{c.eindDatum || 'xxxxxxx'}</span></td></tr>
                            <tr><td style={{ ...tdS, fontWeight: 600 }}>Aanneemsom:</td><td style={tdS}><span style={{ ...fieldBlock, color: '#166534' }}>€ {c.totaalBedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW</span></td></tr>
                        </tbody></table>
                        <p style={paraS}>De verstrekte opdrachten en akkoordverklaring zullen aan deze overeenkomst worden gehecht.</p>

                        {/* ══ C. WIJZIGING KOSTEN ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>C.</span> Wijziging van de kosten en prijzen</h3>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Wijziging van kosten en prijzen worden <strong><span style={{ color: '#5a7a96' }}>{c.kostenVerrekend === 'wel' ? 'wel' : 'niet'}</span></strong> verrekend/doorberekend</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- In geval van een afspraak over verrekening/doorrekening van de kosten en prijzen is overeengekomen zal de onderaannemer transparantie betrachten en de aangepaste kosten en prijzen aan de aannemer inzichtelijk maken.</p>

                        {/* ══ D. WEEKRAPPORTEN ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>D.</span> Weekrapporten, mandagenregister</h3>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- De onderaannemer zorgt <strong><span style={{ color: '#5a7a96' }}>{c.weekrapporten === 'wel' ? 'wel' : 'niet'}</span></strong> voor het opmaken van weekrapporten</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- De onderaannemer houdt van het werk <strong><span style={{ color: '#5a7a96' }}>{c.mandagenregister === 'wel' ? 'wel' : 'niet'}</span></strong> wekelijkse mandagenregisters bij</p>
                    </>,

                    // ═══ PAGE 4: E + Termijnoverzicht + F + G ═══
                    <>
                        {/* ══ E. MATERIALEN EN GEREEDSCHAP ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>E.</span> Materialen en gereedschap</h3>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- <strong>Verfmaterialen</strong> (verf, primer, vulmiddel, afplaktape en beschermfolie) worden door de <strong>aannemer</strong> ter beschikking gesteld. De aannemer profiteert van zijn inkoopconditities voor verfmaterialen ten behoeve van een efficiënte en kostenoptimale projectuitvoering.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- <strong>Gereedschap</strong> (kwasten, rollers, verspuiting, schraapmessen, schaarhoogwerker en overige handgereedschappen) is <strong>eigendom van de onderaannemer</strong>. Onderaannemer is verantwoordelijk voor het onderhoud, de opslag en de verzekering van zijn eigen gereedschap.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Mocht onderaannemer aanvullende verfmaterialen nodig hebben die niet door aannemer zijn verstrekt, dan dient hiervoor vooraf schriftelijke toestemming te worden verkregen. Meerkosten worden uitsluitend vergoed op basis van vooraf goedgekeurde kostenoverzichten.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Niet-verbruikte verfmaterialen blijven eigendom van de aannemer en worden na afronding van het werk geretourneerd of in mindering gebracht op de afrekening.</p>

                        {/* ══ F. BETALINGSREGELING ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>F.</span> Betalingsregeling</h3>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Het aan de onderaannemer toekomende zal door hem kunnen worden gefactureerd in termijnen en telkens na het verschijnen van de desbetreffende termijn.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- De termijnen verschijnen periodiek, met tussenpozen van weken</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- De aannemer zal in alle gevallen rechtstreeks betalen aan de onderaannemer.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Op facturen dient het projectnummer vermeld te worden.</p>

                        {c.totaalBedrag > 0 && (
                            <div style={{ marginBottom: '10px', border: '1px solid #b8c4ce', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#2c3b4e', background: '#e8ecf0', padding: '5px 10px', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #b8c4ce' }}>Termijnoverzicht betalingen</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                                    <thead><tr><th style={thS}>Termijn</th><th style={thS}>Bedrag excl. BTW</th></tr></thead>
                                    <tbody>
                                        {(() => {
                                            const termijnBedragen = c.termijnBedragen && c.termijnBedragen.length === c.aantalTermijnen
                                                ? c.termijnBedragen
                                                : Array.from({ length: c.aantalTermijnen || 5 }, () => c.totaalBedrag / (c.aantalTermijnen || 5));
                                            return termijnBedragen.map((bedrag, i) => (
                                                <tr key={i}>
                                                    <td style={tdS}>Termijn {i + 1}</td>
                                                    <td style={{ ...tdS, fontWeight: 600 }}>€ {(bedrag || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ));
                                        })()}
                                        <tr style={{ fontWeight: 700, background: '#e8ecf0', borderTop: '2px solid #9aaab8' }}>
                                            <td style={tdS}>Totaal</td>
                                            <td style={{ ...tdS, fontWeight: 700 }}>€ {c.totaalBedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ══ G. BTW ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>G.</span> Btw-verleggingsregeling</h3>
                        <p style={paraS}>Op deze overeenkomst is de verleggingsregeling met betrekking tot de btw <strong><span style={{ color: '#5a7a96' }}>{c.btwVerlegd ? 'wel' : 'niet'}</span></strong> van toepassing.</p>

                        {/* ══ H. BETALINGSTERMIJN ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>H.</span> Betalingstermijn</h3>
                        <p style={paraS}>De aannemer zal, na het indienen van de factuur door de onderaannemer, de factuur binnen <strong><span style={fieldBlock}>{c.betaaltermijn || '14 dagen na factuurdatum'}</span></strong> voldoen. Indien deze overeenkomst van onderaanneming niet getekend geretourneerd is, zullen de facturen van onderaannemer niet betaald worden.</p>

                    </>,

                    // ═══ PAGE 5: H + I + Ondertekening ═══
                    <>
                        {/* ══ I. VERZEKERINGEN ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>I.</span> Verzekeringen</h3>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Onderaannemer is aansprakelijk voor eventuele tekortkomingen in het werk. Bij zodanige tekortkomingen is onderaannemer verplicht deze weg te nemen door de desbetreffende werkzaamheden op eerste verzoek van aannemer geheel voor eigen rekening opnieuw te verrichten.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- Onderaannemer is verplicht schade te vergoeden die voor aannemer en/of diens medewerkers ontstaat als gevolg van vertraging of enige andere tekortkoming van onderaannemer in de uitvoering van het werk.</p>
                        <p style={{ ...paraS, paddingLeft: '8px' }}>- De onderaannemer beschikt over een aansprakelijkheidsverzekering voor bedrijven (AVB).</p>

                        {/* ══ J. SLOTBEPALINGEN ══ */}
                        <h3 style={sectionTitle}><span style={{ color: '#5a7a96' }}>J.</span> Slotbepalingen</h3>

                        <p style={paraS}>Op alle geschillen die voortvloeien uit deze overeenkomst, dan wel nadere overeenkomsten die hiervan het gevolg zijn, is het Nederlands recht van toepassing.</p>
                        <p style={paraS}>Eventuele wijzigingen of aanvullingen op de bepalingen van deze overeenkomst kunnen uitsluitend schriftelijk tussen Partijen worden overeengekomen.</p>
                        <p style={paraS}>Door het ondertekenen van deze overeenkomst verklaren partijen in het bezit te zijn van een exemplaar van deze overeenkomst en alle in deze overeenkomst genoemde bijlagen.</p>
                        <p style={paraS}>Een exemplaar van deze overeenkomst en alle in deze overeenkomst genoemde en te voegen bijlagen zullen ook worden gegeven aan een eventuele hoofdaannemer.</p>

                        <p style={{ ...paraS, fontWeight: 600, marginTop: '30px' }}>Aldus overeengekomen en in tweevoud opgemaakt, per bladzijde geparafeerd en ondertekend:</p>

                        {/* ── ONDERTEKENING ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '40px' }}>
                            <div style={{ border: '1px solid #d4dbe3', borderRadius: '4px', padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a7a96', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aannemer:</div>
                                <div style={{ borderBottom: '1px solid #2c3b4e', height: '80px', marginBottom: '8px' }}></div>
                                <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#2c3b4e' }}>De Schilders uit Katwijk</div>
                                <div style={{ fontSize: '0.54rem', color: '#6b7a8d', marginTop: '4px' }}>Plaats: Katwijk<br />Datum: {today}</div>
                            </div>
                            <div style={{ border: '1px solid #d4dbe3', borderRadius: '4px', padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a7a96', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Onderaannemer:</div>
                                <div style={{ borderBottom: '1px solid #2c3b4e', height: '80px', marginBottom: '8px', display: 'flex', alignItems: 'end', justifyContent: 'center', fontSize: '0.5rem', color: '#94a3b8', fontWeight: 400, paddingBottom: '4px' }}>Handtekening</div>
                                <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#2c3b4e' }}><span style={fieldBlock}>{c.medewerkerNaam}</span></div>
                                <div style={{ fontSize: '0.54rem', color: '#6b7a8d', marginTop: '4px' }}>Plaats: {c.medewerkerPostcode || '—'}<br />Datum: {today}</div>
                            </div>
                        </div>
                    </>,

                    // ═══ PAGE 6: Bijlage 1 ═══
                    <>
                        <div style={{ paddingTop: '2px' }}>
                            <h3 style={{ ...sectionTitle, fontSize: '0.72rem', borderBottom: '2px solid #1e293b' }}>BIJLAGE 1</h3>
                            <p style={paraS}>Beste <span style={fieldBlock}>{c.medewerkerNaam.split(' ')[0]}</span>,</p>
                            <p style={paraS}>Ingevolge de overeenkomst van onderaanneming getekend d.d. {today} doen wij (aannemer) u (onderaannemer) middels dit schrijven het voorstel tot uitvoering van de hieronder beschreven opdracht. Dit voorstel geldt als vrijblijvend aanbod.</p>
                            <p style={{ ...paraS, fontWeight: 600 }}>De opdracht tot uitvoer van werkzaamheden omvat:</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}><tbody>
                                <tr><td style={{ ...tdS, fontWeight: 600, width: '220px' }}>Plaats/locatie waar het werk wordt uitgevoerd:</td><td style={tdS}><span style={fieldBlock}>{c.projectLocatie}</span></td></tr>
                                <tr><td style={{ ...tdS, fontWeight: 600 }}>Projectnummer:</td><td style={tdS}><span style={fieldBlock}>{c.projectId}</span></td></tr>
                                <tr><td style={{ ...tdS, fontWeight: 600 }}>Start van de werkzaamheden:</td><td style={tdS}><span style={fieldBlock}>{c.startDatum}</span></td></tr>
                                <tr><td style={{ ...tdS, fontWeight: 600 }}>Einddatum van de werkzaamheden:</td><td style={tdS}><span style={fieldBlock}>{c.eindDatum || 'xxxxxxx'}</span></td></tr>
                                <tr><td style={{ ...tdS, fontWeight: 600 }}>Aanneemsom:</td><td style={tdS}><span style={{ ...fieldBlock, color: '#166534' }}>€ {c.totaalBedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW</span></td></tr>
                            </tbody></table>
                            <p style={paraS}>Genoemde bedragen zijn exclusief BTW, inclusief parkeerkosten, transportkosten, e.d.</p>
                            <p style={{ ...paraS, marginTop: '6px' }}>Wij verzoeken u het bijgevoegde contract van onderaanneming goed door te lezen. Indien u akkoord gaat met de inhoud en de daarin opgenomen voorwaarden, dient u:</p>
                            <p style={{ ...paraS, paddingLeft: '8px' }}>1. Elke bladzijde van het contract te <strong>paraferen</strong> (initialen onderaan elke pagina).</p>
                            <p style={{ ...paraS, paddingLeft: '8px' }}>2. De laatste pagina volledig te <strong>ondertekenen</strong>.</p>
                            <p style={{ ...paraS, paddingLeft: '8px' }}>3. Het getekende contract zo spoedig mogelijk <strong>te retourneren</strong> aan De Schilders uit Katwijk, via e-mail naar <strong>info@deschildersuitkatwijk.nl</strong> of per post.</p>
                            <p style={paraS}>Door het ondertekend retourneren van dit contract aanvaardt u de hierboven beschreven opdracht en verbindt u zich aan de in de overeenkomst van onderaanneming d.d. {today} opgenomen afspraken en voorwaarden.</p>
                            <p style={paraS}>Indien dit contract niet getekend geretourneerd is, kunnen facturen niet in behandeling worden genomen.</p>
                            <p style={{ ...paraS, marginTop: '8px' }}>Met vriendelijke groet,<br /><strong>De Schilders uit Katwijk</strong></p>
                        </div>
                    </>
                ].map((pageContent, pageIdx, pagesArr) => (
                    <div key={pageIdx} style={{
                        position: 'relative', background: '#fff', borderRadius: '8px',
                        width: '620px', height: '876px', margin: '0 auto',
                        padding: `${pageIdx === 0 ? activeTemplate.paddingTop + 40 : activeTemplate.paddingTop}px ${activeTemplate.paddingSides}px ${activeTemplate.paddingBottom}px`,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden', border: '1px solid #e2e8f0'
                    }}>
                        {briefpapier && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundImage: `url(${briefpapier})`,
                                backgroundSize: '100% auto',
                                backgroundPosition: 'top center',
                                backgroundRepeat: 'no-repeat',
                                opacity: 1, pointerEvents: 'none', zIndex: 0,
                            }} />
                        )}
                        {/* Paginanummer rechts bovenin */}
                        <div style={{
                            position: 'absolute', top: '14px', right: '20px',
                            fontSize: '0.54rem', fontWeight: 600, color: '#94a3b8',
                            zIndex: 2, pointerEvents: 'none',
                            background: 'rgba(255,255,255,0.7)', padding: '1px 6px', borderRadius: '3px',
                        }}>
                            Pagina {pageIdx + 1} van {pagesArr.length}
                        </div>
                        <div
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            style={{
                                position: 'relative', zIndex: 1,
                                outline: 'none', cursor: 'text',
                                minHeight: '100%',
                            }}
                            onFocus={e => e.currentTarget.parentElement.style.outline = '2px solid rgba(59,130,246,0.3)'}
                            onBlur={e => e.currentTarget.parentElement.style.outline = 'none'}
                        >{pageContent}</div>

                        {/* ── Paraaf onderaan elke pagina (alleen pagina's 1-4) ── */}
                        {pageIdx < pagesArr.length - 2 && (
                            <div style={{
                                position: 'absolute',
                                bottom: `${activeTemplate.paddingBottom + 5}px`,
                                left: `${activeTemplate.paddingSides}px`,
                                right: `${activeTemplate.paddingSides}px`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                                zIndex: 3,
                                borderTop: '1px solid #d1d5db',
                                paddingTop: '5px',
                            }}>
                                {/* Aannemer paraaf */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                    <div style={{ fontSize: '0.44rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Paraaf aannemer</div>
                                    <div style={{ position: 'relative' }}>
                                        <canvas
                                            ref={el => { paraafRefs.current[`${pageIdx}-a`] = el; if (el) initParaaf(el); }}
                                            style={{ display: 'block', width: '90px', height: '32px', border: '1px solid #b0bac6', borderRadius: '3px', background: 'rgba(255,255,255,0.85)', cursor: 'crosshair' }}
                                        />
                                        <button onClick={() => clearParaaf(`${pageIdx}-a`)} style={{ position: 'absolute', top: '-1px', right: '-22px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.5rem', color: '#94a3b8', padding: '2px' }}>✕</button>
                                    </div>
                                </div>
                                {/* Onderaannemer paraaf */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                    <div style={{ fontSize: '0.44rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Paraaf onderaannemer</div>
                                    <div style={{ position: 'relative' }}>
                                        <button onClick={() => clearParaaf(`${pageIdx}-o`)} style={{ position: 'absolute', top: '-1px', left: '-22px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.5rem', color: '#94a3b8', padding: '2px' }}>✕</button>
                                        <canvas
                                            ref={el => { paraafRefs.current[`${pageIdx}-o`] = el; if (el) initParaaf(el); }}
                                            style={{ display: 'block', width: '90px', height: '32px', border: '1px solid #b0bac6', borderRadius: '3px', background: 'rgba(255,255,255,0.85)', cursor: 'crosshair' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* ═══ SIGNATURE PAD ═══ */}
                <div className="no-print" style={{ marginTop: '20px' }}>
                    {!isSigning ? (
                        <button onClick={() => setIsSigning(true)}
                            style={{
                                width: '100%', padding: '18px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#fff',
                                fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                boxShadow: '0 4px 16px rgba(37,211,102,0.3)'
                            }}>
                            ✍️ Digitaal Ondertekenen
                        </button>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                                    ✍️ Teken hieronder met je vinger
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Gebruik je vinger of muis om te tekenen</div>
                            </div>
                            <canvas ref={canvasRef}
                                style={{ width: '100%', height: '200px', cursor: 'crosshair', touchAction: 'none', background: '#fefce8' }} />
                            <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                                <button onClick={clearCanvas}
                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                                    🗑️ Wissen
                                </button>
                                <button onClick={confirmSignature} disabled={!hasDrawn}
                                    style={{
                                        flex: 2, padding: '12px', borderRadius: '10px', border: 'none', cursor: hasDrawn ? 'pointer' : 'not-allowed',
                                        background: hasDrawn ? '#22c55e' : '#cbd5e1', color: '#fff', fontSize: '0.85rem', fontWeight: 700
                                    }}>
                                    ✅ Bevestigen & Ondertekenen
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
