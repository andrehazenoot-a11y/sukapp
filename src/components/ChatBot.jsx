'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const BOT_NAME = 'DS Assistent';
const BOT_AVATAR = '🤖';

// App URL voor WhatsApp links (pas aan naar je productie-URL)
const APP_URL = 'https://schildersapp-katwijk.nl';

const PROJECTS = [
    { id: '1', name: 'Nieuwbouw Villa Wassenaar' },
    { id: '2', name: 'Onderhoud Rijtjeshuizen Leiden' },
    { id: '3', name: 'Renovatie Kantoorpand Den Haag' },
    { id: '4', name: 'Schilderwerk VVE De Branding' },
    { id: '5', name: 'Werkplaats / Magazijn' },
    { id: '6', name: 'Houtrot Reparatie Oegstgeest' },
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

// Inline urenstaat mini-form
function InlineUrenstaat({ onSave, onCancel }) {
    const [rows, setRows] = useState([
        { projectId: '1', hours: ['8', '8', '8', '8', '8'] }
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

    const addRow = () => {
        setRows([...rows, { projectId: '', hours: ['', '', '', '', ''] }]);
    };

    const removeRow = (ri) => {
        if (rows.length > 1) setRows(rows.filter((_, i) => i !== ri));
    };

    const getTotal = () => {
        return rows.reduce((sum, r) => sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0), 0);
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

            {rows.map((row, ri) => (
                <div key={ri} style={{ marginBottom: '8px' }}>
                    {/* Project select */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
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
                    {/* Day inputs */}
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
                                        border: `1.5px solid ${parseFloat(row.hours[di]) > 0 ? '#FA9F52' : '#e2e8f0'}`,
                                        borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                                        color: parseFloat(row.hours[di]) > 0 ? '#F5850A' : '#94a3b8',
                                        background: parseFloat(row.hours[di]) > 0 ? 'rgba(250,160,82,0.06)' : '#fff',
                                        outline: 'none', boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#FA9F52'; e.currentTarget.select(); }}
                                    onBlur={(e) => { if (!parseFloat(e.currentTarget.value)) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Add project button */}
            <button onClick={addRow} style={{
                width: '100%', padding: '4px', border: '1px dashed #d0d5dd', borderRadius: '6px',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px'
            }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FA9F52'; e.currentTarget.style.borderColor = '#FA9F52'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#d0d5dd'; }}
            >
                <i className="fa-solid fa-plus"></i> Project toevoegen
            </button>

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

            // ── 1. Urenstaat check ──
            const weekKey = getWeekKey();
            const urenData = JSON.parse(localStorage.getItem('schildersapp_uren') || '{}');
            const weekData = urenData[weekKey];
            let hasHours = false;
            if (weekData && typeof weekData === 'object') {
                Object.values(weekData).forEach(d => {
                    if (d && typeof d === 'object') Object.values(d).forEach(v => { if (v && parseFloat(v) > 0) hasHours = true; });
                });
            }

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
        const total = rows.reduce((sum, r) => sum + r.hours.reduce((s, h) => s + (parseFloat(h) || 0), 0), 0);
        const projectNames = rows
            .filter(r => r.projectId)
            .map(r => PROJECTS.find(p => p.id === r.projectId)?.name || 'Onbekend');

        setShowTemplate(false);
        addBotMessage(`✅ Opgeslagen! ${total} uur verdeeld over ${projectNames.join(', ')}.\n\nJe urenstaat voor week ${getWeekNumber()} is bijgewerkt. Ga naar de Urenstaat pagina om de volledige versie te zien.`, [
            { label: '📋 Bekijk Urenstaat', action: 'goto_uren' }
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
            addUserMessage('Ga naar Urenstaat');
            setTimeout(() => {
                addBotMessage('Top! Ik open de urenstaat voor je. 📋');
                setTimeout(() => { window.location.href = '/uren'; }, 800);
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
            if (lower.includes('uren') || lower.includes('urenstaat') || lower.includes('invullen')) {
                addBotMessage('Wil je je uren direct hier invullen of naar de volledige pagina? 📋', [
                    { label: '📝 Vul hier in', action: 'fill_template' },
                    { label: '📋 Ga naar Urenstaat', action: 'goto_uren' }
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
                addBotMessage(`Hoi ${userName}! 👋 Hoe kan ik je helpen?`);
            } else if (lower.includes('help')) {
                addBotMessage('Ik kan je helpen met:\n• 📝 Urenstaat invullen\n• 📊 Projecten bekijken\n• 🔧 Materieelbeheer\n\nTyp gewoon wat je wilt doen!');
            } else {
                addBotMessage(`Ik begrijp je nog niet helemaal 😅 Probeer "uren", "projecten" of "materieel". Of typ "help".`);
            }
        }, 600);
    };

    const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    if (!user) return null;

    return (
        <>
            {/* Floating chat button */}
            <button
                onClick={() => { setIsOpen(!isOpen); setShowPulse(false); }}
                style={{
                    position: 'fixed', bottom: '80px', right: '24px', width: '56px', height: '56px',
                    borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 10000,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    overflow: 'hidden', padding: 0,
                    background: '#ebebeb',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: showPulse ? 'chatPulse 2s infinite' : 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
                {isOpen
                    ? <i className="fa-solid fa-xmark" style={{ fontSize: '1.3rem', color: '#64748b' }}></i>
                    : <img src="/ds-logo-rond.png" alt="DS" style={{ width: '56px', height: '56px', display: 'block' }} />
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
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                        }}>{BOT_AVATAR}</div>
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
