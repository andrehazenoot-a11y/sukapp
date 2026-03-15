'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const BOT_NAME = 'DS Assistent';
const BOT_AVATAR = '🤖';

// App URL voor WhatsApp links (pas aan naar je productie-URL)
const APP_URL = 'https://schildersapp-katwijk.nl';

const PROJECTS = [
    { id: '1', name: 'Schilderwerk Familie Bakker' },
    { id: '2', name: 'Nieuwbouw Villa Wassenaar' },
    { id: '3', name: 'Onderhoud Rijtjeshuizen Leiden' },
    { id: '4', name: 'Renovatie Kantoorpand Den Haag' },
    { id: '5', name: 'Schilderwerk VVE De Branding' },
    { id: '6', name: 'Werkplaats / Magazijn' },
];

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

function getWeekKey() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getWeekNumber() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Storage helpers — IDENTIEK aan urenregistratie/page.js
function uren2StorageKey(userId, week, year) {
    return `schildersapp_urv2_u${userId}_w${week}_${year}`;
}
function uren2LoadData(userId, week, year) {
    try { const r = localStorage.getItem(uren2StorageKey(userId, week, year)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function uren2SaveData(userId, week, year, data) {
    try { localStorage.setItem(uren2StorageKey(userId, week, year), JSON.stringify(data)); } catch {}
}
function uren2HasHours(userId, week, year) {
    const proj = uren2LoadData(userId, week, year);
    if (!proj) return false;
    return proj.some(p => Object.entries(p.types || {}).some(([tid, hrs]) =>
        tid !== 'ziek' && tid !== 'vrij' && hrs.some(h => parseFloat(h) > 0)
    ));
}

function getDayName() {
    const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    return days[new Date().getDay()];
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Goedemorgen';
    if (h < 18) return 'Goedemiddag';
    return 'Goedenavond';
}

// Urentypen — zelfde als urenregistratie page
const UREN_TYPES = [
    { id: 'normaal',           label: 'Project uren',       color: '#F5850A', icon: 'fa-paint-roller' },
    { id: 'meerwerk',          label: 'Meerwerk',           color: '#f59e0b', icon: 'fa-plus-minus' },
    { id: 'oplevering',        label: 'Oplevering',         color: '#06b6d4', icon: 'fa-flag-checkered' },
    { id: 'werkvoorbereiding', label: 'Werkvoorbereiding',  color: '#6366f1', icon: 'fa-clipboard-list' },
    { id: 'ziek',              label: 'Ziek (hele dag)',     color: '#ef4444', icon: 'fa-briefcase-medical', noHours: true },
    { id: 'vrij',              label: 'Vrij (hele dag)',     color: '#8b5cf6', icon: 'fa-umbrella-beach', noHours: true },
];

// Lees per-gebruiker toegestane urentypen uit localStorage (ingesteld door beheerder)
function getUserUrenTypes(userId) {
    try {
        const saved = localStorage.getItem(`schildersapp_urentypes_${userId}`);
        if (saved) {
            const allowed = JSON.parse(saved);
            // Normaal is altijd inbegrepen
            const allIds = allowed.includes('normaal') ? allowed : ['normaal', ...allowed];
            return UREN_TYPES.filter(t => allIds.includes(t.id));
        }
    } catch {}
    // Standaard: normaal + meerwerk + ziek + vrij
    return UREN_TYPES.filter(t => ['normaal', 'meerwerk', 'ziek', 'vrij'].includes(t.id));
}

// Inline urenstaat mini-form
function InlineUrenstaat({ onSave, onCancel, allowedTypes }) {
    const types = allowedTypes && allowedTypes.length > 0 ? allowedTypes : UREN_TYPES.filter(t => ['normaal', 'meerwerk', 'ziek', 'vrij'].includes(t.id));
    const [rows, setRows] = useState([
        { projectId: '1', hours: ['8', '8', '8', '8', '8'], typeId: 'normaal' }
    ]);

    const updateHour = (ri, di, val) => {
        const u = [...rows];
        u[ri] = { ...u[ri], hours: [...u[ri].hours] };
        u[ri].hours[di] = val;
        setRows(u);
    };

    const updateProject = (ri, pid) => {
        const u = [...rows];
        u[ri] = { ...u[ri], projectId: pid };
        setRows(u);
    };

    const updateType = (ri, typeId) => {
        const u = [...rows];
        const isNoHours = types.find(t => t.id === typeId)?.noHours;
        u[ri] = { ...u[ri], typeId, hours: isNoHours ? ['✓', '✓', '✓', '✓', '✓'] : ['8', '8', '8', '8', '8'] };
        setRows(u);
    };

    const addRow = () => {
        setRows([...rows, { projectId: '', hours: ['', '', '', '', ''], typeId: 'normaal' }]);
    };

    const removeRow = (ri) => {
        if (rows.length > 1) setRows(rows.filter((_, i) => i !== ri));
    };

    const getTotal = () => {
        return rows.reduce((sum, r) => {
            const typeInfo = types.find(t => t.id === r.typeId);
            if (typeInfo?.noHours) return sum;
            return sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
        }, 0);
    };

    return (
        <div style={{
            background: '#fff', borderRadius: '12px', padding: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
            maxWidth: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <i className="fa-regular fa-calendar" style={{ color: '#FA9F52' }}></i>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>
                    Week {getWeekNumber()} — Snelle invoer
                </span>
            </div>

            {rows.map((row, ri) => {
                const typeInfo = types.find(t => t.id === row.typeId) || types[0];
                const isNoHours = typeInfo.noHours;
                return (
                    <div key={ri} style={{ marginBottom: '10px', padding: '8px', borderRadius: '8px', background: `${typeInfo.color}08`, border: `1px solid ${typeInfo.color}22` }}>
                        {/* Project + type select */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                            <select
                                value={row.projectId}
                                onChange={(e) => updateProject(ri, e.target.value)}
                                style={{
                                    flex: 1, padding: '5px 8px', fontSize: '0.72rem', fontWeight: 600,
                                    border: '1px solid #e2e8f0', borderRadius: '6px', color: '#1e293b',
                                    background: '#f8fafc', cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="">Selecteer project...</option>
                                {PROJECTS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {rows.length > 1 && (
                                <button onClick={() => removeRow(ri)} style={{
                                    width: '26px', height: '26px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)',
                                    background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0
                                }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>

                        {/* Urentype select — alleen toegestane types */}
                        <div style={{ marginBottom: '6px' }}>
                            <select
                                value={row.typeId}
                                onChange={(e) => updateType(ri, e.target.value)}
                                style={{
                                    width: '100%', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700,
                                    border: `1px solid ${typeInfo.color}55`, borderRadius: '6px',
                                    color: typeInfo.color, background: `${typeInfo.color}0d`,
                                    cursor: 'pointer', outline: 'none', WebkitAppearance: 'none'
                                }}
                            >
                                {types.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Day inputs of ziek/vrij balken */}
                        {isNoHours ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                                {DAY_LABELS.map((day, di) => (
                                    <div key={di} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>{day}</div>
                                        <div style={{
                                            height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: `${typeInfo.color}15`, border: `1.5px solid ${typeInfo.color}44`
                                        }}>
                                            <i className={`fa-solid ${typeInfo.icon}`} style={{ fontSize: '0.7rem', color: typeInfo.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                                {DAY_LABELS.map((day, di) => (
                                    <div key={di} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>{day}</div>
                                        <input
                                            type="text"
                                            value={row.hours[di]}
                                            onChange={(e) => updateHour(ri, di, e.target.value)}
                                            placeholder="0"
                                            style={{
                                                width: '100%', height: '30px', textAlign: 'center',
                                                border: `1.5px solid ${parseFloat(row.hours[di]) > 0 ? typeInfo.color : '#e2e8f0'}`,
                                                borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                                                color: parseFloat(row.hours[di]) > 0 ? typeInfo.color : '#94a3b8',
                                                background: parseFloat(row.hours[di]) > 0 ? `${typeInfo.color}0d` : '#fff',
                                                outline: 'none', boxSizing: 'border-box'
                                            }}
                                            onFocus={(e) => { e.currentTarget.style.borderColor = typeInfo.color; e.currentTarget.select(); }}
                                            onBlur={(e) => { if (!parseFloat(e.currentTarget.value)) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add project button — verberg als slechts 1 type beschikbaar */}
            {types.length > 0 && (
            <button onClick={addRow} style={{
                width: '100%', padding: '4px', border: '1px dashed #d0d5dd', borderRadius: '6px',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px'
            }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FA9F52'; e.currentTarget.style.borderColor = '#FA9F52'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#d0d5dd'; }}
            >
                <i className="fa-solid fa-plus"></i> Rij toevoegen
            </button>
            )}

            {/* Totaal + buttons */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0 0', borderTop: '1px solid #e2e8f0'
            }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                    Totaal: <span style={{ color: '#F5850A', fontSize: '0.85rem' }}>{getTotal()}u</span>
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={onCancel} style={{
                        padding: '5px 12px', fontSize: '0.7rem', borderRadius: '16px',
                        border: '1px solid #e2e8f0', background: '#fff', color: '#64748b',
                        cursor: 'pointer', fontWeight: 600
                    }}>Annuleren</button>
                    <button onClick={() => onSave(rows)} style={{
                        padding: '5px 14px', fontSize: '0.7rem', borderRadius: '16px', border: 'none',
                        background: 'linear-gradient(135deg, #FA9F52, #F5850A)', color: '#fff',
                        cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <i className="fa-solid fa-check"></i> Opslaan
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChatBot() {
    const { user, getAllUsers } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [hasNotified, setHasNotified] = useState(false);
    const [showPulse, setShowPulse] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);
    const [showEmployeePicker, setShowEmployeePicker] = useState(false);
    const messagesEndRef = useRef(null);
    const userName = user?.name?.split(' ')[0] || 'daar';
    const userNameRef = useRef(userName);
    useEffect(() => { userNameRef.current = userName; }, [userName]);
    const allEmployees = getAllUsers ? getAllUsers().filter(u => u.phone && u.id !== user?.id) : [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showTemplate, showEmployeePicker]);

    // Check urenstaat + contract tracker — runs ONCE only
    useEffect(() => {
        if (hasNotified) return;

        const timer = setTimeout(() => {
            const name = userNameRef.current;
            const greeting = getGreeting();
            const day = getDayName();

            // ── 1. Urenstaat check (nieuwe sleutel) ──
            const weekNum = getWeekNumber();
            const year = new Date().getFullYear();
            const hasHours = uren2HasHours(user?.id, weekNum, year);

            // ── 2. Contract tracker check ──
            const contracten = JSON.parse(localStorage.getItem('wa_contracten') || '[]');
            const today = new Date();
            const openTermijnen = [];
            const verlopenTermijnen = [];

            contracten.forEach(c => {
                const termijnen = c.termijnBedragen || [];
                const betalingen = c.betalingen || {};
                termijnen.forEach((bedrag, i) => {
                    if (betalingen[i]) return; // al betaald
                    const verwacht = c.termijnData?.[i] ? new Date(c.termijnData[i]) : null;
                    const label = `${c.contractnummer || c.id} — Termijn ${i + 1} (€${bedrag.toLocaleString('nl-NL')})`;
                    if (verwacht && verwacht < today) verlopenTermijnen.push(label);
                    else openTermijnen.push(label);
                });
            });

            const msgs = [
                { id: 1, from: 'bot', text: `${greeting} ${name}! 👋`, time: new Date() },
            ];

            // Urenstaat bericht
            if (!hasHours) {
                msgs.push({
                    id: 2, from: 'bot',
                    text: `⏱️ Het is ${day} en je urenstaat deze week is nog niet ingevuld.`,
                    time: new Date(),
                    actions: [
                        { label: '📝 Vul nu in', action: 'fill_template' },
                        { label: '📋 Urenstaat', action: 'goto_uren' },
                        { label: '💬 Stuur herinnering', action: 'whatsapp_reminder' },
                        { label: '⏰ Later', action: 'later' },
                    ]
                });
                setShowPulse(true);
            } else {
                msgs.push({ id: 2, from: 'bot', text: `✅ Urenstaat week ${getWeekNumber()} is ingevuld. Goed bezig! 💪`, time: new Date() });
            }

            // Contract tracker bericht
            if (verlopenTermijnen.length > 0) {
                msgs.push({
                    id: 3, from: 'bot',
                    text: `🔴 *Openstaande termijnen (verlopen)*:\n${verlopenTermijnen.map(t => `• ${t}`).join('\n')}\n\nDeze termijnen zijn al over de verwachte betaaldatum.`,
                    time: new Date(),
                    actions: [{ label: '📄 Ga naar Contracten', action: 'goto_contracten' }]
                });
                setShowPulse(true);
            } else if (openTermijnen.length > 0) {
                msgs.push({
                    id: 3, from: 'bot',
                    text: `🟡 *Openstaande termijnen (${openTermijnen.length})*:\n${openTermijnen.slice(0, 4).map(t => `• ${t}`).join('\n')}${openTermijnen.length > 4 ? `\n• ...en ${openTermijnen.length - 4} meer` : ''}`,
                    time: new Date(),
                    actions: [{ label: '📄 Bekijk Contracten', action: 'goto_contracten' }]
                });
            } else if (contracten.length > 0) {
                msgs.push({ id: 3, from: 'bot', text: `✅ Alle termijnen van ${contracten.length} contracten zijn voldaan!`, time: new Date() });
            }

            setMessages(msgs);
            setHasNotified(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []); // ← lege deps: eenmalig bij mount

    const addBotMessage = (text, actions) => {
        setMessages(prev => [...prev, {
            id: Date.now(), from: 'bot', text, time: new Date(), actions
        }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, {
            id: Date.now(), from: 'user', text, time: new Date()
        }]);
    };

    const handleSaveTemplate = (rows) => {
        const weekNum = getWeekNumber();
        const year = new Date().getFullYear();
        const total = rows.reduce((sum, r) => {
            const typeInfo = UREN_TYPES.find(t => t.id === r.typeId);
            if (typeInfo?.noHours) return sum;
            return sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0);
        }, 0);
        const projectNames = rows.filter(r => r.projectId).map(r => PROJECTS.find(p => p.id === r.projectId)?.name || 'Onbekend');

        // Sla op in NIEUWE format (zelfde als MijnUren component)
        // Meerdere rijen met hetzelfde project worden samengevoegd
        const projectMap = {};
        rows.forEach((r, i) => {
            const pid = r.projectId || '1';
            const typeId = r.typeId || 'normaal';
            if (!projectMap[pid]) {
                projectMap[pid] = {
                    id: 'p' + Date.now() + i,
                    projectId: pid,
                    types: {},
                    notes: {}
                };
            }
            const typeInfo = UREN_TYPES.find(t => t.id === typeId);
            if (typeInfo?.noHours) {
                // Ziek/vrij: icontype — sla lege array op als markering
                projectMap[pid].types[typeId] = ['1','1','1','1','1'];
                projectMap[pid].notes[typeId] = ['','','','',''];
            } else {
                projectMap[pid].types[typeId] = r.hours.map(h => String(h));
                projectMap[pid].notes[typeId] = ['','','','',''];
            }
        });
        const newProjects = Object.values(projectMap);
        uren2SaveData(user?.id, weekNum, year, newProjects);

        setShowTemplate(false);
        const typeSummary = [...new Set(rows.map(r => UREN_TYPES.find(t => t.id === r.typeId)?.label || r.typeId))].join(', ');
        addBotMessage(`✅ Opgeslagen! ${total} uur verdeeld over ${projectNames.join(', ')}.\nType(n): ${typeSummary}\n\nJe weekstaat voor week ${weekNum} is bijgewerkt. Je ziet ze direct in de Urenregistratie!`, [
            { label: '📋 Naar Urenregistratie', action: 'goto_uren' }
        ]);
    };

    const handleAction = (action) => {
        if (action === 'fill_template') {
            addUserMessage('Ja, vul nu in');
            setTimeout(() => {
                addBotMessage('Hier is je weekstaat template! Vul je uren in per project per dag 👇');
                setTimeout(() => setShowTemplate(true), 300);
            }, 400);
        } else if (action === 'goto_uren') {
            addUserMessage('Ga naar Urenregistratie');
            setTimeout(() => {
                addBotMessage('Top! Ik open de urenregistratie voor je. 📋');
                setTimeout(() => { window.location.href = '/urenregistratie'; }, 800);
            }, 500);
        } else if (action === 'later') {
            addUserMessage('Later');
            setTimeout(() => {
                addBotMessage('Oké, ik herinner je er later aan! ⏰ Vergeet het niet voor vrijdag 😊');
            }, 500);
        } else if (action === 'whatsapp_reminder') {
            addUserMessage('WhatsApp herinnering');
            setTimeout(() => {
                if (allEmployees.length === 0) {
                    addBotMessage('Er zijn geen medewerkers met telefoonnummers gevonden. Voeg telefoonnummers toe in Toegangsbeheer.');
                    return;
                }
                addBotMessage(`Naar wie wil je de herinnering sturen? 📱\n\n${allEmployees.map((e, i) => `${i + 1}. ${e.name} (${e.role})`).join('\n')}`, [
                    { label: '📨 Stuur naar iedereen', action: 'send_all_wa' },
                    { label: '👤 Kies medewerker', action: 'pick_employee_wa' }
                ]);
            }, 400);
        } else if (action === 'send_all_wa') {
            addUserMessage('Stuur naar iedereen');
            setTimeout(() => {
                const msg = `Hoi! 👋 Dit is een herinnering van SchildersApp.\n\nJe urenstaat voor deze week is nog niet ingevuld.\n\n📋 Vul je uren in: ${APP_URL}/uren\n\nReageer met ✅ als je klaar bent!`;
                allEmployees.forEach((emp, i) => {
                    setTimeout(() => {
                        window.open(`https://wa.me/${emp.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }, i * 1500);
                });
                const names = allEmployees.map(e => e.name).join(', ');
                addBotMessage(`📨 WhatsApp wordt geopend voor ${allEmployees.length} medewerkers:\n${names}\n\nElke medewerker kan direct reageren in het WhatsApp-gesprek!`);
            }, 500);
        } else if (action === 'pick_employee_wa') {
            addUserMessage('Kies medewerker');
            setTimeout(() => {
                setShowEmployeePicker(true);
            }, 300);
        } else if (action === 'uren_klaar_wa') {
            addUserMessage('✅ Uren ingevuld!');
            setTimeout(() => {
                const msg = `✅ Mijn urenstaat voor week ${getWeekNumber()} is ingevuld! — ${userName}`;
                const adminPhone = allEmployees[0]?.phone || '31612345678';
                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                addBotMessage('Top! 🎉 Je reactie wordt via WhatsApp verstuurd.');
            }, 500);
        } else if (action === 'uren_later_wa') {
            addUserMessage('⏰ Doe ik later');
            setTimeout(() => {
                const msg = `⏰ Ik vul mijn urenstaat later deze week in. — ${userName}`;
                const adminPhone = allEmployees[0]?.phone || '31612345678';
                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                addBotMessage('Oké, je reactie wordt via WhatsApp verstuurd. Vergeet het niet! 😊');
            }, 500);
        } else if (action === 'goto_projecten') {
            addUserMessage('Ga naar Projecten');
            setTimeout(() => { window.location.href = '/projecten'; }, 500);
        } else if (action === 'goto_materieel') {
            addUserMessage('Ga naar Materieel');
            setTimeout(() => { window.location.href = '/materieel'; }, 500);
        } else if (action === 'goto_contracten') {
            addUserMessage('Bekijk Contracten');
            setTimeout(() => { window.location.href = '/whatsapp?tab=contracten'; }, 500);
        }
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        addUserMessage(text);
        setInput('');

        setTimeout(() => {
            const lower = text.toLowerCase();

            // ── NLP: uren invullen via chatbot ──
            const hourMatch = lower.match(/(\d+[,.]?\d*)\s*(?:uur|u\b)/);
            const hours = hourMatch ? parseFloat(hourMatch[1].replace(',', '.')) : null;

            // Dag detectie
            const DAY_MAP = {
                'vandaag': new Date().getDay() === 0 ? -1 : new Date().getDay() - 1,
                'gisteren': new Date().getDay() <= 1 ? -1 : new Date().getDay() - 2,
                'maandag': 0, 'ma': 0,
                'dinsdag': 1, 'di': 1,
                'woensdag': 2, 'wo': 2,
                'donderdag': 3, 'do': 3,
                'vrijdag': 4, 'vr': 4,
            };
            let dayIdx = -1;
            for (const [word, idx] of Object.entries(DAY_MAP)) {
                if (lower.includes(word)) { dayIdx = idx; break; }
            }
            if (dayIdx === -1 && lower.includes('vandaag')) {
                dayIdx = Math.max(0, new Date().getDay() - 1);
            }

            // Project detectie
            const matchedProject = PROJECTS.find(p =>
                p.name.toLowerCase().split(' ').some(word => word.length > 3 && lower.includes(word))
            );

            // Directe uren-invulling via NLP
            if (hours !== null && hours > 0 && hours <= 24 && dayIdx >= 0) {
                const weekNum = getWeekNumber();
                const year = new Date().getFullYear();
                const proj = uren2LoadData(user?.id, weekNum, year) || [{
                    id: 'p' + Date.now(), projectId: matchedProject?.id || '1',
                    types: { normaal: ['','','','',''] }, notes: { normaal: ['','','','',''] }
                }];
                // Zet uren op de juiste dag in het eerste project
                const target = matchedProject ? (proj.find(p => p.projectId === matchedProject.id) || proj[0]) : proj[0];
                if (target) {
                    const hrs = [...(target.types.normaal || ['','','','',''])];
                    hrs[dayIdx] = String(hours);
                    target.types.normaal = hrs;
                    if (matchedProject && !proj.find(p => p.projectId === matchedProject.id)) {
                        target.projectId = matchedProject.id;
                    }
                }
                uren2SaveData(user?.id, weekNum, year, proj);
                const DAY_NAMES = ['maandag','dinsdag','woensdag','donderdag','vrijdag'];
                const projName = PROJECTS.find(p => p.id === (target?.projectId || '1'))?.name || 'project';
                addBotMessage(`✅ Opgeslagen! ${hours} uur op ${DAY_NAMES[dayIdx]} voor ${projName}.\n\nWeek ${weekNum} bijgewerkt. 💪`, [
                    { label: '📋 Bekijk Urenregistratie', action: 'goto_uren' },
                    { label: '📝 Meer invullen', action: 'fill_template' },
                ]);
                return;
            }

            // Ziek / vrij detectie
            if (lower.includes('ziek') || lower.includes('ziekmelding')) {
                addBotMessage('Wil je een ziekmelding doorgeven voor vandaag? 🤒', [
                    { label: '🤒 Ja, meld ziek', action: 'fill_template' },
                    { label: '❌ Nee', action: 'later' }
                ]);
            } else if (lower.includes('uren') || lower.includes('urenstaat') || lower.includes('invullen') || lower.includes('uur')) {
                addBotMessage('Wil je je uren direct hier invullen of naar de volledige pagina? 📋', [
                    { label: '📝 Vul hier in', action: 'fill_template' },
                    { label: '📋 Naar Urenregistratie', action: 'goto_uren' }
                ]);
            } else if (lower.includes('project')) {
                addBotMessage('Wil je naar de projectenplanning? 📊', [
                    { label: '📊 Ga naar Projecten', action: 'goto_projecten' }
                ]);
            } else if (lower.includes('materieel') || lower.includes('gereedschap')) {
                addBotMessage('Wil je naar het materieelbeheer? 🔧', [
                    { label: '🔧 Ga naar Materieel', action: 'goto_materieel' }
                ]);
            } else if (lower.includes('hallo') || lower.includes('hey') || lower.includes('hoi')) {
                addBotMessage(`Hoi ${userName}! 👋 Hoe kan ik je helpen?\n\nJe kunt o.a. typen:\n• "vandaag 7.5 uur" om uren in te vullen\n• "maandag 8 uur op Bakker"\n• "uren invullen" voor het formulier`);
            } else if (lower.includes('help')) {
                addBotMessage('Ik kan je helpen met:\n• ⏱️ "vandaag 7.5 uur" → direct invullen\n• "maandag 8 uur op Bakker" → specifieke dag + project\n• 📝 "uren invullen" → weekformulier\n• 📊 "projecten" → projectplanning\n• 🔧 "materieel" → gereedschapsbeheer');
            } else {
                addBotMessage(`Tips om uren in te vullen:\n• Typ "vandaag 7.5 uur"\n• Of "maandag 8 uur op Wassenaar"\n\nOf typ "help" voor alle opties. 😊`);
            }
        }, 600);
    };

    const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    if (!user) return null;

    return (
        <>
            {/* ── Floating chatbot knop ── */}
            <button
                onClick={() => { setIsOpen(!isOpen); setShowPulse(false); }}
                style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    width: '64px', height: '64px',
                    borderRadius: '12px',
                    border: 'none', cursor: 'pointer', zIndex: 10000,
                    background: 'transparent',
                    padding: 0,
                    boxShadow: '0 4px 20px rgba(245,133,10,0.5), 0 2px 8px rgba(0,0,0,0.18)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: showPulse ? 'chatPulse 2s infinite' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.06)';
                    e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,133,10,0.7), 0 2px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,133,10,0.5), 0 2px 8px rgba(0,0,0,0.18)';
                }}
            >
                {isOpen
                    ? (
                        <div style={{
                            width: '100%', height: '100%',
                            background: 'linear-gradient(145deg, #FA9F52, #F5850A)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <i className="fa-solid fa-xmark" style={{ fontSize: '1.5rem', color: '#fff' }}></i>
                        </div>
                    )
                    : (
                        <img
                            src="/logo aangepast.png?v=1"
                            alt="DS Assistent"
                            style={{ width: '64px', height: '64px', display: 'block', objectFit: 'cover' }}
                        />
                    )
                }
            </button>

            {showPulse && !isOpen && (
                <div style={{
                    position: 'fixed', bottom: '68px', right: '24px', zIndex: 10001,
                    background: '#ef4444', color: '#fff', borderRadius: '12px',
                    padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700,
                    animation: 'chatBounce 1s infinite'
                }}>1</div>
            )}

            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '92px', right: '24px', width: '380px', maxHeight: '560px',
                    borderRadius: '16px', overflow: 'hidden', zIndex: 10000,
                    boxShadow: '0 12px 48px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex', flexDirection: 'column', background: '#fff',
                    animation: 'chatSlideIn 0.25s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #FA9F52, #F5850A)',
                        padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px',
                        flexShrink: 0
                    }}>
                        <img
                            src="/logo aangepast.png?v=1"
                            alt="DS Assistent"
                            style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'block', objectFit: 'cover' }}
                        />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{BOT_NAME}</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                                <i className="fa-solid fa-circle" style={{ fontSize: '0.3rem', color: '#4ade80', marginRight: '4px' }}></i>
                                Online • SchildersApp
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '14px', display: 'flex',
                        flexDirection: 'column', gap: '10px', background: '#f8fafc',
                        maxHeight: '400px', minHeight: '180px'
                    }}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '88%', padding: '9px 13px', borderRadius: '12px',
                                    fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-line',
                                    background: msg.from === 'user'
                                        ? 'linear-gradient(135deg, #FA9F52, #F5850A)' : '#fff',
                                    color: msg.from === 'user' ? '#fff' : '#1e293b',
                                    boxShadow: msg.from === 'user'
                                        ? '0 2px 8px rgba(245,133,10,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                                    borderBottomRightRadius: msg.from === 'user' ? '4px' : '12px',
                                    borderBottomLeftRadius: msg.from === 'bot' ? '4px' : '12px',
                                }}>
                                    {msg.text}
                                </div>
                                {msg.actions && (
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {msg.actions.map((a, i) => (
                                            <button key={i} onClick={() => handleAction(a.action)}
                                                style={{
                                                    padding: '5px 12px', borderRadius: '18px', border: '1px solid #FA9F52',
                                                    background: '#fff', color: '#F5850A', fontSize: '0.7rem',
                                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF7ED'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                                            >{a.label}</button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginTop: '3px', paddingLeft: '4px' }}>
                                    {formatTime(msg.time)}
                                </div>
                            </div>
                        ))}

                        {showTemplate && (
                            <div style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                                <InlineUrenstaat
                                    onSave={handleSaveTemplate}
                                    onCancel={() => { setShowTemplate(false); addBotMessage('Geen probleem! Je kunt later invullen. ⏰'); }}
                                    allowedTypes={getUserUrenTypes(user?.id)}
                                />
                            </div>
                        )}

                        {/* Employee WhatsApp picker */}
                        {showEmployeePicker && (
                            <div style={{
                                alignSelf: 'flex-start', maxWidth: '100%', width: '100%',
                                background: '#fff', borderRadius: '12px', padding: '12px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '1.1rem' }}></i>
                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>Kies medewerker</span>
                                </div>
                                {allEmployees.map(emp => (
                                    <div key={emp.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
                                        border: '1px solid #e2e8f0', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#25D366'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                        onClick={() => {
                                            const msg = `Hoi ${emp.name.split(' ')[0]}! 👋 Dit is een herinnering van SchildersApp.\n\nJe urenstaat voor deze week is nog niet ingevuld.\n\n📋 Vul je uren in: ${APP_URL}/uren\n\nReageer met ✅ als je klaar bent!`;
                                            window.open(`https://wa.me/${emp.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                            setShowEmployeePicker(false);
                                            addBotMessage(`📱 WhatsApp geopend voor ${emp.name}! Ze kunnen direct antwoorden.`);
                                        }}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #FA9F52, #F5850A)',
                                            color: '#fff', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0
                                        }}>{emp.initials}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{emp.role} • +{emp.phone}</div>
                                        </div>
                                        <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '1.2rem' }}></i>
                                    </div>
                                ))}
                                <button onClick={() => { setShowEmployeePicker(false); }}
                                    style={{
                                        width: '100%', padding: '5px', marginTop: '4px',
                                        border: '1px solid #e2e8f0', borderRadius: '6px',
                                        background: '#fff', color: '#94a3b8', cursor: 'pointer',
                                        fontSize: '0.68rem', fontWeight: 600
                                    }}>Sluiten</button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '10px 14px', borderTop: '1px solid #e2e8f0',
                        display: 'flex', gap: '8px', background: '#fff', flexShrink: 0
                    }}>
                        <input
                            type="text" value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                            placeholder="Typ een bericht..."
                            style={{
                                flex: 1, border: '1px solid #e2e8f0', borderRadius: '24px',
                                padding: '8px 14px', fontSize: '0.8rem', outline: 'none',
                                background: '#f8fafc', color: '#1e293b'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#FA9F52'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                        />
                        <button onClick={handleSend} style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #FA9F52, #F5850A)',
                            color: '#fff', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem',
                            flexShrink: 0
                        }}>
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes chatPulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(245,133,10,0.4); }
                    50% { box-shadow: 0 4px 30px rgba(245,133,10,0.7), 0 0 0 8px rgba(245,133,10,0.15); }
                }
                @keyframes chatBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes chatSlideIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
