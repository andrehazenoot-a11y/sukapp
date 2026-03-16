'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthContext';
import dynamic from 'next/dynamic';
import ProjectGantt from '../../../components/ProjectGantt';


// ===== PLANNING HELPERS =====
function pFormatDate(d) { if (!d) return ''; const dd = new Date(d + 'T00:00:00'); return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`; }
function pParseDate(s) { return new Date(s + 'T00:00:00'); }
function pAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function pDiffDays(a, b) { return Math.round((b - a) / 86400000); }
function pIsWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
function pIsToday(d, today) { return d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate(); }
const P_MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
const P_HOLIDAYS = {'2026-01-01':1,'2026-04-03':1,'2026-04-05':1,'2026-04-06':1,'2026-04-27':1,'2026-05-05':1,'2026-05-14':1,'2026-05-24':1,'2026-05-25':1,'2026-12-25':1,'2026-12-26':1};
const CELL_W = 28;

const INITIAL_PROJECTS = [
    { id: 1, name: 'Nieuwbouw Villa Wassenaar', client: 'Fam. Jansen', phone: '0612345678', address: 'Duinweg 42, Wassenaar', startDate: '2026-03-02', endDate: '2026-04-17', estimatedHours: 320, hourlyRate: 55, color: '#3b82f6', status: 'active', tasks: [{ id: 't1', name: 'Buitenschilderwerk kozijnen', startDate: '2026-03-02', endDate: '2026-03-13', assignedTo: [2, 4], completed: true }, { id: 't2', name: 'Binnenschilderwerk begane grond', startDate: '2026-03-16', endDate: '2026-03-27', assignedTo: [2], completed: false }, { id: 't3', name: 'Binnenschilderwerk verdieping', startDate: '2026-03-30', endDate: '2026-04-10', assignedTo: [3, 4], completed: false }, { id: 't4', name: 'Oplevering & correcties', startDate: '2026-04-13', endDate: '2026-04-17', assignedTo: [2, 3, 4], completed: false }] },
    { id: 2, name: 'Onderhoud Rijtjeshuizen Leiden', client: 'Woonstichting Leiden', phone: '0715678901', address: 'Rapenburg 100, Leiden', startDate: '2026-03-09', endDate: '2026-05-08', estimatedHours: 480, hourlyRate: 55, color: '#10b981', status: 'active', tasks: [{ id: 't5', name: 'Houtrot reparatie blok 1-3', startDate: '2026-03-09', endDate: '2026-03-27', assignedTo: [4], completed: false }, { id: 't6', name: 'Grondverf aanbrengen', startDate: '2026-03-30', endDate: '2026-04-10', assignedTo: [2, 3], completed: false }, { id: 't7', name: 'Aflakken buitenwerk', startDate: '2026-04-13', endDate: '2026-05-01', assignedTo: [2, 3, 4], completed: false }, { id: 't8', name: 'Eindcontrole', startDate: '2026-05-04', endDate: '2026-05-08', assignedTo: [4], completed: false }] },
    { id: 3, name: 'Kantoorpand Voorschoten', client: 'Bakker BV', phone: '0687654321', address: 'Industrieweg 8, Voorschoten', startDate: '2026-04-20', endDate: '2026-05-22', estimatedHours: 200, hourlyRate: 60, color: '#8b5cf6', status: 'planning', tasks: [{ id: 't9', name: 'Voorbereiding & schuren', startDate: '2026-04-20', endDate: '2026-04-24', assignedTo: [3], completed: false }, { id: 't10', name: 'Latex muren binnenzijde', startDate: '2026-04-27', endDate: '2026-05-08', assignedTo: [2, 3], completed: false }, { id: 't11', name: 'Kozijnen buiten', startDate: '2026-05-11', endDate: '2026-05-22', assignedTo: [2, 4], completed: false }] },
    { id: 4, name: 'Woonhuis Den Haag', client: 'Fam. de Groot', phone: '0698765432', address: 'Laan van Meerdervoort 200, Den Haag', startDate: '2026-05-18', endDate: '2026-06-12', estimatedHours: 160, hourlyRate: 55, color: '#f59e0b', status: 'planning', tasks: [{ id: 't12', name: 'Binnenschilderwerk', startDate: '2026-05-18', endDate: '2026-06-05', assignedTo: [3], completed: false }, { id: 't13', name: 'Buitenschilderwerk', startDate: '2026-06-08', endDate: '2026-06-12', assignedTo: [2, 3], completed: false }] },
];

const STATUS_CONFIG = {
    active:    { label: 'Actief',       bg: '#dcfce7', color: '#16a34a', icon: 'fa-play' },
    planning:  { label: 'In Planning',  bg: '#dbeafe', color: '#2563eb', icon: 'fa-clock' },
    completed: { label: 'Afgerond',     bg: '#f1f5f9', color: '#475569', icon: 'fa-check' },
    paused:    { label: 'Gepauzeerd',   bg: '#fef9c3', color: '#ca8a04', icon: 'fa-pause' },
};

const NOTE_TYPES = {
    info:     { label: 'Info',     color: '#3b82f6', bg: '#eff6ff', icon: 'fa-circle-info' },
    actie:    { label: 'Actie',    color: '#f59e0b', bg: '#fffbeb', icon: 'fa-bolt' },
    probleem: { label: 'Probleem', color: '#ef4444', bg: '#fef2f2', icon: 'fa-triangle-exclamation' },
    klant:    { label: 'Klant',    color: '#10b981', bg: '#f0fdf4', icon: 'fa-user' },
    planning: { label: 'Planning', color: '#8b5cf6', bg: '#f5f3ff', icon: 'fa-calendar-days' },
};

const DEMO_NOTES = [
    { id: 1, text: 'Klant wil matte afwerking op alle binnenmuren. RAL 9010 als basiskleur bevestigd.', author: 'Jan Modaal', date: '2026-03-10', type: 'klant' },
    { id: 2, text: 'Materiaallijst doorgestuurd naar inkoop. Extra schuurpapier (K80/K120) besteld.', author: 'Jan Modaal', date: '2026-03-11', type: 'actie' },
    { id: 3, text: 'Houtrot gevonden aan voorzijde kozijn. Klant geïnformeerd, meerwerk offerte volgt.', author: 'Henk de Vries', date: '2026-03-12', type: 'probleem' },
];

const DEMO_TERMIJNEN = [
    { id: 1, omschrijving: 'Aanbetaling bij opdracht', bedrag: 4000, betaald: true,  datum: '2026-03-01', vervaldatum: '2026-03-15', betaaldatum: '2026-03-10', percentage: 25, factuurNr: 'F-2026-001' },
    { id: 2, omschrijving: 'Termijn 1 — helft werk gereed', bedrag: 6000, betaald: false, datum: '2026-03-28', vervaldatum: '2026-04-11', betaaldatum: '', percentage: 37, factuurNr: 'F-2026-002' },
    { id: 3, omschrijving: 'Eindafrekening na oplevering', bedrag: 6600, betaald: false, datum: '2026-04-18', vervaldatum: '2026-05-02', betaaldatum: '', percentage: 38, factuurNr: 'F-2026-003' },
];

const TAAK_TEMPLATES = [
    {
        naam: '🏗️ Werkvoorbereiding',
        kleur: '#3b82f6',
        taken: [
            'Situatie / ondergrond ter plaatse beoordelen',
            'Houtrot & schadecheck uitvoeren',
            'Kleurkaarten / RAL-codes bevestigen bij klant',
            'Toegang en sleutels regelen',
            'Parkeervergunning aanvragen (indien nodig)',
            'Steiger of hoogwerker bestellen',
        ],
    },
    {
        naam: '🪣 Materiaal & Materieel',
        kleur: '#10b981',
        taken: [
            'Verfbenodigdheden controleren & bestellen',
            'Gereedschap controleren (kwasten, rollen, spuitapparaat)',
            'Afplakmateriaal & beschermfolie controleren',
            'Ladders & trapmateriaal inspecteren op veiligheid',
            'Busje tanken en controleren (banden, olie, water)',
            'Werkkleding / PBM controleren',
        ],
    },
    {
        naam: '📅 Planning & Administratie',
        kleur: '#8b5cf6',
        taken: [
            'Weekplanning opstellen en uitsturen naar team',
            'Werkbonnen klaarmaken',
            'Openstaande offertes nabellen (ouder dan 1 week)',
            'Openstaande facturen controleren',
            'Urenregistratie vorige week controleren',
        ],
    },
    {
        naam: '👥 Personeel',
        kleur: '#f59e0b',
        taken: [
            'Medewerkers inplannen per project',
            'Briefing geven aan team (maandagochtend)',
            'Verlof / ziekmelding verwerken',
            'ZZP’ers bevestigen indien nodig',
        ],
    },
    {
        naam: '📞 Klantcontact',
        kleur: '#ef4444',
        taken: [
            'Klant informeren over startdatum & aankomsttijd',
            'Verwachtingen en bijzonderheden doornemen',
            'Voortgang lopende projecten doormelden aan klant',
        ],
    },
    {
        naam: '🛠️ Uitvoering & Oplevering',
        kleur: '#F5850A',
        taken: [
            'Ondergrond beoordelen & reinigen',
            'Houtrot repareren en stoppen',
            'Schuren (K80 → K120 → K220)',
            'Grondverf aanbrengen',
            'Tussenlaag aanbrengen',
            'Aflakken / eindlaag aanbrengen',
            'Afplakken verwijderen & eindcontrole',
            'Oplevering met klant doorlopen',
            'Correcties na oplevering verwerken',
        ],
    },
];

function formatDate(s) {
    if (!s) return '';
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CircleProgress({ pct, color, size = 80 }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
    );
}

// ===== EML (email) parser =====
function decodeTransfer(text, encoding) {
    const enc = (encoding || '').toLowerCase().trim();
    if (enc === 'base64') { try { return atob(text.replace(/[\r\n\s]/g, '')); } catch { return text; } }
    if (enc === 'quoted-printable') {
        return text.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }
    return text;
}
function parseEml(rawText) {
    const normalised = rawText.replace(/\r\n/g, '\n');
    const splitIdx = normalised.indexOf('\n\n');
    const headerRaw = splitIdx > -1 ? normalised.slice(0, splitIdx) : normalised;
    const bodyRaw   = splitIdx > -1 ? normalised.slice(splitIdx + 2) : '';
    // unfold multi-line headers
    const unfolded = headerRaw.replace(/\n[ \t]+/g, ' ');
    const headers = {};
    unfolded.split('\n').forEach(line => {
        const c = line.indexOf(':');
        if (c > 0) headers[line.slice(0, c).toLowerCase().trim()] = line.slice(c + 1).trim();
    });
    const ct = headers['content-type'] || 'text/plain';
    const enc = headers['content-transfer-encoding'] || '7bit';
    let bodyHtml = '', bodyIsHtml = false;
    if (ct.toLowerCase().includes('multipart/')) {
        const bm = ct.match(/boundary=["']?([^"';\s]+)["']?/i);
        if (bm) {
            const boundary = '--' + bm[1];
            const parts = bodyRaw.split(new RegExp('\\n?' + boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(--)?(\\n)?'));
            let plainFallback = '';
            for (const part of parts) {
                const pi = part.indexOf('\n\n');
                if (pi < 0) continue;
                const pHead = part.slice(0, pi).replace(/\n[ \t]+/g, ' ');
                const pBody = part.slice(pi + 2);
                const pCt   = (pHead.match(/content-type:\s*([^;\n]+)/i) || [])[1] || '';
                const pEnc  = (pHead.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '7bit';
                if (pCt.toLowerCase().includes('text/html') && !bodyHtml) {
                    bodyHtml = decodeTransfer(pBody, pEnc); bodyIsHtml = true;
                } else if (pCt.toLowerCase().includes('text/plain') && !plainFallback) {
                    plainFallback = decodeTransfer(pBody, pEnc);
                }
            }
            if (!bodyHtml) { bodyHtml = plainFallback; bodyIsHtml = false; }
        }
    } else if (ct.includes('text/html')) {
        bodyHtml = decodeTransfer(bodyRaw, enc); bodyIsHtml = true;
    } else {
        bodyHtml = decodeTransfer(bodyRaw, enc); bodyIsHtml = false;
    }
    return {
        from: headers['from'] || '', to: headers['to'] || '',
        cc: headers['cc'] || '', subject: headers['subject'] || '(geen onderwerp)',
        date: headers['date'] || '', bodyHtml, bodyIsHtml,
    };
}

export default function ProjectDossierPage() {
    const { id } = useParams();
    const router = useRouter();
    const { getAllUsers, user } = useAuth();
    const allUsers = getAllUsers();
    const [project, setProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [activeTab, setActiveTab] = useState('overzicht');
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('info');
    const [notifyUserId, setNotifyUserId] = useState('');
    const [termijnen, setTermijnen] = useState(DEMO_TERMIJNEN);
    const [offerteBedrag, setOfferteBedrag] = useState('');
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '' });
    const [ganttCurrentDate, setGanttCurrentDate] = useState(() => new Date());
    const [savedFeedback, setSavedFeedback] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [editingPlanName, setEditingPlanName] = useState('');
    const dblClickRef = useRef({ t: 0, id: null }); // voor dubbelklik detectie op balken

    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [photoFilter, setPhotoFilter] = useState('alle');
    const fileInputRef = useRef(null);
    const [editingClient, setEditingClient] = useState(false);
    const [editForm, setEditForm] = useState({});
    // Offerte state
    const [offertePosten, setOffertePosten] = useState([]);
    const [offerteStatus, setOfferteStatus] = useState('concept'); // concept, verzonden, geaccepteerd, afgewezen
    const [offerteDatum, setOfferteDatum] = useState(new Date().toISOString().split('T')[0]);
    const [offerteGeldig, setOfferteGeldig] = useState(30);
    const [offerteNotes, setOfferteNotes] = useState('');
    const [showOfferteEdit, setShowOfferteEdit] = useState(false);
    const [expandedTemplates, setExpandedTemplates] = useState({});
    const toggleTemplate = (idx) => setExpandedTemplates(prev => ({ ...prev, [idx]: !prev[idx] }));
    const [openAttachTask, setOpenAttachTask] = useState(null);
    const [showAddTermijn, setShowAddTermijn] = useState(false);
    const [newTermijn, setNewTermijn] = useState({ omschrijving: '', bedrag: '', percentage: '', datum: '', vervaldatum: '', factuurNr: '' });
    const [editTermijnId, setEditTermijnId] = useState(null);
    const [scanStatus, setScanStatus] = useState(null); // null | 'scanning' | 'confirm' | 'error'
    const [scanResult, setScanResult] = useState([]); // gevonden termijnen
    const [scanRawText, setScanRawText] = useState('');
    const scanInputRef = useRef(null);

    // ── Meerdere e-mailcontacten per project ──
    const [emailContacten, setEmailContacten] = useState(() => {
        try {
            const s = localStorage.getItem(`schildersapp_emailcontacten_${id}`);
            if (s) return JSON.parse(s);
            // migreer bestaand project.email als startpunt
            return [];
        } catch { return []; }
    });
    const [newEmailContact, setNewEmailContact] = useState({ naam: '', email: '', telefoon: '', label: 'Opdrachtgever' });
    const [showAddEmailContact, setShowAddEmailContact] = useState(false);
    // E-mail picker voor meerwerk
    const [meerwerkEmailPicker, setMeerwerkEmailPicker] = useState(null); // meerwerk-item waarvoor picker open is
    const [meerwerkSelectie, setMeerwerkSelectie] = useState([]); // geselecteerde item-IDs voor bulk mail
    const [meerwerkCompose, setMeerwerkCompose] = useState(null); // { items[], contact } → opstelmodal
    const [composeOntwerp, setComposeOntwerp] = useState('');
    const [composeBericht, setComposeBericht] = useState('');
    const [composeVanNaam, setComposeVanNaam] = useState('De Schilders uit Katwijk');
    const [composeCC, setComposeCC] = useState('');
    const [composeBCC, setComposeBCC] = useState(() => {
        try { return localStorage.getItem('schildersapp_default_bcc') || ''; } catch { return ''; }
    });



    const saveEmailContacten = (updated) => {
        setEmailContacten(updated);
        localStorage.setItem(`schildersapp_emailcontacten_${id}`, JSON.stringify(updated));
    };
    const addEmailContact = () => {
        if (!newEmailContact.naam || !newEmailContact.email) return;
        // Voorkom dubbele email-adressen
        if (emailContacten.some(c => c.email.toLowerCase() === newEmailContact.email.toLowerCase())) {
            alert(`Dit e-mailadres (${newEmailContact.email}) is al toegevoegd.`);
            return;
        }
        saveEmailContacten([...emailContacten, { ...newEmailContact, id: Date.now() }]);
        setNewEmailContact({ naam: '', email: '', telefoon: '', label: 'Opdrachtgever' });
        setShowAddEmailContact(false);
    };
    const removeEmailContact = (ecId) => saveEmailContacten(emailContacten.filter(c => c.id !== ecId));

    // Gecombineerde lijst: contacten + project.email als fallback
    const allEmailTargets = [
        ...emailContacten,
        ...(project?.email && !emailContacten.some(c => c.email === project?.email)
            ? [{ id: 'project-email', naam: project?.client || 'Klant', email: project?.email, label: 'Hoofd' }]
            : []),
    ];


    // ── Termijnenstaat tekst-parser ──
    const parseTermijnText = (text) => {
        const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
        const found = [];

        // Herkende patronen (NL-formaat)
        const amountRe  = /[€Ee]\s*([0-9][0-9.]*[,.]?[0-9]{0,2})/g;
        const dateRe    = /(\d{1,2})[\-\/\.\s](\d{1,2})[\-\/\.\s](\d{2,4})/g;
        const factuurRe = /([A-Z]{1,3}[-_]?\d{4}[-_]?\d{1,4})/g;
        const pctRe     = /(\d{1,3})\s*%/g;

        // Groepeer regels in blokken (regels die een bedrag bevatten)
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const amounts = [...line.matchAll(amountRe)];
            if (amounts.length > 0) {
                // Neem context: deze regel + 1 voor en 1 na
                const ctx = [lines[i-1] || '', line, lines[i+1] || ''].join(' ');

                // Bedrag
                const rawAmt = amounts[0][1].replace(/\./g, '').replace(',', '.');
                const bedrag = parseFloat(rawAmt) || 0;

                // Datum (eerste die gevonden wordt)
                const dates = [...ctx.matchAll(dateRe)];
                let datum = '';
                if (dates.length > 0) {
                    const [,d,m,y] = dates[0];
                    const year = y.length === 2 ? '20' + y : y;
                    datum = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                }

                // Factuurnummer
                const factMatches = [...ctx.matchAll(factuurRe)];
                const factuurNr = factMatches.length > 0 ? factMatches[0][1] : '';

                // Percentage
                const pctMatches = [...ctx.matchAll(pctRe)];
                const percentage = pctMatches.length > 0 ? parseInt(pctMatches[0][1]) : 0;

                // Omschrijving: neem de langste niet-bedrag tekst
                const descLine = (lines[i-1] || line)
                    .replace(amountRe, '')
                    .replace(dateRe, '')
                    .replace(factuurRe, '')
                    .replace(pctRe, '')
                    .replace(/[€%,\.]/g, ' ')
                    .trim();
                const omschrijving = descLine.length > 4 ? descLine : line.replace(amountRe, '').trim();

                if (bedrag > 0) {
                    found.push({
                        id: Date.now() + i,
                        omschrijving: omschrijving || `Termijn ${found.length + 1}`,
                        bedrag,
                        percentage,
                        datum,
                        vervaldatum: '',
                        betaaldatum: '',
                        factuurNr,
                        betaald: false,
                    });
                }
            }
            i++;
        }
        return found;
    };

    const scanTermijnDoc = async (file) => {
        if (!file) return;
        setScanStatus('scanning');
        setScanRawText('');
        setScanResult([]);
        try {
            let rawText = '';
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

            if (isPdf) {
                // PDF: gebruik PDF.js CDN om tekst te extraheren
                const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const tc = await page.getTextContent();
                    rawText += tc.items.map(item => item.str).join(' ') + '\n';
                }
            } else {
                // Foto/scan: Tesseract OCR
                const Tesseract = (await import('tesseract.js')).default;
                const dataUrl = await new Promise(res => {
                    const r = new FileReader();
                    r.onload = e => res(e.target.result);
                    r.readAsDataURL(file);
                });
                const result = await Tesseract.recognize(dataUrl, 'nld+eng');
                rawText = result.data.text;
            }

            setScanRawText(rawText);
            const parsed = parseTermijnText(rawText);
            setScanResult(parsed);
            setScanStatus(parsed.length > 0 ? 'confirm' : 'error');
        } catch (err) {
            console.error('Scan fout:', err);
            setScanStatus('error');
        }
    };

    const importScanResult = () => {
        const updated = [...termijnen, ...scanResult.map((t,i) => ({ ...t, id: Date.now() + i }))];
        setTermijnen(updated);
        localStorage.setItem(`schildersapp_termijnen_${id}`, JSON.stringify(updated));
        setScanStatus(null);
        setScanResult([]);
    };

    const handleFileUpload = (taskId, files) => {
        const fileArr = Array.from(files);
        let loaded = 0;
        const results = [];
        const checkDone = () => {
            loaded++;
            if (loaded === fileArr.length) {
                const updated = {
                    ...project,
                    tasks: project.tasks.map(t => t.id === taskId
                        ? { ...t, attachments: [...(t.attachments || []), ...results] }
                        : t)
                };
                saveProject(updated);
            }
        };
        fileArr.forEach(file => {
            const isEml = file.name.toLowerCase().endsWith('.eml') || file.type === 'message/rfc822';
            const isMsg = file.name.toLowerCase().endsWith('.msg');
            if (isEml) {
                // Lees als tekst voor parsing, en als base64 voor download
                const textReader = new FileReader();
                const b64Reader = new FileReader();
                let rawText = null, dataUrl = null;
                const tryPush = () => {
                    if (rawText !== null && dataUrl !== null) {
                        results.push({ name: file.name, type: 'message/rfc822', size: file.size, rawText, data: dataUrl });
                        checkDone();
                    }
                };
                textReader.onload = e => { rawText = e.target.result; tryPush(); };
                b64Reader.onload = e => { dataUrl = e.target.result; tryPush(); };
                textReader.readAsText(file);
                b64Reader.readAsDataURL(file);
            } else if (isMsg) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const MsgReader = (await import('@kenjiuno/msgreader')).default;
                        const msgReader = new MsgReader(e.target.result);
                        const info = msgReader.getFileData();
                        const parsedMsg = {
                            subject: info.subject || '(geen onderwerp)',
                            from: info.senderName ? `${info.senderName} <${info.senderEmail || ''}>` : (info.senderEmail || ''),
                            to: (info.recipients || []).map(r => r.name || r.email || '').join(', '),
                            cc: '',
                            date: '',
                            body: info.body || '',
                            bodyHtml: info.bodyHtml || info.body || '',
                            bodyIsHtml: !!info.bodyHtml,
                        };
                        // Converteer ArrayBuffer naar base64 data-URL voor download
                        const bytes = new Uint8Array(e.target.result);
                        let binary = '';
                        bytes.forEach(b => binary += String.fromCharCode(b));
                        const dataUrl = 'data:application/vnd.ms-outlook;base64,' + btoa(binary);
                        results.push({ name: file.name, type: 'application/vnd.ms-outlook', size: file.size, parsedMsg, data: dataUrl });
                    } catch (err) {
                        console.warn('MSG parse error:', err);
                        results.push({ name: file.name, type: 'application/vnd.ms-outlook', size: file.size, data: null, parseError: true });
                    }
                    checkDone();
                };
                reader.readAsArrayBuffer(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: e.target.result });
                    checkDone();
                };
                reader.readAsDataURL(file);
            }
        });
    };
    const removeAttachment = (taskId, attachIdx) => {
        const updated = {
            ...project,
            tasks: project.tasks.map(t => t.id === taskId
                ? { ...t, attachments: (t.attachments || []).filter((_, i) => i !== attachIdx) }
                : t)
        };
        saveProject(updated);
    };
    const [previewAtt, setPreviewAtt] = useState(null); // { data, name, type }
    const [deleteConfirmTask, setDeleteConfirmTask] = useState(null); // task.id
    const [dragOverTask, setDragOverTask] = useState(null); // task.id being dragged over

    // ── Meerwerk state ──
    const [meerwerk, setMeerwerk] = useState(() => {
        try { const s = localStorage.getItem(`schildersapp_meerwerk_${id}`); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [showAddMeerwerk, setShowAddMeerwerk] = useState(false);

    // Selectie helpers (na meerwerk state, zodat meerwerk beschikbaar is)
    const toggleMeerwerkSelectie = (id) => setMeerwerkSelectie(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    const selectAllMeerwerk = () => setMeerwerkSelectie(
        meerwerkSelectie.length === meerwerk.length ? [] : meerwerk.map(m => m.id)
    );
    const geselecteerdeItems = meerwerk.filter(m => meerwerkSelectie.includes(m.id));
    const [newMeerwerk, setNewMeerwerk] = useState({ omschrijving: '', uren: '', bedrag: '', toelichting: '', datum: new Date().toISOString().split('T')[0] });
    const [meerwerkEmailStatus, setMeerwerkEmailStatus] = useState({}); // { [id]: 'sending'|'sent'|'error' }

    const saveMeerwerk = (updated) => {
        setMeerwerk(updated);
        localStorage.setItem(`schildersapp_meerwerk_${id}`, JSON.stringify(updated));
    };
    const addMeerwerkItem = () => {
        if (!newMeerwerk.omschrijving || !newMeerwerk.bedrag) return;
        const item = {
            id: Date.now(),
            omschrijving: newMeerwerk.omschrijving,
            uren: parseFloat(newMeerwerk.uren) || 0,
            bedrag: parseFloat(newMeerwerk.bedrag) || 0,
            toelichting: newMeerwerk.toelichting || '',
            datum: newMeerwerk.datum || new Date().toISOString().split('T')[0],
            status: 'aanvraag', // aanvraag | goedgekeurd | afgewezen
            akkoordDatum: '',
        };
        saveMeerwerk([...meerwerk, item]);
        setNewMeerwerk({ omschrijving: '', uren: '', bedrag: '', toelichting: '', datum: new Date().toISOString().split('T')[0] });
        setShowAddMeerwerk(false);
    };
    const updateMeerwerkStatus = (mwId, status) => {
        saveMeerwerk(meerwerk.map(m => m.id === mwId
            ? { ...m, status, akkoordDatum: status === 'goedgekeurd' ? new Date().toISOString().split('T')[0] : m.akkoordDatum }
            : m));
    };
    const deleteMeerwerkItem = (mwId) => saveMeerwerk(meerwerk.filter(m => m.id !== mwId));

    const openCompose = (items, contact) => {
        // items kan 1 item of een array zijn
        const arr = Array.isArray(items) ? items : [items];
        setMeerwerkEmailPicker(null);
        const ref = arr.length === 1 ? `MW-${arr[0].id}` : `MW-bulk-${arr.length}items`;
        setComposeOntwerp(`Verzoek om akkoord meerwerk - ${project?.name || ''} (ref. ${ref})`);
        setComposeBericht('');
        setComposeCC('');
        setMeerwerkCompose({ items: arr, contact });
    };

    const sendMeerwerkEmail = (item) => {
        if (allEmailTargets.length === 0) {
            alert('Nog geen e-mailcontacten. Voeg er een toe via Overzicht → E-mailcontacten.');
            return;
        }
        if (allEmailTargets.length === 1) {
            openCompose([item], allEmailTargets[0]);
        } else {
            setMeerwerkEmailPicker(item);
        }
    };

    const sendMeerwerkBulk = () => {
        if (geselecteerdeItems.length === 0) return;
        if (allEmailTargets.length === 0) {
            alert('Nog geen e-mailcontacten. Voeg er een toe via Overzicht → E-mailcontacten.');
            return;
        }
        if (allEmailTargets.length === 1) {
            openCompose(geselecteerdeItems, allEmailTargets[0]);
        } else {
            setMeerwerkEmailPicker('_bulk_');
        }
    };

    const sendMeerwerkEmailTo = async (items, contact, persoonlijkBericht, onderwerp, vanNaam, cc, bcc) => {
        setMeerwerkCompose(null);
        setMeerwerkSelectie([]);
        // Sla standaard BCC op
        if (bcc?.trim()) {
            try { localStorage.setItem('schildersapp_default_bcc', bcc.trim()); } catch {}
        }
        const itemsArr = Array.isArray(items) ? items : [items];
        // Zet alle items op 'sending'
        setMeerwerkEmailStatus(prev => {
            const next = { ...prev };
            itemsArr.forEach(m => { next[m.id] = 'sending'; });
            return next;
        });
        try {
            const baseUrl = window.location.origin;
            const tokenRes = await fetch('/api/meerwerk-akkoord', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: id,
                    projectNaam: project.name,
                    meerwerkItems: itemsArr,         // array
                    meerwerkItem: itemsArr[0],       // backwards compat
                    toName: contact.naam,
                    toEmail: contact.email,
                }),
            });
            const tokenData = await tokenRes.json();
            const akkoordUrl = tokenData.token
                ? `${baseUrl}/meerwerk-akkoord/${tokenData.token}`
                : null;

            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: contact.email,
                    toName: contact.naam,
                    contractNummer: itemsArr.length === 1 ? `MW-${itemsArr[0].id}` : `MW-bulk`,
                    projectNaam: project.name,
                    contractUrl: '',
                    meerwerkItems: itemsArr,
                    meerwerkItem: itemsArr[0],
                    isMeerwerk: true,
                    akkoordUrl,
                    persoonlijkBericht: persoonlijkBericht?.trim() || '',
                    onderwerp: onderwerp?.trim() || '',
                    vanNaam: vanNaam?.trim() || '',
                    cc: cc?.trim() || '',
                    bcc: bcc?.trim() || '',
                }),
            });
            const data = await res.json();
            const nu = new Date().toISOString().split('T')[0];
            setMeerwerkEmailStatus(prev => {
                const next = { ...prev };
                itemsArr.forEach(m => { next[m.id] = data.success ? 'sent' : 'error'; });
                return next;
            });
            if (data.success) {
                saveMeerwerk(meerwerk.map(m =>
                    itemsArr.some(i => i.id === m.id)
                        ? { ...m, emailVerzonden: nu, emailNaar: contact.email, akkoordToken: tokenData.token }
                        : m
                ));
            }
        } catch {
            setMeerwerkEmailStatus(prev => {
                const next = { ...prev };
                itemsArr.forEach(m => { next[m.id] = 'error'; });
                return next;
            });
        }
    };




    const KWALITEIT_DEFAULTS = [
        { id: 'k1', label: 'Ondergrond beoordeeld & gereinigd', done: false },
        { id: 'k2', label: 'Houtrot gecontroleerd & gerepareerd', done: false },
        { id: 'k3', label: 'Grondverf aangebracht', done: false },
        { id: 'k4', label: 'Tussenlaag aangebracht', done: false },
        { id: 'k5', label: 'Eindlaag / aflak aangebracht', done: false },
        { id: 'k6', label: 'Afplakmateriaal verwijderd', done: false },
        { id: 'k7', label: 'Eindcontrole met klant doorlopen', done: false },
        { id: 'k8', label: 'Correcties na oplevering verwerkt', done: false },
    ];
    const [kwaliteitsChecks, setKwaliteitsChecks] = useState(() => {
        try { const s = localStorage.getItem(`schildersapp_bewaking_k_${id}`); return s ? JSON.parse(s) : KWALITEIT_DEFAULTS; } catch { return KWALITEIT_DEFAULTS; }
    });
    const toggleKwaliteit = (kId) => {
        const upd = kwaliteitsChecks.map(k => k.id === kId ? { ...k, done: !k.done } : k);
        setKwaliteitsChecks(upd);
        localStorage.setItem(`schildersapp_bewaking_k_${id}`, JSON.stringify(upd));
    };

    // ── Uren berekenen uit urenregistratie voor dit project ──
    const calcUrenVoorProject = () => {
        if (!allUsers || !project) return { totaal: 0, perPersoon: [] };
        const parseVal = v => parseFloat(String(v).replace(',', '.')) || 0;
        const parseType = (typeId) => {
            const ICON_TYPES = ['ziek', 'vrij'];
            return !ICON_TYPES.includes(typeId);
        };
        // Bepaal weken: van projectstart tot vandaag
        const startD = new Date(project.startDate + 'T00:00:00');
        const today = new Date();
        const weekSet = new Set();
        const cursor = new Date(startD);
        cursor.setDate(cursor.getDate() - cursor.getDay() + 1); // naar maandag
        while (cursor <= today) {
            const d = new Date(cursor);
            const jan4 = new Date(d.getFullYear(), 0, 4);
            const dow = jan4.getDay() || 7;
            const wk = Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + dow) / 7);
            weekSet.add(`${wk}_${d.getFullYear()}`);
            cursor.setDate(cursor.getDate() + 7);
        }
        const weeks = [...weekSet];
        const perPersoon = [];
        allUsers.forEach(u => {
            let urenTotaal = 0;
            let weekBreakdown = [];
            weeks.forEach(wk => {
                const [weekNum, yearNum] = wk.split('_').map(Number);
                const key = `schildersapp_urv2_u${u.id}_w${weekNum}_${yearNum}`;
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return;
                    const projectRows = JSON.parse(raw);
                    let weekUren = 0;
                    projectRows.forEach(row => {
                        if (String(row.projectId) !== String(id)) return;
                        Object.entries(row.types || {}).forEach(([tid, hrs]) => {
                            if (!parseType(tid)) return;
                            (hrs || []).slice(0, 5).forEach(h => { weekUren += parseVal(h); });
                        });
                    });
                    if (weekUren > 0) {
                        urenTotaal += weekUren;
                        weekBreakdown.push({ weekNum, yearNum, uren: weekUren });
                    }
                } catch { /* skip */ }
            });
            if (urenTotaal > 0) {
                perPersoon.push({ ...u, uren: urenTotaal, weekBreakdown });
            }
        });
        const totaal = perPersoon.reduce((s, p) => s + p.uren, 0);
        return { totaal: Math.round(totaal * 10) / 10, perPersoon };
    };
    const urenData = calcUrenVoorProject();
    const werkelijkeUren = urenData.totaal;
    const urenPerPersoon = urenData.perPersoon;


    useEffect(() => {
        const stored = localStorage.getItem('schildersapp_projecten');
        let allProjects = stored ? JSON.parse(stored) : INITIAL_PROJECTS;
        // Saneer project datums: herstel ongeldige datums van INITIAL_PROJECTS
        const isValidDate = (s) => s && !isNaN(new Date(s + 'T00:00:00').getTime());
        allProjects = allProjects.map(p => {
            const init = INITIAL_PROJECTS.find(ip => ip.id === p.id);
            const startDate = isValidDate(p.startDate) ? p.startDate : (init?.startDate || new Date().toISOString().split('T')[0]);
            const endDate = isValidDate(p.endDate) ? p.endDate : (init?.endDate || new Date(Date.now() + 30*86400000).toISOString().split('T')[0]);
            const tasks = (p.tasks || []).map(t => ({
                ...t,
                startDate: isValidDate(t.startDate) ? t.startDate : startDate,
                endDate: isValidDate(t.endDate) ? t.endDate : endDate,
            }));
            return { ...p, startDate, endDate, tasks };
        });
        setProjects(allProjects);
        const found = allProjects.find(p => String(p.id) === String(id));
        setProject(found || null);
        if (found) setOfferteBedrag(String(found.estimatedHours * (found.hourlyRate || 55)));

        // Notities Ophalen vanuit NAS Database (The Cloud)
        const loadNotes = async () => {
            try {
                const res = await fetch(`/api/notes?projectId=${id}`);
                const data = await res.json();
                if (data.success) {
                    setNotes(data.notes.length > 0 ? data.notes : DEMO_NOTES);
                }
            } catch (err) {
                console.error("Kon notities niet van NAS halen:", err);
            }
        };
        loadNotes();

        const storedPhotos = localStorage.getItem(`schildersapp_photos_${id}`);
        setPhotos(storedPhotos ? JSON.parse(storedPhotos) : []);

        const storedTermijnen = localStorage.getItem(`schildersapp_termijnen_${id}`);
        setTermijnen(storedTermijnen ? JSON.parse(storedTermijnen) : DEMO_TERMIJNEN);

        const storedOfferte = localStorage.getItem(`schildersapp_offerte_${id}`);
        if (storedOfferte) {
            const o = JSON.parse(storedOfferte);
            setOffertePosten(o.posten || []);
            setOfferteStatus(o.status || 'concept');
            setOfferteDatum(o.datum || new Date().toISOString().split('T')[0]);
            setOfferteGeldig(o.geldig || 30);
            setOfferteNotes(o.notes || '');
        } else {
            setOffertePosten([
                { id: 1, omschrijving: 'Buitenschilderwerk kozijnen', eenheid: 'ls', aantal: 1, prijs: 2800 },
                { id: 2, omschrijving: 'Binnenschilderwerk muren (latex)', eenheid: 'm²', aantal: 120, prijs: 12 },
                { id: 3, omschrijving: 'Materialen en verfbenodigdheden', eenheid: 'ls', aantal: 1, prijs: 850 },
            ]);
        }

        const handleNotesUpdate = (e) => {
            if (e.detail && String(e.detail.projectId) !== String(id)) return;
            loadNotes(); // Ophalen uit de LIVE database!
        };
        const handlePhotosUpdate = (e) => {
            if (e.detail && String(e.detail.projectId) !== String(id)) return;
            const updatedPhotos = localStorage.getItem(`schildersapp_photos_${id}`);
            setPhotos(updatedPhotos ? JSON.parse(updatedPhotos) : []);
        };
        const handleStorage = (e) => {
            if (e.key === `schildersapp_photos_${id}`) {
                setPhotos(e.newValue ? JSON.parse(e.newValue) : []);
            }
            // Sync project data when another tab makes changes
            if (e.key === 'schildersapp_projecten' && e.newValue) {
                try {
                    const allProjs = JSON.parse(e.newValue);
                    const found = allProjs.find(p => String(p.id) === String(id));
                    if (found) { setProject(found); setProjects(allProjs); }
                } catch {}
            }
        };
        const handleVisible = () => {
            if (document.visibilityState === 'visible') {
                try {
                    const s = localStorage.getItem('schildersapp_projecten');
                    if (s) {
                        const allProjs = JSON.parse(s);
                        const found = allProjs.find(p => String(p.id) === String(id));
                        if (found) { setProject(found); setProjects(allProjs); }
                    }
                } catch {}
            }
        };

        window.addEventListener('notes-updated', handleNotesUpdate);
        window.addEventListener('photos-updated', handlePhotosUpdate);
        window.addEventListener('storage', handleStorage);
        document.addEventListener('visibilitychange', handleVisible);
        return () => {
            window.removeEventListener('notes-updated', handleNotesUpdate);
            window.removeEventListener('photos-updated', handlePhotosUpdate);
            window.removeEventListener('storage', handleStorage);
            document.removeEventListener('visibilitychange', handleVisible);
        };

    }, [id]);

    const saveProject = (updated) => {
        setProject(updated);
        const newProjects = projects.map(p => p.id === updated.id ? updated : p);
        setProjects(newProjects);
        localStorage.setItem('schildersapp_projecten', JSON.stringify(newProjects));
    };

    // Expliciete opslaan met feedback + cross-tab sync event
    const forceSave = () => {
        const stored = localStorage.getItem('schildersapp_projecten');
        const allProjs = stored ? JSON.parse(stored) : [];
        const merged = allProjs.map(p => p.id === project.id ? project : p);
        localStorage.setItem('schildersapp_projecten', JSON.stringify(merged));
        // Stuur een custom event zodat globale planning direct herlaadt
        try { window.dispatchEvent(new CustomEvent('schilders-sync', { detail: { projecten: merged } })); } catch {}
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 2500);
    };

    const toggleTask = (taskId) => {
        const updated = { ...project, tasks: project.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) };
        saveProject(updated);
    };

    const addNote = () => {
        if (!newNote.trim()) return;
        const note = { id: Date.now(), text: newNote, type: noteType, author: user?.name || 'Jan Modaal', date: new Date().toISOString().split('T')[0] };
        const updated = [note, ...notes];
        setNotes(updated);
        localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(updated));
        // Stuur WhatsApp melding naar collega
        if (notifyUserId) {
            const colleague = allUsers.find(u => String(u.id) === String(notifyUserId));
            if (colleague?.phone) {
                const phone = String(colleague.phone).replace(/^0/, '31').replace(/[^0-9]/g, '');
                const msg = `📋 *Projectnotitie - ${project?.name}*\n\n${newNote}\n\n_Van: ${user?.name || 'Jan Modaal'}_`;
                window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
            }
        }
        setNewNote('');
        setNotifyUserId('');
    };

    const deleteNote = (noteId) => {
        const updated = notes.filter(n => n.id !== noteId);
        setNotes(updated);
        localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(updated));
    };

    const addTask = () => {
        if (!newTask.name || !newTask.startDate || !newTask.endDate) return;
        const task = { id: 't' + Date.now(), name: newTask.name, startDate: newTask.startDate, endDate: newTask.endDate, assignedTo: [], completed: false };
        const updated = { ...project, tasks: [...project.tasks, task] };
        saveProject(updated);
        setNewTask({ name: '', startDate: '', endDate: '' });
        setShowAddTask(false);
    };

    const toggleTermijn = (termijnId) => {
        const updated = termijnen.map(t => t.id === termijnId
            ? { ...t, betaald: !t.betaald, betaaldatum: !t.betaald ? new Date().toISOString().split('T')[0] : '' }
            : t);
        setTermijnen(updated);
        localStorage.setItem(`schildersapp_termijnen_${id}`, JSON.stringify(updated));
    };

    const addTermijn = () => {
        if (!newTermijn.omschrijving || !newTermijn.bedrag) return;
        const termijn = {
            id: Date.now(),
            omschrijving: newTermijn.omschrijving,
            bedrag: parseFloat(newTermijn.bedrag) || 0,
            percentage: parseFloat(newTermijn.percentage) || 0,
            datum: newTermijn.datum || new Date().toISOString().split('T')[0],
            vervaldatum: newTermijn.vervaldatum || '',
            betaaldatum: '',
            factuurNr: newTermijn.factuurNr || `F-${new Date().getFullYear()}-${String(termijnen.length + 1).padStart(3, '0')}`,
            betaald: false,
        };
        const updated = [...termijnen, termijn];
        setTermijnen(updated);
        localStorage.setItem(`schildersapp_termijnen_${id}`, JSON.stringify(updated));
        setNewTermijn({ omschrijving: '', bedrag: '', percentage: '', datum: '', vervaldatum: '', factuurNr: '' });
        setShowAddTermijn(false);
    };

    const deleteTermijn = (termijnId) => {
        const updated = termijnen.filter(t => t.id !== termijnId);
        setTermijnen(updated);
        localStorage.setItem(`schildersapp_termijnen_${id}`, JSON.stringify(updated));
    };

    const saveTermijnEdit = (termijnId, changes) => {
        const updated = termijnen.map(t => t.id === termijnId ? { ...t, ...changes } : t);
        setTermijnen(updated);
        localStorage.setItem(`schildersapp_termijnen_${id}`, JSON.stringify(updated));
        setEditTermijnId(null);
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const photo = { id: Date.now() + Math.random(), url: ev.target.result, name: file.name, category: 'voortgang', date: new Date().toISOString().split('T')[0] };
                setPhotos(prev => {
                    const upd = [...prev, photo];
                    localStorage.setItem(`schildersapp_photos_${id}`, JSON.stringify(upd));
                    return upd;
                });
            };
            reader.readAsDataURL(file);
        });
    };

    if (!project) return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1' }} />
            <h2 style={{ color: '#64748b', margin: 0 }}>Project niet gevonden</h2>
            <Link href="/projecten" style={{ color: '#F5850A', fontWeight: 600, textDecoration: 'none' }}>← Terug naar Projecten</Link>
        </div>
    );

    const completedTasks = project.tasks.filter(t => t.completed).length;
    const totalTasks = project.tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const daysLeft = Math.ceil((new Date(project.endDate + 'T00:00:00') - new Date()) / 86400000);
    const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
    const teamIds = [...new Set(project.tasks.flatMap(t => t.assignedTo || []))];
    const teamUsers = allUsers.filter(u => teamIds.includes(u.id));
    const offerte = parseFloat(offerteBedrag) || (project.estimatedHours * (project.hourlyRate || 55));
    const betaald = termijnen.filter(t => t.betaald).reduce((s, t) => s + t.bedrag, 0);
    const gefactureerd = termijnen.reduce((s, t) => s + t.bedrag, 0);
    const openstaand = gefactureerd - betaald;

    const TABS = [
        { id: 'overzicht', label: 'Overzicht', icon: 'fa-house' },
        { id: 'planning', label: 'Planning', icon: 'fa-chart-gantt' },
        { id: 'taken', label: `Taken (${totalTasks})`, icon: 'fa-list-check' },
        { id: 'notities', label: `Notities (${notes.length})`, icon: 'fa-note-sticky' },
        { id: 'financien', label: 'Financiën', icon: 'fa-euro-sign' },
        { id: 'fotos', label: `Foto's (${photos.length})`, icon: 'fa-camera' },
        { id: 'documenten', label: 'Documenten', icon: 'fa-file-lines' },
        { id: 'bewaking', label: 'Bewaking', icon: 'fa-shield-halved' },
    ];

    const mainContent = (
        <div className="content-area" style={{ maxWidth: '100%' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.82rem', color: '#64748b' }}>
                <Link href="/projecten" style={{ color: '#F5850A', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.7rem' }} /> Projecten
                </Link>
                <span>/</span>
                <span style={{ color: '#1e293b', fontWeight: 600 }}>{project.name}</span>
            </div>

            {/* Project Header */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fa-solid fa-folder-open" style={{ fontSize: '1.4rem', color: '#fff' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#1e293b' }}>{project.name}</h1>
                                <span style={{ background: statusCfg.bg, color: statusCfg.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <i className={`fa-solid ${statusCfg.icon}`} /> {statusCfg.label}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span><i className="fa-solid fa-user" style={{ marginRight: '4px' }} />{project.client}</span>
                                <span>•</span>
                                <span><i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }} />{project.address}</span>
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <select value={project.status} onChange={e => saveProject({ ...project, status: e.target.value })}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 600, background: '#fff', cursor: 'pointer', color: '#1e293b' }}>
                            <option value="planning">In Planning</option>
                            <option value="active">Actief</option>
                            <option value="paused">Gepauzeerd</option>
                            <option value="completed">Afgerond</option>
                        </select>
                        <Link href="/projecten" style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-chart-gantt" /> Gantt
                        </Link>
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                    {[
                        { icon: 'fa-circle-check', color: '#F5850A', bg: 'rgba(245,133,10,0.1)', label: 'Voortgang', value: `${progress}%`, sub: `${completedTasks}/${totalTasks} taken` },
                        { icon: 'fa-calendar-days', color: daysLeft < 0 ? '#ef4444' : daysLeft < 14 ? '#f59e0b' : '#3b82f6', bg: daysLeft < 0 ? '#fef2f2' : daysLeft < 14 ? '#fffbeb' : '#eff6ff', label: 'Resterende tijd', value: daysLeft < 0 ? 'Verlopen' : `${daysLeft} dagen`, sub: `Oplevering ${formatDate(project.endDate)}` },
                        { icon: 'fa-clock', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Geschatte uren', value: `${project.estimatedHours}u`, sub: `Start ${formatDate(project.startDate)}` },
                        { icon: 'fa-users', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Team', value: `${teamUsers.length} pers.`, sub: teamUsers.map(u => u.name.split(' ')[0]).join(', ') || 'Niemand' },
                    ].map((s, i) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                <i className={`fa-solid ${s.icon}`} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                                <div style={{ fontSize: '0.67rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        flex: 1, padding: '9px 12px', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                        background: activeTab === tab.id ? '#fff' : 'transparent',
                        color: activeTab === tab.id ? '#F5850A' : '#64748b',
                        boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                        <i className={`fa-solid ${tab.icon}`} /> <span style={{ display: 'inline' }}>{tab.label}</span>
                    </button>
                ))}
            </div>



                        {/* ===== PLANNING TAB ===== */}
            {activeTab === 'planning' && (
                <ProjectGantt
                    project={project}
                    allUsers={allUsers}
                    onSave={(updatedProject) => {
                        setProject(updatedProject);
                        try {
                            const stored = localStorage.getItem('schildersapp_projecten');
                            const all = stored ? JSON.parse(stored) : [];
                            const merged = all.map(x => String(x.id) === String(updatedProject.id) ? updatedProject : x);
                            localStorage.setItem('schildersapp_projecten', JSON.stringify(merged));
                            window.dispatchEvent(new CustomEvent('schilders-sync', { detail: { projecten: merged } }));
                        } catch {}
                    }}
                />
            )}

{/* ===== OVERZICHT ===== */}
            {activeTab === 'overzicht' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Klantgegevens */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-user-tie" style={{ color: '#F5850A' }} /> Klantgegevens
                            </h3>
                            {!editingClient ? (
                                <button onClick={() => { setEditForm({ client: project.client, address: project.address, phone: project.phone || '', email: project.email || '', startDate: project.startDate, endDate: project.endDate, estimatedHours: project.estimatedHours }); setEditingClient(true); }}
                                    style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#F5850A'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#F5850A'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                    <i className="fa-solid fa-pen" /> Bewerken
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setEditingClient(false)}
                                        style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                        Annuleer
                                    </button>
                                    <button onClick={() => { saveProject({ ...project, ...editForm, estimatedHours: Number(editForm.estimatedHours) }); setEditingClient(false); }}
                                        style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-check" /> Opslaan
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingClient && (
                            [
                                { icon: 'fa-user', label: 'Naam', value: project.client },
                                { icon: 'fa-location-dot', label: 'Adres', value: project.address },
                                { icon: 'fa-phone', label: 'Telefoon', value: project.phone || '—' },
                                { icon: 'fa-envelope', label: 'Email', value: project.email || '—' },
                                { icon: 'fa-calendar-plus', label: 'Startdatum', value: formatDate(project.startDate) },
                                { icon: 'fa-calendar-check', label: 'Einddatum', value: formatDate(project.endDate) },
                                { icon: 'fa-clock', label: 'Geschatte uren', value: `${project.estimatedHours}u` },
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: i < 6 ? '1px solid #f8fafc' : 'none' }}>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f8fafc', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                        <i className={`fa-solid ${row.icon}`} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{row.label}</div>
                                        <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 }}>{row.value}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {/* E-mailcontacten */}
                        {!editingClient && (
                            <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-address-book" /> E-mailcontacten
                                    </div>
                                    <button onClick={() => setShowAddEmailContact(v => !v)}
                                        style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <i className={`fa-solid ${showAddEmailContact ? 'fa-xmark' : 'fa-plus'}`} />
                                        {showAddEmailContact ? 'Sluiten' : 'Toevoegen'}
                                    </button>
                                </div>
                                {showAddEmailContact && (
                                    <div style={{ background: '#fffbf5', border: '1px solid #fed7aa', borderRadius: '9px', padding: '12px', marginBottom: '8px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>Naam *</label>
                                                <input value={newEmailContact.naam} onChange={e => setNewEmailContact(p => ({ ...p, naam: e.target.value }))}
                                                    placeholder="Jan Jansen" style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>Label</label>
                                                <select value={newEmailContact.label} onChange={e => setNewEmailContact(p => ({ ...p, label: e.target.value }))}
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                                                    {['Opdrachtgever', 'Contactpersoon', 'Boekhouding', 'Directie', 'Overig'].map(l => <option key={l}>{l}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>E-mailadres *</label>
                                                <input type="email" value={newEmailContact.email} onChange={e => setNewEmailContact(p => ({ ...p, email: e.target.value }))}
                                                    placeholder="jan@bedrijf.nl" style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>06-nummer</label>
                                                <input type="tel" value={newEmailContact.telefoon || ''} onChange={e => setNewEmailContact(p => ({ ...p, telefoon: e.target.value }))}
                                                    placeholder="06-12345678" style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                                            </div>
                                        </div>
                                        <button onClick={addEmailContact}
                                            style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                            <i className="fa-solid fa-plus" style={{ marginRight: '4px' }} />Contact opslaan
                                        </button>
                                    </div>
                                )}
                                {allEmailTargets.length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Nog geen e-mailcontacten. Voeg er een toe.</div>
                                ) : allEmailTargets.map(c => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                                            <i className="fa-solid fa-envelope" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{c.naam}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email} · <span style={{ color: '#94a3b8' }}>{c.label}</span></div>
                                            {c.telefoon && (
                                                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className="fa-solid fa-phone" style={{ fontSize: '0.6rem', color: '#94a3b8' }} />
                                                    {c.telefoon}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                            {c.telefoon && (
                                                <a href={`https://wa.me/${c.telefoon.replace(/[^0-9]/g, '').replace(/^06/, '316')}`} target="_blank" rel="noreferrer"
                                                    title={`WhatsApp naar ${c.naam}`}
                                                    style={{ padding: '4px 7px', borderRadius: '6px', border: 'none', background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                                                    <i className="fa-brands fa-whatsapp" />
                                                </a>
                                            )}
                                            <button onClick={() => removeEmailContact(c.id)}
                                                style={{ padding: '4px 7px', borderRadius: '6px', border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}>
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {editingClient && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    { field: 'client', label: 'Naam opdrachtgever', icon: 'fa-user', type: 'text' },
                                    { field: 'address', label: 'Adres', icon: 'fa-location-dot', type: 'text' },
                                    { field: 'phone', label: 'Telefoon', icon: 'fa-phone', type: 'tel' },
                                    { field: 'email', label: 'Email', icon: 'fa-envelope', type: 'email' },
                                    { field: 'startDate', label: 'Startdatum', icon: 'fa-calendar-plus', type: 'date' },
                                    { field: 'endDate', label: 'Einddatum', icon: 'fa-calendar-check', type: 'date' },
                                    { field: 'estimatedHours', label: 'Geschatte uren', icon: 'fa-clock', type: 'number' },
                                ].map(({ field, label, icon, type }) => (
                                    <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(245,133,10,0.08)', color: '#F5850A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                            <i className={`fa-solid ${icon}`} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
                                            <input type={type} value={editForm[field] || ''}
                                                onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                                                style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                                                onFocus={e => e.target.style.borderColor = '#F5850A'}
                                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Voortgang + Team */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Progress */}
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-circle-check" style={{ color: '#F5850A' }} /> Voortgang
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <CircleProgress pct={progress} color={project.color} size={90} />
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{progress}%</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}><b>{completedTasks}</b> van <b>{totalTasks}</b> taken afgerond</div>
                                    <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: project.color, borderRadius: '6px', transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Team */}
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', flex: 1 }}>
                            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-users" style={{ color: '#F5850A' }} /> Team
                            </h3>
                            {teamUsers.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Nog geen medewerkers toegewezen</p>
                            ) : teamUsers.map(u => (
                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                                    <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>{u.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TAKEN ===== */}
            {activeTab === 'taken' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '14px', alignItems: 'start' }}>

                    {/* Linker kolom: takentabel */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-list-check" style={{ color: '#F5850A' }} /> Taken
                                <span style={{ background: '#F5850A22', color: '#F5850A', borderRadius: '20px', padding: '1px 9px', fontSize: '0.72rem', fontWeight: 700 }}>{project.tasks.length}</span>
                            </h3>
                            <button onClick={() => setShowAddTask(!showAddTask)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className={`fa-solid ${showAddTask ? 'fa-xmark' : 'fa-plus'}`} /> {showAddTask ? 'Annuleer' : 'Taak toevoegen'}
                            </button>
                        </div>

                        {showAddTask && (
                            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ gridColumn: '1/-1' }}><label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Naam *</label>
                                    <input value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })} placeholder="Taaknaam..." style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Startdatum</label>
                                    <input type="date" value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', boxSizing: 'border-box' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Einddatum</label>
                                    <input type="date" value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', boxSizing: 'border-box' }} /></div>
                                <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
                                    <button onClick={addTask} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>✓ Toevoegen</button>
                                </div>
                            </div>
                        )}

                    {/* Tabel weergave */}
                    {project.tasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                            <i className="fa-solid fa-list-check" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }} />
                            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Nog geen taken</p>
                            <p style={{ margin: 0, fontSize: '0.82rem' }}>Klik <strong>Sjabloon laden</strong> voor een snelle start</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '110px' }}>Status</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taaknaam</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '170px' }}>Periode</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '70px' }}>Team</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '56px' }}>📎</th>
                                    <th style={{ padding: '8px 10px', width: '44px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.tasks.map((task, idx) => {
                                    const STATUS_CFG = {
                                        todo:  { label: 'Te doen', color: '#64748b', bg: '#f1f5f9' },
                                        bezig: { label: 'Bezig',   color: '#2563eb', bg: '#dbeafe' },
                                        klaar: { label: 'Klaar',   color: '#16a34a', bg: '#dcfce7' },
                                    };
                                    const statusKey = task.completed ? 'klaar' : (task.kanbanStatus || 'todo');
                                    const cfg = STATUS_CFG[statusKey];
                                    const statusOrder = ['todo', 'bezig', 'klaar'];
                                    const nextStatus = () => {
                                        const next = statusOrder[(statusOrder.indexOf(statusKey) + 1) % 3];
                                        saveProject({ ...project, tasks: project.tasks.map(t => t.id === task.id ? { ...t, kanbanStatus: next, completed: next === 'klaar' } : t) });
                                    };
                                    const assigned = allUsers.filter(u => (task.assignedTo || []).includes(u.id));
                                    const attachments = task.attachments || [];
                                    const isAttachOpen = openAttachTask === task.id;
                                    const isDeleteConfirm = deleteConfirmTask === task.id;
                                    return (
                                        <>
                                        <tr key={task.id} style={{ borderBottom: (isAttachOpen || isDeleteConfirm) ? 'none' : '1px solid #f8fafc', background: isDeleteConfirm ? '#fef2f2' : idx % 2 === 0 ? '#fff' : '#fafbfc' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fffbf5'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbfc'}>
                                            <td style={{ padding: '10px 10px' }}>
                                                <button onClick={nextStatus} title="Klik om status te wisselen"
                                                    style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                                    {cfg.label}
                                                </button>
                                            </td>
                                            <td style={{ padding: '10px 10px', fontWeight: 600, color: statusKey === 'klaar' ? '#94a3b8' : '#1e293b', textDecoration: statusKey === 'klaar' ? 'line-through' : 'none' }}>
                                                {task.name}
                                                {task.category && <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px' }}>{task.category}</span>}
                                            </td>
                                            <td style={{ padding: '10px 10px', color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                                {task.startDate ? <>{formatDate(task.startDate)}<br /><span style={{ color: '#94a3b8' }}>→ {formatDate(task.endDate)}</span></> : '—'}
                                            </td>
                                            <td style={{ padding: '10px 10px' }}>
                                                <div style={{ display: 'flex', gap: '3px' }}>
                                                    {assigned.map(u => (
                                                        <div key={u.id} title={u.name} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5850A,#E07000)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, border: '2px solid #fff' }}>{u.initials}</div>
                                                    ))}
                                                </div>
                                            </td>
                                            {/* 📎 Bijlagen knop */}
                                            <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                <button onClick={() => setOpenAttachTask(isAttachOpen ? null : task.id)}
                                                    title={`Bijlagen (${attachments.length})`}
                                                    style={{ position: 'relative', background: isAttachOpen ? '#F5850A' : attachments.length > 0 ? '#fff7ed' : 'none', border: isAttachOpen ? 'none' : attachments.length > 0 ? '1px solid #fed7aa' : 'none', color: isAttachOpen ? '#fff' : attachments.length > 0 ? '#F5850A' : '#cbd5e1', cursor: 'pointer', fontSize: '0.82rem', padding: '4px 7px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => { if (!isAttachOpen) { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = '#F5850A'; e.currentTarget.style.border = '1px solid #fed7aa'; }}}
                                                    onMouseLeave={e => { if (!isAttachOpen) { e.currentTarget.style.background = attachments.length > 0 ? '#fff7ed' : 'none'; e.currentTarget.style.color = attachments.length > 0 ? '#F5850A' : '#cbd5e1'; e.currentTarget.style.border = attachments.length > 0 ? '1px solid #fed7aa' : 'none'; }}}>
                                                    <i className="fa-solid fa-paperclip" />
                                                    {attachments.length > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{attachments.length}</span>}
                                                </button>
                                            </td>
                                            <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                <button onClick={() => setDeleteConfirmTask(isDeleteConfirm ? null : task.id)} title="Verwijderen"
                                                    style={{ background: isDeleteConfirm ? '#fef2f2' : 'none', border: isDeleteConfirm ? '1px solid #fecaca' : 'none', color: isDeleteConfirm ? '#ef4444' : '#cbd5e1', cursor: 'pointer', fontSize: '0.78rem', padding: '4px 5px', borderRadius: '6px' }}
                                                    onMouseEnter={e => { if (!isDeleteConfirm) { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}}
                                                    onMouseLeave={e => { if (!isDeleteConfirm) { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'none'; }}}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Verwijder bevestiging */}
                                        {isDeleteConfirm && (
                                            <tr key={task.id + '_del'}>
                                                <td colSpan={6} style={{ padding: '0 10px 12px 10px', background: '#fef2f2', borderBottom: '2px solid #fecaca' }}>
                                                    <div style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fff5f5', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: attachments.length > 0 ? '6px' : '0' }}>
                                                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '0.9rem' }} />
                                                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#991b1b' }}>Taak &quot;{task.name}&quot; verwijderen?</span>
                                                            </div>
                                                            {attachments.length > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#fee2e2', borderRadius: '7px', marginTop: '4px' }}>
                                                                    <i className="fa-solid fa-paperclip" style={{ color: '#ef4444', fontSize: '0.75rem' }} />
                                                                    <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
                                                                        Let op: deze taak heeft {attachments.length} bijlage{attachments.length > 1 ? 'n' : ''} — die worden ook verwijderd!
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                                                                <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }} />
                                                                Je kunt de taak altijd opnieuw toevoegen via het sjablonenpaneel rechts.
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                                            <button onClick={() => setDeleteConfirmTask(null)}
                                                                style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                                Annuleren
                                                            </button>
                                                            <button onClick={() => { saveProject({ ...project, tasks: project.tasks.filter(t => t.id !== task.id) }); setDeleteConfirmTask(null); }}
                                                                style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                                                                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}>
                                                                <i className="fa-solid fa-trash" style={{ marginRight: '5px' }} />
                                                                Ja, verwijderen
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {/* Bijlagen paneel */}
                                        {isAttachOpen && (() => {
                                            const isDragOver = dragOverTask === task.id;
                                            return (
                                            <tr key={task.id + '_attach'}>
                                                <td colSpan={6} style={{ padding: '0 10px 12px', background: '#fffbf5', borderBottom: '1px solid #fed7aa' }}>
                                                    <div
                                                        onDragEnter={e => { e.preventDefault(); setDragOverTask(task.id); }}
                                                        onDragOver={e => { e.preventDefault(); setDragOverTask(task.id); }}
                                                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverTask(null); }}
                                                        onDrop={e => { e.preventDefault(); setDragOverTask(null); if (e.dataTransfer.files?.length) handleFileUpload(task.id, e.dataTransfer.files); }}
                                                        style={{
                                                            padding: isDragOver ? '8px' : '12px',
                                                            borderRadius: '10px',
                                                            border: isDragOver ? '2px dashed #F5850A' : '1px dashed #fed7aa',
                                                            background: isDragOver ? 'rgba(245,133,10,0.04)' : '#fff',
                                                            boxShadow: isDragOver ? '0 0 0 3px rgba(245,133,10,0.15)' : 'none',
                                                            transition: 'all 0.15s ease',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {/* Drag overlay bericht */}
                                                        {isDragOver && (
                                                            <div style={{
                                                                position: 'absolute', inset: 0, borderRadius: '9px',
                                                                background: 'rgba(245,133,10,0.08)',
                                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                gap: '8px', zIndex: 10, pointerEvents: 'none'
                                                            }}>
                                                                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: '#F5850A', animation: 'bounce 0.6s infinite alternate' }} />
                                                                <span style={{ fontWeight: 700, color: '#F5850A', fontSize: '0.88rem' }}>Laat los om te uploaden</span>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: attachments.length > 0 ? '10px' : '0', opacity: isDragOver ? 0.3 : 1, transition: 'opacity 0.15s' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#F5850A', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                                                <i className="fa-solid fa-upload" /> Bestand uploaden
                                                                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.eml,.msg" style={{ display: 'none' }}
                                                                    onChange={e => { handleFileUpload(task.id, e.target.files); e.target.value = ''; }} />
                                                            </label>
                                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sleep bestanden hierheen of klik om te uploaden — Foto&apos;s, PDF, Word, Excel, E-mail</span>
                                                        </div>
                                                        {attachments.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', opacity: isDragOver ? 0.3 : 1, transition: 'opacity 0.15s' }}>
                                                                {attachments.map((att, ai) => {
                                                                    const isEml = att.type === 'message/rfc822';
                                                                    const isMsgBin = att.name?.toLowerCase().endsWith('.msg');
                                                                    const isImage = att.type.startsWith('image/');
                                                                    const fileIcon = isEml || isMsgBin ? 'fa-envelope' : att.type.includes('pdf') ? 'fa-file-pdf' : att.type.includes('word') || att.name.endsWith('.docx') || att.name.endsWith('.doc') ? 'fa-file-word' : att.type.includes('sheet') || att.name.endsWith('.xlsx') ? 'fa-file-excel' : 'fa-file';
                                                                    const iconColor = isEml || isMsgBin ? '#2563eb' : att.type.includes('pdf') ? '#ef4444' : att.type.includes('word') || att.name.endsWith('.docx') ? '#2563eb' : att.type.includes('sheet') ? '#16a34a' : '#64748b';
                                                                    return (
                                                                        <div key={ai} style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                                                            {isImage ? (
                                                                                <button onClick={() => setPreviewAtt(att)} style={{ border: 'none', padding: 0, background: 'none', cursor: 'zoom-in', display: 'block' }}>
                                                                                    <img src={att.data} alt={att.name} style={{ width: '72px', height: '72px', objectFit: 'cover', display: 'block' }} />
                                                                                </button>
                                                                            ) : (
                                                                                <button onClick={() => setPreviewAtt(att)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', border: 'none', background: 'none', cursor: 'pointer', gap: '4px' }}>
                                                                                    <i className={`fa-solid ${fileIcon}`} style={{ fontSize: '1.6rem', color: iconColor }} />
                                                                                    <span style={{ fontSize: '0.55rem', color: '#64748b', textAlign: 'center', padding: '0 4px', lineHeight: 1.2, overflow: 'hidden', maxWidth: '68px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{att.name}</span>
                                                                                </button>
                                                                            )}
                                                                            <button onClick={() => removeAttachment(task.id, ai)}
                                                                                style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer', fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <i className="fa-solid fa-xmark" />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })()}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                    {/* Rechter kolom: sjablonen zijpaneel */}
                    <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-layer-group" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Sjablonen</span>
                        </div>
                        {TAAK_TEMPLATES.map((tmpl, ti) => {
                            const isOpen = !!expandedTemplates[ti];
                            const today = project.startDate || new Date().toISOString().split('T')[0];
                            const addAllFromTemplate = () => {
                                const newTasks = tmpl.taken.map((naam, i) => ({
                                    id: 't' + Date.now() + i,
                                    name: naam,
                                    startDate: today,
                                    endDate: project.endDate || today,
                                    assignedTo: [],
                                    completed: false,
                                    kanbanStatus: 'todo',
                                    category: tmpl.naam,
                                }));
                                saveProject({ ...project, tasks: [...project.tasks, ...newTasks] });
                            };
                            const addOneTask = (naam, i) => {
                                const t = {
                                    id: 't' + Date.now() + i,
                                    name: naam,
                                    startDate: today,
                                    endDate: project.endDate || today,
                                    assignedTo: [],
                                    completed: false,
                                    kanbanStatus: 'todo',
                                    category: tmpl.naam,
                                };
                                saveProject({ ...project, tasks: [...project.tasks, t] });
                            };
                            return (
                                <div key={ti} style={{ borderBottom: ti < TAAK_TEMPLATES.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                    <button onClick={() => toggleTemplate(ti)}
                                        style={{ width: '100%', padding: '10px 16px', border: 'none', background: isOpen ? '#fffbf5' : 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}>
                                        <span style={{ fontSize: '0.95rem', flexShrink: 0, width: '22px', textAlign: 'center' }}>{tmpl.emoji || '📋'}</span>
                                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.8rem', color: '#1e293b' }}>{tmpl.naam.includes(' ') ? tmpl.naam.slice(tmpl.naam.indexOf(' ') + 1) : tmpl.naam}</span>
                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginRight: '2px' }}>{tmpl.taken.length}</span>
                                        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.6rem', color: '#94a3b8' }} />
                                    </button>
                                    {isOpen && (
                                        <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                            {tmpl.taken.map((naam, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px 6px 22px', borderBottom: i < tmpl.taken.length - 1 ? '1px solid #f9fafb' : 'none', background: '#fafbfc' }}>
                                                    <span style={{ flex: 1, fontSize: '0.75rem', color: '#475569', lineHeight: 1.3 }}>{naam}</span>
                                                    <button onClick={() => addOneTask(naam, i)} title="Voeg toe"
                                                        style={{ width: '20px', height: '20px', borderRadius: '5px', border: 'none', background: '#F5850A1a', color: '#F5850A', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#F5850A30'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#F5850A1a'}>
                                                        <i className="fa-solid fa-plus" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                                                <button onClick={addAllFromTemplate}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '7px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.73rem', cursor: 'pointer' }}>
                                                    + Alles toevoegen ({tmpl.taken.length})
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}

            {/* ===== NOTITIES ===== */}
            {activeTab === 'notities' && (
                <div>
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-pen" style={{ color: '#F5850A' }} /> Nieuwe notitie
                        </h3>
                        <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Schrijf een notitie..." rows={3}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                        {/* Collega melding */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 0', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '1.1rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Meld collega:</span>
                            <select value={notifyUserId} onChange={e => setNotifyUserId(e.target.value)}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', color: notifyUserId ? '#1e293b' : '#94a3b8', cursor: 'pointer' }}>
                                <option value="">— Geen melding —</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                            {notifyUserId && (
                                <span style={{ fontSize: '0.72rem', color: '#25D366', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                    <i className="fa-solid fa-circle-check" /> Via WhatsApp
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {Object.entries(NOTE_TYPES).map(([key, cfg]) => (
                                    <button key={key} onClick={() => setNoteType(key)} style={{ padding: '5px 12px', borderRadius: '20px', border: `2px solid ${noteType === key ? cfg.color : 'transparent'}`, background: noteType === key ? cfg.bg : '#f8fafc', color: noteType === key ? cfg.color : '#64748b', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                                        <i className={`fa-solid ${cfg.icon}`} /> {cfg.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={addNote} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-plus" /> Opslaan
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {notes.map(note => {
                            const cfg = NOTE_TYPES[note.type] || NOTE_TYPES.info;
                            return (
                                <div key={note.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: `1px solid ${cfg.color}22`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fa-solid ${cfg.icon}`} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</span>
                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{note.author} · {formatDate(note.date)}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.5 }}>{note.text || note.content}</p>
                                        {note.photo && (
                                            <div style={{ marginTop: '10px' }}>
                                                <button onClick={() => setPreviewAtt({ data: note.photo, name: 'Notitie bewijs', type: 'image/jpeg' })} 
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    <i className="fa-solid fa-image" /> Foto openen
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', fontSize: '0.85rem', alignSelf: 'flex-start', borderRadius: '6px', transition: 'color 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </div>
                            );
                        })}
                        {notes.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px', margin: 0 }}>Nog geen notities</p>}
                    </div>
                </div>
            )}

            {/* ===== FINANCIËN ===== */}
            {activeTab === 'financien' && (() => {
                const pctBetaald = gefactureerd > 0 ? Math.round((betaald / gefactureerd) * 100) : 0;
                const pctOfferte = offerte > 0 ? Math.round((gefactureerd / offerte) * 100) : 0;
                const today = new Date().toISOString().split('T')[0];

                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* ── Samenvattingskaarten ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {[
                            { label: 'Offerte totaal', value: offerte, color: '#3b82f6', bg: '#eff6ff', icon: 'fa-file-invoice' },
                            { label: 'Gefactureerd', value: gefactureerd, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: 'fa-receipt' },
                            { label: 'Betaald', value: betaald, color: '#10b981', bg: '#f0fdf4', icon: 'fa-circle-check' },
                            { label: 'Openstaand', value: openstaand, color: openstaand > 0 ? '#ef4444' : '#16a34a', bg: openstaand > 0 ? '#fef2f2' : '#f0fdf4', icon: openstaand > 0 ? 'fa-clock' : 'fa-check' },
                        ].map((c, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className={`fa-solid ${c.icon}`} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{c.label}</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: c.color }}>€{c.value.toLocaleString('nl-NL')}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Voortgangsbalken ── */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                <span><i className="fa-solid fa-receipt" style={{ marginRight: '5px', color: '#8b5cf6' }} />Gefactureerd van offerte</span>
                                <span style={{ color: '#8b5cf6' }}>{pctOfferte}% — €{gefactureerd.toLocaleString('nl-NL')} / €{offerte.toLocaleString('nl-NL')}</span>
                            </div>
                            <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(pctOfferte, 100)}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                <span><i className="fa-solid fa-circle-check" style={{ marginRight: '5px', color: '#10b981' }} />Betaald van gefactureerd</span>
                                <span style={{ color: '#10b981' }}>{pctBetaald}% — €{betaald.toLocaleString('nl-NL')} / €{gefactureerd.toLocaleString('nl-NL')}</span>
                            </div>
                            <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(pctBetaald, 100)}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                            </div>
                        </div>
                    </div>

                    {/* ── Termijnenstaat tabel ── */}
                    <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-list-ol" style={{ color: '#F5850A', fontSize: '1rem' }} />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Termijnenstaat</span>
                                <span style={{ background: '#fff7ed', color: '#F5850A', fontWeight: 700, fontSize: '0.72rem', padding: '2px 8px', borderRadius: '20px' }}>{termijnen.length} termijnen</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* Scan-knop */}
                                <label style={{ padding: '7px 14px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                    title="Scan een PDF of foto van een termijnenstaat">
                                    {scanStatus === 'scanning'
                                        ? <><i className="fa-solid fa-spinner fa-spin" /> Scannen...</>
                                        : <><i className="fa-solid fa-camera" /> Scan importeren</>
                                    }
                                    <input ref={scanInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                                        onChange={e => { if (e.target.files[0]) scanTermijnDoc(e.target.files[0]); e.target.value = ''; }} />
                                </label>
                                <button onClick={() => setShowAddTermijn(v => !v)}
                                    style={{ padding: '7px 14px', borderRadius: '9px', border: 'none', background: showAddTermijn ? '#f1f5f9' : '#F5850A', color: showAddTermijn ? '#64748b' : '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className={`fa-solid ${showAddTermijn ? 'fa-xmark' : 'fa-plus'}`} />
                                    {showAddTermijn ? 'Annuleren' : 'Termijn toevoegen'}
                                </button>
                            </div>
                        </div>

                        {/* Toevoeg-formulier */}
                        {showAddTermijn && (
                            <div style={{ padding: '16px 20px', background: '#fffbf5', borderBottom: '1px solid #fed7aa' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Omschrijving *</label>
                                        <input value={newTermijn.omschrijving} onChange={e => setNewTermijn(p => ({ ...p, omschrijving: e.target.value }))}
                                            placeholder="bijv. Aanbetaling, Termijn 2..."
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Bedrag (€) *</label>
                                        <input type="number" value={newTermijn.bedrag} onChange={e => setNewTermijn(p => ({ ...p, bedrag: e.target.value }))}
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>% van offerte</label>
                                        <input type="number" value={newTermijn.percentage} onChange={e => setNewTermijn(p => ({ ...p, percentage: e.target.value }))}
                                            placeholder="bijv. 30"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Termijn aanvraagdatum</label>
                                        <input type="date" value={newTermijn.datum} onChange={e => setNewTermijn(p => ({ ...p, datum: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Vervaldatum</label>
                                        <input type="date" value={newTermijn.vervaldatum} onChange={e => setNewTermijn(p => ({ ...p, vervaldatum: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Factuurnummer</label>
                                        <input value={newTermijn.factuurNr} onChange={e => setNewTermijn(p => ({ ...p, factuurNr: e.target.value }))}
                                            placeholder={`F-${new Date().getFullYear()}-00${termijnen.length + 1}`}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }} />
                                    </div>
                                </div>
                                <button onClick={addTermijn}
                                    style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Termijn opslaan
                                </button>
                            </div>
                        )}

                        {/* Termijnen rijen */}
                        {termijnen.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <i className="fa-solid fa-file-invoice" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }} />
                                <p style={{ margin: 0, fontSize: '0.88rem' }}>Nog geen termijnen toegevoegd</p>
                            </div>
                        ) : (
                            <div>
                                {/* Tabel-header */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr 80px', gap: 0, padding: '8px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                    {['Omschrijving', 'Termijn aanvraagdatum', 'Vervaldatum', 'Bedrag', 'Status', ''].map(h => (
                                        <div key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                                    ))}
                                </div>

                                {termijnen.map((t, idx) => {
                                    const isOverdue = !t.betaald && t.vervaldatum && t.vervaldatum < today;
                                    const statusColor = t.betaald ? '#10b981' : isOverdue ? '#ef4444' : '#f59e0b';
                                    const statusBg = t.betaald ? '#f0fdf4' : isOverdue ? '#fef2f2' : '#fffbeb';
                                    const statusLabel = t.betaald ? 'Betaald' : isOverdue ? 'Verlopen' : 'Openstaand';
                                    const statusIcon = t.betaald ? 'fa-circle-check' : isOverdue ? 'fa-circle-exclamation' : 'fa-clock';

                                    return (
                                        <div key={t.id} style={{
                                            display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr 80px',
                                            alignItems: 'center', padding: '14px 20px',
                                            borderBottom: idx < termijnen.length - 1 ? '1px solid #f8fafc' : 'none',
                                            background: t.betaald ? '#fafffe' : isOverdue ? '#fffafa' : '#fff',
                                            transition: 'background 0.15s',
                                        }}>
                                            {/* Omschrijving */}
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                    <span style={{ fontSize: '0.5rem', width: '18px', height: '18px', borderRadius: '50%', background: '#fff7ed', color: '#F5850A', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #fed7aa' }}>{idx + 1}</span>
                                                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{t.omschrijving}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '26px' }}>
                                                    {t.factuurNr && <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{t.factuurNr}</span>}
                                                    {t.percentage > 0 && <span style={{ fontSize: '0.68rem', color: '#F5850A', fontWeight: 700, background: '#fff7ed', padding: '1px 6px', borderRadius: '10px' }}>{t.percentage}%</span>}
                                                    {t.betaald && t.betaaldatum && <span style={{ fontSize: '0.68rem', color: '#10b981' }}>✓ betaald {formatDate(t.betaaldatum)}</span>}
                                                </div>
                                            </div>

                                            {/* Termijn aanvraagdatum */}
                                            <div style={{ fontSize: '0.82rem', color: '#475569' }}>{formatDate(t.datum)}</div>

                                            {/* Vervaldatum */}
                                            <div style={{ fontSize: '0.82rem', color: isOverdue ? '#ef4444' : '#475569', fontWeight: isOverdue ? 700 : 400 }}>
                                                {formatDate(t.vervaldatum)}
                                                {isOverdue && <div style={{ fontSize: '0.65rem', color: '#ef4444' }}>⚠ verlopen</div>}
                                            </div>

                                            {/* Bedrag */}
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>€{t.bedrag.toLocaleString('nl-NL')}</div>

                                            {/* Status toggle knop */}
                                            <button onClick={() => toggleTermijn(t.id)} style={{
                                                padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                                fontWeight: 700, fontSize: '0.75rem', background: statusBg, color: statusColor,
                                                display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s', width: 'fit-content'
                                            }}>
                                                <i className={`fa-solid ${statusIcon}`} />
                                                {statusLabel}
                                            </button>

                                            {/* Verwijder */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                                <button onClick={() => deleteTermijn(t.id)}
                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Verwijderen">
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Totaalrij */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr 80px', alignItems: 'center', padding: '12px 20px', borderTop: '2px solid #f1f5f9', background: '#f8fafc' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', gridColumn: 'span 3' }}>Totaal ({termijnen.length} termijnen)</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>€{gefactureerd.toLocaleString('nl-NL')}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>€{betaald.toLocaleString('nl-NL')} betaald</div>
                                    <div />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}


            {/* ===== MEERWERK SECTIE ===== */}
            {activeTab === 'financien' && (() => {
                const mwGoedgekeurd = meerwerk.filter(m => m.status === 'goedgekeurd').reduce((s, m) => s + m.bedrag, 0);
                const mwAanvraag   = meerwerk.filter(m => m.status === 'aanvraag').reduce((s, m) => s + m.bedrag, 0);
                const STATUS_MW = {
                    aanvraag:    { label: 'In aanvraag',  color: '#f59e0b', bg: '#fffbeb', icon: 'fa-hourglass-half' },
                    goedgekeurd: { label: 'Goedgekeurd',  color: '#10b981', bg: '#f0fdf4', icon: 'fa-circle-check' },
                    afgewezen:   { label: 'Afgewezen',    color: '#ef4444', bg: '#fef2f2', icon: 'fa-circle-xmark' },
                };
                return (
                    <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', overflow: 'hidden', marginTop: '16px' }}>
                        {/* Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fffbf5' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-circle-plus" style={{ color: '#F5850A', fontSize: '1rem' }} />
                                </div>
                                <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Extra werk</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        {meerwerk.length === 0 ? 'Nog geen extra werk geregistreerd' : `${meerwerk.length} item${meerwerk.length !== 1 ? 's' : ''} · €${mwGoedgekeurd.toLocaleString('nl-NL')} goedgekeurd${mwAanvraag > 0 ? ` · €${mwAanvraag.toLocaleString('nl-NL')} in aanvraag` : ''}`}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowAddMeerwerk(v => !v)}
                                style={{ padding: '7px 14px', borderRadius: '9px', border: 'none', background: showAddMeerwerk ? '#f1f5f9' : '#F5850A', color: showAddMeerwerk ? '#64748b' : '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className={`fa-solid ${showAddMeerwerk ? 'fa-xmark' : 'fa-plus'}`} />
                                {showAddMeerwerk ? 'Annuleren' : 'Extra werk toevoegen'}
                            </button>
                        </div>

                        {/* Toevoeg-formulier */}
                        {showAddMeerwerk && (
                            <div style={{ padding: '16px 20px', background: '#fffbf5', borderBottom: '1px solid #fed7aa' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Omschrijving extra werk *</label>
                                        <input value={newMeerwerk.omschrijving} onChange={e => setNewMeerwerk(p => ({ ...p, omschrijving: e.target.value }))}
                                            placeholder="bijv. Extra schilderwerk badkamer..."
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Extra uren</label>
                                        <input type="number" min="0" step="0.5" value={newMeerwerk.uren} onChange={e => setNewMeerwerk(p => ({ ...p, uren: e.target.value }))}
                                            placeholder="0.0"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Bedrag (€) *</label>
                                        <input type="number" min="0" step="0.01" value={newMeerwerk.bedrag} onChange={e => setNewMeerwerk(p => ({ ...p, bedrag: e.target.value }))}
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Toelichting / reden</label>
                                        <input value={newMeerwerk.toelichting} onChange={e => setNewMeerwerk(p => ({ ...p, toelichting: e.target.value }))}
                                            placeholder="Beschrijf waarom dit meerwerk nodig is..."
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Datum</label>
                                        <input type="date" value={newMeerwerk.datum} onChange={e => setNewMeerwerk(p => ({ ...p, datum: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                <button onClick={addMeerwerkItem}
                                    style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Extra werk opslaan
                                </button>
                            </div>
                        )}

                        {/* Lijst */}
                        {meerwerk.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                                <i className="fa-solid fa-circle-plus" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.4 }} />
                                <p style={{ margin: 0, fontSize: '0.88rem' }}>Nog geen extra werk geregistreerd</p>
                            </div>
                        ) : (
                            <div>
                                {/* Tabel header */}
                                <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.1fr 220px', gap: 0, padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                                    <div>
                                        <input type="checkbox"
                                            checked={meerwerkSelectie.length === meerwerk.length && meerwerk.length > 0}
                                            onChange={selectAllMeerwerk}
                                            title="Alles selecteren"
                                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#F5850A' }}
                                        />
                                    </div>
                                    {['Omschrijving', 'Uren', 'Bedrag', 'Status', ''].map(h => (
                                        <div key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                                    ))}
                                </div>

                                {meerwerk.map((m, idx) => {
                                    const sc = STATUS_MW[m.status] || STATUS_MW.aanvraag;
                                    const emailSt = meerwerkEmailStatus[m.id];
                                    const isSelected = meerwerkSelectie.includes(m.id);
                                    return (
                                        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.1fr 220px', alignItems: 'center', padding: '14px 20px', borderTop: idx === 0 ? 'none' : '1px solid #f8fafc', background: isSelected ? '#fff7ed' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}>
                                            {/* Checkbox */}
                                            <div>
                                                <input type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleMeerwerkSelectie(m.id)}
                                                    style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#F5850A' }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{m.omschrijving}</div>
                                                {m.toelichting && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{m.toelichting}</div>}
                                                <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '2px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                    <span>{m.datum}</span>
                                                    {m.emailVerzonden && <span style={{ color: '#3b82f6' }}>· email verzonden {m.emailVerzonden}</span>}
                                                    {m.akkoordDatum && <span style={{ color: '#10b981' }}>· akkoord {m.akkoordDatum}</span>}
                                                    {m.foto && (
                                                        <button onClick={() => setPreviewAtt({ data: m.foto, name: 'Meerwerk bewijs', type: 'image/jpeg' })} 
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                            <i className="fa-solid fa-image" /> Foto openen
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                                                {m.uren > 0 ? `${m.uren}u` : '—'}
                                            </div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                                                €{m.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                                            </div>
                                            <div>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: 700 }}>
                                                    <i className={`fa-solid ${sc.icon}`} />{sc.label}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {/* Status-knoppen */}
                                                {m.status === 'aanvraag' && (
                                                    <>
                                                        <button onClick={() => updateMeerwerkStatus(m.id, 'goedgekeurd')}
                                                            title="Markeer als goedgekeurd"
                                                            style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                                                            <i className="fa-solid fa-check" />
                                                        </button>
                                                        <button onClick={() => updateMeerwerkStatus(m.id, 'afgewezen')}
                                                            title="Markeer als afgewezen"
                                                            style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    </>
                                                )}
                                                {m.status !== 'aanvraag' && (
                                                    <button onClick={() => updateMeerwerkStatus(m.id, 'aanvraag')}
                                                        title="Terugzetten naar In aanvraag"
                                                        style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                                                        <i className="fa-solid fa-rotate-left" />
                                                    </button>
                                                )}
                                                {/* Email akkoord knop */}
                                                <button onClick={() => sendMeerwerkEmail(m)}
                                                    disabled={emailSt === 'sending'}
                                                    title={project?.email ? `Akkoordverzoek sturen naar ${project.email}` : 'Geen e-mail van klant bekend'}
                                                    style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: emailSt === 'sent' ? '#dcfce7' : emailSt === 'error' ? '#fee2e2' : '#dbeafe', color: emailSt === 'sent' ? '#16a34a' : emailSt === 'error' ? '#dc2626' : '#2563eb', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <i className={`fa-solid ${emailSt === 'sending' ? 'fa-spinner fa-spin' : emailSt === 'sent' ? 'fa-check' : emailSt === 'error' ? 'fa-triangle-exclamation' : 'fa-envelope'}`} />
                                                    {emailSt === 'sending' ? 'Sturen...' : emailSt === 'sent' ? 'Verzonden' : emailSt === 'error' ? 'Fout' : 'Akkoord'}
                                                </button>
                                                {/* Verwijderen */}
                                                <button onClick={() => deleteMeerwerkItem(m.id)}
                                                    title="Verwijderen"
                                                    style={{ padding: '5px 8px', borderRadius: '7px', border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Selectie-actiebalk */}
                                {meerwerkSelectie.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', background: 'linear-gradient(135deg,#fff7ed,#fffbf5)', borderTop: '2px solid #fdba74', borderBottom: '1px solid #fed7aa' }}>
                                        <i className="fa-solid fa-check-square" style={{ color: '#F5850A', fontSize: '1rem' }} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                                            {meerwerkSelectie.length} item{meerwerkSelectie.length !== 1 ? 's' : ''} geselecteerd
                                            &nbsp;·&nbsp;
                                            €{geselecteerdeItems.reduce((s, m) => s + m.bedrag, 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                                        </span>
                                        <button onClick={sendMeerwerkBulk}
                                            style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <i className="fa-solid fa-paper-plane" />
                                            Verstuur geselecteerde ({meerwerkSelectie.length})
                                        </button>
                                        <button onClick={() => setMeerwerkSelectie([])}
                                            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #fed7aa', background: '#fff', color: '#92400e', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                            Deselecteer
                                        </button>
                                    </div>
                                )}

                                {/* Totaalrij */}
                                <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.1fr 220px', alignItems: 'center', padding: '12px 20px', borderTop: '2px solid #f1f5f9', background: '#f8fafc' }}>
                                    <div />
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', gridColumn: 'span 2' }}>Totaal extra werk ({meerwerk.length})</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>€{meerwerk.reduce((s, m) => s + m.bedrag, 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>€{mwGoedgekeurd.toLocaleString('nl-NL')} goedgekeurd</div>
                                    <div />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}



            {(scanStatus === 'confirm' || scanStatus === 'error') && (
                <div onClick={() => setScanStatus(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '18px', width: '680px', maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

                        {/* Modal header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: scanStatus === 'error' ? '#fef2f2' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`fa-solid ${scanStatus === 'error' ? 'fa-triangle-exclamation' : 'fa-camera'}`}
                                    style={{ color: scanStatus === 'error' ? '#ef4444' : '#F5850A', fontSize: '1.1rem' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                                    {scanStatus === 'error' ? 'Geen termijnen herkend' : `${scanResult.length} termijn${scanResult.length !== 1 ? 'en' : ''} herkend`}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                    {scanStatus === 'error'
                                        ? 'Het document bevat geen herkenbare bedragen of termijnen. Controleer de scan of voeg handmatig toe.'
                                        : 'Controleer de herkende termijnen en pas ze eventueel aan voordat je importeert.'}
                                </div>
                            </div>
                            <button onClick={() => setScanStatus(null)}
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        {scanStatus === 'error' ? (
                            <div style={{ padding: '40px 24px', textAlign: 'center', flex: 1 }}>
                                <i className="fa-solid fa-file-circle-question" style={{ fontSize: '3rem', color: '#cbd5e1', display: 'block', marginBottom: '16px' }} />
                                {scanRawText && (
                                    <details style={{ textAlign: 'left', marginTop: '16px' }}>
                                        <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Bekijk herkende tekst</summary>
                                        <pre style={{ marginTop: '8px', fontSize: '0.7rem', color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflow: 'auto', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{scanRawText}</pre>
                                    </details>
                                )}
                                <button onClick={() => setScanStatus(null)}
                                    style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    Sluiten
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Gevonden termijnen */}
                                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {scanResult.map((t, idx) => (
                                        <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff7ed', border: '1px solid #fed7aa', color: '#F5850A', fontWeight: 800, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                                                <input value={t.omschrijving}
                                                    onChange={e => setScanResult(prev => prev.map((x, xi) => xi === idx ? { ...x, omschrijving: e.target.value } : x))}
                                                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, outline: 'none', background: '#fff' }} />
                                                <button onClick={() => setScanResult(prev => prev.filter((_, xi) => xi !== idx))}
                                                    style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginLeft: '32px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '3px' }}>BEDRAG (€)</label>
                                                    <input type="number" value={t.bedrag}
                                                        onChange={e => setScanResult(prev => prev.map((x, xi) => xi === idx ? { ...x, bedrag: parseFloat(e.target.value) || 0 } : x))}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, outline: 'none', background: '#fff' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '3px' }}>AANVRAAGDATUM</label>
                                                    <input type="date" value={t.datum}
                                                        onChange={e => setScanResult(prev => prev.map((x, xi) => xi === idx ? { ...x, datum: e.target.value } : x))}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', background: '#fff' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '3px' }}>FACTUURNR</label>
                                                    <input value={t.factuurNr}
                                                        onChange={e => setScanResult(prev => prev.map((x, xi) => xi === idx ? { ...x, factuurNr: e.target.value } : x))}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', background: '#fff' }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                        Totaal herkend: <strong style={{ color: '#1e293b' }}>€{scanResult.reduce((s, t) => s + (t.bedrag || 0), 0).toLocaleString('nl-NL')}</strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setScanStatus(null)}
                                            style={{ padding: '9px 18px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                            Annuleren
                                        </button>
                                        <button onClick={importScanResult}
                                            style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="fa-solid fa-file-import" /> {scanResult.length} termijn{scanResult.length !== 1 ? 'en' : ''} importeren
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ===== BEWAKING ===== */}
            {activeTab === 'bewaking' && (() => {
                const today = new Date();
                const startD = new Date(project.startDate + 'T00:00:00');
                const endD   = new Date(project.endDate   + 'T00:00:00');
                const totalDays  = Math.max(1, Math.ceil((endD - startD) / 86400000));
                const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((today - startD) / 86400000)));
                const planPct    = Math.round((elapsedDays / totalDays) * 100);
                const taskPct    = progress; // % taken afgerond
                const planDelay  = taskPct < planPct - 10; // >10% achter op planning
                const planAhead  = taskPct > planPct + 10;

                const budgetPct  = offerte > 0 ? Math.round((gefactureerd / offerte) * 100) : 0;
                const overBudget = gefactureerd > offerte * 1.05; // >5% over offerte
                const nearBudget = !overBudget && gefactureerd > offerte * 0.9;

                const urenPct    = project.estimatedHours > 0 ? Math.round((werkelijkeUren / project.estimatedHours) * 100) : 0;
                const overUren   = werkelijkeUren > project.estimatedHours * 1.1;
                const nearUren   = !overUren && werkelijkeUren > project.estimatedHours * 0.85;

                const kwalPct    = kwaliteitsChecks.length > 0 ? Math.round((kwaliteitsChecks.filter(k => k.done).length / kwaliteitsChecks.length) * 100) : 0;
                const kwalOk     = kwalPct === 100;

                const rag = (bad, warn) => bad ? '🔴' : warn ? '🟡' : '🟢';
                const ragColor = (bad, warn) => bad ? '#ef4444' : warn ? '#f59e0b' : '#10b981';
                const ragBg = (bad, warn) => bad ? '#fef2f2' : warn ? '#fffbeb' : '#f0fdf4';
                const ragLabel = (bad, warn) => bad ? 'Aandacht vereist' : warn ? 'Let op' : 'Op koers';

                // Automatische afwijkingsmeldingen
                const alerts = [];
                if (planDelay) alerts.push({ icon: 'fa-calendar-xmark', color: '#ef4444', bg: '#fef2f2', msg: `Planning loopt ${planPct - taskPct}% achter op schema. ${completedTasks}/${totalTasks} taken gereed.` });
                if (overBudget) alerts.push({ icon: 'fa-circle-exclamation', color: '#ef4444', bg: '#fef2f2', msg: `Gefactureerd (€${gefactureerd.toLocaleString('nl-NL')}) overschrijdt de offerte (€${offerte.toLocaleString('nl-NL')}) met ${Math.round((gefactureerd/offerte - 1)*100)}%.` });
                if (overUren) alerts.push({ icon: 'fa-clock', color: '#ef4444', bg: '#fef2f2', msg: `Werkelijke uren (${werkelijkeUren}u) overschrijden de schatting (${project.estimatedHours}u) met ${Math.round((werkelijkeUren/project.estimatedHours - 1)*100)}%.` });
                if (daysLeft < 0 && project.status !== 'completed') alerts.push({ icon: 'fa-flag', color: '#ef4444', bg: '#fef2f2', msg: `Project is ${Math.abs(daysLeft)} dagen over de geplande einddatum.` });
                if (nearBudget) alerts.push({ icon: 'fa-triangle-exclamation', color: '#f59e0b', bg: '#fffbeb', msg: `Budget bijna bereikt: ${budgetPct}% gefactureerd van offerte.` });
                if (nearUren)   alerts.push({ icon: 'fa-hourglass-half', color: '#f59e0b', bg: '#fffbeb', msg: `Uren bijna opgebruikt: ${urenPct}% van geschatte uren.` });
                if (planAhead)  alerts.push({ icon: 'fa-rocket', color: '#10b981', bg: '#f0fdf4', msg: `Project loopt voor op schema! Taken ${taskPct - planPct}% verder dan gepland.` });

                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* ── Afwijkingsmeldingen ── */}
                    {alerts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {alerts.map((a, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: a.bg, border: `1px solid ${a.color}22` }}>
                                    <i className={`fa-solid ${a.icon}`} style={{ color: a.color, fontSize: '1rem', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 500 }}>{a.msg}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {alerts.length === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '1.1rem' }} />
                            <span style={{ fontSize: '0.88rem', color: '#166534', fontWeight: 600 }}>Alles op koers — geen afwijkingen gedetecteerd</span>
                        </div>
                    )}

                    {/* ── RAG Statusoverzicht ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {[
                            { icon: 'fa-calendar-days', label: 'Planning', pct: taskPct, bad: planDelay, warn: !planDelay && taskPct < planPct - 5, sub: `${completedTasks}/${totalTasks} taken · dag ${elapsedDays}/${totalDays}` },
                            { icon: 'fa-euro-sign', label: 'Budget', pct: budgetPct, bad: overBudget, warn: nearBudget, sub: `€${gefactureerd.toLocaleString('nl-NL')} / €${offerte.toLocaleString('nl-NL')}` },
                            { icon: 'fa-clock', label: 'Uren', pct: urenPct, bad: overUren, warn: nearUren, sub: `${werkelijkeUren}u / ${project.estimatedHours}u geschat` },
                            { icon: 'fa-star-half-stroke', label: 'Kwaliteit', pct: kwalPct, bad: false, warn: kwalPct < 50, sub: `${kwaliteitsChecks.filter(k=>k.done).length}/${kwaliteitsChecks.length} checkpunten` },
                        ].map((card, i) => {
                            const c = ragColor(card.bad, card.warn);
                            const bg = ragBg(card.bad, card.warn);
                            return (
                                <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${card.bad ? '#fecaca' : card.warn ? '#fde68a' : '#f1f5f9'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                                <i className={`fa-solid ${card.icon}`} />
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569' }}>{card.label}</span>
                                        </div>
                                        <span style={{ fontSize: '1rem' }}>{rag(card.bad, card.warn)}</span>
                                    </div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: c, marginBottom: '4px' }}>{card.pct}%</div>
                                    <div style={{ height: '6px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', marginBottom: '6px' }}>
                                        <div style={{ height: '100%', width: `${Math.min(card.pct, 100)}%`, background: c, borderRadius: '999px', transition: 'width 0.6s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>{card.sub}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: c, marginTop: '4px' }}>{ragLabel(card.bad, card.warn)}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Planning & Budget detail naast elkaar ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Planning bewaking */}
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-calendar-days" style={{ color: '#F5850A' }} /> Planningsbewaking
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    { label: 'Tijdverloop', pct: planPct, color: '#3b82f6', sub: `Dag ${elapsedDays} van ${totalDays} (${planPct}%)` },
                                    { label: 'Taken gereed', pct: taskPct, color: taskPct < planPct - 10 ? '#ef4444' : '#10b981', sub: `${completedTasks} van ${totalTasks} taken (${taskPct}%)` },
                                ].map((row, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                                            <span>{row.label}</span><span style={{ color: row.color }}>{row.sub}</span>
                                        </div>
                                        <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(row.pct, 100)}%`, background: row.color, borderRadius: '999px', transition: 'width 0.6s' }} />
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                                    {[
                                        { label: 'Startdatum', value: formatDate(project.startDate), icon: 'fa-play' },
                                        { label: 'Einddatum', value: formatDate(project.endDate), icon: 'fa-flag-checkered' },
                                    ].map((item, i) => (
                                        <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
                                                <i className={`fa-solid ${item.icon}`} style={{ marginRight: '4px' }} />{item.label}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ background: daysLeft < 0 ? '#fef2f2' : daysLeft < 7 ? '#fffbeb' : '#f0fdf4', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className={`fa-solid ${daysLeft < 0 ? 'fa-circle-exclamation' : daysLeft < 7 ? 'fa-hourglass-half' : 'fa-calendar-check'}`}
                                        style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 7 ? '#f59e0b' : '#10b981' }} />
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: daysLeft < 0 ? '#ef4444' : daysLeft < 7 ? '#92400e' : '#166534' }}>
                                        {daysLeft < 0 ? `${Math.abs(daysLeft)} dagen over deadline` : daysLeft === 0 ? 'Oplevering vandaag!' : `${daysLeft} dagen resterend`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Uren bewaking */}
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-clock" style={{ color: '#F5850A' }} /> Urenbewaking
                                <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#94a3b8', marginLeft: '4px' }}>
                                    — automatisch uit urenregistratie
                                </span>
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: 'Geschatte uren', value: `${project.estimatedHours}u`, color: '#3b82f6', bg: '#eff6ff', icon: 'fa-hourglass', sub: 'Planning' },
                                        { label: 'Geboekte uren', value: `${werkelijkeUren}u`, color: overUren ? '#ef4444' : '#10b981', bg: overUren ? '#fef2f2' : '#f0fdf4', icon: 'fa-stopwatch', sub: `${urenPerPersoon.length} personen` },
                                    ].map((item, i) => (
                                        <div key={i} style={{ background: item.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                            <i className={`fa-solid ${item.icon}`} style={{ color: item.color, marginBottom: '4px', display: 'block' }} />
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{item.label}</div>
                                            <div style={{ fontSize: '0.6rem', color: item.color, fontWeight: 500, marginTop: '2px' }}>{item.sub}</div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                                        <span>Urenverbruik</span>
                                        <span style={{ color: overUren ? '#ef4444' : nearUren ? '#f59e0b' : '#10b981' }}>{urenPct}% van schatting</span>
                                    </div>
                                    <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(urenPct, 100)}%`, background: overUren ? '#ef4444' : nearUren ? '#f59e0b' : '#10b981', borderRadius: '999px', transition: 'width 0.6s' }} />
                                    </div>
                                </div>

                                {/* Per-medewerker breakdown */}
                                {urenPerPersoon.length > 0 ? (
                                    <div style={{ border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Medewerker / ZZP</span><span>Uren</span>
                                        </div>
                                        {urenPerPersoon.map((p, i) => {
                                            const avatarColors = ['#F5850A','#3b82f6','#10b981','#8b5cf6','#f59e0b','#06b6d4','#ef4444'];
                                            const ac = avatarColors[i % avatarColors.length];
                                            const pct = werkelijkeUren > 0 ? Math.round((p.uren / werkelijkeUren) * 100) : 0;
                                            return (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: ac, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem', flexShrink: 0 }}>
                                                        {(p.initials || p.name?.slice(0,2).toUpperCase())}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.role} · {p.weekBreakdown.length} {p.weekBreakdown.length === 1 ? 'week' : 'weken'}</div>
                                                        <div style={{ height: '4px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', marginTop: '4px' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, background: ac, borderRadius: '999px' }} />
                                                        </div>
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: ac, textAlign: 'right', flexShrink: 0 }}>
                                                        {p.uren}u
                                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>{pct}%</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '14px', background: '#f8fafc', borderRadius: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>
                                        <i className="fa-regular fa-clock" style={{ display: 'block', marginBottom: '4px', fontSize: '1.1rem' }} />
                                        Nog geen uren geboekt op dit project
                                    </div>
                                )}

                                {project.estimatedHours > 0 && (() => {
                                    const calcTarief = offerte / project.estimatedHours;
                                    const restUren   = Math.max(0, project.estimatedHours - werkelijkeUren);
                                    const restBudget = offerte - (werkelijkeUren * calcTarief);
                                    const budgetPerRestUur = restUren > 0 ? restBudget / restUren : null;
                                    const over = budgetPerRestUur !== null && budgetPerRestUur < calcTarief * 0.75;
                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                            {[
                                                { label: 'Calculatietarief', value: `€${calcTarief.toFixed(2)}/u`, sub: 'Offerte ÷ geschatte uren', color: '#3b82f6', icon: 'fa-calculator' },
                                                { label: 'Resterend', value: `${restUren.toFixed(1)}u`, sub: `van ${project.estimatedHours}u begroot`, color: restUren < project.estimatedHours * 0.1 ? '#ef4444' : '#64748b', icon: 'fa-hourglass-half' },
                                                { label: 'Budget/rest-uur', value: budgetPerRestUur !== null ? `€${budgetPerRestUur.toFixed(2)}/u` : '—', sub: 'Resterend budget ÷ rest-uren', color: over ? '#ef4444' : '#10b981', icon: 'fa-coins' },
                                            ].map((item, i) => (
                                                <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                                    <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: '0.75rem', marginBottom: '4px', display: 'block' }} />
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.58rem', color: '#94a3b8', marginTop: '1px' }}>{item.sub}</div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                            </div>
                        </div>
                    </div>


                    {/* ── Kwaliteitschecklist ── */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-clipboard-check" style={{ color: '#F5850A' }} /> Kwaliteitschecklist
                                <span style={{ background: kwalOk ? '#dcfce7' : '#fff7ed', color: kwalOk ? '#16a34a' : '#F5850A', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px' }}>
                                    {kwaliteitsChecks.filter(k => k.done).length}/{kwaliteitsChecks.length}
                                </span>
                            </h3>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                {kwalPct}% afgerond
                            </div>
                        </div>
                        <div style={{ height: '6px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', marginBottom: '14px' }}>
                            <div style={{ height: '100%', width: `${kwalPct}%`, background: kwalOk ? '#10b981' : '#F5850A', borderRadius: '999px', transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {kwaliteitsChecks.map(k => (
                                <button key={k.id} onClick={() => toggleKwaliteit(k.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                    borderRadius: '10px', border: `1px solid ${k.done ? '#bbf7d0' : '#e2e8f0'}`,
                                    background: k.done ? '#f0fdf4' : '#f8fafc', cursor: 'pointer', textAlign: 'left',
                                    transition: 'all 0.15s',
                                }}>
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                                        background: k.done ? '#10b981' : '#fff', border: `2px solid ${k.done ? '#10b981' : '#cbd5e1'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s',
                                    }}>
                                        {k.done && <i className="fa-solid fa-check" style={{ fontSize: '0.55rem', color: '#fff' }} />}
                                    </div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: k.done ? 600 : 500, color: k.done ? '#166534' : '#475569', textDecoration: k.done ? 'line-through' : 'none' }}>
                                        {k.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* ===== FOTO'S ===== */}
            {activeTab === 'fotos' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {['alle', 'voor', 'voortgang', 'na'].map(c => (
                                <button key={c} onClick={() => setPhotoFilter(c)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: photoFilter === c ? '#F5850A' : '#f1f5f9', color: photoFilter === c ? '#fff' : '#64748b', transition: 'all 0.15s', textTransform: 'capitalize' }}>{c === 'alle' ? 'Alle' : c.charAt(0).toUpperCase() + c.slice(1)}</button>
                            ))}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <i className="fa-solid fa-upload" /> Foto's uploaden
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </div>

                    {photos.filter(p => photoFilter === 'alle' || p.category === photoFilter).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', border: '2px dashed #e2e8f0' }}>
                            <i className="fa-solid fa-camera" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '12px', display: 'block' }} />
                            <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: '0.9rem' }}>Nog geen foto's toegevoegd</p>
                            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} /> Foto toevoegen
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {photos.filter(p => photoFilter === 'alle' || p.category === photoFilter).map(photo => (
                                <div key={photo.id} style={{ borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', position: 'relative', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.querySelector('.photo-overlay').style.opacity = '1'}
                                    onMouseLeave={e => e.currentTarget.querySelector('.photo-overlay').style.opacity = '0'}>
                                    <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                                    <div className="photo-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'flex-end', padding: '12px' }}>
                                        <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>{photo.name}</div>
                                    </div>
                                    <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, textTransform: 'capitalize' }}>{photo.category}</span>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(photo.date)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* ===== DOCUMENTEN ===== */}
            {activeTab === 'documenten' && (() => {
                const offerteNr = `SUK-${new Date().getFullYear()}-${String(id).padStart(4,'0')}`;
                const subtotaal = offertePosten.reduce((s, p) => s + (p.aantal * p.prijs), 0);
                const btw = subtotaal * 0.21;
                const totaal = subtotaal + btw;
                const saveOfferte = (updates = {}) => {
                    const data = { posten: offertePosten, status: offerteStatus, datum: offerteDatum, geldig: offerteGeldig, notes: offerteNotes, ...updates };
                    localStorage.setItem(`schildersapp_offerte_${id}`, JSON.stringify(data));
                };
                const statusFlow = [
                    { key: 'concept', label: 'Concept', icon: 'fa-pen', color: '#64748b', bg: '#f1f5f9' },
                    { key: 'verzonden', label: 'Verzonden', icon: 'fa-paper-plane', color: '#2563eb', bg: '#dbeafe' },
                    { key: 'geaccepteerd', label: 'Geaccepteerd', icon: 'fa-circle-check', color: '#16a34a', bg: '#dcfce7' },
                    { key: 'afgewezen', label: 'Afgewezen', icon: 'fa-circle-xmark', color: '#ef4444', bg: '#fef2f2' },
                ];
                const curStatus = statusFlow.find(s => s.key === offerteStatus) || statusFlow[0];
                const whatsappOfferte = () => {
                    const phone = String(project.phone || '').replace(/^0/, '31').replace(/[^0-9]/g, '');
                    if (!phone) return alert('Voer eerst een telefoonnummer in bij klantgegevens');
                    const msg = `Geachte ${project.client},\n\nHierbij stuur ik u offerte ${offerteNr} voor de schilderwerkzaamheden aan ${project.address}.\n\nTotaalbedrag: €${totaal.toLocaleString('nl-NL', {minimumFractionDigits:2})} incl. BTW\n\nDeze offerte is ${offerteGeldig} dagen geldig.\n\nMet vriendelijke groet,\nDS uit Katwijk\nwww.deschildersuitkatwijk.nl`;
                    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                };
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Document overzicht kaarten */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {/* Offerte kaart */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s' }}
                                onClick={() => setShowOfferteEdit(!showOfferteEdit)}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,133,10,0.12)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)'}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,133,10,0.1)', color: '#F5850A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                            <i className="fa-solid fa-file-invoice" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Offerte</div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{offerteNr}</div>
                                        </div>
                                    </div>
                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: curStatus.bg, color: curStatus.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className={`fa-solid ${curStatus.icon}`} /> {curStatus.label}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>€{totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>incl. 21% BTW · {offertePosten.length} posten</div>
                                    </div>
                                    <i className={`fa-solid ${showOfferteEdit ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#cbd5e1' }} />
                                </div>
                            </div>
                            {/* Modelovereenkomst kaart */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                        <i className="fa-solid fa-file-signature" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Modelovereenkomst</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>DBA Overeenkomst</div>
                                    </div>
                                </div>
                                <a href="/whatsapp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f0fdf4'}>
                                    <i className="fa-solid fa-arrow-up-right-from-square" /> Naar Contracten
                                </a>
                            </div>
                        </div>

                        {/* Offerte Builder */}
                        {showOfferteEdit && (
                            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                {/* Header toolbar */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#f8fafc' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginRight: 'auto' }}>✏️ Offerte bewerken — {offerteNr}</span>
                                    {/* Status flow */}
                                    {statusFlow.map(s => (
                                        <button key={s.key} onClick={() => { setOfferteStatus(s.key); saveOfferte({ status: s.key }); }}
                                            style={{ padding: '5px 11px', borderRadius: '20px', border: `2px solid ${offerteStatus === s.key ? s.color : 'transparent'}`, background: offerteStatus === s.key ? s.bg : '#f1f5f9', color: offerteStatus === s.key ? s.color : '#94a3b8', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}>
                                            <i className={`fa-solid ${s.icon}`} /> {s.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px' }}>
                                    {/* Datum + geldigheid */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', gridColumn: '1/-1', flexWrap: 'wrap' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Offertedatum</label>
                                            <input type="date" value={offerteDatum} onChange={e => { setOfferteDatum(e.target.value); saveOfferte({ datum: e.target.value }); }}
                                                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#f8fafc', outline: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Geldig (dagen)</label>
                                            <input type="number" value={offerteGeldig} onChange={e => { setOfferteGeldig(Number(e.target.value)); saveOfferte({ geldig: Number(e.target.value) }); }} min="1" max="90"
                                                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#f8fafc', outline: 'none', width: '80px' }} />
                                        </div>
                                    </div>

                                    {/* Posten tabel */}
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 80px 80px 90px 36px', gap: '6px', marginBottom: '8px', padding: '0 4px' }}>
                                            {['Omschrijving', 'Eenheid', 'Aantal', 'Prijs p/e', ''].map(h => (
                                                <span key={h} style={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                                            ))}
                                        </div>
                                        {offertePosten.map((post, idx) => (
                                            <div key={post.id} style={{ display: 'grid', gridTemplateColumns: 'auto 80px 80px 90px 36px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                                                <input value={post.omschrijving} onChange={e => { const p = offertePosten.map((x, i) => i === idx ? { ...x, omschrijving: e.target.value } : x); setOffertePosten(p); saveOfferte({ posten: p }); }}
                                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', background: '#f8fafc' }} />
                                                <select value={post.eenheid} onChange={e => { const p = offertePosten.map((x, i) => i === idx ? { ...x, eenheid: e.target.value } : x); setOffertePosten(p); saveOfferte({ posten: p }); }}
                                                    style={{ padding: '8px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#f8fafc', outline: 'none' }}>
                                                    {['ls', 'm²', 'm¹', 'st', 'uur'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <input type="number" value={post.aantal} onChange={e => { const p = offertePosten.map((x, i) => i === idx ? { ...x, aantal: parseFloat(e.target.value) || 0 } : x); setOffertePosten(p); saveOfferte({ posten: p }); }}
                                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', background: '#f8fafc' }} />
                                                <input type="number" value={post.prijs} onChange={e => { const p = offertePosten.map((x, i) => i === idx ? { ...x, prijs: parseFloat(e.target.value) || 0 } : x); setOffertePosten(p); saveOfferte({ posten: p }); }}
                                                    style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', background: '#f8fafc' }} />
                                                <button onClick={() => { const p = offertePosten.filter((_, i) => i !== idx); setOffertePosten(p); saveOfferte({ posten: p }); }}
                                                    style={{ width: '30px', height: '34px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                                <span style={{ gridColumn: '3/5', textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8', padding: '0 4px' }}>= €{(post.aantal * post.prijs).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                        <button onClick={() => { const p = [...offertePosten, { id: Date.now(), omschrijving: '', eenheid: 'ls', aantal: 1, prijs: 0 }]; setOffertePosten(p); saveOfferte({ posten: p }); }}
                                            style={{ padding: '7px 14px', borderRadius: '8px', border: '2px dashed #e2e8f0', background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5850A'; e.currentTarget.style.color = '#F5850A'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; }}>
                                            <i className="fa-solid fa-plus" /> Post toevoegen
                                        </button>
                                    </div>

                                    {/* Totalen */}
                                    <div style={{ gridColumn: '1/-1', borderTop: '2px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{ minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {[
                                                { label: 'Subtotaal ex. BTW', value: subtotaal, style: { color: '#1e293b' } },
                                                { label: 'BTW 21%', value: btw, style: { color: '#64748b' } },
                                            ].map(r => (
                                                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', ...r.style }}>
                                                    <span>{r.label}</span><span>€{r.value.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderTop: '2px solid #1e293b', paddingTop: '8px', marginTop: '4px' }}>
                                                <span>Totaal incl. BTW</span><span style={{ color: '#F5850A' }}>€{totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Opmerkingen */}
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Bijzonderheden / opmerkingen</label>
                                        <textarea value={offerteNotes} onChange={e => { setOfferteNotes(e.target.value); saveOfferte({ notes: e.target.value }); }} rows={2} placeholder="Bijv. betalingscondities, garantie, bijzonderheden..."
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                                    </div>

                                    {/* Acties */}
                                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                        <button onClick={() => window.print()}
                                            style={{ padding: '9px 18px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <i className="fa-solid fa-print" /> Afdrukken / PDF
                                        </button>
                                        <button onClick={whatsappOfferte}
                                            style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <i className="fa-brands fa-whatsapp" /> Stuur via WhatsApp
                                        </button>
                                        <button onClick={() => { setOfferteStatus('verzonden'); saveOfferte({ status: 'verzonden' }); whatsappOfferte(); }}
                                            style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <i className="fa-solid fa-paper-plane" /> Verzenden &amp; markeer als Verzonden
                                        </button>
                                    </div>
                                </div>

                                {/* Nabellen script banner */}
                                {offerteStatus === 'verzonden' && (
                                    <div style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', borderTop: '1px solid #bfdbfe', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <i className="fa-solid fa-phone" style={{ color: '#2563eb', fontSize: '1.1rem', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3767', marginBottom: '2px' }}>📞 Nabellen herinnering</div>
                                            <div style={{ fontSize: '0.78rem', color: '#4b76c8' }}>Offerte verzonden op {formatDate(offerteDatum)}. Bel 1-2 weken na verzending om te informeren of alles duidelijk is.</div>
                                        </div>
                                        {project.phone && (
                                            <a href={`tel:${project.phone}`} style={{ padding: '7px 14px', borderRadius: '8px', background: '#2563eb', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                <i className="fa-solid fa-phone" /> Bel nu
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );

    // ===== PREVIEW LIGHTBOX =====
    return (
        <>
            {mainContent}

            {/* ===== EMAIL CONTACT PICKER MODAL ===== */}
            {meerwerkEmailPicker && (
                <div onClick={() => setMeerwerkEmailPicker(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '18px', width: '420px', maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#F5850A,#e06b00)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-envelope" style={{ color: '#fff', fontSize: '1.1rem' }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Kies e-mailontvanger</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                                    {meerwerkEmailPicker === '_bulk_'
                                        ? `${geselecteerdeItems.length} meerwerk items geselecteerd`
                                        : `Extra werk: ${meerwerkEmailPicker?.omschrijving || ''}`
                                    }
                                </div>
                            </div>
                            <button onClick={() => setMeerwerkEmailPicker(null)}
                                style={{ marginLeft: 'auto', width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        {/* Contact lijst */}
                        <div style={{ padding: '16px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Selecteer ontvanger voor het akkoordverzoek:
                            </div>
                            {allEmailTargets.map(contact => (
                                <button key={contact.id}
                                    onClick={() => openCompose(
                                        meerwerkEmailPicker === '_bulk_' ? geselecteerdeItems : [meerwerkEmailPicker],
                                        contact
                                    )}
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', textAlign: 'left', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5850A'; e.currentTarget.style.background = '#fffbf5'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                        <i className="fa-solid fa-user" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{contact.naam}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.email}</div>
                                        {contact.telefoon && (
                                            <div style={{ fontSize: '0.72rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                <i className="fa-solid fa-phone" style={{ fontSize: '0.6rem', color: '#94a3b8' }} />
                                                {contact.telefoon}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: '#f1f5f9', color: '#64748b' }}>{contact.label}</span>
                                        {contact.telefoon && (
                                            <a href={`https://wa.me/${contact.telefoon.replace(/[^0-9]/g, '').replace(/^06/, '316')}`}
                                                target="_blank" rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                title={`WhatsApp naar ${contact.naam}`}
                                                style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
                                                <i className="fa-brands fa-whatsapp" />
                                            </a>
                                        )}
                                        <i className="fa-solid fa-paper-plane" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div style={{ padding: '10px 16px 16px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                            Extra contacten beheren via <strong>Overzicht → E-mailcontacten</strong>
                        </div>
                    </div>
                </div>
            )}


            {/* ===== EMAIL OPSTELLEN MODAL ===== */}
            {meerwerkCompose && (
                <div onClick={() => setMeerwerkCompose(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '18px', width: '520px', maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                        {/* Header */}
                        <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#F5850A,#e06b00)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-pen-to-square" style={{ color: '#fff', fontSize: '1.1rem' }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>E-mail opstellen</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                                    Aan: <strong>{meerwerkCompose.contact.naam}</strong> &lt;{meerwerkCompose.contact.email}&gt;
                                </div>
                            </div>
                            <button onClick={() => setMeerwerkCompose(null)}
                                style={{ marginLeft: 'auto', width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

                            {/* Van / CC / BCC tabel stijl */}
                            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px', fontSize: '13px' }}>
                                {/* Van */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ width: '52px', flexShrink: 0, padding: '9px 12px', fontWeight: 700, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid #f1f5f9' }}>Van</span>
                                    <input
                                        type="text"
                                        value={composeVanNaam}
                                        onChange={e => setComposeVanNaam(e.target.value)}
                                        placeholder="Naam afzender"
                                        style={{ flex: 1, padding: '9px 12px', border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                                    />
                                </div>
                                {/* Aan (readonly) */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                                    <span style={{ width: '52px', flexShrink: 0, padding: '9px 12px', fontWeight: 700, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid #f1f5f9' }}>Aan</span>
                                    <span style={{ padding: '9px 12px', color: '#1e293b', fontWeight: 500 }}>
                                        {meerwerkCompose.contact.naam} &lt;{meerwerkCompose.contact.email}&gt;
                                    </span>
                                </div>
                                {/* CC */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ width: '52px', flexShrink: 0, padding: '9px 12px', fontWeight: 700, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid #f1f5f9' }}>CC</span>
                                    <input
                                        type="email"
                                        value={composeCC}
                                        onChange={e => setComposeCC(e.target.value)}
                                        placeholder="cc@email.nl (optioneel, meerdere gescheiden door komma)"
                                        style={{ flex: 1, padding: '9px 12px', border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                                    />
                                </div>
                                {/* BCC */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ width: '52px', flexShrink: 0, padding: '9px 12px', fontWeight: 700, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px', borderRight: '1px solid #f1f5f9' }}>BCC</span>
                                    <input
                                        type="email"
                                        value={composeBCC}
                                        onChange={e => setComposeBCC(e.target.value)}
                                        placeholder="bcc@email.nl (wordt onthouden voor volgende keer)"
                                        style={{ flex: 1, padding: '9px 12px', border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}
                                    />
                                </div>
                            </div>

                            {/* Onderwerp */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                    Onderwerp
                                </label>
                                <input
                                    type="text"
                                    value={composeOntwerp}
                                    onChange={e => setComposeOntwerp(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = '#F5850A'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* Persoonlijk bericht */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                    Persoonlijk bericht <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '11px', color: '#94a3b8' }}>(optioneel — wordt boven de meerwerk details geplaatst)</span>
                                </label>
                                <textarea
                                    value={composeBericht}
                                    onChange={e => setComposeBericht(e.target.value)}
                                    rows={4}
                                    placeholder={`Geachte ${meerwerkCompose.contact.naam?.split(' ')[0] || 'heer/mevrouw'},\n\nHierbij sturen wij u een overzicht van het aanvullende werk...`}
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                                    onFocus={e => e.target.style.borderColor = '#F5850A'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* Meerwerk items preview */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', fontSize: '13px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 14px 6px' }}>
                                    {meerwerkCompose.items.length === 1 ? 'Meerwerk details' : `${meerwerkCompose.items.length} meerwerk items`} (vast, niet bewerkbaar hier)
                                </div>
                                {meerwerkCompose.items.map((item, i) => (
                                    <div key={item.id} style={{ borderTop: i === 0 ? '1px solid #e2e8f0' : '1px solid #f1f5f9', padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', maxWidth: '65%' }}>{item.omschrijving}</span>
                                            <span style={{ fontWeight: 800, color: '#92400e' }}>€ {Number(item.bedrag).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {item.toelichting && <div style={{ fontSize: '12px', color: '#64748b' }}>{item.toelichting}</div>}
                                        {item.uren > 0 && <div style={{ fontSize: '12px', color: '#64748b' }}>{item.uren} extra uren</div>}
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderTop: '2px solid #e2e8f0', background: '#fff' }}>
                                    <span style={{ fontWeight: 700, color: '#92400e' }}>Totaal</span>
                                    <span style={{ fontWeight: 800, color: '#92400e' }}>€ {meerwerkCompose.items.reduce((s, m) => s + Number(m.bedrag), 0).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-link" style={{ fontSize: '10px' }} />
                                De e-mail bevat automatisch een persoonlijke akkoord-link met handtekeningveld.
                            </div>
                        </div>

                        {/* Footer knoppen */}
                        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
                            <button onClick={() => setMeerwerkCompose(null)}
                                style={{ padding: '9px 18px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                Annuleren
                            </button>
                            <button onClick={() => sendMeerwerkEmailTo(meerwerkCompose.items, meerwerkCompose.contact, composeBericht, composeOntwerp, composeVanNaam, composeCC, composeBCC)}
                                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#F5850A,#e06b00)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-paper-plane" />
                                Versturen
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {previewAtt && (
                <div
                    onClick={() => setPreviewAtt(null)}
                    onKeyDown={e => e.key === 'Escape' && setPreviewAtt(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', maxWidth: '90vw', maxHeight: '90vh', width: (previewAtt.type === 'message/rfc822' || previewAtt.type === 'application/vnd.ms-outlook') ? '860px' : undefined, display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', minWidth: '320px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
                            <i className={`fa-solid ${
                                previewAtt.type === 'message/rfc822' || previewAtt.name?.toLowerCase().endsWith('.msg') ? 'fa-envelope' :
                                previewAtt.type.startsWith('image/') ? 'fa-image' :
                                previewAtt.type.includes('pdf') ? 'fa-file-pdf' :
                                previewAtt.type.includes('word') || previewAtt.name.endsWith('.docx') ? 'fa-file-word' :
                                previewAtt.type.includes('sheet') || previewAtt.name.endsWith('.xlsx') ? 'fa-file-excel' : 'fa-file'
                            }`} style={{ fontSize: '1.1rem', color:
                                previewAtt.type === 'message/rfc822' || previewAtt.name?.toLowerCase().endsWith('.msg') ? '#2563eb' :
                                previewAtt.type.startsWith('image/') ? '#F5850A' :
                                previewAtt.type.includes('pdf') ? '#ef4444' :
                                previewAtt.type.includes('word') || previewAtt.name.endsWith('.docx') ? '#2563eb' :
                                previewAtt.type.includes('sheet') ? '#16a34a' : '#64748b'
                            }} />
                            <span style={{ flex: 1, fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewAtt.name}</span>
                            {previewAtt.data ? (
                                <a href={previewAtt.data} download={previewAtt.name}
                                    style={{ padding: '6px 14px', borderRadius: '8px', background: '#F5850A', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                    onClick={e => e.stopPropagation()}>
                                    <i className="fa-solid fa-download" /> Downloaden
                                </a>
                            ) : null}
                            <button onClick={() => setPreviewAtt(null)}
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        {/* Preview body */}
                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', minHeight: '200px', maxHeight: 'calc(90vh - 70px)' }}>
                            {previewAtt.type.startsWith('image/') ? (
                                <img src={previewAtt.data} alt={previewAtt.name}
                                    style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 70px)', objectFit: 'contain', display: 'block' }} />
                            ) : previewAtt.type === 'application/pdf' ? (
                                <iframe src={previewAtt.data} title={previewAtt.name}
                                    style={{ width: '80vw', height: 'calc(90vh - 70px)', border: 'none', display: 'block' }} />
                            ) : (previewAtt.type === 'message/rfc822' || (previewAtt.type === 'application/vnd.ms-outlook' && previewAtt.parsedMsg)) ? (() => {
                                const isMsg = previewAtt.type === 'application/vnd.ms-outlook';
                                const emailData = isMsg ? previewAtt.parsedMsg : parseEml(previewAtt.rawText || '');
                                const senderName = (emailData.from || '').replace(/<.*>/, '').trim() || 'Onbekend';
                                const senderInitials = senderName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
                                const avatarColors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#F5850A'];
                                const avatarColor = avatarColors[senderName.charCodeAt(0) % avatarColors.length];
                                return (
                                    <div style={{ width: '100%', height: 'calc(90vh - 70px)', overflow: 'auto', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

                                        {/* === Gekleurde email header === */}
                                        <div style={{ background: `linear-gradient(135deg, ${avatarColor}dd, ${avatarColor}99)`, padding: '28px 32px 20px', flexShrink: 0 }}>
                                            {/* Type badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {isMsg
                                                        ? <><i className="fa-brands fa-microsoft" style={{ color: '#fff', fontSize: '0.72rem' }} /><span style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px' }}>OUTLOOK .MSG</span></>
                                                        : <><i className="fa-solid fa-envelope" style={{ color: '#fff', fontSize: '0.72rem' }} /><span style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.5px' }}>E-MAIL .EML</span></>
                                                    }
                                                </div>
                                                {emailData.date && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', marginLeft: 'auto' }}>{emailData.date}</span>}
                                            </div>

                                            {/* Onderwerp */}
                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: '20px', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                                                {emailData.subject || '(geen onderwerp)'}
                                            </div>

                                            {/* Afzender kaart */}
                                            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                                                    {senderInitials || '?'}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>{senderName}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {(emailData.from || '').match(/<(.+)>/)?.[1] || emailData.from || ''}
                                                    </div>
                                                </div>
                                                <i className="fa-solid fa-paper-plane" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', flexShrink: 0 }} />
                                            </div>
                                        </div>

                                        {/* === Metadata rijen === */}
                                        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                            {[['fa-arrow-right-to-bracket', 'Aan', emailData.to], ['fa-users', 'CC', emailData.cc]].filter(([,, v]) => v).map(([icon, label, val]) => (
                                                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.82rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '70px', color: '#94a3b8', fontWeight: 700, paddingTop: '1px' }}>
                                                        <i className={`fa-solid ${icon}`} style={{ fontSize: '0.7rem', width: '12px', textAlign: 'center' }} />
                                                        {label}
                                                    </div>
                                                    <span style={{ color: '#334155', wordBreak: 'break-word', lineHeight: 1.5 }}>{val}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* === Email body === */}
                                        <div style={{ flex: 1, overflow: 'auto', background: '#fff', margin: '12px', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                                            {emailData.bodyIsHtml ? (
                                                <iframe
                                                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;padding:24px 28px;margin:0;background:#fff}a{color:#3b82f6}img{max-width:100%}</style></head><body>${emailData.bodyHtml}</body></html>`}
                                                    sandbox="allow-same-origin"
                                                    style={{ width: '100%', height: '100%', minHeight: '320px', border: 'none', display: 'block', borderRadius: '12px' }}
                                                    title="email inhoud"
                                                />
                                            ) : (
                                                <div style={{ padding: '24px 28px' }}>
                                                    <pre style={{ margin: 0, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>
                                                        {emailData.bodyHtml || emailData.body || '(leeg bericht)'}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 60px' }}>
                                    <i className={`fa-solid ${
                                        previewAtt.name?.toLowerCase().endsWith('.msg') ? 'fa-envelope' :
                                        previewAtt.type.includes('word') || previewAtt.name.endsWith('.docx') ? 'fa-file-word' :
                                        previewAtt.type.includes('sheet') || previewAtt.name.endsWith('.xlsx') ? 'fa-file-excel' : 'fa-file'
                                    }`} style={{ fontSize: '4rem', color: previewAtt.name?.toLowerCase().endsWith('.msg') ? '#2563eb' : previewAtt.type.includes('word') || previewAtt.name.endsWith('.docx') ? '#2563eb' : previewAtt.type.includes('sheet') ? '#16a34a' : '#94a3b8' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>{previewAtt.name}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{previewAtt.name?.toLowerCase().endsWith('.msg') ? 'Kon e-mail niet inladen — probeer te downloaden.' : 'Voorbeeldweergave niet beschikbaar voor dit bestandstype'}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px' }}>{previewAtt.size ? (previewAtt.size / 1024).toFixed(1) + ' KB' : ''}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

