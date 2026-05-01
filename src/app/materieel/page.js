'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthContext';

const LOCATIES = ['Magazijn', 'Bus 1', 'Bus 2', 'Bus 3', 'Project Den Haag', 'Project Leiden', 'Project Katwijk', 'Werkplaats'];

// == DEMO DATA ==
const INITIAL_ITEMS = [
    {
        id: '#312', naam: 'Bouwstofzuiger CLEANTEC', merk: 'Festool CTM 36', categorie: 'Stofzuiger', locatie: 'Bus 1', laatsteKeuring: '2023-01-12', vervaldatum: '2024-01-12', status: 'verlopen',
        inGebruikDoor: 'Piet Kwast', uitgifteDatum: '2025-02-24',
        reparaties: [
            { id: 1, datum: '2024-11-05', omschrijving: 'Motor maakt vreemd geluid', melder: 'Piet Kwast', status: 'afgerond', kosten: '€ 185,00', opgelosdDatum: '2024-11-12', oplossing: 'Koolborstels vervangen' },
        ],
        uitgifteLog: [
            { id: 1, type: 'uit', datum: '2025-01-10', medewerker: 'Henk de Vries', locatie: 'Project Den Haag', opmerking: '' },
            { id: 2, type: 'in', datum: '2025-02-20', medewerker: 'Henk de Vries', locatie: 'Magazijn', opmerking: 'Schoon retour' },
            { id: 3, type: 'uit', datum: '2025-02-24', medewerker: 'Piet Kwast', locatie: 'Bus 1', opmerking: 'Project Katwijk' },
        ]
    },
    {
        id: '#405', naam: 'Vlakschuurmachine', merk: 'Festool RTS 400 REQ', categorie: 'Schuurmachine', locatie: 'Magazijn', laatsteKeuring: '2024-02-05', vervaldatum: '2025-02-05', status: 'binnenkort', inGebruikDoor: '', uitgifteDatum: '', reparaties: [], uitgifteLog: [
            { id: 1, type: 'uit', datum: '2025-01-06', medewerker: 'Tom Bakker', locatie: 'Project Leiden', opmerking: '' },
            { id: 2, type: 'in', datum: '2025-02-28', medewerker: 'Tom Bakker', locatie: 'Magazijn', opmerking: '' },
        ]
    },
    {
        id: '#188', naam: 'Rolsteiger ASC 135', merk: 'Altrex / ASC', categorie: 'Steiger', locatie: 'Project Den Haag', laatsteKeuring: '2024-11-10', vervaldatum: '2025-11-10', status: 'goedgekeurd', inGebruikDoor: 'Henk de Vries', uitgifteDatum: '2025-02-15', reparaties: [], uitgifteLog: [
            { id: 1, type: 'uit', datum: '2025-02-15', medewerker: 'Henk de Vries', locatie: 'Project Den Haag', opmerking: 'Blok C buitengevel' },
        ]
    },
    {
        id: '#501', naam: 'Boormachine PBH 2100', merk: 'Bosch Professional', categorie: 'Boormachine', locatie: 'Bus 2', laatsteKeuring: '2024-06-15', vervaldatum: '2025-06-15', status: 'goedgekeurd',
        inGebruikDoor: 'Jan Modaal', uitgifteDatum: '2025-03-01',
        reparaties: [
            { id: 1, datum: '2025-01-20', omschrijving: 'Boorkop klemt vast', melder: 'Henk de Vries', status: 'in_behandeling', kosten: '', opgelosdDatum: '', oplossing: '' },
        ],
        uitgifteLog: [
            { id: 1, type: 'uit', datum: '2025-03-01', medewerker: 'Jan Modaal', locatie: 'Bus 2', opmerking: 'Project Katwijk' },
        ]
    },
    { id: '#220', naam: 'Hogedrukreiniger K5', merk: 'Kärcher K5 Premium', categorie: 'Reiniger', locatie: 'Magazijn', laatsteKeuring: '2023-09-01', vervaldatum: '2024-09-01', status: 'verlopen', inGebruikDoor: '', uitgifteDatum: '', reparaties: [], uitgifteLog: [] },
    {
        id: '#333', naam: 'Verfspuit Airless 395', merk: 'Graco Ultra Max II', categorie: 'Spuitapparatuur', locatie: 'Bus 1', laatsteKeuring: '2024-08-20', vervaldatum: '2025-08-20', status: 'goedgekeurd', inGebruikDoor: 'Piet Kwast', uitgifteDatum: '2025-02-28', reparaties: [], uitgifteLog: [
            { id: 1, type: 'uit', datum: '2025-02-28', medewerker: 'Piet Kwast', locatie: 'Bus 1', opmerking: 'Spuitwerk gevels' },
        ]
    },
    {
        id: '#415', naam: 'Decoupeerzaag PST 900', merk: 'Bosch Professional', categorie: 'Zaagmachine', locatie: 'Bus 3', laatsteKeuring: '2024-03-10', vervaldatum: '2025-03-10', status: 'binnenkort',
        inGebruikDoor: 'Bas Jansen', uitgifteDatum: '2025-03-03',
        reparaties: [
            { id: 1, datum: '2025-02-28', omschrijving: 'Zaagblad geleider verbogen', melder: 'Jan Modaal', status: 'wacht_onderdeel', kosten: '€ 45,00', opgelosdDatum: '', oplossing: '' },
        ],
        uitgifteLog: [
            { id: 1, type: 'uit', datum: '2025-03-03', medewerker: 'Bas Jansen', locatie: 'Bus 3', opmerking: '' },
        ]
    },
    { id: '#550', naam: 'Ladder Reform 3x10', merk: 'Altrex', categorie: 'Ladder', locatie: 'Magazijn', laatsteKeuring: '2024-10-02', vervaldatum: '2025-10-02', status: 'goedgekeurd', inGebruikDoor: '', uitgifteDatum: '', reparaties: [], uitgifteLog: [] },
];

const STATUS_MAP = {
    verlopen: { label: 'Verlopen', class: 'danger', icon: 'fa-circle-xmark' },
    binnenkort: { label: 'Binnenkort', class: 'warning', icon: 'fa-clock' },
    goedgekeurd: { label: 'Goedgekeurd', class: 'success', icon: 'fa-circle-check' },
};

const REPAIR_STATUS = {
    gemeld: { label: 'Gemeld', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    in_behandeling: { label: 'In behandeling', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    wacht_onderdeel: { label: 'Wacht op onderdeel', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
    afgerond: { label: 'Afgerond', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
};

const formatDate = (d) => { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}-${m}-${y}`; };

export default function MaterieelPage() {
    const [activeTab, setActiveTab] = useState('inventaris');
    const [items, setItems] = useState(() => {
        try { const s = localStorage.getItem('schildersapp_materieel'); if (s) return JSON.parse(s); } catch {}
        return INITIAL_ITEMS;
    });
    const saveItems = (updated) => { setItems(updated); try { localStorage.setItem('schildersapp_materieel', JSON.stringify(updated)); } catch {} };
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('alle');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showRepairModal, setShowRepairModal] = useState(false);
    const [showKeuringModal, setShowKeuringModal] = useState(false);
    const [showUitgifteModal, setShowUitgifteModal] = useState(false);
    const [repairForm, setRepairForm] = useState({ omschrijving: '', melder: '' });
    const [keuringForm, setKeuringForm] = useState({ datum: '', resultaat: 'goedgekeurd', opmerking: '' });
    const [uitgifteForm, setUitgifteForm] = useState({ medewerker: '', locatie: '', opmerking: '' });
    const [uitgifteSearch, setUitgifteSearch] = useState('');
    const [uitgifteFilter, setUitgifteFilter] = useState('alle');
    const [snelPakItem, setSnelPakItem] = useState('');
    const [snelPakLocatie, setSnelPakLocatie] = useState('');
    const [snelPakMedewerker, setSnelPakMedewerker] = useState('');
    const [snelMeldItem, setSnelMeldItem] = useState('');
    const [snelMeldProbleem, setSnelMeldProbleem] = useState('');
    const [snelPakZoek, setSnelPakZoek] = useState('');
    const [snelPakOpen, setSnelPakOpen] = useState(false);
    const [snelMeldZoek, setSnelMeldZoek] = useState('');
    const [snelMeldOpen, setSnelMeldOpen] = useState(false);

    const { user, getAllUsers } = useAuth();
    const currentUser = user?.name || '';
    const MEDEWERKERS = getAllUsers().map(u => u.name);
    const mijnItems = items.filter(i => i.inGebruikDoor === currentUser);
    const beschikbareItems = items.filter(i => !i.inGebruikDoor);

    // Snel pakken: checkout voor gekozen medewerker
    const quickCheckout = () => {
        if (!snelPakItem || !snelPakLocatie) return;
        const wie = snelPakMedewerker || currentUser;
        const today = new Date().toISOString().split('T')[0];
        const updated = items.map(i => {
            if (i.id === snelPakItem) {
                return {
                    ...i, inGebruikDoor: wie, uitgifteDatum: today, locatie: snelPakLocatie,
                    uitgifteLog: [...i.uitgifteLog, { id: Date.now(), type: 'uit', datum: today, medewerker: wie, locatie: snelPakLocatie, opmerking: 'Snel pakken' }]
                };
            }
            return i;
        });
        saveItems(updated);
        setSnelPakItem('');
        setSnelPakLocatie('');
        setSnelPakMedewerker('');
    };

    // Snel retour voor eigen gereedschap
    const quickReturn = (itemId) => {
        const today = new Date().toISOString().split('T')[0];
        const updated = items.map(i => {
            if (i.id === itemId) {
                return {
                    ...i, inGebruikDoor: '', uitgifteDatum: '', locatie: 'Magazijn',
                    uitgifteLog: [...i.uitgifteLog, { id: Date.now(), type: 'in', datum: today, medewerker: currentUser, locatie: 'Magazijn', opmerking: 'Snel retour' }]
                };
            }
            return i;
        });
        saveItems(updated);
    };

    // Snel reparatie melden
    const quickRepair = () => {
        if (!snelMeldItem || !snelMeldProbleem) return;
        const today = new Date().toISOString().split('T')[0];
        const updated = items.map(i => {
            if (i.id === snelMeldItem) {
                return {
                    ...i, reparaties: [...i.reparaties, {
                        id: Date.now(), datum: today, omschrijving: snelMeldProbleem,
                        melder: currentUser, status: 'gemeld', kosten: '', opgelosdDatum: '', oplossing: ''
                    }]
                };
            }
            return i;
        });
        saveItems(updated);
        setSnelMeldItem('');
        setSnelMeldProbleem('');
    };

    // Gereedschap aanvragen bij iemand anders
    const [aanvraagBevestiging, setAanvraagBevestiging] = useState('');
    const requestItem = (item) => {
        if (!item.inGebruikDoor || item.inGebruikDoor === currentUser) return;
        const melding = {
            id: Date.now(),
            type: 'gereedschap_aanvraag',
            van: currentUser,
            aan: item.inGebruikDoor,
            itemId: item.id,
            itemNaam: item.naam,
            datum: new Date().toISOString(),
            gelezen: false,
            bericht: `${currentUser} wil graag ${item.naam} (${item.id}) gebruiken. Kun je dit terugbrengen?`
        };
        const bestaande = JSON.parse(localStorage.getItem('schildersapp_meldingen') || '[]');
        bestaande.unshift(melding);
        localStorage.setItem('schildersapp_meldingen', JSON.stringify(bestaande));
        setAanvraagBevestiging(`Aanvraag verstuurd naar ${item.inGebruikDoor} voor ${item.naam}!`);
        setTimeout(() => setAanvraagBevestiging(''), 4000);
    };

    // Filters
    const filtered = items.filter(i => {
        const matchText = !filter || i.id.toLowerCase().includes(filter.toLowerCase()) || i.naam.toLowerCase().includes(filter.toLowerCase()) || i.merk.toLowerCase().includes(filter.toLowerCase());
        const matchStatus = statusFilter === 'alle' || i.status === statusFilter;
        return matchText && matchStatus;
    });

    // Statistieken
    const stats = {
        totaal: items.length,
        goedgekeurd: items.filter(i => i.status === 'goedgekeurd').length,
        binnenkort: items.filter(i => i.status === 'binnenkort').length,
        verlopen: items.filter(i => i.status === 'verlopen').length,
        openReparaties: items.reduce((sum, i) => sum + i.reparaties.filter(r => r.status !== 'afgerond').length, 0),
        uitgegeven: items.filter(i => i.inGebruikDoor).length,
        beschikbaar: items.filter(i => !i.inGebruikDoor).length,
    };

    // Alle reparaties flat
    const allRepairs = items.flatMap(i => i.reparaties.map(r => ({ ...r, apparaatId: i.id, apparaatNaam: i.naam })));

    // Reparatie toevoegen
    const addRepair = () => {
        if (!selectedItem || !repairForm.omschrijving) return;
        const updated = items.map(i => {
            if (i.id === selectedItem.id) {
                return {
                    ...i, reparaties: [...i.reparaties, {
                        id: Date.now(), datum: new Date().toISOString().split('T')[0],
                        omschrijving: repairForm.omschrijving, melder: repairForm.melder || 'Onbekend',
                        status: 'gemeld', kosten: '', opgelosdDatum: '', oplossing: ''
                    }]
                };
            }
            return i;
        });
        saveItems(updated);
        setRepairForm({ omschrijving: '', melder: '' });
        setShowRepairModal(false);
        setSelectedItem(updated.find(i => i.id === selectedItem.id));
    };

    // Reparatie status updaten
    const updateRepairStatus = (itemId, repairId, newStatus) => {
        const updated = items.map(i => {
            if (i.id === itemId) {
                return {
                    ...i, reparaties: i.reparaties.map(r =>
                        r.id === repairId ? { ...r, status: newStatus, opgelosdDatum: newStatus === 'afgerond' ? new Date().toISOString().split('T')[0] : r.opgelosdDatum } : r
                    )
                };
            }
            return i;
        });
        saveItems(updated);
        if (selectedItem?.id === itemId) setSelectedItem(updated.find(i => i.id === itemId));
    };

    // Keuring registreren
    const registerKeuring = () => {
        if (!selectedItem || !keuringForm.datum) return;
        const verval = new Date(keuringForm.datum);
        verval.setFullYear(verval.getFullYear() + 1);
        const updated = items.map(i => {
            if (i.id === selectedItem.id) {
                return { ...i, laatsteKeuring: keuringForm.datum, vervaldatum: verval.toISOString().split('T')[0], status: keuringForm.resultaat };
            }
            return i;
        });
        saveItems(updated);
        setShowKeuringModal(false);
        setKeuringForm({ datum: '', resultaat: 'goedgekeurd', opmerking: '' });
        setSelectedItem(updated.find(i => i.id === selectedItem.id));
    };

    const cardStyle = (active) => ({
        padding: '16px 20px', borderRadius: '12px', cursor: 'pointer',
        border: active ? '2px solid var(--accent)' : '1px solid var(--border-color)',
        background: active ? 'rgba(250,160,82,0.05)' : '#fff',
        transition: 'all 0.15s', flex: 1, minWidth: '130px'
    });

    // Gereedschap uitgeven
    const checkoutItem = () => {
        if (!selectedItem || !uitgifteForm.medewerker || !uitgifteForm.locatie) return;
        const today = new Date().toISOString().split('T')[0];
        const updated = items.map(i => {
            if (i.id === selectedItem.id) {
                return {
                    ...i, inGebruikDoor: uitgifteForm.medewerker, uitgifteDatum: today, locatie: uitgifteForm.locatie,
                    uitgifteLog: [...i.uitgifteLog, { id: Date.now(), type: 'uit', datum: today, medewerker: uitgifteForm.medewerker, locatie: uitgifteForm.locatie, opmerking: uitgifteForm.opmerking }]
                };
            }
            return i;
        });
        saveItems(updated);
        setShowUitgifteModal(false);
        setUitgifteForm({ medewerker: '', locatie: '', opmerking: '' });
        setSelectedItem(updated.find(i => i.id === selectedItem.id));
    };

    // Gereedschap retour
    const returnItem = (itemId) => {
        const updated = items.map(i => {
            if (i.id === itemId) {
                const today = new Date().toISOString().split('T')[0];
                return {
                    ...i, inGebruikDoor: '', uitgifteDatum: '', locatie: 'Magazijn',
                    uitgifteLog: [...i.uitgifteLog, { id: Date.now(), type: 'in', datum: today, medewerker: i.inGebruikDoor, locatie: 'Magazijn', opmerking: 'Retour' }]
                };
            }
            return i;
        });
        saveItems(updated);
        if (selectedItem?.id === itemId) setSelectedItem(updated.find(i => i.id === itemId));
    };

    return (
        <div className="content-area">
            <div className="page-header-bar">
                <div>
                    <h1><i className="fa-solid fa-toolbox" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>Gereedschapbeheer</h1>
                    <p>Overzicht van alle NEN 3140 SafetyPAT keuringsdata, reparaties en gereedschap.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                        <i className="fa-solid fa-file-export"></i> Exporteer
                    </button>
                    <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                        <i className="fa-solid fa-cloud-arrow-up"></i> Importeer SafetyPAT Data
                    </button>
                </div>
            </div>

            {/* == STATISTIEKEN == */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={cardStyle(statusFilter === 'alle')} onClick={() => setStatusFilter('alle')}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>{stats.totaal}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Totaal Apparaten</div>
                </div>
                <div style={cardStyle(statusFilter === 'goedgekeurd')} onClick={() => setStatusFilter('goedgekeurd')}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>{stats.goedgekeurd}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}><i className="fa-solid fa-circle-check" style={{ color: '#22c55e', marginRight: '4px' }}></i>Goedgekeurd</div>
                </div>
                <div style={cardStyle(statusFilter === 'binnenkort')} onClick={() => setStatusFilter('binnenkort')}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{stats.binnenkort}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}><i className="fa-solid fa-clock" style={{ color: '#f59e0b', marginRight: '4px' }}></i>Binnenkort</div>
                </div>
                <div style={cardStyle(statusFilter === 'verlopen')} onClick={() => setStatusFilter('verlopen')}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{stats.verlopen}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}><i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', marginRight: '4px' }}></i>Verlopen</div>
                </div>
                <div style={{ ...cardStyle(false), borderLeft: '3px solid #8b5cf6' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>{stats.openReparaties}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}><i className="fa-solid fa-wrench" style={{ color: '#8b5cf6', marginRight: '4px' }}></i>Open Reparaties</div>
                </div>
                <div style={{ ...cardStyle(false), borderLeft: '3px solid #0ea5e9' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0ea5e9' }}>{stats.uitgegeven}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}><i className="fa-solid fa-arrow-right-from-bracket" style={{ color: '#0ea5e9', marginRight: '4px' }}></i>Uitgegeven</div>
                </div>
                <div style={{ ...cardStyle(false), borderLeft: '3px solid #10b981' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{stats.beschikbaar}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}><i className="fa-solid fa-box-open" style={{ color: '#10b981', marginRight: '4px' }}></i>Beschikbaar</div>
                </div>
            </div>

            {/* == TABS == */}
            <div className="tab-nav">
                <button className={`tab-btn${activeTab === 'inventaris' ? ' active' : ''}`} onClick={() => { setActiveTab('inventaris'); setSelectedItem(null); }}>
                    <i className="fa-solid fa-list"></i>Inventaris
                </button>
                <button className={`tab-btn${activeTab === 'uitgifte' ? ' active' : ''}`} onClick={() => { setActiveTab('uitgifte'); setSelectedItem(null); }}>
                    <i className="fa-solid fa-right-left"></i>Uitgifte & Locatie
                    {stats.uitgegeven > 0 && <span className="tab-badge">{stats.uitgegeven}</span>}
                </button>
                <button className={`tab-btn${activeTab === 'reparaties' ? ' active' : ''}`} onClick={() => { setActiveTab('reparaties'); setSelectedItem(null); }}>
                    <i className="fa-solid fa-wrench"></i>Reparaties
                    {stats.openReparaties > 0 && <span className="tab-badge">{stats.openReparaties}</span>}
                </button>
            </div>

            {/* ======= INVENTARIS TAB ======= */}
            {activeTab === 'inventaris' && !selectedItem && (
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.02rem' }}>Inventarislijst ({filtered.length})</h3>
                        <div className="search-bar" style={{ width: '280px', margin: 0 }}>
                            <i className="fa-solid fa-search"></i>
                            <input type="text" placeholder="Zoek op ID, naam of merk..." value={filter} onChange={e => setFilter(e.target.value)}
                                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }} />
                        </div>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th><th>Omschrijving</th><th>Merk & Type</th><th>Categorie</th><th>Locatie</th><th>Laatste Keuring</th><th>Vervaldatum</th><th>Status</th><th>Rep.</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => {
                                const st = STATUS_MAP[item.status];
                                const openReps = item.reparaties.filter(r => r.status !== 'afgerond').length;
                                return (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
                                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{item.id}</td>
                                        <td><strong>{item.naam}</strong></td>
                                        <td>{item.merk}</td>
                                        <td><span style={{ fontSize: '1rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(0,0,0,0.04)', color: '#64748b' }}>{item.categorie}</span></td>
                                        <td style={{ fontSize: '0.9rem', color: '#64748b' }}>{item.locatie}</td>
                                        <td>{formatDate(item.laatsteKeuring)}</td>
                                        <td>{formatDate(item.vervaldatum)}</td>
                                        <td><span className={`status-badge ${st.class}`}><i className={`fa-solid ${st.icon}`} style={{ marginRight: '4px' }}></i>{st.label}</span></td>
                                        <td>{openReps > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '1rem', color: '#8b5cf6', fontWeight: 600 }}><i className="fa-solid fa-wrench"></i>{openReps}</span>}</td>
                                        <td><i className="fa-solid fa-chevron-right" style={{ color: '#94a3b8', fontSize: '1rem' }}></i></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ======= DETAIL VIEW ======= */}
            {selectedItem && activeTab === 'inventaris' && (
                <div>
                    {/* Terug knop */}
                    <button onClick={() => setSelectedItem(null)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)',
                        fontSize: '1.02rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: 0
                    }}>
                        <i className="fa-solid fa-arrow-left"></i> Terug naar overzicht
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Apparaat info */}
                        <div className="panel" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}><i className="fa-solid fa-toolbox" style={{ color: 'var(--accent)', marginRight: '8px' }}></i>{selectedItem.naam}</h3>
                                <span className={`status-badge ${STATUS_MAP[selectedItem.status].class}`}>
                                    <i className={`fa-solid ${STATUS_MAP[selectedItem.status].icon}`} style={{ marginRight: '4px' }}></i>
                                    {STATUS_MAP[selectedItem.status].label}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    ['Apparaat ID', selectedItem.id],
                                    ['Merk & Type', selectedItem.merk],
                                    ['Categorie', selectedItem.categorie],
                                    ['Locatie', selectedItem.locatie],
                                    ['Laatste Keuring', formatDate(selectedItem.laatsteKeuring)],
                                    ['Vervaldatum', formatDate(selectedItem.vervaldatum)],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '1.02rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                                        <div style={{ fontSize: '1.02rem', fontWeight: 600, color: '#1e293b' }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => { setKeuringForm({ datum: new Date().toISOString().split('T')[0], resultaat: 'goedgekeurd', opmerking: '' }); setShowKeuringModal(true); }}>
                                    <i className="fa-solid fa-clipboard-check" style={{ marginRight: '4px' }}></i> Keuring Registreren
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', color: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={() => setShowRepairModal(true)}>
                                    <i className="fa-solid fa-wrench" style={{ marginRight: '4px' }}></i> Reparatie Melden
                                </button>
                            </div>
                        </div>

                        {/* Reparaties voor dit apparaat */}
                        <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}><i className="fa-solid fa-wrench" style={{ color: '#8b5cf6', marginRight: '6px' }}></i>Reparatiehistorie</h3>
                                <span style={{ fontSize: '1rem', color: '#94a3b8' }}>{selectedItem.reparaties.length} meldingen</span>
                            </div>
                            {selectedItem.reparaties.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                    <i className="fa-solid fa-check-circle" style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}></i>
                                    <p style={{ margin: 0, fontSize: '1rem' }}>Geen reparaties gemeld</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {selectedItem.reparaties.map(r => {
                                        const rs = REPAIR_STATUS[r.status];
                                        return (
                                            <div key={r.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <strong style={{ fontSize: '1rem' }}>{r.omschrijving}</strong>
                                                    <span style={{ fontSize: '0.9rem', padding: '2px 10px', borderRadius: '20px', background: rs.bg, color: rs.color, fontWeight: 600 }}>{rs.label}</span>
                                                </div>
                                                <div style={{ fontSize: '1rem', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                                                    <span><i className="fa-solid fa-calendar" style={{ marginRight: '3px' }}></i>{formatDate(r.datum)}</span>
                                                    <span><i className="fa-solid fa-user" style={{ marginRight: '3px' }}></i>{r.melder}</span>
                                                    {r.kosten && <span><i className="fa-solid fa-euro-sign" style={{ marginRight: '3px' }}></i>{r.kosten}</span>}
                                                </div>
                                                {r.oplossing && <div style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '4px' }}><i className="fa-solid fa-check" style={{ marginRight: '3px' }}></i>{r.oplossing}</div>}
                                                {r.status !== 'afgerond' && (
                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                                        {r.status !== 'in_behandeling' && <button onClick={() => updateRepairStatus(selectedItem.id, r.id, 'in_behandeling')} style={{ fontSize: '1.02rem', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', cursor: 'pointer', fontWeight: 600 }}>In behandeling</button>}
                                                        {r.status !== 'wacht_onderdeel' && <button onClick={() => updateRepairStatus(selectedItem.id, r.id, 'wacht_onderdeel')} style={{ fontSize: '1.02rem', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600 }}>Wacht onderdeel</button>}
                                                        <button onClick={() => updateRepairStatus(selectedItem.id, r.id, 'afgerond')} style={{ fontSize: '1.02rem', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}>✓ Afgerond</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ======= REPARATIES TAB ======= */}
            {activeTab === 'reparaties' && (
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, fontSize: '1.02rem' }}>Alle Reparatiemeldingen ({allRepairs.length})</h3>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr><th>Datum</th><th>Apparaat</th><th>Omschrijving</th><th>Gemeld door</th><th>Status</th><th>Kosten</th><th>Actie</th></tr>
                        </thead>
                        <tbody>
                            {allRepairs.sort((a, b) => b.datum.localeCompare(a.datum)).map(r => {
                                const rs = REPAIR_STATUS[r.status];
                                return (
                                    <tr key={`${r.apparaatId}-${r.id}`}>
                                        <td>{formatDate(r.datum)}</td>
                                        <td><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.apparaatId}</span> {r.apparaatNaam}</td>
                                        <td>{r.omschrijving}</td>
                                        <td>{r.melder}</td>
                                        <td><span style={{ fontSize: '1rem', padding: '3px 10px', borderRadius: '20px', background: rs.bg, color: rs.color, fontWeight: 600 }}>{rs.label}</span></td>
                                        <td>{r.kosten || '—'}</td>
                                        <td>
                                            {r.status !== 'afgerond' ? (
                                                <select
                                                    value={r.status}
                                                    onChange={e => updateRepairStatus(r.apparaatId, r.id, e.target.value)}
                                                    style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', background: '#fff' }}
                                                >
                                                    <option value="gemeld">Gemeld</option>
                                                    <option value="in_behandeling">In behandeling</option>
                                                    <option value="wacht_onderdeel">Wacht onderdeel</option>
                                                    <option value="afgerond">Afgerond</option>
                                                </select>
                                            ) : (
                                                <span style={{ fontSize: '0.78rem', color: '#22c55e' }}><i className="fa-solid fa-check"></i> Klaar</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {allRepairs.length === 0 && (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Geen reparatiemeldingen</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ======= MODALS ======= */}

            {/* Reparatie Melden Modal */}
            {showRepairModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowRepairModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '440px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-wrench" style={{ color: '#8b5cf6' }}></i> Reparatie Melden
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>
                            Voor: <strong>{selectedItem?.naam}</strong> ({selectedItem?.id})
                        </p>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Wat is het probleem?</label>
                            <textarea value={repairForm.omschrijving} onChange={e => setRepairForm({ ...repairForm, omschrijving: e.target.value })}
                                placeholder="Beschrijf het defect of probleem..."
                                style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gemeld door</label>
                            <input type="text" value={repairForm.melder} onChange={e => setRepairForm({ ...repairForm, melder: e.target.value })}
                                placeholder="Jouw naam" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowRepairModal(false)} style={{ padding: '8px 16px' }}>Annuleren</button>
                            <button className="btn btn-primary" onClick={addRepair} disabled={!repairForm.omschrijving} style={{ padding: '8px 16px', background: '#8b5cf6' }}>
                                <i className="fa-solid fa-paper-plane" style={{ marginRight: '4px' }}></i> Melding Indienen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keuring Registreren Modal */}
            {/* ======= UITGIFTE TAB ======= */}
            {activeTab === 'uitgifte' && (
                <div>
                    {/* === SNEL PAKKEN + MIJN GEREEDSCHAP === */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                        {/* Snel Pakken */}
                        <div className="panel" style={{ padding: '18px', borderLeft: '4px solid #0ea5e9' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-bolt" style={{ color: '#0ea5e9' }}></i> Snel Pakken
                                <span style={{ fontSize: '1.02rem', fontWeight: 400, color: '#94a3b8' }}>— als {currentUser}</span>
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: 2, minWidth: '140px', position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>Welk gereedschap?</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" placeholder="🔍 Typ om te zoeken..." value={snelPakItem ? `${snelPakItem} — ${beschikbareItems.find(i => i.id === snelPakItem)?.naam || ''}` : snelPakZoek}
                                            onChange={e => { setSnelPakZoek(e.target.value); setSnelPakItem(''); setSnelPakOpen(true); }}
                                            onFocus={() => setSnelPakOpen(true)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                                        {snelPakItem && <button onClick={() => { setSnelPakItem(''); setSnelPakZoek(''); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.02rem' }}>✕</button>}
                                    </div>
                                    {snelPakOpen && !snelPakItem && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '160px', overflowY: 'auto', marginTop: '2px' }}>
                                            {beschikbareItems.filter(i => !snelPakZoek || i.naam.toLowerCase().includes(snelPakZoek.toLowerCase()) || i.id.toLowerCase().includes(snelPakZoek.toLowerCase()) || i.merk.toLowerCase().includes(snelPakZoek.toLowerCase())).map(i => (
                                                <div key={i.id} onClick={() => { setSnelPakItem(i.id); setSnelPakZoek(''); setSnelPakOpen(false); }}
                                                    style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '1.02rem', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.06)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <span><strong style={{ color: 'var(--accent)' }}>{i.id}</strong> {i.naam}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '1.02rem' }}>{i.merk}</span>
                                                </div>
                                            ))}
                                            {beschikbareItems.filter(i => !snelPakZoek || i.naam.toLowerCase().includes(snelPakZoek.toLowerCase()) || i.id.toLowerCase().includes(snelPakZoek.toLowerCase()) || i.merk.toLowerCase().includes(snelPakZoek.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '1.02rem', textAlign: 'center' }}>Geen resultaten</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>Voor wie?</label>
                                    <select value={snelPakMedewerker} onChange={e => setSnelPakMedewerker(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                                        <option value="">Mijzelf ({currentUser})</option>
                                        {MEDEWERKERS.filter(m => m !== currentUser).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1, minWidth: '100px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>Waar naartoe?</label>
                                    <select value={snelPakLocatie} onChange={e => setSnelPakLocatie(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }}>
                                        <option value="">Locatie...</option>
                                        {LOCATIES.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <button onClick={quickCheckout} disabled={!snelPakItem || !snelPakLocatie}
                                    style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: snelPakItem && snelPakLocatie ? '#0ea5e9' : '#e2e8f0', color: snelPakItem && snelPakLocatie ? '#fff' : '#94a3b8', cursor: snelPakItem && snelPakLocatie ? 'pointer' : 'default', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                    <i className="fa-solid fa-hand" style={{ marginRight: '4px' }}></i> Ik pak dit
                                </button>
                            </div>
                        </div>

                        {/* Mijn Gereedschap */}
                        <div className="panel" style={{ padding: '18px', borderLeft: '4px solid var(--accent)' }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-user-gear" style={{ color: 'var(--accent)' }}></i> Mijn Gereedschap
                                <span style={{ fontSize: '1.02rem', fontWeight: 600, color: '#94a3b8', background: 'rgba(0,0,0,0.04)', padding: '1px 8px', borderRadius: '10px' }}>{mijnItems.length}</span>
                            </h3>
                            {mijnItems.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '12px 0' }}>
                                    <i className="fa-solid fa-box-open" style={{ marginRight: '6px' }}></i>Je hebt geen gereedschap in gebruik
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {mijnItems.map(i => (
                                        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                                            <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem', minWidth: '36px' }}>{i.id}</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600, flex: 1 }}>{i.naam}</span>
                                            <span style={{ fontSize: '1.02rem', color: '#94a3b8' }}><i className="fa-solid fa-location-dot" style={{ marginRight: '2px' }}></i>{i.locatie}</span>
                                            <button onClick={() => quickReturn(i.id)} style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)', color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                                                <i className="fa-solid fa-rotate-left" style={{ marginRight: '3px' }}></i>Retour
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Snel Melden */}
                        <div className="panel" style={{ padding: '18px', borderLeft: '4px solid #ef4444' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i> Snel Melden
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>Welk apparaat?</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" placeholder="🔍 Typ om te zoeken..." value={snelMeldItem ? `${snelMeldItem} — ${items.find(i => i.id === snelMeldItem)?.naam || ''}` : snelMeldZoek}
                                            onChange={e => { setSnelMeldZoek(e.target.value); setSnelMeldItem(''); setSnelMeldOpen(true); }}
                                            onFocus={() => setSnelMeldOpen(true)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                                        {snelMeldItem && <button onClick={() => { setSnelMeldItem(''); setSnelMeldZoek(''); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.02rem' }}>✕</button>}
                                    </div>
                                    {snelMeldOpen && !snelMeldItem && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '160px', overflowY: 'auto', marginTop: '2px' }}>
                                            {items.filter(i => !snelMeldZoek || i.naam.toLowerCase().includes(snelMeldZoek.toLowerCase()) || i.id.toLowerCase().includes(snelMeldZoek.toLowerCase()) || i.merk.toLowerCase().includes(snelMeldZoek.toLowerCase())).map(i => (
                                                <div key={i.id} onClick={() => { setSnelMeldItem(i.id); setSnelMeldZoek(''); setSnelMeldOpen(false); }}
                                                    style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '1.02rem', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <span><strong style={{ color: 'var(--accent)' }}>{i.id}</strong> {i.naam}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '1.02rem' }}>{i.inGebruikDoor || 'Beschikbaar'}</span>
                                                </div>
                                            ))}
                                            {items.filter(i => !snelMeldZoek || i.naam.toLowerCase().includes(snelMeldZoek.toLowerCase()) || i.id.toLowerCase().includes(snelMeldZoek.toLowerCase()) || i.merk.toLowerCase().includes(snelMeldZoek.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '1.02rem', textAlign: 'center' }}>Geen resultaten</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>Wat is kapot?</label>
                                    <input type="text" value={snelMeldProbleem} onChange={e => setSnelMeldProbleem(e.target.value)}
                                        placeholder="Bijv. snoer kapot, maakt geluid..."
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                                </div>
                                <button onClick={quickRepair} disabled={!snelMeldItem || !snelMeldProbleem}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: snelMeldItem && snelMeldProbleem ? '#ef4444' : '#e2e8f0', color: snelMeldItem && snelMeldProbleem ? '#fff' : '#94a3b8', cursor: snelMeldItem && snelMeldProbleem ? 'pointer' : 'default', fontWeight: 700, fontSize: '0.9rem', alignSelf: 'flex-start' }}>
                                    <i className="fa-solid fa-paper-plane" style={{ marginRight: '4px' }}></i> Defect Melden
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bevestiging banner */}
                    {aanvraagBevestiging && (
                        <div style={{ padding: '12px 18px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 600, fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-circle-check"></i> {aanvraagBevestiging}
                        </div>
                    )}

                    {/* Per medewerker overzicht */}
                    <div className="panel" style={{ padding: '20px', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.02rem' }}><i className="fa-solid fa-users" style={{ color: 'var(--accent)', marginRight: '6px' }}></i>Per Medewerker</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                            {MEDEWERKERS.map(m => {
                                const mItems = items.filter(i => i.inGebruikDoor === m);
                                if (mItems.length === 0) return null;
                                return (
                                    <div key={m} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(14,165,233,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>{m.split(' ').map(n => n[0]).join('')}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>{m}</div>
                                                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{mItems.length} item(s)</div>
                                            </div>
                                        </div>
                                        {mItems.map(i => (
                                            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', fontSize: '1.02rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                                <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: '36px' }}>{i.id}</span>
                                                <span style={{ flex: 1 }}>{i.naam}</span>
                                                <span style={{ fontSize: '1.02rem', color: '#94a3b8' }}>{i.locatie}</span>
                                                <a href={`https://wa.me/?text=${encodeURIComponent(`Hoi ${m.split(' ')[0]}, mag ik de ${i.naam} (${i.id}) even gebruiken? Die staat nu bij ${i.locatie}. Groet, ${currentUser}`)}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '6px', border: 'none', background: '#25d366', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                                    <i className="fa-brands fa-whatsapp"></i> Vraag
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Wie heeft wat */}
                    <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.02rem' }}><i className="fa-solid fa-map-marker-alt" style={{ color: '#0ea5e9', marginRight: '6px' }}></i>Gereedschap Locaties & Gebruik</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {[['alle', 'Alles'], ['uitgegeven', 'Uitgegeven'], ['beschikbaar', 'Beschikbaar']].map(([key, label]) => (
                                        <button key={key} onClick={() => setUitgifteFilter(key)} style={{
                                            padding: '4px 12px', borderRadius: '6px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                                            border: uitgifteFilter === key ? '1px solid #0ea5e9' : '1px solid var(--border-color)',
                                            background: uitgifteFilter === key ? 'rgba(14,165,233,0.08)' : 'transparent',
                                            color: uitgifteFilter === key ? '#0ea5e9' : '#64748b'
                                        }}>{label}</button>
                                    ))}
                                </div>
                                <div className="search-bar" style={{ width: '280px', margin: 0 }}>
                                    <i className="fa-solid fa-search"></i>
                                    <input type="text" placeholder="Zoek gereedschap, medewerker of locatie..." value={uitgifteSearch} onChange={e => setUitgifteSearch(e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }} />
                                </div>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr><th>ID</th><th>Gereedschap</th><th>Locatie</th><th>In gebruik door</th><th>Sinds</th><th>Status</th><th>Actie</th></tr>
                            </thead>
                            <tbody>
                                {items.filter(i => {
                                    const q = uitgifteSearch.toLowerCase();
                                    const matchSearch = !q || i.naam.toLowerCase().includes(q) || i.merk.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.locatie.toLowerCase().includes(q) || (i.inGebruikDoor && i.inGebruikDoor.toLowerCase().includes(q));
                                    const matchFilter = uitgifteFilter === 'alle' || (uitgifteFilter === 'uitgegeven' && i.inGebruikDoor) || (uitgifteFilter === 'beschikbaar' && !i.inGebruikDoor);
                                    return matchSearch && matchFilter;
                                }).map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{item.id}</td>
                                        <td><strong>{item.naam}</strong><div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{item.merk}</div></td>
                                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}><i className="fa-solid fa-location-dot" style={{ color: '#0ea5e9', fontSize: '1.02rem' }}></i>{item.locatie}</span></td>
                                        <td>{item.inGebruikDoor ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}>{item.inGebruikDoor.split(' ').map(n => n[0]).join('')}</span>
                                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{item.inGebruikDoor}</span>
                                            </span>
                                        ) : <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>— Beschikbaar</span>}</td>
                                        <td style={{ fontSize: '0.9rem', color: '#64748b' }}>{item.uitgifteDatum ? formatDate(item.uitgifteDatum) : '—'}</td>
                                        <td>{item.inGebruikDoor ?
                                            <span style={{ fontSize: '1rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', fontWeight: 600 }}><i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '3px' }}></i>Uitgegeven</span>
                                            : <span style={{ fontSize: '1rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 600 }}><i className="fa-solid fa-box-open" style={{ marginRight: '3px' }}></i>Op voorraad</span>
                                        }</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {item.inGebruikDoor ? (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => returnItem(item.id)} style={{ fontSize: '1rem', padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
                                                        <i className="fa-solid fa-rotate-left" style={{ marginRight: '3px' }}></i>Retour
                                                    </button>
                                                    {item.inGebruikDoor !== currentUser && (
                                                        <button onClick={() => requestItem(item)} style={{ fontSize: '1rem', padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', cursor: 'pointer', fontWeight: 600 }}>
                                                            <i className="fa-solid fa-bell" style={{ marginRight: '3px' }}></i>Aanvragen
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button onClick={() => { setSelectedItem(item); setShowUitgifteModal(true); }} style={{ fontSize: '1rem', padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.06)', color: '#0ea5e9', cursor: 'pointer', fontWeight: 600 }}>
                                                    <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '3px' }}></i>Uitgeven
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            )}

            {/* ======= MODALS ======= */}

            {/* Uitgifte Modal */}
            {showUitgifteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowUitgifteModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '440px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-arrow-right-from-bracket" style={{ color: '#0ea5e9' }}></i> Gereedschap Uitgeven
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>
                            {selectedItem?.naam} ({selectedItem?.id})
                        </p>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Aan wie?</label>
                            <select value={uitgifteForm.medewerker} onChange={e => setUitgifteForm({ ...uitgifteForm, medewerker: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}>
                                <option value="">Selecteer medewerker...</option>
                                {MEDEWERKERS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Locatie / Bestemming</label>
                            <select value={uitgifteForm.locatie} onChange={e => setUitgifteForm({ ...uitgifteForm, locatie: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}>
                                <option value="">Selecteer locatie...</option>
                                {LOCATIES.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Opmerking (optioneel)</label>
                            <input type="text" value={uitgifteForm.opmerking} onChange={e => setUitgifteForm({ ...uitgifteForm, opmerking: e.target.value })}
                                placeholder="Bijv. project of reden" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowUitgifteModal(false)} style={{ padding: '8px 16px' }}>Annuleren</button>
                            <button className="btn btn-primary" onClick={checkoutItem} disabled={!uitgifteForm.medewerker || !uitgifteForm.locatie} style={{ padding: '8px 16px', background: '#0ea5e9' }}>
                                <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i> Uitgeven
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {
                showKeuringModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowKeuringModal(false)}>
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '440px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-clipboard-check" style={{ color: 'var(--accent)' }}></i> Keuring Registreren
                            </h3>
                            <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>
                                Voor: <strong>{selectedItem?.naam}</strong> ({selectedItem?.id})
                            </p>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Keuringsdatum</label>
                                <input type="date" value={keuringForm.datum} onChange={e => setKeuringForm({ ...keuringForm, datum: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Resultaat</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['goedgekeurd', 'binnenkort', 'verlopen'].map(r => (
                                        <button key={r} onClick={() => setKeuringForm({ ...keuringForm, resultaat: r })}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                                                border: keuringForm.resultaat === r ? `2px solid ${STATUS_MAP[r].class === 'success' ? '#22c55e' : STATUS_MAP[r].class === 'warning' ? '#f59e0b' : '#ef4444'}` : '1px solid var(--border-color)',
                                                background: keuringForm.resultaat === r ? (STATUS_MAP[r].class === 'success' ? 'rgba(34,197,94,0.05)' : STATUS_MAP[r].class === 'warning' ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)') : '#fff',
                                                fontSize: '0.9rem', fontWeight: 600, textAlign: 'center',
                                                color: STATUS_MAP[r].class === 'success' ? '#22c55e' : STATUS_MAP[r].class === 'warning' ? '#f59e0b' : '#ef4444'
                                            }}>
                                            <i className={`fa-solid ${STATUS_MAP[r].icon}`} style={{ marginRight: '4px' }}></i>{STATUS_MAP[r].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '1.02rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Opmerking (optioneel)</label>
                                <textarea value={keuringForm.opmerking} onChange={e => setKeuringForm({ ...keuringForm, opmerking: e.target.value })}
                                    placeholder="Eventuele opmerkingen..." style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setShowKeuringModal(false)} style={{ padding: '8px 16px' }}>Annuleren</button>
                                <button className="btn btn-primary" onClick={registerKeuring} disabled={!keuringForm.datum} style={{ padding: '8px 16px' }}>
                                    <i className="fa-solid fa-clipboard-check" style={{ marginRight: '4px' }}></i> Keuring Opslaan
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
