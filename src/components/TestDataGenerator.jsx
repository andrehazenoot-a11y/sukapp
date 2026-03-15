'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';

function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export default function TestDataGenerator() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    if (user?.role !== 'Beheerder') return null;

    const generateTestingData = async () => {        
        setLoading(true);
        setStatus('Start testing...');
        
        const delay = ms => new Promise(res => setTimeout(res, ms));
        
        // Settings
        const year = new Date().getFullYear();
        const currentWeek = getISOWeekNumber(new Date());
        const weeks = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek];
        const PROJECTS = [
            { id: '1', name: 'Nieuwbouw Villa Wassenaar' },
            { id: '2', name: 'Onderhoud Rijtjeshuizen Leiden' },
            { id: '3', name: 'Renovatie Kantoorpand Den Haag' },
            { id: '4', name: 'Schilderwerk VVE De Branding' },
        ];

        try {
            setStatus("Lokale data en fotos opschonen...");
            await delay(500);
            
            // Verwijder alle oude schildersapp_ / wa_ keys om 5MB quota niet te overschrijden door oude base64 foto's
            const keysToKeep = ['schildersapp_user', 'schildersapp_language'];
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('schildersapp_') || key.startsWith('wa_')) && !keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            }

            setStatus('Beheerder simuleren (Jan Modaal)...');
            await delay(500);
            
            // Beheerder (1) does Materieel and Verfvoorraad updates
            const materieel = [
                { id: 'm1', name: 'Festool Schuurmachine', category: 'Elektrisch gereedschap', status: 'Gekeurd', user: 'Johannes', brand: 'Festool', inspectionDate: '2027-01-01', image: '', typecode: 'RO 150 FEQ' },
                { id: 'm2', name: 'Altrex Steiger 8m', category: 'Klimmaterieel', status: 'Afgekeurd', user: 'Nvt', brand: 'Altrex', inspectionDate: '2024-01-01', image: '', typecode: 'RS TOWER' }
            ];
            localStorage.setItem('schildersapp_materieel', JSON.stringify(materieel));

            const verf = [
                { id: 'v1', barcode: '871111111', rfid: 'TAG1X', naam: 'Sikkens Rubbol XD High Gloss', ral: '9010', base: 'W05', stock: 12, loc: 'Magazijn A1' },
                { id: 'v2', barcode: '872222222', rfid: 'TAG2X', naam: 'Sigma S2U Nova Satin', ral: '9001', base: 'Base L', stock: 5, loc: 'Bus 2 - Piet' }
            ];
            localStorage.setItem('schildersapp_verfvoorraad', JSON.stringify(verf));

            // Voorman simuleren (Henk de Vries) - User 4
            setStatus('Voorman/Uitvoerder simuleren (Henk de Vries)...');
            await delay(500);
            for (const week of weeks) {
                const urenObj = [
                    {
                        id: 'ph1_' + week, projectId: '1',
                        types: { normaal: ['8', '8', '8', '4', '8', '', ''] },
                        notes: { normaal: ['Start bouw', '', '', 'Naar groothandel', '', '', ''] }
                    },
                    {
                        id: 'ph2_' + week, projectId: '3',
                        types: { klusuren: ['0', '0', '0', '4', '0', '', ''] },
                        notes: { klusuren: ['','','','Onderhoudswerkzaamheden','','',''] },
                    }
                ];
                localStorage.setItem(`schildersapp_urv2_u4_w${week}_${year}`, JSON.stringify(urenObj));
                localStorage.setItem(`schildersapp_uren_status_u4_w${week}_${year}`, 'ingediend');
            }

            // Schilder simuleren (Piet Kwast) - User 2
            setStatus('Schilder simuleren (Piet Kwast)...');
            await delay(500);
            for (const week of weeks) {
                // He was sick on monday in week-2
                const isSick = week === weeks[1];
                const urenObj = [
                    {
                        id: 'ps1_' + week, projectId: '2',
                        types: {
                            normaal: isSick ? ['0','8','8','8','8','',''] : ['8','8','8','8','8','',''],
                            ziek: isSick ? ['1','','','','','',''] : [],
                            meerwerk: ['','','','','2','','']
                        },
                        notes: { 
                            normaal: ['','','','','','',''], 
                            meerwerk: ['','','','','Houtrot reparatie kozijn','',''],
                            ziek: isSick ? ['Griep','','','','','',''] : []
                        }
                    }
                ];
                localStorage.setItem(`schildersapp_urv2_u2_w${week}_${year}`, JSON.stringify(urenObj));
                // 3 of the 4 weeks are submitted and approved, last week is concept
                if (week !== currentWeek) {
                    localStorage.setItem(`schildersapp_uren_status_u2_w${week}_${year}`, 'goedgekeurd');
                } else {
                    localStorage.setItem(`schildersapp_uren_status_u2_w${week}_${year}`, 'concept');
                }

                // Genereer ook het feitelijke 'Meerwerk' formulier-data bestandje dat hiermee samenvalt
                const existingMw = JSON.parse(localStorage.getItem('schildersapp_meerwerk_2') || '[]');
                existingMw.push({
                    id: Date.now() + week,
                    omschrijving: `Houtrot reparatie (Test ${week})`,
                    uren: 2,
                    bedrag: 0,
                    toelichting: 'Extra kozijn rot gevonden.',
                    materiaal: 'Woodfill 2-komponenten',
                    datum: `${year}-03-${10 + week}`,
                    status: week === currentWeek ? 'aanvraag' : 'goedgekeurd',
                    akkoordDatum: week === currentWeek ? '' : '2026-03-01'
                });
                localStorage.setItem('schildersapp_meerwerk_2', JSON.stringify(existingMw));
            }

            // ZZP'er simuleren (Klaas Roller) - User 3
            setStatus('ZZP simulatie & AI Contract Genereatie (Klaas Roller)...');
            await delay(500);
            
            const contracts = [
                { id: 'cZZP_01', contractnummer: 'C-2026-001', zzpNaam: 'Klaas Roller Schilderwerken', opdrachtgever: 'DS Schilders', tarief: 45, status: 'Ondertekend', startDatum: '2026-02-01', urenInbegrepen: 100 }
            ];
            localStorage.setItem('wa_contracten', JSON.stringify(contracts));

            const contractUren = [];
            for (const week of weeks) {
                const dayTotal = week === weeks[2] ? 32 : 40; // Eén week was ie er minder
                contractUren.push({ weekNum: week, year, uren: dayTotal, typeId: 'normaal', savedAt: new Date().toISOString() });
                
                const urenObj = [{
                    id: 'pzzp1_' + week, projectId: 'cZZP_01', contractId: 'cZZP_01',
                    types: { normaal: ['8','8','8','8', (week===weeks[2] ? '0' : '8'), '',''] },
                    notes: { normaal: ['','','','','','',''] }
                }];
                localStorage.setItem(`schildersapp_urv2_u3_w${week}_${year}`, JSON.stringify(urenObj));
                localStorage.setItem(`schildersapp_uren_status_u3_w${week}_${year}`, 'ingediend');
            }
            localStorage.setItem('wa_contract_uren_cZZP_01', JSON.stringify(contractUren));

            setStatus('Afronden tests...');
            await delay(500);

            // Reload page to reflect all local storage changes
            window.location.reload();

        } catch (e) {
            console.error(e);
            alert('Kon testdata niet volledig genereren.');
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <div style={{ background: '#e0e7ff', border: '1px dashed #6366f1', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#4338ca', marginBottom: '8px', marginTop: 0 }}>
                <i className="fa-solid fa-flask" style={{ marginRight: '8px' }}></i>
                Automatische 1-Maand Omgevingstest
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#4f46e5', marginBottom: '14px', lineHeight: 1.5 }}>
                Deze module simuleert een volledige maand (4 weken) van interactie door fictieve personen: 
                <b> Klaas Roller (ZZP)</b>, <b>Piet Kwast (Schilder)</b>, en <b>Henk de Vries (Uitvoerder)</b>.
                Het test alle kernfuncties via script in plaats van via de UI (Urenregistratie, Contracten, Materieel, Verfvoorraad, Meerwerk).
            </p>
            <button 
                onClick={generateTestingData} 
                disabled={loading}
                style={{ 
                    padding: '8px 16px', borderRadius: '8px', border: 'none', 
                    background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' 
                }}
            >
                {loading ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>{status}</> : 'Test 1-Maand Uitvoeren & Inyecteren'}
            </button>
        </div>
    );
}
