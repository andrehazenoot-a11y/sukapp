'use client';

import { useState } from 'react';

// == CONTRACT DATA ==
const CONTRACT_FIELDS = {
    // Aannemer
    aannemer_bedrijf: '', aannemer_kvk: '', aannemer_btw: '', aannemer_adres: '',
    aannemer_naam: '', aannemer_email: '',
    // Onderaannemer
    zzp_naam: '', zzp_kvk: '', zzp_btw: '', zzp_iban: '',
    zzp_adres: '', zzp_email: '', zzp_telefoon: '',
    // Project
    project_naam: '', project_locatie: '', project_omschrijving: '', project_opdrachtgever: '',
    // Planning
    start_datum: '', eind_datum: '', max_uren: '',
    // Financieel
    aanneemsom_excl: '', btw_tarief: '21%', aanneemsom_incl: '', betaaltermijn: '14 dagen',
    btw_verlegd: 'Nee',
    // Termijnen
    termijn1_omschrijving: '', termijn1_bedrag: '',
    termijn2_omschrijving: '', termijn2_bedrag: '',
    termijn3_omschrijving: '', termijn3_bedrag: '',
    // Ondertekening
    plaats: '', datum_ondertekening: '',
};

// == Invulveld component ==
function ContractField({ label, value, onChange, placeholder, type = 'text', width = '100%' }) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || label}
            style={{
                background: value ? '#fff' : 'rgba(250,160,82,0.06)',
                border: value ? '1px solid var(--border-color)' : '1px dashed var(--accent)',
                borderRadius: '5px', padding: '6px 10px', fontSize: '0.85rem',
                color: value ? '#1e293b' : 'var(--accent)',
                fontStyle: value ? 'normal' : 'italic',
                outline: 'none', width, fontFamily: 'inherit',
                transition: 'all 0.15s'
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px rgba(250,160,82,0.15)'; }}
            onBlur={e => { e.target.style.borderColor = value ? 'var(--border-color)' : 'var(--accent)'; e.target.style.boxShadow = 'none'; }}
        />
    );
}

// == Tabel rij ==
function FieldRow({ label, fieldKey, fields, setField, placeholder }) {
    return (
        <tr>
            <td style={{ fontWeight: 600, fontSize: '0.82rem', color: '#475569', padding: '6px 12px', width: '220px', verticalAlign: 'middle' }}>{label}</td>
            <td style={{ padding: '4px 12px' }}>
                <ContractField
                    value={fields[fieldKey]}
                    onChange={v => setField(fieldKey, v)}
                    placeholder={placeholder || label + ' invullen'}
                />
            </td>
        </tr>
    );
}

export default function ZzpPage() {
    const [activeTab, setActiveTab] = useState('uren');
    const [fields, setFields] = useState({ ...CONTRACT_FIELDS });
    const [showContract, setShowContract] = useState(false);

    const setField = (key, val) => setFields({ ...fields, [key]: val });

    // Contract stijlen
    const sectionStyle = { marginBottom: '28px' };
    const articleTitle = { fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px', borderBottom: '2px solid var(--accent)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' };
    const subTitle = { fontSize: '0.88rem', fontWeight: 600, color: '#475569', marginBottom: '8px', marginTop: '14px' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' };
    const paraStyle = { fontSize: '0.85rem', lineHeight: 1.7, color: '#334155', marginBottom: '8px' };
    const listStyle = { fontSize: '0.85rem', lineHeight: 1.8, color: '#334155', paddingLeft: '20px', marginBottom: '8px' };

    return (
        <div className="content-area">
            <div className="page-header">
                <h1>ZZP Portaal</h1>
                <p>Urenregistratie en Modelovereenkomsten voor onderaannemers.</p>
            </div>

            <div className="tabs" style={{ marginBottom: '12px' }}>
                <button className={`tab-btn ${activeTab === 'uren' ? 'active' : ''}`} onClick={() => setActiveTab('uren')}>
                    Mijn Urenregistratie
                </button>
                <button className={`tab-btn ${activeTab === 'contracten' ? 'active' : ''}`} onClick={() => setActiveTab('contracten')}>
                    Modelovereenkomsten <span className="badge" style={{ marginLeft: '8px', background: 'var(--accent)', color: 'white' }}>1</span>
                </button>
                <button className={`tab-btn ${activeTab === 'contract-nieuw' ? 'active' : ''}`} onClick={() => setActiveTab('contract-nieuw')}>
                    <i className="fa-solid fa-file-contract" style={{ marginRight: '6px' }}></i>
                    Onderaannemingsovereenkomst
                </button>
            </div>

            {/* == UREN TAB == */}
            {activeTab === 'uren' && (
                <div className="tab-content active">
                    <div className="dashboard-panels" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="panel">
                            <div className="panel-header">
                                <h2>Wekelijkse Declaratie Indienen</h2>
                            </div>
                            <form className="form-grid">
                                <div className="form-group">
                                    <label>Aan welke klus heb je gewerkt?</label>
                                    <select className="form-control" defaultValue="">
                                        <option value="" disabled>Selecteer project...</option>
                                        <option value="1">Schilderwerk Binnenstad</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group half">
                                        <label>Totaal Uren (Week 10)</label>
                                        <input type="number" defaultValue="38.5" className="form-control" />
                                    </div>
                                    <div className="form-group half">
                                        <label>Uurtarief (€)</label>
                                        <input type="text" defaultValue="35,00" disabled className="form-control" style={{ opacity: 0.7 }} />
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                        Ter Goedkeuring Indienen
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* == CONTRACTEN OVERZICHT TAB == */}
            {activeTab === 'contracten' && (
                <div className="tab-content active">
                    <div className="panel" style={{ padding: 0 }}>
                        <div className="panel-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                            <h2>Documenten & Contracten</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-grey)', marginTop: '4px' }}>Download en onderteken je modelovereenkomsten digitaal.</p>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Document</th>
                                    <th>Geldig Voor</th>
                                    <th>Status</th>
                                    <th>Datum Verzonden</th>
                                    <th>Actie</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Modelovereenkomst Schilders (2025)</strong></td>
                                    <td>Alle Projecten 2025</td>
                                    <td><span className="status-badge warning">Wacht op Handtekening</span></td>
                                    <td>12-02-2025</td>
                                    <td><button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Digitaal Tekenen</button></td>
                                </tr>
                                <tr>
                                    <td>Modelovereenkomst (2024)</td>
                                    <td>Alle Projecten 2024</td>
                                    <td><span className="status-badge success">Ondertekend</span></td>
                                    <td>10-01-2024</td>
                                    <td><button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}><i className="fa-solid fa-download"></i> PDF</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* == ONDERAANNEMINGSOVEREENKOMST TAB == */}
            {activeTab === 'contract-nieuw' && (
                <div className="tab-content active">
                    <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                            padding: '28px 32px', color: '#fff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <i className="fa-solid fa-file-contract" style={{ fontSize: '1.5rem', opacity: 0.8 }}></i>
                                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>ONDERAANNEMINGSOVEREENKOMST</h2>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.8, lineHeight: 1.5 }}>
                                Aanneming van werk — Schilderswerkzaamheden<br />
                                <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>Conform Modelovereenkomst Afbouw | Belastingdienst kenmerk nr. 908202110378410</span>
                            </p>
                        </div>

                        {/* Let op balk */}
                        <div style={{
                            background: 'rgba(250,160,82,0.08)', borderLeft: '4px solid var(--accent)',
                            padding: '12px 20px', fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5
                        }}>
                            <strong><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>LET OP:</strong> Vul alle
                            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}> oranje/cursieve </span>
                            velden projectspecifiek in voordat het contract wordt ondertekend. Controleer altijd of de feitelijke uitvoering overeenkomt met hetgeen in dit contract is bepaald.
                        </div>

                        <div style={{ padding: '24px 32px' }}>

                            {/* Geldigheid */}
                            <p style={{ ...paraStyle, fontStyle: 'italic', color: '#64748b', fontSize: '0.8rem' }}>
                                Deze overeenkomst is gelijkluidend aan de door de Belastingdienst op 29 september 2022 onder nummer 908202110378410 beoordeelde overeenkomst.
                            </p>

                            {/* === ARTIKEL 1 — PARTIJEN === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§1</span> Artikel 1 — Partijen</h3>
                                <p style={paraStyle}>De ondergetekenden:</p>

                                <p style={subTitle}><i className="fa-solid fa-building" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>AANNEMER (Opdrachtgever):</p>
                                <table style={tableStyle}>
                                    <tbody>
                                        <FieldRow label="Bedrijfsnaam" fieldKey="aannemer_bedrijf" fields={fields} setField={setField} placeholder="Naam schildersbedrijf invullen" />
                                        <FieldRow label="KvK-nummer" fieldKey="aannemer_kvk" fields={fields} setField={setField} placeholder="KvK-nummer invullen" />
                                        <FieldRow label="BTW-nummer" fieldKey="aannemer_btw" fields={fields} setField={setField} placeholder="BTW-nummer invullen" />
                                        <FieldRow label="Adres" fieldKey="aannemer_adres" fields={fields} setField={setField} placeholder="Adres, postcode, plaats invullen" />
                                        <FieldRow label="Vertegenwoordigd door" fieldKey="aannemer_naam" fields={fields} setField={setField} placeholder="Naam eigenaar/directeur invullen" />
                                        <FieldRow label="E-mail" fieldKey="aannemer_email" fields={fields} setField={setField} placeholder="E-mailadres invullen" />
                                    </tbody>
                                </table>

                                <p style={{ ...paraStyle, textAlign: 'center', fontWeight: 700, margin: '16px 0', color: '#64748b' }}>EN</p>

                                <p style={subTitle}><i className="fa-solid fa-user-helmet-safety" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>ONDERAANNEMER (Opdrachtnemer / ZZP&apos;er):</p>
                                <table style={tableStyle}>
                                    <tbody>
                                        <FieldRow label="Naam onderneming / ZZP'er" fieldKey="zzp_naam" fields={fields} setField={setField} placeholder="Naam ZZP'er of eenmanszaak invullen" />
                                        <FieldRow label="KvK-nummer" fieldKey="zzp_kvk" fields={fields} setField={setField} placeholder="KvK-nummer invullen" />
                                        <FieldRow label="BTW-nummer" fieldKey="zzp_btw" fields={fields} setField={setField} placeholder="BTW-nummer invullen" />
                                        <FieldRow label="IBAN" fieldKey="zzp_iban" fields={fields} setField={setField} placeholder="IBAN-bankrekeningnummer invullen" />
                                        <FieldRow label="Adres" fieldKey="zzp_adres" fields={fields} setField={setField} placeholder="Adres, postcode, plaats invullen" />
                                        <FieldRow label="E-mail" fieldKey="zzp_email" fields={fields} setField={setField} placeholder="E-mailadres invullen" />
                                        <FieldRow label="Telefoon" fieldKey="zzp_telefoon" fields={fields} setField={setField} placeholder="Telefoonnummer invullen" />
                                    </tbody>
                                </table>

                                <p style={{ ...paraStyle, marginTop: '12px', fontStyle: 'italic' }}>Hierna gezamenlijk te noemen: &quot;Partijen&quot;.</p>
                            </div>

                            {/* === ARTIKEL 2 — OBJECT === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§2</span> Artikel 2 — Object van de Overeenkomst</h3>
                                <p style={paraStyle}>Partijen zijn overeengekomen dat de Onderaannemer de navolgende werkzaamheden op aanneming van werk zal verrichten:</p>

                                <p style={subTitle}>Projectomschrijving:</p>
                                <table style={tableStyle}>
                                    <tbody>
                                        <FieldRow label="Projectnaam" fieldKey="project_naam" fields={fields} setField={setField} placeholder="Bijv. 'Appartementen Den Haag'" />
                                        <FieldRow label="Locatie / Adres project" fieldKey="project_locatie" fields={fields} setField={setField} placeholder="Adres van de werklocatie invullen" />
                                        <FieldRow label="Omschrijving werkzaamheden" fieldKey="project_omschrijving" fields={fields} setField={setField} placeholder="Bijv. 'Schilderwerk gevels en trappenhuizen blok A t/m C'" />
                                        <FieldRow label="Opdrachtgever van aannemer" fieldKey="project_opdrachtgever" fields={fields} setField={setField} placeholder="Naam eindklant / hoofdopdrachtgever" />
                                    </tbody>
                                </table>

                                <p style={{ ...paraStyle, marginTop: '12px' }}>
                                    De Onderaannemer levert een afgebakende prestatie (resultaatverplichting) en verricht de werkzaamheden zelfstandig, zonder gezagsverhouding met de Aannemer.
                                </p>
                            </div>

                            {/* === ARTIKEL 3 — LOOPTIJD === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§3</span> Artikel 3 — Looptijd & Planning</h3>
                                <table style={tableStyle}>
                                    <tbody>
                                        <FieldRow label="Startdatum" fieldKey="start_datum" fields={fields} setField={setField} placeholder="dd-mm-jjjj" />
                                        <FieldRow label="Verwachte einddatum" fieldKey="eind_datum" fields={fields} setField={setField} placeholder="dd-mm-jjjj" />
                                        <FieldRow label="Maximaal te werken uren" fieldKey="max_uren" fields={fields} setField={setField} placeholder="Bijv. 500 uur" />
                                    </tbody>
                                </table>
                                <p style={{ ...paraStyle, marginTop: '12px' }}>
                                    De Onderaannemer bepaalt zelfstandig zijn werktijden en planning, met inachtneming van de overeengekomen opleverdatum.
                                </p>
                            </div>

                            {/* === ARTIKEL 4 — AANNEEMSOM === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§4</span> Artikel 4 — Aanneemsom & Betalingsvoorwaarden</h3>
                                <table style={tableStyle}>
                                    <tbody>
                                        <FieldRow label="Aanneemsom (excl. BTW)" fieldKey="aanneemsom_excl" fields={fields} setField={setField} placeholder="Bijv. € 10.000,00" />
                                        <FieldRow label="BTW-tarief" fieldKey="btw_tarief" fields={fields} setField={setField} placeholder="Bijv. 21% of 0% als verlegd" />
                                        <FieldRow label="Aanneemsom (incl. BTW)" fieldKey="aanneemsom_incl" fields={fields} setField={setField} placeholder="Bijv. € 12.100,00" />
                                        <FieldRow label="Betalingstermijn" fieldKey="betaaltermijn" fields={fields} setField={setField} placeholder="Bijv. 14 dagen na factuurdatum" />
                                        <FieldRow label="BTW verlegd?" fieldKey="btw_verlegd" fields={fields} setField={setField} placeholder="Ja / Nee" />
                                    </tbody>
                                </table>

                                <p style={subTitle}>Termijnen en facturering:</p>
                                <p style={paraStyle}>Partijen komen overeen dat de Onderaannemer de aanneemsom in de navolgende termijnen kan factureren:</p>
                                <table style={{ ...tableStyle, fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: '#475569', width: '120px' }}>Termijn</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: '#475569' }}>Omschrijving op factuur</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: '#475569', width: '180px' }}>Bedrag (excl. BTW)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '6px 12px', fontWeight: 500 }}>1e termijn</td>
                                            <td style={{ padding: '4px 8px' }}><ContractField value={fields.termijn1_omschrijving} onChange={v => setField('termijn1_omschrijving', v)} placeholder="1e termijn conform contract [projectnaam]" /></td>
                                            <td style={{ padding: '4px 8px' }}><ContractField value={fields.termijn1_bedrag} onChange={v => setField('termijn1_bedrag', v)} placeholder="€ [bedrag]" /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '6px 12px', fontWeight: 500 }}>2e termijn</td>
                                            <td style={{ padding: '4px 8px' }}><ContractField value={fields.termijn2_omschrijving} onChange={v => setField('termijn2_omschrijving', v)} placeholder="2e termijn conform contract [projectnaam]" /></td>
                                            <td style={{ padding: '4px 8px' }}><ContractField value={fields.termijn2_bedrag} onChange={v => setField('termijn2_bedrag', v)} placeholder="€ [bedrag]" /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '6px 12px', fontWeight: 500 }}>Eindtermijn</td>
                                            <td style={{ padding: '4px 8px' }}><ContractField value={fields.termijn3_omschrijving} onChange={v => setField('termijn3_omschrijving', v)} placeholder="Eindtermijn/oplevering conform contract [projectnaam]" /></td>
                                            <td style={{ padding: '4px 8px' }}><ContractField value={fields.termijn3_bedrag} onChange={v => setField('termijn3_bedrag', v)} placeholder="€ [bedrag]" /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* === ARTIKEL 5 — ZELFSTANDIGHEID === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§5</span> Artikel 5 — Zelfstandigheid & Geen Gezagsverhouding</h3>
                                <p style={paraStyle}>De Onderaannemer voert de overeengekomen werkzaamheden uit als zelfstandig ondernemer. Er is nadrukkelijk geen sprake van een arbeidsovereenkomst of gezagsverhouding. Dit houdt in dat:</p>
                                <ol style={listStyle}>
                                    <li>De Onderaannemer zelfstandig bepaalt hoe en wanneer hij de werkzaamheden uitvoert;</li>
                                    <li>De Onderaannemer beschikt over eigen gereedschap en materieel;</li>
                                    <li>De Onderaannemer het risico draagt voor fouten en herstelwerkzaamheden;</li>
                                    <li>De Onderaannemer zich kan laten vervangen door een derde, mits de Aannemer hiermee instemt;</li>
                                    <li>De Onderaannemer ook voor andere opdrachtgevers werkzaam mag zijn;</li>
                                    <li>De Onderaannemer geen recht heeft op doorbetaling bij ziekte, vakantiegeld of andere arbeidsrechtelijke aanspraken;</li>
                                    <li>De Onderaannemer zelf zorgdraagt voor betaling van zijn belastingen en sociale premies.</li>
                                </ol>
                            </div>

                            {/* === ARTIKEL 6 — VERPLICHTINGEN === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§6</span> Artikel 6 — Verplichtingen Onderaannemer</h3>
                                <ol style={listStyle}>
                                    <li>De Onderaannemer zorgt voor een geldige inschrijving bij de Kamer van Koophandel gedurende de looptijd van deze overeenkomst;</li>
                                    <li>De Onderaannemer is in het bezit van een aansprakelijkheidsverzekering voor bedrijven (AVB) en overlegt desgevraagd bewijs hiervan;</li>
                                    <li>De Onderaannemer gebruikt eigen werkkleding en eigen gereedschap;</li>
                                    <li>De Onderaannemer voldoet aan de geldende veiligheids- en arbo-regelgeving op de werklocatie;</li>
                                    <li>De Onderaannemer factureert conform de in dit contract overeengekomen termijnen en bedragen.</li>
                                </ol>
                            </div>

                            {/* === ARTIKEL 7 — AANSPRAKELIJKHEID === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§7</span> Artikel 7 — Aansprakelijkheid</h3>
                                <ol style={listStyle}>
                                    <li>De Onderaannemer is aansprakelijk voor schade die is veroorzaakt door tekortkomingen in de uitvoering van de overeengekomen werkzaamheden;</li>
                                    <li>De Onderaannemer vrijwaart de Aannemer voor claims van derden die voortvloeien uit de uitvoering van de werkzaamheden door de Onderaannemer;</li>
                                    <li>De aansprakelijkheid van de Aannemer jegens de Onderaannemer is beperkt tot de overeengekomen aanneemsom.</li>
                                </ol>
                            </div>

                            {/* === ARTIKEL 8 — BEËINDIGING === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§8</span> Artikel 8 — Beëindiging</h3>
                                <ol style={listStyle}>
                                    <li>Deze overeenkomst eindigt van rechtswege na oplevering en finale betaling van het overeengekomen werk;</li>
                                    <li>Partijen kunnen de overeenkomst voortijdig beëindigen bij schriftelijke instemming van beiden;</li>
                                    <li>Bij wanprestatie kan de benadeelde partij de overeenkomst met onmiddellijke ingang ontbinden, na schriftelijke ingebrekestelling.</li>
                                </ol>
                            </div>

                            {/* === ARTIKEL 9 — TOEPASSELIJK RECHT === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§9</span> Artikel 9 — Toepasselijk Recht & Geschillen</h3>
                                <p style={paraStyle}>
                                    Op deze overeenkomst is Nederlands recht van toepassing. Geschillen die voortvloeien uit of samenhangen met deze overeenkomst worden voorgelegd aan de bevoegde rechter in het arrondissement waar de Aannemer is gevestigd.
                                </p>
                            </div>

                            {/* === ARTIKEL 10 — SLOTBEPALINGEN === */}
                            <div style={sectionStyle}>
                                <h3 style={articleTitle}><span style={{ color: 'var(--accent)' }}>§10</span> Artikel 10 — Slotbepalingen</h3>
                                <ol style={listStyle}>
                                    <li>Deze overeenkomst treedt in werking op de datum van ondertekening door beide Partijen;</li>
                                    <li>Wijzigingen en aanvullingen op deze overeenkomst zijn slechts geldig indien schriftelijk overeengekomen;</li>
                                    <li>Indien een bepaling in deze overeenkomst nietig of vernietigbaar is, blijven de overige bepalingen van kracht;</li>
                                    <li>Deze overeenkomst vervangt alle eerdere afspraken tussen Partijen met betrekking tot dit project.</li>
                                </ol>
                            </div>

                            {/* === ONDERTEKENING === */}
                            <div style={{ ...sectionStyle, borderTop: '3px solid #1e293b', paddingTop: '24px' }}>
                                <h3 style={{ ...articleTitle, borderBottom: '2px solid #1e293b' }}>
                                    <i className="fa-solid fa-signature" style={{ color: 'var(--accent)' }}></i> ONDERTEKENING
                                </h3>

                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>Aldus overeengekomen en in tweevoud ondertekend te</span>
                                    <ContractField value={fields.plaats} onChange={v => setField('plaats', v)} placeholder="Plaats" width="150px" />
                                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>, op</span>
                                    <ContractField value={fields.datum_ondertekening} onChange={v => setField('datum_ondertekening', v)} placeholder="Datum" width="150px" />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '20px' }}>
                                    {/* Aannemer */}
                                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#1e293b' }}>
                                            <i className="fa-solid fa-building" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                                            AANNEMER (Opdrachtgever)
                                        </h4>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Naam:</label>
                                            <div style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 0', minHeight: '24px', fontSize: '0.85rem' }}>
                                                {fields.aannemer_naam || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>___________________________</span>}
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Datum:</label>
                                            <div style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 0', minHeight: '24px', fontSize: '0.85rem' }}>
                                                {fields.datum_ondertekening || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>___________________________</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Handtekening:</label>
                                            <div style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 0', minHeight: '60px' }}></div>
                                        </div>
                                    </div>

                                    {/* Onderaannemer */}
                                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px' }}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#1e293b' }}>
                                            <i className="fa-solid fa-user-helmet-safety" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                                            ONDERAANNEMER (ZZP&apos;er)
                                        </h4>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Naam:</label>
                                            <div style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 0', minHeight: '24px', fontSize: '0.85rem' }}>
                                                {fields.zzp_naam || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>___________________________</span>}
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Datum:</label>
                                            <div style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 0', minHeight: '24px', fontSize: '0.85rem' }}>
                                                {fields.datum_ondertekening || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>___________________________</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Handtekening:</label>
                                            <div style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 0', minHeight: '60px' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* === WETTELIJKE GRONDSLAG === */}
                            <div style={{
                                background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '16px 20px',
                                border: '1px solid var(--border-color)', marginTop: '16px'
                            }}>
                                <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#475569' }}>
                                    <i className="fa-solid fa-scale-balanced" style={{ marginRight: '6px', color: 'var(--accent)' }}></i>
                                    Wettelijke grondslag & geldigheid
                                </h4>
                                <p style={{ ...paraStyle, fontSize: '0.8rem', margin: 0 }}>
                                    Deze overeenkomst is gelijkluidend aan de door de Belastingdienst op 29 september 2022 onder nummer 908202110378410 beoordeelde overeenkomst (Modelovereenkomst Afbouw, NOA). De modelovereenkomst is geldig tot 31 december 2029. Opdrachtgever en opdrachtnemer kunnen aan deze overeenkomst het vertrouwen ontlenen dat geen loonheffingen hoeven te worden afgedragen of voldaan, mits de samenwerking ook in de praktijk overeenkomt met het bepaalde in deze overeenkomst.
                                </p>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '8px', marginBottom: 0 }}>
                                    Disclaimer: dit is een template op basis van de Modelovereenkomst Afbouw. Raadpleeg altijd een juridisch of fiscaal adviseur voor uw specifieke situatie.
                                </p>
                            </div>

                            {/* === ACTIE KNOPPEN === */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                                <button className="btn btn-secondary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-print"></i> Afdrukken
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-download"></i> PDF Downloaden
                                </button>
                                <button className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-paper-plane"></i> Versturen ter Ondertekening
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
