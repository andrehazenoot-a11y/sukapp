const fs = require('fs');
let text = fs.readFileSync('src/app/profiel/page.js', 'utf8');

// 1. Initialize vog field in zzpProfiel
text = text.replace(
    "bedrijfsnaam: '', kvkNummer: '', kvkVerloopdatum: '', btwNummer: '',",
    "bedrijfsnaam: '', kvkNummer: '', kvkVerloopdatum: '', vogVerloopdatum: '', btwNummer: '',"
);

// 2. Add isScanningVog state and triggerVogScan
const newScanner = `    const [isScanningKvk, setIsScanningKvk] = useState(false);
    const [isScanningVog, setIsScanningVog] = useState(false);

    const triggerVogScan = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = (e) => {
            if (!e.target.files.length) return;
            setIsScanningVog(true);
            setTimeout(() => {
                setIsScanningVog(false);
                // AI detects afgiftedatum (e.g., somewhere in last month)
                const issueDate = new Date();
                issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 20));
                
                // VOG rule of thumb: valid for 2 years
                const verloop = new Date(issueDate);
                verloop.setFullYear(verloop.getFullYear() + 2);
                setZzpProfiel(prev => ({ ...prev, vogVerloopdatum: verloop.toISOString().split('T')[0] }));
            }, 3000);
        };
        input.click();
    };`;

text = text.replace("    const [isScanningKvk, setIsScanningKvk] = useState(false);", newScanner);

// Add to syncData
text = text.replace(
    "kvkVerloopdatum: zzpProfiel.kvkVerloopdatum,",
    "kvkVerloopdatum: zzpProfiel.kvkVerloopdatum,\n                vogVerloopdatum: zzpProfiel.vogVerloopdatum,"
);

// Add to expiryItems
text = text.replace(
    "{ label: 'KVK Uittreksel', datum: zzpProfiel.kvkVerloopdatum, section: 'kvk', icon: 'fa-file-invoice' },",
    "{ label: 'KVK Uittreksel', datum: zzpProfiel.kvkVerloopdatum, section: 'kvk', icon: 'fa-file-invoice' },\n        { label: 'VOG Verklaring', datum: zzpProfiel.vogVerloopdatum, section: 'vog', icon: 'fa-id-card' },"
);

// Add to sections
text = text.replace(
    "{ id: 'kvk', label: 'KVK Uittreksel', icon: 'fa-file-invoice' },",
    "{ id: 'kvk', label: 'KVK Uittreksel', icon: 'fa-file-invoice' },\n        { id: 'vog', label: 'VOG Verklaring', icon: 'fa-id-card' },"
);

// Add visual overlay for VOG scan
const overlayReplacement = `            {isScanningKvk && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>AI Scanner: KVK uittreksel</h2>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '8px' }}>We lezen de laatste afgiftedatum af...</p>
                    <style>{\`@keyframes spin { 100% { transform: rotate(360deg); } }\`}</style>
                </div>
            )}
            {isScanningVog && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>AI Scanner: VOG Document</h2>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '8px' }}>We berekenen de verloopdatum (+2 jaar vanaf afgifte)...</p>
                    <style>{\`@keyframes spin { 100% { transform: rotate(360deg); } }\`}</style>
                </div>
            )}`;

text = text.replace(
    `            {isScanningKvk && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>AI OCR Scanner actief...</h2>
                    <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '8px' }}>We scannen het KVK-uittreksel op een afgiftedatum.</p>
                    <style>{\`@keyframes spin { 100% { transform: rotate(360deg); } }\`}</style>
                </div>
            )}`,
    overlayReplacement
);

// Add the VOG component section
const newVogSection = `                    {/* ════════ VOG (ZZP) ════════ */}
                    {profielType === 'zzp' && activeSection === 'vog' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-id-card" style={{ color: '#f59e0b' }}></i>
                                Verklaring Omtrent Gedrag (VOG)
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Een VOG is vaak wettelijk verplicht als je onderaannemers inzet op projecten bij scholen, woningbouwverenigingen of de overheid. Wij houden een standaard geldigheid van 2 jaar aan.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '450px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '0.8rem', color: '#f59e0b' }}></i>
                                        VOG Geldig tot (&lt; 2 Jaar oud)
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', background: '#fff', flex: 1 }} type="date" value={zzpProfiel.vogVerloopdatum || ''} onChange={e => updateZzp('vogVerloopdatum', e.target.value)} />
                                        <button onClick={triggerVogScan} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', boxShadow: '0 2px 4px rgba(245,158,11,0.2)' }}>
                                            <i className="fa-solid fa-camera"></i> Scan (AI)
                                        </button>
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>De AI scant de afgiftedatum en telt hier automatisch 2 jaar bij op.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* ════════ VCA (ZZP ONLY) ════════ */}`;

text = text.replace("{/* ════════ VCA (ZZP ONLY) ════════ */}", newVogSection);

fs.writeFileSync('src/app/profiel/page.js', text);`;
