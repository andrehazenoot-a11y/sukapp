'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthContext';
import dynamic from 'next/dynamic';
import ProjectGantt from '../../../components/ProjectGantt';
import { haalEmailBestandOp, slaEmailBestandOp, verwijderEmailBestand } from '../../../lib/emailFileStore';


// ===== PLANNING HELPERS =====
function pFormatDate(d) { if (!d) return ''; const dd = new Date(d + 'T00:00:00'); return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`; }
function pParseDate(s) { return new Date(s + 'T00:00:00'); }
function pAddDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function pDiffDays(a, b) { return Math.round((b - a) / 86400000); }
function pIsWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }
function pIsToday(d, today) { return d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate(); }
const P_MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
// Dynamische Nederlandse feestdagen (niet hardcoded per jaar)
function _pGetEaster(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}
const P_HOLIDAYS = (() => {
    const result = {};
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const add = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const cy = new Date().getFullYear();
    for (let y = cy - 1; y <= cy + 3; y++) {
        const e = _pGetEaster(y);
        result[fmt(new Date(y, 0, 1))] = 1; result[fmt(add(e, -2))] = 1; result[fmt(e)] = 1;
        result[fmt(add(e, 1))] = 1; result[fmt(new Date(y, 3, 27))] = 1; result[fmt(new Date(y, 4, 5))] = 1;
        result[fmt(add(e, 39))] = 1; result[fmt(add(e, 49))] = 1; result[fmt(add(e, 50))] = 1;
        result[fmt(new Date(y, 11, 25))] = 1; result[fmt(new Date(y, 11, 26))] = 1;
    }
    return result;
})();
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

const PLANNER_SJABLONEN = [
    {
        id: 'compleet',
        naam: '🏗️ Compleet schildersbedrijf',
        buckets: [
            { naam: 'Voorbereiding', taken: [
                'Situatie / ondergrond beoordelen',
                'Houtrot & schadecheck',
                'Kleurkaarten / RAL-codes bevestigen',
                'Tekeningen & bestekken doornemen',
                'Toegang & sleutels regelen',
                'Steiger / hoogwerker bestellen',
                'VGM-plan opstellen',
                'Offerte opstellen',
                'Conditiemeting uitvoeren',
                'Schaderapporten maken',
            ]},
            { naam: 'Planning', taken: [
                'Startdatum bevestigen',
                'Team inplannen',
                'Materialen bestellen',
            ]},
            { naam: 'Materiaal & Materieel', taken: [
                'Verf & materialen bestellen',
                'Gereedschap controleren',
                'Afplakmateriaal controleren',
            ]},
            { naam: 'Uitvoering', taken: [
                'Ondergrond reinigen & schuren',
                'Reiniging & ontvetting',
                'Houtrot repareren',
                'Grondverf aanbrengen',
                'Grondverf kozijnen & staal',
                'Tussenlaag aanbrengen',
                'Aflakken / eindlaag',
                'Latex wanden',
                'Aflakken kozijnen & deuren',
                'Plafonds schilderen',
            ]},
            { naam: 'Oplevering', taken: [
                'Afplakken verwijderen',
                'Eindcontrole met klant',
                'Eindcontrole snagginglist',
                'Correcties verwerken',
                'Opleverdocument tekenen',
                'Garantiecheck na 2 weken',
            ]},
            { naam: 'Facturatie', taken: [
                'Factuur opstellen',
                'Termijnfactuur',
                'Eindafrekening',
                'Meerwerk factureren',
                'Factuur versturen',
                'Betaling controleren',
                'Nazorgfactuur indien nodig',
            ]},
        ],
    },
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

// ===== AI OCR Factuur Analyser =====
const parseFactuurBestand = async (file) => {
    try {
        let rawText = '';
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
            // Turbopack ondersteunt geen dynamic import() van externe CDN URLs — laad via script tag (UMD build)
            const pdfjsLib = await new Promise((resolve, reject) => {
                if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve(window.pdfjsLib);
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const tc = await page.getTextContent();
                rawText += tc.items.map(item => item.str).join(' ') + '\n';
            }
        } else if (file.type && file.type.startsWith('image/')) {
            const Tesseract = (await import('tesseract.js')).default;
            const dataUrl = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = e => res(e.target.result);
                r.onerror = e => rej(e);
                r.readAsDataURL(file);
            });
            const result = await Tesseract.recognize(dataUrl, 'nld+eng');
            rawText = result.data.text;
        } else {
            throw new Error(`Bestandstype (${file.type || 'onbekend'}) wordt niet ondersteund. Sleep een PDF of Afbeelding.`);
        }

        const extractLines = [];
        let total = 0;
        
        const lines = rawText.split('\n');
        lines.forEach(l => {
            const trimmed = l.trim();
            if(!trimmed) return;
            
            const totaalMatch = trimmed.match(/(?:Totaal|Te betalen|Bedrag|Total)[\s:*]?\€?\s*(\d+[\.,]\d{2})/i);
            if(totaalMatch) {
               const val = parseFloat(totaalMatch[1].replace(',','.'));
               if(val > total) total = val;
            }
            
            const itemMatch = trimmed.match(/^(\d+)(?:\s*x|\s*stuks?)?\s+(.+?)\s+\€?\s*(\d+[\.,]\d{2})$/i);
            if(itemMatch) {
               extractLines.push({ qty: parseInt(itemMatch[1]), name: itemMatch[2].trim(), price: parseFloat(itemMatch[3].replace(',','.')).toFixed(2) });
            }
        });

        if (extractLines.length === 0) {
            const priceMatches = rawText.match(/(\d+[\.,]\d{2})/g);
            if(priceMatches) {
                const uniquePrices = [...new Set(priceMatches.map(p => parseFloat(p.replace(',','.'))))].sort((a,b)=>b-a);
                if (uniquePrices.length > 0 && total === 0) total = uniquePrices[0];
                if (uniquePrices.length > 1) {
                    uniquePrices.slice(1, 4).forEach((p, i) => {
                       extractLines.push({ qty: 1, name: `Geëxtraheerd Artikel ${i+1}`, price: p.toFixed(2) });
                    });
                }
            }
        }
        
        if (total === 0 && extractLines.length > 0) {
            total = extractLines.reduce((s, l) => s + (parseFloat(l.price) * l.qty), 0);
        }
        if (total === 0 && extractLines.length === 0) {
           return { total: 0, extractLines: [{ qty: 1, name: 'Ongelezen factuurregel (handmatig invullen)', price: '0.00' }] };
        }
        
        return { total, extractLines };
    } catch(err) {
        console.error("Factuur scan error:", err);
        return { total: 0, extractLines: [{ qty: 1, name: 'Fout bij OCR extractie', price: '0.00' }] };
    }
};

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

// ===== EMAIL WEERGAVE COMPONENTEN (module-level: vaste referentie, geen remount bij re-render) =====

function EmailBody({ email }) {
    const [iframeSrc, setIframeSrc] = React.useState(null);
    const [bezig, setBezig] = React.useState(!!email.originalFile?.fileId);
    React.useEffect(() => {
        if (!email.originalFile?.fileId) return;
        setBezig(true);
        let blobUrl;
        let actief = true;
        (async () => {
            try {
                const b = await haalEmailBestandOp(email.originalFile.fileId);
                const blob = b?.blob || b;
                if (!actief || !(blob instanceof Blob)) { setBezig(false); return; }
                const buf = await blob.arrayBuffer();
                const MsgReader = (await import('@kenjiuno/msgreader')).default;
                const msgReader = new MsgReader(buf);
                const info = msgReader.getFileData();
                // Decode: kan string of Uint8Array zijn
                const dec = (v) => { if (!v) return null; if (typeof v === 'string') return v; try { return new TextDecoder('utf-8').decode(v) || null; } catch { return null; } };
                const toB64 = (bytes) => { let s = ''; const c = 8192; for (let i = 0; i < bytes.length; i += c) s += btoa(String.fromCharCode(...bytes.subarray(i, Math.min(i + c, bytes.length)))); return s; };
                let html = dec(info.bodyHtml);
                // cid: vervangen — bytes via msg.getAttachment(), contentId via att.pidContentId
                if (html?.includes('cid:')) {
                    for (const att of (info.attachments || [])) {
                        const cid = (att.pidContentId || att.contentId || '').replace(/[<>]/g, '');
                        if (!cid) continue;
                        try {
                            const attData = msgReader.getAttachment(att);
                            const raw = attData?.content || attData?.fileData || att.content || att.fileData;
                            if (!raw) continue;
                            const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                            const mime = att.attachMimeTag || att.mimeType || 'image/png';
                            html = html.split(`cid:${cid}`).join(`data:${mime};base64,${toB64(bytes)}`);
                        } catch {}
                    }
                }
                if (!html) {
                    const tekst = dec(info.body);
                    if (tekst) {
                        const plaintextNaarHtml = (t) => {
                            const links = [];
                            const bewaar = (tag) => { const i = links.length; links.push(tag); return `\x01${i}\x01`; };
                            let p = t;
                            // Bewaar links vóór escaping
                            p = p.replace(/<(https?:\/\/[^\s>]+)>/g, (_, u) => bewaar(`<a href="${u}" target="_blank" style="color:#3b82f6">${u}</a>`));
                            p = p.replace(/<mailto:([^\s>]+)>/g, (_, e) => bewaar(`<a href="mailto:${e}" style="color:#3b82f6">${e}</a>`));
                            p = p.replace(/(https?:\/\/[^\s<>"]+)/g, (u) => bewaar(`<a href="${u}" target="_blank" style="color:#3b82f6">${u}</a>`));
                            // HTML escapen
                            p = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            // Links terugzetten
                            p = p.replace(/\x01(\d+)\x01/g, (_, i) => links[+i]);
                            // Meerdere lege regels samenvoegen
                            p = p.replace(/(\r?\n[ \t]*){3,}/g, '\n\n');
                            // Regels omzetten naar <br>
                            return p.replace(/\r?\n/g, '<br>');
                        };
                        // Gesplitst op antwoord-scheidingslijn (___) of "Van:"-header
                        const sepMatch = tekst.match(/_{10,}|^-{10,}/m);
                        const sepIdx = sepMatch ? tekst.indexOf(sepMatch[0]) : -1;
                        const hoofd = (sepIdx > 0 ? tekst.substring(0, sepIdx) : tekst).trim();
                        const geciteerd = sepIdx > 0 ? tekst.substring(sepIdx).trim() : null;
                        const body = `<div style="padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.75;color:#1e293b">${plaintextNaarHtml(hoofd)}</div>`
                            + (geciteerd ? `<details style="margin:0 16px 16px"><summary style="cursor:pointer;color:#94a3b8;font-size:0.72rem;padding:6px 0;list-style:none;display:flex;align-items:center;gap:8px;user-select:none"><span style="flex:1;height:1px;background:#e2e8f0"></span>▾ Toon oorspronkelijke email<span style="flex:1;height:1px;background:#e2e8f0"></span></summary><div style="font-size:0.85em;color:#64748b;border-left:3px solid #e2e8f0;padding:8px 12px;margin-top:4px">${plaintextNaarHtml(geciteerd)}</div></details>` : '');
                        html = `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0">${body}</body></html>`;
                    }
                }
                if (html) {
                    if (!/<html/i.test(html)) {
                        html = `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;margin:0;padding:16px">${html}</body></html>`;
                    } else if (!/<meta[^>]+charset/i.test(html)) {
                        html = html.replace(/(<head[^>]*>)/i, '$1<meta charset="utf-8"><base target="_blank">');
                    }
                    // Blob URL = betere rendering dan srcDoc, geen sandbox-beperking
                    blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
                    if (actief) setIframeSrc(blobUrl);
                }
            } catch (e) { console.error('[EmailBody]', e); }
            if (actief) setBezig(false);
        })();
        return () => { actief = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [email.id, email.originalFile?.fileId]); // eslint-disable-line react-hooks/exhaustive-deps
    const iStyle = { width: '100%', border: 'none', display: 'block', minHeight: 80 };
    const onLoad = ev => { try { const h = ev.target.contentDocument?.documentElement?.scrollHeight; if (h) ev.target.style.height = h + 8 + 'px'; } catch {} };
    if (bezig) return <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Email wordt geladen…</div>;
    if (iframeSrc) return <iframe src={iframeSrc} style={iStyle} onLoad={onLoad} title="email" />;
    if (email.outlookId) return <iframe src={`/api/outlook/emailrender?id=${encodeURIComponent(email.outlookId)}`} style={iStyle} onLoad={onLoad} title="email" />;
    if (email.bodyHtml) return <iframe srcDoc={email.bodyHtml} style={iStyle} onLoad={onLoad} sandbox="allow-same-origin" title="email" />;
    if (email.body) return <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.6, padding: '16px' }}>{email.body}</pre>;
    return null;
}

function AttachmentItem({ att, onLightbox }) {
    const imgExts = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.tif','.heic','.heif'];
    const isImg = att.mimeType?.startsWith('image/') || imgExts.some(e => att.name?.toLowerCase().endsWith(e));
    const [imgUrl, setImgUrl] = React.useState(null);
    React.useEffect(() => {
        if (!isImg) return;
        let url;
        let actief = true;
        (async () => {
            const b = await haalEmailBestandOp(att.id);
            const blob = b?.blob || b;
            if (actief && blob instanceof Blob) { url = URL.createObjectURL(blob); setImgUrl(url); }
        })();
        return () => { actief = false; if (url) URL.revokeObjectURL(url); };
    }, [att.id, isImg]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleDownload = async () => {
        const b = await haalEmailBestandOp(att.id);
        const blob = b?.blob || b;
        if (blob instanceof Blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = att.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
    };
    if (isImg) return (
        <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', aspectRatio: '1', cursor: 'zoom-in' }} onClick={() => imgUrl && onLightbox?.(imgUrl, att.name)} title={att.name}>
            {imgUrl
                ? <img src={imgUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-spinner fa-spin" style={{ color: '#94a3b8' }} /></div>
            }
        </div>
    );
    const isPdf = att.mimeType === 'application/pdf';
    const icon = isPdf ? 'fa-file-pdf' : att.mimeType?.includes('word') ? 'fa-file-word' : att.mimeType?.includes('excel') || att.mimeType?.includes('spreadsheet') ? 'fa-file-excel' : 'fa-file';
    const iconColor = isPdf ? '#ef4444' : att.mimeType?.includes('word') ? '#2563eb' : att.mimeType?.includes('excel') || att.mimeType?.includes('spreadsheet') ? '#16a34a' : '#64748b';
    const kb = att.size < 1024 ? att.size + ' B' : att.size < 1048576 ? Math.round(att.size / 1024) + ' KB' : (att.size / 1048576).toFixed(1) + ' MB';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, background: '#fff', border: '1px solid #e2e8f0', marginBottom: 4 }}>
            <i className={`fa-solid ${icon}`} style={{ color: iconColor, fontSize: '0.9rem', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.72rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
            <span style={{ fontSize: '0.62rem', color: '#94a3b8', flexShrink: 0 }}>{kb}</span>
            <button onClick={handleDownload} style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.62rem', cursor: 'pointer', flexShrink: 0 }}>Download</button>
        </div>
    );
}

export default function ProjectDossierPage() {
    const { id } = useParams();
    const router = useRouter();
    const { getAllUsers, user, getProfile } = useAuth();
    const allUsers = getAllUsers();
    const [project, setProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [checklistLocal, setChecklistLocal] = useState(null);
    const checklistDebounceRef = useRef(null);
    const checklistEditingRef = useRef(false);
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const t = new URLSearchParams(window.location.search).get('tab');
            if (t) return t;
        }
        return 'overzicht';
    });
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('info');
    const [notifyUserId, setNotifyUserId] = useState('');
    const [replyingToNote, setReplyingToNote] = useState(null); // note.id
    const [noteReplyInput, setNoteReplyInput] = useState('');
    const [termijnen, setTermijnen] = useState(DEMO_TERMIJNEN);
    const [offerteBedrag, setOfferteBedrag] = useState('');
    const [akPercentage, setAkPercentage] = useState(() => { try { return Number(localStorage.getItem(`schildersapp_project_ak_${id}`)) || 10; } catch { return 10; } });
    const handleSetAk = (v) => {
        let n = parseInt(v) || 0;
        if (n < 0) n = 0;
        setAkPercentage(n);
        localStorage.setItem(`schildersapp_project_ak_${id}`, n);
    };
    const [materiaalItems, setMateriaalItems] = useState(() => { 
        try { 
            const stored = JSON.parse(localStorage.getItem(`schildersapp_project_matlijst_${id}`));
            if (stored && Array.isArray(stored)) return stored;
            const oldFixed = Number(localStorage.getItem(`schildersapp_project_mat_${id}`));
            if (oldFixed) return [{ id: Date.now(), omschrijving: 'Diverse inkoop / Migratie', bedrag: oldFixed }];
            return [];
        } catch { return []; } 
    });
    const [materiaalKostenType, setMateriaalKostenType] = useState(() => {
        try { return localStorage.getItem(`schildersapp_project_mattype_${id}`) || 'lijst'; } catch { return 'lijst'; }
    });
    const handleSetMatType = (v) => {
        setMateriaalKostenType(v);
        localStorage.setItem(`schildersapp_project_mattype_${id}`, v);
    };
    const [isDraggingInvoice, setIsDraggingInvoice] = useState(false);
    const [isScanningInvoice, setIsScanningInvoice] = useState(false);
    const [expandedMats, setExpandedMats] = useState({});
    const toggleMatExpand = (id) => setExpandedMats(prev => ({ ...prev, [id]: !prev[id] }));
    const updateMateriaalLijst = (newItems) => {
        setMateriaalItems(newItems);
        localStorage.setItem(`schildersapp_project_matlijst_${id}`, JSON.stringify(newItems));
    };
    const voegMateriaalToe = () => updateMateriaalLijst([...materiaalItems, { id: Date.now(), omschrijving: '', bedrag: 0 }]);
    const wisMateriaal = (matId) => updateMateriaalLijst(materiaalItems.filter(i => i.id !== matId));
    const wijzigMateriaalVelden = (matId, veld, val) => updateMateriaalLijst(materiaalItems.map(i => i.id === matId ? { ...i, [veld]: veld === 'bedrag' ? (parseFloat(val) || 0) : val } : i));
    const wijzigGeextraheerdeRegel = (itemId, lineIndex, veld, val) => {
        const nieuweItems = materiaalItems.map(item => {
            if (item.id === itemId && item.extractedLines) {
                const upLines = [...item.extractedLines];
                upLines[lineIndex] = { ...upLines[lineIndex], [veld]: val };
                const bedrag = upLines.reduce((s, l) => s + (parseFloat(l.price) * (parseFloat(l.qty) || 1) || 0), 0);
                return { ...item, bedrag, extractedLines: upLines };
            }
            return item;
        });
        updateMateriaalLijst(nieuweItems);
    };
    const wisGeextraheerdeRegel = (itemId, lineIndex) => {
        const nieuweItems = materiaalItems.map(item => {
            if (item.id === itemId && item.extractedLines) {
                const upLines = item.extractedLines.filter((_, i) => i !== lineIndex);
                const bedrag = upLines.reduce((s, l) => s + (parseFloat(l.price) * (parseFloat(l.qty) || 1) || 0), 0);
                return { ...item, bedrag, extractedLines: upLines };
            }
            return item;
        });
        updateMateriaalLijst(nieuweItems);
    };
    const voegGeextraheerdeRegelToe = (itemId) => {
        const nieuweItems = materiaalItems.map(item => {
            if (item.id === itemId && item.extractedLines) {
                const upLines = [...item.extractedLines, { qty: 1, name: '', price: 0 }];
                return { ...item, extractedLines: upLines };
            }
            return item;
        });
        updateMateriaalLijst(nieuweItems);
    };
    const [wrPercentage, setWrPercentage] = useState(() => { try { return Number(localStorage.getItem(`schildersapp_project_wr_${id}`)) || 10; } catch { return 10; } });
    const handleSetWr = (v) => {
        let n = parseInt(v) || 0;
        if (n < 0) n = 0;
        setWrPercentage(n);
        localStorage.setItem(`schildersapp_project_wr_${id}`, n);
    };
    const [showAddTask, setShowAddTask] = useState(false);
    const [dossierFilter, setDossierFilter] = useState('taken');
    const [dossierExpanded, setDossierExpanded] = useState(new Set());
    const [dossierShowSjablonen, setDossierShowSjablonen] = useState(false);
    const [dossierSjabloonExpanded, setDossierSjabloonExpanded] = useState(null);
    const [planningModal, setPlanningModal] = useState(null); // { taskId, taskName, startDate, endDate }
    const [delenModal, setDelenModal] = useState(null); // { taskId, taskName, mode: 'persoon'|'project'|null, selectedUserId: null }
    const [plannerStempelBezig, setPlannerStempelBezig] = useState({}); // { [taskId]: true }
    const [voorgesteldeTaken, setVoorgesteldeTaken] = useState({});
    const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '' });
    const [ganttCurrentDate, setGanttCurrentDate] = useState(() => new Date());
    const [savedFeedback, setSavedFeedback] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [editingPlanName, setEditingPlanName] = useState('');
    const dblClickRef = useRef({ t: 0, id: null }); // voor dubbelklik detectie op balken

    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [photoFilter, setPhotoFilter] = useState('alle');
    const [toasts, setToasts] = useState([]);
    const showToast = (msg, type = 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const fileInputRef = useRef(null);
    const emailUploadRef = useRef(null);
    const dragTaskRef = useRef(null);
    const [kanbanDragOver, setKanbanDragOver] = useState(null);
    const [kanbanNieuweKolom, setKanbanNieuweKolom] = useState(null); // 'todo' | 'planning'
    const [kanbanNieuweNaam, setKanbanNieuweNaam] = useState('');
    const [selectedEmailId, setSelectedEmailId] = useState(null);
    const [lightbox, setLightbox] = useState(null); // { url, naam }
    const [emailForm, setEmailForm] = useState(null); // null=gesloten, {richting,van,onderwerp,datum,categorie,...}
    const [toast, setToast] = useState(null);
    const [teamsBezig, setTeamsBezig] = useState(false);
    const [teamsFout, setTeamsFout] = useState(null);
    const [teamsTeamId, setTeamsTeamId] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem('schilders_teams_team_id') || '';
    });
    const [teamsLijst, setTeamsLijst] = useState(null); // null=niet geladen, []= leeg, [{id,naam}]
    const [kanaalBerichtenLaden, setKanaalBerichtenLaden] = useState(false);
    const [kanaalBerichtenData, setKanaalBerichtenData] = useState(null);
    const [teamsLijstBezig, setTeamsLijstBezig] = useState(false);
    const [plannerTaken, setPlannerTaken] = useState(null); // null=niet geladen
    const [plannerTakenBezig, setPlannerTakenBezig] = useState(false);
    const [plannerNieuweTaak, setPlannerNieuweTaak] = useState('');
    const [plannerNieuweTaakUser, setPlannerNieuweTaakUser] = useState({}); // { [bucketId]: userId }
    const [plannerTaakToevoegBezig, setPlannerTaakToevoegBezig] = useState(false);
    const [plannerBuckets, setPlannerBuckets] = useState([]);
    const [plannerBucketKeuze, setPlannerBucketKeuze] = useState(null); // geselecteerde bucketId voor taak toevoegen
    const [plannerVerstuurd, setPlannerVerstuurd] = useState({}); // { [taskId]: 'ok'|'error'|'bezig' }
    const [plannerKaartOpen, setPlannerKaartOpen] = useState({}); // { [taskId]: bool }
    const [plannerSnelToevoeg, setPlannerSnelToevoeg] = useState(null); // { bucketId, inputVal }
    const [plannerDetails, setPlannerDetails] = useState({}); // { [taskId]: { description, etag, laden } }
    const [plannerSjabloon, setPlannerSjabloon] = useState('schilderwerk'); // gekozen sjabloon bij aanmaken
    const [plannerKoppelModus, setPlannerKoppelModus] = useState('nieuw'); // 'nieuw' | 'bestaand'
    const [plannerBestaandeLijst, setPlannerBestaandeLijst] = useState(null); // null = nog niet geladen
    const [plannerBestaandBezig, setPlannerBestaandBezig] = useState(false);
    const [plannerBestaandGeselecteerd, setPlannerBestaandGeselecteerd] = useState(null); // geselecteerd plan id
    const [kanaalKoppelModus, setKanaalKoppelModus] = useState('nieuw'); // 'nieuw' | 'bestaand'
    const [kanaalBestaandeLijst, setKanaalBestaandeLijst] = useState(null);
    const [kanaalBestaandBezig, setKanaalBestaandBezig] = useState(false);
    const [kanaalBestaandGeselecteerd, setKanaalBestaandGeselecteerd] = useState(null);
    const [teamsIframeOpen, setTeamsIframeOpen] = useState(false);
    const [teamsIframeFout, setTeamsIframeFout] = useState(false);
    const [plannerSjablonenState, setPlannerSjablonenState] = useState(() => {
        try {
            const op = localStorage.getItem('schildersapp_planner_sjablonen');
            const parsed = op ? JSON.parse(op) : null;
            // Reset als nog de oude 4 sjablonen staan (migratie naar 1 gecombineerd)
            if (parsed && parsed.length > 1) { localStorage.removeItem('schildersapp_planner_sjablonen'); return PLANNER_SJABLONEN; }
            return parsed || PLANNER_SJABLONEN;
        } catch { return PLANNER_SJABLONEN; }
    });
    const [sjabloonEditor, setSjabloonEditor] = useState(null); // array van sjablonen die bewerkt worden
    const [sjabloonEditorIdx, setSjabloonEditorIdx] = useState(0); // welk sjabloon is actief in de editor
    const [plannerPaletOpen, setPlannerPaletOpen] = useState(true);
    const [plannerPaletBucketOpen, setPlannerPaletBucketOpen] = useState({});
    const [projectTakenBucketOpen, setProjectTakenBucketOpen] = useState({});
    const [geselecteerdeTaakId, setGeselecteerdeTaakId] = useState(null);
    const [projectTakenNieuwGroep, setProjectTakenNieuwGroep] = useState(null);
    const [plannerPaletEditKey, setPlannerPaletEditKey] = useState(null);
    const [plannerPaletEditVal, setPlannerPaletEditVal] = useState('');
    const [plannerPaletNieuwBucket, setPlannerPaletNieuwBucket] = useState(null); // 'sjabloonId|bucketNaam'
    const [plannerPaletNieuwHoofdgroep, setPlannerPaletNieuwHoofdgroep] = useState(null); // sjabloonId
    const [paletDrag, setPaletDrag] = useState(null);     // { type:'bucket'|'taak', bi, ti? }
    const [paletDragOver, setPaletDragOver] = useState(null);
    const [projTaakDrag, setProjTaakDrag] = useState(null);    // { groepKey, taakId }
    const [projTaakDragOver, setProjTaakDragOver] = useState(null); // { groepKey, taakId? }
    const [projTaakPlannerBezig, setProjTaakPlannerBezig] = useState(new Set());
    const [projWerkbonnen, setProjWerkbonnen] = useState([]);
    const [projWbMat, setProjWbMat] = useState({});
    const [projWbLoading, setProjWbLoading] = useState(false);
    const [plannerPaletSjabloon, setPlannerPaletSjabloon] = useState(null);
    const [plannerPaletBezig, setPlannerPaletBezig] = useState({});
    const [plannerPaletKaartOpen, setPlannerPaletKaartOpen] = useState({});
    const [plannerPaletVinkjes, setPlannerPaletVinkjes] = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_palet_vinkjes') || '{}'); } catch { return {}; } });
    const [plannerPaletData, setPlannerPaletData] = useState(() => { try { return JSON.parse(localStorage.getItem('schildersapp_palet_data') || '{}'); } catch { return {}; } });
    const [plannerPaletSelectie, setPlannerPaletSelectie] = useState(new Set());
    const [plannerPaletAssignPopup, setPlannerPaletAssignPopup] = useState(null);
    const [paletZoek, setPaletZoek] = useState('');
    const [teamsLeden, setTeamsLeden] = useState([]);
    // Label-namen (plan-niveau) — gesynchroniseerd met MS Planner categoryDescriptions
    const LABEL_DEFAULTS = { category1: 'Urgent', category2: 'Materiaal', category3: 'Wachten', category4: 'Gereed', category5: 'Klant', category6: 'Intern' };
    const [plannerLabelNamen, setPlannerLabelNamen] = useState({ ...LABEL_DEFAULTS });
    const [plannerLabelEtag, setPlannerLabelEtag] = useState(null);
    const [plannerLabelEditKey, setPlannerLabelEditKey] = useState(null); // welk label wordt bewerkt

    const savePlannerSjablonen = (nieuweSet) => { setPlannerSjablonenState(nieuweSet); try { localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(nieuweSet)); } catch {} };
    const [outlookCategories, setOutlookCategories] = useState({}); // { naam: kleurHex }
    const [catPickerEmailId, setCatPickerEmailId] = useState(null);
    const [catDropdownEmailId, setCatDropdownEmailId] = useState(null);
    const [editingClient, setEditingClient] = useState(false);
    const [editingWerkomschrijving, setEditingWerkomschrijving] = useState(false);
    const [werkomschrijvingDraft, setWerkomschrijvingDraft] = useState('');
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
            showToast(`Dit e-mailadres (${newEmailContact.email}) is al toegevoegd.`);
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

    const handleFileUpload = async (taskId, files) => {
        const fileArr = Array.from(files);
        const results = [];

        for (const file of fileArr) {
            const isEml = file.name.toLowerCase().endsWith('.eml') || file.type === 'message/rfc822';
            const isMsg = file.name.toLowerCase().endsWith('.msg');

            if (isEml) {
                // .eml blijft lokaal parseren (base64 voor download)
                const [rawText, dataUrl] = await Promise.all([
                    new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsText(file); }),
                    new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); }),
                ]);
                results.push({ name: file.name, type: 'message/rfc822', size: file.size, rawText, data: dataUrl });
            } else if (isMsg) {
                // .msg blijft lokaal parseren
                const buffer = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsArrayBuffer(file); });
                try {
                    const MsgReader = (await import('@kenjiuno/msgreader')).default;
                    const msgReader = new MsgReader(buffer);
                    const info = msgReader.getFileData();
                    const bytes = new Uint8Array(buffer);
                    let binary = ''; bytes.forEach(b => binary += String.fromCharCode(b));
                    const dataUrl = 'data:application/vnd.ms-outlook;base64,' + btoa(binary);
                    results.push({ name: file.name, type: 'application/vnd.ms-outlook', size: file.size,
                        parsedMsg: { subject: info.subject || '(geen onderwerp)', from: info.senderName ? `${info.senderName} <${info.senderEmail || ''}>` : (info.senderEmail || ''), to: (info.recipients || []).map(r => r.name || r.email || '').join(', '), cc: '', date: '', body: info.body || '', bodyHtml: info.bodyHtml || info.body || '', bodyIsHtml: !!info.bodyHtml },
                        data: dataUrl });
                } catch (err) {
                    console.warn('MSG parse error:', err);
                    results.push({ name: file.name, type: 'application/vnd.ms-outlook', size: file.size, data: null, parseError: true });
                }
            } else {
                // ✅ Alle andere bestanden → upload naar Synology
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('projectId', id);
                    formData.append('category', 'taken');
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    const uploadResult = await res.json();
                    if (uploadResult.success) {
                        results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, url: uploadResult.url, data: null });
                    } else {
                        // Fallback naar base64 als upload mislukt
                        const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
                        results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl });
                    }
                } catch {
                    // Fallback bij netwerkfout
                    const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
                    results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl });
                }
            }
        }

        const updated = {
            ...project,
            tasks: project.tasks.map(t => t.id === taskId
                ? { ...t, attachments: [...(t.attachments || []), ...results] }
                : t)
        };
        saveProject(updated);
    };

    const handleProjectFileUpload = async (files) => {
        const fileArr = Array.from(files);
        const results = [];
        for (const file of fileArr) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', id);
                formData.append('category', 'bestanden');
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadResult = await res.json();
                if (uploadResult.success) {
                    results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, url: uploadResult.url, data: uploadResult.url, uploadedAt: new Date().toISOString() });
                } else {
                    const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
                    results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl, uploadedAt: new Date().toISOString() });
                }
            } catch {
                const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
                results.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl, uploadedAt: new Date().toISOString() });
            }
        }
        saveProject({ ...project, bestanden: [...(project.bestanden || []), ...results] });
    };

    const removeProjectBestand = (idx) => {
        saveProject({ ...project, bestanden: (project.bestanden || []).filter((_, i) => i !== idx) });
    };

    const updateBestandLabel = (idx, label) => {
        const updated = (project.bestanden || []).map((b, i) => i === idx ? { ...b, label } : b);
        saveProject({ ...project, bestanden: updated });
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
    const [poSectOpen, setPoSectOpen] = useState({ kaart: true, werkomschrijving: true, checklist: true, opmerkingen: true, bestanden: true, fotos: true });
    const [poNoteText, setPoNoteText] = useState('');
    const [poNoteType, setPoNoteType] = useState('info');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [poNoteMedia, setPoNoteMedia] = useState(null);
    const [poNoteMediaUploading, setPoNoteMediaUploading] = useState(false);
    const noteMediaInputRef = useRef(null);
    const [addingMediaToNoteId, setAddingMediaToNoteId] = useState(null);
    const [addMediaUploading, setAddMediaUploading] = useState(false);
    const noteAddMediaInputRef = useRef(null);
    const [replyingToNoteId, setReplyingToNoteId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const togglePoSect = (key) => setPoSectOpen(s => ({ ...s, [key]: !s[key] }));
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [bijlageDragOver, setBijlageDragOver] = useState(false);
    const [deleteConfirmTask, setDeleteConfirmTask] = useState(null); // task.id
    const [dragOverTask, setDragOverTask] = useState(null); // task.id being dragged over

    // ── Meerwerk state ──
    const [meerwerk, setMeerwerk] = useState(() => {
        try { const s = localStorage.getItem(`schildersapp_meerwerk_${id}`); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [showAddMeerwerk, setShowAddMeerwerk] = useState(false);

    // Eigen Outlook emailadres — wordt opgehaald bij eerste verbinding
    const [myOutlookEmail, setMyOutlookEmail] = useState(() => {
        try { return localStorage.getItem('schildersapp_mijn_outlook_email') || ''; } catch { return ''; }
    });
    // Gedeelde mailbox adres (bijv. info@bedrijf.nl) — optioneel, voor gedeelde mailboxen
    const [sharedMailbox, setSharedMailbox] = useState(() => {
        try { return localStorage.getItem('schildersapp_shared_mailbox') || ''; } catch { return ''; }
    });
    const convUrl = (convId) => {
        const base = `/api/outlook/conversation?id=${encodeURIComponent(convId)}`;
        return sharedMailbox ? `${base}&sharedMailbox=${encodeURIComponent(sharedMailbox)}` : base;
    };

    // Laad Outlook categorieën en eigen emailadres zodra email-tab actief wordt
    useEffect(() => {
        if (dossierFilter !== 'emails') return;
        fetch('/api/outlook/categories')
            .then(r => r.ok ? r.json() : {})
            .then(data => { if (data && !data.error) setOutlookCategories(data); })
            .catch(() => {});
        // Haal eigen emailadres op (voor betrouwbare direction-detectie)
        fetch('/api/outlook/status')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.connected && data.email) {
                    const ownEmail = data.email;
                    setMyOutlookEmail(ownEmail);
                    try { localStorage.setItem('schildersapp_mijn_outlook_email', ownEmail); } catch {}
                    // Repareer emails die als 'in' zijn opgeslagen maar van ons eigen adres komen
                    setProject(prev => {
                        if (!prev) return prev;
                        let changed = false;
                        const updatedEmails = (prev.emails || []).map(e => {
                            if (e.direction !== 'in') return e;
                            const fromEmail = ((e.from || '').match(/<([^>]+)>/) || [])[1]?.toLowerCase() || (e.from || '').toLowerCase().trim();
                            if (fromEmail === ownEmail) {
                                changed = true;
                                return { ...e, direction: 'out', status: 'verzonden' };
                            }
                            return e;
                        });
                        if (!changed) return prev;
                        const updated = { ...prev, emails: updatedEmails };
                        const newProjects = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]').map(p => p.id === updated.id ? updated : p);
                        localStorage.setItem('schildersapp_projecten', JSON.stringify(newProjects));
                        return updated;
                    });
                }
            })
            .catch(() => {});
    }, [dossierFilter]);

    // Sync categorieën vanuit Outlook → app (elke 30 sec als dossier open is)
    // Extraheer email-adres uit "Naam <email>" of plain email string
    const extractEmail = (str) => ((str || '').match(/<([^>]+)>/) || [])[1]?.toLowerCase() || (str || '').toLowerCase().trim();

    // Bepaal direction: als het bericht VAN ons eigen adres of gedeelde mailbox komt → 'out'
    const bepaalDirection = (origFrom, mFromEmail, mToEmails) => {
        if (!mFromEmail) return 'in';
        // Primaire check: eigen emailadres of gedeelde mailbox → meest betrouwbaar
        if (myOutlookEmail && mFromEmail === myOutlookEmail) return 'out';
        if (sharedMailbox && mFromEmail === sharedMailbox.toLowerCase()) return 'out';
        // Fallback: als het bericht NIET van de originele afzender komt én die staat in de ontvangers → verzonden
        const origEmail = extractEmail(origFrom);
        if (origEmail && mFromEmail !== origEmail && (mToEmails || []).includes(origEmail)) return 'out';
        return 'in';
    };

    const voegEmailToe = (data) => {
        const emailId = data.id || (Date.now() + Math.random()).toString();
        const nieuw = {
            id: emailId,
            direction: data.richting || data.direction || 'in',
            van: data.van || data.from || '',
            subject: data.onderwerp || data.subject || '',
            date: data.datum || data.date || new Date().toISOString().split('T')[0],
            categorie: data.categorie || 'Overig',
            notitie: data.notitie || '',
            body: data.body || '',
            status: (data.richting || data.direction || 'in') === 'in' ? 'open' : 'verzonden',
            aangemaakt: new Date().toISOString(),
            from: data.van || data.from || '',
            to: data.aan || data.to || '',
            originalFile: data.originalFile || null,
            outlookId: data.outlookId || null,
            conversationId: data.conversationId || null,
            attachments: data.attachments || [],
            taken: data.taken || [],
        };
        saveProject({ ...project, emails: [...(project.emails || []), nieuw] });

        // Achtergrond: conversationId opzoeken en registreren voor Teams-webhook
        const kanaalId = project.teamsKanaalId;
        const teamId = teamsTeamId;
        if (kanaalId && teamId) {
            const conversationId = data.conversationId || null;
            const onderwerp = data.onderwerp || data.subject || '';
            const van = data.van || data.from || '';
            if (conversationId) {
                fetch('/api/outlook/registreer-gesprek', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId, teamsKanaalId: kanaalId, teamId }),
                }).catch(() => {});
            } else if (onderwerp) {
                // Zoek conversationId via Outlook search (fire-and-forget)
                fetch('/api/outlook/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject: onderwerp, from: van }),
                }).then(r => r.ok ? r.json() : null).then(result => {
                    if (result?.conversationId) {
                        fetch('/api/outlook/registreer-gesprek', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ conversationId: result.conversationId, teamsKanaalId: kanaalId, teamId }),
                        }).catch(() => {});
                    }
                }).catch(() => {});
            }
        }
    };

    const voegEmailTaakToe = (emailId, naam, deadline) => {
        const taak = { id: 't' + Date.now() + Math.random(), naam, deadline: deadline || null, gedaan: false };
        saveProject({ ...project, emails: (project.emails || []).map(e => String(e.id) === String(emailId) ? { ...e, taken: [...(e.taken || []), taak] } : e) });
    };

    const toggleEmailTaak = (emailId, taakId) => {
        saveProject({ ...project, emails: (project.emails || []).map(e => String(e.id) === String(emailId) ? { ...e, taken: (e.taken || []).map(t => t.id === taakId ? { ...t, gedaan: !t.gedaan } : t) } : e) });
    };

    const verwijderEmailTaak = (emailId, taakId) => {
        saveProject({ ...project, emails: (project.emails || []).map(e => String(e.id) === String(emailId) ? { ...e, taken: (e.taken || []).filter(t => t.id !== taakId) } : e) });
    };

    const verwijderEmail = (emailId) => {
        saveProject({ ...project, emails: (project.emails || []).filter(e => String(e.id) !== String(emailId)) });
    };

    const updateEmailCategorie = (emailId, nieuweCat) => {
        const email = (project.emails || []).find(e => String(e.id) === String(emailId));
        saveProject({ ...project, emails: (project.emails || []).map(e => String(e.id) === String(emailId) ? { ...e, categorie: nieuweCat } : e) });
        if (email?.outlookId) {
            fetch('/api/outlook/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outlookId: email.outlookId, action: 'set_category', categories: nieuweCat ? [nieuweCat] : [] }) }).catch(() => {});
        }
        setCatDropdownEmailId(null);
    };

    // ── Ref om altijd de actuele project-state te lezen in de interval ──
    const projectRef = useRef(null);
    useEffect(() => { projectRef.current = project; });
    const plannerTakenRef = useRef(null);
    useEffect(() => { plannerTakenRef.current = plannerTaken; }, [plannerTaken]);

    // ── Achtergrond sync Outlook → app categorieën (elke 60s) ──
    useEffect(() => {
        const sync = async () => {
            const proj = projectRef.current;
            const emailsMetOutlook = (proj?.emails || []).filter(e => e.outlookId);
            if (!emailsMetOutlook.length) return;
            const ids = emailsMetOutlook.map(e => encodeURIComponent(e.outlookId)).join(',');
            try {
                const res = await fetch(`/api/outlook/sync?ids=${ids}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;
                let changed = false;
                const updatedEmails = (proj.emails || []).map(email => {
                    if (!email.outlookId) return email;
                    const syncResult = data.find(d => d.id === email.outlookId);
                    if (!syncResult || syncResult.deleted || syncResult.error) return email;
                    const outlookCat = syncResult.category || null;
                    if (outlookCat && outlookCat !== email.categorie) { changed = true; return { ...email, categorie: outlookCat }; }
                    return email;
                });
                if (changed) saveProject({ ...proj, emails: updatedEmails });
            } catch {}
        };
        const interval = setInterval(sync, 60000);
        return () => clearInterval(interval);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Planner → Palet sync: haal notities + controlelijst op voor taken die al in Planner staan
    useEffect(() => {
        if (!plannerTaken || plannerTaken.length === 0 || !myOutlookEmail) return;
        const huidigSjabloon = plannerSjablonenState.find(s => s.id === plannerPaletSjabloon) || plannerSjablonenState[0];
        if (!huidigSjabloon) return;
        const alleTaken = huidigSjabloon.buckets.flatMap(b => b.taken.map(t => ({ key: b.naam + '|' + t, titel: t })));
        alleTaken.forEach(({ key, titel }) => {
            const plannerTaak = plannerTaken.find(t => t.title?.toLowerCase() === titel.toLowerCase());
            if (!plannerTaak) return;

            // Velden die direct op de taak staan
            const startDate = plannerTaak.startDateTime ? plannerTaak.startDateTime.slice(0, 10) : undefined;
            const dueDate = plannerTaak.dueDateTime ? plannerTaak.dueDateTime.slice(0, 10) : undefined;
            const label = plannerTaak.appliedCategories
                ? Object.keys(plannerTaak.appliedCategories).find(k => plannerTaak.appliedCategories[k])
                : undefined;
            const userId = plannerTaak.assignments
                ? Object.keys(plannerTaak.assignments)[0]
                : undefined;

            // Taakdetails ophalen voor notitie + controlelijst
            fetch(`/api/teams/planner-taak-details?taskId=${plannerTaak.id}`)
                .then(r => r.ok ? r.json() : null)
                .then(details => {
                    const checklistItems = details?.checklist
                        ? Object.values(details.checklist).map(c => c.title).filter(Boolean)
                        : [];
                    setPlannerPaletData(prev => {
                        const bestaand = prev[key] || {};
                        return {
                            ...prev,
                            [key]: {
                                ...bestaand,
                                notitie: details?.description || bestaand.notitie || '',
                                checklist: checklistItems.length > 0 ? checklistItems : (bestaand.checklist || []),
                                ...(startDate !== undefined && { startDate }),
                                ...(dueDate !== undefined && { dueDate }),
                                ...(label !== undefined && { label }),
                                ...(userId !== undefined && { userId }),
                            }
                        };
                    });
                })
                .catch(() => {});
        });
    }, [plannerTaken]); // eslint-disable-line react-hooks/exhaustive-deps

    // Teams leden ophalen voor Planner toewijzing
    useEffect(() => {
        if (!teamsTeamId) return;
        fetch(`/api/teams/leden?teamId=${teamsTeamId}`)
            .then(async r => {
                const d = await r.json();
                if (!r.ok) { console.error('[leden] Graph fout:', d); return; }
                if (Array.isArray(d)) setTeamsLeden(d);
                else console.error('[leden] Onverwachte response:', d);
            })
            .catch(err => console.error('[leden] fetch fout:', err));
    }, [teamsTeamId]);

    // Auto-laden Planner bord + buckets aanmaken als ze ontbreken
    useEffect(() => {
        if (!project?.plannerPlanId || plannerTaken !== null || plannerTakenBezig || !myOutlookEmail) return;
        setPlannerTakenBezig(true);
        Promise.all([
            fetch(`/api/teams/planner-taken?planId=${project.plannerPlanId}`),
            fetch(`/api/teams/planner-buckets?planId=${project.plannerPlanId}`),
        ]).then(async ([r, rb]) => {
            const d = r.ok ? await r.json() : [];
            let b = rb.ok ? await rb.json() : [];
            setPlannerTaken(d);
            // Sync voltooiing van Planner terug naar app
            setProject(prev => {
                if (!prev) return prev;
                const gesync = prev.tasks.map(t => {
                    if (!t.plannerTaskId) return t;
                    const pt = d.find(p => p.id === t.plannerTaskId);
                    if (!pt) return t;
                    return { ...t, completed: pt.percentComplete === 100 };
                });
                const veranderd = gesync.some((t, i) => t.completed !== prev.tasks[i]?.completed);
                if (!veranderd) return prev;
                const bijgewerkt = { ...prev, tasks: gesync };
                try { const all = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); localStorage.setItem('schildersapp_projecten', JSON.stringify(all.map(x => String(x.id) === String(bijgewerkt.id) ? bijgewerkt : x))); } catch {}
                return bijgewerkt;
            });
            if (b.length === 0) {
                // Buckets ontbreken volledig — aanmaken vanuit sjabloon
                const sjabloon = plannerSjablonenState.find(s => s.id === plannerPaletSjabloon) || plannerSjablonenState[0];
                if (sjabloon) {
                    const bestaandeNamen = new Set(b.map(x => x.name));
                    const nieuweBuckets = [...b];
                    for (const bucket of sjabloon.buckets) {
                        if (bestaandeNamen.has(bucket.naam)) continue; // nooit duplicaten
                        const r2 = await fetch('/api/teams/planner-buckets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: project.plannerPlanId, name: bucket.naam }) });
                        if (r2.ok) { const nb = await r2.json(); nieuweBuckets.push(nb); bestaandeNamen.add(bucket.naam); }
                    }
                    b = nieuweBuckets;
                }
            }
            setPlannerBuckets(b);
            if (b[0]) setPlannerBucketKeuze(b[0].id);

            // Label-namen bidirectioneel synchroniseren met MS Planner plan-details
            try {
                const ldRes = await fetch(`/api/teams/planner-plan-details?planId=${project.plannerPlanId}`);
                if (ldRes.ok) {
                    const ld = await ldRes.json();
                    setPlannerLabelEtag(ld.etag);
                    const cats = ld.categoryDescriptions || {};
                    const DEFAULTS = { category1: 'Urgent', category2: 'Materiaal', category3: 'Wachten', category4: 'Gereed', category5: 'Klant', category6: 'Intern' };

                    // Welke categorieën heeft Planner al ingevuld?
                    const gevuld = Object.fromEntries(Object.entries(cats).filter(([, v]) => v));
                    const ontbreken = Object.entries(DEFAULTS).filter(([k]) => !gevuld[k]);

                    if (Object.keys(gevuld).length > 0) {
                        // Planner heeft namen → overnemen in app
                        setPlannerLabelNamen(prev => ({ ...prev, ...gevuld }));
                    }

                    if (ontbreken.length > 0) {
                        // Planner heeft (deels) lege namen → onze defaults ernaar schrijven
                        const nieuweCats = Object.fromEntries(ontbreken);
                        const patchRes = await fetch('/api/teams/planner-plan-details', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ planId: project.plannerPlanId, etag: ld.etag, categoryDescriptions: nieuweCats }),
                        });
                        if (patchRes.ok) {
                            // Verse etag ophalen na PATCH
                            const r2 = await fetch(`/api/teams/planner-plan-details?planId=${project.plannerPlanId}`);
                            if (r2.ok) { const d2 = await r2.json(); setPlannerLabelEtag(d2.etag); }
                        }
                    }
                }
            } catch {}

        }).catch(() => setPlannerTaken([])).finally(() => setPlannerTakenBezig(false));
    }, [project?.plannerPlanId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Planner → App auto-sync (elke 30s) ──
    const syncVanPlannerNaarApp = useCallback(async () => {
        const proj = projectRef.current;
        if (!proj?.plannerPlanId) return;
        try {
            const [rt, rb] = await Promise.all([
                fetch(`/api/teams/planner-taken?planId=${proj.plannerPlanId}`),
                fetch(`/api/teams/planner-buckets?planId=${proj.plannerPlanId}`),
            ]);
            const taken = rt.ok ? await rt.json() : null;
            const buckets = rb.ok ? await rb.json() : null;
            if (taken) setPlannerTaken(taken);
            if (buckets) setPlannerBuckets(buckets);

            // Details ophalen voor alle gekoppelde taken
            const gekoppeld = (proj.tasks || []).filter(t => t.plannerTaskId);
            const verlopenIds = new Set();
            const detailsMap = {};
            await Promise.all(gekoppeld.map(async t => {
                try {
                    const dr = await fetch(`/api/teams/planner-taak-details?taskId=${t.plannerTaskId}`);
                    if (dr.ok) detailsMap[t.plannerTaskId] = await dr.json();
                    else if (dr.status === 404) verlopenIds.add(t.id); // taak verwijderd uit Planner
                } catch {}
            }));
            // Verwijder verouderde plannerTaskId's in setProject (zodat React state ook bijgewerkt wordt)

            setProject(prev => {
                if (!prev) return prev;
                let veranderd = false;
                const gesync = prev.tasks.map(t => {
                    // Verouderde plannerTaskId opruimen (404 van MS Graph)
                    if (t.plannerTaskId && verlopenIds.has(t.id)) {
                        veranderd = true;
                        return { ...t, plannerTaskId: null };
                    }
                    if (!t.plannerTaskId) return t;
                    const pt = taken?.find(p => p.id === t.plannerTaskId);
                    const det = detailsMap[t.plannerTaskId];
                    const updates = {};
                    if (pt && (pt.percentComplete === 100) !== t.completed) updates.completed = pt.percentComplete === 100;
                    if (pt?.appliedCategories !== undefined) {
                        const plannerCats = new Set(Object.keys(pt.appliedCategories || {}).filter(k => pt.appliedCategories[k]));
                        const lokaalCats = new Set(Object.keys(t.labels || {}).filter(k => (t.labels||{})[k]));
                        if (plannerCats.size !== lokaalCats.size || [...plannerCats].some(k => !lokaalCats.has(k))) {
                            updates.labels = Object.fromEntries([...plannerCats].map(k => [k, true]));
                        }
                    }
                    if (det?.description && det.description !== t.memo) updates.memo = det.description;
                    if (det?.checklist) {
                        const plannerItems = Object.entries(det.checklist)
                            .filter(([, item]) => item?.title)
                            .map(([pid, item]) => ({ plannerItemId: pid, text: item.title, done: item.isChecked }));
                        if (plannerItems.length > 0) {
                            const lokaalIds = new Set((t.checklist || []).map(x => x.plannerItemId));
                            const plannerIds = new Set(plannerItems.map(x => x.plannerItemId));
                            const verschil = plannerItems.some(x => !lokaalIds.has(x.plannerItemId) || (t.checklist||[]).find(l => l.plannerItemId === x.plannerItemId)?.done !== x.done);
                            if (verschil || [...lokaalIds].some(id => id && !plannerIds.has(id))) updates.checklist = plannerItems;
                        }
                    }
                    if (Object.keys(updates).length > 0) { veranderd = true; return { ...t, ...updates }; }
                    return t;
                });
                if (!veranderd) return prev;
                const bijgewerkt = { ...prev, tasks: gesync };
                try { const all = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); localStorage.setItem('schildersapp_projecten', JSON.stringify(all.map(x => String(x.id) === String(bijgewerkt.id) ? bijgewerkt : x))); } catch {}
                return bijgewerkt;
            });

        } catch {}
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!project?.plannerPlanId) return;
        const interval = setInterval(syncVanPlannerNaarApp, 30000);
        // Direct syncen zodra gebruiker terugkomt van MS Planner (tab-wissel)
        const handleTabFocus = () => { if (document.visibilityState === 'visible') syncVanPlannerNaarApp(); };
        document.addEventListener('visibilitychange', handleTabFocus);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleTabFocus); };
    }, [project?.plannerPlanId, syncVanPlannerNaarApp]);

    // Auto-sync kanaalberichten
    const laadKanaalBerichten = useCallback(async () => {
        const proj = projectRef.current;
        if (!teamsTeamId || !proj?.teamsKanaalId) return;
        setKanaalBerichtenLaden(true);
        try {
            const r = await fetch(`/api/teams/kanaal-berichten?teamId=${teamsTeamId}&kanaalId=${proj.teamsKanaalId}`);
            const d = r.ok ? await r.json() : null;
            setKanaalBerichtenData(d);
        } catch {}
        finally { setKanaalBerichtenLaden(false); }
    }, [teamsTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeTab !== 'teams' || !teamsTeamId) return;
        const proj = projectRef.current;
        if (!proj?.teamsKanaalId) return;
        laadKanaalBerichten();
        const interval = setInterval(laadKanaalBerichten, 60000);
        return () => clearInterval(interval);
    }, [activeTab, teamsTeamId, laadKanaalBerichten]);

    // Auto-refresh meerwerk als de chatbot (of ander tabblad) iets opslaat
    useEffect(() => {
        const key = `schildersapp_meerwerk_${id}`;
        const handleStorage = (e) => {
            if (e.key === key || !e.key) { // e.key=null bij localStorage.setItem in zelfde tab (custom event)
                try { const s = localStorage.getItem(key); if (s) setMeerwerk(JSON.parse(s)); } catch {}
            }
        };
        window.addEventListener('storage', handleStorage);
        // Poll elke 2 seconden als fallback (storage event werkt niet altijd in zelfde tab)
        const poll = setInterval(() => {
            try {
                const s = localStorage.getItem(key);
                if (s) {
                    const parsed = JSON.parse(s);
                    setMeerwerk(prev => prev.length !== parsed.length ? parsed : prev);
                }
            } catch {}
        }, 2000);
        return () => { window.removeEventListener('storage', handleStorage); clearInterval(poll); };
    }, [id]);


    // Werkbonnen laden als bewaking tab actief wordt
    useEffect(() => {
        if (activeTab !== 'bewaking' || !id) return;
        setProjWbLoading(true);
        fetch(`/api/werkbonnen?project_id=${id}`)
            .then(r => r.json())
            .then(async bons => {
                if (!Array.isArray(bons)) return;
                setProjWerkbonnen(bons);
                const matResults = await Promise.all(
                    bons.map(b => fetch(`/api/werkbonnen/${b.id}/materialen`).then(r => r.json()).catch(() => ({ materialen: [] })))
                );
                const matMap = {};
                bons.forEach((b, i) => { matMap[b.id] = matResults[i]?.materialen || []; });
                setProjWbMat(matMap);
            })
            .catch(() => {})
            .finally(() => setProjWbLoading(false));
    }, [activeTab, id]);

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

    // Stuur een taak naar Microsoft Planner
    const stuurNaarPlanner = async (taskId, title, bucketId) => {
        console.log('[stuurNaarPlanner] title:', title, '| bucketId:', bucketId, '| plannerBucketKeuze:', plannerBucketKeuze);
        console.log('[stuurNaarPlanner] plannerBuckets:', plannerBuckets.map(b => b.name));
        if (!project.plannerPlanId) return;
        setPlannerVerstuurd(prev => ({ ...prev, [taskId]: 'bezig' }));
        try {
            const r = await fetch('/api/teams/planner-taken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: project.plannerPlanId, title, bucketId: bucketId || plannerBucketKeuze || undefined }),
            });
            if (r.ok) {
                const nieuw = await r.json();
                setPlannerTaken(prev => prev ? [...prev, nieuw] : [nieuw]);
                setPlannerVerstuurd(prev => ({ ...prev, [taskId]: 'ok' }));
                setTimeout(() => setPlannerVerstuurd(prev => { const n = { ...prev }; delete n[taskId]; return n; }), 2000);

                // Bijlagen meesturen naar Planner als references
                const lokaaleTaak = (project.tasks || []).find(t => t.id === taskId);
                const bijlagen = lokaaleTaak?.attachments || [];
                if (bijlagen.length > 0 && nieuw.id) {
                    try {
                        // Haal etag op van de nieuwe Planner taak
                        const detailsRes = await fetch(`/api/teams/planner-taak-details?taskId=${nieuw.id}`);
                        if (detailsRes.ok) {
                            const details = await detailsRes.json();
                            const etag = details['@odata.etag'];
                            const references = {};
                            for (const att of bijlagen) {
                                let webUrl = att.url || null;
                                // Base64-only bestanden eerst uploaden naar SharePoint
                                if (!webUrl && att.data && teamsTeamId) {
                                    try {
                                        const base64 = att.data.includes(',') ? att.data.split(',')[1] : att.data;
                                        const upRes = await fetch('/api/teams/upload-bijlage', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ teamId: teamsTeamId, filename: att.name, contentBase64: base64, mimeType: att.type }),
                                        });
                                        if (upRes.ok) { const upData = await upRes.json(); webUrl = upData.webUrl; }
                                    } catch {}
                                }
                                if (webUrl) {
                                    const encodedUrl = webUrl.replace(/:/g, '%3A').replace(/\./g, '%2E');
                                    references[encodedUrl] = { '@odata.type': '#microsoft.graph.plannerExternalReference', alias: att.name, type: 'Other', previewPriority: ' !' };
                                }
                            }
                            if (Object.keys(references).length > 0) {
                                await fetch('/api/teams/planner-taak-details', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ taskId: nieuw.id, references, etag }),
                                });
                            }
                        }
                    } catch {}
                }
            } else {
                setPlannerVerstuurd(prev => ({ ...prev, [taskId]: 'error' }));
            }
        } catch {
            setPlannerVerstuurd(prev => ({ ...prev, [taskId]: 'error' }));
        }
    };
    // ===== PALET HELPERS =====
    const updatePaletData = (key, patch) => {
        setPlannerPaletData(prev => {
            const nieuw = { ...prev, [key]: { ...(prev[key] || {}), ...patch } };
            try { localStorage.setItem('schildersapp_palet_data', JSON.stringify(nieuw)); } catch {}
            return nieuw;
        });
    };
    const togglePaletVinkje = (key) => {
        setPlannerPaletVinkjes(prev => {
            const nieuw = { ...prev, [key]: !prev[key] };
            if (nieuw[key]) setPlannerPaletSelectie(prev2 => { const n = new Set(prev2); n.delete(key); return n; });
            try { localStorage.setItem('schildersapp_palet_vinkjes', JSON.stringify(nieuw)); } catch {}
            return nieuw;
        });
    };
    const voegPaletBijlageToe = async (key, file) => {
        const storageKey = `palet_${key}_${file.name}`;
        await slaEmailBestandOp(storageKey, file);
        updatePaletData(key, { bijlagen: [...(plannerPaletData[key]?.bijlagen || []), { naam: file.name, storageKey }] });
    };
    const verwijderPaletBijlage = async (key, bi) => {
        const b = plannerPaletData[key]?.bijlagen?.[bi];
        if (b) { try { await verwijderEmailBestand(b.storageKey); } catch {} }
        updatePaletData(key, { bijlagen: (plannerPaletData[key]?.bijlagen || []).filter((_, i) => i !== bi) });
    };
    const voegPaletTaakToe = async ({ taakTitel, bucketNaam, userId, startDate, dueDate, label, bulk, selectie }) => {
        if (bulk && selectie) {
            setPlannerPaletAssignPopup(null);
            for (const selKey of selectie) {
                const [selBucket, selTitel] = selKey.split('|');
                await voegPaletTaakToe({ taakTitel: selTitel, bucketNaam: selBucket, userId, startDate, dueDate, label });
            }
            setPlannerPaletSelectie(new Set());
            return;
        }
        const key = bucketNaam + '|' + taakTitel;
        if (!project?.plannerPlanId) return;
        setPlannerPaletBezig(prev => ({ ...prev, [key]: true }));
        setPlannerPaletAssignPopup(null);
        // Haal altijd live buckets op zodat de state nooit verouderd is
        let liveBuckets = plannerBuckets;
        try {
            const bRes = await fetch(`/api/teams/planner-buckets?planId=${project.plannerPlanId}`);
            if (bRes.ok) {
                liveBuckets = await bRes.json();
                setPlannerBuckets(liveBuckets);
            }
        } catch {}

        const fuzzyMatch = (b, naam) =>
            b.name === naam ||
            b.name?.toLowerCase().includes(naam?.toLowerCase()) ||
            naam?.toLowerCase().includes(b.name?.toLowerCase());

        const matchBucket = liveBuckets.find(b => fuzzyMatch(b, bucketNaam));
        let bucketId = matchBucket?.id || undefined;

        console.log('[PALET] bucketNaam:', bucketNaam);
        console.log('[PALET] liveBuckets:', liveBuckets.map(b => b.name));
        console.log('[PALET] matchBucket:', matchBucket?.name, '| bucketId:', bucketId);

        // Bucket bestaat nog niet in Planner → automatisch aanmaken
        if (!matchBucket && bucketNaam && project?.plannerPlanId) {
            console.log('[PALET] Bucket niet gevonden, aanmaken:', bucketNaam);
            try {
                const bucketRes = await fetch('/api/teams/planner-buckets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: project.plannerPlanId, name: bucketNaam }),
                });
                const bucketBody = await bucketRes.json();
                console.log('[PALET] nieuweBucket response:', bucketRes.status, bucketBody);
                if (bucketRes.ok) {
                    bucketId = bucketBody.id;
                    setPlannerBuckets(prev => [...(prev || []), bucketBody]);
                }
            } catch (e) { console.error('[PALET] bucket aanmaken fout:', e); }
        }

        console.log('[PALET] Taak aanmaken met bucketId:', bucketId);

        try {
            const r = await fetch('/api/teams/planner-taken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: project.plannerPlanId, title: taakTitel, bucketId,
                    startDateTime: startDate ? new Date(startDate).toISOString() : undefined,
                    dueDateTime: dueDate ? new Date(dueDate).toISOString() : undefined,
                    appliedCategories: label ? { [label]: true } : undefined,
                    assignments: userId ? { [userId]: { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } } : undefined,
                }),
            });
            if (!r.ok) {
                const err = await r.text();
                console.error('[palet] planner-taken fout:', r.status, err);
            }
            if (r.ok) {
                const nieuw = await r.json();
                setPlannerTaken(prev => [...(prev || []), nieuw]);
                const data = plannerPaletData[key];
                const checklistItems = data?.checklist || [];
                const heeftDetails = checklistItems.length > 0 || data?.notitie;
                if (heeftDetails) {
                    const detailsRes = await fetch(`/api/teams/planner-taak-details?taskId=${nieuw.id}`);
                    if (detailsRes.ok) {
                        const details = await detailsRes.json();
                        const checklistObj = {};
                        checklistItems.forEach((item, i) => {
                            checklistObj[String(i)] = { '@odata.type': '#microsoft.graph.plannerChecklistItem', title: item, isChecked: false, orderHint: ' !' };
                        });
                        await fetch('/api/teams/planner-taak-details', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                taskId: nieuw.id,
                                description: data?.notitie || '',
                                checklist: checklistItems.length > 0 ? checklistObj : undefined,
                                etag: details['@odata.etag'],
                            }),
                        });
                    }
                }

                // Bijlagen uploaden naar SharePoint en als referentie toevoegen
                const bijlagen = data?.bijlagen || [];
                if (bijlagen.length > 0 && teamsTeamId) {
                    const references = {};
                    for (const b of bijlagen) {
                        try {
                            const fileBlob = await haalEmailBestandOp(b.storageKey);
                            if (!fileBlob) continue;
                            const blob = fileBlob.blob || fileBlob;
                            const base64 = await new Promise(res => {
                                const reader = new FileReader();
                                reader.onload = e => res(e.target.result.split(',')[1]);
                                reader.readAsDataURL(blob);
                            });
                            const uploadRes = await fetch('/api/teams/upload-bijlage', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ teamId: teamsTeamId, filename: b.naam, contentBase64: base64, mimeType: blob.type }),
                            });
                            if (uploadRes.ok) {
                                const { webUrl } = await uploadRes.json();
                                if (webUrl) {
                                    references[webUrl] = { '@odata.type': '#microsoft.graph.plannerExternalReference', alias: b.naam, type: 'Other', previewPriority: ' !' };
                                    // Sla webUrl op in lokale bijlage voor het link-icoontje
                                    updatePaletData(key, {
                                        bijlagen: (plannerPaletData[key]?.bijlagen || []).map((bj, i) => bj.storageKey === b.storageKey ? { ...bj, plannerUrl: webUrl } : bj)
                                    });
                                }
                            }
                        } catch {}
                    }
                    if (Object.keys(references).length > 0) {
                        const detailsRes2 = await fetch(`/api/teams/planner-taak-details?taskId=${nieuw.id}`);
                        if (detailsRes2.ok) {
                            const details2 = await detailsRes2.json();
                            // Planner vereist URL-encoded keys (: → %3A, . → %2E)
                            const encodedRefs = {};
                            for (const [url, val] of Object.entries(references)) {
                                const encodedKey = url.replace(/:/g, '%3A').replace(/\./g, '%2E');
                                encodedRefs[encodedKey] = val;
                            }
                            const refRes = await fetch('/api/teams/planner-taak-details', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ taskId: nieuw.id, references: encodedRefs, etag: details2['@odata.etag'] }),
                            });
                            if (!refRes.ok) console.error('[palet] referentie fout:', refRes.status, await refRes.text());
                        }
                    }
                }
            }
        } catch {}
        setPlannerPaletBezig(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const stuurProjectTaakNaarPlanner = async (taak) => {
        if (!project?.plannerPlanId) return;
        setProjTaakPlannerBezig(prev => new Set([...prev, taak.id]));

        // Haal altijd live buckets op
        let liveBuckets = plannerBuckets;
        try {
            const bRes = await fetch(`/api/teams/planner-buckets?planId=${project.plannerPlanId}`);
            if (bRes.ok) { liveBuckets = await bRes.json(); setPlannerBuckets(liveBuckets); }
        } catch {}

        const fuzzy = (b, naam) => !!(naam && (
            b.name === naam ||
            b.name?.toLowerCase().includes(naam.toLowerCase()) ||
            naam.toLowerCase().includes(b.name?.toLowerCase())
        ));

        let matchBucket = liveBuckets.find(b => fuzzy(b, taak.bucketNaam));
        let bucketId = matchBucket?.id;

        console.log('[stuurProject] taak.bucketNaam:', taak.bucketNaam, '| match:', matchBucket?.name, '| bucketId:', bucketId);

        // Bucket bestaat nog niet → aanmaken
        if (!matchBucket && taak.bucketNaam) {
            try {
                const bucketRes = await fetch('/api/teams/planner-buckets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: project.plannerPlanId, name: taak.bucketNaam }),
                });
                const bucketBody = await bucketRes.json();
                console.log('[stuurProject] bucket aanmaken status:', bucketRes.status, bucketBody);
                if (bucketRes.ok && bucketBody.id) {
                    bucketId = bucketBody.id;
                    setPlannerBuckets(prev => [...(prev || []), bucketBody]);
                } else {
                    console.error('[stuurProject] bucket aanmaken mislukt:', bucketRes.status, bucketBody);
                }
            } catch (e) { console.error('[stuurProject] bucket aanmaken fout:', e); }
        }

        try {
            // Taak aanmaken in Planner
            const postBody = { planId: project.plannerPlanId, title: taak.name };
            if (bucketId) postBody.bucketId = bucketId;
            if (taak.startDate) postBody.startDateTime = new Date(taak.startDate + 'T00:00:00').toISOString();
            if (taak.endDate) postBody.dueDateTime = new Date(taak.endDate + 'T00:00:00').toISOString();
            const toegewezenId = taak.assignedTo?.[0];
            const isGeldigId = toegewezenId && typeof toegewezenId === 'string' && toegewezenId.includes('-');
            if (isGeldigId) postBody.assignments = { [toegewezenId]: { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } };

            console.log('[stuurProject] POST taak met bucketId:', bucketId);
            const r = await fetch('/api/teams/planner-taken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postBody),
            });
            if (!r.ok) { setProjTaakPlannerBezig(prev => { const n = new Set(prev); n.delete(taak.id); return n; }); return; }
            const nieuw = await r.json();
            setPlannerTaken(prev => [...(prev || []), nieuw]);

            // Details (memo + checklist) in één PATCH sturen
            try {
                const detailsRes = await fetch(`/api/teams/planner-taak-details?taskId=${nieuw.id}`);
                if (detailsRes.ok) {
                    const details = await detailsRes.json();
                    const checklistObj = {};
                    (taak.checklist || []).forEach((item, i) => {
                        checklistObj[String(i)] = { '@odata.type': '#microsoft.graph.plannerChecklistItem', title: item.text, isChecked: item.done || false, orderHint: ' !' };
                    });
                    const patchBody = { taskId: nieuw.id, etag: details['@odata.etag'] };
                    if (taak.memo) patchBody.description = taak.memo;
                    if (Object.keys(checklistObj).length > 0) patchBody.checklist = checklistObj;
                    if (taak.memo || Object.keys(checklistObj).length > 0) {
                        await fetch('/api/teams/planner-taak-details', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(patchBody),
                        });
                    }
                }
            } catch {}

            // plannerTaskId terugschrijven — gebruik projectRef om stale closure te vermijden
            const huidigProject = projectRef.current;
            const bijgewerkteTaken = (huidigProject?.tasks || []).map(t => t.id === taak.id ? { ...t, plannerTaskId: nieuw.id } : t);
            saveProject({ ...huidigProject, tasks: bijgewerkteTaken });

        } catch (err) {
            console.error('stuurProjectTaakNaarPlanner fout:', err);
        }
        setProjTaakPlannerBezig(prev => { const n = new Set(prev); n.delete(taak.id); return n; });
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
            showToast('Nog geen e-mailcontacten. Voeg er een toe via Overzicht → E-mailcontacten.', 'warning');
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
            showToast('Nog geen e-mailcontacten. Voeg er een toe via Overzicht → E-mailcontacten.', 'warning');
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
                // Sla verzonden email op in project emaillijst
                voegEmailToe({
                    direction: 'out',
                    richting: 'out',
                    van: vanNaam?.trim() || 'Wij',
                    aan: contact.email,
                    to: contact.email,
                    onderwerp: onderwerp?.trim() || `Meerwerk akkoordverzoek — ${project.name}`,
                    subject: onderwerp?.trim() || `Meerwerk akkoordverzoek — ${project.name}`,
                    datum: nu,
                    date: nu,
                    categorie: 'Opdracht',
                    body: persoonlijkBericht?.trim() || '',
                    notitie: persoonlijkBericht?.trim() || '',
                });
                // Post naar Teams-kanaal als project gekoppeld is
                if (project.teamsKanaalId && teamsTeamId) {
                    fetch('/api/teams/kanaal-bericht', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            teamId: teamsTeamId,
                            kanaalId: project.teamsKanaalId,
                            onderwerp: onderwerp?.trim() || `Meerwerk akkoordverzoek — ${project.name}`,
                            van: vanNaam?.trim() || 'App',
                            inhoud: `Akkoordverzoek verstuurd naar <b>${contact.naam}</b> (${contact.email})`,
                        }),
                    }).catch(() => {});
                }
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
        if (!allUsers || !project) return { totaal: 0, perPersoon: [], alleRegistraties: [] };
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
        
        // Zorg dat we ook recente weken hebben onafhankelijk van startdatum
        let minDate = cursor;
        const maxWeeksBack = new Date();
        maxWeeksBack.setMonth(maxWeeksBack.getMonth() - 3);
        if (minDate > maxWeeksBack) minDate = maxWeeksBack;
        
        const processDate = new Date(minDate);
        while (processDate <= today || weekSet.size === 0) {
            const d = new Date(processDate);
            const jan4 = new Date(d.getFullYear(), 0, 4);
            const dow = jan4.getDay() || 7;
            const wk = Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + dow) / 7);
            weekSet.add(`${wk}_${d.getFullYear()}`);
            processDate.setDate(processDate.getDate() + 7);
        }
        
        // Voor de zekerheid ook de huidige week toevoegen
        const now = new Date();
        const j4 = new Date(now.getFullYear(), 0, 4);
        const wNow = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + (j4.getDay() || 7)) / 7);
        weekSet.add(`${wNow}_${now.getFullYear()}`);

        const weeks = [...weekSet];
        const perPersoon = [];
        const alleRegistraties = [];

        allUsers.forEach(u => {
            let urenTotaal = 0;
            let kostenTotaal = 0;
            let weekBreakdown = [];
            const profiel = getProfile(u.id) || {};
            // Interne kostprijs (fallback waarden voor simulatie als uurtarief onbekend is)
            const uurKosten = profiel.uurtarief || (u.role === "ZZP'er" ? 45 : u.role === "Voorman" ? 40 : 35);

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
                            (hrs || []).slice(0, 7).forEach((h, i) => {
                                const val = parseVal(h);
                                if (val > 0) {
                                    weekUren += val;
                                    const valKosten = val * uurKosten;
                                    const akKosten = valKosten * (akPercentage / 100);
                                    const dagen = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
                                    alleRegistraties.push({
                                        id: `${u.id}_${wk}_${tid}_${Math.random()}`,
                                        medewerker: u.name,
                                        week: weekNum,
                                        jaar: yearNum,
                                        dag: dagen[i] || `Dag ${i+1}`,
                                        type: tid === 'regulier' ? 'Regulier' : tid === 'meerwerk' ? 'Meerwerk' : tid,
                                        uren: val,
                                        kosten: valKosten,
                                        ak: akKosten
                                    });
                                }
                            });
                        });
                    });
                    if (weekUren > 0) {
                        urenTotaal += weekUren;
                        kostenTotaal += weekUren * uurKosten;
                        weekBreakdown.push({ weekNum, yearNum, uren: weekUren, kosten: weekUren * uurKosten, ak: (weekUren * uurKosten) * (akPercentage / 100) });
                    }
                } catch { /* skip */ }
            });
            if (urenTotaal > 0) {
                perPersoon.push({ ...u, uren: urenTotaal, kosten: kostenTotaal, weekBreakdown });
            }
        });

        // Sorteer van nieuw naar oud
        alleRegistraties.sort((a, b) => {
            if (b.jaar !== a.jaar) return b.jaar - a.jaar;
            return b.week - a.week;
        });

        const totaal = perPersoon.reduce((s, p) => s + p.uren, 0);
        const totaalKosten = perPersoon.reduce((s, p) => s + p.kosten, 0);
        const totaalAK = totaalKosten * (akPercentage / 100);
        return { totaal: Math.round(totaal * 10) / 10, totaalKosten, totaalAK, perPersoon, alleRegistraties };
    };
    const urenData = calcUrenVoorProject();
    const werkelijkeUren = urenData.totaal;
    const werkelijkeKosten = urenData.totaalKosten;
    const werkelijkeAK = urenData.totaalAK;
    const urenPerPersoon = urenData.perPersoon;
    const alleRegistraties = urenData.alleRegistraties;

    // Nacalculatie Derived Values
    const materiaalLijstKosten = materiaalItems.reduce((s, c) => s + c.bedrag, 0);
    const materiaalKosten = materiaalKostenType === '10' ? werkelijkeKosten * 0.10 :
                            materiaalKostenType === '15' ? werkelijkeKosten * 0.15 :
                            materiaalKostenType === '20' ? werkelijkeKosten * 0.20 :
                            materiaalLijstKosten;
    const totaleKostprijs = werkelijkeKosten + werkelijkeAK + materiaalKosten;
    const werkelijkeWR = totaleKostprijs * (wrPercentage / 100);
    const totaleProjectKosten = totaleKostprijs + werkelijkeWR;
    const offerteTarget = parseFloat(project?.prijs) || (project?.estimatedHours * 55) || 0;
    const budgetPct = offerteTarget > 0 ? Math.round((totaleProjectKosten / offerteTarget) * 100) : 0;
    const overBudget = budgetPct > 100;
    const nearBudget = budgetPct >= 90 && budgetPct <= 100;


    useEffect(() => {
        const stored = localStorage.getItem('schildersapp_projecten');
        const parsedStored = stored ? JSON.parse(stored) : null;
        let allProjects = (parsedStored && parsedStored.length > 0) ? parsedStored : INITIAL_PROJECTS;
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

        // Server als bron van waarheid — laad projecten van API
        fetch('/api/projecten').then(r => r.json()).then(serverProjs => {
            if (serverProjs.length > 0) {
                setProjects(serverProjs);
                const serverFound = serverProjs.find(p => String(p.id) === String(id));
                if (serverFound) {
                    setProject(serverFound);
                    setOfferteBedrag(String(serverFound.estimatedHours * (serverFound.hourlyRate || 55)));
                }
                localStorage.setItem('schildersapp_projecten', JSON.stringify(serverProjs));
            }
        }).catch(() => {});

        // Notities Ophalen vanuit NAS Database (The Cloud)
        const loadNotes = async () => {
            try {
                const res = await fetch(`/api/notes?projectId=${id}`);
                const data = await res.json();
                if (data.success) {
                    const normalized = data.notes.map(n => ({ ...n, text: n.text || n.content || '' }));
                    setNotes(normalized);
                    localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(normalized));
                    window.dispatchEvent(new StorageEvent('storage', { key: `schildersapp_notes_${id}`, newValue: JSON.stringify(normalized) }));
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
            if (e.key === `schildersapp_notes_${id}`) {
                try { if (e.newValue) setNotes(JSON.parse(e.newValue)); } catch {}
            }
            if (e.key === 'schildersapp_projecten' && e.newValue) {
                try {
                    const allProjs = JSON.parse(e.newValue);
                    const found = allProjs.find(p => String(p.id) === String(id));
                    if (found) { setProject(found); setProjects(allProjs); }
                } catch {}
            }
        };
        const handleSchildersSync = () => {
            try {
                const stored = localStorage.getItem(`schildersapp_notes_${id}`);
                if (stored) setNotes(JSON.parse(stored));
            } catch {}
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
        window.addEventListener('schilders-sync', handleSchildersSync);
        document.addEventListener('visibilitychange', handleVisible);
        return () => {
            window.removeEventListener('notes-updated', handleNotesUpdate);
            window.removeEventListener('photos-updated', handlePhotosUpdate);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('schilders-sync', handleSchildersSync);
            document.removeEventListener('visibilitychange', handleVisible);
        };

    }, [id]);

    const saveProject = (updated) => {
        setProject(updated);
        const newProjects = projects.map(p => p.id === updated.id ? updated : p);
        setProjects(newProjects);
        try {
            localStorage.setItem('schildersapp_projecten', JSON.stringify(newProjects));
            window.dispatchEvent(new Event('schilders-sync'));
        } catch (e) {
            // localStorage vol (QuotaExceededError) — toon waarschuwing maar verlies geen data
            console.error('localStorage vol:', e);
            setToast('⚠️ Opslag vol — verwijder oude emails of bestanden');
            setTimeout(() => setToast(null), 5000);
        }
        // Server sync
        fetch('/api/projecten', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: updated }) }).catch(() => {});
    };

    // Sync checklistLocal bij project-wissel
    useEffect(() => {
        if (project?.checklist) setChecklistLocal([...project.checklist]);
    }, [project?.id]);

    // 30-seconden polling voor cross-device sync
    useEffect(() => {
        const interval = setInterval(() => {
            fetch('/api/projecten').then(r => r.json()).then(serverProjs => {
                if (serverProjs.length > 0) {
                    const found = serverProjs.find(p => String(p.id) === String(id));
                    if (found && !checklistEditingRef.current) { setProject(found); setProjects(serverProjs); localStorage.setItem('schildersapp_projecten', JSON.stringify(serverProjs)); }
                }
            }).catch(() => {});
            fetch(`/api/notes?projectId=${id}`).then(r => r.json()).then(data => {
                if (data.success) {
                    const normalized = data.notes.map(n => ({ ...n, text: n.text || n.content || '' }));
                    setNotes(normalized);
                    localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(normalized));
                }
            }).catch(() => {});
        }, 30000);
        return () => clearInterval(interval);
    }, [id]);

    const handlePlanningBevestigen = (taskId, startDate, endDate) => {
        if (!startDate || !endDate) { showToast('Vul een start- en einddatum in', 'error'); return; }
        saveProject({ ...project, tasks: project.tasks.map(t => t.id === taskId ? { ...t, startDate, endDate } : t) });
        showToast(`Top! "${planningModal.taskName}" staat in de planning.`, 'success');
        setPlanningModal(null);
    };

    const handleDelen = (taskId, mode, userId) => {
        let newAssignedTo;
        if (mode === 'persoon') {
            if (!userId) { showToast('Selecteer een medewerker', 'error'); return; }
            newAssignedTo = [Number(userId)];
        } else {
            const ids = [...new Set((project.tasks || []).flatMap(t => (t.assignedTo || []).map(Number)))];
            newAssignedTo = ids.length > 0 ? ids : allUsers.map(u => u.id);
        }
        saveProject({ ...project, tasks: project.tasks.map(t => t.id === taskId ? { ...t, assignedTo: newAssignedTo } : t) });
        const naam = mode === 'persoon' ? (allUsers.find(u => u.id === Number(userId))?.name || 'medewerker') : 'het projectteam';
        showToast(`Taak gedeeld met ${naam}`, 'success');
        setDelenModal(null);
    };

    const handleNaarPlanning = (task) => {
        if (!task.startDate || !task.endDate) {
            setPlanningModal({ taskId: task.id, taskName: task.name, startDate: task.startDate || '', endDate: task.endDate || '' });
            return;
        }
        if (!task.assignedTo || task.assignedTo.length === 0) {
            showToast('Wijs eerst een medewerker toe via "Delen"', 'error');
            return;
        }
        setPlannerStempelBezig(prev => ({ ...prev, [task.id]: true }));
        saveProject({ ...project });
        setTimeout(() => setPlannerStempelBezig(prev => { const n = { ...prev }; delete n[task.id]; return n; }), 1200);
        showToast(`"${task.name}" staat in de weekplanning!`, 'success');
    };

    const updateTaskMemo = (taskId, val) => {
        const updated = { ...project, tasks: project.tasks.map(t => t.id === taskId ? { ...t, memo: val } : t) };
        saveProject(updated);
    };

    // Helper: sync één taak naar Planner na een wijziging
    const syncTaakNaarPlanner = async (taak, taakVelden = {}, detailsVelden = {}) => {
        if (!taak?.plannerTaskId) { console.log('[sync] geen plannerTaskId op taak', taak?.id, taak?.name); return; }
        const pid = taak.plannerTaskId;
        // Taak-niveau (datums, labels, toewijzing) — etag ophalen uit plannerTaken state
        if (Object.keys(taakVelden).length > 0) {
            const plannerTaak = (plannerTakenRef.current || []).find(t => t.id === pid);
            const etag = plannerTaak?.['@odata.etag'];
            if (!etag) return; // etag nog niet geladen — auto-sync pakt het op

            const doPatch = async (etagToUse) => {
                const r = await fetch('/api/teams/planner-taken', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: pid, etag: etagToUse, ...taakVelden }),
                });
                if (r.status === 409 || r.status === 412) {
                    // Etag verouderd → haal verse lijst op en probeer opnieuw
                    try {
                        const planId = projectRef.current?.plannerPlanId;
                        if (!planId) return;
                        const planTaken = await fetch(`/api/teams/planner-taken?planId=${planId}`);
                        if (!planTaken.ok) return;
                        const taken = await planTaken.json();
                        const verseTaak = taken.find(t => t.id === pid);
                        if (verseTaak?.['@odata.etag']) {
                            setPlannerTaken(prev => (prev || []).map(t => t.id === pid ? verseTaak : t));
                            await fetch('/api/teams/planner-taken', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ taskId: pid, etag: verseTaak['@odata.etag'], ...taakVelden }),
                            });
                        }
                    } catch {}
                } else if (!r.ok) {
                    r.text().then(t => console.error('[sync taak PATCH fout]', r.status, t));
                }
            };
            doPatch(etag).catch(() => {});
        }
        // Details-niveau (notitie, checklist)
        if (Object.keys(detailsVelden).length > 0) {
            fetch(`/api/teams/planner-taak-details?taskId=${pid}`)
                .then(r => r.ok ? r.json() : (r.text().then(t => { console.error('[sync details GET fout]', r.status, t); return null; })))
                .then(details => {
                    if (!details) return;
                    fetch('/api/teams/planner-taak-details', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskId: pid, etag: details['@odata.etag'], ...detailsVelden }),
                    }).then(r => { if (!r.ok) r.text().then(t => console.error('[sync details PATCH fout]', r.status, t)); });
                }).catch(e => console.error('[sync details fout]', e));
        }
    };

    const verwerkEmailBestand = async (files) => {
        const fmt = (d) => d.toISOString().split('T')[0];
        for (const file of Array.from(files)) {
            const isMsg = file.name.toLowerCase().endsWith('.msg')
                || file.type === 'application/vnd.ms-outlook'
                || (file.type === 'application/octet-stream' && file.name && !file.name.includes('.'));
            const isEml = file.name.toLowerCase().endsWith('.eml') || file.type === 'message/rfc822';
            if (!isMsg && !isEml) continue;
            try {
                let parsed = {};
                const fileId = Date.now() + Math.random();
                // Chunked btoa — voorkomt stack overflow bij grote afbeeldingen (>65k bytes)
                const toB64 = (bytes) => { let s = ''; const c = 8192; for (let i = 0; i < bytes.length; i += c) s += btoa(String.fromCharCode(...bytes.subarray(i, i + c))); return s; };
                if (isMsg) {
                    const buffer = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsArrayBuffer(file); });
                    const MsgReader = (await import('@kenjiuno/msgreader')).default;
                    const msg = new MsgReader(buffer);
                    const info = msg.getFileData();
                    const smtpEmail = info.sentRepresentingSmtpAddress || info.senderEmail || '';
                    const from = smtpEmail ? (info.senderName ? `${info.senderName} <${smtpEmail}>` : smtpEmail) : (info.senderName || '');
                    const dateRaw = info.messageDeliveryTime || info.clientSubmitTime;
                    const decodeBody = (val) => { if (!val) return null; if (typeof val === 'string') return val; try { return new TextDecoder('utf-8').decode(val) || null; } catch { return null; } };
                    let bodyHtml = decodeBody(info.bodyHtml);
                    // Vervang cid: referenties — bytes via msg.getAttachment(), contentId via att.pidContentId
                    const inlinedCids = new Set();
                    if (bodyHtml && bodyHtml.includes('cid:')) {
                        for (const att of (info.attachments || [])) {
                            const cid = (att.pidContentId || att.contentId || '').replace(/[<>]/g, '');
                            if (!cid) continue;
                            try {
                                const attData = msg.getAttachment(att);
                                const raw = attData?.content || attData?.fileData || att.content || att.fileData;
                                if (!raw) continue;
                                const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                                const mime = att.attachMimeTag || att.mimeType || 'image/png';
                                bodyHtml = bodyHtml.split(`cid:${cid}`).join(`data:${mime};base64,${toB64(bytes)}`);
                                inlinedCids.add(cid);
                            } catch {}
                        }
                    }
                    // Zorg voor juiste charset & links openen in nieuw tabblad
                    if (bodyHtml) {
                        if (/<html/i.test(bodyHtml)) {
                            if (!/<meta[^>]+charset/i.test(bodyHtml)) bodyHtml = bodyHtml.replace(/(<head[^>]*>)/i, '$1<meta charset="utf-8"><base target="_blank">');
                        } else {
                            bodyHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;margin:0;padding:12px">${bodyHtml}</body></html>`;
                        }
                    }
                    // Niet-inline bijlagen (PDF, Word, …) opslaan in IndexedDB
                    const attMetadata = [];
                    for (let i = 0; i < (info.attachments || []).length; i++) {
                        const att = info.attachments[i];
                        const cid = (att.pidContentId || att.contentId || '').replace(/[<>]/g, '') || null;
                        if (cid && inlinedCids.has(cid)) continue; // al inline verwerkt
                        const attData = msg.getAttachment(att);
                        const raw = attData?.content || attData?.fileData || att.content || att.fileData;
                        if (!raw) continue;
                        const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                        if (bytes.length < 50) continue; // sla metadata-flarden over
                        const name = att.fileName || att.name || `bijlage_${i + 1}`;
                        const ext = name.toLowerCase().split('.').pop();
                        const extMime = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', bmp:'image/bmp', tiff:'image/tiff', tif:'image/tiff', heic:'image/heic', pdf:'application/pdf', doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                        const mime = att.attachMimeTag || att.mimeType || extMime[ext] || 'application/octet-stream';
                        try { await slaEmailBestandOp(`${fileId}_att_${i}`, new Blob([bytes], { type: mime })); attMetadata.push({ id: `${fileId}_att_${i}`, name, mimeType: mime, size: bytes.length }); } catch {}
                    }
                    // bodyHtml NIET in parsed — wordt on-demand geladen uit IndexedDB (voorkomt localStorage overflow bij grote afbeeldingen)
                    parsed = { subject: info.subject || '', from, body: typeof info.body === 'string' ? info.body : '', attachments: attMetadata, date: dateRaw ? fmt(new Date(dateRaw)) : fmt(new Date()) };
                } else {
                    const text = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsText(file, 'utf-8'); });
                    const getH = (h) => { const m = text.match(new RegExp(`^${h}:\\s*(.+)`, 'im')); return m ? m[1].trim() : ''; };
                    parsed = { subject: getH('Subject'), from: getH('From'), body: text.replace(/^[\s\S]*?\n\n/, '').trim(), attachments: [], date: fmt(new Date()) };
                }
                await slaEmailBestandOp(fileId, file);
                const fromEmail = ((parsed.from || '').match(/<([^>]+)>/) || [])[1]?.toLowerCase() || (parsed.from || '').toLowerCase().trim();
                const ownEmail = myOutlookEmail || localStorage.getItem('schildersapp_mijn_outlook_email') || '';
                const richting = ownEmail && fromEmail === ownEmail ? 'out' : 'in';
                // Open formulier met vooringevulde velden
                setEmailForm({
                    richting,
                    van: parsed.from || '',
                    onderwerp: parsed.subject || '',
                    datum: parsed.date || fmt(new Date()),
                    categorie: 'Overig',
                    notitie: '',
                    _body: parsed.body || '',
                    _attachments: parsed.attachments || [],
                    _fileId: fileId,
                    _fileName: file.name,
                    _fileSize: file.size,
                    _aiLoading: !!(parsed.subject || parsed.body),
                    _aiTaken: [],
                });
                // AI taken voorstellen op de achtergrond
                const bodyForAi = parsed.body || '';
                if (parsed.subject || bodyForAi) {
                    fetch('/api/outlook/extract-taken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: parsed.subject, body: bodyForAi }) })
                        .then(r => r.ok ? r.json() : { taken: [] })
                        .then(data => setEmailForm(prev => prev ? { ...prev, _aiLoading: false, _aiTaken: data.taken || [] } : prev))
                        .catch(() => setEmailForm(prev => prev ? { ...prev, _aiLoading: false } : prev));
                }
            } catch (err) { console.warn('Email verwerking fout:', err); }
        }
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
        const taak = project.tasks.find(t => t.id === taskId);
        const nieuweStatus = !taak?.completed;
        saveProject({ ...project, tasks: project.tasks.map(t => t.id === taskId ? { ...t, completed: nieuweStatus } : t) });
        if (taak?.plannerTaskId) {
            const plannerTaak = (plannerTakenRef.current || []).find(t => t.id === taak.plannerTaskId);
            const etag = plannerTaak?.['@odata.etag'];
            if (etag) {
                fetch('/api/teams/planner-taken', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: taak.plannerTaskId, percentComplete: nieuweStatus ? 100 : 0, etag }),
                }).catch(() => {});
            }
        }
    };

    const addNote = () => {
        if (!newNote.trim()) return;
        const note = { id: Date.now(), text: newNote, type: noteType, author: user?.name || 'Jan Modaal', date: new Date().toISOString().split('T')[0] };
        const updated = [note, ...notes];
        setNotes(updated);
        localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(updated));
        window.dispatchEvent(new StorageEvent('storage', { key: `schildersapp_notes_${id}`, newValue: JSON.stringify(updated) }));
        window.dispatchEvent(new Event('schilders-sync'));
        // Server sync
        fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id, content: newNote, author: note.author, type: noteType, date: note.date }) }).catch(() => {});
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
        fetch(`/api/notes?id=${noteId}`, { method: 'DELETE' }).catch(() => {});
    };

    const saveNoteEdit = (noteId) => {
        if (!editingNoteText.trim()) return;
        const updated = notes.map(n => n.id === noteId ? { ...n, text: editingNoteText.trim(), content: editingNoteText.trim() } : n);
        setNotes(updated);
        localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: editingNoteText.trim() }) }).catch(() => {});
        setEditingNoteId(null);
        setEditingNoteText('');
    };

    const handleNoteMedia = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPoNoteMediaUploading(true);
        e.target.value = '';
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(id));
            formData.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setPoNoteMedia({ url: data.url, mediaType: file.type.startsWith('video/') ? 'video' : 'image' });
        } catch (err) { console.error('Media upload mislukt:', err); }
        finally { setPoNoteMediaUploading(false); }
    };

    const addReply = (noteId) => {
        if (!replyText.trim()) return;
        const reply = { id: Date.now(), author: user?.name || 'Beheerder', text: replyText.trim(), created_at: new Date().toISOString() };
        const updated = notes.map(n => n.id === noteId ? { ...n, replies: [...(n.replies || []), reply] } : n);
        setNotes(updated);
        localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, addReply: { author: reply.author, text: reply.text } }) }).catch(() => {});
        setReplyText('');
        setReplyingToNoteId(null);
    };

    const handleAddMediaToNote = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !addingMediaToNoteId) return;
        e.target.value = '';
        const noteId = addingMediaToNoteId;
        setAddMediaUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(id));
            formData.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const updated = notes.map(n => n.id === noteId ? { ...n, photo: data.url, mediaType } : n);
            setNotes(updated);
            localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(updated));
            fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: updated.find(n => n.id === noteId)?.content || updated.find(n => n.id === noteId)?.text || '', photo: data.url, mediaType }) }).catch(() => {});
        } catch (err) { console.error('Media upload mislukt:', err); }
        finally { setAddMediaUploading(false); setAddingMediaToNoteId(null); }
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
    const projectTeamIds = [...new Set((project?.tasks || []).flatMap(t => (t.assignedTo || []).map(Number)))];
    const projectTeamUsers = allUsers.filter(u => projectTeamIds.includes(u.id));
    const offerte = parseFloat(offerteBedrag) || (project.estimatedHours * (project.hourlyRate || 55));
    const betaald = termijnen.filter(t => t.betaald).reduce((s, t) => s + t.bedrag, 0);
    const gefactureerd = termijnen.reduce((s, t) => s + t.bedrag, 0);
    const openstaand = gefactureerd - betaald;

    // Bewaking-metrics beschikbaar buiten de bewaking IIFE (ook gebruikt in Overzicht tab)
    const ovBudgetPct = offerte > 0 ? Math.round((gefactureerd / offerte) * 100) : 0;
    const ovUrenPct   = project.estimatedHours > 0 ? Math.round((werkelijkeUren / project.estimatedHours) * 100) : 0;
    const ovStartD    = new Date((project.startDate || new Date().toISOString().slice(0,10)) + 'T00:00:00');
    const ovEndD      = new Date((project.endDate   || new Date().toISOString().slice(0,10)) + 'T00:00:00');
    const ovTotalDays = Math.max(1, Math.ceil((ovEndD - ovStartD) / 86400000));
    const ovElapsed   = Math.min(ovTotalDays, Math.max(0, Math.ceil((new Date() - ovStartD) / 86400000)));
    const ovPlanPct   = Math.round((ovElapsed / ovTotalDays) * 100);

    const TABS = [
        { id: 'overzicht', label: 'Overzicht', icon: 'fa-house' },
        { id: 'projectoverzicht', label: 'Project Overzicht', icon: 'fa-folder-open' },
        { id: 'planning', label: 'Planning', icon: 'fa-chart-gantt' },
        { id: 'taken', label: `Taken (${totalTasks})`, icon: 'fa-list-check' },
        { id: 'notities', label: `Notities (${notes.length})`, icon: 'fa-note-sticky' },
        { id: 'financien', label: 'Financiën', icon: 'fa-euro-sign' },
        { id: 'documenten', label: 'Documenten', icon: 'fa-file-lines' },
        { id: 'bewaking', label: 'Bewaking', icon: 'fa-shield-halved' },
        { id: 'dossier', label: 'Dossier', icon: 'fa-briefcase' },
        { id: 'teams', label: 'Teams', icon: 'fa-brands fa-microsoft' },
        { id: 'planner', label: 'Planner', icon: 'fa-list-check' },
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
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fa-solid fa-folder-open" style={{ fontSize: '1.1rem', color: '#fff' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{project.name}</h1>
                                <span style={{ background: statusCfg.bg, color: statusCfg.color, padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <i className={`fa-solid ${statusCfg.icon}`} /> {statusCfg.label}
                                </span>
                            </div>
                            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span><i className="fa-solid fa-user" style={{ marginRight: '3px' }} />{project.client}</span>
                                <span>•</span>
                                <span><i className="fa-solid fa-location-dot" style={{ marginRight: '3px' }} />{project.address}</span>
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select value={project.status} onChange={e => saveProject({ ...project, status: e.target.value })}
                            style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, background: '#fff', cursor: 'pointer', color: '#1e293b' }}>
                            <option value="planning">In Planning</option>
                            <option value="active">Actief</option>
                            <option value="paused">Gepauzeerd</option>
                            <option value="completed">Afgerond</option>
                        </select>
                        <Link href="/projecten" style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fa-solid fa-chart-gantt" /> Gantt
                        </Link>
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    {[
                        { icon: 'fa-circle-check', color: '#F5850A', bg: 'rgba(245,133,10,0.1)', label: 'Voortgang', value: `${progress}%`, sub: `${completedTasks}/${totalTasks} taken` },
                        { icon: 'fa-calendar-days', color: daysLeft < 0 ? '#ef4444' : daysLeft < 14 ? '#f59e0b' : '#3b82f6', bg: daysLeft < 0 ? '#fef2f2' : daysLeft < 14 ? '#fffbeb' : '#eff6ff', label: 'Resterende tijd', value: daysLeft < 0 ? 'Verlopen' : `${daysLeft} dagen`, sub: `Oplevering ${formatDate(project.endDate)}` },
                        { icon: 'fa-clock', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Geschatte uren', value: `${project.estimatedHours}u`, sub: `Start ${formatDate(project.startDate)}` },
                        { icon: 'fa-users', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Team', value: `${teamUsers.length} pers.`, sub: teamUsers.map(u => u.name.split(' ')[0]).join(', ') || 'Niemand' },
                    ].map((s, i) => (
                        <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                                <i className={`fa-solid ${s.icon}`} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                                <div style={{ fontSize: '0.62rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', alignItems: 'start' }}>
                    {/* Klantgegevens */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-user-tie" style={{ color: '#F5850A' }} /> Klant- & Bedrijfsgegevens
                            </h3>
                            {!editingClient ? (
                                <button onClick={() => { setEditForm({ client: project.client, address: project.address, clientType: project.clientType || 'zakelijk', name: project.name || '', phone: project.phone || '', email: project.email || '', projectnummer: project.projectnummer || '', bedrijfsnaam: project.bedrijfsnaam || '', contactpersoon: project.contactpersoon || '', werkAdres: project.werkAdres || '', kvk: project.kvk || '', btw: project.btw || '', startDate: project.startDate, endDate: project.endDate, estimatedHours: project.estimatedHours }); setEditingClient(true); }}
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
                                    <button onClick={() => { let finalName = editForm.name || project.name || ''; if (editForm.projectnummer && !finalName.startsWith(editForm.projectnummer)) { finalName = `${editForm.projectnummer} - ${finalName}`; } saveProject({ ...project, ...editForm, name: finalName, estimatedHours: Number(editForm.estimatedHours) }); setEditingClient(false); }}
                                        style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-check" /> Opslaan
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingClient && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                            {[
                                { icon: 'fa-hashtag', label: 'Projectnummer', value: project.projectnummer || '—' },
                                { icon: 'fa-folder', label: 'Projectnaam', value: project.name || '—' },
                                { icon: 'fa-user', label: 'Opdrachtgever', value: project.client },
                                { icon: 'fa-building', label: 'Bedrijfsnaam', value: project.bedrijfsnaam || '—' },
                                { icon: 'fa-address-card', label: 'Contactpersoon', value: project.contactpersoon || '—' },
                                { icon: 'fa-map-location-dot', label: 'Factuuradres', value: project.address || '—' },
                                { icon: 'fa-location-dot', label: 'Werkadres', value: project.werkAdres || '—' },
                                { icon: 'fa-id-card', label: 'KVK Nummer', value: project.kvk || '—' },
                                { icon: 'fa-file-invoice-dollar', label: 'BTW Nummer', value: project.btw || '—' },
                                { icon: 'fa-phone', label: 'Telefoon', value: project.phone || '—' },
                                { icon: 'fa-envelope', label: 'Email', value: project.email || '—' },
                                { icon: 'fa-calendar-plus', label: 'Startdatum', value: formatDate(project.startDate) },
                                { icon: 'fa-calendar-check', label: 'Einddatum', value: formatDate(project.endDate) },
                                { icon: 'fa-clock', label: 'Geschatte uren', value: `${project.estimatedHours}u` },
                            ].filter(f => project.clientType !== 'particulier' || !['Bedrijfsnaam', 'Contactpersoon', 'KVK Nummer', 'BTW Nummer'].includes(f.label)).map((row, i, arr) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: i !== arr.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f8fafc', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                        <i className={`fa-solid ${row.icon}`} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{row.label}</div>
                                        <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 }}>{row.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Particulier vs Zakelijk Toggle */}
                                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                                    <button onClick={() => setEditForm(p => ({ ...p, clientType: 'particulier' }))}
                                        style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: editForm.clientType === 'particulier' ? '#fff' : 'transparent', color: editForm.clientType === 'particulier' ? '#F5850A' : '#64748b', boxShadow: editForm.clientType === 'particulier' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                                        <i className="fa-solid fa-user" style={{ marginRight: '6px' }} /> Particulier
                                    </button>
                                    <button onClick={() => setEditForm(p => ({ ...p, clientType: 'zakelijk' }))}
                                        style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: editForm.clientType !== 'particulier' ? '#fff' : 'transparent', color: editForm.clientType !== 'particulier' ? '#F5850A' : '#64748b', boxShadow: editForm.clientType !== 'particulier' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                                        <i className="fa-solid fa-building" style={{ marginRight: '6px' }} /> Zakelijk
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                                {[
                                    { field: 'projectnummer', label: 'Projectnummer', icon: 'fa-hashtag', type: 'text' },
                                    { field: 'name', label: 'Projectnaam', icon: 'fa-folder', type: 'text' },
                                    { field: 'client', label: 'Opdrachtgever (Naam)', icon: 'fa-user', type: 'text' },
                                    { field: 'bedrijfsnaam', label: 'Bedrijfsnaam', icon: 'fa-building', type: 'text' },
                                    { field: 'contactpersoon', label: 'Contactpersoon', icon: 'fa-address-card', type: 'text' },
                                    { field: 'werkAdres', label: 'Werkadres', icon: 'fa-location-dot', type: 'text' },
                                    { field: 'kvk', label: 'KVK Nummer', icon: 'fa-id-card', type: 'text' },
                                    { field: 'btw', label: 'BTW Nummer', icon: 'fa-file-invoice-dollar', type: 'text' },
                                    { field: 'address', label: 'Factuuradres', icon: 'fa-location-dot', type: 'text' },
                                    { field: 'phone', label: 'Telefoon', icon: 'fa-phone', type: 'tel' },
                                    { field: 'email', label: 'Email', icon: 'fa-envelope', type: 'email' },
                                    { field: 'startDate', label: 'Startdatum', icon: 'fa-calendar-plus', type: 'date' },
                                    { field: 'endDate', label: 'Einddatum', icon: 'fa-calendar-check', type: 'date' },
                                    { field: 'estimatedHours', label: 'Geschatte uren', icon: 'fa-clock', type: 'number' },
                                ].filter(f => editForm.clientType !== 'particulier' || !['bedrijfsnaam', 'contactpersoon', 'kvk', 'btw'].includes(f.field)).map(({ field, label, icon, type }) => (
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
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* ===== PROJECT OVERZICHT ===== */}
            {activeTab === 'projectoverzicht' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '860px' }}>

                    {/* Projectkaart */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div onClick={() => togglePoSect('kaart')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: poSectOpen.kaart ? '12px' : 0, cursor: 'pointer' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-id-badge" style={{ color: '#F5850A' }} /> Projectkaart
                            </h3>
                            <i className={`fa-solid fa-chevron-${poSectOpen.kaart ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                        </div>
                        {poSectOpen.kaart && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                                { icon: 'fa-hashtag', label: 'Projectnummer', value: project.projectnummer },
                                { icon: 'fa-folder', label: 'Projectnaam', value: project.name },
                                { icon: 'fa-address-card', label: 'Contactpersoon', value: project.contactpersoon },
                                { icon: 'fa-location-dot', label: 'Werkadres', value: project.werkAdres, clickable: 'route' },
                                { icon: 'fa-phone', label: 'Telefoon', value: project.phone, clickable: 'bellen' },
                                { icon: 'fa-envelope', label: 'Email', value: project.email },
                            ].map((row, i) => (
                                <div key={i}
                                    onClick={() => {
                                        if (row.clickable === 'bellen' && row.value) {
                                            const naam = project.contactpersoon || project.client || 'de klant';
                                            if (window.confirm(`Wil je ${naam} bellen?\n${row.value}`)) {
                                                window.location.href = `tel:${row.value.replace(/\s/g, '')}`;
                                            }
                                        } else if (row.clickable === 'route' && row.value) {
                                            if (window.confirm(`Wil je de route naar dit project starten?\n${row.value}`)) {
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.value)}&travelmode=driving`, '_blank');
                                            }
                                        }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', cursor: row.clickable && row.value ? 'pointer' : 'default', transition: 'background 0.15s' }}
                                    onMouseEnter={e => { if (row.clickable && row.value) e.currentTarget.style.background = '#fff7ed'; }}
                                    onMouseLeave={e => { if (row.clickable && row.value) e.currentTarget.style.background = '#f8fafc'; }}>
                                    <i className={`fa-solid ${row.icon}`} style={{ color: row.clickable && row.value ? '#F5850A' : '#F5850A', fontSize: '0.8rem', width: '14px', flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{row.label}</div>
                                        <div style={{ fontSize: '0.82rem', color: row.value ? '#1e293b' : '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: row.clickable && row.value ? 'underline' : 'none' }}>{row.value || '—'}</div>
                                    </div>
                                    {row.clickable && row.value && (
                                        <i className={`fa-solid ${row.clickable === 'bellen' ? 'fa-phone-volume' : 'fa-diamond-turn-right'}`} style={{ color: '#F5850A', fontSize: '0.75rem', marginLeft: 'auto', opacity: 0.6 }} />
                                    )}
                                </div>
                            ))}
                        </div>}
                    </div>

                    {/* Werkomschrijving */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: poSectOpen.werkomschrijving ? '14px' : 0 }}>
                            <h3 onClick={() => togglePoSect('werkomschrijving')} style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                <i className="fa-solid fa-file-lines" style={{ color: '#F5850A' }} /> Werkomschrijving
                                <i className={`fa-solid fa-chevron-${poSectOpen.werkomschrijving ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '4px' }} />
                            </h3>
                            {!editingWerkomschrijving ? (
                                <button onClick={() => { setWerkomschrijvingDraft(project.werkomschrijving || ''); setEditingWerkomschrijving(true); }}
                                    style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#F5850A'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#F5850A'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                    <i className="fa-solid fa-pen" /> Bewerken
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setEditingWerkomschrijving(false)}
                                        style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                        Annuleren
                                    </button>
                                    <button onClick={() => { saveProject({ ...project, werkomschrijving: werkomschrijvingDraft }); setEditingWerkomschrijving(false); }}
                                        style={{ padding: '5px 12px', borderRadius: '8px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                        Opslaan
                                    </button>
                                </div>
                            )}
                        </div>
                        {poSectOpen.werkomschrijving && (!editingWerkomschrijving ? (
                            project.werkomschrijving ? (
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{project.werkomschrijving}</p>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>Nog geen werkomschrijving — klik op Bewerken.</p>
                            )
                        ) : (
                            <textarea value={werkomschrijvingDraft} onChange={e => setWerkomschrijvingDraft(e.target.value)}
                                placeholder="Beschrijf hier de werkzaamheden, scope, bijzonderheden..."
                                rows={5}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1e293b', background: '#f8fafc', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#F5850A'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                        ))}
                    </div>

                    {/* Checklist */}
                    {(() => {
                        const checklist = project.checklist || [];
                        return (
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: poSectOpen.checklist ? '12px' : 0 }}>
                                    <h3 onClick={() => togglePoSect('checklist')} style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                        <i className="fa-solid fa-list-check" style={{ color: '#F5850A' }} /> Checklist
                                        {checklist.length > 0 && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '1px 8px' }}>
                                                {checklist.filter(c => c.done).length}/{checklist.length}
                                            </span>
                                        )}
                                        <i className={`fa-solid fa-chevron-${poSectOpen.checklist ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                    </h3>
                                    {poSectOpen.checklist && <button onClick={() => {
                                        const updated = [...(checklistLocal || checklist), { id: Date.now(), text: '', done: false }];
                                        setChecklistLocal(updated);
                                        saveProject({ ...project, checklist: updated });
                                    }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: '#fff7ed', color: '#F5850A', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                        <i className="fa-solid fa-plus" /> Item
                                    </button>}
                                </div>
                                {poSectOpen.checklist && (checklistLocal ?? checklist).length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '16px 0', color: '#cbd5e1', fontSize: '0.82rem' }}>Nog geen items — klik op "+ Item"</div>
                                )}
                                {poSectOpen.checklist && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(checklistLocal ?? checklist).map((item, idx) => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" checked={item.done}
                                                onChange={() => {
                                                    const updated = (checklistLocal ?? checklist).map((c, i) => i === idx ? { ...c, done: !c.done } : c);
                                                    setChecklistLocal(updated);
                                                    saveProject({ ...project, checklist: updated });
                                                }}
                                                style={{ width: '16px', height: '16px', accentColor: '#F5850A', cursor: 'pointer', flexShrink: 0 }} />
                                            <input value={item.text}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    checklistEditingRef.current = true;
                                                    const updated = (checklistLocal ?? checklist).map((c, i) => i === idx ? { ...c, text: val } : c);
                                                    setChecklistLocal(updated);
                                                    if (checklistDebounceRef.current) clearTimeout(checklistDebounceRef.current);
                                                    checklistDebounceRef.current = setTimeout(() => {
                                                        checklistEditingRef.current = false;
                                                        saveProject({ ...project, checklist: updated });
                                                    }, 800);
                                                }}
                                                onBlur={() => {
                                                    if (checklistDebounceRef.current) {
                                                        clearTimeout(checklistDebounceRef.current);
                                                        checklistDebounceRef.current = null;
                                                    }
                                                    checklistEditingRef.current = false;
                                                    if (checklistLocal) saveProject({ ...project, checklist: checklistLocal });
                                                }}
                                                placeholder="Omschrijving…"
                                                style={{ flex: 1, border: 'none', borderBottom: '1px solid #f1f5f9', outline: 'none', fontSize: '0.85rem', color: item.done ? '#94a3b8' : '#1e293b', background: 'transparent', fontFamily: 'inherit', textDecoration: item.done ? 'line-through' : 'none', padding: '3px 0' }} />
                                            <button onClick={() => {
                                                const updated = (checklistLocal ?? checklist).filter((_, i) => i !== idx);
                                                setChecklistLocal(updated);
                                                saveProject({ ...project, checklist: updated });
                                            }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', opacity: 0.4, padding: '2px 4px', flexShrink: 0 }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        </div>
                                    ))}
                                </div>}
                            </div>
                        );
                    })()}

                    {/* Notities */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: poSectOpen.opmerkingen ? '12px' : 0 }}>
                            <h3 onClick={() => togglePoSect('opmerkingen')} style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                <i className="fa-solid fa-note-sticky" style={{ color: '#F5850A' }} /> Notities
                                {notes.length > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '1px 8px' }}>{notes.length}</span>}
                                <i className={`fa-solid fa-chevron-${poSectOpen.opmerkingen ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                            </h3>
                        </div>
                        {poSectOpen.opmerkingen && (
                            <>
                                {/* Notities lijst */}
                                {notes.length === 0 && <div style={{ textAlign: 'center', padding: '16px 0', color: '#cbd5e1', fontSize: '0.82rem' }}>Nog geen notities</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: notes.length > 0 ? '14px' : '8px' }}>
                                    {notes.map(note => {
                                        const nt = NOTE_TYPES[note.type] || NOTE_TYPES.info;
                                        const isAuthor = note.author === (user?.name || 'Beheerder');
                                        return (
                                            <div key={note.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: nt.bg, borderRadius: '10px', padding: '10px 12px', border: `1px solid ${nt.color}22` }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: nt.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>
                                                            <i className={`fa-solid ${nt.icon}`} style={{ fontSize: '0.6rem' }} />
                                                            {nt.label}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{note.author} · {note.date}</span>
                                                    </div>
                                                    {editingNoteId === note.id ? (
                                                        <textarea autoFocus value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)}
                                                            onBlur={() => saveNoteEdit(note.id)}
                                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNoteEdit(note.id); } if (e.key === 'Escape') { setEditingNoteId(null); setEditingNoteText(''); } }}
                                                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}`, fontSize: '0.84rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
                                                    ) : (
                                                        <div style={{ fontSize: '0.84rem', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                                                    )}
                                                    {note.photo && (
                                                        <div style={{ marginTop: '8px' }}>
                                                            {note.mediaType === 'video'
                                                                ? <video src={note.photo} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                                                                : <img src={note.photo} alt="" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} onClick={() => setPreviewAtt({ data: note.photo, url: note.photo, name: 'notitie-foto', type: 'image/jpeg' })} />}
                                                        </div>
                                                    )}
                                                    {/* Replies */}
                                                    {(note.replies?.length > 0 || replyingToNoteId === note.id) && (
                                                        <div style={{ marginTop: '8px', borderLeft: `2px solid ${nt.color}44`, paddingLeft: '10px' }}>
                                                            {(note.replies || []).map(r => (
                                                                <div key={r.id} style={{ marginBottom: '5px' }}>
                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>{r.author}</span>
                                                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '5px' }}>{r.created_at ? new Date(r.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                                    <div style={{ fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{r.text}</div>
                                                                </div>
                                                            ))}
                                                            {replyingToNoteId === note.id && (
                                                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                                    <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReply(note.id); } if (e.key === 'Escape') { setReplyingToNoteId(null); setReplyText(''); } }}
                                                                        placeholder="Typ reactie… (Enter)"
                                                                        style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}88`, fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none' }} />
                                                                    <button onClick={() => addReply(note.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: nt.color, color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>↵</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Onderste knoppenbalk */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                        {replyingToNoteId !== note.id && (
                                                            <button onClick={() => { setReplyingToNoteId(note.id); setReplyText(''); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.72rem', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = nt.color}
                                                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                                <i className="fa-regular fa-comment" /> Reageer {note.replies?.length > 0 && `(${note.replies.length})`}
                                                            </button>
                                                        )}
                                                        {(note.type === 'actie' || note.type === 'planning') && (
                                                            <button onClick={() => {
                                                                const taskName = note.text.split('\n')[0].slice(0, 80);
                                                                const task = { id: 't' + Date.now(), name: taskName, startDate: new Date().toISOString().split('T')[0], endDate: '', assignedTo: [], completed: false, fromNoteId: note.id };
                                                                saveProject({ ...project, tasks: [...(project.tasks || []), task] });
                                                                showToast(`Taak "${taskName}" toegevoegd aan planning`, 'success');
                                                            }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.72rem', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = '#F5850A'}
                                                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                                <i className="fa-solid fa-list-check" /> Maak taak
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                                    <button onClick={() => { setAddingMediaToNoteId(note.id); noteAddMediaInputRef.current?.click(); }}
                                                        disabled={addMediaUploading && addingMediaToNoteId === note.id}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', opacity: 0.4, padding: '2px 4px' }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                                                        {addMediaUploading && addingMediaToNoteId === note.id
                                                            ? <i className="fa-solid fa-spinner fa-spin" />
                                                            : <i className="fa-solid fa-camera" />}
                                                    </button>
                                                    {isAuthor && editingNoteId !== note.id && (
                                                        <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', opacity: 0.4, padding: '2px 4px' }}
                                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                                                            <i className="fa-solid fa-pencil" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteNote(note.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', opacity: 0.4, padding: '2px 4px' }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                                                        <i className="fa-solid fa-xmark" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Nieuwe notitie form */}
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                    {(() => {
                                        const doSave = () => {
                                            if (!poNoteText.trim() && !poNoteMedia) return;
                                            const localId = Date.now();
                                            const note = { id: localId, text: poNoteText.trim(), type: poNoteType, author: user?.name || 'Beheerder', date: new Date().toISOString().split('T')[0], photo: poNoteMedia?.url || null, mediaType: poNoteMedia?.mediaType || null, replies: [] };
                                            setNotes(prev => { const u = [note, ...prev]; localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(u)); return u; });
                                            window.dispatchEvent(new Event('schilders-sync'));
                                            fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id, content: note.text || ' ', author: note.author, type: note.type, date: note.date, photo: note.photo, mediaType: note.mediaType }) })
                                                .then(r => r.json())
                                                .then(data => {
                                                    if (data.success && data.id) {
                                                        setNotes(prev => { const u = prev.map(n => n.id === localId ? { ...n, id: data.id } : n); localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(u)); return u; });
                                                    }
                                                }).catch(() => {});
                                            setPoNoteText('');
                                            setPoNoteMedia(null);
                                        };
                                        return (<>
                                            <textarea value={poNoteText} onChange={e => setPoNoteText(e.target.value)}
                                                placeholder="Nieuwe notitie schrijven… (Enter om op te slaan)" rows={2}
                                                onBlur={() => { if (poNoteText.trim()) doSave(); }}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSave(); } }}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.84rem', color: '#1e293b', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', outline: 'none', marginBottom: '8px' }} />
                                            {poNoteMedia && (
                                                <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
                                                    {poNoteMedia.mediaType === 'video'
                                                        ? <video src={poNoteMedia.url} style={{ maxHeight: '80px', borderRadius: '6px', display: 'block' }} />
                                                        : <img src={poNoteMedia.url} alt="" style={{ maxHeight: '80px', borderRadius: '6px', display: 'block' }} />}
                                                    <button onClick={() => setPoNoteMedia(null)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: '#fff', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-xmark" /></button>
                                                </div>
                                            )}
                                            <input ref={noteMediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleNoteMedia} />
                                            <input ref={noteAddMediaInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleAddMediaToNote} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                {Object.entries(NOTE_TYPES).map(([key, nt]) => (
                                                    <button key={key} onClick={() => setPoNoteType(key)}
                                                        style={{ padding: '3px 10px', borderRadius: '20px', border: `1.5px solid ${poNoteType === key ? nt.color : '#e2e8f0'}`, background: poNoteType === key ? nt.bg : 'transparent', color: poNoteType === key ? nt.color : '#94a3b8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                        {nt.label}
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => noteMediaInputRef.current?.click()} disabled={poNoteMediaUploading}
                                                    style={{ padding: '3px 10px', borderRadius: '20px', border: `1.5px solid ${poNoteMedia ? '#10b981' : '#e2e8f0'}`, background: poNoteMedia ? '#f0fdf4' : 'transparent', color: poNoteMedia ? '#10b981' : '#94a3b8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {poNoteMediaUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paperclip" />}
                                                    {poNoteMedia ? 'Bijlage ✓' : 'Bijlage'}
                                                </button>
                                                <button onClick={doSave} disabled={!poNoteText.trim() && !poNoteMedia}
                                                    style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: '8px', border: 'none', background: (poNoteText.trim() || poNoteMedia) ? '#F5850A' : '#e2e8f0', color: (poNoteText.trim() || poNoteMedia) ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.78rem', cursor: (poNoteText.trim() || poNoteMedia) ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                                                    <i className="fa-solid fa-paper-plane" style={{ marginRight: '5px' }} />Opslaan
                                                </button>
                                            </div>
                                        </>);
                                    })()}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bestanden */}
                    {(() => {
                        const bestanden = project.bestanden || [];
                        const getIcon = (type, name) => {
                            if (type?.includes('image')) return 'fa-file-image';
                            if (type?.includes('pdf')) return 'fa-file-pdf';
                            if (type?.includes('word') || name?.endsWith('.docx')) return 'fa-file-word';
                            if (type?.includes('sheet') || name?.endsWith('.xlsx')) return 'fa-file-excel';
                            if (type?.includes('zip') || type?.includes('rar')) return 'fa-file-zipper';
                            return 'fa-file';
                        };
                        const getIconColor = (type, name) => {
                            if (type?.includes('image')) return '#10b981';
                            if (type?.includes('pdf')) return '#ef4444';
                            if (type?.includes('word') || name?.endsWith('.docx')) return '#2563eb';
                            if (type?.includes('sheet') || name?.endsWith('.xlsx')) return '#16a34a';
                            return '#94a3b8';
                        };
                        return (
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: poSectOpen.bestanden ? '12px' : 0 }}>
                                    <h3 onClick={() => togglePoSect('bestanden')} style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                        <i className="fa-solid fa-paperclip" style={{ color: '#F5850A' }} /> Bestanden
                                        {bestanden.length > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '1px 8px' }}>{bestanden.length}</span>}
                                        <i className={`fa-solid fa-chevron-${poSectOpen.bestanden ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                    </h3>
                                    {poSectOpen.bestanden && <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: '#fff7ed', color: '#F5850A', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-arrow-up-from-bracket" /> Uploaden
                                        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" style={{ display: 'none' }}
                                            onChange={e => { handleProjectFileUpload(e.target.files); e.target.value = ''; }} />
                                    </label>}
                                </div>
                                {poSectOpen.bestanden && <div onDragEnter={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#F5850A'; e.currentTarget.style.background = 'rgba(245,133,10,0.04)'; }}
                                    onDragOver={e => e.preventDefault()}
                                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa'; } }}
                                    onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa'; if (e.dataTransfer.files?.length) handleProjectFileUpload(e.dataTransfer.files); }}
                                    style={{ border: '2px dashed #e2e8f0', borderRadius: '10px', padding: bestanden.length === 0 ? '24px' : '10px', background: '#fafafa', transition: 'all 0.15s', marginBottom: bestanden.length > 0 ? '12px' : 0 }}>
                                    {bestanden.length === 0 && (
                                        <div style={{ textAlign: 'center', color: '#cbd5e1' }}>
                                            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }} />
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sleep bestanden hierheen</div>
                                            <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>of gebruik de Uploaden knop</div>
                                        </div>
                                    )}
                                </div>}
                                {poSectOpen.bestanden && bestanden.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {bestanden.map((b, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9', padding: '7px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                                <i className={`fa-solid ${getIcon(b.type, b.name)}`} style={{ fontSize: '1rem', color: getIconColor(b.type, b.name), width: '18px', flexShrink: 0 }} />
                                                <input value={b.label || ''} onChange={e => updateBestandLabel(idx, e.target.value)}
                                                    placeholder="Omschrijving…" onClick={e => e.stopPropagation()}
                                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.82rem', color: '#1e293b', background: 'transparent', fontFamily: 'inherit' }} />
                                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', flexShrink: 0 }}>{b.name}</span>
                                                <button onClick={async () => {
                                                    setPreviewAtt(b); setPreviewBlobUrl(null);
                                                    const src = b.data || b.url;
                                                    if (src && src.startsWith('/')) {
                                                        setPreviewLoading(true);
                                                        try {
                                                            const res = await fetch(src);
                                                            const rawBlob = await res.blob();
                                                            const isPdf = b.type === 'application/pdf' || b.name?.toLowerCase().endsWith('.pdf');
                                                            const blob = isPdf ? new Blob([rawBlob], { type: 'application/pdf' }) : rawBlob;
                                                            setPreviewBlobUrl(URL.createObjectURL(blob));
                                                        } catch (e) { console.error(e); } finally { setPreviewLoading(false); }
                                                    } else { setPreviewBlobUrl(src); }
                                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', padding: '2px 4px', flexShrink: 0 }} title="Bekijken">
                                                    <i className="fa-solid fa-eye" />
                                                </button>
                                                <button onClick={() => removeProjectBestand(idx)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', padding: '2px 4px', flexShrink: 0, opacity: 0.5 }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ── Foto's ── */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: poSectOpen.fotos ? '14px' : 0 }}>
                            <h3 onClick={() => togglePoSect('fotos')} style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                <i className="fa-solid fa-camera" style={{ color: '#F5850A' }} /> Foto's
                                {photos.length > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', borderRadius: '10px', padding: '1px 8px' }}>{photos.length}</span>}
                                <i className={`fa-solid fa-chevron-${poSectOpen.fotos ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                            </h3>
                            {poSectOpen.fotos && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: '#fff7ed', color: '#F5850A', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}>
                                    <i className="fa-solid fa-upload" /> Uploaden
                                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
                                </label>
                            )}
                        </div>
                        {poSectOpen.fotos && (() => {
                            const mwFotos = (project?.fotos || []).map(f => ({ ...f, src: f.url || f.data, bron: 'medewerker' }));
                            const adminFotos = photos.map(f => ({ ...f, src: f.url, bron: 'admin' }));
                            const allFotos = [
                                ...adminFotos.filter(p => photoFilter === 'alle' || p.category === photoFilter),
                                ...(photoFilter === 'alle' ? mwFotos : []),
                            ];
                            return allFotos.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 20px', border: '2px dashed #e2e8f0', borderRadius: '10px', color: '#cbd5e1' }}>
                                    <i className="fa-solid fa-camera" style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }} />
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nog geen foto's</div>
                                    <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Gebruik de Uploaden knop om foto's toe te voegen</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        {['alle', 'voor', 'voortgang', 'na'].map(c => (
                                            <button key={c} onClick={() => setPhotoFilter(c)} style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', background: photoFilter === c ? '#F5850A' : '#f1f5f9', color: photoFilter === c ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
                                                {c === 'alle' ? 'Alle' : c.charAt(0).toUpperCase() + c.slice(1)}
                                            </button>
                                        ))}
                                        {mwFotos.length > 0 && <span style={{ fontSize: '0.72rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '4px' }}>{mwFotos.length} medewerker-foto{mwFotos.length !== 1 ? "'s" : ''}</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {allFotos.map((foto, idx) => (
                                            <div key={foto.id || idx} style={{ borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9', position: 'relative', cursor: 'pointer', aspectRatio: '1' }}
                                                onClick={() => setPreviewAtt({ data: foto.src, name: foto.name, type: 'image/jpeg' })}>
                                                <img src={foto.src} alt={foto.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '12px 6px 4px' }}>
                                                    {foto.category && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'capitalize' }}>{foto.category}</div>}
                                                    {foto.bron === 'medewerker' && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.58rem' }}>{foto.auteur} · {foto.datum}</div>}
                                                </div>
                                                {foto.bron === 'medewerker' && <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(245,133,10,0.85)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.58rem', fontWeight: 700, color: '#fff' }}>📱</div>}
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        if (!window.confirm('Foto verwijderen?')) return;
                                                        if (foto.bron === 'medewerker') {
                                                            saveProject({ ...project, fotos: (project.fotos || []).filter(f => f.id !== foto.id) });
                                                        } else {
                                                            setPhotos(prev => {
                                                                const upd = prev.filter(f => f.id !== foto.id);
                                                                localStorage.setItem(`schildersapp_photos_${id}`, JSON.stringify(upd));
                                                                return upd;
                                                            });
                                                        }
                                                    }}
                                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: '#fff', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
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
                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '56px' }}>📝</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '56px' }}>📎</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', width: '190px' }}>Acties</th>
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
                                    const statusKey = task.completed ? 'klaar' : (STATUS_CFG[task.kanbanStatus] ? task.kanbanStatus : 'todo');
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
                                        <React.Fragment key={task.id}>
                                        <tr style={{ borderBottom: (isAttachOpen || isDeleteConfirm) ? 'none' : '1px solid #f8fafc', background: isDeleteConfirm ? '#fef2f2' : idx % 2 === 0 ? '#fff' : '#fafbfc' }}
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
                                            {/* 📝 Notities knop */}
                                            <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                <button onClick={() => { setActiveTab('planning'); setTimeout(() => window.dispatchEvent(new CustomEvent('open-task-notes-modal', { detail: { taskId: task.id } })), 100); }}
                                                    title={`Notities (${(task.notes || []).length})`}
                                                    style={{ position: 'relative', background: (task.notes || []).length > 0 ? '#fffbeb' : 'none', border: (task.notes || []).length > 0 ? '1px solid #fde68a' : 'none', color: (task.notes || []).length > 0 ? '#f59e0b' : '#cbd5e1', cursor: 'pointer', fontSize: '0.82rem', padding: '4px 7px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.border = '1px solid #fde68a'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = (task.notes || []).length > 0 ? '#fffbeb' : 'none'; e.currentTarget.style.color = (task.notes || []).length > 0 ? '#f59e0b' : '#cbd5e1'; e.currentTarget.style.border = (task.notes || []).length > 0 ? '1px solid #fde68a' : 'none'; }}>
                                                    <i className="fa-solid fa-note-sticky" />
                                                    {(task.notes || []).length > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{(task.notes || []).length}</span>}
                                                </button>
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
                                            {/* Actie knoppen: Inplannen / Delen persoon / Delen project */}
                                            {(() => {
                                                const nAssigned = (task.assignedTo || []).length;
                                                const gedeeldPersoon = nAssigned === 1;
                                                const gedeeldProject = nAssigned > 1;
                                                const gepland = !!task.startDate;
                                                const persoonNaam = gedeeldPersoon ? (allUsers.find(u => u.id === Number(task.assignedTo[0]))?.name || '') : '';
                                                return (
                                                <td style={{ padding: '6px 6px', textAlign: 'center', width: '190px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button onClick={() => setPlanningModal({ taskId: task.id, taskName: task.name, startDate: task.startDate || '', endDate: task.endDate || '' })}
                                                            title={gepland ? `Ingepland: ${formatDate(task.startDate)} → ${formatDate(task.endDate)}` : 'Opnemen in Planning'}
                                                            style={{ width: '28px', height: '26px', flexShrink: 0, borderRadius: '7px', border: gepland ? '1.5px solid #16a34a' : '1.5px solid transparent', background: gepland ? '#dcfce7' : '#f1f5f9', color: gepland ? '#16a34a' : '#64748b', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#bbf7d0'; e.currentTarget.style.color = '#15803d'; e.currentTarget.style.borderColor = '#16a34a'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = gepland ? '#dcfce7' : '#f1f5f9'; e.currentTarget.style.color = gepland ? '#16a34a' : '#64748b'; e.currentTarget.style.borderColor = gepland ? '#16a34a' : 'transparent'; }}>
                                                            <i className={`fa-solid ${gepland ? 'fa-calendar-check' : 'fa-calendar-plus'}`} />
                                                        </button>
                                                        <button onClick={() => setDelenModal({ taskId: task.id, taskName: task.name, mode: 'persoon', selectedUserId: null })}
                                                            title={gedeeldPersoon ? `Gedeeld met: ${persoonNaam}` : 'Delen met een persoon'}
                                                            style={{ width: '112px', height: '26px', padding: '0 7px', flexShrink: 0, borderRadius: '7px', border: gedeeldPersoon ? '1.5px solid #2563eb' : '1.5px solid transparent', background: gedeeldPersoon ? '#dbeafe' : '#f1f5f9', color: gedeeldPersoon ? '#2563eb' : '#64748b', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', overflow: 'hidden' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.borderColor = '#2563eb'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = gedeeldPersoon ? '#dbeafe' : '#f1f5f9'; e.currentTarget.style.color = gedeeldPersoon ? '#2563eb' : '#64748b'; e.currentTarget.style.borderColor = gedeeldPersoon ? '#2563eb' : 'transparent'; }}>
                                                            <i className="fa-solid fa-user-plus" style={{ flexShrink: 0 }} />
                                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gedeeldPersoon ? persoonNaam : ''}</span>
                                                        </button>
                                                        <button onClick={() => setDelenModal({ taskId: task.id, taskName: task.name, mode: 'project', selectedUserId: null })}
                                                            title={gedeeldProject ? `Gedeeld met project (${nAssigned} pers.)` : 'Delen met het project'}
                                                            style={{ width: '28px', height: '26px', flexShrink: 0, borderRadius: '7px', border: gedeeldProject ? '1.5px solid #7c3aed' : '1.5px solid transparent', background: gedeeldProject ? '#ede9fe' : '#f1f5f9', color: gedeeldProject ? '#7c3aed' : '#64748b', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#ddd6fe'; e.currentTarget.style.color = '#6d28d9'; e.currentTarget.style.borderColor = '#7c3aed'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = gedeeldProject ? '#ede9fe' : '#f1f5f9'; e.currentTarget.style.color = gedeeldProject ? '#7c3aed' : '#64748b'; e.currentTarget.style.borderColor = gedeeldProject ? '#7c3aed' : 'transparent'; }}>
                                                            <i className="fa-solid fa-users" />
                                                        </button>
                                                    </div>
                                                </td>
                                                );
                                            })()}
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
                                                <td colSpan={8} style={{ padding: '0 10px 12px 10px', background: '#fef2f2', borderBottom: '2px solid #fecaca' }}>
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
                                                <td colSpan={8} style={{ padding: '0 10px 12px', background: '#fffbf5', borderBottom: '1px solid #fed7aa' }}>
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
                                                                                    <img src={att.url || att.data} alt={att.name} style={{ width: '72px', height: '72px', objectFit: 'cover', display: 'block' }} />
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
                                        </React.Fragment>
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
                                    <button key={key} onClick={() => setNoteType(key)} style={{ padding: '5px 12px', borderRadius: '20px', border: `2px solid ${noteType === key ? cfg.color : cfg.color + '55'}`, background: noteType === key ? cfg.color : cfg.color + '12', color: noteType === key ? '#fff' : cfg.color, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: noteType === key ? 1 : 0.65, transition: 'all 0.15s' }}>
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
                            const isReplying = replyingToNote === note.id;
                            const sendReply = () => {
                                const txt = noteReplyInput.trim();
                                if (!txt) return;
                                const author = user?.name || 'Beheerder';
                                const reply = { id: Date.now(), text: txt, author, created_at: new Date().toISOString() };
                                setNotes(prev => { const u = prev.map(n => n.id !== note.id ? n : { ...n, replies: [...(n.replies || []), reply] }); localStorage.setItem(`schildersapp_notes_${id}`, JSON.stringify(u)); return u; });
                                setNoteReplyInput('');
                                setReplyingToNote(null);
                                fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: note.id, addReply: { author, text: txt } }) }).catch(() => {});
                            };
                            return (
                                <div key={note.id} style={{ background: cfg.bg, borderRadius: '14px', border: `1.5px solid ${cfg.color}30`, overflow: 'hidden' }}>
                                    {/* Header balk */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: `1px solid ${cfg.color}18` }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: cfg.color, color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>
                                            <i className={`fa-solid ${cfg.icon}`} style={{ fontSize: '0.62rem' }} />
                                            {cfg.label}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '2px' }}>{note.author} · {formatDate(note.date)}</span>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                                            <button onClick={() => deleteNote(note.id)}
                                                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '3px 5px', borderRadius: '6px', fontSize: '0.78rem' }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Body */}
                                    <div style={{ padding: '12px 14px' }}>
                                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.text || note.content}</p>
                                        {note.photo && (
                                            <div style={{ marginTop: '10px' }}>
                                                {note.mediaType === 'video'
                                                    ? <video src={note.photo} controls style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block' }} />
                                                    : <img src={note.photo} alt="" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', cursor: 'pointer', display: 'block', objectFit: 'cover' }}
                                                        onClick={() => setPreviewAtt({ data: note.photo, url: note.photo, name: 'notitie-foto', type: 'image/jpeg' })} />}
                                            </div>
                                        )}
                                        {/* Replies */}
                                        {(note.replies || []).length > 0 && (
                                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {note.replies.map(r => (
                                                    <div key={r.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: cfg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>
                                                            {(r.author || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div style={{ flex: 1, background: '#fff', borderRadius: '8px', padding: '6px 10px', border: `1px solid ${cfg.color}20` }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>{r.author}</span>
                                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{r.created_at ? new Date(r.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : r.date || ''}</span>
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.4 }}>{r.text}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Reply invoer */}
                                        {isReplying && (
                                            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#F5850A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>
                                                    {(user?.name || 'B')[0].toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <input autoFocus value={noteReplyInput} onChange={e => setNoteReplyInput(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendReply(); } if (e.key === 'Escape') { setReplyingToNote(null); setNoteReplyInput(''); } }}
                                                        placeholder="Typ reactie… (Enter)"
                                                        style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: `1.5px solid ${cfg.color}`, fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
                                                </div>
                                                <button onClick={sendReply} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: cfg.color, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}>↵</button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Footer */}
                                    <div style={{ padding: '6px 14px 8px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: `1px solid ${cfg.color}15` }}>
                                        <button onClick={() => { setReplyingToNote(isReplying ? null : note.id); setNoteReplyInput(''); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', border: `1.5px solid ${isReplying ? cfg.color : cfg.color + '40'}`, background: isReplying ? cfg.color : 'transparent', color: isReplying ? '#fff' : cfg.color, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                                            <i className="fa-regular fa-comment" />
                                            Reageer {(note.replies || []).length > 0 && <span style={{ background: isReplying ? 'rgba(255,255,255,0.3)' : cfg.color + '22', borderRadius: '10px', padding: '0 5px', fontWeight: 800 }}>{note.replies.length}</span>}
                                        </button>
                                        {(note.type === 'actie' || note.type === 'planning') && (
                                            <button onClick={() => {
                                                const taskName = (note.text || note.content || '').split('\n')[0].slice(0, 80);
                                                const task = { id: 't' + Date.now(), name: taskName, startDate: new Date().toISOString().split('T')[0], endDate: '', assignedTo: [], completed: false };
                                                saveProject({ ...project, tasks: [...(project.tasks || []), task] });
                                                showToast(`Taak "${taskName}" toegevoegd`, 'success');
                                            }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', border: `1.5px solid #F5850A40`, background: 'transparent', color: '#F5850A', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                                <i className="fa-solid fa-list-check" /> Maak taak
                                            </button>
                                        )}
                                    </div>
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
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                {/* 📸 Foto miniatuur direct naast tekst */}
                                                {m.foto && (
                                                    <button onClick={() => setPreviewAtt({ data: m.foto, name: 'Meerwerk bewijs', type: 'image/jpeg' })}
                                                        style={{ flexShrink: 0, border: '2px solid #bfdbfe', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', padding: 0, background: 'none', display: 'block' }}
                                                        title="Klik om te vergroten">
                                                        <img src={m.foto} alt="Meerwerk foto" style={{ width: '60px', height: '60px', objectFit: 'cover', display: 'block' }} />
                                                    </button>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{m.omschrijving}</div>
                                                {m.toelichting && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{m.toelichting}</div>}
                                                <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '2px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                    <span>{m.datum}</span>
                                                    {m.emailVerzonden && <span style={{ color: '#3b82f6' }}>· email verzonden {m.emailVerzonden}</span>}
                                                    {m.akkoordDatum && <span style={{ color: '#10b981' }}>· akkoord {m.akkoordDatum}</span>}
                                                    {m.foto && (
                                                        <button onClick={() => setPreviewAtt({ data: m.foto, name: 'Meerwerk bewijs', type: 'image/jpeg' })} 
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                            <i className="fa-solid fa-expand" /> Vergroot
                                                        </button>
                                                    )}
                                                </div>
                                                </div>{/* /flex inner */}
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

                // Meerwerk vs Regulier split
                const regulierUren   = alleRegistraties.filter(r => r.type === 'Regulier').reduce((s,r) => s+r.uren, 0);
                const meerwerkUren   = alleRegistraties.filter(r => r.type === 'Meerwerk').reduce((s,r) => s+r.uren, 0);
                const regulierKosten = alleRegistraties.filter(r => r.type === 'Regulier').reduce((s,r) => s+r.kosten, 0);
                const meerwerkKosten = alleRegistraties.filter(r => r.type === 'Meerwerk').reduce((s,r) => s+r.kosten, 0);
                const meerwerkPct    = werkelijkeUren > 0 ? Math.round((meerwerkUren / werkelijkeUren) * 100) : 0;

                // Winstmarge berekening
                const brutomarge    = offerte - totaleKostprijs;
                const brutomargePct = offerte > 0 ? Math.round((brutomarge / offerte) * 100) : 0;
                const margeGoed     = brutomargePct >= wrPercentage;
                const margeNegatief = brutomarge < 0;

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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {[
                            { icon: 'fa-calendar-days', label: 'Planning', pct: taskPct, bad: planDelay, warn: !planDelay && taskPct < planPct - 5, sub: `${completedTasks}/${totalTasks} taken · dag ${elapsedDays}/${totalDays}` },
                            { icon: 'fa-euro-sign', label: 'Budget', pct: budgetPct, bad: overBudget, warn: nearBudget, sub: `€${gefactureerd.toLocaleString('nl-NL')} / €${offerte.toLocaleString('nl-NL')}` },
                            { icon: 'fa-clock', label: 'Uren', pct: urenPct, bad: overUren, warn: nearUren, sub: `${werkelijkeUren}u / ${project.estimatedHours}u geschat` },
                        ].map((card, i) => {
                            const c = ragColor(card.bad, card.warn);
                            const bg = ragBg(card.bad, card.warn);
                            return (
                                <div key={i} style={{ background: '#fff', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', borderLeft: `4px solid ${c}` }}>
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

                    {/* ── Planning & Budget detail (Dashboard Layout) ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
                        
                        {/* ── LINKER KOLOM: DETAILREGISTRATIES & LIJSTEN ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* 1. Planningsbewaking */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-calendar-days" style={{ color: '#F5850A' }} /> Planningsbewaking
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                                    </div>
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

                            {/* 2. Meerwerk vs Regulier */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-code-branch" style={{ color: '#F5850A' }} /> Meerwerk vs Regulier
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                                    {[
                                        { label: 'Regulier', uren: regulierUren, kosten: regulierKosten, color: '#3b82f6', bg: '#eff6ff', icon: 'fa-wrench' },
                                        { label: 'Meerwerk', uren: meerwerkUren, kosten: meerwerkKosten, color: '#F5850A', bg: '#fff7ed', icon: 'fa-plus-circle' },
                                    ].map(item => (
                                        <div key={item.label} style={{ background: item.bg, borderRadius: '10px', padding: '12px', borderLeft: `4px solid ${item.color}` }}>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <i className={`fa-solid ${item.icon}`} style={{ color: item.color }} /> {item.label}
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.color }}>{Math.round(item.uren * 10) / 10}u</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>€{item.kosten.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                                        </div>
                                    ))}
                                </div>
                                {werkelijkeUren > 0 ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                                            <span>Verdeling</span>
                                            <span style={{ color: meerwerkPct > 30 ? '#F5850A' : '#64748b' }}>{meerwerkPct}% meerwerk</span>
                                        </div>
                                        <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ height: '100%', width: `${100 - meerwerkPct}%`, background: '#3b82f6', borderRadius: '999px 0 0 999px', transition: 'width 0.6s' }} />
                                            <div style={{ height: '100%', width: `${meerwerkPct}%`, background: '#F5850A', borderRadius: '0 999px 999px 0', transition: 'width 0.6s' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                                            <span><span style={{ color: '#3b82f6' }}>■</span> Regulier</span>
                                            <span><span style={{ color: '#F5850A' }}>■</span> Meerwerk</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Nog geen uren geboekt</div>
                                )}
                            </div>

                            {/* 3. Gedetailleerde Urenregistraties (Week View) */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-regular fa-clock" style={{ color: '#F5850A' }} /> Gedetailleerde Uren
                                    </h3>
                                    <button onClick={() => {
                                        const FONT = "'Calibri','Segoe UI',Arial,sans-serif";
                                        const grpMap2 = new Map();
                                        alleRegistraties.forEach(reg => {
                                            const key = `${reg.medewerker}|${reg.jaar}|${reg.week}`;
                                            if (!grpMap2.has(key)) grpMap2.set(key, { medewerker: reg.medewerker, weekStr: `Wk ${reg.week} (${reg.jaar})`, totalUren: 0, dagen: [] });
                                            const g = grpMap2.get(key);
                                            g.totalUren += reg.uren;
                                            g.dagen.push(reg);
                                        });
                                        const rows = [...grpMap2.values()].map(g => `
                                            <tr><td colspan="3" style="padding:6px 10px;font-weight:700;font-size:11px;background:linear-gradient(90deg,#f1f5f9,#fff);border-bottom:1px solid #e2e8f0;border-top:2px solid #e2e8f0">
                                                ${g.medewerker} &nbsp;·&nbsp; ${g.weekStr} &nbsp;·&nbsp; <span style="color:#F5850A;font-weight:800">${Math.round(g.totalUren*10)/10}u</span>
                                            </td></tr>
                                            ${g.dagen.map(r => `<tr>
                                                <td style="padding:5px 10px 5px 24px;font-size:11px;color:#64748b">${r.dag}</td>
                                                <td style="padding:5px 10px;font-size:11px"><span style="background:${r.type==='Regulier'?'#eff6ff':'#fff7ed'};color:${r.type==='Regulier'?'#3b82f6':'#F5850A'};padding:2px 6px;border-radius:4px;font-weight:600;font-size:10px">${r.type}</span></td>
                                                <td style="padding:5px 10px;font-size:11px;font-weight:700;text-align:right">${r.uren}u</td>
                                            </tr>`).join('')}
                                        `).join('');
                                        const html = `<!DOCTYPE html><html><head><title>Gedetailleerde Uren — ${project.name}</title>
                                            <style>body{font-family:${FONT};margin:40px;color:#1e293b}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #f1f5f9}h2{font-size:14px;margin:0 0 4px}@media print{body{margin:20px}}</style>
                                            </head><body>
                                            <h2>${project.name}</h2>
                                            <div style="font-size:11px;color:#64748b;margin-bottom:16px">Afgedrukt op ${new Date().toLocaleDateString('nl-NL')}</div>
                                            <table>${rows}</table>
                                            <div style="margin-top:16px;font-size:11px;font-weight:700;color:#1e293b;text-align:right;border-top:2px solid #1e293b;padding-top:8px">Totaal: ${werkelijkeUren}u</div>
                                            </body></html>`;
                                        const win = window.open('', '_blank');
                                        win.document.write(html);
                                        win.document.close();
                                        win.focus();
                                        setTimeout(() => win.print(), 400);
                                    }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <i className="fa-solid fa-print" /> Print
                                    </button>
                                </div>

                                {alleRegistraties.length > 0 ? (() => {
                                    const groupedRegistraties = [];
                                    const grpMap = new Map();
                                    alleRegistraties.forEach(reg => {
                                        const key = `${reg.medewerker}|${reg.jaar}|${reg.week}`;
                                        if (!grpMap.has(key)) {
                                            grpMap.set(key, {
                                                id: key,
                                                medewerker: reg.medewerker,
                                                weekStr: `Wk ${reg.week} (${reg.jaar})`,
                                                totalUren: 0,
                                                totalKosten: 0,
                                                totalAK: 0,
                                                dagen: []
                                            });
                                        }
                                        const g = grpMap.get(key);
                                        g.totalUren += reg.uren;
                                        g.totalKosten += reg.kosten;
                                        g.totalAK += reg.ak;
                                        g.dagen.push(reg);
                                    });
                                    grpMap.forEach(g => groupedRegistraties.push(g));

                                    return (
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                                                {groupedRegistraties.map((g, gi) => (
                                                    <div key={g.id} style={{ borderBottom: gi === groupedRegistraties.length - 1 ? 'none' : '2px solid #f1f5f9' }}>
                                                        <div style={{ padding: '8px 12px', background: 'linear-gradient(90deg, #f8fafc 0%, #fff 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                                                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <i className="fa-regular fa-user" style={{ color: '#94a3b8' }} />
                                                                {g.medewerker} 
                                                                <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>· {g.weekStr}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F5850A', background: '#fff7ed', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span>{Math.round(g.totalUren * 10) / 10}u totaal</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            {g.dagen.map((reg, ri) => (
                                                                <div key={reg.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px', padding: '6px 12px 6px 34px', background: ri % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: ri === g.dagen.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>{reg.dag}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.65rem', background: reg.type === 'Regulier' ? '#eff6ff' : reg.type === 'Meerwerk' ? '#fff7ed' : '#f1f5f9', color: reg.type === 'Regulier' ? '#3b82f6' : reg.type === 'Meerwerk' ? '#F5850A' : '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'capitalize' }}>
                                                                            {reg.type}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{reg.uren}u</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })() : (
                                    <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                                        <i className="fa-solid fa-bed" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '10px' }} />
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Nog geen uren geboekt</div>
                                    </div>
                                )}
                            </div>

                            {/* 3. Materiaalkosten & Inkoop */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fa-solid fa-box-open" style={{ color: '#F5850A' }} /> Materiaal & Inkoop Details
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px', fontSize: '0.7rem', fontWeight: 600 }}>
                                        {[
                                            { id: 'lijst', label: 'Gedetailleerd' },
                                            { id: '10', label: '10% (Buiten)' },
                                            { id: '15', label: '15% (Binnen)' },
                                            { id: '20', label: '20% (Comb.)' }
                                        ].map(opt => (
                                            <button key={opt.id} onClick={() => handleSetMatType(opt.id)} style={{ padding: '6px 10px', borderRadius: '6px', background: materiaalKostenType === opt.id ? '#fff' : 'transparent', color: materiaalKostenType === opt.id ? '#1e293b' : '#64748b', boxShadow: materiaalKostenType === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Items</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Bedrag in €</span>
                                    </div>
                                    <div style={{ padding: '10px 14px', background: '#fff' }}>
                                        {materiaalItems.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                                {materiaalItems.map((item) => (
                                                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <div style={{ flex: 1, position: 'relative' }}>
                                                                <input type="text" placeholder="Omschrijving (bijv. Sikkens Rubbol 10L)" value={item.omschrijving} onChange={e => wijzigMateriaalVelden(item.id, 'omschrijving', e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} />
                                                                {item.hasBijlage && (
                                                                    <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                                                                        <button onClick={() => toggleMatExpand(item.id)} style={{ background: expandedMats[item.id] ? '#1e293b' : '#eff6ff', border: `1px solid ${expandedMats[item.id] ? '#0f172a' : '#bfdbfe'}`, color: expandedMats[item.id] ? '#fff' : '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
                                                                            <i className={`fa-solid ${expandedMats[item.id] ? 'fa-chevron-up' : 'fa-list-check'}`} /> Details
                                                                        </button>
                                                                        <button onClick={() => { if (item.fileDataUrl) { window.open(item.fileDataUrl, '_blank'); } else { showToast('Bestand niet meer beschikbaar — upload opnieuw.', 'warning'); } }} title="Bekijk Origineel" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }}>
                                                                            <i className="fa-solid fa-file-pdf" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ width: '90px', display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', paddingLeft: '8px', background: '#f8fafc' }}>
                                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>€</span>
                                                                <input type="number" step="0.01" value={item.bedrag || ''} onChange={e => wijzigMateriaalVelden(item.id, 'bedrag', e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right' }} />
                                                            </div>
                                                            <button onClick={() => wisMateriaal(item.id)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                                <i className="fa-solid fa-trash-can" style={{ fontSize: '0.7rem' }} />
                                                            </button>
                                                        </div>
                                                        {item.hasBijlage && expandedMats[item.id] && (
                                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginLeft: '12px', marginTop: '4px', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)' }}>
                                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Geëxtraheerde Factuurregels</span>
                                                                    <span style={{ color: '#0284c7' }}><i className="fa-solid fa-robot" /> AI Match</span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    {item.extractedLines?.map((line, lidx) => (
                                                                        <div key={lidx} style={{ display: 'flex', gap: '6px', alignItems: 'center', background: '#fff', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                                            <input type="number" value={line.qty || ''} onChange={e => wijzigGeextraheerdeRegel(item.id, lidx, 'qty', e.target.value)} style={{ width: '40px', padding: '4px', fontSize: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }} placeholder="Aant." />
                                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>x</span>
                                                                            <input type="text" value={line.name || ''} onChange={e => wijzigGeextraheerdeRegel(item.id, lidx, 'name', e.target.value)} style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} placeholder="Artikel omschrijving" />
                                                                            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', paddingLeft: '4px' }}>
                                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>€</span>
                                                                                <input type="number" step="0.01" value={line.price ?? ''} onChange={e => wijzigGeextraheerdeRegel(item.id, lidx, 'price', e.target.value)} style={{ width: '60px', padding: '4px', fontSize: '0.7rem', border: 'none', background: 'transparent', textAlign: 'right', outline: 'none' }} />
                                                                            </div>
                                                                            <button onClick={() => wisGeextraheerdeRegel(item.id, lidx)} style={{ background: 'transparent', border: 'none', padding: '4px', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }}>
                                                                                <i className="fa-solid fa-xmark" style={{ fontSize: '0.8rem' }} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <button onClick={() => voegGeextraheerdeRegelToe(item.id)} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 600, padding: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                                        <i className="fa-solid fa-plus" /> Voeg regel toe
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '12px', textAlign: 'center' }}>
                                                Nog geen materialen of externe inkoop aan dit project toegevoegd.
                                            </div>
                                        )}
                                        <button onClick={voegMateriaalToe} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#3b82f6', border: '1px dashed #bfdbfe', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-plus" /> Handmatig toevoegen
                                        </button>
                                    </div>
                                    <div 
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingInvoice(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDraggingInvoice(false); }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            setIsDraggingInvoice(false);
                                            const files = e.dataTransfer.files;
                                            if (files.length === 0) return;
                                            setIsScanningInvoice(true);
                                            
                                            // Real OCR Parsing
                                            const factuurData = await parseFactuurBestand(files[0]);
                                            
                                            setIsScanningInvoice(false);
                                            const fileName = files[0].name;
                                            const fileDataUrl = await new Promise(resolve => {
                                                const r = new FileReader();
                                                r.onload = e => resolve(e.target.result);
                                                r.readAsDataURL(files[0]);
                                            });
                                            const nieuwItem = {
                                                id: Date.now().toString(),
                                                omschrijving: `Factuur: ${fileName} (Geëxtraheerd)`,
                                                bedrag: factuurData.total,
                                                hasBijlage: true,
                                                fileName: fileName,
                                                fileDataUrl: fileDataUrl,
                                                extractedLines: factuurData.extractLines
                                            };
                                            const nieuweLijst = [...materiaalItems, nieuwItem];
                                            setMateriaalItems(nieuweLijst);
                                            localStorage.setItem(`schildersapp_project_matlijst_${id}`, JSON.stringify(nieuweLijst));
                                            handleSetMatType('lijst');
                                        }}
                                        style={{ padding: '16px', background: isDraggingInvoice ? '#e0f2fe' : '#f8fafc', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'auto', transition: 'all 0.2s' }}>
                                        {isScanningInvoice ? (
                                            <div style={{ color: '#0284c7', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <i className="fa-solid fa-expand fa-spin" style={{ fontSize: '1.5rem' }} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>AI OCR Analyseren...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ color: isDraggingInvoice ? '#0284c7' : '#94a3b8', fontSize: '1.5rem' }}><i className="fa-solid fa-cloud-arrow-up" /></div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isDraggingInvoice ? '#0284c7' : '#64748b', textAlign: 'center' }}>
                                                    {isDraggingInvoice ? 'Laat de factuur hier los' : 'Sleep een inkoopfactuur (PDF/Afbeelding) hierheen of klik om OCR te gebruiken'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* ── RECHTER KOLOM: WAARDEN, KOSTEN & NACALCULATIE TOTALEN ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Winstmarge kaart */}
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', borderLeft: `4px solid ${margeNegatief ? '#ef4444' : margeGoed ? '#10b981' : '#f59e0b'}` }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-chart-line" style={{ color: margeNegatief ? '#ef4444' : margeGoed ? '#10b981' : '#f59e0b' }} /> Winstmarge
                                </h3>
                                {offerte > 0 ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                            {[
                                                { label: 'Offerte', value: `€${offerte.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`, color: '#3b82f6', bg: '#eff6ff', icon: 'fa-file-invoice' },
                                                { label: 'Kostprijs', value: `€${totaleKostprijs.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`, color: '#64748b', bg: '#f8fafc', icon: 'fa-coins' },
                                                { label: 'Brutomarge', value: `${brutomarge < 0 ? '-' : ''}€${Math.abs(brutomarge).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`, color: margeNegatief ? '#ef4444' : margeGoed ? '#10b981' : '#f59e0b', bg: margeNegatief ? '#fef2f2' : margeGoed ? '#f0fdf4' : '#fffbeb', icon: 'fa-sack-dollar' },
                                            ].map(item => (
                                                <div key={item.label} style={{ background: item.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                                    <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: '0.8rem', marginBottom: '4px', display: 'block' }} />
                                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px' }}>
                                            <span style={{ color: '#475569' }}>Margepercentage</span>
                                            <span style={{ color: margeNegatief ? '#ef4444' : margeGoed ? '#10b981' : '#f59e0b' }}>
                                                {brutomargePct}% {margeNegatief ? '— Verlies!' : margeGoed ? '— Doelstelling gehaald' : `— Onder doelstelling (${wrPercentage}%)`}
                                            </span>
                                        </div>
                                        <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.max(0, Math.min(brutomargePct, 100))}%`, background: margeNegatief ? '#ef4444' : margeGoed ? '#10b981' : '#f59e0b', borderRadius: '999px', transition: 'width 0.6s' }} />
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '5px', fontWeight: 500 }}>
                                            Doelstelling: {wrPercentage}% W&R-marge &nbsp;·&nbsp; Werkelijk: {brutomargePct}%
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                        Stel een offertebedrag in om de marge te berekenen
                                    </div>
                                )}
                            </div>

                            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fa-solid fa-calculator" style={{ color: '#10b981' }} /> Project Nacalculatie
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                    {/* Bewaking Balken */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { label: 'Geschatte uren', value: `${project.estimatedHours}u`, color: '#3b82f6', bg: '#eff6ff', icon: 'fa-hourglass', sub: 'Calculatie' },
                                            { label: 'Geboekte uren', value: `${werkelijkeUren}u`, color: overUren ? '#ef4444' : '#10b981', bg: overUren ? '#fef2f2' : '#f0fdf4', icon: 'fa-stopwatch', sub: 'Gerealiseerd' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ background: item.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                                <i className={`fa-solid ${item.icon}`} style={{ color: item.color, marginBottom: '4px', display: 'block' }} />
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                                            <span>Urenverbruik</span>
                                            <span style={{ color: overUren ? '#ef4444' : nearUren ? '#f59e0b' : '#10b981' }}>{urenPct}% van calculatie</span>
                                        </div>
                                        <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', marginBottom: '10px' }}>
                                            <div style={{ height: '100%', width: `${Math.min(urenPct, 100)}%`, background: overUren ? '#ef4444' : nearUren ? '#f59e0b' : '#10b981', borderRadius: '999px', transition: 'width 0.6s' }} />
                                        </div>
                                        {offerteTarget > 0 && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                                                    <span>Budget Verbruik</span>
                                                    <span style={{ color: overBudget ? '#ef4444' : nearBudget ? '#f59e0b' : '#10b981' }}>{budgetPct}% / €{offerteTarget.toLocaleString('nl-NL')}</span>
                                                </div>
                                                <div style={{ height: '10px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`, background: overBudget ? '#ef4444' : nearBudget ? '#f59e0b' : '#10b981', borderRadius: '999px', transition: 'width 0.6s' }} />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Arbeid breakdown */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Arbeidskosten (per medewerker)
                                        </div>
                                        {urenPerPersoon.length > 0 ? urenPerPersoon.map((p, i) => {
                                            const avatarColors = ['#F5850A','#3b82f6','#10b981','#8b5cf6','#f59e0b','#06b6d4','#ef4444'];
                                            const ac = avatarColors[i % avatarColors.length];
                                            return (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderTop: i === 0 ? '1px solid #e2e8f0' : '1px solid #f1f5f9', background: '#fff' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: ac, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem', flexShrink: 0 }}>
                                                        {(p.initials || p.name?.slice(0,2).toUpperCase())}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{Math.round(p.uren * 10) / 10} uur geboekt</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>€{p.kosten.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', background: '#fff' }}>Geen geregistreerde uren</div>
                                        )}
                                        <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Subtotaal Arbeidsuren</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#475569' }}>€{werkelijkeKosten.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    {/* De Financiële Optelsom */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ padding: '10px 14px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Algemene Kosten (AK)</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                                        <input type="number" value={akPercentage} onChange={e => handleSetAk(e.target.value)} style={{ width: '40px', border: 'none', background: 'transparent', outline: 'none', padding: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textAlign: 'right' }} />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', paddingRight: '6px' }}>%</span>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Toeslag op de arbeidskosten</span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>€{werkelijkeAK.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        
                                        <div style={{ padding: '10px 14px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Materiaal & Inkoop</span>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                                    {materiaalKostenType === '10' ? '10% over arbeidskosten (Buitenschilderwerk)' :
                                                     materiaalKostenType === '15' ? '15% over arbeidskosten (Binnenschilderwerk)' :
                                                     materiaalKostenType === '20' ? '20% over arbeidskosten (Binnen & Buiten)' :
                                                     'Gedetailleerd uit registratielijst (links)'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>€{materiaalKosten.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Subtotaal Kostprijs</span>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Uren + AK + Materiaal</span>
                                            </div>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#334155' }}>€{totaleKostprijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div style={{ padding: '10px 14px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #fdba74', borderTop: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c' }}>Winst & Risico (W&R)</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #fdba74', borderRadius: '6px', overflow: 'hidden' }}>
                                                        <input type="number" value={wrPercentage} onChange={e => handleSetWr(e.target.value)} style={{ width: '40px', border: 'none', background: 'transparent', outline: 'none', padding: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textAlign: 'right' }} />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', paddingRight: '6px' }}>%</span>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Projectmarge over kostprijs</span>
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ea580c' }}>€{werkelijkeWR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div style={{ padding: '16px 14px', background: 'linear-gradient(135deg, #fffbeb, #fff7ed)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#9a3412', textTransform: 'uppercase' }}>Totaal Nacalculatie</span>
                                            </div>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#9a3412' }}>€{totaleProjectKosten.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>

                    {/* ── Werkbonnen per taak ── */}
                    {(() => {
                        const medUurlonen = (() => { try { return JSON.parse(localStorage.getItem('schildersapp_uurloon_medewerker') || '{}'); } catch { return {}; } })();
                        const bonMetKosten = projWerkbonnen.map(bon => {
                            const uurloon = bon.uurloon ?? medUurlonen[bon.medewerkerId] ?? medUurlonen[bon.medewerkerNaam] ?? null;
                            const uren = parseFloat(bon.uren) || 0;
                            const arbeid = uurloon && uren ? Math.round(uurloon * uren * 100) / 100 : null;
                            const mat = (projWbMat[bon.id] || []).reduce((s, m) => s + (m.prijs ? m.prijs * (parseFloat(m.hoeveelheid) || 1) : 0), 0);
                            const totaal = (arbeid !== null || mat > 0) ? Math.round(((arbeid || 0) + mat) * 100) / 100 : null;
                            return { ...bon, uurloon, arbeid, mat: Math.round(mat * 100) / 100, totaal };
                        });

                        // Groeperen per taak
                        const groepen = [];
                        const taken = project?.tasks || [];
                        for (const taak of taken) {
                            const bons = bonMetKosten.filter(b => String(b.taskId) === String(taak.id));
                            groepen.push({ label: taak.name, completed: taak.completed, bons });
                        }
                        const zonderTaak = bonMetKosten.filter(b => !b.taskId || !taken.find(t => String(t.id) === String(b.taskId)));
                        if (zonderTaak.length > 0) groepen.push({ label: 'Zonder taak', completed: false, bons: zonderTaak, losGekoppeld: true });

                        const totaalUren = bonMetKosten.reduce((s, b) => s + (parseFloat(b.uren) || 0), 0);
                        const totaalArbeid = bonMetKosten.reduce((s, b) => s + (b.arbeid || 0), 0);
                        const totaalMat = bonMetKosten.reduce((s, b) => s + (b.mat || 0), 0);
                        const totaalKosten = Math.round((totaalArbeid + totaalMat) * 100) / 100;

                        const MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
                        const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

                        return (
                        <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#fff8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-file-lines" style={{ color: '#F5850A', fontSize: '0.9rem' }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>Werkbonnen per taak</span>
                                    {projWbLoading && <i className="fa-solid fa-spinner fa-spin" style={{ color: '#F5850A', fontSize: '0.8rem' }} />}
                                    {!projWbLoading && <span style={{ background: '#fff7ed', color: '#F5850A', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px' }}>{projWerkbonnen.length} bonnen</span>}
                                </div>
                                {totaalKosten > 0 && <span style={{ fontWeight: 800, color: '#F5850A', fontSize: '0.9rem' }}>€ {totaalKosten.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>}
                            </div>

                            {projWerkbonnen.length === 0 && !projWbLoading && (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    Geen werkbonnen gekoppeld aan dit project
                                </div>
                            )}

                            {groepen.filter(g => g.bons.length > 0).map((groep, gi) => (
                                <div key={gi} style={{ borderBottom: gi < groepen.filter(g => g.bons.length > 0).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    {/* Taak header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: groep.losGekoppeld ? '#f8fafc' : '#f0f9ff', borderBottom: '1px solid #e2e8f0' }}>
                                        <i className={`fa-solid ${groep.completed ? 'fa-circle-check' : groep.losGekoppeld ? 'fa-folder' : 'fa-circle-half-stroke'}`}
                                           style={{ color: groep.completed ? '#10b981' : groep.losGekoppeld ? '#94a3b8' : '#3b82f6', fontSize: '0.75rem' }} />
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: groep.losGekoppeld ? '#94a3b8' : '#1e40af' }}>{groep.label}</span>
                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>· {groep.bons.length} bon{groep.bons.length !== 1 ? 'nen' : ''}</span>
                                    </div>
                                    {/* Werkbonnen in deze taak */}
                                    {groep.bons.map((bon, bi) => (
                                        <div key={bon.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 90px', gap: '8px', alignItems: 'center', padding: '8px 18px 8px 32px', borderBottom: bi < groep.bons.length - 1 ? '1px solid #f8fafc' : 'none', background: bi % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{bon.naam || 'Nader in te vullen'}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{bon.medewerkerNaam} · {fmtDate(bon.datum)}</div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 700, textAlign: 'right' }}>{bon.uren ? `${bon.uren}u` : '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: bon.arbeid ? '#1e293b' : '#94a3b8', textAlign: 'right' }}>{bon.arbeid ? `€ ${bon.arbeid.toFixed(2)}` : '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: bon.mat > 0 ? '#1e293b' : '#94a3b8', textAlign: 'right' }}>{bon.mat > 0 ? `€ ${bon.mat.toFixed(2)}` : '—'}</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: bon.totaal ? '#7c3aed' : '#94a3b8', textAlign: 'right' }}>{bon.totaal ? `€ ${bon.totaal.toFixed(2)}` : '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {projWerkbonnen.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 90px', gap: '8px', alignItems: 'center', padding: '10px 18px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderTop: '2px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>Totaal</span>
                                    <span style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 800, textAlign: 'right' }}>{Math.round(totaalUren * 10) / 10}u</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>€ {totaalArbeid.toFixed(2)}</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>€ {totaalMat.toFixed(2)}</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#7c3aed', textAlign: 'right' }}>€ {totaalKosten.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    </div>
                </div>
                );
            })()}

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
                    if (!phone) { showToast('Voer eerst een telefoonnummer in bij klantgegevens.', 'warning'); return; }
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

            {activeTab === 'dossier' && (() => {
                const emails = project.emails || [];
                const tasks = project.tasks || [];

                // Emails: nieuwste eerst. Taken: volgorde van de takenlijst (aanmaakdatum).
                const emailItems = emails
                    .map(e => ({ ...e, _type: 'email', _datum: new Date(e.date || 0) }))
                    .sort((a, b) => b._datum - a._datum);
                const taakItems = tasks
                    .map((t, idx) => ({ ...t, _type: 'taak', _datum: new Date(t.startDate || t.endDate || 0), _idx: idx }));

                const todoTaken     = tasks.filter(t => !t.completed && !emails.find(e => e.taskId === t.id) && t.kanbanStatus !== 'planning');
                const planningTaken = tasks.filter(t => !t.completed && !emails.find(e => e.taskId === t.id) && t.kanbanStatus === 'planning');
                const emailTaken    = tasks.filter(t => !t.completed && !!emails.find(e => e.taskId === t.id));
                const afgerondTaken = tasks.filter(t => t.completed);

                const gefilterd = (() => {
                    if (dossierFilter === 'emails') return emailItems;
                    if (dossierFilter === 'taken') return taakItems;
                    if (dossierFilter === 'open') return [
                        ...taakItems.filter(t => !t.completed),
                        ...emailItems.filter(e => e.status !== 'afgehandeld'),
                    ];
                    // 'alle': taken eerst (taaklijst-volgorde), dan emails (nieuwste eerst)
                    return [...taakItems, ...emailItems];
                })();

                // Datum-groepering
                const nu = new Date();
                const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());
                const gisteren = new Date(vandaag); gisteren.setDate(gisteren.getDate() - 1);
                const weekStart = new Date(vandaag); weekStart.setDate(weekStart.getDate() - 7);

                const groepen = [];
                let huidigeGroep = null;
                gefilterd.forEach(item => {
                    const d = item._datum;
                    let label;
                    if (!d || isNaN(d)) {
                        label = item._type === 'taak' ? 'Taken' : 'Eerder';
                    } else {
                        const dag = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        if (dag > vandaag) label = item._type === 'taak' ? 'Taken' : 'Gepland';
                        else if (dag >= vandaag) label = 'Vandaag';
                        else if (dag >= gisteren) label = 'Gisteren';
                        else if (dag >= weekStart) label = 'Deze week';
                        else label = 'Eerder';
                    }
                    if (label !== huidigeGroep) { groepen.push({ label, items: [] }); huidigeGroep = label; }
                    groepen[groepen.length - 1].items.push(item);
                });

                const projColor = project.color || '#3b82f6';
                const openEmails = emails.filter(e => e.status !== 'afgehandeld').length;
                const openTaken = tasks.filter(t => !t.completed).length;

                const addTaskFromDossierEmail = (email) => {
                    const newT = {
                        id: 't' + Date.now() + Math.random(),
                        name: email.subject || 'Taak uit email',
                        startDate: project.startDate || '',
                        endDate: project.endDate || '',
                        assignedTo: [],
                        completed: false,
                        notes: [],
                        category: 'Email',
                    };
                    const updatedEmails = emails.map(e => e.id === email.id ? { ...e, taskId: newT.id } : e);
                    saveProject({ ...project, tasks: [...tasks, newT], emails: updatedEmails });
                };

                const toggleEmailCategory = (emailId, category) => {
                    const email = emails.find(e => e.id === emailId);
                    const cur = email?.categories || [];
                    const newCats = cur.includes(category) ? cur.filter(c => c !== category) : [...cur, category];
                    saveProject({ ...project, emails: emails.map(e => e.id === emailId ? { ...e, categories: newCats } : e) });
                    if (email?.outlookId) {
                        fetch('/api/outlook/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outlookId: email.outlookId, action: 'set_category', categories: newCats }) }).catch(() => {});
                    }
                };
                const setEmailCategory = (emailId, category) => {
                    const newCats = category ? [category] : [];
                    const email = emails.find(e => e.id === emailId);
                    saveProject({ ...project, emails: emails.map(e => e.id === emailId ? { ...e, categories: newCats } : e) });
                    if (email?.outlookId) {
                        fetch('/api/outlook/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outlookId: email.outlookId, action: 'set_category', categories: newCats }) }).catch(() => {});
                    }
                    setCatPickerEmailId(null);
                };
                const CatPicker = ({ emailId, cats }) => (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button onClick={() => setCatPickerEmailId(catPickerEmailId === emailId ? null : emailId)} style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa-solid fa-tag" style={{ fontSize: '0.55rem' }} /> {cats.length ? 'Wijzig' : 'Categorie'}
                        </button>
                        {catPickerEmailId === emailId && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 999, marginTop: 4, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 8, minWidth: 180 }} onMouseLeave={() => setCatPickerEmailId(null)}>
                                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginBottom: 6, paddingLeft: 2 }}>OUTLOOK CATEGORIEËN</div>
                                {Object.keys(outlookCategories).length === 0
                                    ? <div style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '4px 2px' }}>Geen categorieën gevonden</div>
                                    : Object.entries(outlookCategories).map(([cat, kleur]) => {
                                        const actief = cats.includes(cat);
                                        return (
                                            <div key={cat} onClick={() => toggleEmailCategory(emailId, cat)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, cursor: 'pointer', background: actief ? kleur + '18' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = kleur + '28'} onMouseLeave={e => e.currentTarget.style.background = actief ? kleur + '18' : 'transparent'}>
                                                <span style={{ width: 12, height: 12, borderRadius: '50%', background: kleur, flexShrink: 0, border: actief ? `2px solid ${kleur}` : '2px solid transparent', outline: actief ? `2px solid ${kleur}55` : 'none' }} />
                                                <span style={{ flex: 1, fontSize: '0.75rem', color: '#1e293b', fontWeight: actief ? 700 : 400 }}>{cat}</span>
                                                {actief && <i className="fa-solid fa-check" style={{ fontSize: '0.6rem', color: kleur }} />}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        )}
                    </div>
                );

                const toggleDossierExpand = (id) => {
                    setDossierExpanded(prev => {
                        const next = new Set(prev);
                        next.has(id) ? next.delete(id) : next.add(id);
                        return next;
                    });
                };

                const iconBtn = (onClick, icon, title, extra = {}) => (
                    <button onClick={onClick} title={title} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, ...extra }}>
                        <i className={`fa-solid ${icon}`} />
                    </button>
                );

                return (
                    <div style={{ minHeight: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

                        {/* ── Sticky header ── */}
                        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                            {/* Rij 1: titel + badges + upload */}
                            <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: projColor }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Dossier</span>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.72rem' }}>
                                    {openEmails > 0 && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{openEmails} email open</span>}
                                    {openTaken > 0 && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{openTaken} taken open</span>}
                                    <input ref={emailUploadRef} type="file" accept=".msg,.eml" multiple style={{ display: 'none' }} onChange={e => { verwerkEmailBestand(e.target.files); e.target.value = ''; }} />
                                </div>
                            </div>
                            {/* Rij 2: tabs */}
                            <div style={{ display: 'flex', padding: '0 20px' }}>
                                {[['taken', '☑ Taken', openTaken], ['emails', '📧 Emails', openEmails]].map(([v, l, cnt]) => (
                                    <button key={v} onClick={() => setDossierFilter(v)} style={{ padding: '7px 14px 6px', border: 'none', borderBottom: dossierFilter === v ? `2px solid ${projColor}` : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: dossierFilter === v ? 700 : 500, fontSize: '0.78rem', color: dossierFilter === v ? projColor : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5, marginBottom: -1 }}>
                                        {l}{cnt > 0 && <span style={{ background: dossierFilter === v ? projColor : '#e2e8f0', color: dossierFilter === v ? '#fff' : '#64748b', borderRadius: 10, padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>{cnt}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Body: lijst + sjablonen ── */}
                        <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>

                            {/* ── Kanban + Email tijdlijn ── */}
                            <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>

                                {/* Kanban bord */}
                                {dossierFilter === 'taken' && (() => {
                                    const showAfgerond = dossierExpanded.has('__afgerond__');
                                    const moveTask = (taskId, newStatus) => saveProject({ ...project, tasks: tasks.map(t => t.id === taskId ? { ...t, kanbanStatus: newStatus } : t) });
                                    const movePlanningOrder = (taskId, dir) => {
                                        const all = [...tasks];
                                        const planIdxs = all.reduce((acc, t, i) => { if (t.kanbanStatus === 'planning' && !t.completed && !emails.find(e => e.taskId === t.id)) acc.push(i); return acc; }, []);
                                        const pos = planIdxs.indexOf(all.findIndex(t => t.id === taskId));
                                        if (pos < 0) return;
                                        const swapPos = dir === 'up' ? pos - 1 : pos + 1;
                                        if (swapPos < 0 || swapPos >= planIdxs.length) return;
                                        [all[planIdxs[pos]], all[planIdxs[swapPos]]] = [all[planIdxs[swapPos]], all[planIdxs[pos]]];
                                        saveProject({ ...project, tasks: all });
                                    };
                                    const renderTaakRij = (task, isLast, draggable, isFirst, showOrder) => {
                                        const isExp = dossierExpanded.has(task.id);
                                        const linkedEmail = emails.find(e => e.taskId === task.id);
                                        const accent = task.completed ? '#22c55e' : projColor;
                                        return (
                                            <div key={task.id}
                                                draggable={draggable}
                                                onDragStart={() => { dragTaskRef.current = task.id; }}
                                                onDragEnd={() => { dragTaskRef.current = null; }}
                                                style={{ opacity: 1, cursor: draggable ? 'grab' : 'default' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', minHeight: 32 }}>
                                                    {draggable && <i className="fa-solid fa-grip-vertical" style={{ color: '#d1d5db', fontSize: '0.6rem', flexShrink: 0 }} />}
                                                    <button onClick={() => saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t) })} style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${accent}`, background: task.completed ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                                        {task.completed && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.45rem' }} />}
                                                    </button>
                                                    <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 500, color: task.completed ? '#94a3b8' : '#1e293b', textDecoration: task.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
                                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                                                        <i className="fa-regular fa-calendar-plus" onClick={() => toggleDossierExpand(task.id)} style={{ fontSize: '0.6rem', color: task.startDate ? '#86efac' : '#e2e8f0', cursor: 'pointer' }} title={task.startDate ? `Start: ${task.startDate}` : 'Startdatum instellen'} />
                                                        <i className="fa-regular fa-calendar-minus" onClick={() => toggleDossierExpand(task.id)} style={{ fontSize: '0.6rem', color: task.endDate ? '#fca5a5' : '#e2e8f0', cursor: 'pointer' }} title={task.endDate ? `Eind: ${task.endDate}` : 'Einddatum instellen'} />
                                                        <i className="fa-regular fa-note-sticky" onClick={() => toggleDossierExpand(task.id)} style={{ fontSize: '0.6rem', color: (task.notes || []).length > 0 ? '#fdba74' : '#e2e8f0', cursor: 'pointer' }} title={(task.notes || []).length > 0 ? `${(task.notes || []).length} notitie(s)` : 'Notitie toevoegen'} />
                                                        <i className="fa-solid fa-paperclip" onClick={() => toggleDossierExpand(task.id)} style={{ fontSize: '0.6rem', color: (task.attachments || []).length > 0 ? '#334155' : '#e2e8f0', cursor: 'pointer' }} title={(task.attachments || []).length > 0 ? `${(task.attachments || []).length} bijlage(n)` : 'Bijlage toevoegen'} />
                                                        {linkedEmail && <i className="fa-regular fa-envelope" onClick={async () => { if (linkedEmail.originalFile) { const bestand = await haalEmailBestandOp(linkedEmail.originalFile.fileId); const blob = bestand?.blob || bestand; if (blob instanceof Blob) { const reader = new FileReader(); reader.onload = async ev => { await fetch('/api/outlook/open-msg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: ev.target.result.split(',')[1], name: linkedEmail.originalFile.name }) }); }; reader.readAsDataURL(blob); } } else if (linkedEmail.from) { window.location.href = `mailto:${linkedEmail.from}`; } }} style={{ fontSize: '0.6rem', color: '#3b82f6', cursor: 'pointer' }} title="Open email in Outlook" />}
                                                        {showOrder && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                <button onClick={() => movePlanningOrder(task.id, 'up')} disabled={isFirst} style={{ width: 14, height: 12, border: 'none', background: 'none', color: isFirst ? '#e2e8f0' : '#94a3b8', cursor: isFirst ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem' }}><i className="fa-solid fa-chevron-up" /></button>
                                                                <button onClick={() => movePlanningOrder(task.id, 'down')} disabled={isLast} style={{ width: 14, height: 12, border: 'none', background: 'none', color: isLast ? '#e2e8f0' : '#94a3b8', cursor: isLast ? 'default' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem' }}><i className="fa-solid fa-chevron-down" /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Expand strip — gecentreerde pijl */}
                                                <div onClick={() => toggleDossierExpand(task.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 16, cursor: 'pointer', borderTop: '1px solid #f1f5f9', borderBottom: (!isLast || isExp) ? '1px solid #f1f5f9' : 'none', background: isExp ? `${projColor}08` : '#fafafa', gap: 6 }}>
                                                    <i className={`fa-solid fa-chevron-${isExp ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', color: isExp ? projColor : '#94a3b8' }} />
                                                </div>
                                                {isExp && (
                                                    <div style={{ padding: '10px 12px 12px', background: '#fafafa', borderBottom: !isLast ? '1px solid #f1f5f9' : 'none' }}>
                                                        {/* Email info */}
                                                        {linkedEmail && (
                                                            <div style={{ marginBottom: 10 }}>
                                                                <div style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: '0.7rem', color: '#1e40af', marginBottom: 6 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                                                                        <i className="fa-regular fa-user" style={{ flexShrink: 0 }} />
                                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedEmail.from || '—'}</span>
                                                                    </div>
                                                                    {linkedEmail.date && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                                            <i className="fa-regular fa-calendar" />
                                                                            <span>{linkedEmail.date}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Categorieën */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                                                    {(linkedEmail.categories || []).map(cat => {
                                                                        const kleur = outlookCategories[cat] || '#94a3b8';
                                                                        return (
                                                                            <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: kleur + '22', border: `1px solid ${kleur}55`, color: kleur, borderRadius: 6, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 600 }}>
                                                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: kleur, flexShrink: 0 }} />
                                                                                {cat}
                                                                                <button onClick={() => setEmailCategory(linkedEmail.id, null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: kleur, padding: 0, fontSize: '0.6rem', lineHeight: 1, marginLeft: 1 }}>✕</button>
                                                                            </span>
                                                                        );
                                                                    })}
                                                                    <CatPicker emailId={linkedEmail.id} cats={linkedEmail.categories || []} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Datums */}
                                                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                                            {[['startDate','Startdatum'],['endDate','Einddatum']].map(([field, label]) => (
                                                                <div key={field} style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: 3, fontWeight: 600 }}>{label}</div>
                                                                    <input type="date" key={task.id + field} defaultValue={task[field] || ''} onBlur={e => saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, [field]: e.target.value || '' } : t) })} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 7px', fontSize: '0.73rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Notities */}
                                                        <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: 5, fontWeight: 600 }}>Notities</div>
                                                        {(task.notes || []).map(note => (
                                                            <div key={note.id} style={{ display: 'flex', gap: 5, marginBottom: 4, alignItems: 'flex-start' }}>
                                                                <textarea key={note.id} defaultValue={note.text} onBlur={e => { const v = e.target.value; if (v !== note.text) saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, notes: (t.notes || []).map(n => n.id === note.id ? { ...n, text: v } : n) } : t) }); }} rows={2} placeholder="Notitie…" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 7px', fontSize: '0.73rem', resize: 'vertical', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                                                                <button onClick={() => saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, notes: (t.notes || []).filter(n => n.id !== note.id) } : t) })} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0, marginTop: 2 }}><i className="fa-solid fa-trash" /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => { const newNote = { id: 'n' + Date.now(), text: '' }; saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, notes: [...(t.notes || []), newNote] } : t) }); }} style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', marginBottom: 10 }}>+ Notitie toevoegen</button>
                                                        {/* Bijlagen */}
                                                        <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: 5, fontWeight: 600 }}>Bijlagen</div>
                                                        {(task.attachments || []).map(att => {
                                                            const isImg = att.type?.startsWith('image/');
                                                            const kb = att.size ? (att.size < 1024 ? att.size + ' B' : att.size < 1048576 ? Math.round(att.size / 1024) + ' KB' : (att.size / 1048576).toFixed(1) + ' MB') : '';
                                                            return (
                                                                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 7px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0' }}>
                                                                    <i className={`fa-solid ${isImg ? 'fa-image' : 'fa-paperclip'}`} style={{ color: isImg ? '#3b82f6' : '#94a3b8', fontSize: '0.7rem', flexShrink: 0 }} />
                                                                    <span style={{ flex: 1, fontSize: '0.72rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                                                    {kb && <span style={{ fontSize: '0.62rem', color: '#94a3b8', flexShrink: 0 }}>{kb}</span>}
                                                                    <button onClick={async () => { const f = await haalEmailBestandOp(`task_${task.id}_${att.id}`); if (!f) return; const url = URL.createObjectURL(f.blob || f); const a = document.createElement('a'); a.href = url; a.download = att.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }} title="Download"><i className="fa-solid fa-download" /></button>
                                                                    <button onClick={async () => { await verwijderEmailBestand(`task_${task.id}_${att.id}`); saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, attachments: (t.attachments || []).filter(a => a.id !== att.id) } : t) }); }} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }} title="Verwijder"><i className="fa-solid fa-trash" /></button>
                                                                </div>
                                                            );
                                                        })}
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', marginBottom: 10 }}>
                                                            <i className="fa-solid fa-paperclip" /> Bijlage toevoegen
                                                            <input type="file" multiple style={{ display: 'none' }} onChange={async e => {
                                                                const files = Array.from(e.target.files);
                                                                if (!files.length) return;
                                                                const newAtts = [];
                                                                for (const file of files) {
                                                                    const attId = 'a' + Date.now() + Math.random().toString(36).slice(2);
                                                                    await slaEmailBestandOp(`task_${task.id}_${attId}`, file);
                                                                    newAtts.push({ id: attId, name: file.name, type: file.type, size: file.size });
                                                                }
                                                                saveProject({ ...project, tasks: tasks.map(t => t.id === task.id ? { ...t, attachments: [...(t.attachments || []), ...newAtts] } : t) });
                                                                e.target.value = '';
                                                            }} />
                                                        </label>
                                                        {/* Verwijder taak + ga naar email */}
                                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {linkedEmail && <button onClick={() => { setDossierFilter('emails'); setSelectedEmailId(linkedEmail.id); setTimeout(() => document.getElementById(`dossier-item-${linkedEmail.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }} style={{ fontSize: '0.7rem', color: '#3b82f6', background: 'none', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><i className="fa-regular fa-envelope" /> Ga naar email in dossier</button>}
                                                            <button onClick={() => { if (window.confirm(`Taak "${task.name}" verwijderen?`)) saveProject({ ...project, tasks: tasks.filter(t => t.id !== task.id) }); }} style={{ fontSize: '0.7rem', color: '#ef4444', background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><i className="fa-solid fa-trash" /> Verwijder taak</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    };
                                    const kanbanKolom = (titel, icon, items, kleur, targetStatus, showOrder) => (
                                        <div
                                            style={{ flex: 1, minWidth: 0, background: kanbanDragOver === targetStatus ? `${kleur}08` : '#fff', borderRadius: 10, border: `1px solid ${kanbanDragOver === targetStatus ? kleur : '#e2e8f0'}`, overflow: 'hidden', transition: 'border-color 0.15s, background 0.15s' }}
                                            onDragOver={e => { e.preventDefault(); if (targetStatus !== '__email__') setKanbanDragOver(targetStatus); }}
                                            onDragLeave={() => setKanbanDragOver(null)}
                                            onDrop={() => { if (dragTaskRef.current && targetStatus !== '__email__') moveTask(dragTaskRef.current, targetStatus); setKanbanDragOver(null); }}
                                        >
                                            <div style={{ padding: '7px 12px', background: `${kleur}10`, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: '0.75rem' }}>{icon}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>{titel}</span>
                                                <span style={{ marginLeft: 'auto', background: `${kleur}20`, color: kleur, borderRadius: 10, padding: '1px 7px', fontSize: '0.62rem', fontWeight: 700 }}>{items.length}</span>
                                            </div>
                                            {items.length === 0
                                                ? <div style={{ padding: '18px 12px', textAlign: 'center', color: '#cbd5e1', fontSize: '0.72rem' }}>{targetStatus === '__email__' ? 'Geen email-taken' : 'Sleep hier een taak naartoe'}</div>
                                                : items.map((t, i) => renderTaakRij(t, i === items.length - 1, targetStatus === 'todo' || targetStatus === 'planning', i === 0, showOrder))
                                            }
                                            {targetStatus !== '__email__' && (
                                                kanbanNieuweKolom === targetStatus
                                                    ? <div style={{ padding: '6px 10px', borderTop: items.length > 0 ? '1px solid #f1f5f9' : 'none' }}>
                                                        <input
                                                            autoFocus
                                                            value={kanbanNieuweNaam}
                                                            onChange={e => setKanbanNieuweNaam(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && kanbanNieuweNaam.trim()) {
                                                                    const newTask = { id: 't' + Date.now(), name: kanbanNieuweNaam.trim(), completed: false, kanbanStatus: targetStatus, notes: [], attachments: [] };
                                                                    saveProject({ ...project, tasks: [...tasks, newTask] });
                                                                    setKanbanNieuweNaam('');
                                                                    setKanbanNieuweKolom(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setKanbanNieuweNaam('');
                                                                    setKanbanNieuweKolom(null);
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (kanbanNieuweNaam.trim()) {
                                                                    const newTask = { id: 't' + Date.now(), name: kanbanNieuweNaam.trim(), completed: false, kanbanStatus: targetStatus, notes: [], attachments: [] };
                                                                    saveProject({ ...project, tasks: [...tasks, newTask] });
                                                                }
                                                                setKanbanNieuweNaam('');
                                                                setKanbanNieuweKolom(null);
                                                            }}
                                                            placeholder="Taaknaam…"
                                                            style={{ width: '100%', border: `1px solid ${kleur}`, borderRadius: 6, padding: '5px 8px', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
                                                        />
                                                      </div>
                                                    : <button
                                                        onClick={() => { setKanbanNieuweKolom(targetStatus); setKanbanNieuweNaam(''); }}
                                                        style={{ width: '100%', padding: '6px 12px', border: 'none', borderTop: items.length > 0 ? '1px solid #f1f5f9' : 'none', background: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem' }} /> Taak toevoegen
                                                      </button>
                                            )}
                                        </div>
                                    );
                                    return (
                                        <div style={{ padding: '12px 16px 8px' }}>
                                            <div style={{ display: 'flex', gap: 12, marginBottom: afgerondTaken.length > 0 ? 10 : 0 }}>
                                                {kanbanKolom('To-do', '☑', todoTaken, '#64748b', 'todo', false)}
                                                {kanbanKolom('Planning taken', '📅', planningTaken, projColor, 'planning', true)}
                                                {kanbanKolom('Uit email', '📧', emailTaken, '#3b82f6', '__email__')}
                                            </div>
                                            {afgerondTaken.length > 0 && (
                                                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                    <div onClick={() => toggleDossierExpand('__afgerond__')} style={{ padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                                        <i className={`fa-solid fa-chevron-${showAfgerond ? 'up' : 'down'}`} style={{ fontSize: '0.6rem', color: '#94a3b8' }} />
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>Afgerond</span>
                                                        <span style={{ background: '#f1f5f9', color: '#94a3b8', borderRadius: 10, padding: '1px 7px', fontSize: '0.62rem', fontWeight: 700 }}>{afgerondTaken.length}</span>
                                                    </div>
                                                    {showAfgerond && afgerondTaken.map((t, i) => renderTaakRij(t, i === afgerondTaken.length - 1))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Email lijst */}
                                {dossierFilter === 'emails' && (() => {
                                    const emailsSorted = [...(project.emails || [])].sort((a, b) => new Date(b.date || b.aangemaakt || 0) - new Date(a.date || a.aangemaakt || 0));
                                    const catKleuren = { Offerte: '#f59e0b', Opdracht: '#8b5cf6', Factuur: '#ef4444', Klacht: '#dc2626', Informatie: '#06b6d4', Overig: '#94a3b8' };

                                    return (
                                        <div>
                                            {/* Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{emailsSorted.length} bericht{emailsSorted.length !== 1 ? 'en' : ''}</span>
                                                <button onClick={() => setEmailForm({ richting: 'in', van: '', onderwerp: '', datum: new Date().toISOString().split('T')[0], categorie: 'Overig', notitie: '', _aiLoading: false, _aiTaken: [] })} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <i className="fa-solid fa-plus" /> Email toevoegen
                                                </button>
                                            </div>
                                            {/* Drag & drop zone */}
                                            <div
                                                onClick={() => emailUploadRef.current?.click()}
                                                onDragEnter={e => { e.preventDefault(); e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                                onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                                onDragLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                onDrop={e => { e.preventDefault(); e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; const files = e.dataTransfer.files?.length ? Array.from(e.dataTransfer.files) : Array.from(e.dataTransfer.items || []).filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); verwerkEmailBestand(files); }}
                                                style={{ margin: '10px 14px 4px', border: '2px dashed #3b82f6', borderRadius: 8, padding: '12px', textAlign: 'center', background: '#f8fafc', transition: 'all 0.15s', cursor: 'pointer' }}
                                            >
                                                <i className="fa-solid fa-envelope-arrow-down" style={{ color: '#3b82f6', fontSize: '1.1rem', display: 'block', marginBottom: 4 }} />
                                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3b82f6' }}>Klik om .msg of .eml te uploaden</div>
                                                <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>of sleep een bestand hier naartoe</div>
                                            </div>
                                            {/* Lijst */}
                                            {emailsSorted.length === 0 ? (
                                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0', fontSize: '0.82rem' }}>
                                                    <i className="fa-solid fa-inbox" style={{ fontSize: '1.6rem', display: 'block', marginBottom: 7 }} />
                                                    Nog geen emails — gebruik de knop of sleep een bestand
                                                </div>
                                            ) : (() => {
                                                let vorigeDag = null;
                                                return emailsSorted.map(email => {
                                                    const isIn = email.direction !== 'out';
                                                    const isOpen = selectedEmailId === email.id;
                                                    const ac = isIn ? '#3b82f6' : '#16a34a';
                                                    const datum = new Date(email.date || email.aangemaakt || 0);
                                                    const dagStr = !isNaN(datum) ? datum.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
                                                    const tijdStr = !isNaN(datum) ? datum.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '';
                                                    const catKleur = catKleuren[email.categorie] || '#94a3b8';
                                                    const vanAan = isIn ? (email.van || email.from || '—') : (email.to || email.van || '—');
                                                    const initialen = (vanAan.match(/^([A-Za-z])/)?.[1] || '?').toUpperCase();
                                                    const vEntry = voorgesteldeTaken[email.id] ?? (email.aiTaken?.length ? { loading: false, taken: email.aiTaken, done: true } : null);
                                                    const preview = (email.body || email.notitie || '').replace(/<[^>]*>/g, '').slice(0, 120);
                                                    const toonDatumScheiding = dagStr && dagStr !== vorigeDag;
                                                    if (dagStr) vorigeDag = dagStr;
                                                    return (
                                                        <React.Fragment key={email.id}>
                                                            {/* Datum scheiding */}
                                                            {toonDatumScheiding && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', margin: '4px 0' }}>
                                                                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>{dagStr}</span>
                                                                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                                                </div>
                                                            )}
                                                            {/* Chat bubble rij */}
                                                            <div style={{ display: 'flex', flexDirection: isIn ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 10, padding: '2px 14px' }}>
                                                                {/* Avatar */}
                                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isIn ? '#dbeafe' : '#dcfce7', color: isIn ? '#1d4ed8' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, marginTop: 2 }}>
                                                                    {isIn ? initialen : <i className="fa-solid fa-building" style={{ fontSize: '0.7rem' }} />}
                                                                </div>
                                                                {/* Bubble */}
                                                                <div style={{ maxWidth: '78%', minWidth: 200 }}>
                                                                    {/* Naam + tijd boven bubble */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexDirection: isIn ? 'row' : 'row-reverse' }}>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>{isIn ? vanAan : 'Wij'}</span>
                                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{tijdStr}</span>
                                                                        {(email.attachments || []).length > 0 && <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}><i className="fa-solid fa-paperclip" /> {email.attachments.length}</span>}
                                                                    </div>
                                                                    {/* Bubble zelf — klikbaar */}
                                                                    <div onClick={() => { setSelectedEmailId(isOpen ? null : email.id); setCatDropdownEmailId(null); }} style={{ background: isIn ? '#fff' : '#f0fdf4', border: `1px solid ${isIn ? '#e2e8f0' : '#bbf7d0'}`, borderRadius: isIn ? '2px 12px 12px 12px' : '12px 2px 12px 12px', padding: '10px 14px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{email.subject || email.onderwerp || '(geen onderwerp)'}</div>
                                                                        {!isOpen && preview && <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{preview}</div>}
                                                                        {/* Categorie + acties */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                                                            <div style={{ position: 'relative' }}>
                                                                                <span onClick={e => { e.stopPropagation(); setCatDropdownEmailId(catDropdownEmailId === email.id ? null : email.id); }} style={{ background: catKleur + '20', color: catKleur, border: `1px solid ${catKleur}40`, padding: '1px 7px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}>{email.categorie || 'Categorie'}</span>
                                                                                {catDropdownEmailId === email.id && (
                                                                                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 999, marginTop: 4, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 6, minWidth: 140 }}>
                                                                                        {['Offerte', 'Opdracht', 'Factuur', 'Klacht', 'Informatie', 'Overig'].map(cat => {
                                                                                            const kl = catKleuren[cat] || '#94a3b8';
                                                                                            const actief = email.categorie === cat;
                                                                                            return (
                                                                                                <div key={cat} onClick={() => updateEmailCategorie(email.id, cat)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 6, cursor: 'pointer', background: actief ? kl + '18' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = kl + '28'} onMouseLeave={e => e.currentTarget.style.background = actief ? kl + '18' : 'transparent'}>
                                                                                                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: kl, flexShrink: 0 }} />
                                                                                                    <span style={{ fontSize: '0.72rem', color: '#1e293b' }}>{cat}</span>
                                                                                                    {actief && <i className="fa-solid fa-check" style={{ fontSize: '0.55rem', color: kl, marginLeft: 'auto' }} />}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {(email.taken || []).length > 0 && <span style={{ fontSize: '0.6rem', color: '#92400e', background: '#fef9c3', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: 8 }}><i className="fa-solid fa-list-check" /> {email.taken.length}</span>}
                                                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                                                                <button onClick={e => { e.stopPropagation(); verwijderEmail(email.id); }} title="Verwijderen" style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}><i className="fa-solid fa-trash" /></button>
                                                                                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', color: '#94a3b8', alignSelf: 'center' }} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {/* Uitgevouwen inhoud */}
                                                                    {isOpen && (
                                                                        <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                                                                            {/* Email header details */}
                                                                            <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#475569', lineHeight: 1.8, background: '#f8fafc' }}>
                                                                                {email.van && <div><span style={{ color: '#94a3b8', minWidth: 44, display: 'inline-block' }}>Van:</span> {email.van}</div>}
                                                                                {email.to && <div><span style={{ color: '#94a3b8', minWidth: 44, display: 'inline-block' }}>Aan:</span> {email.to}</div>}
                                                                            </div>
                                                                            {email.notitie && <div style={{ padding: '8px 14px', fontSize: '0.78rem', color: '#475569', borderBottom: '1px solid #f1f5f9', fontStyle: 'italic' }}>{email.notitie}</div>}
                                                                            <EmailBody email={email} />
                                                                            {/* Bijlagen */}
                                                                            {(email.attachments || []).length > 0 && (() => {
                                                                                const imgExts = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff','.tif','.heic','.heif'];
                                                                                const fotos = email.attachments.filter(a => a.mimeType?.startsWith('image/') || imgExts.some(e => a.name?.toLowerCase().endsWith(e)));
                                                                                const bestanden = email.attachments.filter(a => !fotos.includes(a));
                                                                                return (
                                                                                    <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                                        {fotos.length > 0 && <div style={{ padding: '8px 14px' }}><div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>FOTO'S ({fotos.length})</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>{fotos.map((att, fi) => <AttachmentItem key={att.id} att={att} onLightbox={(url, naam) => setLightbox({ url, naam, fotos, idx: fi })} />)}</div></div>}
                                                                                        {bestanden.length > 0 && <div style={{ padding: '8px 14px', borderTop: fotos.length ? '1px solid #f1f5f9' : 'none' }}><div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginBottom: 5 }}>BIJLAGEN ({bestanden.length})</div>{bestanden.map(att => <AttachmentItem key={att.id} att={att} onLightbox={() => {}} />)}</div>}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            {/* Taken */}
                                                                            {((email.taken || []).length > 0 || vEntry) && (
                                                                                <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', background: '#fefce8' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}><i className="fa-solid fa-list-check" /> Taken ({(email.taken || []).length})</span>
                                                                                        {!vEntry?.done && <button onClick={async e => { e.stopPropagation(); setVoorgesteldeTaken(p => ({ ...p, [email.id]: { loading: true, taken: [], done: false } })); try { const r = await fetch('/api/outlook/extract-taken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: email.subject, body: email.body || email.notitie || '' }) }); const d = r.ok ? await r.json() : { taken: [] }; setVoorgesteldeTaken(p => ({ ...p, [email.id]: { loading: false, taken: d.taken || [], done: true } })); } catch { setVoorgesteldeTaken(p => ({ ...p, [email.id]: { loading: false, taken: [], done: true } })); } }} style={{ padding: '2px 9px', borderRadius: 6, border: '1px solid #f59e0b', background: '#fff', color: '#b45309', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><i className={`fa-solid ${vEntry?.loading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} />{vEntry?.loading ? 'Analyseren…' : 'AI taken'}</button>}
                                                                                    </div>
                                                                                    {(email.taken || []).map(taak => (<div key={taak.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 7, background: taak.gedaan ? '#f0fdf4' : '#fff', border: `1px solid ${taak.gedaan ? '#bbf7d0' : '#fde68a'}`, marginBottom: 4 }}><button onClick={() => toggleEmailTaak(email.id, taak.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${taak.gedaan ? '#16a34a' : '#f59e0b'}`, background: taak.gedaan ? '#16a34a' : '#fff', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.55rem', padding: 0 }}>{taak.gedaan && <i className="fa-solid fa-check" />}</button><div style={{ flex: 1 }}><div style={{ fontSize: '0.72rem', color: taak.gedaan ? '#16a34a' : '#1e293b', textDecoration: taak.gedaan ? 'line-through' : 'none' }}>{taak.naam}</div>{taak.deadline && <div style={{ fontSize: '0.6rem', color: '#92400e' }}>Deadline: {taak.deadline}</div>}</div><button onClick={() => verwijderEmailTaak(email.id, taak.id)} style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }}><i className="fa-solid fa-xmark" /></button></div>))}
                                                                                    {(vEntry?.taken || []).length > 0 && <div style={{ marginTop: 6, borderTop: '1px solid #fde68a', paddingTop: 6 }}><div style={{ fontSize: '0.6rem', color: '#92400e', marginBottom: 5 }}><i className="fa-solid fa-wand-magic-sparkles" /> AI-suggesties</div>{(vEntry.taken || []).map((taak, ti) => { const naam = typeof taak === 'string' ? taak : (taak?.name || ''); const deadline = typeof taak === 'object' ? taak?.deadline : null; const alToegewezen = (email.taken || []).some(t => t.naam === naam); return (<div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px', borderRadius: 6, background: alToegewezen ? '#f0fdf4' : '#fffbeb', border: `1px solid ${alToegewezen ? '#bbf7d0' : '#fde68a'}`, marginBottom: 3, opacity: alToegewezen ? 0.6 : 1 }}><div style={{ flex: 1 }}><div style={{ fontSize: '0.7rem', color: '#92400e' }}>{naam}</div>{deadline && <div style={{ fontSize: '0.6rem', color: '#b45309' }}>Deadline: {deadline}</div>}</div>{!alToegewezen && <button onClick={() => voegEmailTaakToe(email.id, naam, deadline)} style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid #f59e0b', background: '#f59e0b', color: '#fff', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>+</button>}{alToegewezen && <i className="fa-solid fa-check" style={{ color: '#16a34a', fontSize: '0.65rem' }} />}</div>); })}</div>}
                                                                                </div>
                                                                            )}
                                                                            {email.originalFile && (
                                                                                <div style={{ padding: '7px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 7 }}>
                                                                                    <i className="fa-solid fa-envelope" style={{ color: '#94a3b8', fontSize: '0.65rem' }} />
                                                                                    <span style={{ flex: 1, fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.originalFile.name}</span>
                                                                                    <button onClick={async () => { const b = await haalEmailBestandOp(email.originalFile.fileId); const blob = b?.blob || b; if (blob instanceof Blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = email.originalFile.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } }} style={{ padding: '2px 7px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.62rem', cursor: 'pointer' }}>Download .msg</button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* ── Sjablonen sidebar ── */}
                            {dossierFilter === 'taken' && <div style={{ width: 240, flexShrink: 0, borderLeft: '1px solid #e2e8f0', background: '#fff', padding: '12px 12px', position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>

                                <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-layer-group" style={{ color: projColor }} /> Sjablonen
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {TAAK_TEMPLATES.map((tmpl, ti) => (
                                        <div key={ti} style={{ borderRadius: 7, overflow: 'hidden', border: `1px solid ${tmpl.kleur}25` }}>
                                            <div onClick={() => setDossierSjabloonExpanded(dossierSjabloonExpanded === ti ? null : ti)} style={{ background: `${tmpl.kleur}12`, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 6 }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.73rem', color: tmpl.kleur, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tmpl.naam}</span>
                                                <button onClick={e => { e.stopPropagation(); const nt = tmpl.taken.map(naam => ({ id: 't' + Date.now() + Math.random(), name: naam, startDate: project.startDate || '', endDate: project.endDate || '', assignedTo: [], completed: false, notes: [], category: tmpl.naam })); saveProject({ ...project, tasks: [...project.tasks, ...nt] }); if (project.plannerPlanId) tmpl.taken.forEach(naam => stuurNaarPlanner('sjabloon-' + naam, naam)); }} style={{ padding: '1px 7px', borderRadius: 4, border: `1px solid ${tmpl.kleur}`, background: tmpl.kleur, color: '#fff', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>+alles</button>
                                                <i className={`fa-solid fa-chevron-${dossierSjabloonExpanded === ti ? 'up' : 'down'}`} style={{ fontSize: '0.55rem', color: tmpl.kleur, flexShrink: 0 }} />
                                            </div>
                                            {dossierSjabloonExpanded === ti && (
                                                <div style={{ padding: '4px 8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {tmpl.taken.map((tnaam, tni) => (
                                                        <div key={tni} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#475569' }}>
                                                            <span style={{ flex: 1 }}>{tnaam}</span>
                                                            <button onClick={() => { const t = { id: 't' + Date.now() + Math.random(), name: tnaam, startDate: project.startDate || '', endDate: project.endDate || '', assignedTo: [], completed: false, notes: [], category: tmpl.naam }; saveProject({ ...project, tasks: [...project.tasks, t] }); if (project.plannerPlanId) stuurNaarPlanner('sjabloon-' + tnaam, tnaam); }} style={{ padding: '1px 5px', borderRadius: 4, border: `1px solid ${tmpl.kleur}`, background: 'none', color: tmpl.kleur, fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>+</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>}

                        </div>{/* einde body flex */}
                    </div>
                );
            })()}

            {/* ===== TEAMS TAB ===== */}
            {activeTab === 'teams' && (() => {
                const heeftKanaal = !!(project.teamsKanaalUrl);

                const maakTeamsAan = async () => {
                    if (!teamsTeamId) { setTeamsFout('Kies eerst een Teams-team.'); return; }
                    setTeamsBezig(true); setTeamsFout(null);
                    try {
                        const res = await fetch('/api/teams/maak-project-aan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ teamId: teamsTeamId, projectNaam: project.name }),
                        });
                        const data = await res.json();
                        if (!res.ok) { setTeamsFout(data.error || 'Onbekende fout'); return; }
                        saveProject({ ...project, teamsKanaalId: data.kanaalId, teamsKanaalUrl: data.kanaalUrl, plannerPlanId: data.plannerPlanId, teamsPlanAangemaakt: true });
                    } catch (e) { setTeamsFout(e.message); }
                    finally { setTeamsBezig(false); }
                };

                return (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '20px 24px', color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                                    <i className="fa-brands fa-microsoft" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>Microsoft Teams — Kanaal</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 2 }}>{project.name}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {heeftKanaal && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>✓ Kanaal</span>}
                                    <button onClick={() => { window.location.href = '/api/outlook/auth?returnTo=' + encodeURIComponent(window.location.pathname + '?tab=' + activeTab); }} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}>
                                        <i className="fa-brands fa-microsoft" /> Verbinden met Outlook
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Foutmelding */}
                            {teamsFout && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, color: '#dc2626', fontSize: '0.8rem' }}>
                                    <i className="fa-solid fa-triangle-exclamation" />
                                    {teamsFout}
                                    <button onClick={() => setTeamsFout(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                </div>
                            )}

                            {/* Team kiezen */}
                            {!teamsTeamId && (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 6 }}>
                                        <i className="fa-solid fa-gear" style={{ marginRight: 8, color: '#7c3aed' }} />Kies jouw Microsoft Teams-team
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>Selecteer het team waar per project een kanaal in aangemaakt wordt.</div>
                                    {!teamsLijst && (
                                        <button onClick={async () => { setTeamsLijstBezig(true); try { const r = await fetch('/api/teams/mijn-teams'); const d = r.ok ? await r.json() : []; setTeamsLijst(d); } catch { setTeamsLijst([]); } finally { setTeamsLijstBezig(false); } }} disabled={teamsLijstBezig}
                                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className={`fa-solid ${teamsLijstBezig ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
                                            {teamsLijstBezig ? 'Laden…' : 'Mijn teams ophalen'}
                                        </button>
                                    )}
                                    {teamsLijst && teamsLijst.length === 0 && <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>Geen teams gevonden. Zorg dat je verbonden bent met Outlook.</div>}
                                    {teamsLijst && teamsLijst.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {teamsLijst.map(t => (
                                                <button key={t.id} onClick={() => { localStorage.setItem('schilders_teams_team_id', t.id); setTeamsTeamId(t.id); setTeamsLijst(null); }}
                                                    style={{ padding: '10px 14px', borderRadius: 9, border: '1.5px solid #e0e7ff', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                    <span style={{ width: 32, height: 32, borderRadius: 8, background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}><i className="fa-solid fa-people-group" /></span>
                                                    {t.naam}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── TEAMS KANAAL ── */}
                            {teamsTeamId && (
                                <div style={{ border: '1px solid #e0e7ff', borderRadius: 12, overflow: 'hidden' }}>
                                    <div style={{ background: '#eef2ff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem' }}>
                                            <i className="fa-solid fa-hashtag" />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#312e81' }}>Teams Kanaal</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: heeftKanaal ? '#c7d2fe' : '#f1f5f9', color: heeftKanaal ? '#3730a3' : '#64748b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                                            {heeftKanaal ? 'Gekoppeld' : 'Nog niet gekoppeld'}
                                        </span>
                                    </div>
                                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {heeftKanaal ? (
                                            <>
                                                <button onClick={() => window.open(project.teamsKanaalUrl, '_blank')}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: '#4f46e5', color: '#fff', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer', width: 'fit-content' }}>
                                                    <i className="fa-brands fa-microsoft" /> Kanaal openen
                                                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.65rem', opacity: 0.8 }} />
                                                </button>

                                                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                                                            <i className="fa-solid fa-envelope" style={{ color: '#4f46e5', marginRight: 6 }} /> E-mails & Berichten (Live)
                                                        </div>
                                                        <button disabled={kanaalBerichtenLaden} onClick={laadKanaalBerichten}
                                                                style={{ padding: '6px 12px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <i className={`fa-solid ${kanaalBerichtenLaden ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`} /> Vernieuwen
                                                        </button>
                                                    </div>
                                                    {!kanaalBerichtenData && !kanaalBerichtenLaden && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Klik op vernieuwen om de laatste berichten van Teams op te halen.</div>}
                                                    {kanaalBerichtenLaden && !kanaalBerichtenData && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Berichten laden...</div>}
                                                    {kanaalBerichtenData && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                            {kanaalBerichtenData.email && (
                                                                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <i className="fa-solid fa-at" style={{ color: '#94a3b8' }} />
                                                                    <div>
                                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Teams Kanaal E-mailadres:</div>
                                                                        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500 }}>{kanaalBerichtenData.email}</div>
                                                                    </div>
                                                                    <button onClick={() => { navigator.clipboard.writeText(kanaalBerichtenData.email); showToast('E-mailadres gekopieerd!', 'success'); }}
                                                                        style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: 6, color: '#475569', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                                                                        Kopiëren
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {!kanaalBerichtenData.email && <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>E-mailadres is nog niet gegenereerd in MS Teams. (Klik op Kanaal openen en kies 'E-mailadres ophalen').</div>}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                                                                {kanaalBerichtenData.berichten?.length === 0 && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Er zijn nog geen berichten in dit kanaal.</div>}
                                                                {kanaalBerichtenData.berichten?.map((msg, i) => (
                                                                    <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                            <b style={{ fontSize: '0.8rem', color: '#334155' }}>{msg.from}</b>
                                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(msg.tijd).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </div>
                                                                        {msg.subject && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{msg.subject}</div>}
                                                                        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, wordBreak: 'break-word', maxHeight: 80, overflow: 'hidden', position: 'relative' }} dangerouslySetInnerHTML={{ __html: msg.body }} />
                                                                        {msg.bijlagen > 0 && <div style={{ marginTop: 8, display: 'inline-flex', padding: '3px 8px', background: '#e2e8f0', borderRadius: 20, fontSize: '0.7rem', color: '#475569', gap: 5, alignItems: 'center' }}><i className="fa-solid fa-paperclip" /> {msg.bijlagen} bijlage(n) (Geopend in Teams)</div>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => { if(window.confirm('Weet je zeker dat je de koppeling wilt weghalen? Het kanaal blijft gewoon in MS Teams bestaan.')) saveProject({ ...project, teamsKanaalId: null, teamsKanaalUrl: null }); }}
                                                        style={{ padding: '6px 14px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <i className="fa-solid fa-link-slash" /> Kanaal ontkoppelen
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Toggle nieuw / bestaand */}
                                                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, gap: 4, width: 'fit-content' }}>
                                                    {[{ v: 'nieuw', label: 'Nieuw aanmaken', icon: 'fa-plus' }, { v: 'bestaand', label: 'Bestaand koppelen', icon: 'fa-link' }].map(opt => (
                                                        <button key={opt.v} onClick={() => { setKanaalKoppelModus(opt.v); setKanaalBestaandeLijst(null); setKanaalBestaandGeselecteerd(null); }}
                                                            style={{ padding: '7px 14px', borderRadius: 7, border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                                                                background: kanaalKoppelModus === opt.v ? '#fff' : 'transparent',
                                                                color: kanaalKoppelModus === opt.v ? '#4f46e5' : '#64748b',
                                                                boxShadow: kanaalKoppelModus === opt.v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                                                            <i className={`fa-solid ${opt.icon}`} style={{ fontSize: '0.7rem' }} /> {opt.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Nieuw aanmaken */}
                                                {kanaalKoppelModus === 'nieuw' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <button onClick={maakTeamsAan} disabled={teamsBezig}
                                                            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: teamsBezig ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, width: 'fit-content' }}>
                                                            <i className={`fa-solid ${teamsBezig ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
                                                            {teamsBezig ? 'Aanmaken…' : 'Teams kanaal aanmaken'}
                                                        </button>
                                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                            Maakt automatisch een kanaal aan met de naam <strong>{project.name}</strong>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bestaand koppelen */}
                                                {kanaalKoppelModus === 'bestaand' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        {!kanaalBestaandeLijst && (
                                                            <button onClick={async () => {
                                                                setKanaalBestaandBezig(true);
                                                                try {
                                                                    const r = await fetch(`/api/teams/kanalen?groupId=${teamsTeamId}`);
                                                                    const d = r.ok ? await r.json() : [];
                                                                    setKanaalBestaandeLijst(d);
                                                                } catch { setKanaalBestaandeLijst([]); }
                                                                finally { setKanaalBestaandBezig(false); }
                                                            }} disabled={kanaalBestaandBezig}
                                                                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
                                                                <i className={`fa-solid ${kanaalBestaandBezig ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
                                                                {kanaalBestaandBezig ? 'Laden…' : 'Kanalen ophalen'}
                                                            </button>
                                                        )}
                                                        {kanaalBestaandeLijst && kanaalBestaandeLijst.length === 0 && (
                                                            <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>Geen kanalen gevonden in dit team.</div>
                                                        )}
                                                        {kanaalBestaandeLijst && kanaalBestaandeLijst.length > 0 && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Kies een kanaal:</div>
                                                                {kanaalBestaandeLijst.map(k => (
                                                                    <button key={k.id} onClick={() => setKanaalBestaandGeselecteerd(k.id)}
                                                                        style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${kanaalBestaandGeselecteerd === k.id ? '#4f46e5' : '#e0e7ff'}`, background: kanaalBestaandGeselecteerd === k.id ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                                                                        <span style={{ width: 28, height: 28, borderRadius: 7, background: kanaalBestaandGeselecteerd === k.id ? '#4f46e5' : '#e0e7ff', color: kanaalBestaandGeselecteerd === k.id ? '#fff' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                                                                            <i className="fa-solid fa-hashtag" />
                                                                        </span>
                                                                        {k.naam}
                                                                        {kanaalBestaandGeselecteerd === k.id && <i className="fa-solid fa-circle-check" style={{ marginLeft: 'auto', color: '#4f46e5' }} />}
                                                                    </button>
                                                                ))}
                                                                <button onClick={() => {
                                                                    const k = kanaalBestaandeLijst.find(x => x.id === kanaalBestaandGeselecteerd);
                                                                    if (!k) return;
                                                                    saveProject({ ...project, teamsKanaalId: k.id, teamsKanaalUrl: k.url });
                                                                    setKanaalBestaandeLijst(null);
                                                                    setKanaalBestaandGeselecteerd(null);
                                                                }} disabled={!kanaalBestaandGeselecteerd}
                                                                    style={{ marginTop: 4, padding: '9px 18px', borderRadius: 9, border: 'none', background: kanaalBestaandGeselecteerd ? '#4f46e5' : '#e2e8f0', color: kanaalBestaandGeselecteerd ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.82rem', cursor: kanaalBestaandGeselecteerd ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
                                                                    <i className="fa-solid fa-link" /> Kanaal koppelen
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {teamsTeamId && (
                                <button onClick={() => { localStorage.removeItem('schilders_teams_team_id'); setTeamsTeamId(''); setTeamsLijst(null); }}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-start' }}>
                                    Team wijzigen
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ===== PLANNER TAB ===== */}
            {activeTab === 'planner' && (() => {
                const heeftPlanner = !!(project.plannerPlanId);

                const maakPlannerAan = async () => {
                    if (!teamsTeamId) { setTeamsFout('Kies eerst een Teams-team.'); return; }
                    setTeamsBezig(true); setTeamsFout(null);
                    const gekozenSjabloon = plannerSjablonenState.find(s => s.id === plannerSjabloon) || plannerSjablonenState[0];
                    try {
                        const res = await fetch('/api/teams/maak-project-aan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ teamId: teamsTeamId, projectNaam: project.name, buckets: gekozenSjabloon.buckets }),
                        });
                        const data = await res.json();
                        if (!res.ok) { setTeamsFout(data.error || 'Onbekende fout'); return; }
                        saveProject({ ...project, plannerPlanId: data.plannerPlanId, teamsPlanAangemaakt: true });
                        setToast('Planner aangemaakt!'); setTimeout(() => setToast(null), 3000);
                    } catch (e) { setTeamsFout(e.message); }
                    finally { setTeamsBezig(false); }
                };

                const verwijderPlanner = async () => {
                    if (!window.confirm('Planner plan verwijderen inclusief alle taken?')) return;
                    setTeamsBezig(true); setTeamsFout(null);
                    try {
                        const res = await fetch('/api/teams/verwijder-planner', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ planId: project.plannerPlanId }),
                        });
                        const data = await res.json();
                        if (!res.ok) { setTeamsFout(data.error || 'Verwijderen mislukt'); return; }
                        saveProject({ ...project, plannerPlanId: null });
                    } catch (e) { setTeamsFout(e.message); }
                    finally { setTeamsBezig(false); }
                };

                const laadBestaandePlannen = async () => {
                    if (!teamsTeamId) return;
                    setPlannerBestaandBezig(true);
                    try {
                        const res = await fetch(`/api/teams/planner-plannen?groupId=${teamsTeamId}`);
                        const data = res.ok ? await res.json() : [];
                        setPlannerBestaandeLijst(data);
                    } catch { setPlannerBestaandeLijst([]); }
                    finally { setPlannerBestaandBezig(false); }
                };

                const koppelenBestaandePlanner = () => {
                    if (!plannerBestaandGeselecteerd) return;
                    saveProject({ ...project, plannerPlanId: plannerBestaandGeselecteerd, teamsPlanAangemaakt: true });
                    setPlannerBestaandeLijst(null);
                    setPlannerBestaandGeselecteerd(null);
                    setPlannerKoppelModus('nieuw');
                };

                return (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', padding: '20px 24px', color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                                    <i className="fa-solid fa-list-check" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>Microsoft Planner</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 2 }}>{project.name}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {heeftPlanner && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>✓ Actief</span>}
                                    <button onClick={() => { window.location.href = '/api/outlook/auth?returnTo=' + encodeURIComponent(window.location.pathname + '?tab=' + activeTab); }} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}>
                                        <i className="fa-brands fa-microsoft" /> Verbinden met Outlook
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Foutmelding */}
                            {teamsFout && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, color: '#dc2626', fontSize: '0.8rem' }}>
                                    <i className="fa-solid fa-triangle-exclamation" />
                                    {teamsFout}
                                    <button onClick={() => setTeamsFout(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                </div>
                            )}

                            {/* Team kiezen */}
                            {!teamsTeamId && (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: 6 }}>
                                        <i className="fa-solid fa-gear" style={{ marginRight: 8, color: '#059669' }} />Kies jouw Microsoft Teams-team
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>Selecteer het team voor de Planner koppeling.</div>
                                    {!teamsLijst && (
                                        <button onClick={async () => { setTeamsLijstBezig(true); try { const r = await fetch('/api/teams/mijn-teams'); const d = r.ok ? await r.json() : []; setTeamsLijst(d); } catch { setTeamsLijst([]); } finally { setTeamsLijstBezig(false); } }} disabled={teamsLijstBezig}
                                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <i className={`fa-solid ${teamsLijstBezig ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
                                            {teamsLijstBezig ? 'Laden…' : 'Mijn teams ophalen'}
                                        </button>
                                    )}
                                    {teamsLijst && teamsLijst.length === 0 && <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>Geen teams gevonden. Zorg dat je verbonden bent met Outlook.</div>}
                                    {teamsLijst && teamsLijst.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {teamsLijst.map(t => (
                                                <button key={t.id} onClick={() => { localStorage.setItem('schilders_teams_team_id', t.id); setTeamsTeamId(t.id); setTeamsLijst(null); }}
                                                    style={{ padding: '10px 14px', borderRadius: 9, border: '1.5px solid #d1fae5', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#ecfdf5'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                    <span style={{ width: 32, height: 32, borderRadius: 8, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}><i className="fa-solid fa-people-group" /></span>
                                                    {t.naam}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PLANNER ── */}
                            {teamsTeamId && (
                                <div style={{ border: '1px solid #d1fae5', borderRadius: 12, overflow: 'hidden' }}>
                                    <div style={{ background: '#ecfdf5', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem' }}>
                                            <i className="fa-solid fa-list-check" />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065f46' }}>Microsoft Planner</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: heeftPlanner ? '#a7f3d0' : '#f1f5f9', color: heeftPlanner ? '#064e3b' : '#64748b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                                            {heeftPlanner ? 'Actief' : 'Nog niet aangemaakt'}
                                        </span>
                                    </div>
                                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                                        <>
                                                {/* ── Projecttaken paneel (links) ── */}
                                                <div style={{ width: 370, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <div style={{ border: '1px solid #c7d2fe', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(99,102,241,0.07)' }}>
                                                        <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <i className="fa-solid fa-clipboard-list" style={{ color: '#fff', fontSize: '0.7rem' }} />
                                                            </div>
                                                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', flex: 1 }}>Projecttaken</span>
                                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)' }}>{(project.tasks || []).length}</span>
                                                        </div>
                                                        <div style={{ background: '#f8f9ff', maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                                            {[
                                                                ...(plannerSjablonenState[0]?.buckets || []).map((b, idx) => ({
                                                                    key: b.naam,
                                                                    label: b.naam,
                                                                    filter: t => t.bucketNaam === b.naam,
                                                                    isAfgerond: false,
                                                                    templateIdx: idx,
                                                                })),
                                                            ].map(groep => {
                                                                const groepTaken = (project.tasks || []).filter(groep.filter);
                                                                const showNieuw = projectTakenNieuwGroep === groep.key;
                                                                if (!groepTaken.length && !showNieuw && groep.key === '__done__') return null;
                                                                const isOpen = projectTakenBucketOpen[groep.key] !== false;
                                                                const isDragBucketOver = paletDragOver?.type === 'bucket' && paletDragOver.bi === groep.templateIdx && paletDrag?.bi !== groep.templateIdx;
                                                                return (
                                                                    <div key={groep.key}
                                                                        draggable={!groep.isAfgerond}
                                                                        onDragStart={e => { if (groep.isAfgerond) return; e.stopPropagation(); setPaletDrag({ type: 'bucket', bi: groep.templateIdx }); }}
                                                                        onDragOver={e => { e.preventDefault(); if (!projTaakDrag && !groep.isAfgerond) setPaletDragOver({ type: 'bucket', bi: groep.templateIdx }); if (projTaakDrag) setProjTaakDragOver({ groepKey: groep.key }); }}
                                                                        onDrop={e => { e.preventDefault(); if (projTaakDrag && projTaakDrag.groepKey !== groep.key) { const newBucket = groep.key === '__done__' ? projTaakDrag.groepKey : groep.key; saveProject({ ...project, tasks: (project.tasks || []).map(t => t.id === projTaakDrag.taakId ? { ...t, bucketNaam: newBucket, completed: groep.key === '__done__' } : t) }); } else if (paletDrag?.type === 'bucket' && groep.templateIdx !== null && paletDrag.bi !== groep.templateIdx) { setPlannerSjablonenState(prev => { const upd = prev.map(s => { if (s.id !== (plannerSjablonenState[0]?.id)) return s; const b = [...s.buckets]; const [m] = b.splice(paletDrag.bi, 1); b.splice(groep.templateIdx, 0, m); return { ...s, buckets: b }; }); localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(upd)); return upd; }); } setPaletDrag(null); setPaletDragOver(null); setProjTaakDrag(null); setProjTaakDragOver(null); }}
                                                                        onDragEnd={() => { setPaletDrag(null); setPaletDragOver(null); setProjTaakDrag(null); setProjTaakDragOver(null); }}
                                                                        style={{ background: projTaakDragOver?.groepKey === groep.key && projTaakDrag ? '#eef2ff' : '#fff', opacity: paletDrag?.type === 'bucket' && paletDrag.bi === groep.templateIdx ? 0.4 : 1, borderTop: isDragBucketOver ? '2px solid #6366f1' : 'none' }}>
                                                                        <div style={{ padding: '5px 10px', fontSize: '0.67rem', fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderBottom: '1px solid #e0e7ff', borderLeft: '3px solid #6366f1', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            {!groep.isAfgerond && <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.5rem', color: '#a5b4fc', cursor: 'grab', flexShrink: 0 }} />}
                                                                            <span onClick={() => setProjectTakenBucketOpen(p => ({ ...p, [groep.key]: !isOpen }))} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.45rem', opacity: 0.5 }} />
                                                                                {groep.label}
                                                                            </span>
                                                                            <span style={{ fontSize: '0.6rem', opacity: 0.6, marginRight: 4 }}>{groepTaken.length}</span>
                                                                            {!groep.isAfgerond && (
                                                                                <button onClick={e => { e.stopPropagation(); setProjectTakenNieuwGroep(groep.key); setProjectTakenBucketOpen(p => ({ ...p, [groep.key]: true })); }}
                                                                                    title="Taak toevoegen"
                                                                                    style={{ width: 16, height: 16, borderRadius: 3, border: 'none', background: '#c7d2fe', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', flexShrink: 0, padding: 0 }}>
                                                                                    <i className="fa-solid fa-plus" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        {isOpen && (
                                                                            <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                                {groepTaken.map(taak => {
                                                                                    const isGeselecteerd = geselecteerdeTaakId === taak.id;
                                                                                    return (
                                                                                    <div key={taak.id}
                                                                                        draggable
                                                                                        onDragStart={e => { e.stopPropagation(); setProjTaakDrag({ groepKey: groep.key, taakId: taak.id }); }}
                                                                                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setProjTaakDragOver({ groepKey: groep.key, taakId: taak.id }); }}
                                                                                        onDrop={e => { e.preventDefault(); e.stopPropagation(); if (projTaakDrag && projTaakDrag.taakId !== taak.id && projTaakDrag.groepKey === groep.key) { const tasks = [...(project.tasks || [])]; const fi = tasks.findIndex(t => t.id === projTaakDrag.taakId); const ti2 = tasks.findIndex(t => t.id === taak.id); if (fi !== -1 && ti2 !== -1) { const [m] = tasks.splice(fi, 1); tasks.splice(ti2, 0, m); saveProject({ ...project, tasks }); } } setProjTaakDrag(null); setProjTaakDragOver(null); }}
                                                                                        onDragEnd={() => { setProjTaakDrag(null); setProjTaakDragOver(null); }}
                                                                                        onClick={() => setGeselecteerdeTaakId(isGeselecteerd ? null : taak.id)}
                                                                                        style={{ padding: '5px 6px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 5, cursor: 'pointer', background: isGeselecteerd ? '#ede9fe' : taak.completed ? '#f0fdf4' : '#fff', border: isGeselecteerd ? '1px solid #a5b4fc' : projTaakDragOver?.taakId === taak.id && projTaakDrag?.taakId !== taak.id ? '1px solid #6366f1' : taak.completed ? '1px solid #bbf7d0' : '1px solid #f1f5f9', marginBottom: 1, opacity: projTaakDrag?.taakId === taak.id ? 0.4 : 1 }}>
                                                                                        <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.45rem', color: taak.completed ? '#86efac' : '#cbd5e1', cursor: 'grab', flexShrink: 0 }} />
                                                                                        <button onClick={() => toggleTask(taak.id)}
                                                                                            style={{ width: 15, height: 15, borderRadius: 3, border: `1.5px solid ${taak.completed ? '#16a34a' : '#cbd5e1'}`, background: taak.completed ? '#16a34a' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                                                                                            {taak.completed && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.35rem' }} />}
                                                                                        </button>
                                                                                        <span style={{ flex: '0 1 140px', minWidth: 0, maxWidth: 140, fontSize: '0.71rem', color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{taak.name}</span>
                                                                                        {/* Indicator-iconen: notitie + labels */}
                                                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                                                                            {taak.memo && <i className="fa-solid fa-note-sticky" title="Heeft een notitie" style={{ fontSize: '0.5rem', color: '#f59e0b', opacity: 0.85 }} />}
                                                                                            {(taak.checklist||[]).length > 0 && <i className="fa-solid fa-list-check" title={`${(taak.checklist||[]).filter(x=>x.done).length}/${(taak.checklist||[]).length} checklist`} style={{ fontSize: '0.5rem', color: '#6366f1', opacity: 0.8 }} />}
                                                                                            {Object.entries(taak.labels||{}).filter(([,v])=>v).map(([k]) => {
                                                                                                const kleur = {category1:'#ef4444',category2:'#f97316',category3:'#eab308',category4:'#22c55e',category5:'#3b82f6',category6:'#a855f7'}[k];
                                                                                                return kleur ? <span key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: kleur, flexShrink: 0 }} /> : null;
                                                                                            })}
                                                                                        </span>
                                                                                        {(() => {
                                                                                            const bezig = projTaakPlannerBezig.has(taak.id);
                                                                                            const gedaan = !!taak.plannerTaskId;
                                                                                            return (
                                                                                                <button onClick={e => { e.stopPropagation(); stuurProjectTaakNaarPlanner(taak); }}
                                                                                                    disabled={bezig || gedaan}
                                                                                                    title={gedaan ? 'Al in Planner' : 'Naar Planner sturen'}
                                                                                                    style={{ width: 18, height: 18, borderRadius: 4, border: gedaan ? '1px solid #86efac' : 'none', background: gedaan ? '#dcfce7' : bezig ? '#6ee7b7' : '#059669', color: gedaan ? '#16a34a' : '#fff', cursor: gedaan || bezig ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', flexShrink: 0, padding: 0, transition: 'background 0.2s' }}>
                                                                                                    <i className={gedaan ? 'fa-solid fa-check' : bezig ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-arrow-up'} />
                                                                                                </button>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                    );
                                                                                })}
                                                                                {showNieuw && (
                                                                                    <input
                                                                                        autoFocus
                                                                                        placeholder="Taaknaam… (Enter om op te slaan)"
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Escape') { setProjectTakenNieuwGroep(null); return; }
                                                                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                                                                const naam = e.target.value.trim();
                                                                                                const nieuweTask = { id: 't' + Date.now(), name: naam, startDate: '', endDate: '', assignedTo: [], completed: false, bucketNaam: groep.key === '__overig__' ? null : groep.key };
                                                                                                saveProject({ ...project, tasks: [...(project.tasks || []), nieuweTask] });
                                                                                                setProjectTakenNieuwGroep(null);
                                                                                            }
                                                                                        }}
                                                                                        onBlur={() => setProjectTakenNieuwGroep(null)}
                                                                                        style={{ fontSize: '0.71rem', border: 'none', borderBottom: '1px solid #6366f1', outline: 'none', width: '100%', padding: '4px 2px', background: 'transparent', color: '#1e293b', marginTop: 2 }}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {!(project.tasks || []).length && (
                                                                <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>Nog geen projecttaken</div>
                                                            )}
                                                            {/* Hoofdgroep toevoegen — zelfde als rechter paneel */}
                                                            {plannerPaletNieuwHoofdgroep === '__left__' ? (
                                                                <div style={{ padding: '6px 10px', background: '#eef2ff', borderLeft: '3px solid #6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <i className="fa-solid fa-folder-plus" style={{ color: '#6366f1', fontSize: '0.55rem' }} />
                                                                    <input
                                                                        autoFocus
                                                                        placeholder="Naam hoofdgroep… (Enter)"
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Escape') { setPlannerPaletNieuwHoofdgroep(null); return; }
                                                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                                                const naam = e.target.value.trim();
                                                                                setPlannerSjablonenState(prev => {
                                                                                    const upd = prev.map((s, si) => si !== 0 ? s : { ...s, buckets: [...s.buckets, { naam, taken: [] }] });
                                                                                    localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(upd));
                                                                                    return upd;
                                                                                });
                                                                                setPlannerPaletNieuwHoofdgroep(null);
                                                                            }
                                                                        }}
                                                                        onBlur={() => setPlannerPaletNieuwHoofdgroep(null)}
                                                                        style={{ flex: 1, fontSize: '0.7rem', border: 'none', borderBottom: '1px solid #6366f1', outline: 'none', background: 'transparent', color: '#1e293b', padding: '1px 2px' }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setPlannerPaletNieuwHoofdgroep('__left__')}
                                                                    style={{ margin: '6px 10px', padding: '4px 8px', borderRadius: 6, border: '1px dashed #c7d2fe', background: 'transparent', color: '#6366f1', fontSize: '0.67rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                                                                    <i className="fa-solid fa-plus" style={{ fontSize: '0.5rem' }} /> Hoofdgroep toevoegen
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* ── Midden: detail of Planner kanban ── */}
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                                                {heeftPlanner ? (<>
                                                {plannerTakenBezig && !plannerTaken && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 24px', color: '#6b7280' }}>
                                                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.2rem', color: '#10b981' }} />
                                                        <span style={{ fontSize: '0.9rem' }}>Planner taken laden…</span>
                                                    </div>
                                                )}
                                                <div style={{ border: '1px solid #c7d2fe', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(99,102,241,0.07)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                                {/* ── Kanban header ── */}
                                                <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-table-columns" style={{ color: '#fff', fontSize: '0.7rem' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', flex: 1 }}>Planner — {project.name}</span>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={async () => {
                                                            setPlannerTakenBezig(true);
                                                            await syncVanPlannerNaarApp();
                                                            setPlannerTakenBezig(false);
                                                        }} disabled={plannerTakenBezig}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 7, fontWeight: 700, fontSize: '0.72rem', border: 'none', cursor: 'pointer' }}>
                                                            <i className={`fa-solid ${plannerTakenBezig ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
                                                            {plannerTakenBezig ? 'Laden…' : 'Vernieuwen'}
                                                        </button>
                                                        <a href={`https://planner.cloud.microsoft/webui/plan/${project.plannerPlanId}`} target="_blank" rel="noopener noreferrer"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 7, fontWeight: 700, fontSize: '0.72rem', textDecoration: 'none' }}>
                                                            <i className="fa-solid fa-arrow-up-right-from-square" /> Volledig scherm
                                                        </a>
                                                        {geselecteerdeTaakId && (
                                                            <button onClick={() => setGeselecteerdeTaakId(null)} title="Terug naar Planner"
                                                                style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0 }}>
                                                                <i className="fa-solid fa-xmark" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Werkblad of Kanban */}
                                                {geselecteerdeTaakId ? (() => {
                                                    const gt = (project.tasks || []).find(t => t.id === geselecteerdeTaakId);
                                                    if (!gt) return null;
                                                    return (
                                                        <div key={gt.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                                                            {/* Sub-header */}
                                                            <div style={{ padding: '10px 14px', background: '#f5f3ff', borderBottom: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                                                <button onClick={() => toggleTask(gt.id)}
                                                                    style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${gt.completed ? '#16a34a' : '#a5b4fc'}`, background: gt.completed ? '#16a34a' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                                                                    {gt.completed && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.4rem' }} />}
                                                                </button>
                                                                <input defaultValue={gt.name}
                                                                    onBlur={e => { if (e.target.value.trim()) saveProject({...project, tasks: (project.tasks||[]).map(t => t.id===gt.id ? {...t, name: e.target.value.trim()} : t)}); }}
                                                                    style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#3730a3', border: 'none', outline: 'none', background: 'transparent', borderBottom: '1px solid #c7d2fe' }} />
                                                                <span style={{ fontSize: '0.65rem', background: '#ede9fe', color: '#6366f1', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>{gt.bucketNaam || '—'}</span>
                                                                {project.plannerPlanId && (() => {
                                                                    const bezig = projTaakPlannerBezig.has(gt.id);
                                                                    const aan = !!gt.plannerTaskId;
                                                                    return (
                                                                        <button
                                                                            disabled={bezig}
                                                                            onClick={() => {
                                                                                if (aan) {
                                                                                    // Uitzetten: taak terugzetten naar Voorgestelde taken
                                                                                    saveProject({...project, tasks: (project.tasks||[]).filter(t => t.id !== gt.id)});
                                                                                    setGeselecteerdeTaakId(null);
                                                                                    setToast('Taak teruggezet naar Voorgestelde taken');
                                                                                    setTimeout(() => setToast(null), 3000);
                                                                                } else {
                                                                                    stuurProjectTaakNaarPlanner(gt);
                                                                                }
                                                                            }}
                                                                            title={aan ? 'Klik om te ontkoppelen van Planner' : 'Taak naar Microsoft Planner sturen'}
                                                                            style={{ padding: '4px 10px', borderRadius: 7, border: `2px solid ${aan ? '#16a34a' : '#e2e8f0'}`, background: aan ? '#dcfce7' : '#f8fafc', color: aan ? '#16a34a' : '#64748b', fontWeight: 700, fontSize: '0.7rem', cursor: bezig ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, transition: 'all 0.2s' }}>
                                                                            <i className={`fa-solid ${bezig ? 'fa-spinner fa-spin' : aan ? 'fa-check' : 'fa-share-from-square'}`} />
                                                                            {bezig ? 'Bezig…' : aan ? 'In Planner' : 'Naar Planner'}
                                                                        </button>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {/* Body */}
                                                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
                                                                {/* Start | Einde | Toegewezen */}
                                                                <div style={{ display: 'flex', gap: 12 }}>
                                                                    {[['startDate','Start','startDateTime'],['endDate','Einde','dueDateTime']].map(([field,label,plannerField]) => (
                                                                        <div key={field} style={{ flex: 1 }}>
                                                                            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6366f1', marginBottom: 3 }}>{label}</div>
                                                                            <input type="date" defaultValue={gt[field]||''} onBlur={e => {
                                                                                const val = e.target.value;
                                                                                const bijgewerkt = {...project, tasks: (project.tasks||[]).map(t => t.id===gt.id ? {...t, [field]: val} : t)};
                                                                                saveProject(bijgewerkt);
                                                                                const taak = bijgewerkt.tasks.find(t => t.id===gt.id);
                                                                                if (val) syncTaakNaarPlanner(taak, { [plannerField]: new Date(val + 'T00:00:00').toISOString() });
                                                                            }}
                                                                                style={{ width: '100%', fontSize: '0.78rem', border: '1px solid #e0e7ff', borderRadius: 6, padding: '4px 7px', boxSizing: 'border-box' }} />
                                                                        </div>
                                                                    ))}
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6366f1', marginBottom: 3 }}>Toegewezen aan</div>
                                                                        <select defaultValue={gt.assignedTo?.[0]||''} onChange={e => {
                                                                            const userId = e.target.value;
                                                                            const bijgewerkt = {...project, tasks: (project.tasks||[]).map(t => t.id===gt.id ? {...t, assignedTo: userId ? [userId] : []} : t)};
                                                                            saveProject(bijgewerkt);
                                                                            const taak = bijgewerkt.tasks.find(t => t.id===gt.id);
                                                                            if (userId && userId.includes('-')) {
                                                                                syncTaakNaarPlanner(taak, { assignments: { [userId]: { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } } });
                                                                            } else if (!userId) {
                                                                                // Remove all assignments — send empty object
                                                                                syncTaakNaarPlanner(taak, { assignments: {} });
                                                                            }
                                                                        }}
                                                                            style={{ width: '100%', fontSize: '0.78rem', border: '1px solid #e0e7ff', borderRadius: 6, padding: '4px 7px' }}>
                                                                            <option value="">— Niet toegewezen —</option>
                                                                            {(teamsLeden||[]).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                {/* Labels */}
                                                                <div>
                                                                    <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6366f1', marginBottom: 6 }}>Labels <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.57rem' }}>(dubbelklik om naam te wijzigen)</span></div>
                                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                        {[
                                                                            {key:'category1',color:'#ef4444'},
                                                                            {key:'category2',color:'#f97316'},
                                                                            {key:'category3',color:'#eab308'},
                                                                            {key:'category4',color:'#22c55e'},
                                                                            {key:'category5',color:'#3b82f6'},
                                                                            {key:'category6',color:'#a855f7'},
                                                                        ].map(cat => {
                                                                            const aan = !!(gt.labels?.[cat.key]);
                                                                            const naam = plannerLabelNamen[cat.key] || cat.key;
                                                                            const isEditing = plannerLabelEditKey === cat.key;
                                                                            if (isEditing) return (
                                                                                <input key={cat.key} autoFocus defaultValue={naam}
                                                                                    onBlur={async e => {
                                                                                        const nieuw = e.target.value.trim() || naam;
                                                                                        setPlannerLabelNamen(prev => ({ ...prev, [cat.key]: nieuw }));
                                                                                        setPlannerLabelEditKey(null);
                                                                                        // Sync naar Planner plan-details
                                                                                        if (project?.plannerPlanId) {
                                                                                            try {
                                                                                                let etag = plannerLabelEtag;
                                                                                                if (!etag) {
                                                                                                    const r0 = await fetch(`/api/teams/planner-plan-details?planId=${project.plannerPlanId}`);
                                                                                                    if (r0.ok) { const d0 = await r0.json(); etag = d0.etag; setPlannerLabelEtag(d0.etag); }
                                                                                                }
                                                                                                if (etag) {
                                                                                                    const patchRes = await fetch('/api/teams/planner-plan-details', {
                                                                                                        method: 'PATCH',
                                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                                        body: JSON.stringify({ planId: project.plannerPlanId, etag, categoryDescriptions: { [cat.key]: nieuw } }),
                                                                                                    });
                                                                                                    // Etag verloopt na PATCH — opnieuw ophalen
                                                                                                    if (patchRes.ok) {
                                                                                                        const r2 = await fetch(`/api/teams/planner-plan-details?planId=${project.plannerPlanId}`);
                                                                                                        if (r2.ok) { const d2 = await r2.json(); setPlannerLabelEtag(d2.etag); }
                                                                                                    }
                                                                                                }
                                                                                            } catch {}
                                                                                        }
                                                                                    }}
                                                                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setPlannerLabelEditKey(null); }}
                                                                                    style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, border: `2px solid ${cat.color}`, outline: 'none', width: 90, color: cat.color }}
                                                                                />
                                                                            );
                                                                            return (
                                                                                <button key={cat.key}
                                                                                    onClick={() => {
                                                                                        const nieuweLabels = {...(gt.labels||{}), [cat.key]: !aan};
                                                                                        const bijgewerkt = {...project, tasks: (project.tasks||[]).map(t => t.id===gt.id ? {...t, labels: nieuweLabels} : t)};
                                                                                        saveProject(bijgewerkt);
                                                                                        const taak = bijgewerkt.tasks.find(t => t.id===gt.id);
                                                                                        const ac = { category1: false, category2: false, category3: false, category4: false, category5: false, category6: false };
                                                                                        Object.entries(nieuweLabels).forEach(([k,v]) => { if (v) ac[k] = true; });
                                                                                        syncTaakNaarPlanner(taak, { appliedCategories: ac });
                                                                                    }}
                                                                                    onDoubleClick={e => { e.stopPropagation(); setPlannerLabelEditKey(cat.key); }}
                                                                                    title="Klik = aan/uit | Dubbelklik = naam wijzigen"
                                                                                    style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', border: `2px solid ${cat.color}`, background: aan ? cat.color : '#fff', color: aan ? '#fff' : cat.color }}>
                                                                                    {naam}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                                {/* Notitie */}
                                                                <div>
                                                                    <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6366f1', marginBottom: 4 }}>Notitie</div>
                                                                    <textarea key={gt.memo||''} defaultValue={gt.memo||''} rows={3} placeholder="Voeg een notitie toe…" onBlur={e => {
                                                                        const val = e.target.value;
                                                                        updateTaskMemo(gt.id, val);
                                                                        syncTaakNaarPlanner(gt, {}, { description: val });
                                                                    }}
                                                                        style={{ width: '100%', fontSize: '0.8rem', border: '1px solid #e0e7ff', borderRadius: 7, padding: '6px 8px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                                </div>
                                                                {/* Checklist */}
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                                        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#6366f1' }}>Checklist</div>
                                                                        {(gt.checklist||[]).length > 0 && <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{(gt.checklist||[]).filter(x=>x.done).length}/{(gt.checklist||[]).length}</span>}
                                                                    </div>
                                                                    {(gt.checklist||[]).map((item,ci) => (
                                                                        <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                                                            <button onClick={() => {
                                                                                const cl=(gt.checklist||[]).map((x,i)=>i===ci?{...x,plannerItemId:x.plannerItemId||crypto.randomUUID(),done:!x.done}:x);
                                                                                const bijgewerkt={...project,tasks:(project.tasks||[]).map(t=>t.id===gt.id?{...t,checklist:cl}:t)};
                                                                                saveProject(bijgewerkt);
                                                                                const taak=bijgewerkt.tasks.find(t=>t.id===gt.id);
                                                                                const plannerCl={}; cl.forEach(x=>{if(x.plannerItemId)plannerCl[x.plannerItemId]={'@odata.type':'#microsoft.graph.plannerChecklistItem',title:x.text,isChecked:x.done,orderHint:' !'};});
                                                                                syncTaakNaarPlanner(taak,{},{checklist:plannerCl});
                                                                            }}
                                                                                style={{ width:16,height:16,borderRadius:3,border:`1.5px solid ${item.done?'#16a34a':'#cbd5e1'}`,background:item.done?'#16a34a':'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0 }}>
                                                                                {item.done && <i className="fa-solid fa-check" style={{color:'#fff',fontSize:'0.4rem'}}/>}
                                                                            </button>
                                                                            <span style={{ flex:1,fontSize:'0.8rem',color:item.done?'#94a3b8':'#1e293b',textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
                                                                            <button onClick={() => {
                                                                                const removedId=item.plannerItemId;
                                                                                const cl=(gt.checklist||[]).filter((_,i)=>i!==ci);
                                                                                const bijgewerkt={...project,tasks:(project.tasks||[]).map(t=>t.id===gt.id?{...t,checklist:cl}:t)};
                                                                                saveProject(bijgewerkt);
                                                                                const taak=bijgewerkt.tasks.find(t=>t.id===gt.id);
                                                                                if(removedId){const plannerCl={[removedId]:null};cl.forEach(x=>{if(x.plannerItemId)plannerCl[x.plannerItemId]={'@odata.type':'#microsoft.graph.plannerChecklistItem',title:x.text,isChecked:x.done,orderHint:' !'};});syncTaakNaarPlanner(taak,{},{checklist:plannerCl});}
                                                                            }}
                                                                                style={{ width:16,height:16,border:'none',background:'transparent',color:'#cbd5e1',cursor:'pointer',fontSize:'0.55rem',padding:0 }}>
                                                                                <i className="fa-solid fa-xmark"/>
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <input placeholder="+ Item toevoegen (Enter)"
                                                                        onKeyDown={e => { if (e.key==='Enter' && e.target.value.trim()) { const newItem={text:e.target.value.trim(),done:false,plannerItemId:crypto.randomUUID()}; const cl=[...(gt.checklist||[]),newItem]; const bijgewerkt={...project,tasks:(project.tasks||[]).map(t=>t.id===gt.id?{...t,checklist:cl}:t)}; saveProject(bijgewerkt); const taak=bijgewerkt.tasks.find(t=>t.id===gt.id); const plannerCl={}; cl.forEach(x=>{if(x.plannerItemId)plannerCl[x.plannerItemId]={'@odata.type':'#microsoft.graph.plannerChecklistItem',title:x.text,isChecked:x.done,orderHint:' !'};});syncTaakNaarPlanner(taak,{},{checklist:plannerCl}); e.target.value=''; }}}
                                                                        style={{ fontSize:'0.78rem',border:'none',borderBottom:'1px solid #e0e7ff',outline:'none',width:'100%',padding:'4px 0',color:'#94a3b8' }} />
                                                                </div>
                                                                {/* Bijlagen */}
                                                                <div>
                                                                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                                                                        <div style={{ fontSize:'0.63rem',fontWeight:700,color:'#6366f1' }}>Bijlagen</div>
                                                                        <label htmlFor={`bijlage-upload-${gt.id}`} style={{ cursor:'pointer',padding:'3px 8px',borderRadius:6,border:'1px solid #e0e7ff',background:'#f5f3ff',color:'#6366f1',fontSize:'0.68rem',fontWeight:600,display:'flex',alignItems:'center',gap:4 }}>
                                                                            <i className="fa-solid fa-paperclip" /> Toevoegen
                                                                            <input id={`bijlage-upload-${gt.id}`} name={`bijlage-upload-${gt.id}`} type="file" multiple style={{ display:'none' }} onChange={e => { if (e.target.files?.length) handleFileUpload(gt.id, e.target.files); e.target.value=''; }} />
                                                                        </label>
                                                                    </div>
                                                                    {/* Drag & drop zone */}
                                                                    <label
                                                                        onDragOver={e => { e.preventDefault(); setBijlageDragOver(true); }}
                                                                        onDragLeave={() => setBijlageDragOver(false)}
                                                                        onDrop={e => { e.preventDefault(); setBijlageDragOver(false); if (e.dataTransfer.files?.length) handleFileUpload(gt.id, e.dataTransfer.files); }}
                                                                        style={{ display:'block',border:`2px dashed ${bijlageDragOver?'#6366f1':'#c7d2fe'}`,borderRadius:8,padding:'10px 0',textAlign:'center',cursor:'pointer',background:bijlageDragOver?'#ede9fe':'#fafafe',marginBottom:8,transition:'all 0.15s' }}>
                                                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color:bijlageDragOver?'#6366f1':'#a5b4fc',fontSize:'1.1rem' }} />
                                                                        <div style={{ fontSize:'0.68rem',color:bijlageDragOver?'#6366f1':'#a5b4fc',marginTop:3 }}>Sleep bestanden hier of klik om te uploaden</div>
                                                                        <input id={`bijlage-drop-${gt.id}`} name={`bijlage-drop-${gt.id}`} type="file" multiple style={{ display:'none' }} onChange={e => { if (e.target.files?.length) handleFileUpload(gt.id, e.target.files); e.target.value=''; }} />
                                                                    </label>
                                                                    {(gt.attachments||[]).length === 0 && (
                                                                        <div style={{ fontSize:'0.72rem',color:'#c7d2fe',textAlign:'center',padding:'2px 0 4px' }}>Geen bijlagen</div>
                                                                    )}
                                                                    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6 }}>
                                                                    {(gt.attachments||[]).map((att,ai) => {
                                                                        const isImg = att.type?.startsWith('image/');
                                                                        const attIcon = isImg ? null : att.type?.includes('pdf') ? {icon:'fa-file-pdf',color:'#ef4444'} : (att.type?.includes('outlook')||att.name?.endsWith('.msg')) ? {icon:'fa-envelope',color:'#3b82f6'} : (att.type==='message/rfc822'||att.name?.endsWith('.eml')) ? {icon:'fa-envelope',color:'#6366f1'} : (att.type?.includes('excel')||att.name?.match(/\.xlsx?$/i)) ? {icon:'fa-file-excel',color:'#16a34a'} : (att.type?.includes('word')||att.name?.match(/\.docx?$/i)) ? {icon:'fa-file-word',color:'#2563eb'} : {icon:'fa-file',color:'#94a3b8'};
                                                                        return (
                                                                        <div key={ai} style={{ borderRadius:8,border:'1px solid #e0e7ff',background:'#fafafe',overflow:'hidden',display:'flex',flexDirection:'column' }}>
                                                                            {/* Thumbnail of icoon */}
                                                                            <div style={{ height:60,background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
                                                                                {isImg ? (
                                                                                    <img src={att.url||att.data} alt={att.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                                                                                ) : (
                                                                                    <i className={`fa-solid ${attIcon.icon}`} style={{ fontSize:'1.6rem',color:attIcon.color }} />
                                                                                )}
                                                                            </div>
                                                                            {/* Naam + acties */}
                                                                            <div style={{ padding:'4px 6px' }}>
                                                                                <div style={{ fontSize:'0.65rem',color:'#334155',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3 }} title={att.name}>{att.name}</div>
                                                                                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                                                                                    {(att.url||att.data) ? (
                                                                                        <a href={att.url||att.data} download={att.name} style={{ color:'#6366f1',fontSize:'0.6rem',textDecoration:'none' }} title="Download">
                                                                                            <i className="fa-solid fa-download" />
                                                                                        </a>
                                                                                    ) : <span />}
                                                                                    <button onClick={() => removeAttachment(gt.id, ai)} style={{ width:14,height:14,border:'none',background:'transparent',color:'#cbd5e1',cursor:'pointer',fontSize:'0.5rem',padding:0 }}>
                                                                                        <i className="fa-solid fa-xmark" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        );
                                                                    })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#c7d2fe', padding: 24 }}>
                                                    <i className="fa-solid fa-hand-pointer" style={{ fontSize: '2rem', color: '#c7d2fe' }} />
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc' }}>Selecteer een taak</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#c7d2fe', textAlign: 'center' }}>Klik op een taak in Projecttaken om het werkblad te openen</div>
                                                </div>
                                                )}
                                                {false && <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginLeft: -2, paddingLeft: 2 }}>
                                                        {/* Bucket kolommen */}
                                                        {(plannerBuckets.length > 0 ? plannerBuckets : [{ id: null, name: 'Taken' }]).map(bucket => {
                                                            const bucketTaken = [...plannerTaken].filter(t => bucket.id ? t.bucketId === bucket.id : true).sort((a, b) => (a.orderHint || '').localeCompare(b.orderHint || ''));
                                                            const [kolInput, setKolInput] = [plannerNieuweTaak, setPlannerNieuweTaak];
                                                            return (
                                                                <div key={bucket.id || 'default'} style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                                                                    {/* Kolom header */}
                                                                    <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bucket.name}</span>
                                                                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: '#e2e8f0', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>{bucketTaken.length}</span>
                                                                        {bucket.id && (
                                                                            <button onClick={() => { const el = document.getElementById(`planner-input-${bucket.id}`); if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }} style={{ width: 18, height: 18, border: 'none', background: '#059669', color: '#fff', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', flexShrink: 0 }} title="Taak toevoegen">
                                                                                <i className="fa-solid fa-plus" />
                                                                            </button>
                                                                        )}
                                                                        {bucket.id && (
                                                                            <button onClick={async () => {
                                                                                if (!window.confirm(`Bucket "${bucket.name}" verwijderen?`)) return;
                                                                                const etag = bucket['@odata.etag'];
                                                                                if (!etag) return;
                                                                                const r = await fetch('/api/teams/planner-buckets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bucketId: bucket.id, etag }) });
                                                                                if (r.ok) { setPlannerBuckets(prev => prev.filter(b => b.id !== bucket.id)); setPlannerTaken(prev => prev.filter(t => t.bucketId !== bucket.id)); }
                                                                            }} style={{ width: 18, height: 18, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', flexShrink: 0 }} title="Bucket verwijderen">
                                                                                <i className="fa-solid fa-trash" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {/* Taakkaarten */}
                                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px 8px', minHeight: 40 }}>
                                                                        {bucketTaken.map(taak => {
                                                                            const gedaan = taak.percentComplete === 100;
                                                                            return (
                                                                                <div key={taak.id} style={{ background: '#fff', borderRadius: 7, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: gedaan ? '1px solid #bbf7d0' : '1px solid transparent' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                                                        <button onClick={async () => {
                                                                                            const etag = taak['@odata.etag'];
                                                                                            if (!etag) return;
                                                                                            const nieuweWaarde = gedaan ? 0 : 100;
                                                                                            setPlannerTaken(prev => prev.map(t => t.id === taak.id ? { ...t, percentComplete: nieuweWaarde } : t));
                                                                                            await fetch('/api/teams/planner-taken', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, percentComplete: nieuweWaarde, etag }) });
                                                                                        }} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${gedaan ? '#16a34a' : '#94a3b8'}`, background: gedaan ? '#16a34a' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, marginTop: 1 }}>
                                                                                            {gedaan && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.45rem' }} />}
                                                                                        </button>
                                                                                        <span style={{ flex: 1, fontSize: '0.78rem', color: gedaan ? '#94a3b8' : '#1e293b', textDecoration: gedaan ? 'line-through' : 'none', lineHeight: 1.4, wordBreak: 'break-word' }}>{taak.title}</span>
                                                                                        <button onClick={async () => {
                                                                                            const etag = taak['@odata.etag'];
                                                                                            if (!etag || !window.confirm(`"${taak.title}" verwijderen?`)) return;
                                                                                            const r = await fetch('/api/teams/planner-taken', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, etag }) });
                                                                                            if (r.ok) setPlannerTaken(prev => prev.filter(t => t.id !== taak.id));
                                                                                        }} style={{ width: 18, height: 18, border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', flexShrink: 0, padding: 0, borderRadius: 4 }} title="Verwijderen uit Planner">
                                                                                            <i className="fa-solid fa-arrow-down" />
                                                                                        </button>
                                                                                    </div>
                                                                                    {/* Labels */}
                                                                                    {(() => {
                                                                                        const LABEL_KLEUREN = { category1: '#ef4444', category2: '#f97316', category3: '#eab308', category4: '#22c55e', category5: '#3b82f6', category6: '#8b5cf6' };
                                                                                        const actief = Object.entries(taak.appliedCategories || {}).filter(([, v]) => v).map(([k]) => k);
                                                                                        if (actief.length === 0) return null;
                                                                                        return <div style={{ display: 'flex', gap: 4, paddingLeft: 26, marginTop: 5, flexWrap: 'wrap' }}>{actief.map(cat => <span key={cat} style={{ width: 28, height: 8, borderRadius: 4, background: LABEL_KLEUREN[cat] || '#94a3b8' }} title={cat} />)}</div>;
                                                                                    })()}
                                                                                    {/* Datums */}
                                                                                    {(taak.startDateTime || taak.dueDateTime) && (
                                                                                        <div style={{ display: 'flex', gap: 6, paddingLeft: 26, marginTop: 4, fontSize: '0.62rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                                                                                            {taak.startDateTime && <span><i className="fa-regular fa-calendar" style={{ marginRight: 3 }} />{new Date(taak.startDateTime).toLocaleDateString('nl-NL')}</span>}
                                                                                            {taak.startDateTime && taak.dueDateTime && <span>→</span>}
                                                                                            {taak.dueDateTime && <span style={{ color: new Date(taak.dueDateTime) < new Date() && !gedaan ? '#ef4444' : '#94a3b8' }}><i className="fa-regular fa-calendar-check" style={{ marginRight: 3 }} />{new Date(taak.dueDateTime).toLocaleDateString('nl-NL')}</span>}
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Gecombineerde toewijzknop + Planner knop */}
                                                                                    <div style={{ display: 'flex', gap: 4, paddingLeft: 26, marginTop: 5, alignItems: 'center', position: 'relative' }}>
                                                                                        <a href={`https://tasks.office.com/cd3d3914-6711-4801-9d09-f83f5a0645d3/Home/Task/${taak.id}`}
                                                                                           target="_blank" rel="noreferrer"
                                                                                           onClick={e => e.stopPropagation()}
                                                                                           style={{ width: 22, height: 22, borderRadius: 4, background: '#059669', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, flexShrink: 0, padding: '0 4px', textDecoration: 'none' }}
                                                                                           title="Openen in Microsoft Planner">
                                                                                            <i className="fa-solid fa-table-columns" style={{ fontSize: '0.55rem' }} />
                                                                                        </a>
                                                                                        {(() => {
                                                                                            const uids = Object.keys(taak.assignments || {});
                                                                                            const leden = uids.map(uid => teamsLeden.find(l => l.id === uid)).filter(l => l?.name);
                                                                                            const eerste = leden[0];
                                                                                            const extra = leden.length - 1;
                                                                                            const initials = eerste ? eerste.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : null;
                                                                                            const isAssigned = !!eerste;
                                                                                            const tooltip = leden.map(l => l.name).join(', ') || 'Toewijzen';
                                                                                            return (
                                                                                                <div style={{ position: 'relative' }}>
                                                                                                    <button onClick={e => { e.stopPropagation(); setPlannerKaartOpen(prev => ({ ...prev, [taak.id + '__assign']: !prev[taak.id + '__assign'] })); }}
                                                                                                        title={tooltip}
                                                                                                        style={{ height: 22, minWidth: 22, borderRadius: 11, border: isAssigned ? 'none' : '1.5px dashed #cbd5e1', background: isAssigned ? '#3b82f6' : 'transparent', color: isAssigned ? '#fff' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: '0.5rem', fontWeight: 700, padding: isAssigned ? '0 6px' : 0 }}>
                                                                                                        {isAssigned ? (
                                                                                                            <>
                                                                                                                <span style={{ fontSize: '0.5rem', fontWeight: 700 }}>{initials}</span>
                                                                                                                {extra > 0 && <span style={{ fontSize: '0.45rem', opacity: 0.85 }}>+{extra}</span>}
                                                                                                            </>
                                                                                                        ) : (
                                                                                                            <i className="fa-solid fa-user-plus" style={{ fontSize: '0.55rem' }} />
                                                                                                        )}
                                                                                                    </button>
                                                                                            {plannerKaartOpen[taak.id + '__assign'] && (
                                                                                                <div style={{ position: 'absolute', top: 26, left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, minWidth: 170, padding: 4 }} onClick={e => e.stopPropagation()}>
                                                                                                    <div onClick={async () => {
                                                                                                        setPlannerKaartOpen(prev => ({ ...prev, [taak.id + '__assign']: false }));
                                                                                                        const nieuweAssignments = {};
                                                                                                        setPlannerTaken(prev => prev.map(t => t.id === taak.id ? { ...t, assignments: nieuweAssignments } : t));
                                                                                                        await fetch('/api/teams/planner-taken', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, assignments: nieuweAssignments, etag: taak['@odata.etag'] }) });
                                                                                                    }} style={{ padding: '5px 10px', fontSize: '0.68rem', color: '#64748b', cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                                        <i className="fa-solid fa-xmark" style={{ fontSize: '0.6rem' }} /> Niemand
                                                                                                    </div>
                                                                                                    {teamsLeden.map(u => {
                                                                                                        const toegewezen = !!(taak.assignments || {})[u.id];
                                                                                                        return (
                                                                                                            <div key={u.id} onClick={async () => {
                                                                                                                setPlannerKaartOpen(prev => ({ ...prev, [taak.id + '__assign']: false }));
                                                                                                                const huidige = { ...(taak.assignments || {}) };
                                                                                                                if (toegewezen) { delete huidige[u.id]; } else { huidige[u.id] = { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' }; }
                                                                                                                setPlannerTaken(prev => prev.map(t => t.id === taak.id ? { ...t, assignments: huidige } : t));
                                                                                                                await fetch('/api/teams/planner-taken', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, assignments: huidige, etag: taak['@odata.etag'] }) });
                                                                                                            }} style={{ padding: '5px 10px', fontSize: '0.68rem', color: toegewezen ? '#059669' : '#1e293b', fontWeight: toegewezen ? 700 : 400, cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.38rem', fontWeight: 700, flexShrink: 0 }}>
                                                                                                                    {u.name ? u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                                                                                                </span>
                                                                                                                {u.name}
                                                                                                                {toegewezen && <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: '0.55rem' }} />}
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                    {/* Details uitklappen */}
                                                                                    <div style={{ paddingLeft: 26, marginTop: 4 }}>
                                                                                        <button onClick={async () => {
                                                                                            const isOpen = plannerKaartOpen[taak.id];
                                                                                            setPlannerKaartOpen(prev => ({ ...prev, [taak.id]: !isOpen }));
                                                                                            if (!isOpen && !plannerDetails[taak.id]) {
                                                                                                setPlannerDetails(prev => ({ ...prev, [taak.id]: { laden: true } }));
                                                                                                const r = await fetch(`/api/teams/planner-taak-details?taskId=${taak.id}`);
                                                                                                if (r.ok) {
                                                                                                    const d = await r.json();
                                                                                                    const checklistItems = d.checklist ? Object.values(d.checklist).sort((a, b) => (a.orderHint || '').localeCompare(b.orderHint || '')) : [];
                                                                                                    const refs = d.references ? Object.entries(d.references).map(([url, v]) => ({ url: decodeURIComponent(url.replace(/%3A/g, ':').replace(/%2E/g, '.')), alias: v.alias || url })) : [];
                                                                                                    setPlannerDetails(prev => ({ ...prev, [taak.id]: { description: d.description || '', checklist: checklistItems, references: refs, etag: d['@odata.etag'], laden: false } }));
                                                                                                } else {
                                                                                                    setPlannerDetails(prev => ({ ...prev, [taak.id]: { description: '', checklist: [], references: [], etag: null, laden: false } }));
                                                                                                }
                                                                                            }
                                                                                        }} style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                            <i className={`fa-solid fa-chevron-${plannerKaartOpen[taak.id] ? 'up' : 'down'}`} style={{ fontSize: '0.5rem' }} />
                                                                                            Details
                                                                                        </button>
                                                                                        {plannerKaartOpen[taak.id] && (
                                                                                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                                                {plannerDetails[taak.id]?.laden ? (
                                                                                                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.65rem', color: '#94a3b8' }} />
                                                                                                ) : (<>
                                                                                                    {/* Rij 1: Labels + datums naast elkaar */}
                                                                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                                                                        {/* Labels */}
                                                                                                        <div style={{ display: 'flex', gap: 3 }}>
                                                                                                            {[{ key: 'category1', k: '#ef4444', n: 'Rood' }, { key: 'category2', k: '#f97316', n: 'Oranje' }, { key: 'category3', k: '#eab308', n: 'Geel' }, { key: 'category4', k: '#22c55e', n: 'Groen' }, { key: 'category5', k: '#3b82f6', n: 'Blauw' }, { key: 'category6', k: '#8b5cf6', n: 'Paars' }].map(lb => {
                                                                                                                const aan = !!(taak.appliedCategories || {})[lb.key];
                                                                                                                return <button key={lb.key} title={lb.n} onClick={async () => { const nieuw = { ...(taak.appliedCategories || {}), [lb.key]: !aan }; setPlannerTaken(prev => prev.map(t => t.id === taak.id ? { ...t, appliedCategories: nieuw } : t)); await fetch('/api/teams/planner-taken', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, appliedCategories: nieuw, etag: taak['@odata.etag'] }) }); }} style={{ width: 18, height: 10, borderRadius: 3, border: aan ? '1.5px solid #1e293b' : '1.5px solid transparent', background: lb.k, cursor: 'pointer', opacity: aan ? 1 : 0.35, padding: 0, flexShrink: 0 }} />;
                                                                                                            })}
                                                                                                        </div>
                                                                                                        {/* Startdatum */}
                                                                                                        <div style={{ flex: 1, minWidth: 80 }}>
                                                                                                            <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginBottom: 1 }}>Van</div>
                                                                                                            <input type="date" defaultValue={taak.startDateTime ? taak.startDateTime.split('T')[0] : ''} onChange={async e => { const val = e.target.value || null; setPlannerTaken(prev => prev.map(t => t.id === taak.id ? { ...t, startDateTime: val ? new Date(val).toISOString() : null } : t)); await fetch('/api/teams/planner-taken', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, startDateTime: val ? new Date(val).toISOString() : null, etag: taak['@odata.etag'] }) }); }} style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.62rem', width: '100%', boxSizing: 'border-box' }} />
                                                                                                        </div>
                                                                                                        {/* Vervaldatum */}
                                                                                                        <div style={{ flex: 1, minWidth: 80 }}>
                                                                                                            <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginBottom: 1 }}>Tot</div>
                                                                                                            <input type="date" defaultValue={taak.dueDateTime ? taak.dueDateTime.split('T')[0] : ''} onChange={async e => { const val = e.target.value || null; setPlannerTaken(prev => prev.map(t => t.id === taak.id ? { ...t, dueDateTime: val ? new Date(val).toISOString() : null } : t)); await fetch('/api/teams/planner-taken', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, dueDateTime: val ? new Date(val).toISOString() : null, etag: taak['@odata.etag'] }) }); }} style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.62rem', width: '100%', boxSizing: 'border-box' }} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {/* Controlelijst */}
                                                                                                    <div>
                                                                                                        {(plannerDetails[taak.id]?.checklist || []).map((item, ci) => (
                                                                                                            <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                                                                                                <input type="checkbox" defaultChecked={item.isChecked} onChange={async e => {
                                                                                                                    const details = plannerDetails[taak.id]; if (!details?.etag) return;
                                                                                                                    const newChecklist = Object.fromEntries(details.checklist.map((it, idx) => [String(idx), { '@odata.type': '#microsoft.graph.plannerChecklistItem', title: it.title, isChecked: idx === ci ? e.target.checked : it.isChecked, orderHint: it.orderHint || ' !' }]));
                                                                                                                    const pr = await fetch('/api/teams/planner-taak-details', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, checklist: newChecklist, etag: details.etag }) });
                                                                                                                    if (pr.ok) setPlannerDetails(prev => ({ ...prev, [taak.id]: { ...prev[taak.id], checklist: prev[taak.id].checklist.map((it, idx) => idx === ci ? { ...it, isChecked: e.target.checked } : it) } }));
                                                                                                                }} style={{ width: 12, height: 12, cursor: 'pointer', flexShrink: 0, accentColor: '#059669' }} />
                                                                                                                <span style={{ fontSize: '0.66rem', color: item.isChecked ? '#94a3b8' : '#334155', textDecoration: item.isChecked ? 'line-through' : 'none' }}>{item.title}</span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                                                                                                            <input id={`cl-input-${taak.id}`} placeholder="+ Controlelijst item" style={{ flex: 1, padding: '2px 5px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.66rem', minWidth: 0 }}
                                                                                                                onKeyDown={async e => {
                                                                                                                    if (e.key !== 'Enter') return;
                                                                                                                    const titel = e.target.value.trim(); if (!titel) return;
                                                                                                                    const details = plannerDetails[taak.id]; if (!details?.etag) return;
                                                                                                                    const huidig = details.checklist || [];
                                                                                                                    const nc = Object.fromEntries([...huidig, { title: titel, isChecked: false }].map((it, idx) => [String(idx), { '@odata.type': '#microsoft.graph.plannerChecklistItem', title: it.title, isChecked: it.isChecked, orderHint: it.orderHint || ' !' }]));
                                                                                                                    const pr = await fetch('/api/teams/planner-taak-details', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, checklist: nc, etag: details.etag }) });
                                                                                                                    if (pr.ok) { e.target.value = ''; setPlannerDetails(prev => ({ ...prev, [taak.id]: { ...prev[taak.id], checklist: [...huidig, { title: titel, isChecked: false }] } })); }
                                                                                                                }} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {/* Bijlagen */}
                                                                                                    <div>
                                                                                                        {(plannerDetails[taak.id]?.references || []).map((ref, ri) => (
                                                                                                            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                                                                                <i className="fa-solid fa-paperclip" style={{ fontSize: '0.55rem', color: '#94a3b8', flexShrink: 0 }} />
                                                                                                                <a href={ref.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.66rem', color: '#3b82f6', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ref.alias}</a>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <div onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                                                                                            onDragLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                                                                            onDrop={async e => {
                                                                                                                e.preventDefault(); e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0';
                                                                                                                const files = Array.from(e.dataTransfer.files);
                                                                                                                if (!files.length || !teamsTeamId) return;
                                                                                                                for (const file of files) {
                                                                                                                    const reader = new FileReader();
                                                                                                                    reader.onload = async ev => {
                                                                                                                        const base64 = ev.target.result.split(',')[1];
                                                                                                                        const uploadRes = await fetch('/api/teams/upload-bijlage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: teamsTeamId, filename: file.name, contentBase64: base64, mimeType: file.type }) });
                                                                                                                        if (!uploadRes.ok) return;
                                                                                                                        const { webUrl } = await uploadRes.json(); if (!webUrl) return;
                                                                                                                        const details = plannerDetails[taak.id]; if (!details?.etag) return;
                                                                                                                        const encodedUrl = webUrl.replace(/:/g, '%3A').replace(/\./g, '%2E');
                                                                                                                        const newRefs = { ...(Object.fromEntries((details.references || []).map(r => [r.url.replace(/:/g, '%3A').replace(/\./g, '%2E'), { '@odata.type': '#microsoft.graph.plannerExternalReference', alias: r.alias, type: 'Other', previewPriority: ' !' }]))), [encodedUrl]: { '@odata.type': '#microsoft.graph.plannerExternalReference', alias: file.name, type: 'Other', previewPriority: ' !' } };
                                                                                                                        const pr = await fetch('/api/teams/planner-taak-details', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, references: newRefs, etag: details.etag }) });
                                                                                                                        if (pr.ok) setPlannerDetails(prev => ({ ...prev, [taak.id]: { ...prev[taak.id], references: [...(prev[taak.id].references || []), { url: webUrl, alias: file.name }] } }));
                                                                                                                    };
                                                                                                                    reader.readAsDataURL(file);
                                                                                                                }
                                                                                                            }}
                                                                                                            style={{ border: '1px dashed #e2e8f0', borderRadius: 5, padding: '4px 6px', fontSize: '0.6rem', color: '#94a3b8', cursor: 'default', transition: 'all 0.15s', marginTop: 3 }}>
                                                                                                            <i className="fa-solid fa-paperclip" style={{ marginRight: 4 }} />Bijlage slepen
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {/* Notitie */}
                                                                                                    <textarea defaultValue={plannerDetails[taak.id]?.description || ''} placeholder="Notitie…" rows={2}
                                                                                                        onBlur={async e => {
                                                                                                            const details = plannerDetails[taak.id]; if (!details?.etag) return;
                                                                                                            const nieuweText = e.target.value; if (nieuweText === details.description) return;
                                                                                                            const r = await fetch('/api/teams/planner-taak-details', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: taak.id, description: nieuweText, etag: details.etag }) });
                                                                                                            if (r.ok) setPlannerDetails(prev => ({ ...prev, [taak.id]: { ...prev[taak.id], description: nieuweText } }));
                                                                                                        }}
                                                                                                        style={{ width: '100%', padding: '4px 6px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: '0.66rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4, boxSizing: 'border-box', color: '#334155' }} />
                                                                                                </>)}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {/* Taak toevoegen aan deze bucket */}
                                                                    {bucket.id && (() => {
                                                                        const inputId = `planner-input-${bucket.id}`;
                                                                        const toegewezenUid = plannerNieuweTaakUser[bucket.id] || null;
                                                                        const toegewezenLid = toegewezenUid ? teamsLeden.find(l => l.id === toegewezenUid) : null;
                                                                        const initials = toegewezenLid?.displayName ? toegewezenLid.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : null;
                                                                        const voegToe = async () => {
                                                                            const el = document.getElementById(inputId);
                                                                            const titel = el?.value.trim();
                                                                            if (!titel) return;
                                                                            el.value = '';
                                                                            const body = { planId: project.plannerPlanId, title: titel, bucketId: bucket.id };
                                                                            if (toegewezenUid) body.assignments = { [toegewezenUid]: { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' } };
                                                                            const r = await fetch('/api/teams/planner-taken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                                                                            if (r.ok) { const nieuw = await r.json(); setPlannerTaken(prev => [...(prev || []), nieuw]); }
                                                                        };
                                                                        return (
                                                                            <div style={{ padding: '0 8px 10px' }}>
                                                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                                                    <input id={inputId} placeholder="Taak toevoegen…" onKeyDown={e => e.key === 'Enter' && voegToe()} style={{ flex: 1, padding: '5px 7px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.7rem', background: '#fff', minWidth: 0 }} />
                                                                                    {/* Toewijzen */}
                                                                                    <div style={{ position: 'relative' }}>
                                                                                        <button onClick={() => setPlannerNieuweTaakUser(prev => ({ ...prev, [bucket.id + '__open']: !prev[bucket.id + '__open'] }))}
                                                                                            title={toegewezenLid?.displayName || 'Toewijzen'}
                                                                                            style={{ width: 24, height: 24, borderRadius: '50%', border: toegewezenLid ? 'none' : '1.5px dashed #cbd5e1', background: toegewezenLid ? '#3b82f6' : 'transparent', color: toegewezenLid ? '#fff' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: toegewezenLid ? '0.45rem' : '0.6rem', fontWeight: 700, padding: 0, flexShrink: 0 }}>
                                                                                            {toegewezenLid ? initials : <i className="fa-solid fa-user-plus" />}
                                                                                        </button>
                                                                                        {plannerNieuweTaakUser[bucket.id + '__open'] && (
                                                                                            <div style={{ position: 'absolute', bottom: 28, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 160, padding: 4 }}>
                                                                                                <div onClick={() => setPlannerNieuweTaakUser(prev => ({ ...prev, [bucket.id]: null, [bucket.id + '__open']: false }))}
                                                                                                    style={{ padding: '5px 10px', fontSize: '0.68rem', color: '#64748b', cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                                    <i className="fa-solid fa-xmark" style={{ fontSize: '0.6rem' }} /> Niemand
                                                                                                </div>
                                                                                                {teamsLeden.map(u => (
                                                                                                    <div key={u.id} onClick={() => setPlannerNieuweTaakUser(prev => ({ ...prev, [bucket.id]: u.id, [bucket.id + '__open']: false }))}
                                                                                                        style={{ padding: '5px 10px', fontSize: '0.68rem', color: toegewezenUid === u.id ? '#059669' : '#1e293b', fontWeight: toegewezenUid === u.id ? 700 : 400, cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.38rem', fontWeight: 700, flexShrink: 0 }}>
                                                                                                            {u.name ? u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                                                                                        </span>
                                                                                                        {u.name}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <button onClick={voegToe} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', flexShrink: 0 }}><i className="fa-solid fa-plus" /></button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            );
                                                        })}
                                                        {/* Nieuwe bucket kolom */}
                                                        <div style={{ width: 200, flexShrink: 0, background: '#f8fafc', borderRadius: 10, border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 }}>
                                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Nieuwe bucket</span>
                                                            <input id="nieuweBucketInput" placeholder="Naam…" onKeyDown={async e => {
                                                                if (e.key !== 'Enter' || !e.target.value.trim()) return;
                                                                const naam = e.target.value.trim(); e.target.value = '';
                                                                const r = await fetch('/api/teams/planner-buckets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: project.plannerPlanId, name: naam }) });
                                                                if (r.ok) { const b = await r.json(); setPlannerBuckets(prev => [...prev, b]); }
                                                            }} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.75rem', textAlign: 'center' }} />
                                                            <button onClick={async () => {
                                                                const input = document.getElementById('nieuweBucketInput');
                                                                if (!input?.value.trim()) return;
                                                                const naam = input.value.trim(); input.value = '';
                                                                const r = await fetch('/api/teams/planner-buckets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: project.plannerPlanId, name: naam }) });
                                                                if (r.ok) { const b = await r.json(); setPlannerBuckets(prev => [...prev, b]); }
                                                            }} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                                                <i className="fa-solid fa-plus" /> Aanmaken
                                                            </button>
                                                        </div>
                                                    </div>
                                                }
                                                </div>{/* einde kanban card */}
                                                </>) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    {/* Toggle: Nieuw | Bestaand */}
                                                    <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                                                        {[
                                                            { id: 'nieuw', label: 'Nieuw aanmaken', icon: 'fa-plus' },
                                                            { id: 'bestaand', label: 'Bestaande koppelen', icon: 'fa-link' },
                                                        ].map(m => (
                                                            <button key={m.id} onClick={() => setPlannerKoppelModus(m.id)}
                                                                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s',
                                                                    background: plannerKoppelModus === m.id ? '#fff' : 'transparent',
                                                                    color: plannerKoppelModus === m.id ? '#059669' : '#64748b',
                                                                    boxShadow: plannerKoppelModus === m.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                                                }}>
                                                                <i className={`fa-solid ${m.icon}`} style={{ fontSize: '0.6rem' }} />
                                                                {m.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {plannerKoppelModus === 'nieuw' ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Kies een sjabloon</span>
                                                            <button onClick={() => setSjabloonEditor(JSON.parse(JSON.stringify(plannerSjablonenState)))} style={{ fontSize: '0.65rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Sjablonen bewerken</button>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {plannerSjablonenState.map(s => (
                                                                <div key={s.id} onClick={() => setPlannerSjabloon(s.id)} style={{ padding: '10px 12px', borderRadius: 8, border: `2px solid ${plannerSjabloon === s.id ? '#059669' : '#e2e8f0'}`, background: plannerSjabloon === s.id ? '#f0fdf4' : '#fff', cursor: 'pointer', transition: 'all 0.1s' }}>
                                                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: plannerSjabloon === s.id ? '#065f46' : '#1e293b', marginBottom: 4 }}>{s.naam}</div>
                                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                                        {s.buckets.map(b => (
                                                                            <span key={b.naam} style={{ fontSize: '0.62rem', background: plannerSjabloon === s.id ? '#dcfce7' : '#f1f5f9', color: plannerSjabloon === s.id ? '#065f46' : '#64748b', padding: '1px 6px', borderRadius: 6 }}>{b.naam}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => setSjabloonEditor([...plannerSjablonenState, { id: 'nieuw-' + Date.now(), naam: 'Nieuw sjabloon', buckets: [{ naam: 'Nieuwe taak', taken: [] }] }])} style={{ padding: '6px 12px', borderRadius: 7, border: '2px dashed #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left' }}>
                                                                <i className="fa-solid fa-plus" /> Nieuw sjabloon toevoegen
                                                            </button>
                                                        </div>
                                                        <button onClick={maakPlannerAan} disabled={teamsBezig}
                                                            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: teamsBezig ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, width: 'fit-content', marginTop: 4 }}>
                                                            <i className={`fa-solid ${teamsBezig ? 'fa-spinner fa-spin' : 'fa-table-columns'}`} />
                                                            {teamsBezig ? 'Aanmaken…' : 'Planner aanmaken'}
                                                        </button>
                                                    </div>
                                                    ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Kies een bestaand Planner-plan uit jouw team om aan dit project te koppelen.</div>
                                                        {!plannerBestaandeLijst && (
                                                            <button onClick={laadBestaandePlannen} disabled={plannerBestaandBezig}
                                                                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
                                                                <i className={`fa-solid ${plannerBestaandBezig ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
                                                                {plannerBestaandBezig ? 'Laden…' : 'Plannen ophalen'}
                                                            </button>
                                                        )}
                                                        {plannerBestaandeLijst && plannerBestaandeLijst.length === 0 && (
                                                            <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>Geen Planner-plannen gevonden in dit team.</div>
                                                        )}
                                                        {plannerBestaandeLijst && plannerBestaandeLijst.length > 0 && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                {plannerBestaandeLijst.map(p => (
                                                                    <div key={p.id} onClick={() => setPlannerBestaandGeselecteerd(p.id)}
                                                                        style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${plannerBestaandGeselecteerd === p.id ? '#059669' : '#e2e8f0'}`, background: plannerBestaandGeselecteerd === p.id ? '#f0fdf4' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.1s' }}>
                                                                        <div style={{ width: 28, height: 28, borderRadius: 7, background: plannerBestaandGeselecteerd === p.id ? '#059669' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="fa-solid fa-list-check" style={{ fontSize: '0.65rem', color: plannerBestaandGeselecteerd === p.id ? '#fff' : '#64748b' }} />
                                                                        </div>
                                                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: plannerBestaandGeselecteerd === p.id ? '#065f46' : '#1e293b' }}>{p.title}</span>
                                                                        {plannerBestaandGeselecteerd === p.id && <i className="fa-solid fa-circle-check" style={{ marginLeft: 'auto', color: '#059669', fontSize: '0.85rem' }} />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {plannerBestaandeLijst && (
                                                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                                <button onClick={koppelenBestaandePlanner} disabled={!plannerBestaandGeselecteerd}
                                                                    style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: plannerBestaandGeselecteerd ? '#059669' : '#e2e8f0', color: plannerBestaandGeselecteerd ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: plannerBestaandGeselecteerd ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 10, width: 'fit-content', transition: 'all 0.15s' }}>
                                                                    <i className="fa-solid fa-link" />
                                                                    Koppelen
                                                                </button>
                                                                <button onClick={() => { setPlannerBestaandeLijst(null); setPlannerBestaandGeselecteerd(null); }}
                                                                    style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                                                    <i className="fa-solid fa-rotate" /> Opnieuw laden
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    )}
                                                </div>
                                                )}
                                                </div>{/* einde Planner flex-child */}
                                                <div style={{ width: 370, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {/* ── Checklist palet (alle sjablonen) ── */}
                                                {(() => {
                                                    if (!plannerSjablonenState.length) return null;
                                                    return (
                                                        <div style={{ border: '1px solid #c7d2fe', borderRadius: 10, overflow: 'hidden', marginBottom: 8, boxShadow: '0 1px 4px rgba(99,102,241,0.07)' }}>
                                                            {/* Header */}
                                                            <div style={{ padding: '9px 12px', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <i className="fa-solid fa-list-check" style={{ color: '#fff', fontSize: '0.7rem' }} />
                                                                </div>
                                                                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', flexShrink: 0, letterSpacing: '0.01em' }}>Voorgestelde taken</span>
                                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '3px 8px', marginLeft: 4 }}>
                                                                    <i className="fa-solid fa-magnifying-glass" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.55rem', flexShrink: 0 }} />
                                                                    <input value={paletZoek} onChange={e => setPaletZoek(e.target.value)} placeholder="Zoek..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.68rem', fontWeight: 500, minWidth: 0 }} />
                                                                    {paletZoek && <button onClick={() => setPaletZoek('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, fontSize: '0.58rem', lineHeight: 1, flexShrink: 0 }}>&times;</button>}
                                                                </div>
                                                            </div>
                                                            {/* Verticale lijst — alle sjablonen */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#f8f9ff', maxHeight: 520, overflowY: 'auto' }}>
                                                                    {plannerSjablonenState.map((sjabloon, si) => (
                                                                        <div key={sjabloon.id}>
                                                                            {sjabloon.buckets.map((bucket, bi) => {
                                                                                const bucketKey = sjabloon.id + '|' + bucket.naam;
                                                                                const bucketOpen = plannerPaletBucketOpen[bucketKey] !== false; // standaard open
                                                                                const heeftZoekMatch = !paletZoek || bucket.taken.some(t => t.toLowerCase().includes(paletZoek.toLowerCase()));
                                                                                if (!heeftZoekMatch) return null;
                                                                                return (
                                                                        <div key={bi}
                                                                            draggable
                                                                            onDragStart={e => { e.stopPropagation(); setPaletDrag({ type: 'bucket', bi }); }}
                                                                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setPaletDragOver({ type: 'bucket', bi }); }}
                                                                            onDrop={e => { e.preventDefault(); e.stopPropagation(); if (paletDrag?.type === 'bucket' && paletDrag.bi !== bi) { setPlannerSjablonenState(prev => { const upd = prev.map(s => { if (s.id !== sjabloon.id) return s; const b = [...s.buckets]; const [m] = b.splice(paletDrag.bi, 1); b.splice(bi, 0, m); return { ...s, buckets: b }; }); localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(upd)); return upd; }); } setPaletDrag(null); setPaletDragOver(null); }}
                                                                            onDragEnd={() => { setPaletDrag(null); setPaletDragOver(null); }}
                                                                            style={{ background: '#fff', opacity: paletDrag?.type === 'bucket' && paletDrag.bi === bi ? 0.4 : 1, borderTop: paletDragOver?.type === 'bucket' && paletDragOver.bi === bi && paletDrag?.bi !== bi ? '2px solid #6366f1' : 'none' }}>
                                                                            <div style={{ padding: '5px 10px', fontSize: '0.67rem', fontWeight: 700, color: '#6366f1', background: '#eef2ff', borderBottom: '1px solid #e0e7ff', borderLeft: '3px solid #6366f1', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.5rem', color: '#a5b4fc', cursor: 'grab', flexShrink: 0 }} />
                                                                                <span onClick={() => setPlannerPaletBucketOpen(p => ({ ...p, [bucketKey]: !bucketOpen }))} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                                    <i className={`fa-solid fa-chevron-${bucketOpen ? 'up' : 'down'}`} style={{ fontSize: '0.45rem', opacity: 0.5 }} />
                                                                                    {bucket.naam}
                                                                                </span>
                                                                                <button onClick={e => { e.stopPropagation(); setPlannerPaletNieuwBucket(bucketKey); setPlannerPaletBucketOpen(p => ({ ...p, [bucketKey]: true })); }}
                                                                                    title="Taak toevoegen"
                                                                                    style={{ width: 16, height: 16, borderRadius: 3, border: 'none', background: '#c7d2fe', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', flexShrink: 0, padding: 0 }}>
                                                                                    <i className="fa-solid fa-plus" />
                                                                                </button>
                                                                            </div>
                                                                            {bucketOpen && <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                                {bucket.taken.filter(taak => !paletZoek || taak.toLowerCase().includes(paletZoek.toLowerCase())).map((taak, ti) => {
                                                                                    const key = sjabloon.id + '|' + bucket.naam + '|' + taak;
                                                                                    const bezig = plannerPaletBezig[key];
                                                                                    const gedaan = !!plannerPaletVinkjes[key];
                                                                                    const isOpen = !!plannerPaletKaartOpen[key];
                                                                                    const data = plannerPaletData[key] || {};
                                                                                    const geselecteerd = plannerPaletSelectie.has(key);
                                                                                    const afgerondInPlanner = (plannerTaken || []).some(t => t.title?.toLowerCase() === taak.toLowerCase() && t.percentComplete === 100);
                                                                                    const alInPlanner = !afgerondInPlanner && (plannerTaken || []).some(t => t.title?.toLowerCase() === taak.toLowerCase());
                                                                                    const toggleDisabled = gedaan || afgerondInPlanner;
                                                                                    const ledenLijst = teamsLeden;
                                                                                    const toegewezenUser = data.userId ? ledenLijst.find(u => String(u.id) === String(data.userId)) : null;
                                                                                    const toegewezenInitials = toegewezenUser?.displayName ? toegewezenUser.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
                                                                                    return (
                                                                                        <div key={ti}
                                                                                            draggable
                                                                                            onDragStart={e => { e.stopPropagation(); setPaletDrag({ type: 'taak', bi, ti }); }}
                                                                                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setPaletDragOver({ type: 'taak', bi, ti }); }}
                                                                                            onDrop={e => { e.preventDefault(); e.stopPropagation(); if (paletDrag?.type === 'taak' && paletDrag.bi === bi && paletDrag.ti !== ti) { setPlannerSjablonenState(prev => { const upd = prev.map(s => { if (s.id !== sjabloon.id) return s; const buckets = s.buckets.map((b, bIdx) => { if (bIdx !== bi) return b; const t = [...b.taken]; const [m] = t.splice(paletDrag.ti, 1); t.splice(ti, 0, m); return { ...b, taken: t }; }); return { ...s, buckets }; }); localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(upd)); return upd; }); } setPaletDrag(null); setPaletDragOver(null); }}
                                                                                            onDragEnd={() => { setPaletDrag(null); setPaletDragOver(null); }}
                                                                                            style={{ borderRadius: 5, overflow: 'hidden', background: geselecteerd ? '#f0fdf4' : afgerondInPlanner ? '#f8fafc' : '#fff', border: paletDragOver?.type === 'taak' && paletDragOver.bi === bi && paletDragOver.ti === ti && paletDrag?.ti !== ti ? '1px solid #6366f1' : geselecteerd ? '1px solid #86efac' : '1px solid #f1f5f9', marginBottom: 1, opacity: paletDrag?.type === 'taak' && paletDrag.bi === bi && paletDrag.ti === ti ? 0.4 : 1 }}>
                                                                                            <div style={{ padding: '5px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                                <i className="fa-solid fa-grip-vertical" style={{ fontSize: '0.45rem', color: '#cbd5e1', cursor: 'grab', flexShrink: 0 }} />

                                                                                                {plannerPaletEditKey === key ? (
                                                                                                    <input
                                                                                                        autoFocus
                                                                                                        value={plannerPaletEditVal}
                                                                                                        onChange={e => setPlannerPaletEditVal(e.target.value)}
                                                                                                        onKeyDown={e => {
                                                                                                            if (e.key === 'Escape') { setPlannerPaletEditKey(null); return; }
                                                                                                            if (e.key === 'Enter' && plannerPaletEditVal.trim()) {
                                                                                                                const nieuweNaam = plannerPaletEditVal.trim();
                                                                                                                setPlannerSjablonenState(prev => {
                                                                                                                    const updated = prev.map(s => s.id !== sjabloon.id ? s : { ...s, buckets: s.buckets.map(b => b.naam !== bucket.naam ? b : { ...b, taken: b.taken.map((t, i) => i === ti ? nieuweNaam : t) }) });
                                                                                                                    localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(updated));
                                                                                                                    return updated;
                                                                                                                });
                                                                                                                setPlannerPaletEditKey(null);
                                                                                                            }
                                                                                                        }}
                                                                                                        onBlur={() => setPlannerPaletEditKey(null)}
                                                                                                        onClick={e => e.stopPropagation()}
                                                                                                        style={{ flex: 1, fontSize: '0.71rem', border: 'none', borderBottom: '1px solid #3b82f6', outline: 'none', background: 'transparent', color: '#1e293b', padding: '0 2px' }}
                                                                                                    />
                                                                                                ) : (
                                                                                                    <span
                                                                                                        onDoubleClick={e => { e.stopPropagation(); setPlannerPaletEditKey(key); setPlannerPaletEditVal(taak); }}
                                                                                                        title="Dubbelklik om te bewerken"
                                                                                                        style={{ flex: 1, fontSize: '0.71rem', color: (gedaan || afgerondInPlanner) ? '#94a3b8' : '#1e293b', textDecoration: (gedaan || afgerondInPlanner) ? 'line-through' : 'none', lineHeight: 1.3, cursor: 'text' }}>{taak}</span>
                                                                                                )}
                                                                                                {(() => {
                                                                                                    const inProject = (project.tasks || []).some(t => t.name?.toLowerCase() === taak.toLowerCase() && t.bucketNaam === bucket.naam);
                                                                                                    return (
                                                                                                        <button onClick={e => { e.stopPropagation(); if (inProject) { saveProject({ ...project, tasks: (project.tasks || []).filter(t => !(t.name?.toLowerCase() === taak.toLowerCase() && t.bucketNaam === bucket.naam)) }); } else { saveProject({ ...project, tasks: [...(project.tasks || []), { id: 't' + Date.now(), name: taak, startDate: '', endDate: '', assignedTo: [], completed: false, bucketNaam: bucket.naam }] }); } }}
                                                                                                            title={inProject ? 'Verwijderen uit Projecttaken' : 'Toevoegen aan Projecttaken'}
                                                                                                            style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${inProject ? '#3b82f6' : '#cbd5e1'}`, background: inProject ? '#3b82f6' : '#fff', color: inProject ? '#fff' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', flexShrink: 0, padding: 0 }}>
                                                                                                            <i className="fa-solid fa-clipboard-list" />
                                                                                                        </button>
                                                                                                    );
                                                                                                })()}
                                                                                                {afgerondInPlanner ? (
                                                                                                    <i className="fa-solid fa-check" style={{ color: '#16a34a', fontSize: '0.55rem', flexShrink: 0 }} />
                                                                                                ) : null}
                                                                                            </div>
                                                                                            {isOpen && (
                                                                                                <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
                                                                                                    <div>
                                                                                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Controlelijst</div>
                                                                                                        {(data.checklist || []).map((item, ci) => (
                                                                                                            <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                                                                                                <i className="fa-regular fa-square" style={{ color: '#94a3b8', fontSize: '0.6rem', flexShrink: 0 }} />
                                                                                                                <span style={{ flex: 1, fontSize: '0.68rem', color: '#334155' }}>{item}</span>
                                                                                                                <button onClick={() => updatePaletData(key, { checklist: data.checklist.filter((_, j) => j !== ci) })} style={{ width: 14, height: 14, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><i className="fa-solid fa-xmark" /></button>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <input placeholder="+ Item toevoegen (Enter)" onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { updatePaletData(key, { checklist: [...(data.checklist || []), e.target.value.trim()] }); e.target.value = ''; } }} style={{ fontSize: '0.65rem', border: 'none', borderBottom: '1px solid #e2e8f0', outline: 'none', width: '100%', padding: '2px 0', background: 'transparent', color: '#94a3b8' }} />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Notitie</div>
                                                                                                        <textarea defaultValue={data.notitie || ''} rows={2} onBlur={e => updatePaletData(key, { notitie: e.target.value })} placeholder="Notitie…" style={{ width: '100%', fontSize: '0.68rem', border: '1px solid #e2e8f0', borderRadius: 5, padding: '4px 6px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Bijlagen</div>
                                                                                                        {(data.bijlagen || []).map((b, bi2) => (
                                                                                                            <div key={bi2} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                                                                                                <i className="fa-solid fa-paperclip" style={{ color: '#94a3b8', fontSize: '0.6rem', flexShrink: 0 }} />
                                                                                                                <span style={{ flex: 1, fontSize: '0.65rem', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', textDecoration: 'underline' }}
                                                                                                                    title="Downloaden"
                                                                                                                    onClick={async () => {
                                                                                                                        const f = await haalEmailBestandOp(b.storageKey);
                                                                                                                        if (!f) return;
                                                                                                                        const blob = f.blob || f;
                                                                                                                        const url = URL.createObjectURL(blob);
                                                                                                                        const a = document.createElement('a');
                                                                                                                        a.href = url;
                                                                                                                        a.download = b.naam;
                                                                                                                        a.click();
                                                                                                                        setTimeout(() => URL.revokeObjectURL(url), 5000);
                                                                                                                    }}>{b.naam}</span>
                                                                                                                {/\.(jpe?g|png|gif|webp|bmp|svg|pdf)$/i.test(b.naam) && (
                                                                                                                    <button title="Voorbeeld bekijken" onClick={async e => {
                                                                                                                        e.stopPropagation();
                                                                                                                        const f = await haalEmailBestandOp(b.storageKey);
                                                                                                                        if (!f) return;
                                                                                                                        const blob = f.blob || f;
                                                                                                                        const url = URL.createObjectURL(blob);
                                                                                                                        window.open(url, '_blank');
                                                                                                                        setTimeout(() => URL.revokeObjectURL(url), 30000);
                                                                                                                    }} style={{ width: 16, height: 16, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                                                                                                                        <i className="fa-solid fa-eye" />
                                                                                                                    </button>
                                                                                                                )}
                                                                                                                {b.plannerUrl && <a href={b.plannerUrl} target="_blank" rel="noreferrer" title="Open in Planner/SharePoint" style={{ color: '#059669', fontSize: '0.5rem', flexShrink: 0 }}><i className="fa-solid fa-arrow-up-right-from-square" /></a>}
                                                                                                                <button onClick={() => verwijderPaletBijlage(key, bi2)} style={{ width: 14, height: 14, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><i className="fa-solid fa-xmark" /></button>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(f => voegPaletBijlageToe(key, f)); }} onClick={() => document.getElementById(`palet-upload-${key.replace(/[^a-z0-9]/gi, '_')}`).click()} style={{ border: '2px dashed #e2e8f0', borderRadius: 6, padding: '6px 8px', textAlign: 'center', fontSize: '0.62rem', color: '#94a3b8', cursor: 'pointer', marginTop: 4 }}>
                                                                                                            <i className="fa-solid fa-cloud-arrow-up" /> Sleep bestand of klik
                                                                                                            <input id={`palet-upload-${key.replace(/[^a-z0-9]/gi, '_')}`} type="file" multiple style={{ display: 'none' }} onChange={e => { Array.from(e.target.files).forEach(f => voegPaletBijlageToe(key, f)); e.target.value = ''; }} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                {bucket.taken.length === 0 && <span style={{ fontSize: '0.65rem', color: '#cbd5e1', padding: '2px 0' }}>Geen taken</span>}
                                                                                {plannerPaletNieuwBucket === bucketKey && (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 2px', marginTop: 2 }}>
                                                                                        <input autoFocus placeholder="Nieuwe taaknaam…"
                                                                                            onKeyDown={e => {
                                                                                                if (e.key === 'Escape') { setPlannerPaletNieuwBucket(null); return; }
                                                                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                                                                    const nieuweNaam = e.target.value.trim();
                                                                                                    setPlannerSjablonenState(prev => {
                                                                                                        const updated = prev.map(s => s.id !== sjabloon.id ? s : { ...s, buckets: s.buckets.map(b => b.naam !== bucket.naam ? b : { ...b, taken: [...b.taken, nieuweNaam] }) });
                                                                                                        localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(updated));
                                                                                                        return updated;
                                                                                                    });
                                                                                                    e.target.value = '';
                                                                                                    setPlannerPaletNieuwBucket(null);
                                                                                                }
                                                                                            }}
                                                                                            onBlur={() => setPlannerPaletNieuwBucket(null)}
                                                                                            style={{ flex: 1, fontSize: '0.7rem', border: 'none', borderBottom: '1px solid #3b82f6', outline: 'none', background: 'transparent', color: '#1e293b', padding: '1px 2px' }} />
                                                                                        <i className="fa-solid fa-corner-down-left" style={{ fontSize: '0.5rem', color: '#94a3b8' }} />
                                                                                    </div>
                                                                                )}
                                                                            </div>}
                                                                        </div>
                                                                        );
                                                                            })}
                                                                    {/* Nieuwe hoofdgroep */}
                                                                    {plannerPaletNieuwHoofdgroep === sjabloon.id ? (
                                                                        <div style={{ padding: '6px 10px', background: '#eef2ff', borderLeft: '3px solid #6366f1', borderBottom: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                            <i className="fa-solid fa-folder-plus" style={{ color: '#6366f1', fontSize: '0.55rem' }} />
                                                                            <input
                                                                                autoFocus
                                                                                placeholder="Naam hoofdgroep… (Enter)"
                                                                                onKeyDown={e => {
                                                                                    if (e.key === 'Escape') { setPlannerPaletNieuwHoofdgroep(null); return; }
                                                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                                                        const naam = e.target.value.trim();
                                                                                        setPlannerSjablonenState(prev => {
                                                                                            const updated = prev.map(s => s.id !== sjabloon.id ? s : { ...s, buckets: [...s.buckets, { naam, taken: [] }] });
                                                                                            localStorage.setItem('schildersapp_planner_sjablonen', JSON.stringify(updated));
                                                                                            return updated;
                                                                                        });
                                                                                        setPlannerPaletNieuwHoofdgroep(null);
                                                                                    }
                                                                                }}
                                                                                onBlur={() => setPlannerPaletNieuwHoofdgroep(null)}
                                                                                style={{ flex: 1, fontSize: '0.7rem', border: 'none', borderBottom: '1px solid #6366f1', outline: 'none', background: 'transparent', color: '#1e293b', padding: '1px 2px' }}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <button onClick={() => setPlannerPaletNieuwHoofdgroep(sjabloon.id)}
                                                                            style={{ margin: '6px 10px', padding: '4px 8px', borderRadius: 6, border: '1px dashed #c7d2fe', background: 'transparent', color: '#6366f1', fontSize: '0.67rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                                                                            <i className="fa-solid fa-plus" style={{ fontSize: '0.5rem' }} /> Hoofdgroep toevoegen
                                                                        </button>
                                                                    )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                        </div>
                                                    );
                                                })()}
                                                </div>{/* einde palet flex-child */}
                                        </>
                                    </div>
                                </div>
                            )}

                            {teamsTeamId && (
                                <button onClick={() => { localStorage.removeItem('schilders_teams_team_id'); setTeamsTeamId(''); setTeamsLijst(null); }}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-start' }}>
                                    Team wijzigen
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );

    // ===== PREVIEW LIGHTBOX =====
    return (
        <>
            {mainContent}

            {/* ===== PALET TOEWIJZING POPUP ===== */}
            {plannerPaletAssignPopup && (() => {
                const KLEUREN = { category1: '#ef4444', category2: '#f97316', category3: '#eab308', category4: '#22c55e', category5: '#3b82f6', category6: '#8b5cf6' };
                const popup = plannerPaletAssignPopup;
                return (
                    <div onClick={() => setPlannerPaletAssignPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 22, width: 320, boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: 4 }}>Toevoegen aan Planner</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 16 }}>{popup.bulk ? `${popup.selectie?.size} geselecteerde taken` : popup.taakTitel}</div>

                            {/* Toewijzen aan */}
                            <label style={{ display: 'block', marginBottom: 12 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Toewijzen aan</div>
                                <select value={popup.userId || ''} onChange={e => setPlannerPaletAssignPopup(p => ({ ...p, userId: e.target.value || null }))}
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                                    <option value="">— Niemand —</option>
                                    {teamsLeden.length === 0 && <option disabled>Laden…</option>}
                                    {teamsLeden.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </label>

                            {/* Datums */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                <label style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Startdatum</div>
                                    <input type="date" value={popup.startDate || ''} onChange={e => setPlannerPaletAssignPopup(p => ({ ...p, startDate: e.target.value }))}
                                        style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.75rem', boxSizing: 'border-box' }} />
                                </label>
                                <label style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Einddatum</div>
                                    <input type="date" value={popup.dueDate || ''} onChange={e => setPlannerPaletAssignPopup(p => ({ ...p, dueDate: e.target.value }))}
                                        style={{ width: '100%', padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.75rem', boxSizing: 'border-box' }} />
                                </label>
                            </div>

                            {/* Label */}
                            <div style={{ marginBottom: 18 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Label</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {Object.entries(KLEUREN).map(([cat, kleur]) => (
                                        <button key={cat} onClick={() => setPlannerPaletAssignPopup(p => ({ ...p, label: p.label === cat ? null : cat }))}
                                            style={{ width: 24, height: 24, borderRadius: '50%', border: popup.label === cat ? `3px solid #1e293b` : '2px solid transparent', background: kleur, cursor: 'pointer', outline: popup.label === cat ? `2px solid ${kleur}` : 'none', outlineOffset: 1 }} />
                                    ))}
                                </div>
                            </div>

                            {/* Knoppen */}
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setPlannerPaletAssignPopup(null)}
                                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}>
                                    Annuleren
                                </button>
                                <button onClick={() => voegPaletTaakToe({ taakTitel: popup.taakTitel, bucketNaam: popup.bucketNaam, userId: popup.userId, startDate: popup.startDate, dueDate: popup.dueDate, label: popup.label, bulk: popup.bulk, selectie: popup.selectie })}
                                    style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-arrow-up" /> Toevoegen
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== SJABLOON EDITOR (KANBAN) ===== */}
            {sjabloonEditor && (() => {
                const si = Math.min(sjabloonEditorIdx, sjabloonEditor.length - 1);
                const huidigSjabloon = sjabloonEditor[si];
                const updateSjabloon = (fn) => setSjabloonEditor(prev => prev.map((x, i) => i === si ? fn(x) : x));
                return (
                    <div onClick={() => setSjabloonEditor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>

                            {/* ── Topbalk ── */}
                            <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, minHeight: 52 }}>
                                <i className="fa-solid fa-layer-group" style={{ color: '#059669', fontSize: '1rem' }} />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginRight: 8 }}>Sjablonen bewerken</span>

                                {/* Tabs per sjabloon */}
                                <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto', alignItems: 'center' }}>
                                    {sjabloonEditor.map((s, i) => (
                                        <button key={s.id} onClick={() => setSjabloonEditorIdx(i)}
                                            style={{ padding: '6px 14px', borderRadius: '8px 8px 0 0', border: 'none', background: i === si ? '#f0fdf4' : 'transparent', color: i === si ? '#059669' : '#64748b', fontWeight: i === si ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: i === si ? '2px solid #059669' : '2px solid transparent', flexShrink: 0 }}>
                                            {s.naam}
                                        </button>
                                    ))}
                                    <button onClick={() => { const nieuwIdx = sjabloonEditor.length; setSjabloonEditor(prev => [...prev, { id: 'nieuw-' + Date.now(), naam: 'Nieuw sjabloon', buckets: [{ naam: 'Nieuwe taak', taken: [] }] }]); setSjabloonEditorIdx(nieuwIdx); }}
                                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px dashed #cbd5e1', background: 'transparent', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        <i className="fa-solid fa-plus" /> Nieuw
                                    </button>
                                </div>

                                {/* Acties */}
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button onClick={() => { if (window.confirm('Alle sjablonen terugzetten naar standaard?')) { setSjabloonEditor(JSON.parse(JSON.stringify(PLANNER_SJABLONEN))); setSjabloonEditorIdx(0); } }}
                                        style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer' }}>
                                        Terugzetten
                                    </button>
                                    <button onClick={() => { savePlannerSjablonen(sjabloonEditor); setSjabloonEditor(null); }}
                                        style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-floppy-disk" /> Opslaan
                                    </button>
                                    <button onClick={() => setSjabloonEditor(null)}
                                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>
                            </div>

                            {/* ── Sjabloon naam + verwijder ── */}
                            <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                <input value={huidigSjabloon.naam} onChange={e => updateSjabloon(x => ({ ...x, naam: e.target.value }))}
                                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, background: '#fff', minWidth: 200 }} />
                                <button onClick={() => { if (!window.confirm(`Sjabloon "${huidigSjabloon.naam}" verwijderen?`)) return; setSjabloonEditor(prev => prev.filter((_, i) => i !== si)); setSjabloonEditorIdx(Math.max(0, si - 1)); }}
                                    style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-trash" /> Sjabloon verwijderen
                                </button>
                            </div>

                            {/* ── Kanban bord ── */}
                            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 10, padding: '8px 16px 16px', alignItems: 'flex-start' }}>
                                {huidigSjabloon.buckets.map((bucket, bi) => (
                                    <div key={bi} style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', maxHeight: 'calc(100vh - 160px)' }}>
                                        {/* Bucket header */}
                                        <div style={{ padding: '10px 10px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input value={bucket.naam} onChange={e => updateSjabloon(x => ({ ...x, buckets: x.buckets.map((b, j) => j === bi ? { ...b, naam: e.target.value } : b) }))}
                                                style={{ flex: 1, padding: '3px 6px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, background: '#fff', minWidth: 0 }} />
                                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: '#e2e8f0', borderRadius: 8, padding: '1px 6px', flexShrink: 0 }}>{bucket.taken.length}</span>
                                            <button onClick={() => { if (!window.confirm(`Bucket "${bucket.naam}" verwijderen?`)) return; updateSjabloon(x => ({ ...x, buckets: x.buckets.filter((_, j) => j !== bi) })); }}
                                                style={{ width: 18, height: 18, border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', flexShrink: 0 }} title="Bucket verwijderen">
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                        {/* Taakkaarten */}
                                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px 8px' }}>
                                            {bucket.taken.map((taak, ti) => (
                                                <div key={ti} style={{ background: '#fff', borderRadius: 7, padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input value={taak} onChange={e => updateSjabloon(x => ({ ...x, buckets: x.buckets.map((b, j) => j === bi ? { ...b, taken: b.taken.map((t, k) => k === ti ? e.target.value : t) } : b) }))}
                                                        style={{ flex: 1, padding: '2px 4px', border: 'none', outline: 'none', fontSize: '0.78rem', color: '#1e293b', background: 'transparent', minWidth: 0 }} placeholder="Taaknaam…" />
                                                    <button onClick={() => updateSjabloon(x => ({ ...x, buckets: x.buckets.map((b, j) => j === bi ? { ...b, taken: b.taken.filter((_, k) => k !== ti) } : b) }))}
                                                        style={{ width: 16, height: 16, border: 'none', background: 'transparent', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', flexShrink: 0, padding: 0 }} title="Verwijderen">
                                                        <i className="fa-solid fa-xmark" />
                                                    </button>
                                                </div>
                                            ))}
                                            {/* Taak toevoegen */}
                                            <button onClick={() => updateSjabloon(x => ({ ...x, buckets: x.buckets.map((b, j) => j === bi ? { ...b, taken: [...b.taken, ''] } : b) }))}
                                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <i className="fa-solid fa-plus" /> Taak toevoegen
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {/* Nieuwe bucket kolom */}
                                <button onClick={() => updateSjabloon(x => ({ ...x, buckets: [...x.buckets, { naam: 'Nieuwe bucket', taken: [] }] }))}
                                    style={{ width: 220, flexShrink: 0, padding: '14px', borderRadius: 10, border: '2px dashed #cbd5e1', background: 'rgba(255,255,255,0.6)', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-plus" /> Bucket toevoegen
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== LIGHTBOX ===== */}
            {lightbox && (() => {
                const { fotos, idx } = lightbox;
                const hasPrev = fotos && idx > 0;
                const hasNext = fotos && idx < fotos.length - 1;
                const goTo = async (newIdx) => {
                    const att = fotos[newIdx];
                    const b = await haalEmailBestandOp(att.id);
                    const blob = b?.blob || b;
                    if (blob instanceof Blob) setLightbox({ ...lightbox, url: URL.createObjectURL(blob), naam: att.name, idx: newIdx });
                };
                return (
                    <div
                        onClick={() => setLightbox(null)}
                        onKeyDown={e => { if (e.key === 'Escape') setLightbox(null); if (e.key === 'ArrowLeft' && hasPrev) goTo(idx - 1); if (e.key === 'ArrowRight' && hasNext) goTo(idx + 1); }}
                        tabIndex={0} ref={el => el?.focus()}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', outline: 'none' }}
                    >
                        {/* Sluiten */}
                        <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        {/* Vorige */}
                        {hasPrev && <button onClick={e => { e.stopPropagation(); goTo(idx - 1); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>}
                        {/* Foto */}
                        <img src={lightbox.url} alt={lightbox.naam} style={{ maxWidth: '88vw', maxHeight: '84vh', objectFit: 'contain', borderRadius: 6, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()} />
                        {/* Volgende */}
                        {hasNext && <button onClick={e => { e.stopPropagation(); goTo(idx + 1); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 44, height: 44, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>}
                        {/* Onderschrift */}
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', marginTop: 12, textAlign: 'center' }}>
                            {lightbox.naam}{fotos && fotos.length > 1 && <span style={{ marginLeft: 10, opacity: 0.6 }}>{idx + 1} / {fotos.length}</span>}
                            <span style={{ marginLeft: 14, opacity: 0.5 }}>← → pijltjestoetsen • Esc sluiten</span>
                        </div>
                    </div>
                );
            })()}

            {/* ===== TOAST ===== */}
            {toast && (
                <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: '0.82rem', zIndex: 99999, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                    <i className="fa-solid fa-clipboard-check" style={{ color: '#a78bfa' }} />
                    {toast}
                </div>
            )}

            {/* ===== EMAIL TOEVOEGEN FORMULIER ===== */}
            {emailForm && (
                <div onClick={() => setEmailForm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginBottom: 16 }}>
                            {emailForm._fileName ? `📎 ${emailForm._fileName}` : 'Email toevoegen'}
                        </div>
                        {/* Richting */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {[['in', '📥 Inkomend', '#3b82f6', '#eff6ff'], ['out', '📤 Verzonden', '#16a34a', '#f0fdf4']].map(([r, l, c, bg]) => (
                                <button key={r} onClick={() => setEmailForm(p => ({ ...p, richting: r }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${emailForm.richting === r ? c : '#e2e8f0'}`, background: emailForm.richting === r ? bg : '#fff', cursor: 'pointer', fontWeight: emailForm.richting === r ? 700 : 500, fontSize: '0.85rem', color: emailForm.richting === r ? c : '#94a3b8' }}>{l}</button>
                            ))}
                        </div>
                        {/* Van / Aan */}
                        <label style={{ display: 'block', marginBottom: 10 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>{emailForm.richting === 'in' ? 'Van *' : 'Aan *'}</div>
                            <input value={emailForm.van} onChange={e => setEmailForm(p => ({ ...p, van: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box' }} placeholder="naam of e-mailadres" />
                        </label>
                        {/* Onderwerp */}
                        <label style={{ display: 'block', marginBottom: 10 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>Onderwerp</div>
                            <input value={emailForm.onderwerp} onChange={e => setEmailForm(p => ({ ...p, onderwerp: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box' }} placeholder="Onderwerp van de email" />
                        </label>
                        {/* Datum + Categorie */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                            <label style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>Datum</div>
                                <input type="date" value={emailForm.datum} onChange={e => setEmailForm(p => ({ ...p, datum: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                            </label>
                            <label style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>
                                    Categorie{emailForm._aiLoading && <span style={{ color: '#a78bfa', fontWeight: 400 }}> · AI…</span>}
                                </div>
                                <select value={emailForm.categorie} onChange={e => setEmailForm(p => ({ ...p, categorie: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box' }}>
                                    {['Offerte', 'Opdracht', 'Factuur', 'Klacht', 'Informatie', 'Overig'].map(c => <option key={c}>{c}</option>)}
                                </select>
                            </label>
                        </div>
                        {/* Notitie */}
                        <label style={{ display: 'block', marginBottom: 16 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: 3 }}>Notitie <span style={{ fontWeight: 400 }}>(optioneel)</span></div>
                            <textarea value={emailForm.notitie} onChange={e => setEmailForm(p => ({ ...p, notitie: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} placeholder="Korte samenvatting of aantekening…" />
                        </label>
                        {/* Knoppen */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEmailForm(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b' }}>Annuleren</button>
                            <button onClick={() => {
                                const emailId = (Date.now() + Math.random()).toString();
                                const aiTaken = (emailForm._aiTaken || []).map(t => ({ id: 't' + Date.now() + Math.random(), naam: typeof t === 'string' ? t : (t?.name || ''), deadline: typeof t === 'object' ? (t?.deadline || null) : null, gedaan: false }));
                                voegEmailToe({ id: emailId, richting: emailForm.richting, van: emailForm.van, onderwerp: emailForm.onderwerp, datum: emailForm.datum, categorie: emailForm.categorie || 'Overig', notitie: emailForm.notitie, body: emailForm._body || '', attachments: emailForm._attachments || [], originalFile: emailForm._fileId ? { name: emailForm._fileName, size: emailForm._fileSize, fileId: emailForm._fileId } : null, taken: aiTaken });
                                setEmailForm(null);
                            }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                                {emailForm._aiLoading ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.75rem' }} />AI analyseert…</> : '✓ Opslaan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                    onClick={() => { setPreviewAtt(null); setPreviewBlobUrl(null); setPreviewLoading(false); }}
                    onKeyDown={e => { if (e.key === 'Escape') { setPreviewAtt(null); setPreviewBlobUrl(null); setPreviewLoading(false); } }}
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
                            {(previewAtt.data || previewAtt.url) ? (
                                <a href={previewAtt.data || previewAtt.url} download={previewAtt.name}
                                    style={{ padding: '6px 14px', borderRadius: '8px', background: '#F5850A', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                    onClick={e => e.stopPropagation()}>
                                    <i className="fa-solid fa-download" /> Downloaden
                                </a>
                            ) : null}
                            <button onClick={() => { setPreviewAtt(null); setPreviewBlobUrl(null); setPreviewLoading(false); }}
                                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        {/* Preview body */}
                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', minHeight: '200px', maxHeight: 'calc(90vh - 70px)' }}>
                            {previewAtt.type.startsWith('image/') ? (
                                <img src={previewBlobUrl || previewAtt.data || previewAtt.url} alt={previewAtt.name}
                                    style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 70px)', objectFit: 'contain', display: 'block' }}
                                    onError={e => { e.target.style.display='none'; e.target.nextSibling && (e.target.nextSibling.style.display='flex'); }} />
                            ) : previewAtt.type === 'application/pdf' || previewAtt.name?.toLowerCase().endsWith('.pdf') ? (
                                previewLoading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 40px', textAlign: 'center' }}>
                                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#ef4444' }} />
                                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>PDF laden…</div>
                                    </div>
                                ) : previewBlobUrl ? (
                                    <embed src={previewBlobUrl} type="application/pdf"
                                        style={{ width: '80vw', height: 'calc(90vh - 70px)', display: 'block' }} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '60px 40px', textAlign: 'center' }}>
                                        <i className="fa-solid fa-file-pdf" style={{ fontSize: '4rem', color: '#ef4444' }} />
                                        <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Bestand kan niet worden weergegeven.</div>
                                    </div>
                                )
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
                                                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                                                    onLoad={ev => { try { ev.target.contentDocument.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; }); } catch {} }}
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
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 60px', textAlign: 'center' }}>
                                    <i className={`fa-solid ${
                                        previewAtt.name?.toLowerCase().endsWith('.msg') ? 'fa-envelope' :
                                        previewAtt.type.includes('word') || previewAtt.name.endsWith('.docx') ? 'fa-file-word' :
                                        previewAtt.type.includes('sheet') || previewAtt.name.endsWith('.xlsx') ? 'fa-file-excel' : 'fa-file'
                                    }`} style={{ fontSize: '4rem', color: previewAtt.name?.toLowerCase().endsWith('.msg') ? '#2563eb' : previewAtt.type.includes('word') || previewAtt.name.endsWith('.docx') ? '#2563eb' : previewAtt.type.includes('sheet') ? '#16a34a' : '#94a3b8' }} />
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>{previewAtt.name}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: (previewAtt.data || previewAtt.url) ? '16px' : '0' }}>{previewAtt.name?.toLowerCase().endsWith('.msg') ? 'Kon e-mail niet inladen — probeer te downloaden.' : 'Voorbeeldweergave niet beschikbaar voor dit bestandstype'}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '12px' }}>{previewAtt.size ? (previewAtt.size / 1024).toFixed(1) + ' KB' : ''}</div>
                                        {(previewAtt.data || previewAtt.url) && (
                                            <a href={previewAtt.data || previewAtt.url} target="_blank" rel="noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#F5850A', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
                                                <i className="fa-solid fa-arrow-up-right-from-square" /> Openen in nieuw tabblad
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Planning Modal ── */}
            {planningModal && (
                <div onClick={() => setPlanningModal(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '18px', width: '400px', maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-calendar-plus" style={{ color: '#fff', fontSize: '1.1rem' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Opnemen in Planning</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                                    Top! We plannen <strong>{planningModal.taskName}</strong> in.
                                </div>
                            </div>
                            <button onClick={() => setPlanningModal(null)}
                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div style={{ padding: '20px 22px' }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <label style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Startdatum</div>
                                    <input type="date" value={planningModal.startDate}
                                        onChange={e => setPlanningModal(p => ({ ...p, startDate: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }} />
                                </label>
                                <label style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Einddatum</div>
                                    <input type="date" value={planningModal.endDate}
                                        onChange={e => setPlanningModal(p => ({ ...p, endDate: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }} />
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setPlanningModal(null)}
                                    style={{ padding: '8px 18px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                    Annuleren
                                </button>
                                <button onClick={() => handlePlanningBevestigen(planningModal.taskId, planningModal.startDate, planningModal.endDate)}
                                    style={{ padding: '8px 20px', borderRadius: '9px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-calendar-check" /> Inplannen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delen Modal ── */}
            {delenModal && (
                <div onClick={() => setDelenModal(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: '18px', width: '380px', maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-share-nodes" style={{ color: '#fff', fontSize: '1.1rem' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>Taak delen</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {delenModal.taskName}
                                </div>
                            </div>
                            <button onClick={() => setDelenModal(null)}
                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div style={{ padding: '20px 22px' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                                <button onClick={() => setDelenModal(p => ({ ...p, mode: 'persoon', selectedUserId: null }))}
                                    style={{ flex: 1, padding: '14px 10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', border: `2px solid ${delenModal.mode === 'persoon' ? '#2563eb' : '#e2e8f0'}`, background: delenModal.mode === 'persoon' ? '#eff6ff' : '#f8fafc', color: delenModal.mode === 'persoon' ? '#1d4ed8' : '#475569' }}>
                                    <i className="fa-solid fa-user" style={{ fontSize: '1.2rem', display: 'block', marginBottom: '6px' }} />
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>Met een persoon</div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Alleen zij zien de taak</div>
                                </button>
                                <button onClick={() => setDelenModal(p => ({ ...p, mode: 'project', selectedUserId: null }))}
                                    style={{ flex: 1, padding: '14px 10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', border: `2px solid ${delenModal.mode === 'project' ? '#2563eb' : '#e2e8f0'}`, background: delenModal.mode === 'project' ? '#eff6ff' : '#f8fafc', color: delenModal.mode === 'project' ? '#1d4ed8' : '#475569' }}>
                                    <i className="fa-solid fa-users" style={{ fontSize: '1.2rem', display: 'block', marginBottom: '6px' }} />
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>Met het project</div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Heel projectteam ziet het</div>
                                </button>
                            </div>
                            {delenModal.mode === 'persoon' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Kies medewerker</div>
                                    {allUsers.map(u => (
                                        <button key={u.id} onClick={() => setDelenModal(p => ({ ...p, selectedUserId: u.id }))}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${delenModal.selectedUserId === u.id ? '#2563eb' : '#e2e8f0'}`, background: delenModal.selectedUserId === u.id ? '#eff6ff' : '#fff', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', textAlign: 'left' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5850A,#E07000)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{u.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{u.role}</div>
                                            </div>
                                            {delenModal.selectedUserId === u.id && <i className="fa-solid fa-circle-check" style={{ marginLeft: 'auto', color: '#2563eb', fontSize: '1rem' }} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {delenModal.mode === 'project' && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', marginBottom: '8px' }}>
                                        <i className="fa-solid fa-users" style={{ marginRight: '5px' }} />
                                        Projectteam ({projectTeamUsers.length > 0 ? projectTeamUsers.length : allUsers.length} personen)
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {(projectTeamUsers.length > 0 ? projectTeamUsers : allUsers).map(u => (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '20px', background: '#fff', border: '1px solid #bae6fd', fontSize: '0.73rem', color: '#0369a1', fontWeight: 600 }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5850A,#E07000)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700 }}>{u.initials}</div>
                                                {u.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setDelenModal(null)}
                                    style={{ padding: '8px 18px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                                    Annuleren
                                </button>
                                <button
                                    disabled={!delenModal.mode || (delenModal.mode === 'persoon' && !delenModal.selectedUserId)}
                                    onClick={() => handleDelen(delenModal.taskId, delenModal.mode, delenModal.selectedUserId)}
                                    style={{ padding: '8px 20px', borderRadius: '9px', border: 'none', background: (!delenModal.mode || (delenModal.mode === 'persoon' && !delenModal.selectedUserId)) ? '#e2e8f0' : '#2563eb', color: (!delenModal.mode || (delenModal.mode === 'persoon' && !delenModal.selectedUserId)) ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: (!delenModal.mode || (delenModal.mode === 'persoon' && !delenModal.selectedUserId)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-share" /> Delen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast notificaties ── */}
            {toasts.length > 0 && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
                    {toasts.map(t => (
                        <div key={t.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 16px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            background: t.type === 'error' ? '#fef2f2' : t.type === 'success' ? '#f0fdf4' : '#fffbeb',
                            border: `1px solid ${t.type === 'error' ? '#fecaca' : t.type === 'success' ? '#bbf7d0' : '#fde68a'}`,
                            color: t.type === 'error' ? '#991b1b' : t.type === 'success' ? '#166534' : '#92400e',
                            fontSize: '0.85rem', fontWeight: 600, minWidth: '280px', maxWidth: '400px',
                        }}>
                            <i className={`fa-solid ${t.type === 'error' ? 'fa-circle-xmark' : t.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} style={{ flexShrink: 0 }} />
                            <span>{t.msg}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Teams iframe overlay ── */}
            {teamsIframeOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    onClick={() => setTeamsIframeOpen(false)}>
                    <div style={{ width: '100%', maxWidth: 1100, height: '80vh', background: '#fff', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-brands fa-microsoft" style={{ color: '#fff', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Microsoft Teams — Kanaal</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{project.name}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                <a href={`msteams://${(project.teamsKanaalUrl || '').replace(/^https?:\/\//, '')}`}
                                    style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-desktop" /> Teams app
                                </a>
                                <a href={project.teamsKanaalUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-arrow-up-right-from-square" /> Browser
                                </a>
                                <button onClick={() => setTeamsIframeOpen(false)}
                                    style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                        </div>
                        {teamsIframeFout ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f8fafc' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b', fontSize: '1.4rem' }} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Teams kan niet worden ingeladen</div>
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: 360 }}>Microsoft Teams blokkeert weergave in een ingebed venster. Gebruik een van de knoppen hieronder.</div>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <a href={`msteams://${(project.teamsKanaalUrl || '').replace(/^https?:\/\//, '')}`}
                                        style={{ padding: '10px 20px', borderRadius: 10, background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-desktop" /> Openen in Teams app
                                    </a>
                                    <a href={project.teamsKanaalUrl} target="_blank" rel="noopener noreferrer"
                                        style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-arrow-up-right-from-square" /> Openen in browser
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <iframe
                                src={project.teamsKanaalUrl}
                                style={{ flex: 1, border: 'none', width: '100%' }}
                                onError={() => setTeamsIframeFout(true)}
                                onLoad={e => {
                                    try {
                                        if (!e.target.contentDocument || e.target.contentDocument.body?.innerHTML === '') setTeamsIframeFout(true);
                                    } catch { setTeamsIframeFout(true); }
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

