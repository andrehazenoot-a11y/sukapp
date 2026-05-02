'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';

function loadLS(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

const BEST_STATUS = {
    'Aangevraagd': { color: '#F5850A', bg: '#fff8f0', border: '#fdba74' },
    'Besteld':     { color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
    'Ontvangen':   { color: '#10b981', bg: '#f0fdf4', border: '#86efac' },
    'Afgewezen':   { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
};

export default function BestellijstPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [bestellingen, setBestellingen] = useState([]);
    const [notitieModal, setNotitieModal] = useState(null);
    const [notitieInput, setNotitieInput] = useState('');
    const [bestOpen, setBestOpen] = useState(false);
    const [bestForm, setBestForm] = useState({ product: '', aantal: '1', eenheid: 'stuk', opmerking: '' });
    const [zoek, setZoek] = useState('');

    useEffect(() => {
        if (!user) return;
        fetch(`/api/bestellingen?userId=${user.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setBestellingen(data);
                    saveLS(`schildersapp_bestellingen_${user.id}`, data);
                } else {
                    setBestellingen(loadLS(`schildersapp_bestellingen_${user.id}`, []));
                }
            })
            .catch(() => setBestellingen(loadLS(`schildersapp_bestellingen_${user.id}`, [])));
    }, [user]);

    function syncNaarApi(bestelling) {
        fetch('/api/bestellingen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: String(user.id), userName: user.name, bestelling }),
        }).catch(() => {});
    }

    function deleteBestelling(id) {
        if (!window.confirm('Bestelling verwijderen?')) return;
        const updated = bestellingen.filter(b => b.id !== id);
        setBestellingen(updated);
        saveLS(`schildersapp_bestellingen_${user.id}`, updated);
        fetch('/api/bestellingen', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, userId: String(user.id) }),
        }).catch(() => {});
    }

    function saveNotitie() {
        const updated = bestellingen.map(b => b.id === notitieModal.id ? { ...b, notitie: notitieInput } : b);
        setBestellingen(updated);
        saveLS(`schildersapp_bestellingen_${user.id}`, updated);
        fetch('/api/bestellingen', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notitieModal.id, userId: String(user.id), notitie: notitieInput }),
        }).catch(() => {});
        setNotitieModal(null);
    }

    function addBestelling() {
        if (!bestForm.product.trim()) return;
        const entry = {
            id: Date.now(),
            product: bestForm.product.trim(),
            aantal: bestForm.aantal || '1',
            eenheid: bestForm.eenheid || 'stuk',
            opmerking: bestForm.opmerking.trim(),
            status: 'Aangevraagd',
            ingediend: new Date().toISOString(),
        };
        const updated = [entry, ...bestellingen];
        setBestellingen(updated);
        saveLS(`schildersapp_bestellingen_${user.id}`, updated);
        syncNaarApi(entry);
        setBestForm({ product: '', aantal: '1', eenheid: 'stuk', opmerking: '' });
        setBestOpen(false);
    }

    const gefilterd = bestellingen.filter(b =>
        !zoek || b.product?.toLowerCase().includes(zoek.toLowerCase()) || b.opmerking?.toLowerCase().includes(zoek.toLowerCase())
    );

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '3px', height: '18px', background: '#F5850A', borderRadius: '2px' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Persoonlijke bestellijst</span>
                </div>
                <button onClick={() => setBestOpen(true)}
                    style={{ background: '#F5850A', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-plus" />Toevoegen
                </button>
            </div>

            {/* Totaal widget */}
            {(() => {
                const totaal = bestellingen.reduce((s, b) => s + (b.prijs || 0), 0);
                return totaal > 0 ? (
                    <div style={{ background: 'linear-gradient(135deg,#F5850A,#D96800)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: 600 }}>{bestellingen.filter(b => b.prijs).length} producten met prijs</span>
                        <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>€ {totaal.toFixed(2).replace('.', ',')}</span>
                    </div>
                ) : null;
            })()}

            {/* Zoekbalk */}
            {bestellingen.length > 3 && (
                <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
                    <input value={zoek} onChange={e => setZoek(e.target.value)}
                        placeholder="Zoek product..."
                        style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1e293b' }} />
                </div>
            )}

            {/* Lijst */}
            {gefilterd.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '36px 16px', textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
                    <i className="fa-solid fa-cart-shopping" style={{ fontSize: '2rem', color: '#cbd5e1', display: 'block', marginBottom: '10px' }} />
                    <div style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 600 }}>
                        {zoek ? 'Geen resultaten' : 'Nog geen bestellingen'}
                    </div>
                    {!zoek && (
                        <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '5px' }}>
                            Voeg materialen toe via de Materiaalbot
                        </div>
                    )}
                </div>
            ) : gefilterd.map(b => {
                const st = BEST_STATUS[b.status] || BEST_STATUS['Aangevraagd'];
                return (
                    <div key={b.id} style={{ background: '#fff', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 1px 5px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{b.product}</div>
                            <div style={{ fontSize: '0.87rem', color: '#64748b', marginTop: '2px' }}>
                                {b.aantal} {b.eenheid}{b.project ? ` · ${b.project}` : ''}{b.opmerking ? ` · ${b.opmerking}` : ''}
                            </div>
                            {b.notitie && (
                                <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '4px', background: '#f8fafc', borderRadius: '6px', padding: '3px 7px', display: 'inline-block' }}>
                                    <i className="fa-solid fa-note-sticky" style={{ color: '#F5850A', marginRight: '4px' }} />{b.notitie}
                                </div>
                            )}
                            {b.ingediend && (
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '3px' }}>
                                    <i className="fa-solid fa-clock" style={{ marginRight: '3px' }} />
                                    {new Date(b.ingediend).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {b.prijs != null && (
                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F5850A', marginBottom: '3px' }}>
                                    € {Number(b.prijs).toFixed(2).replace('.', ',')}
                                </div>
                            )}
                            <div style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: '999px', padding: '3px 9px', fontSize: '0.63rem', fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}>
                                {b.status}
                            </div>
                        </div>
                        <button onClick={() => { setNotitieModal({ id: b.id }); setNotitieInput(b.notitie || ''); }}
                            style={{ background: 'none', border: 'none', color: b.notitie ? '#F5850A' : '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem', padding: '2px', flexShrink: 0 }}
                            title="Notitie">
                            <i className="fa-solid fa-note-sticky" />
                        </button>
                        <button onClick={() => deleteBestelling(b.id)}
                            style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', padding: '2px', flexShrink: 0 }}>
                            <i className="fa-solid fa-trash" />
                        </button>
                    </div>
                );
            })}

            {/* Knop naar Materiaalbot */}
            <button onClick={() => router.push('/medewerker/materiaal')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#F5850A,#D96800)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,133,10,0.25)', marginTop: '4px' }}>
                <i className="fa-solid fa-magnifying-glass" />Zoek materialen via Materiaalbot
            </button>

            {/* Modal: Handmatig toevoegen */}
            {bestOpen && (
                <>
                    <div onClick={() => setBestOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', zIndex: 310, boxSizing: 'border-box' }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 18px' }} />
                        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                            <i className="fa-solid fa-plus" style={{ color: '#F5850A', marginRight: '8px' }} />Bestelling toevoegen
                        </h3>
                        <input value={bestForm.product} onChange={e => setBestForm(f => ({ ...f, product: e.target.value }))}
                            placeholder="Productnaam *"
                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '10px' }} />
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <input value={bestForm.aantal} onChange={e => setBestForm(f => ({ ...f, aantal: e.target.value }))}
                                placeholder="Aantal" type="number" min="1"
                                style={{ width: '80px', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                            <input value={bestForm.eenheid} onChange={e => setBestForm(f => ({ ...f, eenheid: e.target.value }))}
                                placeholder="Eenheid"
                                style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        </div>
                        <input value={bestForm.opmerking} onChange={e => setBestForm(f => ({ ...f, opmerking: e.target.value }))}
                            placeholder="Opmerking (optioneel)"
                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '14px' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setBestOpen(false)}
                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                Annuleren
                            </button>
                            <button onClick={addBestelling} disabled={!bestForm.product.trim()}
                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: bestForm.product.trim() ? '#F5850A' : '#e2e8f0', color: bestForm.product.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.9rem', cursor: bestForm.product.trim() ? 'pointer' : 'default' }}>
                                Toevoegen
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal: Notitie */}
            {notitieModal && (
                <>
                    <div onClick={() => setNotitieModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', zIndex: 310, boxSizing: 'border-box' }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 18px' }} />
                        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                            <i className="fa-solid fa-note-sticky" style={{ color: '#F5850A', marginRight: '8px' }} />Notitie
                        </h3>
                        <textarea value={notitieInput} onChange={e => setNotitieInput(e.target.value)}
                            placeholder="Schrijf een notitie bij dit product..."
                            rows={3} autoFocus
                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '14px' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setNotitieModal(null)}
                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                Annuleren
                            </button>
                            <button onClick={saveNotitie}
                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: '#F5850A', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                Opslaan
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
