'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const DICT = {
    'nl': {
        title: 'Digitale Intake', subtitle: 'Voor DB Diensten & De Schilders uit Katwijk',
        welcome: 'Welkom', intro: 'Om je snel te kunnen inplannen, hebben we nog enkele gegevens van je nodig. Vul ze hieronder aan en druk daarna op Afronden!',
        persoonlijk: 'Persoonlijke Gegevens', naam: 'Volledige Naam', geb_datum: 'Geboortedatum', nationaliteit: 'Nationaliteit',
        telefoon: 'Telefoonnummer', email: 'E-mailadres',
        noodcontact_titel: 'Noodcontact', noodcontact_naam: 'Naam Noodcontact', noodcontact_tel: 'Telefoon Noodcontact',
        adres_titel: 'Woonadres', straat: 'Straatnaam & Huisnummer', postcode: 'Postcode', woonplaats: 'Woonplaats',
        zzp_titel: 'Onderneming (ZZP)', bedrijfsnaam: 'Bedrijfsnaam', kvk: 'KVK Nummer', btw: 'BTW Nummer', uurtarief: 'Standaard Uurtarief (excl. BTW)',
        fin_titel: 'Financieel & Identiteit', bsn: 'BSN (Burgerservicenummer)', iban: 'IBAN (Rekeningnummer)', tenaamstelling: 'Tenaamstelling (Pasnaam)',
        loonheffing: 'Ja, pas de Loonheffingskorting toe',
        vca_titel: 'VCA Veiligheid', vca_datum: 'Verloopdatum VCA', vca_nummer: 'VCA Certificaatnummer', upload_demo: 'Upload wordt niet ondersteund in deze demo.',
        vog_titel: 'Verklaring Omtrent Gedrag', vog: 'Beschikking over VOG', vog_datum: 'VOG Afgiftedatum',
        afronden: 'Afronden en Veilig Verzenden', success_title: 'Intake Afgerond!', success_p: 'Bedankt', success_p2: '! Jouw gegevens zijn veilig verwerkt. Laat de administratie weten dat je klaar bent door op de knop hieronder te drukken.',
        success_btn: 'Stuur via WhatsApp naar Kantoor', wa_text: 'Hoi, mijn intake formulier is ingevuld! Klik op de link hieronder om mijn profiel direct in SchildersApp te importeren:'
    },
    'en': {
        title: 'Digital Intake', subtitle: 'For DB Diensten & De Schilders uit Katwijk',
        welcome: 'Welcome', intro: 'To schedule you quickly, we need some additional details. Please fill them out below and click Submit!',
        persoonlijk: 'Personal Details', naam: 'Full Name', geb_datum: 'Date of Birth', nationaliteit: 'Nationality',
        telefoon: 'Phone Number', email: 'Email Address',
        noodcontact_titel: 'Emergency Contact', noodcontact_naam: 'Emergency Contact Name', noodcontact_tel: 'Emergency Contact Phone',
        adres_titel: 'Home Address', straat: 'Street & House Number', postcode: 'Postal Code', woonplaats: 'City',
        zzp_titel: 'Company (Self-Employed)', bedrijfsnaam: 'Company Name', kvk: 'Chamber of Commerce (KVK)', btw: 'VAT Number', uurtarief: 'Standard Hourly Rate (excl. VAT)',
        fin_titel: 'Financial & Identity', bsn: 'BSN (Social Security Number)', iban: 'IBAN (Bank Account)', tenaamstelling: 'Account Holder Name',
        loonheffing: 'Yes, apply payroll tax credit',
        vca_titel: 'VCA Safety', vca_datum: 'VCA Expiry Date', vca_nummer: 'VCA Certificate Number', upload_demo: 'Upload is not supported in this demo.',
        vog_titel: 'Certificate of Good Conduct', vog: 'I have a valid Certificate', vog_datum: 'Issue Date',
        afronden: 'Submit Securely', success_title: 'Intake Completed!', success_p: 'Thank you', success_p2: '! Your data has been processed securely. Let the administration know you are ready by tapping the button below.',
        success_btn: 'Send via WhatsApp to Office', wa_text: 'Hi, my intake form is filled out! Click the link below to import my profile directly:'
    },
    'pl': {
        title: 'Cyfrowy Formularz', subtitle: 'Dla DB Diensten & De Schilders uit Katwijk',
        welcome: 'Witamy', intro: 'Aby szybko zaplanować Twoją pracę, potrzebujemy kilku dodatkowych danych. Wypełnij je poniżej i kliknij Wyślij!',
        persoonlijk: 'Dane Osobowe', naam: 'Imię i Nazwisko', geb_datum: 'Data Urodzenia', nationaliteit: 'Narodowość',
        telefoon: 'Numer Telefonu', email: 'Adres E-mail',
        noodcontact_titel: 'Kontakt Alarmowy', noodcontact_naam: 'Imię/Nazwisko Kontaktu', noodcontact_tel: 'Telefon Alarmowy',
        adres_titel: 'Adres Zamieszkania', straat: 'Ulica i Numer Domu', postcode: 'Kod Pocztowy', woonplaats: 'Miejscowość',
        zzp_titel: 'Firma (Działalność)', bedrijfsnaam: 'Nazwa Firmy', kvk: 'Numer KVK', btw: 'Numer BTW', uurtarief: 'Stawka Godzinowa (bez BTW)',
        fin_titel: 'Finanse i Tożsamość', bsn: 'Numer BSN', iban: 'Konto Bankowe (IBAN)', tenaamstelling: 'Właściciel Konta',
        loonheffing: 'Tak, zastosuj ulgę podatkową',
        vca_titel: 'Bezpieczeństwo VCA', vca_datum: 'Data Ważności VCA', vca_nummer: 'Numer Certyfikatu VCA', upload_demo: 'Przesyłanie plików nie jest obsługiwane.',
        vog_titel: 'Zaświadczenie o niekaralności', vog: 'Posiadam zaświadczenie', vog_datum: 'Data wydania',
        afronden: 'Wyślij Bezpiecznie', success_title: 'Formularz Ukończony!', success_p: 'Dziękujemy', success_p2: '! Twoje dane zostały bezpiecznie przetworzone. Daj znać administracji, naciskając przycisk poniżej.',
        success_btn: 'Wyślij przez WhatsApp do Biura', wa_text: 'Cześć, mój formularz rejestracyjny został wypełniony! Kliknij poniższy link, aby zaimportować mój profil:'
    },
    'hu': {
        title: 'Digitális Űrlap', subtitle: 'A DB Diensten & De Schilders számára',
        welcome: 'Üdvözöljük', intro: 'A gyors beosztás érdekében további adatokra van szükségünk. Kérjük, töltse ki alább!',
        persoonlijk: 'Személyes Adatok', naam: 'Teljes Név', geb_datum: 'Születési Dátum', nationaliteit: 'Állampolgárság',
        telefoon: 'Telefonszám', email: 'E-mail Cím',
        noodcontact_titel: 'Vészhelyzeti Kapcsolat', noodcontact_naam: 'Név', noodcontact_tel: 'Telefonszám',
        adres_titel: 'Lakcím', straat: 'Utca és Házszám', postcode: 'Irányítószám', woonplaats: 'Település',
        zzp_titel: 'Vállalkozás (ZZP)', bedrijfsnaam: 'Cégnév', kvk: 'KVK Szám', btw: 'Adószám (BTW)', uurtarief: 'Órabér (ÁFA nélkül)',
        fin_titel: 'Pénzügy és Személyazonosság', bsn: 'BSN Szám', iban: 'Bankszámlaszám (IBAN)', tenaamstelling: 'Számlatulajdonos',
        loonheffing: 'Igen, alkalmazza az adókedvezményt',
        vca_titel: 'VCA Biztonság', vca_datum: 'VCA Érvényesség', vca_nummer: 'VCA Bizonyítvány Száma', upload_demo: 'Feltöltés nem támogatott.',
        vog_titel: 'Erkölcsi bizonyítvány', vog: 'Rendelkezem érvényes bizonyítvánnyal', vog_datum: 'Kiadás Dátuma',
        afronden: 'Biztonságos Beküldés', success_title: 'Űrlap Kitöltve!', success_p: 'Köszönjük', success_p2: '! Adatait biztonságosan feldolgoztuk.',
        success_btn: 'Küldés WhatsApp-on', wa_text: 'Szia, az űrlapom ki lett töltve! Kattints az alábbi linkre a profilom importálásához:'
    },
    'de': {
        title: 'Digitale Erfassung', subtitle: 'Für DB Diensten & De Schilders',
        welcome: 'Willkommen', intro: 'Bitte füllen Sie diese aus und klicken Sie auf Absenden!',
        persoonlijk: 'Persönliche Daten', naam: 'Vollständiger Name', geb_datum: 'Geburtsdatum', nationaliteit: 'Nationalität',
        telefoon: 'Telefonnummer', email: 'E-Mail-Adresse',
        noodcontact_titel: 'Notfallkontakt', noodcontact_naam: 'Name des Notfallkontakts', noodcontact_tel: 'Telefonnummer',
        adres_titel: 'Wohnadresse', straat: 'Straße & Hausnummer', postcode: 'Postleitzahl', woonplaats: 'Wohnort',
        zzp_titel: 'Unternehmen (Selbstständig)', bedrijfsnaam: 'Firmenname', kvk: 'KVK-Nummer', btw: 'Umsatzsteuernummer (BTW)', uurtarief: 'Stundenlohn',
        fin_titel: 'Finanzen & Identität', bsn: 'BSN (Bürgerservicenummer)', iban: 'IBAN (Kontonummer)', tenaamstelling: 'Kontoinhaber',
        loonheffing: 'Ja, Lohnsteuerermäßigung anwenden',
        vca_titel: 'VCA Sicherheit', vca_datum: 'VCA Ablaufdatum', vca_nummer: 'VCA-Zertifikatsnummer', upload_demo: 'Upload wird in dieser Demo nicht unterstützt.',
        vog_titel: 'Führungszeugnis', vog: 'Ich habe ein gültiges Führungszeugnis', vog_datum: 'Ausstellungsdatum',
        afronden: 'Sicher absenden', success_title: 'Erfassung abgeschlossen!', success_p: 'Vielen Dank', success_p2: '! Ihre Daten wurden sicher verarbeitet.',
        success_btn: 'Über WhatsApp an das Büro senden', wa_text: 'Hallo, mein Formular ist ausgefüllt!'
    }
};

function IntakeFormContent() {
    const params = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    
    // Lees pre-filled waarden in
    const reqs = (params.get('req') || '').split(',').filter(Boolean);
    const initialName = params.get('naam') || '';
    const type = params.get('type') || 'werknemer';
    
    const [activeLang, setActiveLang] = useState('nl');

    useEffect(() => { 
        setIsClient(true); 
        setActiveLang(params.get('lang') || 'nl');
    }, [params]);

    const t = (key) => DICT[activeLang]?.[key] || DICT['nl'][key] || key;

    const [form, setForm] = useState({
        naam: initialName, telefoon: '', email: '', geboortedatum: '',
        adres: '', postcode: '', woonplaats: '',
        geboortedatum: '', nationaliteit: 'Nederlands',
        noodcontact: '', noodcontactTel: '',
        bsn: '', iban: '', tenaamstelling: '', loonheffing: false,
        bedrijfsnaam: '', kvk: '', btw: '', uurtarief: '', vcaValid: '', vcaNummer: '',
        vog: false, vogDatum: '',
        idFileName: '', vcaFileName: '', kvkFileName: '', vogFileName: '',
    });

    const [done, setDone] = useState(false);
    const [magicCode, setMagicCode] = useState('');

    const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleAfronden = () => {
        // Base64 encode zodat er een nette link gemaakt kan worden
        // Voor productie zouden we een API route gebruiken (POST /api/intake)
        const payload = encodeURIComponent(btoa(JSON.stringify({ ...form, type })));
        const baseUrl = window.location.origin;
        setMagicCode(`${baseUrl}/profiel?import=${payload}`);
        setDone(true);
    };

    if (!isClient) return <div style={{ padding: '40px', textAlign: 'center' }}>Laden...</div>;

    if (done) {
        return (
            <div style={{ maxWidth: '600px', margin: '40px auto', background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 24px', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                    <i className="fa-solid fa-check"></i>
                </div>
                <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '12px' }}>{t('success_title')}</h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
                    {t('success_p')} <strong>{form.naam}</strong>{t('success_p2')}
                </p>
                <button onClick={() => {
                    const txt = `${t('wa_text')}\n\n${magicCode}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
                }} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#25D366', color: '#fff', border: 'none', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.3rem' }}></i> {t('success_btn')}
                </button>
            </div>
        );
    }

    // Welke velden eisen we?
    const hasAdres = reqs.includes('adres');
    const hasBsn = reqs.includes('bsn');
    const hasIban = reqs.includes('iban');
    const hasZzp = type === 'zzp';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px 0', fontFamily: 'inherit' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {/* Header Banner */}
                <div style={{ background: '#F5850A', padding: '40px 24px 32px', textAlign: 'center', color: '#fff', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                        <div style={{ width: '220px', overflow: 'hidden' }}>
                            <img src="/ds-logo.png" alt="De Schilders Logo" style={{ width: 'calc(100% + 4px)', height: 'auto', margin: '-2px', display: 'block' }} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                        {[
                            { code: 'nl', url: 'https://flagcdn.com/w40/nl.png' },
                            { code: 'en', url: 'https://flagcdn.com/w40/gb.png' },
                            { code: 'de', url: 'https://flagcdn.com/w40/de.png' },
                            { code: 'pl', url: 'https://flagcdn.com/w40/pl.png' },
                            { code: 'hu', url: 'https://flagcdn.com/w40/hu.png' }
                        ].map(l => (
                            <button key={l.code} onClick={() => setActiveLang(l.code)} style={{
                                width: '32px', height: '24px', padding: 0, border: `2px solid ${activeLang === l.code ? '#22c55e' : 'transparent'}`, borderRadius: '4px', cursor: 'pointer', background: 'transparent', transition: 'all 0.15s', opacity: activeLang === l.code ? 1 : 0.5
                            }}>
                                <img src={l.url} alt={l.code} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
                            </button>
                        ))}
                    </div>

                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        {t('title')}
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, opacity: 0.9 }}>
                        {t('subtitle')}
                    </p>
                </div>

                {/* Form Layout */}
                <div style={{ padding: '32px 24px' }}>
                    <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59,130,246,0.1)', marginBottom: '32px', display: 'flex', gap: '16px' }}>
                        <i className="fa-solid fa-bell-concierge" style={{ fontSize: '1.5rem', color: '#3b82f6', marginTop: '4px' }}></i>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: '#1e40af', margin: '0 0 6px 0', fontWeight: 700 }}>{t('welcome')} {form.naam.split(' ')[0]}!</h3>
                            <p style={{ fontSize: '0.8rem', color: '#334155', margin: 0, lineHeight: '1.5' }}>{t('intro')}</p>
                        </div>
                    </div>

                    <Section title={t('persoonlijk')} icon="fa-user">
                        <Field label={t('naam')} val={form.naam} set={(v) => upd('naam', v)} req />
                        {reqs.includes('geboortedatum') && <Field label={t('geb_datum')} val={form.geboortedatum} set={v => upd('geboortedatum', v)} type="date" req />}
                        {reqs.includes('nationaliteit') && (
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('nationaliteit')}</label>
                                <select value={form.nationaliteit} onChange={e => upd('nationaliteit', e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }}>
                                    <option value="Nederlands">Nederlands</option>
                                    <option value="Duits">Duits</option>
                                    <option value="Pools">Pools</option>
                                    <option value="Hongaars">Hongaars</option>
                                    <option value="Belgisch">Belgisch</option>
                                    <option value="Turks">Turks</option>
                                    <option value="Marokkaans">Marokkaans</option>
                                    <option value="Surinaams">Surinaams</option>
                                    <option value="Overig">Anders...</option>
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                            <Field label={t('telefoon')} val={form.telefoon} set={(v) => upd('telefoon', v)} placeholder="06..." type="tel" req />
                            <Field label={t('email')} val={form.email} set={(v) => upd('email', v)} placeholder="@" type="email" req />
                        </div>
                    </Section>

                    {reqs.includes('noodcontact') && (
                        <Section title={t('noodcontact_titel')} icon="fa-truck-medical">
                            <Field label={t('noodcontact_naam')} val={form.noodcontact} set={(v) => upd('noodcontact', v)} req />
                            <Field label={t('noodcontact_tel')} val={form.noodcontactTel} set={(v) => upd('noodcontactTel', v)} type="tel" req />
                        </Section>
                    )}

                    {hasAdres && (
                        <Section title={t('adres_titel')} icon="fa-house">
                            <Field label={t('straat')} val={form.adres} set={(v) => upd('adres', v)} req />
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
                                <Field label={t('postcode')} val={form.postcode} set={(v) => upd('postcode', v)} req />
                                <Field label={t('woonplaats')} val={form.woonplaats} set={(v) => upd('woonplaats', v)} req />
                            </div>
                        </Section>
                    )}

                    {hasZzp && (
                        <Section title={t('zzp_titel')} icon="fa-building">
                            <Field label={t('bedrijfsnaam')} val={form.bedrijfsnaam} set={v => upd('bedrijfsnaam', v)} req />
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                                {reqs.includes('kvk') && <Field label={t('kvk')} val={form.kvk} set={v => upd('kvk', v)} />}
                                {reqs.includes('btw') && <Field label={t('btw')} val={form.btw} set={v => upd('btw', v)} />}
                            </div>
                        </Section>
                    )}

                    {(hasBsn || hasIban) && (
                        <Section title={t('fin_titel')} icon="fa-vault">
                            {hasBsn && <Field label={t('bsn')} val={form.bsn} set={v => upd('bsn', v)} req />}
                            {hasIban && (
                                <>
                                    <Field label={t('iban')} val={form.iban} set={v => upd('iban', v)} req placeholder="NL00 BANK..." />
                                    <Field label={t('tenaamstelling')} val={form.tenaamstelling} set={v => upd('tenaamstelling', v)} req />
                                </>
                            )}
                            {reqs.includes('loonheffing') && (
                                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="checkbox" checked={form.loonheffing} onChange={e => upd('loonheffing', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                        {t('loonheffing')}
                                    </label>
                                </div>
                            )}
                        </Section>
                    )}

                    {reqs.includes('idBewijs') && (
                        <Section title={t('ID Bewijs / Paspoort')} icon="fa-id-card">
                            <Field label={t('Documentnummer')} val={form.idFileName} set={v => upd('idFileName', v)} req />
                        </Section>
                    )}

                    {reqs.includes('vca') && (
                        <Section title={t('vca_titel')} icon="fa-hard-hat">
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                                <Field label={t('vca_nummer')} val={form.vcaNummer} set={v => upd('vcaNummer', v)} req />
                                <Field label={t('vca_datum')} val={form.vcaValid} set={v => upd('vcaValid', v)} type="date" req />
                            </div>
                        </Section>
                    )}

                    {reqs.includes('vog') && (
                        <Section title={t('vog_titel')} icon="fa-file-shield">
                            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" checked={form.vog} onChange={e => upd('vog', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                    {t('vog')}
                                </label>
                            </div>
                            {form.vog && (
                                <Field label={t('vog_datum')} val={form.vogDatum} set={v => upd('vogDatum', v)} type="date" req />
                            )}
                        </Section>
                    )}

                    {reqs.includes('rijbewijs') && (
                        <Section title={t('Rijbewijs')} icon="fa-car">
                            <Field label={t('Rijbewijsnummer')} val={form.rijbewijsFileName} set={v => upd('rijbewijsFileName', v)} req />
                        </Section>
                    )}

                    {reqs.includes('bhv') && (
                        <Section title={t('BHV Certificaat')} icon="fa-kit-medical">
                            <Field label={t('BHV Nummmer')} val={form.bhvFileName} set={v => upd('bhvFileName', v)} req />
                        </Section>
                    )}

                    {reqs.includes('avb') && (
                        <Section title={t('Aansprakelijkheid (AVB)')} icon="fa-shield-halved">
                            <Field label={t('Polisnummer AVB')} val={form.avbFileName} set={v => upd('avbFileName', v)} req />
                        </Section>
                    )}

                    {/* Verzend actie */}
                    <div style={{ marginTop: '40px' }}>
                        <button onClick={handleAfronden} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff', border: 'none', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,133,10,0.35)', transition: 'all 0.15s' }}>
                            {t('afronden')} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function IntakePage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Formulier ophalen...</div>}>
            <IntakeFormContent />
        </Suspense>
    );
}

// ── Components voor Formulieren ──
function Section({ title, icon, children }) {
    return (
        <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                <i className={`fa-solid ${icon}`}></i> {title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {children}
            </div>
        </div>
    );
}

function Field({ label, val, set, placeholder, type = 'text', prefix, req }) {
    return (
        <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {label} {req && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
                {prefix && (
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>{prefix}</div>
                )}
                <input 
                    type={type} value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                    style={{ 
                        width: '100%', padding: `10px 12px 10px ${prefix ? '30px' : '12px'}`, 
                        borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', 
                        color: '#0f172a', background: '#f8fafc', transition: 'all 0.15s', outline: 'none' 
                    }}
                    onFocus={e => { e.target.style.borderColor = '#F5850A'; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
                />
            </div>
        </div>
    );
}

function FileUpload({ label, val, set }) {
    return (
        <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {label} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div 
                onClick={() => set('bestand_uploaded.pdf')}
                style={{ 
                    border: val ? '2px solid #22c55e' : '2px dashed #cbd5e1', 
                    borderRadius: '8px', padding: '20px', textAlign: 'center', 
                    background: val ? 'rgba(34,197,94,0.05)' : '#f8fafc', 
                    cursor: 'pointer', transition: 'all 0.2s' 
                }}>
                <i className={`fa-solid ${val ? 'fa-check' : 'fa-camera'}`} style={{ fontSize: '2rem', color: val ? '#22c55e' : '#94a3b8', marginBottom: '10px' }}></i>
                <div style={{ fontSize: '0.9rem', color: val ? '#166534' : '#475569', fontWeight: 700 }}>
                    {val ? 'Bestand succesvol geüpload' : 'Tik hier om een foto te maken of bestand te kiezen'}
                </div>
                {!val && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>(Upload gesimuleerd voor deze test)</div>}
            </div>
        </div>
    );
}
