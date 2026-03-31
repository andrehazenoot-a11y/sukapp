'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';

// ── Field buiten ProfielPage zodat het een stabiel componenttype is ──
// (anders: bij elke re-render nieuw functietype → React unmount → focus weg)
function Field({ label, icon, field, type = 'text', placeholder = '', obj, upd }) {
    return (
        <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>}
                {label}
            </label>
            <input
                type={type}
                value={obj[field] || ''}
                onChange={e => upd(field, e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b',
                    background: '#fafafa', transition: 'border 0.15s', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#F5850A'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
        </div>
    );
}

export default function ProfielPage() {
    const { user, hasAccess, updateProfile, getProfile } = useAuth();
    const router = useRouter();
    const storageKey = `schildersapp_profiel_${user?.id || 1}`;
    const zzpStorageKey = `schildersapp_zzp_profiel_${user?.id || 1}`;

    // Check rechten: welke tabs zijn beschikbaar?
    const canWerknemer = hasAccess('profiel.werknemer');
    const canZzp = hasAccess('profiel.zzp');

    // Profiel type: gebaseerd op rechten (of/of)
    const [profielType, setProfielType] = useState(() => {
        if (canZzp && !canWerknemer) return 'zzp';
        return 'werknemer';
    });

    // === WERKNEMER PROFIEL ===
    const [profiel, setProfiel] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey));
            if (stored) return stored;
        } catch { }
        return {
            // Persoonlijke gegevens
            voornaam: user?.name?.split(' ')[0] || '',
            achternaam: user?.name?.split(' ').slice(1).join(' ') || '',
            geboortedatum: '', telefoon: '', email: '',
            adres: '', postcode: '', woonplaats: '',
            bsn: '', iban: '',
            nationaliteit: 'Nederlands', burgerlijkeStaat: '',
            noodcontact: '', noodcontactTel: '',
            // Dienstverband & Contracten
            datumInDienst: '', datumUitDienst: '', contractType: 'Vast',
            proeftijdTot: '', functie: '', afdeling: '',
            arbeidsovereenkomstGetekend: false, arbeidsovereenkomstDatum: '',
            aanvullendeOvereenkomsten: [],
            // Documenten
            docIdentiteitsbewijs: false, docIdType: 'Paspoort', docIdVerloopdatum: '',
            docLoonbelasting: false, docLoonbelastingDatum: '',
            docWerkvergunning: false, docWerkvergunningNummer: '', docWerkvergunningVerloopdatum: '',
            docSollicitatie: false, docSollicitatieDatum: '',
            // Salaris & Arbeidsvoorwaarden
            uurloon: '',
            salarisschaal: '', periodiek: '',
            pensioen: false, pensioenOmschrijving: '',
            eindejaarsuitkering: false, eindejaarsPercentage: '',
            onkostenvergoeding: '',
            autoVanDeZaak: false, autoKenteken: '', autoType: '',
            fietsVanDeZaak: false, fietsType: '',
            // Opleiding & Certificaten
            vcaNummer: '', vcaVerloopdatum: '', vcaType: 'VCA Basis',
            bhvCertificaat: false, bhvNummer: '', bhvVerloopdatum: '',
            opleidingen: [],
            leerovereenkomst: false, leerovereenkomstNotitie: '',
            loopbaanAfspraken: '',
            // Werktijden & Verlof
            contractUren: 37.5,
            werkdagen: ['ma', 'di', 'wo', 'do', 'vr'],
            overwerkAfspraken: '',
            advDagen: 0,
            verlofRegelingen: '',
            vakDagenJaar: 25, vakDagenVorigJaar: 0,
            // Functioneren & Beoordelen
            competenties: [],
            functioneringsGesprekken: [],
            persoonlijkOntwikkelingsplan: '',
            bijzonderhedenVertrouwelijk: '',
            // Gezondheid & Verzuim
            zorgverzekeraar: '', zorgPolisnummer: '',
            medischeKeuring: false, medischeKeuringDatum: '',
            ziekteverzuimLog: [],
            // Specialiteiten
            specialiteiten: [],
            // Notities & Afspraken
            notities: '', afspraken: [],
        };
    });

    // === ZZP PROFIEL ===
    const [zzpProfiel, setZzpProfiel] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(zzpStorageKey));
            if (stored) return stored;
        } catch { }
        return {
            bedrijfsnaam: '', kvkNummer: '', btwNummer: '',
            voornaam: '', achternaam: '',
            telefoon: '', email: '',
            adres: '', postcode: '', woonplaats: '',
            iban: '', tenaamstelling: '', bsn: '',
            // Tarieven
            uurtarief: '', dagTarief: '',
            // VCA
            vcaNummer: '', vcaVerloopdatum: '', vcaType: 'VCA Basis',
            // Specialiteiten
            specialiteiten: [],
            // Verzekeringen
            aansprakelijkheid: false, aansprakelijkheidNummer: '', aansprakelijkheidVerloopdatum: '',
            cav: false, cavNummer: '', cavVerloopdatum: '',
            // Beschikbaarheid
            beschikbaarheid: 'Voltijd',
            // Modelovereenkomsten
            modelovereenkomsten: [],
            // Notities
            notities: '', afspraken: [],
        };
    });

    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState('gegevens');

    // ── DASHBOARD OVERVIEW MODE ──
    const [dashboardMode, setDashboardMode] = useState(true);
    const [teamList, setTeamList] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    useEffect(() => {
        try {
            setTeamList(JSON.parse(localStorage.getItem('wa_medewerkers')) || []);
        } catch {}
    }, [dashboardMode]);

    const openEmployee = (emp) => {
        setSelectedEmployeeId(emp.id);
        const defaultW = { voornaam: '', achternaam: '', geboortedatum: '', telefoon: '', email: '', adres: '', postcode: '', woonplaats: '', bsn: '', iban: '', nationaliteit: 'Nederlands', burgerlijkeStaat: '', noodcontact: '', noodcontactTel: '', datumInDienst: '', datumUitDienst: '', contractType: 'Vast', proeftijdTot: '', functie: '', afdeling: '', arbeidsovereenkomstGetekend: false, arbeidsovereenkomstDatum: '', aanvullendeOvereenkomsten: [], docIdentiteitsbewijs: false, docIdType: 'Paspoort', docIdVerloopdatum: '', docLoonbelasting: false, docLoonbelastingDatum: '', docWerkvergunning: false, docWerkvergunningNummer: '', docWerkvergunningVerloopdatum: '', docSollicitatie: false, docSollicitatieDatum: '', uurloon: '', salarisschaal: '', periodiek: '', pensioen: false, pensioenOmschrijving: '', eindejaarsuitkering: false, eindejaarsPercentage: '', onkostenvergoeding: '', autoVanDeZaak: false, autoKenteken: '', autoType: '', fietsVanDeZaak: false, fietsType: '', vcaNummer: '', vcaVerloopdatum: '', vcaType: 'VCA Basis', bhvCertificaat: false, bhvNummer: '', bhvVerloopdatum: '', vogVerklaring: false, vogDatum: '', opleidingen: [], leerovereenkomst: false, leerovereenkomstNotitie: '', loopbaanAfspraken: '', contractUren: 37.5, werkdagen: ['ma', 'di', 'wo', 'do', 'vr'], overwerkAfspraken: '', advDagen: 0, verlofRegelingen: '', vakDagenJaar: 25, vakDagenVorigJaar: 0, competenties: [], functioneringsGesprekken: [], persoonlijkOntwikkelingsplan: '', bijzonderhedenVertrouwelijk: '', zorgverzekeraar: '', zorgPolisnummer: '', medischeKeuring: false, medischeKeuringDatum: '', ziekteverzuimLog: [], specialiteiten: [], notities: '', afspraken: [] };
        const defaultZ = { bedrijfsnaam: '', kvkNummer: '', btwNummer: '', voornaam: '', achternaam: '', telefoon: '', email: '', adres: '', postcode: '', woonplaats: '', iban: '', tenaamstelling: '', bsn: '', uurtarief: '', dagTarief: '', vcaNummer: '', vcaVerloopdatum: '', vcaType: 'VCA Basis', vogVerklaring: false, vogDatum: '', specialiteiten: [], aansprakelijkheid: false, aansprakelijkheidNummer: '', aansprakelijkheidVerloopdatum: '', cav: false, cavNummer: '', cavVerloopdatum: '', beschikbaarheid: 'Voltijd', modelovereenkomsten: [], notities: '', afspraken: [] };

        if (emp.type === 'zzp') {
            setProfielType('zzp');
            setZzpProfiel({ ...defaultZ, ...emp });
        } else {
            setProfielType('werknemer');
            setProfiel({ ...defaultW, ...emp });
        }
        setDashboardMode(false);
        setActiveSection('gegevens');
    };

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // ── Intercept Magic Intake Import Link ──
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const search = new URLSearchParams(window.location.search);
        const importData = search.get('import');
        if (!importData) return;
        try {
            const dec = JSON.parse(atob(decodeURIComponent(importData)));
            
            const newEmp = {
                id: Date.now(),
                type: dec.type || 'werknemer',
                status: 'Actief',
                naam: dec.naam,
                voornaam: dec.naam?.split(' ')[0] || '',
                achternaam: dec.naam?.split(' ').slice(1).join(' ') || '',
                telefoon: dec.telefoon,
                email: dec.email,
                adres: dec.adres,
                postcode: dec.postcode,
                woonplaats: dec.woonplaats,
                bsn: dec.bsn,
                iban: dec.iban,
                tenaamstelling: dec.tenaamstelling,
                noodcontact: dec.noodcontact,
                noodcontactTel: dec.noodcontactTel,
                vcaVerloopdatum: dec.vcaValid,
                vcaNummer: dec.vcaNummer,
                bedrijfsnaam: dec.bedrijfsnaam,
                kvkNummer: dec.kvk,
                btwNummer: dec.btw,
                uurtarief: dec.uurtarief,
                nationaliteit: dec.nationaliteit || 'Nederlands',
                vogVerklaring: dec.vog || false,
                vogDatum: dec.vogDatum || '',
            };
            
            openEmployee(newEmp);
            alert(`Intake formulier van ${dec.naam} succesvol ingeladen!\n\nLoop de gegevens na en klik rechtsboven op 'Profiel Opslaan' om de kandidaat toe te voegen aan het personeelsdossier.`);
            window.history.replaceState({}, document.title, pathname);
        } catch (e) {
            console.error('Fout bij importeren', e);
        }
    }, [pathname]);

    // Save
    const saveProfiel = () => {
        try {
            let waMedewerkers = JSON.parse(localStorage.getItem('wa_medewerkers') || '[]');
            const userIndex = selectedEmployeeId ? waMedewerkers.findIndex(w => w.id === selectedEmployeeId) : -1;
            
            const p = profielType === 'zzp' ? zzpProfiel : profiel;
            const fullNaam = profielType === 'zzp' ? (p.bedrijfsnaam || `${p.voornaam || ''} ${p.achternaam || ''}`.trim()) : `${p.voornaam || ''} ${p.achternaam || ''}`.trim();

            const fullData = {
                ...p, // include all fields directly!
                id: selectedEmployeeId || Date.now(),
                naam: fullNaam || 'Nieuwe Medewerker',
                type: profielType,
                status: 'Actief',
            };

            if (userIndex >= 0) {
                waMedewerkers[userIndex] = fullData;
            } else {
                waMedewerkers.push(fullData);
                setSelectedEmployeeId(fullData.id); // set id if it was newly created
            }
            
            localStorage.setItem('wa_medewerkers', JSON.stringify(waMedewerkers));
            setTeamList(waMedewerkers); // Update dashboard list immediately
        } catch (e) {
            console.error('Failed saving to wa_medewerkers', e);
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const update = (field, value) => setProfiel(prev => ({ ...prev, [field]: value }));
    const updateZzp = (field, value) => setZzpProfiel(prev => ({ ...prev, [field]: value }));

    // Specialiteiten
    const SPECIALITEITEN = [
        'Binnenschilderwerk', 'Buitenschilderwerk', 'Behangen', 'Houtreparatie',
        'Spuitwerk', 'Lakwerk', 'Betonreparatie', 'Glaszetten',
        'Sierpleister', 'Houtrot sanering', 'Gevelreiniging', 'Beglazing',
        'Industrieel schilderwerk', 'Verfadvies', 'Kleurontwerp', 'Epoxy vloeren'
    ];

    const toggleSpec = (spec) => {
        if (profielType === 'zzp') {
            setZzpProfiel(prev => ({ ...prev, specialiteiten: prev.specialiteiten.includes(spec) ? prev.specialiteiten.filter(s => s !== spec) : [...prev.specialiteiten, spec] }));
        } else {
            setProfiel(prev => ({ ...prev, specialiteiten: prev.specialiteiten.includes(spec) ? prev.specialiteiten.filter(s => s !== spec) : [...prev.specialiteiten, spec] }));
        }
    };

    // Afspraken
    const addAfspraak = () => {
        const newA = { id: Date.now(), datum: '', onderwerp: '', notitie: '', herinneringActief: true };
        if (profielType === 'zzp') setZzpProfiel(prev => ({ ...prev, afspraken: [...(prev.afspraken || []), newA] }));
        else setProfiel(prev => ({ ...prev, afspraken: [...(prev.afspraken || []), newA] }));
    };
    const updateAfspraak = (id, field, value) => {
        const fn = prev => ({ ...prev, afspraken: prev.afspraken.map(a => a.id === id ? { ...a, [field]: value } : a) });
        if (profielType === 'zzp') setZzpProfiel(fn); else setProfiel(fn);
    };
    const removeAfspraak = (id) => {
        const fn = prev => ({ ...prev, afspraken: prev.afspraken.filter(a => a.id !== id) });
        if (profielType === 'zzp') setZzpProfiel(fn); else setProfiel(fn);
    };

    // Dynamic list helpers (werknemer only)
    const addListItem = (listKey, template) => setProfiel(prev => ({ ...prev, [listKey]: [...(prev[listKey] || []), { id: Date.now(), ...template }] }));
    const updateListItem = (listKey, id, field, value) => setProfiel(prev => ({ ...prev, [listKey]: prev[listKey].map(i => i.id === id ? { ...i, [field]: value } : i) }));
    const removeListItem = (listKey, id) => setProfiel(prev => ({ ...prev, [listKey]: prev[listKey].filter(i => i.id !== id) }));

    // Dynamic list helpers (ZZP)
    const addZzpListItem = (listKey, template) => setZzpProfiel(prev => ({ ...prev, [listKey]: [...(prev[listKey] || []), { id: Date.now(), ...template }] }));
    const updateZzpListItem = (listKey, id, field, value) => setZzpProfiel(prev => ({ ...prev, [listKey]: (prev[listKey] || []).map(i => i.id === id ? { ...i, [field]: value } : i) }));
    const removeZzpListItem = (listKey, id) => setZzpProfiel(prev => ({ ...prev, [listKey]: (prev[listKey] || []).filter(i => i.id !== id) }));

    // Modelovereenkomst genereren
    const OVEREENKOMST_TYPES = [
        { value: 'geen-werkgeversgezag', label: 'Geen werkgeversgezag', desc: 'Standaard ZZP overeenkomst zonder gezagsverhouding' },
        { value: 'tussenkomst', label: 'Tussenkomst', desc: 'Via een intermediair/bemiddelaar' },
        { value: 'vrije-vervanging', label: 'Vrije vervanging', desc: 'De opdrachtnemer mag zich vrijelijk laten vervangen' },
        { value: 'aanneming-van-werk', label: 'Aanneming van werk', desc: 'Resultaatsverplichting voor een specifiek werk' },
    ];

    const generateOvereenkomst = (type) => {
        const typeInfo = OVEREENKOMST_TYPES.find(t => t.value === type) || OVEREENKOMST_TYPES[0];
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        addZzpListItem('modelovereenkomsten', {
            type: type,
            typeLabel: typeInfo.label,
            opdrachtgever: 'De Schilders uit Katwijk',
            opdrachtnemer: zzpProfiel.bedrijfsnaam || `${zzpProfiel.voornaam} ${zzpProfiel.achternaam}`.trim(),
            kvkNummer: zzpProfiel.kvkNummer || '',
            btwNummer: zzpProfiel.btwNummer || '',
            startDatum: today,
            eindDatum: endDate,
            uurtarief: zzpProfiel.uurtarief || '',
            omschrijving: '',
            status: 'concept',
            getekend: false,
            getekendDatum: '',
        });
    };

    // Competenties
    const COMPETENTIES = [
        'Zelfstandig werken', 'Samenwerken', 'Leiderschap', 'Communicatie',
        'Probleemoplossend', 'Kwaliteitsbewust', 'Veiligheid', 'Klantgericht',
        'Flexibel', 'Stressbestendig', 'Leergierig', 'Nauwkeurig',
        'Planmatig werken', 'Initiatief', 'Verantwoordelijk', 'Vakmanschap'
    ];
    const toggleCompetentie = (c) => setProfiel(prev => ({ ...prev, competenties: (prev.competenties || []).includes(c) ? prev.competenties.filter(x => x !== c) : [...(prev.competenties || []), c] }));

    // Werkdagen toggle
    const WERKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    const toggleWerkdag = (dag) => setProfiel(prev => ({ ...prev, werkdagen: (prev.werkdagen || []).includes(dag) ? prev.werkdagen.filter(d => d !== dag) : [...(prev.werkdagen || []), dag] }));

    // BHV status
    const bhvDatum = profiel.bhvVerloopdatum;
    const bhvDaysLeft = bhvDatum ? Math.ceil((new Date(bhvDatum) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const bhvStatus = bhvDaysLeft === null ? 'none' : bhvDaysLeft < 0 ? 'expired' : bhvDaysLeft < 90 ? 'warning' : 'valid';

    // Active data
    const activeProfiel = profielType === 'zzp' ? zzpProfiel : profiel;
    const activeUpdate = profielType === 'zzp' ? updateZzp : update;
    const activeSpecs = activeProfiel.specialiteiten || [];

    // VCA status (shared)
    const vcaDatum = activeProfiel.vcaVerloopdatum;
    const vcaDaysLeft = vcaDatum ? Math.ceil((new Date(vcaDatum) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const vcaStatus = vcaDaysLeft === null ? 'none' : vcaDaysLeft < 0 ? 'expired' : vcaDaysLeft < 90 ? 'warning' : 'valid';

    // Verzekering helpers (ZZP)
    const verzekeringsStatus = (datum) => {
        if (!datum) return 'none';
        const days = Math.ceil((new Date(datum) - new Date()) / (1000 * 60 * 60 * 24));
        return days < 0 ? 'expired' : days < 90 ? 'warning' : 'valid';
    };

    // ── Verloopradar: alle items met een verloopdatum ──
    const daysLeft = (datum) => datum ? Math.ceil((new Date(datum) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const expiryStatus = (datum) => { const d = daysLeft(datum); if (d === null) return 'none'; return d < 0 ? 'expired' : d < 90 ? 'warning' : 'valid'; };

    const computeAfspraak = (a) => {
        if (!a.datum) return null;
        let cDate = new Date(a.datum);
        const today = new Date();
        today.setHours(0,0,0,0);
        cDate.setHours(0,0,0,0);
        const type = a.herhaalType || 'geen';
        const num = Math.max(1, a.herhaalAantal || 1);
        if (type !== 'geen' && cDate < today) {
            while (cDate <= today) {
                if (type === 'dagen') cDate.setDate(cDate.getDate() + num);
                if (type === 'weken') cDate.setDate(cDate.getDate() + num * 7);
                if (type === 'maanden') cDate.setMonth(cDate.getMonth() + num);
                if (type === 'jaren') cDate.setFullYear(cDate.getFullYear() + num);
            }
        }
        return { label: `Afspraak: ${a.onderwerp || 'Zonder titel'}`, datum: cDate.toISOString().split('T')[0], section: 'notities', icon: 'fa-handshake' };
    };

    const expiryItems = profielType === 'zzp' ? [
        { label: 'VCA Certificaat', datum: zzpProfiel.vcaVerloopdatum, section: 'vca', icon: 'fa-certificate' },
        { label: 'Aansprakelijkheidsverzekering', datum: zzpProfiel.aansprakelijkheidVerloopdatum, section: 'verzekeringen', icon: 'fa-shield-halved' },
        { label: 'CAV Verzekering', datum: zzpProfiel.cavVerloopdatum, section: 'verzekeringen', icon: 'fa-shield-halved' },
        ...(zzpProfiel.afspraken || []).filter(a => a.herinneringActief !== false).map(computeAfspraak).filter(Boolean),
    ].filter(i => i.datum) : [
        { label: 'VCA Certificaat', datum: profiel.vcaVerloopdatum, section: 'opleiding', icon: 'fa-certificate' },
        { label: 'BHV Certificaat', datum: profiel.bhvVerloopdatum, section: 'opleiding', icon: 'fa-kit-medical' },
        { label: 'Identiteitsbewijs', datum: profiel.docIdVerloopdatum, section: 'documenten', icon: 'fa-id-card' },
        { label: 'Werkvergunning', datum: profiel.docWerkvergunningVerloopdatum, section: 'documenten', icon: 'fa-passport' },
        ...(profiel.afspraken || []).filter(a => a.herinneringActief !== false).map(computeAfspraak).filter(Boolean),
    ].filter(i => i.datum);

    const alertItems = expiryItems.filter(i => expiryStatus(i.datum) !== 'valid');

    // Sectie-badges: rood/oranje dot als er verlopen/bijna-verlopen items in die sectie zitten
    const sectionAlert = (sectionId) => {
        const items = expiryItems.filter(i => i.section === sectionId);
        if (items.some(i => expiryStatus(i.datum) === 'expired')) return 'expired';
        if (items.some(i => expiryStatus(i.datum) === 'warning')) return 'warning';
        return null;
    };

    // Section nav
    const werknemerSections = [
        { id: 'gegevens', label: 'Persoonlijke gegevens', icon: 'fa-user' },
        { id: 'dienstverband', label: 'Dienstverband', icon: 'fa-file-contract' },
        { id: 'documenten', label: 'Documenten', icon: 'fa-folder-open' },
        { id: 'tarieven', label: 'Salaris & Voorwaarden', icon: 'fa-euro-sign' },
        { id: 'opleiding', label: 'Opleiding & Certificaten', icon: 'fa-graduation-cap' },
        { id: 'werktijden', label: 'Werktijden & Verlof', icon: 'fa-clock' },
        { id: 'functioneren', label: 'Functioneren', icon: 'fa-chart-line' },
        { id: 'gezondheid', label: 'Gezondheid & Verzuim', icon: 'fa-heart-pulse' },
        { id: 'specialiteiten', label: 'Specialiteiten', icon: 'fa-paint-roller' },
        { id: 'notities', label: 'Notities & Afspraken', icon: 'fa-note-sticky' },
    ];
    const zzpSections = [
        { id: 'gegevens', label: 'Bedrijfsgegevens', icon: 'fa-building' },
        { id: 'tarieven', label: 'Tarieven', icon: 'fa-euro-sign' },
        { id: 'vca', label: 'VCA Certificaat', icon: 'fa-certificate' },
        { id: 'verzekeringen', label: 'Verzekeringen', icon: 'fa-shield-halved' },
        { id: 'modelovereenkomsten', label: 'Modelovereenkomsten', icon: 'fa-file-signature' },
        { id: 'specialiteiten', label: 'Specialiteiten', icon: 'fa-paint-roller' },
        { id: 'notities', label: 'Notities & Afspraken', icon: 'fa-note-sticky' },
    ];
    const sections = profielType === 'zzp' ? zzpSections : werknemerSections;

    // Reset active section if it doesn't exist in the new type
    useEffect(() => {
        if (!sections.find(s => s.id === activeSection)) setActiveSection('gegevens');
    }, [profielType]);


    if (dashboardMode) {
        return (
            <div className="content-area">
                <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ marginBottom: '4px', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <i className="fa-solid fa-users" style={{ color: '#F5850A' }}></i>
                            Team
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', maxWidth: '700px' }}>
                            Beheer het volledige personeelsdossier van je werknemers en aangesloten ZZP'ers.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={() => window.location.href = '/onboarding'} style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: '#0284c7', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}>
                            <i className="fa-solid fa-wand-magic-sparkles"></i> Intake Link Sturen
                        </button>
                        <button onClick={() => {
                            const newId = Date.now();
                            openEmployee({ id: newId, naam: 'Nieuwe Medewerker', type: 'werknemer' });
                        }} style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(245,133,10,0.2)' }}>
                            <i className="fa-solid fa-user-plus"></i> Handmatig Profiel
                        </button>
                    </div>
                </div>

                <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '16px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Naam</th>
                                <th style={{ padding: '16px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Type / Functie</th>
                                <th style={{ padding: '16px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Contact</th>
                                <th style={{ padding: '16px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '16px', width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamList.map(emp => (
                                <tr key={emp.id} onClick={() => openEmployee(emp)} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.15s' }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '16px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: emp.type === 'zzp' ? 'rgba(59,130,246,0.1)' : 'rgba(245,133,10,0.1)', color: emp.type === 'zzp' ? '#3b82f6' : '#F5850A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                                            <i className={`fa-solid ${emp.type === 'zzp' ? 'fa-building' : 'fa-user'}`}></i>
                                        </div>
                                        {emp.naam || `${emp.voornaam || ''} ${emp.achternaam || ''}`.trim() || 'Onbekend'}
                                    </td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '0.9rem' }}>
                                        {emp.type === 'zzp' ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>ZZP'er</span> : <span style={{ color: '#F5850A', fontWeight: 600 }}>Werknemer</span>}
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{emp.functie || emp.bedrijfsnaam || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '0.9rem' }}>
                                        <div><i className="fa-solid fa-phone" style={{ width: '16px', color: '#94a3b8' }}></i> {emp.telefoon || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: emp.status === 'Inactief' ? '#f1f5f9' : 'rgba(34,197,94,0.1)', color: emp.status === 'Inactief' ? '#64748b' : '#16a34a' }}>
                                            {emp.status || 'Actief'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#cbd5e1', textAlign: 'right' }}>
                                        <i className="fa-solid fa-chevron-right"></i>
                                    </td>
                                </tr>
                            ))}
                            {teamList.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        Nog geen personeel of ZZP'ers in het dossier. Gebruik de Intake Generator of voeg handmatig een nieuw profiel toe.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="content-area">
            {/* Terugknop header */}
            <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setDashboardMode(true)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-arrow-left"></i> Terug naar teamoverzicht
                </button>
            </div>

            <div className="page-header" style={{ marginBottom: '16px' }}>
                <h1 style={{ marginBottom: '4px', fontSize: '1.6rem' }}>
                    <i className="fa-solid fa-user-pen" style={{ marginRight: '10px', color: '#F5850A' }}></i>
                    {profielType === 'zzp' ? "Dossier ZZP'er" : "Personeelsdossier"}
                </h1>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>
                    {profielType === 'zzp' ? "Beheer bedrijfsgegevens, certificaten en tarieven van deze ZZP'er." : "Beheer persoonlijke gegevens, certificaten en afspraken van deze medewerker."}
                </p>
            </div>

            {/* === TAB SWITCHER (alleen zichtbaar als beheerder of als beide rechten aanwezig) === */}
            {canWerknemer && canZzp && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
                    {[
                        { id: 'werknemer', label: 'Werknemer', icon: 'fa-user-tie' },
                        { id: 'zzp', label: "ZZP'er", icon: 'fa-file-contract' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setProfielType(t.id)}
                            style={{
                                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: profielType === t.id ? 700 : 500,
                                background: profielType === t.id ? '#fff' : 'transparent',
                                color: profielType === t.id ? '#F5850A' : '#64748b',
                                boxShadow: profielType === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                        >
                            <i className={`fa-solid ${t.icon}`}></i>
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ──── VERLOOPRADAR ──── */}
            {alertItems.length > 0 && (
                <div style={{
                    marginBottom: '16px', padding: '14px 18px', borderRadius: '12px',
                    background: alertItems.some(i => expiryStatus(i.datum) === 'expired')
                        ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${alertItems.some(i => expiryStatus(i.datum) === 'expired') ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        background: alertItems.some(i => expiryStatus(i.datum) === 'expired') ? '#ef4444' : '#f59e0b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem'
                    }}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px' }}>
                            {alertItems.filter(i => expiryStatus(i.datum) === 'expired').length > 0
                                ? `${alertItems.filter(i => expiryStatus(i.datum) === 'expired').length} item(s) verlopen`
                                : `${alertItems.length} item(s) verlopen binnenkort`}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {alertItems.map((item, idx) => {
                                const st = expiryStatus(item.datum);
                                const d = daysLeft(item.datum);
                                const colors = { expired: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', badge: '#ef4444' }, warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b' } };
                                const c = colors[st];
                                return (
                                    <div key={idx}
                                        onClick={() => setActiveSection(item.section)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer',
                                            padding: '6px 12px', borderRadius: '8px',
                                            background: c.bg, border: `1px solid ${c.border}`,
                                            fontSize: '0.78rem', color: c.text, fontWeight: 600,
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <i className={`fa-solid ${item.icon}`}></i>
                                        {item.label}
                                        <span style={{ padding: '1px 7px', borderRadius: '99px', background: c.badge, color: '#fff', fontSize: '0.68rem' }}>
                                            {st === 'expired' ? 'Verlopen' : d <= 30 ? `${d}d` : `${Math.round(d / 30)}m`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {/* Left: Section Navigation */}
                <div style={{
                    width: '220px', flexShrink: 0, background: '#fff', borderRadius: '12px',
                    border: '1px solid var(--border-color)', overflow: 'hidden',
                    position: 'sticky', top: '80px'
                }}>
                    {/* User Card */}
                    <div style={{
                        padding: '16px', textAlign: 'center',
                        background: profielType === 'zzp'
                            ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                            : 'linear-gradient(135deg, #F5850A, #E07000)',
                        color: '#fff'
                    }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', fontWeight: 800, margin: '0 auto 8px'
                        }}>{profielType === 'zzp' ? <i className="fa-solid fa-file-contract"></i> : (user?.initials || 'JM')}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {profielType === 'zzp' ? (zzpProfiel.bedrijfsnaam || 'ZZP Profiel') : (user?.name || 'Jan Modaal')}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {profielType === 'zzp' ? "ZZP'er / Zelfstandige" : (user?.role || 'Beheerder')}
                        </div>
                    </div>
                    <div style={{ padding: '8px' }}>
                        {sections.map(s => {
                            const alert = sectionAlert(s.id);
                            return (
                                <button key={s.id} onClick={() => setActiveSection(s.id)}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        fontSize: '0.82rem', fontWeight: activeSection === s.id ? 700 : 500,
                                        background: activeSection === s.id ? (profielType === 'zzp' ? 'rgba(59,130,246,0.08)' : 'rgba(245,133,10,0.08)') : 'transparent',
                                        color: activeSection === s.id ? (profielType === 'zzp' ? '#3b82f6' : '#F5850A') : '#64748b',
                                        transition: 'all 0.15s', marginBottom: '2px',
                                    }}
                                >
                                    <i className={`fa-solid ${s.icon}`} style={{ width: '16px', textAlign: 'center' }}></i>
                                    <span style={{ flex: 1 }}>{s.label}</span>
                                    {alert && (
                                        <span style={{
                                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                            background: alert === 'expired' ? '#ef4444' : '#f59e0b',
                                            boxShadow: `0 0 0 2px ${alert === 'expired' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                            display: 'inline-block'
                                        }}></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Content */}
                <div style={{ flex: 1, minWidth: 0 }}>

                    {/* ════════ WERKNEMER GEGEVENS ════════ */}
                    {profielType === 'werknemer' && activeSection === 'gegevens' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-user" style={{ color: '#F5850A' }}></i>
                                Persoonlijke gegevens
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <Field label="Voornaam" icon="fa-user" field="voornaam" placeholder="Jan" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="Achternaam" icon="fa-user" field="achternaam" placeholder="Modaal" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="Geboortedatum" icon="fa-cake-candles" field="geboortedatum" type="date" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="Telefoon" icon="fa-phone" field="telefoon" placeholder="06-12345678" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="E-mail" icon="fa-envelope" field="email" type="email" placeholder="jan@voorbeeld.nl" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="BSN" icon="fa-id-card" field="bsn" placeholder="123456789" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="Adres" icon="fa-house" field="adres" placeholder="Kerkstraat 1" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="Postcode" icon="fa-location-dot" field="postcode" placeholder="2200 AA" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="Woonplaats" icon="fa-city" field="woonplaats" placeholder="Katwijk" obj={activeProfiel} upd={activeUpdate} />
                                <Field label="IBAN" icon="fa-building-columns" field="iban" placeholder="NL00 INGB 0000 0000 00" obj={activeProfiel} upd={activeUpdate} />
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-flag" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>
                                        Nationaliteit
                                    </label>
                                    <select value={profiel.nationaliteit || 'Nederlands'} onChange={e => update('nationaliteit', e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fafafa', cursor: 'pointer' }}>
                                        {['Nederlands', 'Duits', 'Pools', 'Hongaars', 'Belgisch', 'Turks', 'Marokkaans', 'Surinaams', 'Overig'].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-heart" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>
                                        Burgerlijke staat
                                    </label>
                                    <select value={profiel.burgerlijkeStaat || ''} onChange={e => update('burgerlijkeStaat', e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fafafa', cursor: 'pointer' }}>
                                        <option value="">— Selecteer —</option>
                                        {['Ongehuwd', 'Gehuwd', 'Samenwonend', 'Gescheiden', 'Weduwe/Weduwnaar'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '12px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                                    <i className="fa-solid fa-phone-volume" style={{ marginRight: '6px', color: '#ef4444' }}></i>
                                    Noodcontact
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                    <Field label="Naam noodcontact" icon="fa-user-shield" field="noodcontact" placeholder="Partner / Familie" obj={activeProfiel} upd={activeUpdate} />
                                    <Field label="Telefoonnummer" icon="fa-phone" field="noodcontactTel" placeholder="06-98765432" obj={activeProfiel} upd={activeUpdate} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════ DIENSTVERBAND & CONTRACTEN ════════ */}
                    {profielType === 'werknemer' && activeSection === 'dienstverband' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-file-contract" style={{ color: '#F5850A' }}></i>
                                Dienstverband & Contracten
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <Field label="Datum in dienst" icon="fa-calendar-plus" field="datumInDienst" type="date" obj={profiel} upd={update} />
                                <Field label="Datum uit dienst" icon="fa-calendar-minus" field="datumUitDienst" type="date" obj={profiel} upd={update} />
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-file-signature" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>
                                        Type contract
                                    </label>
                                    <select value={profiel.contractType || 'Vast'} onChange={e => update('contractType', e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fafafa', cursor: 'pointer' }}>
                                        {['Vast', 'Bepaalde tijd', 'Oproep', 'Stage', 'Uitzend'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <Field label="Proeftijd tot" icon="fa-hourglass-half" field="proeftijdTot" type="date" obj={profiel} upd={update} />
                                <Field label="Functie" icon="fa-briefcase" field="functie" placeholder="Schilder" obj={profiel} upd={update} />
                                <Field label="Afdeling / Team" icon="fa-people-group" field="afdeling" placeholder="Buitendienst" obj={profiel} upd={update} />
                            </div>
                            {/* Dienstverband duur */}
                            {profiel.datumInDienst && (
                                <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>
                                        <i className="fa-solid fa-calendar-check"></i>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                                            {(() => { const d = Math.ceil((new Date() - new Date(profiel.datumInDienst)) / (1000 * 60 * 60 * 24)); const y = Math.floor(d / 365); const m = Math.floor((d % 365) / 30); return `${y > 0 ? y + ' jaar ' : ''}${m} maanden in dienst`; })()}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Sinds {new Date(profiel.datumInDienst).toLocaleDateString('nl-NL')}</div>
                                    </div>
                                </div>
                            )}
                            {/* Arbeidsovereenkomst */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-file-signature" style={{ marginRight: '6px', color: '#F5850A' }}></i>
                                        Arbeidsovereenkomst getekend
                                    </span>
                                    <div onClick={() => update('arbeidsovereenkomstGetekend', !profiel.arbeidsovereenkomstGetekend)}
                                        style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel.arbeidsovereenkomstGetekend ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel.arbeidsovereenkomstGetekend ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                    </div>
                                </div>
                                {profiel.arbeidsovereenkomstGetekend && (
                                    <Field label="Datum ondertekening" icon="fa-pen-nib" field="arbeidsovereenkomstDatum" type="date" obj={profiel} upd={update} />
                                )}
                            </div>
                            {/* Aanvullende overeenkomsten */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-file-circle-plus" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
                                        Aanvullende overeenkomsten
                                    </span>
                                    <button onClick={() => addListItem('aanvullendeOvereenkomsten', { naam: '', datum: '' })} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                                        <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i>Toevoegen
                                    </button>
                                </div>
                                {(profiel.aanvullendeOvereenkomsten || []).length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', border: '2px dashed #e2e8f0', fontSize: '0.82rem' }}>
                                        Geen aanvullende overeenkomsten
                                    </div>
                                ) : (profiel.aanvullendeOvereenkomsten || []).map(ov => (
                                    <div key={ov.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                        <input type="text" value={ov.naam} onChange={e => updateListItem('aanvullendeOvereenkomsten', ov.id, 'naam', e.target.value)} placeholder="Naam overeenkomst"
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa' }} />
                                        <input type="date" value={ov.datum} onChange={e => updateListItem('aanvullendeOvereenkomsten', ov.id, 'datum', e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa' }} />
                                        <button onClick={() => removeListItem('aanvullendeOvereenkomsten', ov.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}>
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ════════ DOCUMENTEN ════════ */}
                    {profielType === 'werknemer' && activeSection === 'documenten' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-folder-open" style={{ color: '#F5850A' }}></i>
                                Documenten
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>Houd bij welke vereiste documenten ontvangen zijn.</p>
                            {[
                                {
                                    key: 'docIdentiteitsbewijs', label: 'Geldig identiteitsbewijs', icon: 'fa-id-card', extraFields: [
                                        { field: 'docIdType', label: 'Type', type: 'select', options: ['Paspoort', 'ID-kaart', 'Rijbewijs'] },
                                        { field: 'docIdVerloopdatum', label: 'Verloopdatum', type: 'date' },
                                    ]
                                },
                                {
                                    key: 'docLoonbelasting', label: 'Loonbelastingverklaring', icon: 'fa-file-invoice-dollar', extraFields: [
                                        { field: 'docLoonbelastingDatum', label: 'Datum ontvangen', type: 'date' },
                                    ]
                                },
                                {
                                    key: 'docWerkvergunning', label: 'Werkvergunning', icon: 'fa-passport', extraFields: [
                                        { field: 'docWerkvergunningNummer', label: 'Vergunningnummer', type: 'text', placeholder: 'TWV-2026-XXXX' },
                                        { field: 'docWerkvergunningVerloopdatum', label: 'Verloopdatum', type: 'date' },
                                    ]
                                },
                                {
                                    key: 'docSollicitatie', label: 'Sollicitatiebrief & CV', icon: 'fa-file-lines', extraFields: [
                                        { field: 'docSollicitatieDatum', label: 'Datum ontvangen', type: 'date' },
                                    ]
                                },
                            ].map(doc => (
                                <div key={doc.key} style={{ marginBottom: '12px', padding: '14px 18px', borderRadius: '10px', border: `1px solid ${profiel[doc.key] ? 'rgba(34,197,94,0.3)' : '#e2e8f0'}`, background: profiel[doc.key] ? 'rgba(34,197,94,0.04)' : '#fafafa' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className={`fa-solid ${doc.icon}`} style={{ color: profiel[doc.key] ? '#22c55e' : '#94a3b8' }}></i>
                                            {doc.label}
                                            {profiel[doc.key] && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#22c55e', color: '#fff', fontWeight: 600 }}>Ontvangen</span>}
                                        </span>
                                        <div onClick={() => update(doc.key, !profiel[doc.key])}
                                            style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel[doc.key] ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel[doc.key] ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                        </div>
                                    </div>
                                    {profiel[doc.key] && doc.extraFields && (
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${doc.extraFields.length}, 1fr)`, gap: '0 16px', marginTop: '10px' }}>
                                            {doc.extraFields.map(ef => ef.type === 'select' ? (
                                                <div key={ef.field} style={{ marginBottom: '8px' }}>
                                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>{ef.label}</label>
                                                    <select value={profiel[ef.field] || ''} onChange={e => update(ef.field, e.target.value)}
                                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
                                                        {ef.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div key={ef.field} style={{ marginBottom: '8px' }}>
                                                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '3px', display: 'block' }}>{ef.label}</label>
                                                    <input type={ef.type} value={profiel[ef.field] || ''} onChange={e => update(ef.field, e.target.value)} placeholder={ef.placeholder || ''}
                                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* Completeness indicator */}
                            {(() => {
                                const docFields = ['docIdentiteitsbewijs', 'docLoonbelasting', 'docWerkvergunning', 'docSollicitatie']; const done = docFields.filter(f => profiel[f]).length; return (
                                    <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '8px', background: done === docFields.length ? 'rgba(34,197,94,0.08)' : 'rgba(250,204,21,0.08)', border: `1px solid ${done === docFields.length ? 'rgba(34,197,94,0.2)' : 'rgba(250,204,21,0.2)'}` }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: done === docFields.length ? '#16a34a' : '#ca8a04', marginBottom: '4px' }}>
                                            <i className={`fa-solid ${done === docFields.length ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} style={{ marginRight: '6px' }}></i>
                                            {done}/{docFields.length} documenten ontvangen
                                        </div>
                                        <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(done / docFields.length) * 100}%`, borderRadius: '3px', background: done === docFields.length ? '#22c55e' : '#facc15', transition: 'width 0.3s' }} />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ════════ SALARIS & ARBEIDSVOORWAARDEN ════════ */}
                    {profielType === 'werknemer' && activeSection === 'tarieven' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-euro-sign" style={{ color: '#F5850A' }}></i>
                                Salaris & Arbeidsvoorwaarden
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-clock" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>
                                        Uurloon (bruto)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px 0 0 8px', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>€</span>
                                        <input type="number" value={profiel.uurloon || ''} onChange={e => update('uurloon', e.target.value)}
                                            placeholder="18.50" style={{ flex: 1, padding: '9px 12px', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0', borderLeft: 'none', fontSize: '0.85rem', background: '#fafafa', outline: 'none' }} />
                                    </div>
                                </div>
                                <Field label="Salarisschaal / Periodiek" icon="fa-layer-group" field="salarisschaal" placeholder="Schaal 5, periodiek 3" obj={profiel} upd={update} />
                            </div>
                            {/* Berekening overzicht */}
                            {profiel.uurloon && (
                                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245,133,10,0.06)', border: '1px solid rgba(245,133,10,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per uur</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F5850A' }}>€{Number(profiel.uurloon).toFixed(2)}</div>
                                    </div>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245,133,10,0.06)', border: '1px solid rgba(245,133,10,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per dag (7.5u)</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F5850A' }}>€{(Number(profiel.uurloon) * 7.5).toFixed(2)}</div>
                                    </div>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245,133,10,0.06)', border: '1px solid rgba(245,133,10,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per week (37.5u)</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F5850A' }}>€{(Number(profiel.uurloon) * 37.5).toFixed(2)}</div>
                                    </div>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245,133,10,0.06)', border: '1px solid rgba(245,133,10,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per maand (±162.5u)</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F5850A' }}>€{(Number(profiel.uurloon) * 162.5).toFixed(2)}</div>
                                    </div>
                                </div>
                            )}
                            {/* Extra arbeidsvoorwaarden */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                                    <i className="fa-solid fa-gift" style={{ marginRight: '6px', color: '#F5850A' }}></i>
                                    Aanvullende voorwaarden
                                </div>
                                {[
                                    { key: 'pensioen', label: 'Pensioenregeling', icon: 'fa-piggy-bank', extraField: 'pensioenOmschrijving', extraLabel: 'Omschrijving', extraPlaceholder: 'BPF Schilders' },
                                    { key: 'eindejaarsuitkering', label: 'Eindejaarsuitkering', icon: 'fa-champagne-glasses', extraField: 'eindejaarsPercentage', extraLabel: 'Percentage', extraPlaceholder: '8.33%' },
                                ].map(item => (
                                    <div key={item.key} style={{ marginBottom: '10px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className={`fa-solid ${item.icon}`} style={{ color: '#F5850A' }}></i>{item.label}
                                            </span>
                                            <div onClick={() => update(item.key, !profiel[item.key])}
                                                style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel[item.key] ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel[item.key] ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                            </div>
                                        </div>
                                        {profiel[item.key] && (
                                            <div style={{ marginTop: '8px' }}>
                                                <Field label={item.extraLabel} icon="fa-pen" field={item.extraField} placeholder={item.extraPlaceholder} obj={profiel} upd={update} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: '8px' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="fa-solid fa-receipt" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>
                                            Onkostenvergoeding (€/maand)
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px 0 0 8px', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>€</span>
                                            <input type="number" value={profiel.onkostenvergoeding || ''} onChange={e => update('onkostenvergoeding', e.target.value)}
                                                placeholder="0.00" style={{ flex: 1, padding: '9px 12px', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0', borderLeft: 'none', fontSize: '0.85rem', background: '#fafafa', outline: 'none' }} />
                                        </div>
                                    </div>
                                </div>
                                {/* Auto / Fiets van de zaak */}
                                {[
                                    { key: 'autoVanDeZaak', label: 'Auto van de zaak', icon: 'fa-car', fields: [{ f: 'autoKenteken', l: 'Kenteken', p: 'AB-123-CD' }, { f: 'autoType', l: 'Merk/Type', p: 'VW Transporter' }] },
                                    { key: 'fietsVanDeZaak', label: 'Fiets van de zaak', icon: 'fa-bicycle', fields: [{ f: 'fietsType', l: 'Type/Merk', p: 'Gazelle e-bike' }] },
                                ].map(item => (
                                    <div key={item.key} style={{ marginBottom: '10px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <i className={`fa-solid ${item.icon}`} style={{ color: '#3b82f6' }}></i>{item.label}
                                            </span>
                                            <div onClick={() => update(item.key, !profiel[item.key])}
                                                style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel[item.key] ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel[item.key] ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                            </div>
                                        </div>
                                        {profiel[item.key] && (
                                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${item.fields.length}, 1fr)`, gap: '0 16px', marginTop: '8px' }}>
                                                {item.fields.map(fd => <Field key={fd.f} label={fd.l} icon="fa-pen" field={fd.f} placeholder={fd.p} obj={profiel} upd={update} />)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ════════ ZZP BEDRIJFSGEGEVENS ════════ */}
                    {profielType === 'zzp' && activeSection === 'gegevens' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-building" style={{ color: '#3b82f6' }}></i>
                                Bedrijfsgegevens
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <Field label="Bedrijfsnaam" icon="fa-building" field="bedrijfsnaam" placeholder="Schildersbedrijf Jansen" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="KVK Nummer" icon="fa-hashtag" field="kvkNummer" placeholder="12345678" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="BTW Nummer" icon="fa-receipt" field="btwNummer" placeholder="NL000000000B01" obj={zzpProfiel} upd={updateZzp} />
                                <div></div>
                                <Field label="Voornaam" icon="fa-user" field="voornaam" placeholder="Jan" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Achternaam" icon="fa-user" field="achternaam" placeholder="Jansen" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Telefoon" icon="fa-phone" field="telefoon" placeholder="06-12345678" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="E-mail" icon="fa-envelope" field="email" type="email" placeholder="info@jansen.nl" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Adres" icon="fa-house" field="adres" placeholder="Industrieweg 5" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Postcode" icon="fa-location-dot" field="postcode" placeholder="2200 BB" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Woonplaats" icon="fa-city" field="woonplaats" placeholder="Katwijk" obj={zzpProfiel} upd={updateZzp} />
                                <div></div>
                                <Field label="IBAN" icon="fa-building-columns" field="iban" placeholder="NL00 RABO 0000 0000 00" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Tenaamstelling" icon="fa-pen" field="tenaamstelling" placeholder="J. Jansen" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="BSN Nummer" icon="fa-id-card" field="bsn" placeholder="123456789" obj={zzpProfiel} upd={updateZzp} />
                            </div>
                        </div>
                    )}

                    {/* ════════ ZZP TARIEVEN ════════ */}
                    {profielType === 'zzp' && activeSection === 'tarieven' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-euro-sign" style={{ color: '#3b82f6' }}></i>
                                Tarieven & Beschikbaarheid
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-clock" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>
                                        Uurtarief (excl. BTW)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px 0 0 8px', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>€</span>
                                        <input type="number" value={zzpProfiel.uurtarief} onChange={e => updateZzp('uurtarief', e.target.value)}
                                            placeholder="45.00" style={{ flex: 1, padding: '9px 12px', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0', borderLeft: 'none', fontSize: '0.85rem', background: '#fafafa' }} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-calendar-day" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>
                                        Dagtarief (excl. BTW)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ padding: '9px 12px', background: '#e2e8f0', borderRadius: '8px 0 0 8px', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>€</span>
                                        <input type="number" value={zzpProfiel.dagTarief} onChange={e => updateZzp('dagTarief', e.target.value)}
                                            placeholder="340.00" style={{ flex: 1, padding: '9px 12px', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0', borderLeft: 'none', fontSize: '0.85rem', background: '#fafafa' }} />
                                    </div>
                                </div>
                            </div>
                            {/* Beschikbaarheid */}
                            <div style={{ marginTop: '8px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-calendar-check" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>
                                    Beschikbaarheid
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['Voltijd', 'Deeltijd', 'Op afroep', 'Weekenden'].map(b => (
                                        <button key={b} onClick={() => updateZzp('beschikbaarheid', b)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                                border: `2px solid ${zzpProfiel.beschikbaarheid === b ? '#3b82f6' : '#e2e8f0'}`,
                                                background: zzpProfiel.beschikbaarheid === b ? 'rgba(59,130,246,0.08)' : '#fafafa',
                                                color: zzpProfiel.beschikbaarheid === b ? '#3b82f6' : '#64748b',
                                                fontWeight: zzpProfiel.beschikbaarheid === b ? 700 : 500,
                                                fontSize: '0.82rem', transition: 'all 0.15s'
                                            }}
                                        >{b}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Tarief summary */}
                            {zzpProfiel.uurtarief && (
                                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per uur</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>€{Number(zzpProfiel.uurtarief).toFixed(2)}</div>
                                    </div>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per dag (7.5u)</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>€{(Number(zzpProfiel.uurtarief) * 7.5).toFixed(2)}</div>
                                    </div>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per week (37.5u)</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>€{(Number(zzpProfiel.uurtarief) * 37.5).toFixed(2)}</div>
                                    </div>
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Per maand (±162.5u)</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>€{(Number(zzpProfiel.uurtarief) * 162.5).toFixed(2)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ OPLEIDING & CERTIFICATEN (WERKNEMER) ════════ */}
                    {profielType === 'werknemer' && activeSection === 'opleiding' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-graduation-cap" style={{ color: '#F5850A' }}></i>
                                Opleiding & Certificaten
                            </h2>
                            {/* VCA Certificaat */}
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                                <i className="fa-solid fa-certificate" style={{ marginRight: '6px', color: '#F5850A' }}></i>VCA Certificaat
                            </div>
                            <div style={{ padding: '14px 18px', borderRadius: '10px', marginBottom: '12px', background: vcaStatus === 'valid' ? 'rgba(34,197,94,0.08)' : vcaStatus === 'warning' ? 'rgba(250,204,21,0.08)' : vcaStatus === 'expired' ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.02)', border: `1px solid ${vcaStatus === 'valid' ? 'rgba(34,197,94,0.3)' : vcaStatus === 'warning' ? 'rgba(250,204,21,0.3)' : vcaStatus === 'expired' ? 'rgba(239,68,68,0.3)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: vcaStatus === 'valid' ? '#22c55e' : vcaStatus === 'warning' ? '#facc15' : vcaStatus === 'expired' ? '#ef4444' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>
                                    <i className={`fa-solid ${vcaStatus === 'valid' ? 'fa-check' : vcaStatus === 'warning' ? 'fa-clock' : vcaStatus === 'expired' ? 'fa-xmark' : 'fa-question'}`}></i>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>{vcaStatus === 'valid' ? 'VCA Geldig' : vcaStatus === 'warning' ? 'VCA Bijna verlopen' : vcaStatus === 'expired' ? 'VCA Verlopen!' : 'Geen VCA ingevuld'}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{vcaDaysLeft !== null ? (vcaDaysLeft >= 0 ? `Nog ${vcaDaysLeft} dagen geldig` : `${Math.abs(vcaDaysLeft)} dagen geleden verlopen`) : 'Vul de verloopdatum in'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-list" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>VCA Type
                                    </label>
                                    <select value={profiel.vcaType} onChange={e => update('vcaType', e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fafafa', cursor: 'pointer' }}>
                                        <option value="VCA Basis">VCA Basis (B-VCA)</option>
                                        <option value="VCA VOL">VCA VOL</option>
                                        <option value="VIL-VCU">VIL-VCU</option>
                                    </select>
                                </div>
                                <Field label="Certificaatnummer" icon="fa-hashtag" field="vcaNummer" placeholder="VCA-2026-XXXX" obj={profiel} upd={update} />
                                <Field label="Verloopdatum" icon="fa-calendar-xmark" field="vcaVerloopdatum" type="date" obj={profiel} upd={update} />
                            </div>
                            {/* BHV Certificaat */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-kit-medical" style={{ marginRight: '6px', color: '#ef4444' }}></i>BHV Certificaat
                                    </span>
                                    <div onClick={() => update('bhvCertificaat', !profiel.bhvCertificaat)}
                                        style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel.bhvCertificaat ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel.bhvCertificaat ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                    </div>
                                </div>
                                {profiel.bhvCertificaat && (
                                    <>
                                        {bhvStatus !== 'none' && (
                                            <div style={{ padding: '8px 14px', borderRadius: '8px', marginBottom: '8px', fontSize: '0.78rem', fontWeight: 600, background: bhvStatus === 'valid' ? 'rgba(34,197,94,0.08)' : bhvStatus === 'warning' ? 'rgba(250,204,21,0.08)' : 'rgba(239,68,68,0.08)', color: bhvStatus === 'valid' ? '#22c55e' : bhvStatus === 'warning' ? '#f59e0b' : '#ef4444' }}>
                                                <i className={`fa-solid ${bhvStatus === 'valid' ? 'fa-check-circle' : bhvStatus === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}`} style={{ marginRight: '6px' }}></i>
                                                {bhvStatus === 'valid' ? `BHV Geldig — nog ${bhvDaysLeft} dagen` : bhvStatus === 'warning' ? `BHV Bijna verlopen — nog ${bhvDaysLeft} dagen` : `BHV Verlopen! — ${Math.abs(bhvDaysLeft)} dagen geleden`}
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                            <Field label="BHV Nummer" icon="fa-hashtag" field="bhvNummer" placeholder="BHV-2026-XXXX" obj={profiel} upd={update} />
                                            <Field label="Verloopdatum" icon="fa-calendar-xmark" field="bhvVerloopdatum" type="date" obj={profiel} upd={update} />
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* VOG Verklaring */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-file-shield" style={{ marginRight: '6px', color: '#8b5cf6' }}></i>VOG (Goed Gedrag)
                                    </span>
                                    <div onClick={() => update('vogVerklaring', !profiel.vogVerklaring)}
                                        style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel.vogVerklaring ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel.vogVerklaring ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                    </div>
                                </div>
                                {profiel.vogVerklaring && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0 16px' }}>
                                        <Field label="Afgiftedatum" icon="fa-calendar-check" field="vogDatum" type="date" obj={profiel} upd={update} />
                                    </div>
                                )}
                            </div>
                            {/* Opleidingen */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-book" style={{ marginRight: '6px', color: '#3b82f6' }}></i>Opleidingen & Diploma's
                                    </span>
                                    <button onClick={() => addListItem('opleidingen', { naam: '', instituut: '', datum: '', diploma: false })} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                                        <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i>Toevoegen
                                    </button>
                                </div>
                                {(profiel.opleidingen || []).length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', border: '2px dashed #e2e8f0', fontSize: '0.82rem' }}>Geen opleidingen toegevoegd</div>
                                ) : (profiel.opleidingen || []).map(opl => (
                                    <div key={opl.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', padding: '10px 14px', borderRadius: '8px', background: '#fafafa', border: '1px solid #e2e8f0' }}>
                                        <input type="text" value={opl.naam} onChange={e => updateListItem('opleidingen', opl.id, 'naam', e.target.value)} placeholder="Naam opleiding" style={{ flex: 2, padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                        <input type="text" value={opl.instituut} onChange={e => updateListItem('opleidingen', opl.id, 'instituut', e.target.value)} placeholder="Instituut" style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                        <input type="date" value={opl.datum} onChange={e => updateListItem('opleidingen', opl.id, 'datum', e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                        <div onClick={() => updateListItem('opleidingen', opl.id, 'diploma', !opl.diploma)} style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: opl.diploma ? '#22c55e' : '#e2e8f0', color: opl.diploma ? '#fff' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {opl.diploma ? '✓ Diploma' : 'Geen'}
                                        </div>
                                        <button onClick={() => removeListItem('opleidingen', opl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}><i className="fa-solid fa-trash-can"></i></button>
                                    </div>
                                ))}
                            </div>
                            {/* Loopbaanontwikkeling */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '14px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                    <i className="fa-solid fa-road" style={{ marginRight: '6px', color: '#F5850A' }}></i>Loopbaanontwikkeling & afspraken
                                </label>
                                <textarea value={profiel.loopbaanAfspraken || ''} onChange={e => update('loopbaanAfspraken', e.target.value)}
                                    placeholder="Afspraken over loopbaanontwikkeling, doorgroei, leerovereenkomst..." rows={3}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                        </div>
                    )}

                    {/* ════════ VCA (ZZP ONLY) ════════ */}
                    {profielType === 'zzp' && activeSection === 'vca' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-certificate" style={{ color: '#3b82f6' }}></i>
                                VCA Certificaat
                            </h2>
                            <div style={{ padding: '14px 18px', borderRadius: '10px', marginBottom: '16px', background: vcaStatus === 'valid' ? 'rgba(34,197,94,0.08)' : vcaStatus === 'warning' ? 'rgba(250,204,21,0.08)' : vcaStatus === 'expired' ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.02)', border: `1px solid ${vcaStatus === 'valid' ? 'rgba(34,197,94,0.3)' : vcaStatus === 'warning' ? 'rgba(250,204,21,0.3)' : vcaStatus === 'expired' ? 'rgba(239,68,68,0.3)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: vcaStatus === 'valid' ? '#22c55e' : vcaStatus === 'warning' ? '#facc15' : vcaStatus === 'expired' ? '#ef4444' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>
                                    <i className={`fa-solid ${vcaStatus === 'valid' ? 'fa-check' : vcaStatus === 'warning' ? 'fa-clock' : vcaStatus === 'expired' ? 'fa-xmark' : 'fa-question'}`}></i>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>{vcaStatus === 'valid' ? 'VCA Geldig' : vcaStatus === 'warning' ? 'VCA Bijna verlopen' : vcaStatus === 'expired' ? 'VCA Verlopen!' : 'Geen VCA ingevuld'}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{vcaDaysLeft !== null ? (vcaDaysLeft >= 0 ? `Nog ${vcaDaysLeft} dagen geldig` : `${Math.abs(vcaDaysLeft)} dagen geleden verlopen`) : 'Vul de verloopdatum in'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-list" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>VCA Type
                                    </label>
                                    <select value={zzpProfiel.vcaType} onChange={e => updateZzp('vcaType', e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fafafa', cursor: 'pointer' }}>
                                        <option value="VCA Basis">VCA Basis (B-VCA)</option>
                                        <option value="VCA VOL">VCA VOL</option>
                                        <option value="VIL-VCU">VIL-VCU</option>
                                    </select>
                                </div>
                                <Field label="Certificaatnummer" icon="fa-hashtag" field="vcaNummer" placeholder="VCA-2026-XXXX" obj={zzpProfiel} upd={updateZzp} />
                                <Field label="Verloopdatum" icon="fa-calendar-xmark" field="vcaVerloopdatum" type="date" obj={zzpProfiel} upd={updateZzp} />
                            </div>
                            
                            {/* VOG Verklaring (ZZP) */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-file-shield" style={{ marginRight: '6px', color: '#8b5cf6' }}></i>VOG (Goed Gedrag)
                                    </span>
                                    <div onClick={() => updateZzp('vogVerklaring', !zzpProfiel.vogVerklaring)}
                                        style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: zzpProfiel.vogVerklaring ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: zzpProfiel.vogVerklaring ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                    </div>
                                </div>
                                {zzpProfiel.vogVerklaring && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0 16px' }}>
                                        <Field label="Afgiftedatum" icon="fa-calendar-check" field="vogDatum" type="date" obj={zzpProfiel} upd={updateZzp} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ════════ ZZP VERZEKERINGEN ════════ */}
                    {profielType === 'zzp' && activeSection === 'verzekeringen' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-shield-halved" style={{ color: '#3b82f6' }}></i>
                                Verzekeringen
                            </h2>
                            {/* Aansprakelijkheidsverzekering */}
                            {[
                                { key: 'aansprakelijkheid', label: 'Bedrijfsaansprakelijkheidsverzekering (AVB)', numField: 'aansprakelijkheidNummer', datumField: 'aansprakelijkheidVerloopdatum' },
                                { key: 'cav', label: 'Constructie All Risk (CAR/CAV)', numField: 'cavNummer', datumField: 'cavVerloopdatum' },
                            ].map(verz => {
                                const st = verzekeringsStatus(zzpProfiel[verz.datumField]);
                                return (
                                    <div key={verz.key} style={{ marginBottom: '16px', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{verz.label}</span>
                                            <div onClick={() => updateZzp(verz.key, !zzpProfiel[verz.key])}
                                                style={{
                                                    width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
                                                    background: zzpProfiel[verz.key] ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s',
                                                    position: 'relative'
                                                }}>
                                                <div style={{
                                                    width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                                                    position: 'absolute', top: '3px', left: zzpProfiel[verz.key] ? '23px' : '3px',
                                                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                                }} />
                                            </div>
                                        </div>
                                        {zzpProfiel[verz.key] && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                                <Field label="Polisnummer" icon="fa-hashtag" field={verz.numField} placeholder="POL-2026-XXXX" obj={zzpProfiel} upd={updateZzp} />
                                                <div>
                                                    <Field label="Verloopdatum" icon="fa-calendar-xmark" field={verz.datumField} type="date" obj={zzpProfiel} upd={updateZzp} />
                                                    {st !== 'none' && (
                                                        <div style={{
                                                            fontSize: '0.72rem', fontWeight: 600, marginTop: '-8px',
                                                            color: st === 'valid' ? '#22c55e' : st === 'warning' ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            <i className={`fa-solid ${st === 'valid' ? 'fa-check-circle' : st === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}`} style={{ marginRight: '4px' }}></i>
                                                            {st === 'valid' ? 'Geldig' : st === 'warning' ? 'Bijna verlopen' : 'Verlopen!'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ════════ MODELOVEREENKOMSTEN (ZZP) ════════ */}
                    {profielType === 'zzp' && activeSection === 'modelovereenkomsten' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-file-signature" style={{ color: '#3b82f6' }}></i>
                                Modelovereenkomsten
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
                                Maak en beheer modelovereenkomsten voor je ZZP-opdrachten. Kies een type en genereer automatisch op basis van je profielgegevens.
                            </p>
                            {/* Genereer nieuwe overeenkomst */}
                            <div style={{ padding: '16px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))', border: '1px solid rgba(59,130,246,0.15)', marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                                    <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '6px', color: '#3b82f6' }}></i>Nieuwe overeenkomst genereren
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 12px' }}>
                                    Je ZZP-gegevens worden automatisch ingeladen. Klik om de contractgenerator te openen.
                                </p>
                                <button
                                    onClick={() => {
                                        // Sla eerst huidig profiel op zodat contractgenerator meest recente data heeft
                                        saveProfiel();
                                        // Navigeer naar WhatsApp module → Nieuw Modelovereenkomst tab
                                        router.push('/whatsapp?tab=nieuw_contract');
                                    }}
                                    style={{
                                        padding: '11px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff',
                                        fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                                        boxShadow: '0 4px 12px rgba(59,130,246,0.35)', transition: 'all 0.15s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <i className="fa-solid fa-file-circle-plus"></i>
                                    Nieuw Modelovereenkomst opstellen
                                    <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem' }}></i>
                                </button>
                            </div>
                            {/* Overzicht bestaande overeenkomsten */}
                            {(() => {
                                const overeenkomsten = zzpProfiel.modelovereenkomsten || [];
                                const actief = overeenkomsten.filter(o => o.status === 'actief').length;
                                return (
                                    <>
                                        {overeenkomsten.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{overeenkomsten.length}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Totaal</div>
                                                </div>
                                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>{actief}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Actief</div>
                                                </div>
                                                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{overeenkomsten.filter(o => o.status === 'concept').length}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Concept</div>
                                                </div>
                                            </div>
                                        )}
                                        {overeenkomsten.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', borderRadius: '10px', border: '2px dashed #e2e8f0', fontSize: '0.85rem' }}>
                                                <i className="fa-solid fa-file-circle-plus" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                                                Nog geen modelovereenkomsten aangemaakt.<br />Kies een type hierboven om te starten.
                                            </div>
                                        ) : overeenkomsten.map(o => {
                                            const statusColors = { concept: { bg: '#f59e0b', text: 'Concept' }, actief: { bg: '#22c55e', text: 'Actief' }, verlopen: { bg: '#ef4444', text: 'Verlopen' }, beeindigd: { bg: '#64748b', text: 'Beëindigd' } };
                                            const sc = statusColors[o.status] || statusColors.concept;
                                            return (
                                                <div key={o.id} style={{ marginBottom: '12px', padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                                                    {/* Header */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <i className="fa-solid fa-file-contract" style={{ color: '#3b82f6', fontSize: '1.1rem' }}></i>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{o.typeLabel}</div>
                                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>#{o.id}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: sc.bg, color: '#fff' }}>{sc.text}</span>
                                                            <button onClick={() => removeZzpListItem('modelovereenkomsten', o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}><i className="fa-solid fa-trash-can"></i></button>
                                                        </div>
                                                    </div>
                                                    {/* Partijen */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Opdrachtgever</label>
                                                            <input type="text" value={o.opdrachtgever} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'opdrachtgever', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Opdrachtnemer (ZZP)</label>
                                                            <input type="text" value={o.opdrachtnemer} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'opdrachtnemer', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>KVK Nummer</label>
                                                            <input type="text" value={o.kvkNummer} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'kvkNummer', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>BTW Nummer</label>
                                                            <input type="text" value={o.btwNummer} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'btwNummer', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                    </div>
                                                    {/* Looptijd & tarief */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Startdatum</label>
                                                            <input type="date" value={o.startDatum} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'startDatum', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Einddatum</label>
                                                            <input type="date" value={o.eindDatum} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'eindDatum', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Uurtarief (€)</label>
                                                            <input type="number" step="0.01" value={o.uurtarief} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'uurtarief', e.target.value)}
                                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                        </div>
                                                    </div>
                                                    {/* Omschrijving */}
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Omschrijving werkzaamheden</label>
                                                        <textarea value={o.omschrijving} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'omschrijving', e.target.value)}
                                                            placeholder="Beschrijf de aard van de werkzaamheden..." rows={2}
                                                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', resize: 'vertical', fontFamily: 'inherit' }} />
                                                    </div>
                                                    {/* Status & Ondertekening */}
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Status</label>
                                                            <select value={o.status} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'status', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', cursor: 'pointer', background: '#fafafa' }}>
                                                                <option value="concept">Concept</option>
                                                                <option value="actief">Actief</option>
                                                                <option value="verlopen">Verlopen</option>
                                                                <option value="beeindigd">Beëindigd</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>Getekend</span>
                                                            <div onClick={() => updateZzpListItem('modelovereenkomsten', o.id, 'getekend', !o.getekend)}
                                                                style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: o.getekend ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: o.getekend ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                                            </div>
                                                        </div>
                                                        {o.getekend && (
                                                            <div>
                                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Datum</label>
                                                                <input type="date" value={o.getekendDatum || ''} onChange={e => updateZzpListItem('modelovereenkomsten', o.id, 'getekendDatum', e.target.value)}
                                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* ════════ SPECIALITEITEN (SHARED) ════════ */}
                    {activeSection === 'specialiteiten' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-paint-roller" style={{ color: profielType === 'zzp' ? '#3b82f6' : '#F5850A' }}></i>
                                Specialiteiten
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
                                Selecteer je vaardigheden en specialismen als schilder.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                                {SPECIALITEITEN.map(spec => {
                                    const isActive = activeSpecs.includes(spec);
                                    const accent = profielType === 'zzp' ? '#3b82f6' : '#F5850A';
                                    return (
                                        <div key={spec} onClick={() => toggleSpec(spec)}
                                            style={{
                                                padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                background: isActive ? (profielType === 'zzp' ? 'rgba(59,130,246,0.08)' : 'rgba(245,133,10,0.08)') : '#fafafa',
                                                border: `2px solid ${isActive ? accent : '#e2e8f0'}`,
                                                transition: 'all 0.15s', fontSize: '0.82rem',
                                                fontWeight: isActive ? 700 : 500, color: isActive ? accent : '#64748b',
                                            }}>
                                            <i className={`fa-${isActive ? 'solid fa-check-circle' : 'regular fa-circle'}`} style={{ color: isActive ? accent : '#cbd5e1' }}></i>
                                            {spec}
                                        </div>
                                    );
                                })}
                            </div>
                            {activeSpecs.length > 0 && (
                                <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', marginBottom: '6px' }}>
                                        <i className="fa-solid fa-star" style={{ marginRight: '6px' }}></i>
                                        {activeSpecs.length} specialiteit{activeSpecs.length !== 1 ? 'en' : ''} geselecteerd
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {activeSpecs.map(s => (
                                            <span key={s} style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', background: profielType === 'zzp' ? '#3b82f6' : '#F5850A', color: '#fff', fontWeight: 600 }}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ WERKTIJDEN & VERLOF ════════ */}
                    {profielType === 'werknemer' && activeSection === 'werktijden' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-clock" style={{ color: '#F5850A' }}></i>
                                Werktijden & Verlof
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-business-time" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>Contracturen per week
                                    </label>
                                    <input type="number" step="0.5" value={profiel.contractUren || 37.5} onChange={e => update('contractUren', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fafafa' }} />
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fa-solid fa-calendar-minus" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>ADV-dagen per jaar
                                    </label>
                                    <input type="number" min="0" max="25" value={profiel.advDagen || 0} onChange={e => update('advDagen', parseInt(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fafafa' }} />
                                </div>
                            </div>
                            {/* Werkdagen */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-calendar-week" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>Werkdagen
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {WERKDAGEN.map(d => {
                                        const active = (profiel.werkdagen || []).includes(d); return (
                                            <button key={d} onClick={() => toggleWerkdag(d)} style={{ padding: '8px 14px', borderRadius: '8px', border: `2px solid ${active ? '#F5850A' : '#e2e8f0'}`, background: active ? 'rgba(245,133,10,0.08)' : '#fafafa', color: active ? '#F5850A' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>{d}</button>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Overwerk */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>Overwerkafspraken
                                </label>
                                <textarea value={profiel.overwerkAfspraken || ''} onChange={e => update('overwerkAfspraken', e.target.value)}
                                    placeholder="Afspraken m.b.t. overwerk, toeslagen, compensatie..." rows={2}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                            {/* Verlof */}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                                    <i className="fa-solid fa-umbrella-beach" style={{ marginRight: '6px', color: '#F5850A' }}></i>Vakantiedagen
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginBottom: '12px' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="fa-solid fa-calendar-days" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>Vakantiedagen per jaar
                                        </label>
                                        <input type="number" min="0" max="50" value={profiel.vakDagenJaar} onChange={e => update('vakDagenJaar', parseInt(e.target.value) || 0)}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fafafa' }} />
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="fa-solid fa-rotate-left" style={{ fontSize: '0.7rem', color: '#3b82f6' }}></i>Tegoed vorig jaar
                                        </label>
                                        <input type="number" min="0" max="50" value={profiel.vakDagenVorigJaar} onChange={e => update('vakDagenVorigJaar', parseInt(e.target.value) || 0)}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fafafa' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Totaal beschikbaar</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e' }}>{profiel.vakDagenJaar + profiel.vakDagenVorigJaar}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>dagen</div>
                                    </div>
                                    <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Totaal uren</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>{(profiel.vakDagenJaar + profiel.vakDagenVorigJaar) * 7.5}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>uur (7.5u/dag)</div>
                                    </div>
                                    <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(250,160,82,0.08), rgba(250,160,82,0.02))', border: '1px solid rgba(250,160,82,0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Meegenomen</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F5850A' }}>{profiel.vakDagenVorigJaar}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>van vorig jaar</div>
                                    </div>
                                </div>
                            </div>
                            {/* Verlofregeling */}
                            <div style={{ marginTop: '16px' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-file-lines" style={{ fontSize: '0.7rem', color: '#F5850A' }}></i>Verlofregelingen / Opmerkingen
                                </label>
                                <textarea value={profiel.verlofRegelingen || ''} onChange={e => update('verlofRegelingen', e.target.value)}
                                    placeholder="Bijv. bijzonder verlof, ouderschapsverlof, calamiteitenverlof..." rows={2}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                        </div>
                    )}

                    {/* ════════ FUNCTIONEREN & BEOORDELEN ════════ */}
                    {profielType === 'werknemer' && activeSection === 'functioneren' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-chart-line" style={{ color: '#F5850A' }}></i>
                                Functioneren & Beoordelen
                            </h2>
                            {/* Competenties */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'block' }}>
                                    <i className="fa-solid fa-star" style={{ marginRight: '6px', color: '#F5850A' }}></i>Competenties
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                                    {COMPETENTIES.map(c => {
                                        const active = (profiel.competenties || []).includes(c); return (
                                            <div key={c} onClick={() => toggleCompetentie(c)} style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: active ? 'rgba(245,133,10,0.08)' : '#fafafa', border: `2px solid ${active ? '#F5850A' : '#e2e8f0'}`, fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? '#F5850A' : '#64748b', transition: 'all 0.15s' }}>
                                                <i className={`fa-${active ? 'solid fa-check-circle' : 'regular fa-circle'}`} style={{ color: active ? '#F5850A' : '#cbd5e1', fontSize: '0.75rem' }}></i>{c}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Functioneringsgesprekken */}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-comments" style={{ marginRight: '6px', color: '#3b82f6' }}></i>Functioneringsgesprekken
                                    </span>
                                    <button onClick={() => addListItem('functioneringsGesprekken', { datum: '', beoordeling: 'Goed', notities: '' })} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                                        <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i>Gesprek toevoegen
                                    </button>
                                </div>
                                {(profiel.functioneringsGesprekken || []).length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', border: '2px dashed #e2e8f0', fontSize: '0.82rem' }}>Nog geen gesprekken vastgelegd</div>
                                ) : (profiel.functioneringsGesprekken || []).map(g => (
                                    <div key={g.id} style={{ marginBottom: '8px', padding: '12px 14px', borderRadius: '8px', background: '#fafafa', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                                            <input type="date" value={g.datum} onChange={e => updateListItem('functioneringsGesprekken', g.id, 'datum', e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                            <select value={g.beoordeling} onChange={e => updateListItem('functioneringsGesprekken', g.id, 'beoordeling', e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
                                                {['Uitstekend', 'Goed', 'Voldoende', 'Matig', 'Onvoldoende'].map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                            <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: g.beoordeling === 'Uitstekend' || g.beoordeling === 'Goed' ? '#22c55e' : g.beoordeling === 'Voldoende' ? '#facc15' : '#ef4444', color: g.beoordeling === 'Voldoende' ? '#1e293b' : '#fff' }}>{g.beoordeling}</span>
                                            <button onClick={() => removeListItem('functioneringsGesprekken', g.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}><i className="fa-solid fa-trash-can"></i></button>
                                        </div>
                                        <input type="text" value={g.notities} onChange={e => updateListItem('functioneringsGesprekken', g.id, 'notities', e.target.value)} placeholder="Notities / Samenvatting gesprek..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', background: '#fff' }} />
                                    </div>
                                ))}
                            </div>
                            {/* POP */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '14px', paddingTop: '14px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                    <i className="fa-solid fa-bullseye" style={{ marginRight: '6px', color: '#F5850A' }}></i>Persoonlijk Ontwikkelingsplan (POP)
                                </label>
                                <textarea value={profiel.persoonlijkOntwikkelingsplan || ''} onChange={e => update('persoonlijkOntwikkelingsplan', e.target.value)}
                                    placeholder="Doelen, ontwikkelpunten, afspraken..." rows={3}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                            {/* Bijzonderheden */}
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '14px', paddingTop: '14px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px', color: '#f59e0b' }}></i>Bijzonderheden / Berispingen
                                </label>
                                <textarea value={profiel.bijzonderhedenVertrouwelijk || ''} onChange={e => update('bijzonderhedenVertrouwelijk', e.target.value)}
                                    placeholder="Vertrouwelijke aantekeningen..." rows={2}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                        </div>
                    )}

                    {/* ════════ GEZONDHEID & VERZUIM ════════ */}
                    {profielType === 'werknemer' && activeSection === 'gezondheid' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-heart-pulse" style={{ color: '#F5850A' }}></i>
                                Gezondheid & Verzuim
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                                <Field label="Zorgverzekeraar" icon="fa-hospital" field="zorgverzekeraar" placeholder="CZ, VGZ, Zilveren Kruis..." obj={profiel} upd={update} />
                                <Field label="Polisnummer" icon="fa-hashtag" field="zorgPolisnummer" placeholder="ZV-2026-XXXX" obj={profiel} upd={update} />
                            </div>
                            {/* Medische keuring */}
                            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-stethoscope" style={{ color: '#F5850A' }}></i>Medische keuring uitgevoerd
                                    </span>
                                    <div onClick={() => update('medischeKeuring', !profiel.medischeKeuring)}
                                        style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: profiel.medischeKeuring ? '#22c55e' : '#cbd5e1', transition: 'background 0.2s', position: 'relative' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: profiel.medischeKeuring ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                    </div>
                                </div>
                                {profiel.medischeKeuring && (
                                    <div style={{ marginTop: '8px' }}>
                                        <Field label="Datum keuring" icon="fa-calendar-check" field="medischeKeuringDatum" type="date" obj={profiel} upd={update} />
                                    </div>
                                )}
                            </div>
                            {/* Ziekteverzuim log */}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        <i className="fa-solid fa-bed" style={{ marginRight: '6px', color: '#ef4444' }}></i>Ziekteverzuim log
                                    </span>
                                    <button onClick={() => addListItem('ziekteverzuimLog', { startDatum: '', eindDatum: '', reden: '', bedrijfsarts: false })} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }}>
                                        <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i>Melding toevoegen
                                    </button>
                                </div>
                                {(profiel.ziekteverzuimLog || []).length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', border: '2px dashed #e2e8f0', fontSize: '0.82rem' }}>Geen ziekteverzuim geregistreerd</div>
                                ) : (profiel.ziekteverzuimLog || []).map(z => (
                                    <div key={z.id} style={{ marginBottom: '8px', padding: '12px 14px', borderRadius: '8px', background: '#fafafa', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                            <input type="date" value={z.startDatum} onChange={e => updateListItem('ziekteverzuimLog', z.id, 'startDatum', e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>t/m</span>
                                            <input type="date" value={z.eindDatum} onChange={e => updateListItem('ziekteverzuimLog', z.id, 'eindDatum', e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff' }} />
                                            <div onClick={() => updateListItem('ziekteverzuimLog', z.id, 'bedrijfsarts', !z.bedrijfsarts)} style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: z.bedrijfsarts ? '#3b82f6' : '#e2e8f0', color: z.bedrijfsarts ? '#fff' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                                <i className="fa-solid fa-user-doctor" style={{ marginRight: '4px' }}></i>{z.bedrijfsarts ? 'Bedrijfsarts' : 'Geen arts'}
                                            </div>
                                            <button onClick={() => removeListItem('ziekteverzuimLog', z.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}><i className="fa-solid fa-trash-can"></i></button>
                                        </div>
                                        <input type="text" value={z.reden} onChange={e => updateListItem('ziekteverzuimLog', z.id, 'reden', e.target.value)} placeholder="Reden / Omschrijving..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', background: '#fff' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ════════ NOTITIES & AFSPRAKEN (SHARED) ════════ */}
                    {activeSection === 'notities' && (
                        <div className="panel" style={{ padding: '20px 24px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-note-sticky" style={{ color: profielType === 'zzp' ? '#3b82f6' : '#F5850A' }}></i>
                                Notities & Afspraken
                            </h2>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                    <i className="fa-solid fa-pen" style={{ marginRight: '6px', color: profielType === 'zzp' ? '#3b82f6' : '#F5850A' }}></i>
                                    Notities
                                </label>
                                <textarea value={activeProfiel.notities} onChange={e => activeUpdate('notities', e.target.value)}
                                    placeholder="Schrijf hier je notities, opmerkingen of bijzonderheden..."
                                    rows={6} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6' }} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                                        <i className="fa-solid fa-handshake" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
                                        Gemaakte afspraken
                                    </label>
                                    <button onClick={addAfspraak} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                                        <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i>
                                        Afspraak toevoegen
                                    </button>
                                </div>
                                {activeProfiel.afspraken.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', borderRadius: '10px', border: '2px dashed #e2e8f0' }}>
                                        <i className="fa-solid fa-calendar-plus" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                                        Nog geen afspraken. Klik op &quot;Afspraak toevoegen&quot; om te beginnen.
                                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                            💡 Geef je afspraak een datum en zet de <strong style={{color:'#3b82f6'}}>Radar aan</strong> voor automatische notificaties in het dashboard.
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeProfiel.afspraken.map(afspraak => (
                                            <div key={afspraak.id} style={{ padding: '12px 16px', borderRadius: '10px', background: '#fafafa', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', marginBottom: '6px' }}>
                                                        <input type="date" value={afspraak.datum} onChange={e => updateAfspraak(afspraak.id, 'datum', e.target.value)}
                                                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', background: '#fff' }} />
                                                        <input type="text" value={afspraak.onderwerp} onChange={e => updateAfspraak(afspraak.id, 'onderwerp', e.target.value)}
                                                            placeholder="Onderwerp (bijv: Loon overmaken, Factuur of Evaluatie)" style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', background: '#fff', fontWeight: 600 }} />
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', marginBottom: '6px' }}>
                                                        <input type="text" value={afspraak.notitie} onChange={e => updateAfspraak(afspraak.id, 'notitie', e.target.value)}
                                                            placeholder="Verdere toelichting of afspraakdetails..." style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', background: '#fff' }} />
                                                        <div onClick={() => updateAfspraak(afspraak.id, 'herinneringActief', afspraak.herinneringActief === false ? true : false)} 
                                                            style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: afspraak.herinneringActief !== false ? '#3b82f6' : '#e2e8f0', color: afspraak.herinneringActief !== false ? '#fff' : '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.15s' }}>
                                                            <i className={`fa-solid ${afspraak.herinneringActief !== false ? 'fa-bell' : 'fa-bell-slash'}`}></i> 
                                                            {afspraak.herinneringActief !== false ? 'Radar Aan' : 'Radar Uit'}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <i className="fa-solid fa-rotate" style={{ color: '#94a3b8', fontSize: '0.8rem' }}></i>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Herhaal:</span>
                                                        <input type="number" min="1" value={afspraak.herhaalAantal || 1} onChange={e => updateAfspraak(afspraak.id, 'herhaalAantal', parseInt(e.target.value) || 1)}
                                                            style={{ width: '50px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', background: '#fff', textAlign: 'center' }} />
                                                        <select value={afspraak.herhaalType || 'geen'} onChange={e => updateAfspraak(afspraak.id, 'herhaalType', e.target.value)}
                                                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', background: '#fff', cursor: 'pointer', width: '90px' }}>
                                                            <option value="geen">Niet</option>
                                                            <option value="dagen">Dagen</option>
                                                            <option value="weken">Weken</option>
                                                            <option value="maanden">Maanden</option>
                                                            <option value="jaren">Jaren</option>
                                                        </select>

                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginLeft: '8px' }}>Waarschuw:</span>
                                                        <select value={afspraak.waarschuwWie || 'iedereen'} onChange={e => updateAfspraak(afspraak.id, 'waarschuwWie', e.target.value)}
                                                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', background: '#fff', cursor: 'pointer', flex: 1 }}>
                                                            <option value="iedereen">Iedereen (Algemeen Dashboard)</option>
                                                            <option value="mijzelf">Alleen Mijzelf</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeAfspraak(afspraak.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', padding: '4px', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Opslaan */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                        {saved && (
                            <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-check-circle"></i> Opgeslagen!
                            </div>
                        )}
                        <button onClick={saveProfiel} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.88rem' }}>
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i>
                            Profiel Opslaan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
