'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

const KLEUREN = [
    { id: 'wit',   bg: '#ffffff', border: '#e2e8f0' },
    { id: 'geel',  bg: '#fef9c3', border: '#fde047' },
    { id: 'groen', bg: '#f0fdf4', border: '#86efac' },
    { id: 'blauw', bg: '#eff6ff', border: '#93c5fd' },
];

function saveNotities(userId, items) {
    try { localStorage.setItem(`schildersapp_notities_${userId}`, JSON.stringify(items)); } catch {}
}
function loadNotities(userId) {
    try { return JSON.parse(localStorage.getItem(`schildersapp_notities_${userId}`) || '[]'); } catch { return []; }
}

export default function NotitiesPage() {
    const { user } = useAuth();
    const [notities, setNotities] = useState([]);
    const [modal, setModal] = useState(null); // null | 'memo' | 'checklist'
    const [titel, setTitel] = useState('');
    const [inhoud, setInhoud] = useState('');
    const [kleur, setKleur] = useState('wit');
    const [checkItems, setCheckItems] = useState([]);
    const [nieuwItem, setNieuwItem] = useState('');
    const nieuwItemRef = useRef();

    useEffect(() => {
        if (!user) return;
        fetch(`/api/notities?userId=${user.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setNotities(data);
                    saveNotities(user.id, data);
                } else {
                    setNotities(loadNotities(user.id));
                }
            })
            .catch(() => setNotities(loadNotities(user.id)));
    }, [user]);

    function syncNaarApi(notitie) {
        fetch('/api/notities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: String(user.id), userName: user.name, notitie }),
        }).catch(() => {});
    }

    function opslaan() {
        if (!titel.trim()) return;
        const item = {
            id: Date.now(),
            type: modal,
            titel: titel.trim(),
            inhoud: modal === 'memo' ? inhoud.trim() : '',
            items: modal === 'checklist' ? checkItems : [],
            datum: new Date().toISOString(),
            kleur,
        };
        const updated = [item, ...notities];
        setNotities(updated);
        saveNotities(user.id, updated);
        syncNaarApi(item);
        sluitModal();
    }

    function sluitModal() {
        setModal(null); setTitel(''); setInhoud(''); setKleur('wit');
        setCheckItems([]); setNieuwItem('');
    }

    function verwijder(id) {
        if (!window.confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
        const updated = notities.filter(n => n.id !== id);
        setNotities(updated);
        saveNotities(user.id, updated);
        fetch('/api/notities', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, userId: String(user.id) }),
        }).catch(() => {});
    }

    function toggleCheck(notitieId, itemIdx) {
        const updated = notities.map(n => {
            if (n.id !== notitieId) return n;
            return { ...n, items: n.items.map((it, i) => i === itemIdx ? { ...it, gedaan: !it.gedaan } : it) };
        });
        setNotities(updated);
        saveNotities(user.id, updated);
        const gewijzigd = updated.find(n => n.id === notitieId);
        if (gewijzigd) syncNaarApi(gewijzigd);
    }

    function voegItemToe() {
        if (!nieuwItem.trim()) return;
        setCheckItems(prev => [...prev, { tekst: nieuwItem.trim(), gedaan: false }]);
        setNieuwItem('');
        setTimeout(() => nieuwItemRef.current?.focus(), 50);
    }

    const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', color: '#1e293b', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-note-sticky" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Mijn Notities</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.87rem' }}>Persoonlijke memo's en checklists</div>
                    </div>
                </div>
            </div>
        <div style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setModal('memo')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#fff8f0', border: '1.5px solid #fde8cc', borderRadius: '10px', color: '#F5850A', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                        <i className="fa-solid fa-note-sticky" /> Memo
                    </button>
                    <button onClick={() => setModal('checklist')} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', color: '#10b981', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                        <i className="fa-solid fa-list-check" /> Checklist
                    </button>
                </div>
            </div>
            </div>

            {/* Lege staat */}
            {notities.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-note-sticky" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Nog geen notities</div>
                    <div style={{ fontSize: '0.85rem' }}>Tik op Memo of Checklist om te beginnen</div>
                </div>
            )}

            {/* Notitie kaarten */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notities.map(n => {
                    const kl = KLEUREN.find(k => k.id === (n.kleur || 'wit')) || KLEUREN[0];
                    const gedaan = n.items?.filter(i => i.gedaan).length ?? 0;
                    const totaal = n.items?.length ?? 0;
                    return (
                        <div key={n.id} style={{ background: kl.bg, border: `1.5px solid ${kl.border}`, borderRadius: '14px', padding: '14px', position: 'relative' }}>
                            {/* Verwijder knop */}
                            <button onClick={() => verwijder(n.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.85rem', padding: '2px 6px', borderRadius: '6px' }}>
                                <i className="fa-solid fa-xmark" />
                            </button>

                            {/* Type badge + titel */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingRight: '24px' }}>
                                <i className={`fa-solid ${n.type === 'memo' ? 'fa-note-sticky' : 'fa-list-check'}`}
                                    style={{ color: n.type === 'memo' ? '#F5850A' : '#10b981', fontSize: '0.9rem' }} />
                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>{n.titel}</span>
                            </div>

                            {/* Memo inhoud */}
                            {n.type === 'memo' && n.inhoud && (
                                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{n.inhoud}</div>
                            )}

                            {/* Checklist items */}
                            {n.type === 'checklist' && n.items?.length > 0 && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
                                        {n.items.map((it, i) => (
                                            <div key={i} onClick={() => toggleCheck(n.id, i)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${it.gedaan ? '#10b981' : '#cbd5e1'}`, background: it.gedaan ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                                    {it.gedaan && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.9rem' }} />}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', color: it.gedaan ? '#94a3b8' : '#334155', textDecoration: it.gedaan ? 'line-through' : 'none', flex: 1 }}>{it.tekst}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Voortgang */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${totaal ? (gedaan / totaal) * 100 : 0}%`, background: gedaan === totaal && totaal > 0 ? '#10b981' : '#F5850A', borderRadius: '2px', transition: 'width 0.3s' }} />
                                        </div>
                                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: gedaan === totaal && totaal > 0 ? '#10b981' : '#94a3b8', flexShrink: 0 }}>{gedaan}/{totaal}</span>
                                    </div>
                                </>
                            )}

                            {/* Datum */}
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                {new Date(n.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {modal && (
                <>
                    <div onClick={sluitModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', zIndex: 310, maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 16px' }} />
                        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: modal === 'memo' ? '#F5850A' : '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className={`fa-solid ${modal === 'memo' ? 'fa-note-sticky' : 'fa-list-check'}`} />
                            {modal === 'memo' ? 'Nieuwe memo' : 'Nieuwe checklist'}
                        </h3>

                        {/* Titel */}
                        <input type="text" placeholder="Titel..." value={titel} onChange={e => setTitel(e.target.value)}
                            style={{ ...inputStyle, marginBottom: '10px', fontWeight: 600 }} autoFocus />

                        {/* Memo: vrije tekst */}
                        {modal === 'memo' && (
                            <textarea placeholder="Schrijf hier je memo..." value={inhoud} onChange={e => setInhoud(e.target.value)} rows={5}
                                style={{ ...inputStyle, resize: 'vertical', marginBottom: '10px' }} />
                        )}

                        {/* Checklist: items */}
                        {modal === 'checklist' && (
                            <div style={{ marginBottom: '10px' }}>
                                {checkItems.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <i className="fa-regular fa-square" style={{ color: '#cbd5e1', fontSize: '0.85rem', flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: '0.88rem', color: '#334155' }}>{it.tekst}</span>
                                        <button onClick={() => setCheckItems(p => p.filter((_,j) => j !== i))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.8rem', padding: 0 }}>
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                    <input ref={nieuwItemRef} type="text" placeholder="Item toevoegen..." value={nieuwItem}
                                        onChange={e => setNieuwItem(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && voegItemToe()}
                                        style={{ ...inputStyle, flex: 1 }} />
                                    <button onClick={voegItemToe} style={{ padding: '0 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>
                        )}

                        {/* Kleur kiezen */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                            {KLEUREN.map(k => (
                                <button key={k.id} onClick={() => setKleur(k.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: k.bg, border: `2.5px solid ${kleur === k.id ? '#F5850A' : k.border}`, cursor: 'pointer', transition: 'border-color 0.15s' }} />
                            ))}
                            <span style={{ fontSize: '0.87rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '4px' }}>kleur</span>
                        </div>

                        {/* Opslaan */}
                        <button onClick={opslaan} disabled={!titel.trim() || (modal === 'checklist' && checkItems.length === 0)}
                            style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: titel.trim() ? 'pointer' : 'default',
                                background: titel.trim() ? modal === 'memo' ? 'linear-gradient(135deg,#F5850A,#D96800)' : 'linear-gradient(135deg,#10b981,#059669)' : '#e2e8f0',
                                color: titel.trim() ? '#fff' : '#94a3b8' }}>
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '8px' }} />Opslaan
                        </button>
                    </div>
                </>
            )}
        </div>
        </div>
    );
}
