const fs = require('fs');
let text = fs.readFileSync('src/app/profiel/page.js', 'utf8');

// 1. Add KVK to zzpSections
text = text.replace(
    "{ id: 'vca', label: 'VCA Certificaat', icon: 'fa-certificate' },",
    "{ id: 'kvk', label: 'KVK Uittreksel', icon: 'fa-file-invoice' },\n        { id: 'vca', label: 'VCA Certificaat', icon: 'fa-certificate' },"
);

// 2. Remove from Bedrijfsgegevens
const oldBlock = `                                <div>
                                    <Field label="KVK Nummer" icon="fa-hashtag" field="kvkNummer" placeholder="12345678" obj={zzpProfiel} upd={updateZzp} />
                                    <div style={{ marginTop: '8px' }}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="fa-solid fa-file-invoice" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>
                                            KVK Verloopdatum (&lt; 3 mnd)
                                        </label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <input style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fafafa', flex: 1 }} type="date" value={zzpProfiel.kvkVerloopdatum || ''} onChange={e => updateZzp('kvkVerloopdatum', e.target.value)} />
                                            <button onClick={triggerKvkScan} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                                                <i className="fa-solid fa-camera"></i> Scan
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <Field label="BTW Nummer" icon="fa-receipt" field="btwNummer" placeholder="NL000000000B01" obj={zzpProfiel} upd={updateZzp} />
                                <div></div>`;

text = text.replace(
    oldBlock,
    `<Field label="KVK Nummer" icon="fa-hashtag" field="kvkNummer" placeholder="12345678" obj={zzpProfiel} upd={updateZzp} />\n                                <Field label="BTW Nummer" icon="fa-receipt" field="btwNummer" placeholder="NL000000000B01" obj={zzpProfiel} upd={updateZzp} />`
);

// 3. Insert KVK section before VCA
const newSection = `                    {/* ════════ KVK UITTREKSEL (ZZP) ════════ */}
                    {profielType === 'zzp' && activeSection === 'kvk' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-file-invoice" style={{ color: '#3b82f6' }}></i>
                                KVK Uittreksel
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Beheer hier je inschrijving bij de Kamer van Koophandel. Om de 3 maanden herinneren we je automatisch om een nieuw uittreksel te uploaden.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '500px' }}>
                                <Field label="KVK Nummer" icon="fa-hashtag" field="kvkNummer" placeholder="12345678" obj={zzpProfiel} upd={updateZzp} />
                                
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '0.8rem', color: '#3b82f6' }}></i>
                                        KVK Verloopdatum
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', background: '#fff', flex: 1 }} type="date" value={zzpProfiel.kvkVerloopdatum || ''} onChange={e => updateZzp('kvkVerloopdatum', e.target.value)} />
                                        <button onClick={triggerKvkScan} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', boxShadow: '0 2px 4px rgba(59,130,246,0.2)' }}>
                                            <i className="fa-solid fa-camera"></i> Scan (AI)
                                        </button>
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Upload een recent uittreksel (max. 3 maanden oud).</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* ════════ VCA (ZZP ONLY) ════════ */}`;

text = text.replace("{/* ════════ VCA (ZZP ONLY) ════════ */}", newSection);

// Update sectionAlert mapping
text = text.replace(
    "{ label: 'KVK Uittreksel', datum: zzpProfiel.kvkVerloopdatum, section: 'gegevens', icon: 'fa-file-invoice' },",
    "{ label: 'KVK Uittreksel', datum: zzpProfiel.kvkVerloopdatum, section: 'kvk', icon: 'fa-file-invoice' },"
);

fs.writeFileSync('src/app/profiel/page.js', text);
