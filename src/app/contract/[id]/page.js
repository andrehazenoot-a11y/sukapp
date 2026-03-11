'use client';
// Carlito = metrisch identiek aan Calibri (Google Fonts open-source)
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ContractSignPage() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id;
    const canvasRef = useRef(null);
    const [contract, setContract] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [briefpapier, setBriefpapier] = useState(null);
    const [zoom, setZoom] = useState(1.0);
    const [activeTemplate, setActiveTemplate] = useState({
        paddingTop: 110, paddingBottom: 120, paddingSides: 48, fontSize: 0.72, titleSize: 0.82, labelWidth: 120
    });
    const zoomIn = () => setZoom(z => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))));
    const zoomOut = () => setZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(1))));

    // Load contract, briefpapier, and template
    useEffect(() => {
        try {
            const contracten = JSON.parse(localStorage.getItem('wa_contracten')) || [];
            const found = contracten.find(c => c.id === contractId);
            if (found) {
                setContract(found);
                if (found.getekend) setSigned(true);
                
                const medewerkers = JSON.parse(localStorage.getItem('wa_medewerkers')) || [];
                const m = medewerkers.find(x => x.id === found.medewerkerId);
                if (m && m.telefoon) {
                    setCustomTelefoon(m.telefoon);
                }
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

    // Canvas drawing for signature
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
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const [signingStep, setSigningStep] = useState(1); // 1 = Paraaf, 2 = Handtekening
    const [tempParaaf, setTempParaaf] = useState(null);
    const [customTelefoon, setCustomTelefoon] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const checkNextStep = () => {
        if (!hasDrawn || !canvasRef.current) return;
        if (signingStep === 1) {
            setTempParaaf(canvasRef.current.toDataURL('image/png'));
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setHasDrawn(false);
            setSigningStep(2);
        } else {
            confirmSignature();
        }
    };

    const confirmSignature = () => {
        if (!hasDrawn || !canvasRef.current) return;
        const todayStr = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
        const signatureData = canvasRef.current.toDataURL('image/png');
        
        const isAannemer = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'aannemer';
        let contracten = [];
        
        try {
            contracten = JSON.parse(localStorage.getItem('wa_contracten')) || [];
            const index = contracten.findIndex(c => c.id === contractId);
            if (index !== -1) {
                if (isAannemer) {
                    contracten[index].aannemerHandtekening = signatureData;
                    contracten[index].aannemerParaaf = tempParaaf;
                    contracten[index].aannemerDatum = todayStr;
                } else {
                    contracten[index].getekend = true;
                    contracten[index].getekendDatum = todayStr;
                    contracten[index].getekendHandtekening = signatureData;
                    contracten[index].getekendParaaf = tempParaaf;
                    contracten[index].kanbanStatus = 'Ondertekend';
                }
                localStorage.setItem('wa_contracten', JSON.stringify(contracten));
            }
        } catch { }

        if (isAannemer) {
            setContract(prev => ({ ...prev, aannemerHandtekening: signatureData, aannemerParaaf: tempParaaf, aannemerDatum: todayStr }));
            setIsSigning(false);
            setShowSuccess(true);
            setTimeout(() => { setShowSuccess(false); }, 2000); // Popup kort tonen, daarna document laten zien
        } else {
            setContract(prev => ({ ...prev, getekend: true, getekendDatum: todayStr, getekendHandtekening: signatureData, getekendParaaf: tempParaaf, kanbanStatus: 'Ondertekend' }));
            setSigned(true);
            setIsSigning(false);
            setShowSuccess(true);
            // Voor de ZZP'er laten we het venster open staan zodat hij de PDF kan downloaden
        }
    };

    if (!contract) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                Contract laden...
            </div>
        );
    }

    const c = contract;
    const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

    const handlePrintPdf = () => {
        const contractEl = document.querySelector('.print-contract');
        if (!contractEl) return;
        const html = contractEl.innerHTML;
        const win = window.open('', '_blank', 'width=900,height=700');
        const fileName = `Modelovereenkomst ${c?.contractnummer || 'SUK-' + c?.id} - ${(c?.medewerkerNaam || '').split(' ')[0]}`;
        const winHtml = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8" /><title>${fileName}</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.print-wrap>div{position:relative;width:620px !important;height:876px !important;zoom:1.28 !important;overflow:hidden !important;page-break-after:always;break-after:page;margin:0 !important;border:none !important;box-shadow:none !important;border-radius:0 !important;}.print-wrap>div:last-child{page-break-after:auto;break-after:auto;}@page{size:A4 portrait;margin:0;}</style></head><body><div class="print-wrap">${html}</div><script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`;
        win.document.write(winHtml);
        win.document.close();
    };

    // ═══ STIJLEN — exact gelijk aan whatsapp/page.js preview ═══
    const PVFONT = "'Carlito', 'Calibri', 'Segoe UI', Arial, sans-serif";
    const pvS = {
        fontSize: '0.72rem', lineHeight: 1.65, color: '#2c3b4e',
        margin: '0 0 3px 0', textAlign: 'justify', hyphens: 'auto',
        fontFamily: PVFONT
    };
    const pvTitle = {
        fontSize: '0.78rem', fontWeight: 700, color: '#2c3b4e',
        margin: '8px 0 4px', paddingBottom: '3px',
        borderBottom: '1px solid #b8c4ce',
        letterSpacing: '0.01em',
        fontFamily: PVFONT
    };
    const pvField = { fontWeight: 700, color: '#2c3b4e', display: 'inline' };
    const pvThS = {
        padding: '5px 10px', textAlign: 'left',
        background: '#e8ecf0', color: '#2c3b4e',
        fontWeight: 700, fontSize: '0.66rem',
        borderBottom: '2px solid #9aaab8',
        borderRight: '1px solid #c8d2da',
        fontFamily: "'Carlito', 'Calibri', 'Segoe UI', sans-serif"
    };
    const pvTdS = { padding: '4px 10px', borderBottom: '1px solid #c8d2da', borderRight: '1px solid #dde3e8', color: '#2c3b4e', fontSize: '0.68rem' };
    const pvRow = { fontSize: '0.68rem', lineHeight: 1.6, marginBottom: '2px', display: 'flex', gap: '4px', fontFamily: PVFONT };
    const pvLabel = { fontWeight: 600, color: '#4a5568', minWidth: '110px', fontSize: '0.67rem', fontFamily: PVFONT };

    const PT = activeTemplate.paddingTop;
    const PB = activeTemplate.paddingBottom;
    const PS = activeTemplate.paddingSides;
    const PAGE_H = 876;

    // ═══ PAGINA-INHOUD — exact gelijk aan whatsapp/page.js preview ═══
    const pages = [
        // Pagina 1: Titel + A. Partijen + Uitgangspunten 1-3
        <div key="p1">
            <div style={{ textAlign: 'center', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #1e293b' }}>
                <h2 style={{ margin: '0 0 2px', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.05em' }}>OVEREENKOMST VAN ONDERAANNEMING</h2>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2c3b4e', fontFamily: "'Carlito','Calibri',Arial,sans-serif", letterSpacing: '0.01em' }}>
                    Modelovereenkomst nr.: <span>{c.contractnummer || c.id}</span>
                    {c.projectNaam && <span style={{ marginLeft: '12px' }}>| Project: <span>{c.projectNaam}</span></span>}
                </div>
            </div>
            <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>A.</span> De partijen bij de overeenkomst</h3>
            <p style={pvS}>Ondergetekenden:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                <div style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'rgba(250,250,250,0.8)' }}>
                    <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#F5850A', textTransform: 'uppercase', marginBottom: '2px' }}>Aannemer</div>
                    <div style={pvRow}><span style={pvLabel}>naam:</span><span>De Schilders uit Katwijk</span></div>
                    <div style={pvRow}><span style={pvLabel}>straat:</span><span>Ambachtsweg 12</span></div>
                    <div style={pvRow}><span style={pvLabel}>postcode/plaats:</span><span>2223 AM Katwijk</span></div>
                    <div style={pvRow}><span style={pvLabel}>telefoon:</span><span>071-1234567</span></div>
                    <div style={pvRow}><span style={pvLabel}>KvK-nr:</span><span>12345678</span></div>
                    <div style={pvRow}><span style={pvLabel}>btw-nr:</span><span>NL123456789B01</span></div>
                </div>
                <div style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #dbeafe', background: 'rgba(248,250,255,0.8)' }}>
                    <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '2px' }}>Onderaannemer</div>
                    <div style={pvRow}><span style={pvLabel}>naam:</span><span style={pvField}>{c.medewerkerNaam}</span></div>
                    <div style={pvRow}><span style={pvLabel}>straat:</span><span style={pvField}>{c.medewerkerAdres || '—'}</span></div>
                    <div style={pvRow}><span style={pvLabel}>postcode/plaats:</span><span style={pvField}>{c.medewerkerPostcode || '—'}</span></div>
                    <div style={pvRow}><span style={pvLabel}>telefoon:</span><span style={pvField}>{c.medewerkerTelefoon}</span></div>
                    <div style={pvRow}><span style={pvLabel}>KvK-nr:</span><span style={pvField}>{c.medewerkerKvk || '—'}</span></div>
                    <div style={pvRow}><span style={pvLabel}>btw-nr:</span><span style={pvField}>{c.medewerkerBtw || '—'}</span></div>
                </div>
            </div>
            <p style={{ ...pvS, fontWeight: 600, marginTop: '6px' }}>Redenen om de overeenkomst van onderaanneming aan te gaan:</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Partijen willen met deze overeenkomst aangeven dat ze geen arbeidsovereenkomst noch gezagsverhouding in de zin van artikel 7:610 e.v. BW willen afsluiten maar een overeenkomst van aanneming van werk aangaan in de zin van artikel 7:750 BW.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Partijen willen de afspraken die zij hebben gemaakt schriftelijk vastleggen in deze overeenkomst van onderaanneming.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Aannemer hecht waarde aan verduurzaming en wil om die reden deze overeenkomst gebruiken als raamwerk voor nader te verstrekken digitale opdrachten.</p>
            <p style={{ ...pvS, fontWeight: 600, marginTop: '4px' }}>Uitgangspunten bij de overeenkomst van onderaanneming:</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>1. Onderaannemer accepteert de opdracht en aanvaardt daarmee de volle verantwoordelijkheid voor het op juiste wijze uitvoeren van de overeengekomen werkzaamheden en de oplevering van het overeengekomen resultaat.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>2. Onderaannemer deelt zijn werkzaamheden zelfstandig in. Wel vindt afstemming plaats met de aannemer, voor zover dat in geval van samenwerking met anderen voor de uitvoering van de opdracht nodig is.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>3. Aannemer verstrekt onderaannemer alle bevoegdheid en informatie benodigd voor een goede uitvoering van de opdracht.</p>
        </div>,

        // Pagina 2: Uitgangspunten 4-14 + disclaimer
        <div key="p2">
            <p style={{ ...pvS, paddingLeft: '8px' }}>4. Onderaannemer is bij het uitvoeren van de overeengekomen werkzaamheden geheel zelfstandig.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>5. De voor de uitvoering van de opdracht benodigde verfmaterialen (waaronder verf, primers, vulmiddelen, afplaktape en beschermingsfolie) worden door de aannemer ter beschikking gesteld. Partijen kiezen bewust voor deze praktische en economisch doelmatige werkwijze: de aannemer beschikt over vaste leverancierscontracten en volume-inkoopafspraken waardoor de materiaalkosten voor het project zo laag mogelijk worden gehouden — en daarmee ook de totale opdrachtsom voor de eindopdrachtgever. Het ter beschikking stellen van materialen door de aannemer wordt door partijen uitdrukkelijk aangemerkt als een zakelijke keuze die de zelfstandige positie van de onderaannemer op geen enkele wijze aantast. Onderaannemer blijft in alle overige opzichten zelfstandig ondernemer: hij beschikt over eigen vervoer, professioneel gereedschap en werkkleding, bepaalt zelfstandig zijn werkwijze en werktijden, en is vrij opdrachten van derden te aanvaarden.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>6. Onderaannemer verklaart dat hij geen werknemers zal aannemen of uitzendkrachten zal inlenen voor de uitvoering van de opdracht.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>7. De onderaannemer is niet gerechtigd derden in te schakelen, daar er sprake is van specifieke vaardigheden en kwaliteiten van de onderaannemer.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>8. De opdracht zal worden uitgevoerd met inachtneming van wettelijke voorschriften.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>9. Indien de opdracht wordt uitgevoerd op een bouwplaats waar ook werknemers werkzaam zijn, is de aannemer verantwoordelijk voor de naleving van de sectorale arbo-catalogus.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>10. Onderaannemer verstrekt de aannemer <strong><span style={{ color: '#C8700A' }}>{c.vcaCertificaat ? 'wel' : 'geen'}</span></strong> kopie van een geldig certificaat VOL VCA.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>11. De onderaannemer is volledig vrij in het aannemen van opdrachten van derden.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>12. De onderaannemer is niet afhankelijk van één opdrachtgever.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>13. De onderaannemer is verantwoordelijk voor schade die hij jegens derden veroorzaakt.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>14. De onderaannemer is ingeschreven bij de Kamer van Koophandel en heeft een btw-identificatienummer.</p>
            <p style={{ ...pvS, fontSize: '0.5rem', fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>Deze overeenkomst is gebaseerd op de door de Belastingdienst op 1 maart 2016 onder nummer 9081625181 beoordeelde overeenkomst. De goedkeuring en verlenging van deze overeenkomst is bij de Belastingdienst geregistreerd onder nummer 90821.22312.1.0.</p>
        </div>,

        // Pagina 3: B + C + D + E
        <div key="p3">
            <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>B.</span> Het werk</h3>
            <p style={pvS}>De aannemer verstrekt de afzonderlijke opdrachten per email aan de onderaannemer.</p>
            <p style={pvS}>Onderaannemer zal middels zijn gegeven akkoord, per e-mail (zie bijlage 1), de opdracht aanvaarden en overeenkomstig deze overeenkomst uitvoeren.</p>
            <p style={{ ...pvS, fontWeight: 600 }}>In deze email worden de volgende zaken benoemd:</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}><tbody>
                <tr><td style={{ ...pvTdS, fontWeight: 600, width: '160px' }}>Plaats/locatie:</td><td style={pvTdS}><span style={pvField}>{c.projectLocatie}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Projectnummer:</td><td style={pvTdS}><span style={pvField}>{c.projectId}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Beschrijving van het werk:</td><td style={pvTdS}><span style={pvField}>{c.werkzaamheden}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Start werkzaamheden:</td><td style={pvTdS}><span style={pvField}>{fmtDate(c.startDatum)}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Einddatum werkzaamheden:</td><td style={pvTdS}><span style={pvField}>{fmtDate(c.eindDatum)}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Aanneemsom:</td><td style={pvTdS}><span style={{ ...pvField, color: '#166534' }}>€ {c.totaalBedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW</span></td></tr>
            </tbody></table>
            <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>C.</span> Wijziging van de kosten en prijzen</h3>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Wijziging van kosten en prijzen worden <strong><span style={{ color: '#C8700A' }}>{c.kostenVerrekend === 'wel' ? 'wel' : 'niet'}</span></strong> verrekend/doorberekend</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- In geval van een afspraak over verrekening zal de onderaannemer transparantie betrachten en de aangepaste kosten en prijzen aan de aannemer inzichtelijk maken.</p>
            <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>D.</span> Weekrapporten, mandagenregister</h3>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- De onderaannemer zorgt <strong><span style={{ color: '#C8700A' }}>{c.weekrapporten === 'wel' ? 'wel' : 'niet'}</span></strong> voor het opmaken van weekrapporten</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- De onderaannemer houdt van het werk <strong><span style={{ color: '#C8700A' }}>{c.mandagenregister === 'wel' ? 'wel' : 'niet'}</span></strong> wekelijkse mandagenregisters bij</p>
            <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>E.</span> Betalingsregeling</h3>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Het aan de onderaannemer toekomende zal door hem kunnen worden gefactureerd in termijnen en telkens na het verschijnen van de desbetreffende termijn.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- De termijnen verschijnen periodiek, met tussenpozen van weken</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- De aannemer zal in alle gevallen rechtstreeks betalen aan de onderaannemer.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Op facturen dient het projectnummer vermeld te worden.</p>
        </div>,

        // Pagina 4: Termijnoverzicht + F + G + H
        <div key="p4">
            {c.totaalBedrag > 0 && (
                <div style={{ marginBottom: '10px', border: '1px solid #b8c4ce', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#2c3b4e', background: '#e8ecf0', padding: '5px 10px', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #b8c4ce' }}>Termijnoverzicht betalingen</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                        <thead><tr><th style={pvThS}>Termijn</th><th style={pvThS}>Bedrag excl. BTW</th></tr></thead>
                        <tbody>
                            {(() => {
                                const termijnBedragen = c.termijnBedragen && c.termijnBedragen.length === c.aantalTermijnen
                                    ? c.termijnBedragen
                                    : Array.from({ length: c.aantalTermijnen || 5 }, () => c.totaalBedrag / (c.aantalTermijnen || 5));
                                return termijnBedragen.map((bedrag, i) => (
                                    <tr key={i}>
                                        <td style={pvTdS}>Termijn {i + 1}</td>
                                        <td style={{ ...pvTdS, fontWeight: 600 }}>€ {(bedrag || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ));
                            })()}
                            <tr style={{ fontWeight: 700, background: '#e8ecf0', borderTop: '2px solid #9aaab8' }}>
                                <td style={pvTdS}>Totaal</td>
                                <td style={{ ...pvTdS, fontWeight: 700 }}>€ {c.totaalBedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
            <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>F.</span> Btw-verleggingsregeling</h3>
            <p style={pvS}>Op deze overeenkomst is de verleggingsregeling met betrekking tot de btw <strong><span style={{ color: '#5a7a96' }}>{c.btwVerlegd ? 'wel' : 'niet'}</span></strong> van toepassing.</p>
            <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>G.</span> Betalingstermijn</h3>
            <p style={pvS}>De aannemer zal, na het indienen van de factuur door de onderaannemer, de factuur binnen <strong><span style={pvField}>{c.betaaltermijn || '14 dagen na factuurdatum'}</span></strong> voldoen.</p>
            <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>H.</span> Verzekeringen</h3>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Onderaannemer is aansprakelijk voor eventuele tekortkomingen in het werk. Bij zodanige tekortkomingen is onderaannemer verplicht deze weg te nemen door de desbetreffende werkzaamheden op eerste verzoek van aannemer geheel voor eigen rekening opnieuw te verrichten.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- Onderaannemer is verplicht schade te vergoeden die voor aannemer en/of diens medewerkers ontstaat als gevolg van vertraging of enige andere tekortkoming van onderaannemer in de uitvoering van het werk.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>- De onderaannemer beschikt over een aansprakelijkheidsverzekering voor bedrijven (AVB).</p>
        </div>,

        // Pagina 5: I + Ondertekening
        <div key="p5">
            <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>I.</span> Slotbepalingen</h3>
            <p style={pvS}>Op alle geschillen die voortvloeien uit deze overeenkomst is het Nederlands recht van toepassing.</p>
            <p style={pvS}>Eventuele wijzigingen of aanvullingen op de bepalingen van deze overeenkomst kunnen uitsluitend schriftelijk tussen Partijen worden overeengekomen.</p>
            <p style={pvS}>Door het ondertekenen van deze overeenkomst verklaren partijen in het bezit te zijn van een exemplaar van deze overeenkomst en alle in deze overeenkomst genoemde bijlagen.</p>
            <p style={pvS}>Een exemplaar van deze overeenkomst en alle in deze overeenkomst genoemde en te voegen bijlagen zullen ook worden gegeven aan een eventuele hoofdaannemer.</p>
            <p style={{ ...pvS, fontWeight: 600, marginTop: '30px' }}>Aldus overeengekomen en in tweevoud opgemaakt, per bladzijde geparafeerd en ondertekend:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '40px' }}>
                <div style={{ border: '1px solid #d4dbe3', borderRadius: '4px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a7a96', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aannemer:</div>
                    <div style={{ borderBottom: '1px solid #2c3b4e', height: '80px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.aannemerHandtekening && <img src={c.aannemerHandtekening} style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} alt="Handtekening Aannemer" />}
                    </div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#2c3b4e' }}>De Schilders uit Katwijk</div>
                    <div style={{ fontSize: '0.56rem', color: '#475569', marginTop: '2px' }}>Namens: <strong>{c.aannemerNaam || 'André Hazenoot'}</strong></div>
                    <div style={{ fontSize: '0.54rem', color: '#6b7a8d', marginTop: '4px' }}>Plaats: Katwijk<br />Datum: {c.aannemerDatum ? fmtDate(c.aannemerDatum) : today}</div>
                </div>
                <div style={{ border: '1px solid #d4dbe3', borderRadius: '4px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a7a96', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Onderaannemer:</div>
                    <div style={{ borderBottom: '1px solid #2c3b4e', height: '80px', marginBottom: '8px', display: 'flex', alignItems: c.getekendHandtekening ? 'center' : 'end', justifyContent: 'center', fontSize: '0.5rem', color: '#94a3b8', fontWeight: 400, paddingBottom: c.getekendHandtekening ? '0' : '4px' }}>
                        {c.getekendHandtekening ? (
                            <img src={c.getekendHandtekening} style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} alt="Handtekening ZZP" />
                        ) : 'Handtekening'}
                    </div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#2c3b4e' }}><span style={pvField}>{c.medewerkerNaam}</span></div>
                    <div style={{ fontSize: '0.54rem', color: '#6b7a8d', marginTop: '4px' }}>Datum: {c.getekendDatum || '___________'}</div>
                </div>
            </div>
        </div>,

        // Pagina 6: Bijlage 1
        <div key="p6">
            <h3 style={{ ...pvTitle, fontSize: '0.72rem', borderBottom: '2px solid #1e293b' }}>BIJLAGE 1</h3>
            <p style={pvS}>Beste <span style={pvField}>{c.medewerkerNaam?.split(' ')[0]}</span>,</p>
            <p style={pvS}>Ingevolge de overeenkomst van onderaanneming getekend d.d. {today} doen wij (aannemer) u (onderaannemer) middels dit schrijven het voorstel tot uitvoering van de hieronder beschreven opdracht. Dit voorstel geldt als vrijblijvend aanbod.</p>
            <p style={{ ...pvS, fontWeight: 600 }}>De opdracht tot uitvoer van werkzaamheden omvat:</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}><tbody>
                <tr><td style={{ ...pvTdS, fontWeight: 600, width: '220px' }}>Plaats/locatie waar het werk wordt uitgevoerd:</td><td style={pvTdS}><span style={pvField}>{c.projectLocatie}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Projectnummer:</td><td style={pvTdS}><span style={pvField}>{c.projectId}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Start van de werkzaamheden:</td><td style={pvTdS}><span style={pvField}>{fmtDate(c.startDatum)}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Einddatum van de werkzaamheden:</td><td style={pvTdS}><span style={pvField}>{fmtDate(c.eindDatum)}</span></td></tr>
                <tr><td style={{ ...pvTdS, fontWeight: 600 }}>Aanneemsom:</td><td style={pvTdS}><span style={{ ...pvField, color: '#166534' }}>€ {c.totaalBedrag?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW</span></td></tr>
            </tbody></table>
            <p style={pvS}>Genoemde bedragen zijn exclusief BTW, inclusief parkeerkosten, transportkosten, e.d.</p>
            <p style={{ ...pvS, marginTop: '6px' }}>Wij verzoeken u het bijgevoegde contract van onderaanneming goed door te lezen. Indien u akkoord gaat met de inhoud en de daarin opgenomen voorwaarden, dient u:</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>1. Elke bladzijde van het contract te <strong>paraferen</strong> (initialen onderaan elke pagina).</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>2. De laatste pagina volledig te <strong>ondertekenen</strong>.</p>
            <p style={{ ...pvS, paddingLeft: '8px' }}>3. Het getekende contract zo spoedig mogelijk <strong>te retourneren</strong> aan De Schilders uit Katwijk, via e-mail naar <strong>info@deschildersuitkatwijk.nl</strong> of per post.</p>
            <p style={pvS}>Door het ondertekend retourneren van dit contract aanvaardt u de hierboven beschreven opdracht en verbindt u zich aan de in de overeenkomst van onderaanneming d.d. {today} opgenomen afspraken en voorwaarden.</p>
            <p style={pvS}>Indien dit contract niet getekend geretourneerd is, kunnen facturen niet in behandeling worden genomen.</p>
            <p style={{ ...pvS, marginTop: '16px' }}>Met vriendelijke groet,<br /><br /><strong>De Schilders uit Katwijk</strong><br /><span style={{ fontSize: '0.66rem', color: '#475569', display: 'inline-block', marginTop: '2px' }}>Namens: <strong>{contract.aannemerNaam || 'André Hazenoot'}</strong></span></p>
        </div>
    ];

    const handleBack = () => {
        if (window.opener) {
            window.close();
        } else {
            router.back();
        }
    };

    // ─── Signed Banner ───
    // ─── Signed Banner ───
    const SignedBanner = signed ? (
        <div className="no-print" style={{ background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)', padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>✅</div>
                <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.2 }}>Contract Ondertekend</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                        Ondertekend op {c.getekendDatum} · {c.projectNaam}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={handleBack} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', background: 'transparent', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
                    ← Vorige
                </button>
                <button onClick={handlePrintPdf} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
                    💾 Afdrukvoorbeeld / Opslaan als PDF
                </button>
            </div>
        </div>
    ) : null;

    const isAannemerMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'aannemer';
    const hasAannemerSigned = c?.aannemerHandtekening;

    const AannemerBanner = (isAannemerMode && hasAannemerSigned && !signed) ? (
        <div className="no-print" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✅</div>
                <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, lineHeight: 1.2 }}>Je handtekening is geplaatst!</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>
                        Klopt het document met de handtekening daarop zo? Stuur de unieke ZZP-link dan direct door via WhatsApp! 
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleBack} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', background: 'transparent', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
                    ← Terug (Annuleren)
                </button>
                <button onClick={() => {
                    const signUrl = `${window.location.origin}/contract/${c.id}`;
                    const msg = `Hoi ${c.medewerkerNaam.split(' ')[0]},\n\nHierbij de definitieve versie van contract *${c.contractnummer || 'SUK-' + c.id}*. Ik heb hem zojuist digitaal ondertekend en geparafeerd.\n\nControleer de overeenkomst rustig. Als alles klopt, kun je digitaal je handtekening plaatsen via de beveiligde link hieronder:\n\n👉 *Bekijken en tekenen:*\n${signUrl}\n\nAlvast bedankt!`;
                    let targetPhone = (c.medewerkerTelefoon || '').replace(/^0/, '31');
                    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                    window.location.href = '/whatsapp?tab=overzicht_contract';
                }} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#25D366', color: '#fff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-brands fa-whatsapp"></i> Deel ZZP-link via WhatsApp
                </button>
            </div>
        </div>
    ) : null;

    return (
        <div style={{ height: '100%', overflowY: 'auto', background: '#dde1e7', fontFamily: PVFONT }}>
            {/* Print CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap');
                @media print {
                    .no-print { display: none !important; }
                    nav, header, footer, aside { display: none !important; }
                    @page { size: A4 portrait; margin: 0; }
                    html, body { background: #fff !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; width: 100%; height: 100%; }
                    .print-contract { padding: 0 !important; margin: 0 !important; max-width: 100% !important; box-shadow: none !important; gap: 0 !important; display: block !important; transform: none !important; }
                    .print-contract > div { position: relative !important; width: 620px !important; height: 876px !important; zoom: 1.28 !important; max-width: none !important; border-radius: 0 !important; box-shadow: none !important; border: none !important; margin: 0 !important; overflow: hidden !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
                    .print-contract > div:last-of-type { page-break-after: auto; break-after: auto; }
                    .print-contract > div * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}} />
            {SignedBanner}
            {AannemerBanner}

            {/* Let op balk */}
            {(!signed && !AannemerBanner) && (
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(250,160,82,0.08)', borderLeft: '4px solid #F5850A', padding: '12px 20px', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5, maxWidth: '800px', margin: '0 auto' }}>
                    <div>
                        <strong>⚠️ Lees de overeenkomst zorgvuldig door.</strong> Scroll naar beneden om {isAannemerMode ? 'jouw eigen handtekening te plaatsen' : 'digitaal te ondertekenen'}.
                    </div>
                    <button onClick={handleBack} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(146,64,14,0.3)', cursor: 'pointer', background: '#ffe4c4', color: '#92400e', fontSize: '0.7rem', fontWeight: 700, marginLeft: '12px', flexShrink: 0 }}>
                        ← Terug
                    </button>
                </div>
            )}



            {/* Zoom controls */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px 0', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(221,225,231,0.92)', backdropFilter: 'blur(6px)' }}>
                <button onClick={zoomOut} title="Uitzoomen" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#1e293b', color: '#fff', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>−</button>
                <span style={{ minWidth: '54px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', background: '#fff', borderRadius: '8px', padding: '4px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} title="Inzoomen" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#1e293b', color: '#fff', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>+</button>
                <button onClick={() => setZoom(1.0)} title="Reset zoom" style={{ marginLeft: '4px', padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>Reset</button>
            </div>

            {/* ═══ PAGINA'S — exact gelijk aan preview ═══ */}
            <div className="print-contract" style={{
                maxWidth: '660px', margin: '0 auto', padding: '16px 16px 80px',
                display: 'flex', flexDirection: 'column', gap: '24px',
                transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease'
            }}>
                {pages.map((pageContent, pageIdx) => (
                    <div key={pageIdx} style={{
                        position: 'relative', background: '#fff', borderRadius: '8px',
                        width: '620px', height: `${PAGE_H}px`, margin: '0 auto',
                        padding: `${pageIdx === 0 ? PT + 40 : PT}px ${PS}px ${PB}px`,
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
                        {/* Paginanummer */}
                        <div style={{
                            position: 'absolute', top: '14px', right: '50px',
                            fontSize: '0.54rem', fontWeight: 600, color: '#94a3b8',
                            zIndex: 2, pointerEvents: 'none',
                            background: 'rgba(255,255,255,0.7)', padding: '1px 6px', borderRadius: '3px',
                        }}>
                            Pagina {pageIdx + 1} van {pages.length}
                        </div>
                        {/* Paraaf blok onderin (wordt ook geprint!) */}
                        <div style={{
                            position: 'absolute',
                            bottom: `${PB - 40}px`,
                            left: `${PS}px`,
                            right: `${PS}px`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            zIndex: 2,
                            pointerEvents: 'none',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ height: '45px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    {c.aannemerParaaf || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'aannemer' && tempParaaf) ? (
                                        <img src={c.aannemerParaaf || tempParaaf} style={{ maxHeight: '45px', maxWidth: '100px', opacity: 1, filter: 'contrast(1.2) brightness(0.95)' }} alt="Paraaf Aannemer" />
                                    ) : (
                                        <div style={{ width: '90px', borderBottom: '1.5px solid #2c3b4e', height: '16px', marginBottom: '8px' }}></div>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.48rem', color: '#475569', fontFamily: "'Carlito','Calibri',Arial,sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Paraaf Aannemer</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ height: '45px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    {c.getekendParaaf || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') !== 'aannemer' && tempParaaf) ? (
                                        <img src={c.getekendParaaf || tempParaaf} style={{ maxHeight: '45px', maxWidth: '100px', opacity: 1, filter: 'contrast(1.2) brightness(0.95)' }} alt="Paraaf Onderaannemer" />
                                    ) : (
                                        <div style={{ width: '90px', borderBottom: '1.5px solid #2c3b4e', height: '16px', marginBottom: '8px' }}></div>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.48rem', color: '#475569', fontFamily: "'Carlito','Calibri',Arial,sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Paraaf Onderaannemer</div>
                            </div>
                        </div>
                        {/* Inhoud */}
                        <div
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            style={{
                                position: 'relative', zIndex: 1, height: '100%', overflow: 'hidden',
                                fontSize: '0.7rem', fontFamily: PVFONT,
                                cursor: 'text', outline: 'none',
                                paddingBottom: '30px' // Ruimte voor paraaf
                            }}
                            onFocus={e => e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(59,130,246,0.25)'}
                            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                        >{pageContent}</div>
                    </div>
                ))}

                {/* ═══ SIGNATURE PAD ═══ */}
                {(!signed && !(isAannemerMode && hasAannemerSigned)) && <div className="no-print" style={{ marginTop: '20px' }}>
                    {!isSigning ? (
                        <button onClick={() => setIsSigning(true)}
                            style={{
                                width: '100%', padding: '18px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#fff',
                                fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                boxShadow: '0 4px 16px rgba(37,211,102,0.3)'
                            }}>
                            {isAannemerMode 
                                ? '✍️ Ik plaats hier mijn paraaf en handtekening (als Aannemer)' 
                                : '✍️ Ik ga digitaal akkoord met deze overeenkomst'}
                        </button>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                                    {signingStep === 1 ? '✍️ Stap 1/2: Zet je paraaf' : '✍️ Stap 2/2: Zet je volledige handtekening'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                    {signingStep === 1 ? 'Je paraaf wordt onderaan elke pagina geplaatst.' : 'Je handtekening komt onderaan het document.'} Gebruik je vinger of muis.
                                </div>
                            </div>
                            <canvas ref={canvasRef}
                                style={{ width: '100%', height: '200px', cursor: 'crosshair', touchAction: 'none', background: '#fefce8' }} />
                            
                            <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                                <button onClick={clearCanvas}
                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                                    🗑️ Wissen
                                </button>
                                <button onClick={checkNextStep} disabled={!hasDrawn}
                                    style={{
                                        flex: 2, padding: '12px', borderRadius: '10px', border: 'none', cursor: hasDrawn ? 'pointer' : 'not-allowed',
                                        background: hasDrawn ? '#22c55e' : '#cbd5e1', color: '#fff', fontSize: '0.85rem', fontWeight: 700
                                    }}>
                                    {signingStep === 1 ? 'Opslaan & Volgende' : '✅ Handtekening Maken'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>}
            </div>

            {/* SUCCES OVERLAY */}
            {showSuccess && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 9999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{
                        width: '120px', height: '120px',
                        background: '#22c55e', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '4rem',
                        boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)',
                        marginBottom: '30px',
                        animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        ✅
                    </div>
                    <h2 style={{
                        fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px',
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        Succesvol Ondertekend!
                    </h2>
                    <p style={{
                        fontSize: '1.1rem', color: '#64748b', maxWidth: '400px', textAlign: 'center',
                        lineHeight: 1.5, fontFamily: "'Inter', sans-serif", marginBottom: '30px'
                    }}>
                        {isAannemerMode
                            ? 'Jouw handtekening staat netjes op zijn plek. Je kunt hem nu rustig controleren op de achtergrond!'
                            : 'Het document is nu officieel en definitief. Je kunt direct een kopie opslaan voor je eigen administratie.'}
                    </p>

                    {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') !== 'aannemer' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
                            <button onClick={handlePrintPdf} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(59,130,246,0.4)', animation: 'popIn 0.8s' }}>
                                💾 Afdrukvoorbeeld / Opslaan als PDF
                            </button>
                            
                            <button onClick={() => {
                                const msg = `Hoi,\n\nIk heb zojuist het contract *${c.contractnummer || 'SUK-' + c.id}* digitaal getekend! Alles is helemaal rond.\n\nGroetjes,\n${c.medewerkerNaam.split(' ')[0]}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                            }} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#25D366', color: '#fff', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(37,211,102,0.3)', animation: 'popIn 1.0s' }}>
                                📲 Stuur appje ter bevestiging
                            </button>
                            <button onClick={() => setShowSuccess(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', marginTop: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                Sluiten
                            </button>
                        </div>
                    )}
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes popIn { 
                            0% { transform: scale(0); opacity: 0; }
                            80% { transform: scale(1.1); }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
