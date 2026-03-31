'use client';

import { useState, useRef } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useRouter } from 'next/navigation';

export default function OnboardingGeneratorPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [templateType, setTemplateType] = useState('werknemer');
    const [kandidaatNaam, setKandidaatNaam] = useState('');
    
    // De blokken die we kunnen opvragen
    const [reqs, setReqs] = useState({
        // Basis (altijd required, maar we tonen ze voor duidelijkheid)
        basis: true,
        // Identiteit
        geboortedatum: false,
        noodcontact: false,
        adres: false,
        bsn: false,
        nationaliteit: false,
        idBewijs: false, // voor toekomstige upload
        // Financiën
        iban: false,
        loonheffing: false,
        // ZZP specifiek
        kvk: false,
        btw: false,
        uurtarief: false,
        avb: false, // aansprakelijkheid
        // Kwalificaties
        vca: false,
        bhv: false,
        vog: false,
        rijbewijs: false,
    });

    const applyTemplate = (type) => {
        setTemplateType(type);
        if (type === 'zzp') {
            setReqs({
                ...reqs,
                geboortedatum: false, noodcontact: true,
                adres: true, bsn: true, nationaliteit: false, idBewijs: false,
                iban: true, loonheffing: false,
                kvk: true, btw: true, uurtarief: true, avb: true,
                vca: true, bhv: false, vog: false, rijbewijs: false
            });
        } else {
            // Werknemer
            setReqs({
                ...reqs,
                geboortedatum: true, noodcontact: true,
                adres: true, bsn: true, nationaliteit: true, idBewijs: true,
                iban: true, loonheffing: true,
                kvk: false, btw: false, uurtarief: false, avb: false,
                vca: true, bhv: true, vog: false, rijbewijs: true
            });
        }
    };

    const toggleReq = (key) => setReqs(p => ({ ...p, [key]: !p[key] }));

    const [generatedLink, setGeneratedLink] = useState('');
    const [taal, setTaal] = useState('nl');

    const generateLink = () => {
        if (!kandidaatNaam) {
            alert("Vul a.u.b. een naam in voor de kandidaat!");
            return;
        }
        
        // Bepaal welke keys aan staan
        const actieveReqs = Object.keys(reqs).filter(k => reqs[k] && k !== 'basis');
        
        // Bouw de link
        const baseUrl = window.location.origin;
        const params = new URLSearchParams({
            naam: kandidaatNaam,
            type: templateType,
            lang: taal,
            req: actieveReqs.join(',')
        });
        
        setGeneratedLink(`${baseUrl}/intake?${params.toString()}`);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        alert('Intake-link is gekopieerd naar je klembord!');
    };

    const sendWhatsApp = () => {
        let begroeting = "Hoi";
        let tekst = "Kun jij via de onderstaande beveiligde link jouw (digitale) intake invullen voor DB Diensten?";
        let groet = "Alvast bedankt!";

        if (taal === 'en') { begroeting = "Hi"; tekst = "Could you please fill out your (digital) intake for DB Diensten using the secure link below?"; groet = "Thank you in advance!"; }
        if (taal === 'pl') { begroeting = "Cześć"; tekst = "Czy mógłbyś wypełnić formularz rejestracyjny dla DB Diensten korzystając z poniższego bezpiecznego linku?"; groet = "Z góry dziękuję!"; }
        if (taal === 'hu') { begroeting = "Szia"; tekst = "Kérjük, töltsd ki a DB Diensten (digitális) űrlapját az alábbi biztonságos linken keresztül."; groet = "Előre is köszönjük!"; }
        if (taal === 'de') { begroeting = "Hallo"; tekst = "Könnten Sie bitte Ihre (digitale) Erfassung für DB Diensten über den sicheren Link unten ausfüllen?"; groet = "Vielen Dank im Voraus!"; }

        const text = `${begroeting} ${kandidaatNaam},\n\n${tekst}\n\n${generatedLink}\n\n${groet}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="content-area">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ marginBottom: '8px', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#F5850A' }}></i>
                    Intake & Onboarding Generator
                </h1>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', maxWidth: '700px' }}>
                    Selecteer eenvoudig welke gegevens je nodig hebt van een nieuwe werknemer of ZZP'er. 
                    Stuur de magische link en laat het systeem het profiel automatisch inrichten!
                </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
                
                {/* Formulier Builder */}
                <div className="panel" style={{ padding: '24px', flex: '1 1 400px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>Naam Kandidaat</label>
                        <input type="text" value={kandidaatNaam} onChange={e => setKandidaatNaam(e.target.value)}
                            placeholder="Bijv: Klaas de Groot" 
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
                    </div>

                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>1. Kies een basis-sjabloon</label>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button onClick={() => applyTemplate('werknemer')}
                            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${templateType === 'werknemer' ? '#F5850A' : '#e2e8f0'}`, background: templateType === 'werknemer' ? 'rgba(245,133,10,0.05)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                            <i className="fa-solid fa-user-tie" style={{ fontSize: '1.5rem', color: templateType === 'werknemer' ? '#F5850A' : '#94a3b8' }}></i>
                            <span style={{ fontWeight: 700, color: templateType === 'werknemer' ? '#F5850A' : '#64748b' }}>Nieuwe Werknemer</span>
                        </button>
                        <button onClick={() => applyTemplate('zzp')}
                            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${templateType === 'zzp' ? '#3b82f6' : '#e2e8f0'}`, background: templateType === 'zzp' ? 'rgba(59,130,246,0.05)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                            <i className="fa-solid fa-user-gear" style={{ fontSize: '1.5rem', color: templateType === 'zzp' ? '#3b82f6' : '#94a3b8' }}></i>
                            <span style={{ fontWeight: 700, color: templateType === 'zzp' ? '#3b82f6' : '#64748b' }}>Nieuwe ZZP'er</span>
                        </button>
                    </div>

                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>2. Voertaal van de Intake</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                        {[
                            { code: 'nl', url: 'https://flagcdn.com/w40/nl.png', label: 'NL' },
                            { code: 'en', url: 'https://flagcdn.com/w40/gb.png', label: 'EN' },
                            { code: 'de', url: 'https://flagcdn.com/w40/de.png', label: 'DE' },
                            { code: 'pl', url: 'https://flagcdn.com/w40/pl.png', label: 'PL' },
                            { code: 'hu', url: 'https://flagcdn.com/w40/hu.png', label: 'HU' }
                        ].map(t => (
                            <button key={t.code} onClick={() => setTaal(t.code)} title={t.label}
                                style={{ 
                                    flex: 1, padding: '10px 0', borderRadius: '8px', cursor: 'pointer',
                                    border: `2px solid ${taal === t.code ? '#22c55e' : '#e2e8f0'}`,
                                    background: taal === t.code ? 'rgba(34,197,94,0.1)' : '#f8fafc',
                                    transition: 'all 0.15s', display: 'flex', display: 'flex', justifyContent: 'center', alignItems: 'center'
                                }}>
                                <img src={t.url} alt={t.label} style={{ width: '28px', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                            </button>
                        ))}
                    </div>

                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'block' }}>3. Verfijn de gevraagde gegevens</label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Groep Identiteit */}
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Persoons- & Adresgegevens</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Checkbox label="Naam, Telefoon & E-mail" checked={true} disabled={true} />
                                <Checkbox label="Nationaliteit" checked={reqs.nationaliteit} onChange={() => toggleReq('nationaliteit')} />
                                <Checkbox label="Geboortedatum" checked={reqs.geboortedatum} onChange={() => toggleReq('geboortedatum')} />
                                <Checkbox label="Noodcontact" checked={reqs.noodcontact} onChange={() => toggleReq('noodcontact')} />
                                <Checkbox label="Adres, Postcode & Woonplaats" checked={reqs.adres} onChange={() => toggleReq('adres')} />
                                <Checkbox label="BSN Nummer" checked={reqs.bsn} onChange={() => toggleReq('bsn')} />
                                <Checkbox label="Kopie ID-Bewijs" checked={reqs.idBewijs} onChange={() => toggleReq('idBewijs')} />
                                <Checkbox label="Rijbewijs" checked={reqs.rijbewijs} onChange={() => toggleReq('rijbewijs')} />
                            </div>
                        </div>

                        {/* Groep Financiën */}
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Financiën</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Checkbox label="Rekening (IBAN)" checked={reqs.iban} onChange={() => toggleReq('iban')} />
                                <Checkbox label="Loonheffingskorting" checked={reqs.loonheffing} onChange={() => toggleReq('loonheffing')} disabled={templateType==='zzp'} />
                            </div>
                        </div>

                        {/* Groep ZZP */}
                        {templateType === 'zzp' && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Onderneming (ZZP)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Checkbox label="KVK Uittreksel" checked={reqs.kvk} onChange={() => toggleReq('kvk')} />
                                    <Checkbox label="BTW Nummer" checked={reqs.btw} onChange={() => toggleReq('btw')} />
                                    <Checkbox label="Aansprakelijkheid (AVB)" checked={reqs.avb} onChange={() => toggleReq('avb')} />
                                </div>
                            </div>
                        )}

                        {/* Groep Certificaten */}
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Kwalificaties & Certificaten</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Checkbox label="VCA Certificaat" checked={reqs.vca} onChange={() => toggleReq('vca')} />
                                <Checkbox label="BHV Certificaat" checked={reqs.bhv} onChange={() => toggleReq('bhv')} />
                                <Checkbox label="VOG Verklaring" checked={reqs.vog} onChange={() => toggleReq('vog')} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actie / Output Paneel */}
                <div style={{ position: 'sticky', top: '24px', flex: '1 1 300px', minWidth: '300px' }}>
                    <div className="panel" style={{ padding: '24px', background: 'linear-gradient(145deg, #1e293b, #0f172a)', color: '#fff' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: '#38bdf8', color: '#1e293b', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>4</span>
                            Intake Genereren
                        </h3>
                        
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px', lineHeight: '1.5' }}>
                            Klik op genereer om een eenmalige, pre-filled link te maken voor <strong>{kandidaatNaam || '[Kandidaat]'}</strong>. Zij hoeven alleen in te vullen wat jij hebt aangevinkt.
                        </p>

                        <button onClick={generateLink} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,133,10,0.3)', marginBottom: '20px', transition: 'all 0.15s' }}>
                            <i className="fa-solid fa-bolt" style={{ marginRight: '8px' }}></i>
                            Maak Unieke Intake Link
                        </button>

                        {generatedLink && (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0 0 20px 0' }} />
                                
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>JOUW INTAKE LINK:</div>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8' }}>
                                    {generatedLink}
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={copyLink} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <i className="fa-regular fa-copy" style={{ marginRight: '6px' }}></i> Kopieer
                                    </button>
                                    <button onClick={sendWhatsApp} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#22c55e', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> WhatsApp
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, display: 'flex', gap: '8px' }}>
                            <i className="fa-solid fa-circle-info" style={{ marginTop: '2px' }}></i>
                            <span>Als de kandidaat het formulier verzendt, genereert het systeem een magische import-code waarmee hun dossier in één klik op je dashboard staat!</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Kleine herbruikbare checkbox component
function Checkbox({ label, checked, onChange, disabled }) {
    return (
        <label style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            padding: '10px 12px', borderRadius: '8px', 
            background: disabled ? '#f8fafc' : (checked ? '#eff6ff' : '#fff'), 
            border: `1px solid ${disabled ? '#e2e8f0' : (checked ? '#bfdbfe' : '#e2e8f0')}`, 
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1, transition: 'all 0.15s'
        }}>
            <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ width: '16px', height: '16px', cursor: 'inherit', accentColor: '#3b82f6' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: checked ? 700 : 500, color: disabled ? '#94a3b8' : (checked ? '#1e40af' : '#475569') }}>
                {label}
            </span>
        </label>
    );
}
