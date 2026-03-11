'use client';

import { useState, useEffect, useRef } from 'react';

// ════════════════════════════════════════
// HERBRUIKBARE ZOEK-SELECT COMPONENT
// options: [{ value, label, subtitle?, icon? }]
// ════════════════════════════════════════
function SearchSelect({ label, value, onChange, options, placeholder = 'Zoek...', labelStyle, inputStyle }) {
    const [zoek, setZoek] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Toon de label van de geselecteerde waarde in het veld
    const selected = options.find(o => o.value === value);
    const displayValue = open ? zoek : (selected?.label || '');

    useEffect(() => {
        if (!open) setZoek('');
    }, [open]);

    // Klik buiten → sluit
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = options.filter(o =>
        !zoek || o.label.toLowerCase().includes(zoek.toLowerCase()) ||
        (o.subtitle || '').toLowerCase().includes(zoek.toLowerCase())
    );

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {label && <label style={labelStyle}>{label}</label>}
            <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem', pointerEvents: 'none' }}></i>
                <input
                    style={{ ...inputStyle, paddingLeft: '30px', paddingRight: '28px' }}
                    value={open ? zoek : displayValue}
                    onChange={e => { setZoek(e.target.value); setOpen(true); }}
                    onFocus={() => { setOpen(true); setZoek(''); }}
                    placeholder={placeholder}
                    readOnly={!open}
                />
                {value && !open
                    ? <i className="fa-solid fa-check" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: '0.72rem' }}></i>
                    : <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.65rem', pointerEvents: 'none' }}></i>
                }
            </div>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 300, maxHeight: '200px', overflowY: 'auto' }}>
                    {filtered.length === 0
                        ? <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>Geen resultaten</div>
                        : filtered.map(o => (
                            <div key={o.value}
                                onMouseDown={() => { onChange(o.value); setOpen(false); }}
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', background: o.value === value ? '#eef2f7' : '#fff', fontWeight: o.value === value ? 600 : 400, display: 'flex', flexDirection: 'column', gap: '1px' }}
                                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? '#eef2f7' : '#fff'; }}
                            >
                                <span>
                                    {o.icon && <i className={`fa-solid ${o.icon}`} style={{ marginRight: '6px', color: '#94a3b8', fontSize: '0.7rem' }}></i>}
                                    {o.label}
                                </span>
                                {o.subtitle && <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>{o.subtitle}</span>}
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════
// DEMO DATA
// ════════════════════════════════════════

const DEMO_PROJECTEN = [
    { id: '1', name: 'Schilderwerk Familie Bakker', locatie: 'Dorpsstraat 14, Haarlem' },
    { id: '2', name: 'Renovatie Kantoorpand Den Haag', locatie: 'Laan van NOI 75, Den Haag' },
    { id: '3', name: 'Appartementen Katwijk', locatie: 'Boulevard 22, Katwijk' },
    { id: '4', name: 'VVE De Branding', locatie: 'Strandweg 1, Noordwijk' },
];

const DEMO_MEDEWERKERS = [
    { id: '1', naam: 'Kevin van der Berg', telefoon: '0612345678', type: 'zzp', kvk: '87654321', uurtarief: 40 },
    { id: '2', naam: 'Piet Kwast', telefoon: '0687654321', type: 'medewerker', uurtarief: 0 },
    { id: '3', naam: 'Henk de Vries', telefoon: '0676543210', type: 'medewerker', uurtarief: 0 },
];

export default function WhatsAppPage() {
    const [activeTab, setActiveTab] = useState('uren');

    // Lees ?tab= param eenmalig bij mount (vervangt useSearchParams om render-loops te voorkomen)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search).get('tab');
            if (p) setActiveTab(p);
        }
    }, []); // lege deps = alleen bij mount

    // ─── Shared State ───
    const [medewerkers, setMedewerkers] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem('wa_medewerkers')); if (s) return s; } catch { }
        return DEMO_MEDEWERKERS;
    });
    const [projecten, setProjecten] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem('wa_projecten')); if (s) return s; } catch { }
        return DEMO_PROJECTEN;
    });
    const [urenLog, setUrenLog] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem('wa_uren_log')); if (s) return s; } catch { }
        return [];
    });
    const [contracten, setContracten] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem('wa_contracten')); if (s) return s; } catch { }
        return [];
    });

    // Save
    useEffect(() => { localStorage.setItem('wa_medewerkers', JSON.stringify(medewerkers)); }, [medewerkers]);
    useEffect(() => { localStorage.setItem('wa_projecten', JSON.stringify(projecten)); }, [projecten]);
    useEffect(() => { localStorage.setItem('wa_uren_log', JSON.stringify(urenLog)); }, [urenLog]);
    useEffect(() => { localStorage.setItem('wa_contracten', JSON.stringify(contracten)); }, [contracten]);

    // ─── Module 1: Uren Helpers ───
    const [showNewMedewerker, setShowNewMedewerker] = useState(false);
    const [newMw, setNewMw] = useState({ naam: '', telefoon: '', type: 'medewerker', uurtarief: 0, kvk: '', btwNummer: '', adres: '', postcode: '', vcaVerloopdatum: '', avbVerloopdatum: '', cavVerloopdatum: '' });

    // ─── Modelovereenkomst panel collapse states ───
    const [showBriefpapierPanel, setShowBriefpapierPanel] = useState(true);
    const [showContractFormPanel, setShowContractFormPanel] = useState(true);
    const [showVoorbeeldPanel, setShowVoorbeeldPanel] = useState(true);
    const [autoVerdeel, setAutoVerdeel] = useState(true);

    const addMedewerker = () => {
        if (!newMw.naam.trim()) return;
        setMedewerkers(prev => [...prev, { ...newMw, id: String(Date.now()) }]);
        setNewMw({ naam: '', telefoon: '', type: 'medewerker', uurtarief: 0, kvk: '', btwNummer: '', adres: '', postcode: '', vcaVerloopdatum: '', avbVerloopdatum: '', cavVerloopdatum: '' });
        setShowNewMedewerker(false);
    };

    const [showNewProject, setShowNewProject] = useState(false);
    const [newPrj, setNewPrj] = useState({ name: '', locatie: '' });

    const addProject = () => {
        if (!newPrj.name.trim()) return;
        setProjecten(prev => [...prev, { ...newPrj, id: String(Date.now()) }]);
        setNewPrj({ name: '', locatie: '' });
        setShowNewProject(false);
    };

    // ─── Chatbot Simulation ───
    const [simStep, setSimStep] = useState(0);
    const [simMw, setSimMw] = useState(null);
    const [simContract, setSimContract] = useState(null); // ← vast contract (DBA)
    const [simPrj, setSimPrj] = useState(null);           // ← werkelijk project (bewaking)
    const [simUren, setSimUren] = useState('');
    const [simPauze, setSimPauze] = useState('30');
    const [simMessages, setSimMessages] = useState([]);

    const startSim = (mw) => {
        setSimMw(mw);
        setSimStep(0);
        setSimContract(null);
        setSimPrj(null);
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';

        // ── Automatisch contract zoeken voor deze medewerker ──
        const actiefContract = contracten.find(c =>
            c.medewerkerId === mw.id && c.status !== 'beeindigd'
        );
        setSimContract(actiefContract || null);

        if (actiefContract) {
            setSimMessages([
                { from: 'user', text: 'Hoi' },
                { from: 'bot', text: `${greeting} ${mw.naam.split(' ')[0]}! 👋\n\n📋 ${actiefContract.contractnummer || 'SUK-' + actiefContract.id.slice(-6).toUpperCase()}\n📄 ${actiefContract.projectNaam}\n\nJe uren worden op dit contract geboekt.\nAan welk project heb je vandaag gewerkt?` }
            ]);
        } else {
            setSimMessages([
                { from: 'user', text: 'Hoi' },
                { from: 'bot', text: `${greeting} ${mw.naam.split(' ')[0]}! 👋\n\n⚠️ Geen actief contract gevonden.\nJe kunt uren registreren, maar het contract moet binnen 7 dagen worden verstuurd.\n\nAan welk project heb je vandaag gewerkt?` }
            ]);
        }
        setSimStep(1);
    };

    // ZZP kiest werkelijk project (vrije keuze — los van contract)
    const simSelectProject = (prj) => {
        setSimPrj(prj);
        setSimStep(2);
        setSimMessages(prev => [
            ...prev,
            { from: 'user', text: prj.name },
            { from: 'bot', text: `📍 ${prj.name}\n\nHoeveel uur heb je vandaag gewerkt?\n\n⏱️ Kies: 4 | 6 | 7.5 | 8 uur\nOf typ een ander aantal.` }
        ]);
    };

    const simSelectUren = (uren) => {
        setSimUren(uren);
        setSimStep(3);
        setSimMessages(prev => [
            ...prev,
            { from: 'user', text: `${uren} uur` },
            { from: 'bot', text: `${uren} uur genoteerd! ✅\n\nHoeveel minuten pauze heb je gehad?\n\n☕ Kies: 0 | 15 | 30 | 45 | 60 min` }
        ]);
    };

    const simSelectPauze = (pauze) => {
        setSimPauze(pauze);
        setSimStep(4);
        const today = new Date().toISOString().split('T')[0];
        const nieuweUren = parseFloat(simUren);
        const newEntry = {
            id: String(Date.now()),
            datum: today,
            medewerkerId: simMw.id,
            medewerkerNaam: simMw.naam,
            // Officieel: altijd op contract (DBA-compliant)
            contractId: simContract?.id || null,
            projectId: simContract?.projectId || simPrj?.id || null,
            projectNaam: simContract?.projectNaam || simPrj?.name || '—',
            preContract: !simContract,
            preContractDatum: !simContract ? today : null,
            // Intern: werkelijk project voor projectbewaking
            werkelijkProjectId: simPrj?.id || null,
            werkelijkProjectNaam: simPrj?.name || null,
            internProjectId: simPrj?.id || null,
            uren: nieuweUren,
            pauze: parseInt(pauze),
            tijdstempel: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
        };

        // ── Bereken termijn-status na toevoeging ──
        let termijnStatusTekst = '';
        if (simContract) {
            const contract = simContract;
            const contractTotaal = contract.totaalBedrag || contract.totaalOvereenkomst || 0;
            const termijnBedragen = contract.termijnBedragen?.length === contract.aantalTermijnen
                ? contract.termijnBedragen
                : Array.from({ length: contract.aantalTermijnen || 1 }, () => contractTotaal / (contract.aantalTermijnen || 1));

            // Uren inclusief zojuist geregistreerde
            const bestaandeUren = urenLog
                .filter(u => u.medewerkerId === contract.medewerkerId && u.projectId === contract.projectId)
                .reduce((s, u) => s + u.uren, 0);
            const totaalUren = bestaandeUren + nieuweUren;

            const drempels = termijnBedragen.map((_, i) => {
                const cumulBedrag = termijnBedragen.slice(0, i + 1).reduce((s, b) => s + (b || 0), 0);
                return contract.uurtarief > 0 ? cumulBedrag / contract.uurtarief : 0;
            });

            const bereikteTermijnen = drempels.filter(d => totaalUren >= d).length;
            const actiefIdx = Math.min(bereikteTermijnen, drempels.length - 1);
            const vorigeDrempel = actiefIdx > 0 ? drempels[actiefIdx - 1] : 0;
            const huidigeDrempel = drempels[actiefIdx];
            const vensterGrootte = huidigeDrempel - vorigeDrempel;
            const urenInVenster = Math.max(0, totaalUren - vorigeDrempel);
            const progressPct = vensterGrootte > 0 ? Math.min(Math.round((urenInVenster / vensterGrootte) * 100), 100) : 100;

            // Voortgangsbalk (ASCII)
            const barLen = 10;
            const filled = Math.round(progressPct / 100 * barLen);
            const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

            const termijnLabels = drempels.map((d, i) =>
                totaalUren >= d ? '✅' : (i === actiefIdx ? '🔄' : '🔒')
            ).join(' ');

            const volgendeDrempel = huidigeDrempel > totaalUren ? huidigeDrempel : null;
            const resterend = volgendeDrempel ? (volgendeDrempel - totaalUren).toFixed(1) : null;

            // ── Financiële status ──
            const verdiendBedrag = Math.min(totaalUren * contract.uurtarief, contractTotaal);
            const factureerbareBedrag = termijnBedragen.slice(0, bereikteTermijnen).reduce((s, b) => s + (b || 0), 0);
            const resterendBedrag = contractTotaal - factureerbareBedrag;

            // Mini termijn-overzicht per rij
            const termijnRegels = termijnBedragen.map((b, i) => {
                const icon = totaalUren >= drempels[i] ? '✅' : (i === actiefIdx ? '🔄' : '🔒');
                const eur = `€ ${(b || 0).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`;
                return `${icon} T${i + 1}: ${eur} (na ${drempels[i].toFixed(0)}u)`;
            }).join('\n');

            const fmt = (n) => `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            // Euro's verdiend binnen de actieve termijn
            const eurosInTermijn = Math.round(urenInVenster * contract.uurtarief);
            const termijnTotaal = termijnBedragen[actiefIdx] || 0;

            termijnStatusTekst = `\n\n💰 Termijn ${actiefIdx + 1} van ${drempels.length}  —  € ${eurosInTermijn.toLocaleString('nl-NL')} ingediend van de € ${termijnTotaal.toLocaleString('nl-NL')}${!resterend ? '\n🎉 Termijn bereikt — factureerbaar!' : ''}`;

        }

        setUrenLog(prev => [newEntry, ...prev]);

        const contractInfo = simContract
            ? `📋 ${simContract.contractnummer || 'SUK-' + simContract.id.slice(-6).toUpperCase()} · ${simContract.projectNaam}`
            : '⚠️ Pre-contract registratie';
        setSimMessages(prev => [
            ...prev,
            { from: 'user', text: `${pauze} min` },
            { from: 'bot', text: `✅ Uren opgeslagen!\n\n👤 ${simMw.naam}\n${contractInfo}\n📍 Gewerkt op: ${simPrj?.name || '—'}\n⏱️ ${simUren} uur · ☕ ${pauze} min pauze\n📅 ${new Date().toLocaleDateString('nl-NL')}${termijnStatusTekst}\n\nBedankt! Tot morgen 👋` }
        ]);
    };

    const resetSim = () => {
        setSimStep(0);
        setSimMw(null);
        setSimContract(null);
        setSimPrj(null);
        setSimUren('');
        setSimPauze('30');
        setSimMessages([]);
    };

    // ─── Module 2: Contract Helpers ───
    const [showNewContract, setShowNewContract] = useState(false);
    const [contractSubTab, setContractSubTab] = useState('nieuw');
    const [newContract, setNewContract] = useState({
        medewerkerId: '', projectId: '',
        werkzaamheden: 'Schilderwerk binnen/buiten',
        startDatum: new Date().toISOString().split('T')[0],
        eindDatum: '',
        uurtarief: 40,
        totaalUren: 250,
        totaalOvereenkomst: 10000,
        betaaltermijn: '14 dagen na factuurdatum',
        aantalTermijnen: 5,
        termijnBedragen: [2000, 2000, 2000, 2000, 2000],
        vcaCertificaat: 'wel',
        btwVerlegd: 'wel',
        weekrapporten: 'wel',
        mandagenregister: 'wel',
        kostenVerrekend: 'niet',
    });

    // ─── Briefpapier Upload ───
    const briefpapierInputRef = useRef(null);
    const [briefpapierPreview, setBriefpapierPreview] = useState(null);
    const [briefpapierUploading, setBriefpapierUploading] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('wa_briefpapier');
            if (saved) setBriefpapierPreview(saved);
        } catch { }
    }, []);

    const handleBriefpapierUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBriefpapierUploading(true);

        if (file.type === 'application/pdf') {
            // Load pdf.js from CDN and render first page
            try {
                const pdfjsScript = document.createElement('script');
                pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                document.head.appendChild(pdfjsScript);
                await new Promise(resolve => { pdfjsScript.onload = resolve; });
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const scale = 2;
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                const dataUrl = canvas.toDataURL('image/png', 0.9);
                localStorage.setItem('wa_briefpapier', dataUrl);
                setBriefpapierPreview(dataUrl);
            } catch (err) {
                console.error('PDF render error:', err);
                alert('Fout bij het verwerken van de PDF. Probeer een afbeelding (PNG/JPG) te uploaden.');
            }
        } else {
            // Image file — just read as data URL
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                localStorage.setItem('wa_briefpapier', dataUrl);
                setBriefpapierPreview(dataUrl);
            };
            reader.readAsDataURL(file);
        }
        setBriefpapierUploading(false);
    };

    const removeBriefpapier = () => {
        localStorage.removeItem('wa_briefpapier');
        setBriefpapierPreview(null);
        if (briefpapierInputRef.current) briefpapierInputRef.current.value = '';
    };

    // ─── Contract Sjablonen Systeem ───
    // GOEDGEKEURD STANDAARD SJABLOON (10 maart 2026)
    const DEFAULT_TEMPLATE = {
        id: 'standaard',
        name: 'Standaard — DeSchilders',
        version: 4, // bump to overwrite old cached templates
        paddingTop: 110,     // ruimte voor briefpapier-logo bovenaan
        paddingBottom: 120,  // ruimte voor briefpapier-footer onderaan
        paddingSides: 48,
        fontSize: 0.72,
        titleSize: 0.82,
        labelWidth: 120,
        pageBreaks: [3, 14, 'D', 'G', 'sign'],
    };

    const [contractTemplates, setContractTemplates] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('wa_contract_templates'));
            if (saved && saved.length) {
                const hasNewDefault = saved.some(t => t.id === 'standaard' && (t.version || 0) >= 4);
                if (hasNewDefault) return saved;
                // Update het standaard sjabloon naar de nieuwste versie
                return saved.map(t => t.id === 'standaard' ? DEFAULT_TEMPLATE : t);
            }
        } catch { }
        return [DEFAULT_TEMPLATE];
    });
    const [activeTemplateId, setActiveTemplateId] = useState(() => {
        try {
            return localStorage.getItem('wa_active_template') || 'standaard';
        } catch { return 'standaard'; }
    });
    const [showTemplateSettings, setShowTemplateSettings] = useState(false);

    const activeTemplate = contractTemplates.find(t => t.id === activeTemplateId) || DEFAULT_TEMPLATE;
    const pageContentRefs = useRef([]);
    const editorRef = useRef(null);
    const [editorHeight, setEditorHeight] = useState(0);

    const lastEditorHeightRef = useRef(0);
    useEffect(() => {
        if (!editorRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const h = entry.target.scrollHeight;
                if (h !== lastEditorHeightRef.current) {
                    lastEditorHeightRef.current = h;
                    setEditorHeight(h);
                }
            }
        });
        observer.observe(editorRef.current);
        return () => observer.disconnect();
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('wa_contract_templates', JSON.stringify(contractTemplates));
    }, [contractTemplates]);
    useEffect(() => {
        localStorage.setItem('wa_active_template', activeTemplateId);
    }, [activeTemplateId]);

    const updateActiveTemplate = (key, value) => {
        setContractTemplates(prev => prev.map(t =>
            t.id === activeTemplateId ? { ...t, [key]: value } : t
        ));
    };

    const capturePageContents = () => {
        const contents = [];
        pageContentRefs.current.forEach((ref) => {
            contents.push(ref ? ref.innerHTML : null);
        });
        return contents;
    };

    const saveCurrentTemplate = () => {
        const pageContents = capturePageContents();
        setContractTemplates(prev => prev.map(t =>
            t.id === activeTemplateId ? { ...t, pageContents } : t
        ));
    };

    const saveTemplateAs = (name) => {
        const newId = 'tpl_' + Date.now();
        const pageContents = capturePageContents();
        const newTpl = { ...activeTemplate, id: newId, name, pageContents };
        setContractTemplates(prev => [...prev, newTpl]);
        setActiveTemplateId(newId);
    };

    const deleteTemplate = (id) => {
        if (id === 'standaard') return; // can't delete default
        setContractTemplates(prev => prev.filter(t => t.id !== id));
        if (activeTemplateId === id) setActiveTemplateId('standaard');
    };

    const generateContract = () => {
        const mw = medewerkers.find(m => m.id === newContract.medewerkerId);
        const prj = projecten.find(p => p.id === newContract.projectId);
        if (!mw || !prj) return;
        const totaal = newContract.totaalOvereenkomst || (newContract.uurtarief * newContract.totaalUren);

        // ── Auto contractnummer: DS-JJJJ-NNNN ──
        const jaar = new Date().getFullYear();
        const bestaandeDitJaar = contracten.filter(c => c.contractnummer?.startsWith(`SUK-${jaar}-`)).length;
        const volgnummer = String(bestaandeDitJaar + 1).padStart(4, '0');
        const contractnummer = `SUK-${jaar}-${volgnummer}`;

        setContracten(prev => [...prev, {
            id: String(Date.now()),
            contractnummer,                        // ← primaire identifier
            medewerkerId: mw.id, medewerkerNaam: mw.naam, medewerkerTelefoon: mw.telefoon, medewerkerKvk: mw.kvk || '',
            medewerkerBtw: mw.btwNummer || '', medewerkerAdres: mw.adres || '', medewerkerPostcode: mw.postcode || '',
            projectId: prj.id, projectNaam: prj.name, projectLocatie: prj.locatie,
            werkzaamheden: newContract.werkzaamheden,
            startDatum: newContract.startDatum, eindDatum: newContract.eindDatum,
            uurtarief: newContract.uurtarief, totaalUren: newContract.totaalUren,
            totaalBedrag: totaal, totaalOvereenkomst: totaal,
            betaaltermijn: newContract.betaaltermijn,
            aantalTermijnen: newContract.aantalTermijnen,
            termijnBedragen: newContract.termijnBedragen || [],
            vcaCertificaat: newContract.vcaCertificaat,
            btwVerlegd: newContract.btwVerlegd,
            weekrapporten: newContract.weekrapporten,
            mandagenregister: newContract.mandagenregister,
            kostenVerrekend: newContract.kostenVerrekend,
            status: 'concept',
            getekend: false, getekendDatum: '',
            aangemaakt: new Date().toISOString(),
        }]);
        setShowNewContract(false);
        setNewContract({
            medewerkerId: '', projectId: '', werkzaamheden: 'Schilderwerk binnen/buiten',
            startDatum: new Date().toISOString().split('T')[0], eindDatum: '',
            uurtarief: 40, totaalUren: 250, totaalOvereenkomst: 10000,
            betaaltermijn: '14 dagen na factuurdatum', aantalTermijnen: 5,
            termijnBedragen: [2000, 2000, 2000, 2000, 2000],
            vcaCertificaat: 'wel', btwVerlegd: 'wel', weekrapporten: 'wel',
            mandagenregister: 'wel', kostenVerrekend: 'niet',
        });
    };

    const sendContractWhatsApp = (contract) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const phone = contract.medewerkerTelefoon.replace(/^0/, '31');
        const msg = `📄 Je opdrachtovereenkomst staat klaar!\n\nHoi ${contract.medewerkerNaam.split(' ')[0]} 👋\n\nJe contract voor project "${contract.projectNaam}" is klaar om te bekijken en te ondertekenen.\n\n👉 Bekijk & teken: ${baseUrl}/contract/${contract.id}\n\n💶 Uurtarief: € ${contract.uurtarief}\n⏱️ Totaal uren: ${contract.totaalUren}\n📅 Start: ${contract.startDatum}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        setContracten(prev => prev.map(c => c.id === contract.id ? { ...c, status: 'verzonden' } : c));
    };

    // ─── Module 3: Termijn Tracker ───
    const getContractUren = (contractId) => {
        const contract = contracten.find(c => c.id === contractId);
        if (!contract) return 0;
        return urenLog
            .filter(u => u.medewerkerId === contract.medewerkerId && u.projectId === contract.projectId)
            .reduce((sum, u) => sum + u.uren, 0);
    };

    const getTermijnen = (contract) => {
        if (!contract) return [];
        const contractTotaal = contract.totaalBedrag || contract.totaalOvereenkomst || 0;
        const termijnBedragen = contract.termijnBedragen && contract.termijnBedragen.length === contract.aantalTermijnen
            ? contract.termijnBedragen
            : Array.from({ length: contract.aantalTermijnen || 1 }, () => contractTotaal / (contract.aantalTermijnen || 1));
        const gewerkteUren = getContractUren(contract.id);

        // Berekening van cumulatieve drempels (uren) per termijn
        const drempels = termijnBedragen.map((_, i) => {
            const cumulBedrag = termijnBedragen.slice(0, i + 1).reduce((s, b) => s + (b || 0), 0);
            return contract.uurtarief > 0 ? cumulBedrag / contract.uurtarief : 0;
        });

        return termijnBedragen.map((bedrag, i) => {
            const drempel = drempels[i];
            const vorigeDropempel = i > 0 ? drempels[i - 1] : 0;
            const bereikt = gewerkteUren >= drempel;

            // Sequentieel: progress loopt alleen binnen het "venster" van deze termijn
            // Venster: van vorigeDrempel tot drempel
            const vensterGrootte = drempel - vorigeDropempel;
            const urenInVenster = Math.max(0, Math.min(gewerkteUren - vorigeDropempel, vensterGrootte));
            const progress = vensterGrootte > 0 ? Math.min((urenInVenster / vensterGrootte) * 100, 100) : 0;

            return {
                nummer: i + 1,
                drempel,
                bedrag,
                progress,
                bereikt,
            };
        });
    };

    const keurTermijnGoed = (contractId, termijnNummer) => {
        setContracten(prev => prev.map(c => {
            if (c.id !== contractId) return c;
            const goedgekeurd = c.goedgekeurdeTermijnen || [];
            if (goedgekeurd.includes(termijnNummer)) return c;
            return { ...c, goedgekeurdeTermijnen: [...goedgekeurd, termijnNummer] };
        }));
    };

    const sendTermijnWhatsApp = (contract, termijn) => {
        const phone = contract.medewerkerTelefoon.replace(/^0/, '31');
        const voornaam = contract.medewerkerNaam.split(' ')[0];
        const msg = `✅ Termijn ${termijn.nummer} van ${contract.aantalTermijnen} vrijgegeven!\n\nHoi ${voornaam} 👋\n\nJe kunt nu termijn ${termijn.nummer} factureren voor project "${contract.projectNaam}".\n\nDit termijn is vrijgegeven conform de overeenkomst van onderaanneming die je hebt ondertekend met De Schilders uit Katwijk.\n\n💶 Factuurbedrag: € ${termijn.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW\n📋 Termijn: ${termijn.nummer} van ${contract.aantalTermijnen}\n📍 Project: ${contract.projectNaam}\n📅 Betalingstermijn: ${contract.betaaltermijn || '14 dagen na factuurdatum'}\n\nVermeld op je factuur:\n• Projectnaam: ${contract.projectNaam}\n• Termijn ${termijn.nummer} van ${contract.aantalTermijnen}\n• Bedrag: € ${termijn.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW\n\nFactuur sturen naar:\n📧 info@deschildersuitkatwijk.nl\n\nBedankt! 🙏`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        // Markeer dat melding verzonden is
        setContracten(prev => prev.map(c => {
            if (c.id !== contract.id) return c;
            const verzonden = c.verzondTermijnen || [];
            return { ...c, verzondTermijnen: [...verzonden, termijn.nummer] };
        }));
    };

    // ─── Module 1: Manual Uren Entry ───
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualEntry, setManualEntry] = useState({
        medewerkerId: '', projectId: '', uren: '', pauze: '30', datum: new Date().toISOString().split('T')[0]
    });

    // ─── Uren Goedkeuring ───
    const [selectedUrenId, setSelectedUrenId] = useState(null);
    const [urenOpmerking, setUrenOpmerking] = useState({});

    const keurUrenGoed = (urenId) => {
        setUrenLog(prev => prev.map(u => u.id === urenId ? { ...u, status: 'goedgekeurd' } : u));
        setSelectedUrenId(null);
    };

    const keurUrenAf = (urenId, opmerking) => {
        setUrenLog(prev => prev.map(u => u.id === urenId ? { ...u, status: 'afgekeurd', opmerking } : u));
    };

    const pasUrenAan = (urenId, nieuweWaarden) => {
        setUrenLog(prev => prev.map(u => u.id === urenId
            ? { ...u, ...nieuweWaarden, status: 'pending', opmerking: '' }
            : u
        ));
        setEditUrenId(null);
    };

    const [editUrenId, setEditUrenId] = useState(null);
    const [editWaarden, setEditWaarden] = useState({});

    const sendUrenAfkeurWhatsApp = (u, opmerking) => {
        const medewerker = medewerkers.find(m => m.id === u.medewerkerId);
        if (!medewerker?.telefoon) return;
        const phone = medewerker.telefoon.replace(/^0/, '31');
        const voornaam = u.medewerkerNaam.split(' ')[0];
        const msg = `❌ Urenregistratie afgekeurd\n\nHoi ${voornaam} 👋\n\nJe urenregistratie van ${u.datum} is helaas niet goedgekeurd.\n\n⏱️ Ingediende uren: ${u.uren} uur\n📍 Project: ${u.projectNaam}\n\n💬 Opmerking van de opdrachtgever:\n"${opmerking}"\n\nNeem contact op als je vragen hebt.\n\nMet vriendelijke groet,\nDe Schilders uit Katwijk`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        keurUrenAf(u.id, opmerking);
        setSelectedUrenId(null);
    };

    const addManualEntry = () => {
        const mw = medewerkers.find(m => m.id === manualEntry.medewerkerId);
        const prj = projecten.find(p => p.id === manualEntry.projectId);
        if (!mw || !prj || !manualEntry.uren) return;
        setUrenLog(prev => [{
            id: String(Date.now()),
            datum: manualEntry.datum,
            medewerkerId: mw.id, medewerkerNaam: mw.naam,
            projectId: prj.id, projectNaam: prj.name,
            uren: parseFloat(manualEntry.uren), pauze: parseInt(manualEntry.pauze),
            tijdstempel: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev]);
        setManualEntry({ medewerkerId: '', projectId: '', uren: '', pauze: '30', datum: new Date().toISOString().split('T')[0] });
        setShowManualEntry(false);
    };

    // ═════════════ STYLES ═════════════
    const panelS = { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' };
    const headerS = { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
    const labelS = { fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '3px' };
    const inputS = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'inherit' };
    const btnPrimary = { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' };
    const btnSecondary = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: '#fff', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' };

    // ═════════════ RENDER ═════════════
    return (
        <div className="content-area">
            <div className="page-header">
                <h1><i className="fa-brands fa-whatsapp" style={{ color: '#25D366', marginRight: '10px' }}></i>WhatsApp Business</h1>
                <p>Automatische urenregistratie, contracten en termijnbeheer via WhatsApp.</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                {[
                    { id: 'uren', icon: 'fa-clock', label: 'Urenregistratie' },
                    { id: 'nieuw_contract', icon: 'fa-file-circle-plus', label: 'Nieuw Modelovereenkomst' },
                    { id: 'overzicht_contract', icon: 'fa-folder-open', label: 'Gemaakte Modelovereenkomsten' },
                    { id: 'termijnen', icon: 'fa-chart-bar', label: 'Termijn & Factuur' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            background: activeTab === tab.id ? '#25D366' : 'transparent',
                            color: activeTab === tab.id ? '#fff' : '#64748b',
                            transition: 'all 0.15s'
                        }}>
                        <i className={`fa-solid ${tab.icon}`}></i>{tab.label}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════ */}
            {/* MODULE 1 — URENREGISTRATIE             */}
            {/* ════════════════════════════════════════ */}
            {activeTab === 'uren' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                    {/* Left: Beheer + Log */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Medewerkers */}
                        <div style={panelS}>
                            <div style={headerS}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                    <i className="fa-solid fa-users" style={{ color: '#25D366', marginRight: '8px' }}></i>Medewerkers
                                </h3>
                                <button onClick={() => setShowNewMedewerker(!showNewMedewerker)} style={btnPrimary}>
                                    <i className="fa-solid fa-plus"></i>Toevoegen
                                </button>
                            </div>
                            {showNewMedewerker && (
                                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: '8px', marginBottom: '8px' }}>
                                        <div><label style={labelS}>Naam</label><input style={inputS} value={newMw.naam} onChange={e => setNewMw({ ...newMw, naam: e.target.value })} placeholder="Volledige naam" /></div>
                                        <div><label style={labelS}>06-nummer</label><input style={inputS} value={newMw.telefoon} onChange={e => setNewMw({ ...newMw, telefoon: e.target.value })} placeholder="0612345678" /></div>
                                        <div><label style={labelS}>Type</label><select style={inputS} value={newMw.type} onChange={e => setNewMw({ ...newMw, type: e.target.value })}><option value="medewerker">Medewerker</option><option value="zzp">ZZP&apos;er</option></select></div>
                                    </div>
                                    {newMw.type === 'zzp' && (
                                        <>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F5850A', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                <i className="fa-solid fa-briefcase" style={{ marginRight: '5px' }}></i>ZZP-gegevens — worden gebruikt in het contract
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '8px', marginBottom: '8px' }}>
                                                <div><label style={labelS}>KvK-nummer</label><input style={inputS} value={newMw.kvk} onChange={e => setNewMw({ ...newMw, kvk: e.target.value })} placeholder="12345678" /></div>
                                                <div><label style={labelS}>BTW-nummer</label><input style={inputS} value={newMw.btwNummer} onChange={e => setNewMw({ ...newMw, btwNummer: e.target.value })} placeholder="NL123456789B01" /></div>
                                                <div><label style={labelS}>Uurtarief (€)</label><input style={inputS} type="number" min="0" value={newMw.uurtarief || ''} onChange={e => setNewMw({ ...newMw, uurtarief: parseFloat(e.target.value) || 0 })} placeholder="40" /></div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                <div><label style={labelS}>Adres</label><input style={inputS} value={newMw.adres} onChange={e => setNewMw({ ...newMw, adres: e.target.value })} placeholder="Straatnaam 12" /></div>
                                                <div><label style={labelS}>Postcode + Plaats</label><input style={inputS} value={newMw.postcode} onChange={e => setNewMw({ ...newMw, postcode: e.target.value })} placeholder="2223 AM Katwijk" /></div>
                                            </div>
                                            {/* Documenten & Certificaten */}
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '6px', marginTop: '4px' }}>
                                                <i className="fa-solid fa-certificate" style={{ marginRight: '5px' }}></i>Documenten &amp; Certificaten
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                <div><label style={labelS}>VCA verloopdatum</label><input style={inputS} type="date" value={newMw.vcaVerloopdatum} onChange={e => setNewMw({ ...newMw, vcaVerloopdatum: e.target.value })} /></div>
                                                <div><label style={labelS}>AVB verloopdatum</label><input style={inputS} type="date" value={newMw.avbVerloopdatum} onChange={e => setNewMw({ ...newMw, avbVerloopdatum: e.target.value })} /></div>
                                                <div><label style={labelS}>CAV verloopdatum</label><input style={inputS} type="date" value={newMw.cavVerloopdatum} onChange={e => setNewMw({ ...newMw, cavVerloopdatum: e.target.value })} /></div>
                                            </div>
                                        </>
                                    )}
                                    <button onClick={addMedewerker} style={btnPrimary}><i className="fa-solid fa-check"></i>Opslaan</button>
                                </div>
                            )}
                            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                                {medewerkers.map(mw => {
                                    // Verloopradar voor ZZP'ers
                                    const expiryCheck = (datum) => {
                                        if (!datum) return null;
                                        const d = Math.ceil((new Date(datum) - new Date()) / (1000 * 60 * 60 * 24));
                                        return d < 0 ? 'expired' : d < 90 ? 'warning' : 'valid';
                                    };
                                    const daysRemaining = (datum) => datum ? Math.ceil((new Date(datum) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                    const mwAlerts = mw.type === 'zzp' ? [
                                        { label: 'VCA certificaat', st: expiryCheck(mw.vcaVerloopdatum), datum: mw.vcaVerloopdatum, days: daysRemaining(mw.vcaVerloopdatum) },
                                        { label: 'Aansprakelijkheidsverzekering (AVB)', st: expiryCheck(mw.avbVerloopdatum), datum: mw.avbVerloopdatum, days: daysRemaining(mw.avbVerloopdatum) },
                                        { label: 'CAV verzekering', st: expiryCheck(mw.cavVerloopdatum), datum: mw.cavVerloopdatum, days: daysRemaining(mw.cavVerloopdatum) },
                                    ].filter(a => a.st && a.st !== 'valid') : [];

                                    // Genereer WhatsApp bericht
                                    const sendWaNotification = () => {
                                        const tel = mw.telefoon.replace(/\D/g, '').replace(/^0/, '31');
                                        const verlopen = mwAlerts.filter(a => a.st === 'expired');
                                        const bijna = mwAlerts.filter(a => a.st === 'warning');
                                        let msg = `Hallo ${mw.naam.split(' ')[0]},\n\n`;
                                        msg += `Dit is een herinnering vanuit De Schilders Katwijk.\n\n`;
                                        if (verlopen.length > 0) {
                                            msg += `⚠️ *De volgende documenten zijn verlopen:*\n`;
                                            verlopen.forEach(a => {
                                                msg += `• ${a.label} — verlopen op ${new Date(a.datum).toLocaleDateString('nl-NL')}\n`;
                                            });
                                            msg += `\nZorg ervoor dat je deze documenten zo snel mogelijk vernieuwt, anders kunnen wij je helaas geen opdrachten meer inzetten.\n\n`;
                                        }
                                        if (bijna.length > 0) {
                                            msg += `🟡 *Binnenkort verlopen (actie vereist):*\n`;
                                            bijna.forEach(a => {
                                                msg += `• ${a.label} — verloopt over ${a.days} dagen (${new Date(a.datum).toLocaleDateString('nl-NL')})\n`;
                                            });
                                            msg += `\nVernieuw deze documenten op tijd om aaneengesloten te kunnen werken.\n\n`;
                                        }
                                        msg += `Heb je vragen? Bel of app ons gerust.\n\nMet vriendelijke groet,\nDe Schilders Katwijk`;
                                        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
                                    };

                                    return (
                                        <div key={mw.id} style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: mwAlerts.some(a => a.st === 'expired') ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {mw.naam}
                                                    {mw.type === 'zzp' && <span style={{ fontSize: '0.58rem', fontWeight: 700, background: '#fff7ed', color: '#F5850A', border: '1px solid #fed7aa', borderRadius: '99px', padding: '1px 6px' }}>ZZP</span>}
                                                    {mwAlerts.map((a, i) => (
                                                        <span key={i} title={`${a.label}: ${a.datum}`} style={{
                                                            fontSize: '0.58rem', fontWeight: 700, borderRadius: '99px', padding: '1px 6px',
                                                            background: a.st === 'expired' ? '#fef2f2' : '#fffbeb',
                                                            color: a.st === 'expired' ? '#b91c1c' : '#92400e',
                                                            border: `1px solid ${a.st === 'expired' ? '#fca5a5' : '#fcd34d'}`
                                                        }}>
                                                            {a.st === 'expired' ? '⚠️' : '🟡'} {a.label}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                    {mw.telefoon}{mw.kvk ? ` · KvK: ${mw.kvk}` : ''}{mw.uurtarief > 0 ? ` · € ${mw.uurtarief}/u` : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {mwAlerts.length > 0 && mw.telefoon && (
                                                    <button
                                                        onClick={sendWaNotification}
                                                        title="Stuur WhatsApp melding over verlopen documenten"
                                                        style={{
                                                            padding: '5px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                            background: mwAlerts.some(a => a.st === 'expired')
                                                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                                : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                            color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', gap: '5px',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                                        }}
                                                    >
                                                        <i className="fa-brands fa-whatsapp"></i>
                                                        {mwAlerts.some(a => a.st === 'expired') ? 'Verlopen!' : 'Verloopt binnenkort'}
                                                    </button>
                                                )}
                                                <button onClick={() => startSim(mw)} style={{ ...btnSecondary, padding: '5px 10px', fontSize: '0.72rem' }}>
                                                    <i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }}></i>Simuleer
                                                </button>
                                                <button onClick={() => setMedewerkers(prev => prev.filter(m => m.id !== mw.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem' }}>
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Projecten */}
                        <div style={panelS}>
                            <div style={headerS}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                    <i className="fa-solid fa-folder-tree" style={{ color: '#3b82f6', marginRight: '8px' }}></i>Projecten
                                </h3>
                                <button onClick={() => setShowNewProject(!showNewProject)} style={{ ...btnPrimary, background: '#3b82f6' }}>
                                    <i className="fa-solid fa-plus"></i>Toevoegen
                                </button>
                            </div>
                            {showNewProject && (
                                <div style={{ padding: '12px 20px', background: '#eff6ff', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                        <div><label style={labelS}>Projectnaam</label><input style={inputS} value={newPrj.name} onChange={e => setNewPrj({ ...newPrj, name: e.target.value })} placeholder="Bijv. Schilderwerk Fam. Bakker" /></div>
                                        <div><label style={labelS}>Locatie</label><input style={inputS} value={newPrj.locatie} onChange={e => setNewPrj({ ...newPrj, locatie: e.target.value })} placeholder="Adres" /></div>
                                    </div>
                                    <button onClick={addProject} style={{ ...btnPrimary, background: '#3b82f6' }}><i className="fa-solid fa-check"></i>Opslaan</button>
                                </div>
                            )}
                            <div style={{ maxHeight: '160px', overflow: 'auto' }}>
                                {projecten.map(prj => (
                                    <div key={prj.id} style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{prj.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{prj.locatie}</div>
                                        </div>
                                        <button onClick={() => setProjecten(prev => prev.filter(p => p.id !== prj.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem' }}>
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Uren Log */}
                        <div style={panelS}>
                            <div style={headerS}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                    <i className="fa-solid fa-list-check" style={{ color: '#F5850A', marginRight: '8px' }}></i>Urenregistraties
                                    <span style={{ marginLeft: '8px', background: '#F5850A', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{urenLog.length}</span>
                                </h3>
                                <button onClick={() => setShowManualEntry(!showManualEntry)} style={{ ...btnPrimary, background: '#F5850A' }}>
                                    <i className="fa-solid fa-plus"></i>Handmatig
                                </button>
                            </div>
                            {showManualEntry && (
                                <div style={{ padding: '12px 20px', background: 'rgba(245,133,10,0.04)', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                                        <SearchSelect
                                            label="Medewerker"
                                            value={manualEntry.medewerkerId}
                                            onChange={id => setManualEntry({ ...manualEntry, medewerkerId: id })}
                                            options={medewerkers.map(m => ({ value: m.id, label: m.naam, subtitle: m.type === 'zzp' ? 'ZZP' : 'Medewerker', icon: 'fa-user-hard-hat' }))}
                                            placeholder="Zoek medewerker..."
                                            labelStyle={labelS}
                                            inputStyle={inputS}
                                        />
                                        <SearchSelect
                                            label="Project"
                                            value={manualEntry.projectId}
                                            onChange={id => setManualEntry({ ...manualEntry, projectId: id })}
                                            options={projecten.map(p => ({ value: p.id, label: p.name, subtitle: p.client || p.locatie, icon: 'fa-diagram-project' }))}
                                            placeholder="Zoek project..."
                                            labelStyle={labelS}
                                            inputStyle={inputS}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 100px', gap: '8px', marginBottom: '8px' }}>
                                        <div><label style={labelS}>Uren</label><input style={inputS} type="number" step="0.5" value={manualEntry.uren} onChange={e => setManualEntry({ ...manualEntry, uren: e.target.value })} placeholder="7.5" /></div>
                                        <div><label style={labelS}>Pauze</label><input style={inputS} type="number" value={manualEntry.pauze} onChange={e => setManualEntry({ ...manualEntry, pauze: e.target.value })} placeholder="30" /></div>
                                        <div><label style={labelS}>Datum</label><input style={inputS} type="date" value={manualEntry.datum} onChange={e => setManualEntry({ ...manualEntry, datum: e.target.value })} /></div>
                                    </div>
                                    <button onClick={addManualEntry} style={{ ...btnPrimary, background: '#F5850A' }}><i className="fa-solid fa-check"></i>Toevoegen</button>
                                </div>
                            )}
                            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {urenLog.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                                        <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px', color: '#cbd5e1' }}></i>
                                        Nog geen urenregistraties. Start een WhatsApp simulatie of voeg handmatig toe.
                                    </div>
                                ) : urenLog.map(entry => (
                                    <div key={entry.id} style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', fontWeight: 800, fontSize: '0.75rem' }}>
                                                {entry.uren}u
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{entry.medewerkerNaam}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{entry.projectNaam}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{entry.datum}</div>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{entry.tijdstempel}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: WhatsApp Chatbot Simulation */}
                    <div style={{ ...panelS, display: 'flex', flexDirection: 'column', maxHeight: '700px' }}>
                        <div style={{ ...headerS, background: '#075E54', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤖</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>DS Schilder Bot</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{simMw ? `Chat met ${simMw.naam}` : 'Selecteer een medewerker om te starten'}</div>
                                </div>
                            </div>
                            {simStep > 0 && <button onClick={resetSim} style={{ ...btnSecondary, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>Reset</button>}
                        </div>

                        <div style={{ flex: 1, padding: '16px', background: '#e5ddd5', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'300\' height=\'300\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'60\' height=\'60\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1.5\' fill=\'rgba(0,0,0,0.03)\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'100%25\' height=\'100%25\'/%3E%3C/svg%3E")', overflow: 'auto' }}>
                            {simMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8696a0' }}>
                                    <i className="fa-brands fa-whatsapp" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px', color: '#25D366' }}></i>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}>WhatsApp Chatbot Simulatie</div>
                                    <div style={{ fontSize: '0.78rem' }}>Klik op "Simuleer" bij een medewerker om het gesprek te starten.</div>
                                </div>
                            ) : simMessages.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: '6px' }}>
                                    <div style={{
                                        maxWidth: '75%', padding: '8px 12px', borderRadius: msg.from === 'user' ? '10px 10px 0 10px' : '10px 10px 10px 0',
                                        background: msg.from === 'user' ? '#dcf8c6' : '#fff',
                                        fontSize: '0.82rem', lineHeight: 1.4, whiteSpace: 'pre-line',
                                        boxShadow: '0 1px 1px rgba(0,0,0,0.08)'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {/* Interactive buttons during simulation */}
                            {simStep === 1 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    {projecten.map(prj => (
                                        <button key={prj.id} onClick={() => simSelectProject(prj)}
                                            style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #25D366', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', color: '#075E54', fontWeight: 600 }}>
                                            📍 {prj.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {simStep === 2 && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                    {['4', '6', '7.5', '8'].map(u => (
                                        <button key={u} onClick={() => simSelectUren(u)}
                                            style={{ padding: '6px 14px', borderRadius: '16px', border: '1px solid #25D366', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', color: '#075E54', fontWeight: 600 }}>
                                            {u} uur
                                        </button>
                                    ))}
                                </div>
                            )}
                            {simStep === 3 && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                    {['0', '15', '30', '45', '60'].map(p => (
                                        <button key={p} onClick={() => simSelectPauze(p)}
                                            style={{ padding: '6px 14px', borderRadius: '16px', border: '1px solid #25D366', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', color: '#075E54', fontWeight: 600 }}>
                                            {p} min
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════ */}
            {/* TAB 2 — NIEUW MODELOVEREENKOMST         */}
            {/* ════════════════════════════════════════ */}
            {activeTab === 'nieuw_contract' && (
                <div>
                    {/* Briefpapier Upload */}
                    <div style={{ ...panelS, marginBottom: '16px' }}>
                        <div style={{ ...headerS, cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowBriefpapierPanel(v => !v)}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-image" style={{ color: '#8b5cf6', marginRight: '8px' }}></i>Briefpapier (Achtergrond)
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {showBriefpapierPanel && (
                                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                                        <input ref={briefpapierInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleBriefpapierUpload} style={{ display: 'none' }} id="briefpapier-upload" />
                                        <button onClick={() => briefpapierInputRef.current?.click()} style={{ ...btnPrimary, background: '#8b5cf6' }} disabled={briefpapierUploading}>
                                            <i className={`fa-solid ${briefpapierUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                                            {briefpapierPreview ? 'Wijzigen' : 'Uploaden'}
                                        </button>
                                        {briefpapierPreview && (
                                            <button onClick={removeBriefpapier} style={{ ...btnSecondary, color: '#ef4444' }}>
                                                <i className="fa-solid fa-trash-can"></i>Verwijderen
                                            </button>
                                        )}
                                    </div>
                                )}
                                <i className={`fa-solid fa-chevron-${showBriefpapierPanel ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#94a3b8' }}></i>
                            </div>
                        </div>
                        {showBriefpapierPanel && (briefpapierPreview ? (
                            <div style={{ padding: '12px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '120px', height: '170px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={briefpapierPreview} alt="Briefpapier" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>✅ Briefpapier ingesteld</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                                        Dit briefpapier wordt gebruikt als achtergrond voor de digitale overeenkomst die de ZZP&apos;er te zien krijgt bij <code>/contract/[id]</code>.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                                <i className="fa-solid fa-file-image" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', color: '#8b5cf6' }}></i>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: '#1e293b' }}>Geen briefpapier ingesteld</div>
                                <div style={{ marginBottom: '12px', color: '#94a3b8' }}>Upload je bedrijfsbriefpapier (PDF of PNG/JPG) om het als achtergrond te gebruiken in het contract.</div>
                                <button onClick={() => briefpapierInputRef.current?.click()}
                                    style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-upload"></i> Upload nu
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Nieuw Contract Form */}
                    <div style={{ ...panelS, marginBottom: '16px' }}>
                        <div style={{ ...headerS, cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowContractFormPanel(v => !v)}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-file-signature" style={{ color: '#25D366', marginRight: '8px' }}></i>Opdrachtovereenkomst Genereren
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div onClick={e => e.stopPropagation()}>
                                    <button onClick={() => setShowNewContract(!showNewContract)} style={btnPrimary}>
                                        <i className="fa-solid fa-wand-magic-sparkles"></i>Nieuw Contract
                                    </button>
                                </div>
                                <i className={`fa-solid fa-chevron-${showContractFormPanel ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#94a3b8' }}></i>
                            </div>
                        </div>
                        {showContractFormPanel && showNewContract && (
                            <div style={{ padding: '16px 20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '12px' }}>
                                    <SearchSelect
                                        label="ZZP'er / Opdrachtnemer"
                                        value={newContract.medewerkerId}
                                        onChange={id => { const mw = medewerkers.find(m => m.id === id); setNewContract({ ...newContract, medewerkerId: id, uurtarief: mw?.uurtarief || 40 }); }}
                                        options={medewerkers.filter(m => m.type === 'zzp').map(m => ({ value: m.id, label: m.naam, subtitle: m.uurtarief ? `€ ${m.uurtarief}/uur` : undefined, icon: 'fa-person-digging' }))}
                                        placeholder="Zoek ZZP'er..."
                                        labelStyle={labelS}
                                        inputStyle={inputS}
                                    />
                                    <SearchSelect
                                        label="Project"
                                        value={newContract.projectId}
                                        onChange={id => setNewContract({ ...newContract, projectId: id })}
                                        options={projecten.map(p => ({ value: p.id, label: p.name, subtitle: p.client || p.locatie, icon: 'fa-diagram-project' }))}
                                        placeholder="Zoek project..."
                                        labelStyle={labelS}
                                        inputStyle={inputS}
                                    />
                                    <div><label style={labelS}>Werkzaamheden</label><input style={inputS} value={newContract.werkzaamheden} onChange={e => setNewContract({ ...newContract, werkzaamheden: e.target.value })} /></div>
                                    <div><label style={labelS}>Betaaltermijn</label><select style={inputS} value={newContract.betaaltermijn} onChange={e => setNewContract({ ...newContract, betaaltermijn: e.target.value })}>
                                        <option value="7 dagen na factuurdatum">7 dagen na factuurdatum</option>
                                        <option value="14 dagen na factuurdatum">14 dagen na factuurdatum</option>
                                        <option value="21 dagen na factuurdatum">21 dagen na factuurdatum</option>
                                        <option value="30 dagen na factuurdatum">30 dagen na factuurdatum</option>
                                        <option value="45 dagen na factuurdatum">45 dagen na factuurdatum</option>
                                        <option value="60 dagen na factuurdatum">60 dagen na factuurdatum</option>
                                        <option value="Direct bij oplevering">Direct bij oplevering</option>
                                        <option value="50% vooraf, 50% bij oplevering">50% vooraf, 50% bij oplevering</option>
                                    </select></div>
                                    <div><label style={labelS}>Startdatum</label><input style={inputS} type="date" value={newContract.startDatum} onChange={e => {
                                        const nieuweStart = e.target.value;
                                        const wkn = newContract.totaalUren > 0 ? newContract.totaalUren / 37.5 : 6.7;
                                        const offset = Math.round(wkn * 7);
                                        const nieuwCalc = new Date(nieuweStart);
                                        nieuwCalc.setDate(nieuwCalc.getDate() + offset);
                                        const autoEind = nieuwCalc.toISOString().split('T')[0];
                                        let nieuweEind = newContract.eindDatum;

                                        if (!newContract.eindDatum) {
                                            nieuweEind = autoEind;
                                        } else if (newContract.startDatum) {
                                            const oudeCalc = new Date(newContract.startDatum);
                                            oudeCalc.setDate(oudeCalc.getDate() + offset);
                                            if (oudeCalc.toISOString().split('T')[0] === newContract.eindDatum) {
                                                nieuweEind = autoEind;
                                            }
                                        }
                                        setNewContract({ ...newContract, startDatum: nieuweStart, eindDatum: nieuweEind });
                                    }} /></div>
                                    <div>
                                        <label style={labelS}>Einddatum</label>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input style={{ ...inputS, flex: 1 }} type="date" value={newContract.eindDatum} onChange={e => setNewContract({ ...newContract, eindDatum: e.target.value })} />
                                            {(() => {
                                                const wkn = newContract.totaalUren > 0 ? newContract.totaalUren / 37.5 : 6.7;
                                                const offsetDgn = Math.round(wkn * 7);
                                                const calcEind = newContract.startDatum ? (() => { const d = new Date(newContract.startDatum); d.setDate(d.getDate() + offsetDgn); return d.toISOString().split('T')[0]; })() : null;
                                                const isActive = calcEind && calcEind === newContract.eindDatum;
                                                return (
                                                    <button
                                                        title={`Einddatum instellen op startdatum + ${wkn.toFixed(1)} weken (${offsetDgn} dagen)`}
                                                        disabled={!newContract.startDatum}
                                                        onClick={() => {
                                                            if (!calcEind) return;
                                                            setNewContract({ ...newContract, eindDatum: calcEind });
                                                        }}
                                                        style={{
                                                            flexShrink: 0, padding: '0 8px', height: '34px',
                                                            borderRadius: '6px',
                                                            border: isActive ? '1px solid #16a34a' : '1px solid #b8c4ce',
                                                            background: isActive ? '#dcfce7' : newContract.startDatum ? '#eef2f7' : '#f1f5f9',
                                                            color: isActive ? '#15803d' : newContract.startDatum ? '#2c3b4e' : '#94a3b8',
                                                            fontSize: '0.62rem', fontWeight: 700,
                                                            cursor: newContract.startDatum ? 'pointer' : 'not-allowed',
                                                            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px',
                                                            transition: 'all 0.15s',
                                                            boxShadow: isActive ? '0 0 0 2px rgba(22,163,74,0.15)' : 'none',
                                                        }}
                                                    >
                                                        <i className={`fa-solid ${isActive ? 'fa-circle-check' : 'fa-calendar-plus'}`} style={{ fontSize: '0.65rem' }}></i>
                                                        +{wkn.toFixed(1)} wkn
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                        {newContract.startDatum && newContract.eindDatum && (() => {
                                            const wkn = newContract.totaalUren > 0 ? newContract.totaalUren / 37.5 : 6.7;
                                            const offset = Math.round(wkn * 7);
                                            const dagen = Math.round((new Date(newContract.eindDatum) - new Date(newContract.startDatum)) / 86400000);
                                            const wekenLabel = (dagen / 7).toFixed(1);
                                            const calcD = new Date(newContract.startDatum);
                                            calcD.setDate(calcD.getDate() + offset);
                                            const isKnopActief = calcD.toISOString().split('T')[0] === newContract.eindDatum;
                                            if (dagen <= 0) return null;
                                            return (
                                                <div style={{ marginTop: '4px', fontSize: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ color: isKnopActief ? '#15803d' : '#2c3b4e' }}>
                                                        <i className={`fa-solid ${isKnopActief ? 'fa-circle-check' : 'fa-clock'}`} style={{ marginRight: '3px' }}></i>
                                                        Contractduur: {wekenLabel} wkn ({dagen} dgn)
                                                    </span>
                                                    {!isKnopActief && (
                                                        <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                                                            · knop stelt in op {wkn.toFixed(1)} wkn
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px', marginBottom: '12px' }}>
                                    <div><label style={labelS}>Uurtarief</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.82rem', pointerEvents: 'none' }}>€</span><input style={{ ...inputS, paddingLeft: '28px' }} type="number" step="0.01" value={newContract.uurtarief || ''} onChange={e => { const val = e.target.value === '' ? 0 : parseFloat(e.target.value); const totaal = val * (newContract.totaalUren || 0); const n = newContract.aantalTermijnen || 1; const per = Math.floor((totaal / n) * 100) / 100; const eerste = Math.round((totaal - per * (n - 1)) * 100) / 100; setNewContract({ ...newContract, uurtarief: val, totaalOvereenkomst: totaal, termijnBedragen: Array.from({ length: n }, (_, i) => i === 0 ? eerste : per) }); }} /></div></div>
                                    <div><label style={labelS}>Totaal uren</label><input style={inputS} type="number" min="0" value={newContract.totaalUren || ''} onChange={e => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); const totaal = (newContract.uurtarief || 0) * val; const n = newContract.aantalTermijnen || 1; const per = Math.floor((totaal / n) * 100) / 100; const eerste = Math.round((totaal - per * (n - 1)) * 100) / 100; setNewContract({ ...newContract, totaalUren: val, totaalOvereenkomst: totaal, termijnBedragen: Array.from({ length: n }, (_, i) => i === 0 ? eerste : per) }); }} />{newContract.totaalUren > 0 && (<div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', padding: '4px 8px', borderRadius: '5px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.65rem', color: '#1e40af' }}><i className="fa-solid fa-calendar-week" style={{ fontSize: '0.7rem' }}></i><span>≈ <strong>{(newContract.totaalUren / 37.5).toFixed(1)} weken</strong> ({Math.ceil(newContract.totaalUren / 7.5)} dgn)</span></div>)}</div>
                                    <div><label style={labelS}>Totaal overeenkomst</label><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#2c3b4e', fontWeight: 600, fontSize: '0.82rem', pointerEvents: 'none' }}>€</span><input style={{ ...inputS, paddingLeft: '28px', fontWeight: 700, color: '#2c3b4e', background: '#f0fdf4', border: '1px solid #bbf7d0' }} type="number" step="0.01" value={newContract.totaalOvereenkomst || ''} onChange={e => { const totaal = e.target.value === '' ? 0 : parseFloat(e.target.value); const uur = newContract.uurtarief || 0; const n = newContract.aantalTermijnen || 1; const per = Math.floor((totaal / n) * 100) / 100; const eerste = Math.round((totaal - per * (n - 1)) * 100) / 100; setNewContract({ ...newContract, totaalOvereenkomst: totaal, totaalUren: uur > 0 ? Math.round(totaal / uur) : newContract.totaalUren, termijnBedragen: Array.from({ length: n }, (_, i) => i === 0 ? eerste : per) }); }} /></div></div>
                                </div>
                                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                            <i className="fa-solid fa-layer-group" style={{ color: '#F5850A', marginRight: '6px' }}></i>Termijnen
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Betaaltermijn: <strong style={{ color: '#1e293b' }}>{newContract.betaaltermijn}</strong></span>
                                            {/* Toggle switch Gelijk verdelen */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '6px', background: autoVerdeel ? '#eff6ff' : '#f8fafc', border: `1px solid ${autoVerdeel ? '#bfdbfe' : '#e2e8f0'}`, cursor: 'pointer' }}
                                                onClick={() => {
                                                    const nieuw = !autoVerdeel;
                                                    setAutoVerdeel(nieuw);
                                                    if (nieuw) {
                                                        // Gelijk verdelen inschakelen → herbereken
                                                        const n = newContract.aantalTermijnen || 1;
                                                        const per = Math.floor(((newContract.totaalOvereenkomst || 0) / n) * 100) / 100;
                                                        const eerste = Math.round(((newContract.totaalOvereenkomst || 0) - per * (n - 1)) * 100) / 100;
                                                        setNewContract({ ...newContract, termijnBedragen: Array.from({ length: n }, (_, i) => i === 0 ? eerste : per) });
                                                    }
                                                }}
                                            >
                                                {/* Switch track */}
                                                <div style={{ position: 'relative', width: '28px', height: '16px', borderRadius: '8px', background: autoVerdeel ? '#3b82f6' : '#cbd5e1', transition: 'background 0.2s', flexShrink: 0 }}>
                                                    <div style={{ position: 'absolute', top: '2px', left: autoVerdeel ? '14px' : '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: autoVerdeel ? '#1d4ed8' : '#64748b', userSelect: 'none' }}>
                                                    <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '3px', fontSize: '0.58rem' }}></i>
                                                    Gelijk verdelen
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {(newContract.termijnBedragen || []).map((bedrag, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', width: '80px' }}>Termijn {i + 1}</span>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', pointerEvents: 'none' }}>€</span>
                                                <input
                                                    style={{ ...inputS, paddingLeft: '28px', fontSize: '0.78rem', fontWeight: 600, background: autoVerdeel ? '#f0f9ff' : '#fff', color: autoVerdeel ? '#64748b' : '#1e293b', cursor: autoVerdeel ? 'not-allowed' : 'text' }}
                                                    type="number" step="0.01"
                                                    value={bedrag || ''}
                                                    readOnly={autoVerdeel}
                                                    onChange={e => {
                                                        if (autoVerdeel) return;
                                                        const updated = [...(newContract.termijnBedragen || [])];
                                                        updated[i] = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                        setNewContract({ ...newContract, termijnBedragen: updated });
                                                    }} />
                                            </div>
                                            {newContract.termijnBedragen.length > 1 && (
                                                <button onClick={() => {
                                                    const newLen = newContract.termijnBedragen.length - 1;
                                                    const per = Math.floor(((newContract.totaalOvereenkomst || 0) / newLen) * 100) / 100;
                                                    const eerste = Math.round(((newContract.totaalOvereenkomst || 0) - per * (newLen - 1)) * 100) / 100;
                                                    setNewContract({ ...newContract, termijnBedragen: Array.from({ length: newLen }, (_, i) => i === 0 ? eerste : per), aantalTermijnen: newLen });
                                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', padding: '4px' }}>
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                        <button onClick={() => {
                                            const newLen = (newContract.termijnBedragen || []).length + 1;
                                            const per = Math.floor(((newContract.totaalOvereenkomst || 0) / newLen) * 100) / 100;
                                            const eerste = Math.round(((newContract.totaalOvereenkomst || 0) - per * (newLen - 1)) * 100) / 100;
                                            setNewContract({ ...newContract, termijnBedragen: Array.from({ length: newLen }, (_, i) => i === 0 ? eerste : per), aantalTermijnen: newLen });
                                        }} style={{ ...btnSecondary, padding: '4px 10px', fontSize: '0.68rem' }}>
                                            <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i>Termijn toevoegen
                                        </button>
                                        {(() => {
                                            const som = (newContract.termijnBedragen || []).reduce((a, b) => a + b, 0);
                                            const verschil = (newContract.totaalOvereenkomst || 0) - som;
                                            return (
                                                <div style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '4px', background: Math.abs(verschil) > 0.01 ? '#fef2f2' : '#f0fdf4' }}>
                                                    <span style={{ color: '#64748b' }}>Totaal: <strong>€ {som.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</strong></span>
                                                    {Math.abs(verschil) > 0.01 && (
                                                        <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: '8px' }}>⚠️ Verschil: € {verschil.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                                                    )}
                                                    {Math.abs(verschil) <= 0.01 && (
                                                        <span style={{ color: '#22c55e', fontWeight: 600, marginLeft: '8px' }}>✅</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* Overeenkomst opties */}
                                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                                        <i className="fa-solid fa-sliders" style={{ color: '#F5850A', marginRight: '6px' }}></i>Overeenkomst Opties
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 14px' }}>
                                        <div>
                                            <label style={labelS}>VCA Certificaat <span title="Veiligheid, Gezondheid en Milieu Checklist Aannemers. Als de onderaannemer VCA-gecertificeerd is, toont dit aan dat zij voldoen aan veiligheidsnormen op de bouwplaats. Vereist bij veel opdrachtgevers." style={{ cursor: 'help', color: '#94a3b8' }}><i className="fa-solid fa-circle-info" style={{ fontSize: '0.65rem' }}></i></span></label>
                                            <select style={inputS} value={newContract.vcaCertificaat} onChange={e => setNewContract({ ...newContract, vcaCertificaat: e.target.value })}>
                                                <option value="wel">Wel verstrekken</option>
                                                <option value="geen">Geen verstrekken</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelS}>BTW Verlegging <span title="Bij de verleggingsregeling draagt niet de onderaannemer, maar de aannemer de BTW af aan de Belastingdienst. Dit is gebruikelijk in de bouw. De onderaannemer factureert dan zonder BTW en vermeldt 'BTW verlegd'." style={{ cursor: 'help', color: '#94a3b8' }}><i className="fa-solid fa-circle-info" style={{ fontSize: '0.65rem' }}></i></span></label>
                                            <select style={inputS} value={newContract.btwVerlegd} onChange={e => setNewContract({ ...newContract, btwVerlegd: e.target.value })}>
                                                <option value="wel">Wel van toepassing</option>
                                                <option value="niet">Niet van toepassing</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelS}>Kosten verrekend <span title="Bepaalt of extra kosten (zoals materiaal, reiskosten, verblijf) apart verrekend worden bovenop de aanneemsom, of dat alles inbegrepen is in de vaste prijs." style={{ cursor: 'help', color: '#94a3b8' }}><i className="fa-solid fa-circle-info" style={{ fontSize: '0.65rem' }}></i></span></label>
                                            <select style={inputS} value={newContract.kostenVerrekend} onChange={e => setNewContract({ ...newContract, kostenVerrekend: e.target.value })}>
                                                <option value="wel">Wel verrekend</option>
                                                <option value="niet">Niet verrekend</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelS}>Weekrapporten <span title="Weekrapporten zijn wekelijkse voortgangsverslagen van het uitgevoerde werk. Hiermee houdt de aannemer zicht op de voortgang en kunnen eventuele afwijkingen tijdig worden gesignaleerd." style={{ cursor: 'help', color: '#94a3b8' }}><i className="fa-solid fa-circle-info" style={{ fontSize: '0.65rem' }}></i></span></label>
                                            <select style={inputS} value={newContract.weekrapporten} onChange={e => setNewContract({ ...newContract, weekrapporten: e.target.value })}>
                                                <option value="wel">Wel opmaken</option>
                                                <option value="niet">Niet opmaken</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelS}>Mandagenregister <span title="Een mandagenregister is een registratie van alle personen die op de bouwplaats werkzaam zijn. Dit is wettelijk verplicht bij grotere projecten en dient voor controle op illegale arbeid en veiligheid." style={{ cursor: 'help', color: '#94a3b8' }}><i className="fa-solid fa-circle-info" style={{ fontSize: '0.65rem' }}></i></span></label>
                                            <select style={inputS} value={newContract.mandagenregister} onChange={e => setNewContract({ ...newContract, mandagenregister: e.target.value })}>
                                                <option value="wel">Wel bijhouden</option>
                                                <option value="niet">Niet bijhouden</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                {/* Preview */}
                                {newContract.uurtarief > 0 && newContract.totaalUren > 0 && (
                                    <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2c3b4e' }}>
                                            💶 Totale contractwaarde: € {(newContract.uurtarief * newContract.totaalUren).toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>
                                            {newContract.aantalTermijnen} termijnen × € {((newContract.uurtarief * newContract.totaalUren) / newContract.aantalTermijnen).toLocaleString('nl-NL', { minimumFractionDigits: 2 })} |
                                            Drempel per termijn: {((newContract.uurtarief * newContract.totaalUren) / newContract.aantalTermijnen / newContract.uurtarief).toFixed(0)} uur
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => { generateContract(); setActiveTab('overzicht_contract'); }} style={btnPrimary}><i className="fa-solid fa-file-circle-plus"></i>Contract Aanmaken</button>
                                    <button onClick={() => setShowNewContract(false)} style={btnSecondary}>Annuleren</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── Document Preview ─── */}
                    {(() => {
                        const previewMw = medewerkers.find(m => m.id === newContract.medewerkerId);
                        const previewPrj = projecten.find(p => p.id === newContract.projectId);
                        const previewNaam = previewMw?.naam || 'xxxxxxx';
                        const previewTel = previewMw?.telefoon || 'xxxxxxx';
                        const previewKvk = previewMw?.kvk || 'xxxxxxx';
                        const previewBtw = previewMw?.btwNummer || 'xxxxxxx';
                        const previewAdres = previewMw?.adres || 'xxxxxxx';
                        const previewPostcode = previewMw?.postcode || 'xxxxxxx';
                        const previewProject = previewPrj?.name || 'xxxxxxx';
                        const previewLocatie = previewPrj?.locatie || 'xxxxxxx';
                        const previewTotaal = newContract.totaalOvereenkomst || 0;
                        const previewTermijnBedragen = newContract.termijnBedragen || [];

                        const PT = activeTemplate.paddingTop;
                        const PB = activeTemplate.paddingBottom;
                        const PS = activeTemplate.paddingSides;
                        const PAGE_H = 876;
                        const PAGE_GAP = 32;

                        // === Stijlen identiek aan contract/[id]/page.js ===
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
                        const pvTableCell = pvTdS;
                        const pvRow = { fontSize: '0.68rem', lineHeight: 1.6, marginBottom: '2px', display: 'flex', gap: '4px', fontFamily: PVFONT };
                        const pvLabel = { fontWeight: 600, color: '#4a5568', minWidth: '110px', fontSize: '0.67rem', fontFamily: PVFONT };

                        // Pages content — same split as /contract/[id]
                        const pages = [
                            // Page 1: Title + A. Partijen + Uitgangspunten 1-6
                            <div key="p1">
                                <div style={{ textAlign: 'center', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #1e293b' }}>
                                    <h2 style={{ margin: '0 0 2px', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.05em' }}>OVEREENKOMST VAN ONDERAANNEMING</h2>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2c3b4e', fontFamily: "'Carlito','Calibri',Arial,sans-serif", letterSpacing: '0.01em' }}>
                                        Modelovereenkomst nr.: SUK-{new Date().getFullYear()}-{String(contracten.length + 1).padStart(4, '0')}
                                        {newContract.projectId && projecten.find(p => p.id === newContract.projectId) && (
                                            <span style={{ marginLeft: '12px' }}>| Project: {projecten.find(p => p.id === newContract.projectId)?.name}</span>
                                        )}
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
                                        <div style={pvRow}><span style={pvLabel}>naam:</span><span style={pvField}>{previewNaam}</span></div>
                                        <div style={pvRow}><span style={pvLabel}>straat:</span><span style={pvField}>{previewAdres}</span></div>
                                        <div style={pvRow}><span style={pvLabel}>postcode/plaats:</span><span style={pvField}>{previewPostcode}</span></div>
                                        <div style={pvRow}><span style={pvLabel}>telefoon:</span><span style={pvField}>{previewTel}</span></div>
                                        <div style={pvRow}><span style={pvLabel}>KvK-nr:</span><span style={pvField}>{previewKvk}</span></div>
                                        <div style={pvRow}><span style={pvLabel}>btw-nr:</span><span style={pvField}>{previewBtw}</span></div>
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
                            // Page 2: Uitgangspunten 4-14 + disclaimer
                            <div key="p2">
                                <p style={{ ...pvS, paddingLeft: '8px' }}>4. Onderaannemer is bij het uitvoeren van de overeengekomen werkzaamheden geheel zelfstandig.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>5. De voor de uitvoering van de opdracht benodigde verfmaterialen (waaronder verf, primers, vulmiddelen, afplaktape en beschermingsfolie) worden door de aannemer ter beschikking gesteld. Partijen kiezen bewust voor deze praktische en economisch doelmatige werkwijze: de aannemer beschikt over vaste leverancierscontracten en volume-inkoopafspraken waardoor de materiaalkosten voor het project zo laag mogelijk worden gehouden — en daarmee ook de totale opdrachtsom voor de eindopdrachtgever. Het ter beschikking stellen van materialen door de aannemer wordt door partijen uitdrukkelijk aangemerkt als een zakelijke keuze die de zelfstandige positie van de onderaannemer op geen enkele wijze aantast. Onderaannemer blijft in alle overige opzichten zelfstandig ondernemer: hij beschikt over eigen vervoer, professioneel gereedschap en werkkleding, bepaalt zelfstandig zijn werkwijze en werktijden, en is vrij opdrachten van derden te aanvaarden.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>6. Onderaannemer verklaart dat hij geen werknemers zal aannemen of uitzendkrachten zal inlenen voor de uitvoering van de opdracht.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>7. De onderaannemer is niet gerechtigd derden in te schakelen, daar er sprake is van specifieke vaardigheden en kwaliteiten van de onderaannemer.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>8. De opdracht zal worden uitgevoerd met inachtneming van wettelijke voorschriften.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>9. Indien de opdracht wordt uitgevoerd op een bouwplaats waar ook werknemers werkzaam zijn, is de aannemer verantwoordelijk voor de naleving van de sectorale arbo-catalogus.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>10. Onderaannemer verstrekt de aannemer <strong><span style={{ color: '#C8700A' }}>{newContract.vcaCertificaat === 'wel' ? 'wel' : 'geen'}</span></strong> kopie van een geldig certificaat VOL VCA.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>11. De onderaannemer is volledig vrij in het aannemen van opdrachten van derden.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>12. De onderaannemer is niet afhankelijk van één opdrachtgever.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>13. De onderaannemer is verantwoordelijk voor schade die hij jegens derden veroorzaakt.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>14. De onderaannemer is ingeschreven bij de Kamer van Koophandel en heeft een btw-identificatienummer.</p>
                                <p style={{ ...pvS, fontSize: '0.5rem', fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>Deze overeenkomst is gebaseerd op de door de Belastingdienst op 1 maart 2016 onder nummer 9081625181 beoordeelde overeenkomst. De goedkeuring en verlenging van deze overeenkomst is bij de Belastingdienst geregistreerd onder nummer 90821.22312.1.0.</p>
                            </div>,
                            // Page 3: B + C + D
                            <div key="p3">
                                <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>B.</span> Het werk</h3>
                                <p style={pvS}>De aannemer verstrekt de afzonderlijke opdrachten per email aan de onderaannemer.</p>
                                <p style={pvS}>Onderaannemer zal middels zijn gegeven akkoord, per e-mail (zie bijlage 1), de opdracht aanvaarden en overeenkomstig deze overeenkomst uitvoeren.</p>
                                <p style={{ ...pvS, fontWeight: 600 }}>In deze email worden de volgende zaken benoemd:</p>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}><tbody>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600, width: '160px' }}>Plaats/locatie:</td><td style={pvTableCell}><span style={pvField}>{previewLocatie}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Projectnummer:</td><td style={pvTableCell}><span style={pvField}>{previewProject}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Beschrijving:</td><td style={pvTableCell}><span style={pvField}>{newContract.werkzaamheden || '—'}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Start:</td><td style={pvTableCell}><span style={pvField}>{newContract.startDatum || 'xxxxxxx'}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Einddatum:</td><td style={pvTableCell}><span style={pvField}>{newContract.eindDatum || 'xxxxxxx'}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Aanneemsom:</td><td style={pvTableCell}><span style={{ ...pvField, color: '#2c3b4e' }}>€ {previewTotaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW</span></td></tr>
                                </tbody></table>
                            // Page 3 (continued): C + D
                                <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>C.</span> Wijziging van de kosten en prijzen</h3>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- Wijziging van kosten en prijzen worden <strong><span style={{ color: '#C8700A' }}>{newContract.kostenVerrekend === 'wel' ? 'wel' : 'niet'}</span></strong> verrekend/doorberekend</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- In geval van een afspraak over verrekening zal de onderaannemer transparantie betrachten en de aangepaste kosten en prijzen aan de aannemer inzichtelijk maken.</p>
                                <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>D.</span> Weekrapporten, mandagenregister</h3>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- De onderaannemer zorgt <strong><span style={{ color: '#C8700A' }}>{newContract.weekrapporten === 'wel' ? 'wel' : 'niet'}</span></strong> voor het opmaken van weekrapporten</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- De onderaannemer houdt van het werk <strong><span style={{ color: '#C8700A' }}>{newContract.mandagenregister === 'wel' ? 'wel' : 'niet'}</span></strong> wekelijkse mandagenregisters bij</p>
                                <h3 style={pvTitle}><span style={{ color: '#C8700A' }}>E.</span> Betalingsregeling</h3>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- Het aan de onderaannemer toekomende zal door hem kunnen worden gefactureerd in termijnen en telkens na het verschijnen van de desbetreffende termijn.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- De termijnen verschijnen periodiek, met tussenpozen van weken</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- De aannemer zal in alle gevallen rechtstreeks betalen aan de onderaannemer.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- Op facturen dient het projectnummer vermeld te worden.</p>
                            </div>,
                            // Page 4: Termijnoverzicht + F + G
                            <div key="p4">

                                {previewTotaal > 0 && (
                                    <div style={{ marginBottom: '10px', border: '1px solid #b8c4ce', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#2c3b4e', background: '#e8ecf0', padding: '5px 10px', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #b8c4ce' }}>Termijnoverzicht betalingen</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                                            <thead><tr><th style={pvThS}>Termijn</th><th style={pvThS}>Bedrag excl. BTW</th></tr></thead>
                                            <tbody>
                                                {previewTermijnBedragen.map((bedrag, i) => (
                                                    <tr key={i}>
                                                        <td style={pvTdS}>Termijn {i + 1}</td>
                                                        <td style={{ ...pvTdS, fontWeight: 600 }}>€ {(bedrag || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ fontWeight: 700, background: '#e8ecf0', borderTop: '2px solid #9aaab8' }}><td style={pvTdS}>Totaal</td><td style={{ ...pvTdS, fontWeight: 700 }}>€ {previewTotaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>F.</span> Btw-verleggingsregeling</h3>
                                <p style={pvS}>Op deze overeenkomst is de verleggingsregeling met betrekking tot de btw <strong><span style={{ color: '#5a7a96' }}>{newContract.btwVerlegd === 'wel' ? 'wel' : 'niet'}</span></strong> van toepassing.</p>
                                <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>G.</span> Betalingstermijn</h3>
                                <p style={pvS}>De aannemer zal, na het indienen van de factuur door de onderaannemer, de factuur binnen <strong><span style={pvField}>{newContract.betaaltermijn || '14 dagen na factuurdatum'}</span></strong> voldoen.</p>
                                <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>H.</span> Verzekeringen</h3>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- Onderaannemer is aansprakelijk voor eventuele tekortkomingen in het werk. Bij zodanige tekortkomingen is onderaannemer verplicht deze weg te nemen door de desbetreffende werkzaamheden op eerste verzoek van aannemer geheel voor eigen rekening opnieuw te verrichten.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- Onderaannemer is verplicht schade te vergoeden die voor aannemer en/of diens medewerkers ontstaat als gevolg van vertraging of enige andere tekortkoming van onderaannemer in de uitvoering van het werk.</p>
                                <p style={{ ...pvS, paddingLeft: '8px' }}>- De onderaannemer beschikt over een aansprakelijkheidsverzekering voor bedrijven (AVB).</p>
                            </div>,
                            // Page 5: I + Ondertekening
                            <div key="p5">
                                <h3 style={pvTitle}><span style={{ color: '#5a7a96' }}>I.</span> Slotbepalingen</h3>

                                <p style={pvS}>Op alle geschillen die voortvloeien uit deze overeenkomst is het Nederlands recht van toepassing.</p>
                                <p style={pvS}>Eventuele wijzigingen of aanvullingen op de bepalingen van deze overeenkomst kunnen uitsluitend schriftelijk tussen Partijen worden overeengekomen.</p>
                                <p style={pvS}>Door het ondertekenen van deze overeenkomst verklaren partijen in het bezit te zijn van een exemplaar van deze overeenkomst en alle in deze overeenkomst genoemde bijlagen.</p>
                                <p style={{ ...pvS, fontWeight: 600, marginTop: '30px' }}>Aldus overeengekomen en in tweevoud opgemaakt, per bladzijde geparafeerd en ondertekend:</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '40px' }}>
                                    <div style={{ border: '1px solid #d4dbe3', borderRadius: '4px', padding: '12px 14px' }}>
                                        <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a7a96', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aannemer:</div>
                                        <div style={{ borderBottom: '1px solid #2c3b4e', height: '80px', marginBottom: '8px' }}></div>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#2c3b4e' }}>De Schilders uit Katwijk</div>
                                        <div style={{ fontSize: '0.54rem', color: '#6b7a8d', marginTop: '4px' }}>Plaats: Katwijk<br />Datum: ___________</div>
                                    </div>
                                    <div style={{ border: '1px solid #d4dbe3', borderRadius: '4px', padding: '12px 14px' }}>
                                        <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#5a7a96', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Onderaannemer:</div>
                                        <div style={{ borderBottom: '1px solid #2c3b4e', height: '80px', marginBottom: '8px', display: 'flex', alignItems: 'end', justifyContent: 'center', fontSize: '0.5rem', color: '#94a3b8', fontWeight: 400, paddingBottom: '4px' }}>Handtekening</div>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#2c3b4e' }}><span style={pvField}>{previewNaam}</span></div>
                                        <div style={{ fontSize: '0.54rem', color: '#6b7a8d', marginTop: '4px' }}>Datum: ___________</div>
                                    </div>
                                </div>
                            </div>,
                            // Page 6: Bijlage 1
                            <div key="p6">
                                <h3 style={{ ...pvTitle, fontSize: '0.72rem', borderBottom: '2px solid #1e293b' }}>BIJLAGE 1</h3>
                                <p style={pvS}>Beste <span style={pvField}>{previewNaam ? previewNaam.split(' ')[0] : 'xxxxxxx'}</span>,</p>
                                <p style={pvS}>Ingevolge de overeenkomst van onderaanneming getekend d.d. [datum] doen wij (aannemer) u (onderaannemer) middels dit schrijven het voorstel tot uitvoering van de hieronder beschreven opdracht.</p>
                                <p style={{ ...pvS, fontWeight: 600 }}>De opdracht tot uitvoer van werkzaamheden omvat:</p>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}><tbody>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600, width: '220px' }}>Plaats/locatie:</td><td style={pvTableCell}><span style={pvField}>{previewLocatie}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Projectnummer:</td><td style={pvTableCell}><span style={pvField}>{previewProject}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Start van de werkzaamheden:</td><td style={pvTableCell}><span style={pvField}>{newContract.startDatum || 'xxxxxxx'}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Einddatum:</td><td style={pvTableCell}><span style={pvField}>{newContract.eindDatum || 'xxxxxxx'}</span></td></tr>
                                    <tr><td style={{ ...pvTableCell, fontWeight: 600 }}>Aanneemsom:</td><td style={pvTableCell}><span style={{ ...pvField, color: '#2c3b4e' }}>€ {previewTotaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} excl. BTW</span></td></tr>
                                </tbody></table>
                                <p style={pvS}>Genoemde bedragen zijn exclusief BTW, inclusief parkeerkosten, transportkosten, e.d.</p>
                                <p style={pvS}>Gelieve akkoord te geven voor het aanvaarden van de opdracht. Uw akkoord dient te worden gegeven door te reageren op deze e-mail.</p>
                                <p style={pvS}>Door akkoordverklaring aanvaart de onderaannemer de hierboven beschreven opdracht en zal deze overeenkomstig de getekende overeenkomst van onderaanneming d.d. [datum] uitvoeren.</p>
                                <p style={{ ...pvS, marginTop: '8px' }}>Met vriendelijke groet,<br /><strong>De Schilders uit Katwijk</strong></p>
                            </div>
                        ];

                        return (
                            <div style={{ ...panelS, marginBottom: '16px' }}>
                                <div style={{ ...headerS, cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowVoorbeeldPanel(v => !v)}>
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                        <i className="fa-solid fa-eye" style={{ color: '#F5850A', marginRight: '8px' }}></i>Voorbeeld Document
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Live preview • {pages.length} pagina&apos;s</span>
                                        <i className={`fa-solid fa-chevron-${showVoorbeeldPanel ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#94a3b8' }}></i>
                                    </div>
                                </div>
                                {showVoorbeeldPanel && (
                                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '85vh', overflowY: 'auto', background: '#dde1e7', fontFamily: "'Carlito', 'Calibri', 'Segoe UI', Arial, sans-serif" }}>
                                        {pages.map((pageContent, pageIdx) => (
                                            <div key={pageIdx} style={{
                                                position: 'relative',
                                                background: '#fff',
                                                width: '620px',
                                                height: `${PAGE_H}px`,
                                                marginBottom: pageIdx < pages.length - 1 ? `${PAGE_GAP}px` : 0,
                                                padding: `${pageIdx === 0 ? PT + 40 : PT}px ${PS}px ${PB}px`,
                                                boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
                                                borderRadius: '4px',
                                                border: '1px solid #e2e8f0',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                            }}>
                                                {briefpapierPreview && (
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                        backgroundImage: `url(${briefpapierPreview})`,
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
                                                    Pagina {pageIdx + 1} van {pages.length}
                                                </div>
                                                {/* Paraaf-blok onderin — boven briefpapier voettekst, links en rechts */}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: `${PB - 16}px`,
                                                    left: `${PS}px`,
                                                    right: `${PS}px`,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    zIndex: 2,
                                                    pointerEvents: 'none',
                                                }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <div style={{ width: '72px', borderBottom: '1px solid #2c3b4e', height: '16px' }}></div>
                                                        <div style={{ fontSize: '0.44rem', color: '#6b7a8d', fontFamily: "'Carlito','Calibri',Arial,sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paraaf aannemer</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <div style={{ width: '72px', borderBottom: '1px solid #2c3b4e', height: '16px' }}></div>
                                                        <div style={{ fontSize: '0.44rem', color: '#6b7a8d', fontFamily: "'Carlito','Calibri',Arial,sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paraaf onderaannemer</div>
                                                    </div>
                                                </div>
                                                <div
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    style={{
                                                        position: 'relative', zIndex: 1, height: '100%', overflow: 'hidden',
                                                        fontSize: '0.7rem', fontFamily: "'Carlito', 'Calibri', 'Segoe UI', Arial, sans-serif",
                                                        cursor: 'text', outline: 'none',
                                                    }}
                                                    onFocus={e => e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(59,130,246,0.25)'}
                                                    onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                                                >
                                                    {pageContent}
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>)
            }

            {/* ════════════════════════════════════════ */}
            {/* TAB 3 — GEMAAKTE MODELOVEREENKOMSTEN    */}
            {/* ════════════════════════════════════════ */}
            {
                activeTab === 'overzicht_contract' && (
                    <div style={panelS}>
                        <div style={headerS}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-folder-open" style={{ color: '#3b82f6', marginRight: '8px' }}></i>Gemaakte Modelovereenkomsten
                                <span style={{ marginLeft: '8px', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{contracten.length}</span>
                            </h3>
                            <button onClick={() => { setActiveTab('nieuw_contract'); setShowNewContract(true); }} style={btnPrimary}>
                                <i className="fa-solid fa-plus"></i>Nieuw Contract
                            </button>
                        </div>
                        {contracten.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                                <i className="fa-solid fa-file-circle-plus" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                                Nog geen modelovereenkomsten aangemaakt.<br />
                                <button onClick={() => { setActiveTab('nieuw_contract'); setShowNewContract(true); }}
                                    style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#25D366', fontWeight: 600, fontSize: '0.82rem' }}>
                                    → Maak je eerste overeenkomst
                                </button>
                            </div>
                        ) : contracten.map(c => {
                            const statusMap = { concept: { bg: '#f59e0b', text: 'Concept' }, verzonden: { bg: '#3b82f6', text: 'Verzonden' }, bekeken: { bg: '#8b5cf6', text: 'Bekeken' }, getekend: { bg: '#22c55e', text: 'Getekend' } };
                            const st = statusMap[c.status] || statusMap.concept;
                            return (
                                <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.projectNaam}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {c.medewerkerNaam} • € {(c.totaalBedrag || c.totaalOvereenkomst || 0).toLocaleString('nl-NL')} • {c.totaalUren} uur
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                            Aangemaakt: {new Date(c.aangemaakt).toLocaleDateString('nl-NL')} {c.getekendDatum && `• Getekend: ${c.getekendDatum}`}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: st.bg, color: '#fff' }}>{st.text}</span>
                                        <button onClick={() => window.open(`/contract/${c.id}`, '_blank')} style={{ ...btnSecondary, padding: '6px 10px', fontSize: '0.72rem' }}>
                                            <i className="fa-solid fa-eye"></i>Bekijk
                                        </button>
                                        <button onClick={() => sendContractWhatsApp(c)} style={{ ...btnPrimary, padding: '6px 10px', fontSize: '0.72rem' }}>
                                            <i className="fa-brands fa-whatsapp"></i>Verstuur
                                        </button>
                                        <button onClick={() => setContracten(prev => prev.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {/* ════════════════════════════════════════ */}
            {/* MODULE 3 — TERMIJN & FACTUUR TRACKER    */}
            {/* ════════════════════════════════════════ */}
            {
                activeTab === 'termijnen' && (
                    <div>
                        {/* ⚠️ Pre-contract waarschuwing */}
                        {(() => {
                            const preContractUren = urenLog.filter(u => u.preContract);
                            if (preContractUren.length === 0) return null;

                            // Groepeer per medewerker + project
                            const groepen = {};
                            preContractUren.forEach(u => {
                                const key = `${u.medewerkerId}_${u.projectId}`;
                                if (!groepen[key]) groepen[key] = { medewerkerNaam: u.medewerkerNaam, projectNaam: u.projectNaam, medewerkerId: u.medewerkerId, projectId: u.projectId, vroegsteDatum: u.preContractDatum, totalUren: 0, entries: [] };
                                groepen[key].totalUren += u.uren;
                                groepen[key].entries.push(u);
                                if (u.preContractDatum < groepen[key].vroegsteDatum) groepen[key].vroegsteDatum = u.preContractDatum;
                            });

                            return (
                                <div style={{ marginBottom: '16px', borderRadius: '12px', border: '2px solid #fbbf24', background: '#fffbeb', overflow: 'hidden' }}>
                                    <div style={{ padding: '10px 16px', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Uren geregistreerd zonder actief contract</span>
                                        <span style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem' }}>{Object.keys(groepen).length} combinatie(s)</span>
                                    </div>
                                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {Object.values(groepen).map((g, i) => {
                                            const dagenGeleden = g.vroegsteDatum
                                                ? Math.floor((new Date() - new Date(g.vroegsteDatum)) / 86400000)
                                                : 0;
                                            const isOverDeadline = dagenGeleden > 7;
                                            const heeftContract = contracten.find(c => c.medewerkerId === g.medewerkerId && c.projectId === g.projectId);
                                            return (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: '#fff', border: `1px solid ${isOverDeadline ? '#fca5a5' : '#fde68a'}` }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e' }}>{g.medewerkerNaam} — {g.projectNaam}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#b45309', marginTop: '2px' }}>{g.totalUren} uur geregistreerd • {g.entries.length} registratie(s) • Eerste registratie: {g.vroegsteDatum}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: isOverDeadline ? '#fee2e2' : '#fef9c3', color: isOverDeadline ? '#b91c1c' : '#92400e', border: `1px solid ${isOverDeadline ? '#fca5a5' : '#fde047'}` }}>
                                                            {isOverDeadline ? `⛔ ${dagenGeleden} dagen — DEADLINE OVERSCHREDEN` : `⏳ ${dagenGeleden}/7 dagen`}
                                                        </span>
                                                        {heeftContract ? (
                                                            <button onClick={() => sendContractWhatsApp(heeftContract)}
                                                                style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#25D366', color: '#fff', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="fa-brands fa-whatsapp"></i> Stuur contract
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => { setActiveTab('nieuw_contract'); setShowNewContract(true); }}
                                                                style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#fff', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="fa-solid fa-file-signature"></i> Maak contract
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {contracten.length === 0 ? (
                            <div style={{ ...panelS, padding: '48px', textAlign: 'center' }}>
                                <i className="fa-solid fa-chart-bar" style={{ fontSize: '3rem', color: '#cbd5e1', display: 'block', marginBottom: '12px' }}></i>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Geen contracten</div>
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Maak eerst een opdrachtovereenkomst aan in het "Nieuw Modelovereenkomst" tabblad.</div>
                            </div>
                        ) : contracten.map(contract => {
                            const termijnen = getTermijnen(contract);
                            const totaalBedrag = contract.totaalBedrag || contract.totaalOvereenkomst || 0;
                            const gewerkteUren = getContractUren(contract.id);
                            const totaalProgress = contract.totaalUren > 0 ? Math.min((gewerkteUren / contract.totaalUren) * 100, 100) : 0;

                            return (
                                <div key={contract.id} style={{ ...panelS, marginBottom: '16px' }}>
                                    {/* Contract Header */}
                                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)', color: '#fff', borderRadius: '12px 12px 0 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                {contract.contractnummer && (
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', opacity: 0.75, marginBottom: '2px', fontFamily: 'monospace' }}>
                                                        📋 {contract.contractnummer}
                                                    </div>
                                                )}
                                                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{contract.projectNaam}</div>
                                                <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{contract.medewerkerNaam} • {contract.projectLocatie}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>€ {(contract.totaalBedrag || contract.totaalOvereenkomst || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</div>
                                                <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>{contract.totaalUren} uur × € {contract.uurtarief}/uur</div>
                                            </div>
                                        </div>
                                        {/* Overall progress */}
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px', opacity: 0.8 }}>
                                                <span>{gewerkteUren.toFixed(1)} / {contract.totaalUren} uur gewerkt</span>
                                                <span>{totaalProgress.toFixed(0)}%</span>
                                            </div>
                                            <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.2)' }}>
                                                <div style={{ height: '100%', borderRadius: '4px', background: '#25D366', width: `${totaalProgress}%`, transition: 'width 0.3s' }} />
                                            </div>
                                        </div>

                                        {/* Stats rij: uren & geboekte euro's */}
                                        {(() => {
                                            const geboektBedrag = gewerkteUren * (contract.uurtarief || 0);
                                            const contractTotaalVal = contract.totaalBedrag || contract.totaalOvereenkomst || 0;
                                            const resterend = Math.max(0, contractTotaalVal - geboektBedrag);
                                            return (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginTop: '12px' }}>
                                                    {[
                                                        { label: 'Afgesproken', value: `${contract.totaalUren} uur`, icon: '📋' },
                                                        { label: 'Geboekt', value: `${gewerkteUren.toFixed(1)} uur`, icon: '⏱️' },
                                                        { label: 'Geboekte waarde', value: `€ ${geboektBedrag.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`, icon: '💶', highlight: true },
                                                        { label: 'Resterend', value: `€ ${resterend.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`, icon: '⏳' },
                                                    ].map((s, i) => (
                                                        <div key={i} style={{ background: s.highlight ? 'rgba(37,211,102,0.18)' : 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.6rem', opacity: 0.75, marginBottom: '2px' }}>{s.label}</div>
                                                            <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{s.icon} {s.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Termijnen Grid */}
                                    <div style={{ padding: '16px 20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${contract.aantalTermijnen}, 1fr)`, gap: '10px' }}>
                                            {termijnen.map((t, idx) => {
                                                const eersteNietBereikt = termijnen.findIndex(x => !x.bereikt);
                                                const isActief = idx === eersteNietBereikt;
                                                const isVergrendeld = !t.bereikt && !isActief;
                                                return (
                                                    <div key={t.nummer} style={{
                                                        padding: '14px 12px', borderRadius: '10px', textAlign: 'center',
                                                        border: t.bereikt ? '2px solid #22c55e' : isActief ? '2px solid #F5850A' : '1px solid #e2e8f0',
                                                        background: t.bereikt ? '#f0fdf4' : isActief ? 'rgba(245,133,10,0.04)' : '#f8fafc',
                                                        position: 'relative',
                                                        opacity: isVergrendeld ? 0.55 : 1,
                                                        transition: 'all 0.2s',
                                                    }}>
                                                        {t.bereikt && (
                                                            <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                                                                <i className="fa-solid fa-check"></i>
                                                            </div>
                                                        )}
                                                        {isActief && !t.bereikt && (
                                                            <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#F5850A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700 }}>
                                                                ▶
                                                            </div>
                                                        )}
                                                        {isVergrendeld && (
                                                            <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                                                                <i className="fa-solid fa-lock"></i>
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: t.bereikt ? '#15803d' : isActief ? '#c2590a' : '#94a3b8', marginBottom: '4px' }}>TERMIJN {t.nummer}</div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t.bereikt ? '#22c55e' : isActief ? '#F5850A' : '#94a3b8' }}>
                                                            € {t.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                                                        </div>
                                                        <div style={{ fontSize: '0.63rem', marginBottom: '6px', fontStyle: t.bereikt ? 'normal' : 'italic', color: t.bereikt ? '#15803d' : isActief ? '#c2590a' : '#94a3b8', fontWeight: t.bereikt || isActief ? 600 : 400 }}>
                                                            {t.bereikt
                                                                ? `✅ vrijgegeven bij ${t.drempel.toFixed(0)} uur`
                                                                : isActief
                                                                    ? `📨 factureerbaar na ${t.drempel.toFixed(0)} uur`
                                                                    : `🔒 na ${t.drempel.toFixed(0)} uur`
                                                            }
                                                        </div>
                                                        {!isVergrendeld && (
                                                            <>
                                                                <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', borderRadius: '3px', background: t.bereikt ? '#22c55e' : '#F5850A', width: `${t.progress}%`, transition: 'width 0.3s' }} />
                                                                </div>
                                                                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>{t.progress.toFixed(0)}%</div>
                                                            </>
                                                        )}
                                                        {isVergrendeld && (
                                                            <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>wacht op termijn {t.nummer - 1}</div>
                                                        )}
                                                        {/* Twee-staps goedkeuring */}
                                                        {t.bereikt && (() => {
                                                            const goedgekeurd = (contract.goedgekeurdeTermijnen || []).includes(t.nummer);
                                                            const verzonden = (contract.verzondTermijnen || []).includes(t.nummer);
                                                            if (verzonden) {
                                                                return (
                                                                    <div style={{ marginTop: '6px', padding: '4px 6px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.6rem', color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
                                                                        ✅ Melding verzonden
                                                                    </div>
                                                                );
                                                            }
                                                            if (!goedgekeurd) {
                                                                return (
                                                                    <button onClick={() => keurTermijnGoed(contract.id, t.nummer)}
                                                                        style={{ marginTop: '6px', width: '100%', padding: '6px 8px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                        <i className="fa-solid fa-circle-check"></i> Goedkeuren
                                                                    </button>
                                                                );
                                                            }
                                                            return (
                                                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <div style={{ padding: '3px 6px', borderRadius: '5px', background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.58rem', color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
                                                                        ✅ Goedgekeurd
                                                                    </div>
                                                                    <button onClick={() => sendTermijnWhatsApp(contract, t)}
                                                                        style={{ ...btnPrimary, padding: '5px 8px', fontSize: '0.68rem', width: '100%', justifyContent: 'center' }}>
                                                                        <i className="fa-brands fa-whatsapp"></i> Stuur melding
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Uren Registraties met goedkeuring */}
                                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <i className="fa-solid fa-clock-rotate-left"></i>
                                                Registraties ({urenLog.filter(u => u.medewerkerId === contract.medewerkerId && u.projectId === contract.projectId).length})
                                            </div>
                                            {urenLog.filter(u => u.medewerkerId === contract.medewerkerId && u.projectId === contract.projectId).slice(0, 8).map(u => {
                                                const isPending = !u.status || u.status === 'pending';
                                                const isAfkeuren = selectedUrenId === u.id;
                                                return (
                                                    <div key={u.id} style={{ marginBottom: '4px' }}>
                                                        {/* Rij */}
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            padding: '6px 8px', borderRadius: '7px',
                                                            background: u.status === 'goedgekeurd' ? '#eef2f7' : u.status === 'afgekeurd' ? '#fef2f2' : isAfkeuren ? '#fff7ed' : '#f8fafc',
                                                            border: `1px solid ${u.status === 'goedgekeurd' ? '#b8c8d8' : u.status === 'afgekeurd' ? '#fca5a5' : isAfkeuren ? '#fed7aa' : '#e2e8f0'}`,
                                                        }}>
                                                            {/* Info */}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '0.73rem', color: '#475569', display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                    <span style={{ fontWeight: 600 }}>{u.datum}</span>
                                                                    <span style={{ color: '#94a3b8' }}>·</span>
                                                                    <span>{u.medewerkerNaam}</span>
                                                                    <span style={{ color: '#94a3b8' }}>·</span>
                                                                    <span style={{ fontWeight: 700, color: u.status === 'goedgekeurd' ? '#16a34a' : u.status === 'afgekeurd' ? '#dc2626' : '#F5850A' }}>{u.uren} uur</span>
                                                                </div>
                                                                {u.status === 'afgekeurd' && u.opmerking && (
                                                                    <div style={{ fontSize: '0.65rem', color: '#b91c1c', marginTop: '2px', fontStyle: 'italic' }}>↩ {u.opmerking}</div>
                                                                )}
                                                            </div>

                                                            {/* Actieknoppen — altijd zichtbaar */}
                                                            {isPending && (
                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                    <button
                                                                        onClick={() => keurUrenGoed(u.id)}
                                                                        title="Goedkeuren"
                                                                        style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <i className="fa-solid fa-check"></i>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedUrenId(isAfkeuren ? null : u.id)}
                                                                        title="Afkeuren met opmerking"
                                                                        style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: isAfkeuren ? '#7f1d1d' : '#dc2626', color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <i className="fa-solid fa-xmark"></i>
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {u.status === 'goedgekeurd' && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end', flexShrink: 0 }}>
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 7px', borderRadius: '99px' }}>✅ OK</span>
                                                                    {/* Intern project tag — alleen admin ziet dit */}
                                                                    <select
                                                                        value={u.internProjectId || ''}
                                                                        onChange={e => setUrenLog(prev => prev.map(x => x.id === u.id ? { ...x, internProjectId: e.target.value || null } : x))}
                                                                        title="Intern project bewaking (niet zichtbaar voor ZZP'er)"
                                                                        style={{ fontSize: '0.6rem', padding: '2px 4px', borderRadius: '5px', border: '1px solid #bfdbfe', background: u.internProjectId ? '#eff6ff' : '#f8fafc', color: u.internProjectId ? '#1d4ed8' : '#94a3b8', cursor: 'pointer', maxWidth: '110px' }}>
                                                                        <option value="">📂 intern project</option>
                                                                        {projecten.map(p => (
                                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                            {u.status === 'afgekeurd' && (
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 7px', borderRadius: '99px' }}>❌ Afgekeurd</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditUrenId(editUrenId === u.id ? null : u.id);
                                                                            setEditWaarden({ datum: u.datum, uren: u.uren, pauze: u.pauze || '30' });
                                                                        }}
                                                                        title="Aanpassen"
                                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: editUrenId === u.id ? '#1e40af' : '#3b82f6', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                        <i className="fa-solid fa-pen"></i>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Afkeur textarea — alleen onder deze rij */}
                                                        {isAfkeuren && isPending && (
                                                            <div style={{ padding: '8px 10px', borderRadius: '0 0 7px 7px', background: '#fff7ed', border: '1px solid #fed7aa', borderTop: 'none', marginTop: '-3px' }}>
                                                                <textarea
                                                                    autoFocus
                                                                    rows={2}
                                                                    placeholder="Reden voor afkeuring... (bijv. uren kloppen niet)"
                                                                    value={urenOpmerking[u.id] || ''}
                                                                    onChange={e => setUrenOpmerking(prev => ({ ...prev, [u.id]: e.target.value }))}
                                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.72rem', fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                                                />
                                                                <button
                                                                    onClick={() => sendUrenAfkeurWhatsApp(u, urenOpmerking[u.id] || '')}
                                                                    disabled={!(urenOpmerking[u.id] || '').trim()}
                                                                    style={{ marginTop: '5px', width: '100%', padding: '6px', borderRadius: '6px', border: 'none', cursor: (urenOpmerking[u.id] || '').trim() ? 'pointer' : 'not-allowed', background: (urenOpmerking[u.id] || '').trim() ? '#25D366' : '#cbd5e1', color: '#fff', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                                    <i className="fa-brands fa-whatsapp"></i> Stuur afkeuring via WhatsApp
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Inline bewerken voor afgekeurde rijen */}
                                                        {editUrenId === u.id && u.status === 'afgekeurd' && (
                                                            <div style={{ padding: '10px 12px', borderRadius: '0 0 7px 7px', background: '#eff6ff', border: '1px solid #bfdbfe', borderTop: 'none', marginTop: '-3px' }}>
                                                                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#1d4ed8', marginBottom: '8px' }}>
                                                                    <i className="fa-solid fa-pen" style={{ marginRight: '5px' }}></i>
                                                                    Registratie aanpassen — wordt opnieuw ingediend ter beoordeling
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                                                    <div>
                                                                        <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Datum</label>
                                                                        <input type="date" value={editWaarden.datum || ''}
                                                                            onChange={e => setEditWaarden(prev => ({ ...prev, datum: e.target.value }))}
                                                                            style={{ width: '100%', padding: '5px 6px', borderRadius: '5px', border: '1px solid #bfdbfe', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }} />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Uren</label>
                                                                        <input type="number" min="0" max="24" step="0.5" value={editWaarden.uren || ''}
                                                                            onChange={e => setEditWaarden(prev => ({ ...prev, uren: parseFloat(e.target.value) || 0 }))}
                                                                            style={{ width: '100%', padding: '5px 6px', borderRadius: '5px', border: '1px solid #bfdbfe', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }} />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: '0.62rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Pauze (min)</label>
                                                                        <input type="number" min="0" max="120" step="15" value={editWaarden.pauze || ''}
                                                                            onChange={e => setEditWaarden(prev => ({ ...prev, pauze: e.target.value }))}
                                                                            style={{ width: '100%', padding: '5px 6px', borderRadius: '5px', border: '1px solid #bfdbfe', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button onClick={() => setEditUrenId(null)}
                                                                        style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer', background: '#fff', color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
                                                                        Annuleren
                                                                    </button>
                                                                    <button onClick={() => pasUrenAan(u.id, editWaarden)}
                                                                        style={{ flex: 2, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                                        <i className="fa-solid fa-rotate-right"></i> Opnieuw indienen
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {urenLog.filter(u => u.medewerkerId === contract.medewerkerId && u.projectId === contract.projectId).length === 0 && (
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Nog geen uren geregistreerd voor dit contract.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {/* ══ INTERN PROJECTOVERZICHT — ZZP-uren per project ══ */}
            {activeTab === 'termijnen' && (() => {
                const getagd = urenLog.filter(u => u.internProjectId && u.status === 'goedgekeurd');
                if (getagd.length === 0) return null;

                // Groepeer op intern project
                const perProject = {};
                getagd.forEach(u => {
                    if (!perProject[u.internProjectId]) perProject[u.internProjectId] = { uren: 0, entries: [] };
                    perProject[u.internProjectId].uren += u.uren;
                    perProject[u.internProjectId].entries.push(u);
                });

                return (
                    <div style={{ ...panelS, marginTop: '16px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-chart-pie" style={{ color: '#3b82f6' }}></i>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>Intern projectoverzicht — ZZP-uren</span>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 'auto', fontStyle: 'italic' }}>
                                🔒 Alleen zichtbaar voor admin · ZZP'er ziet dit niet
                            </span>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(perProject).map(([projectId, data]) => {
                                const project = projecten.find(p => p.id === projectId);
                                const projectNaam = project?.name || data.entries[0]?.projectNaam || projectId;
                                const totaalUren = data.uren;
                                return (
                                    <div key={projectId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                                                <i className="fa-solid fa-folder" style={{ color: '#3b82f6', marginRight: '6px' }}></i>
                                                {projectNaam}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                                                {data.entries.length} registratie(s) van {[...new Set(data.entries.map(e => e.medewerkerNaam))].join(', ')}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1d4ed8' }}>
                                            {totaalUren.toFixed(1)} uur
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ padding: '8px 16px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', fontSize: '0.68rem', color: '#64748b', borderRadius: '0 0 12px 12px' }}>
                            💡 Tip: koppel goedgekeurde uren aan een intern project via het dropdown-menu bij elke registratie
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
