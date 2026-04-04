'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

function getProjects() {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const arr = raw ? JSON.parse(raw) : [];
        return arr.map(p => ({ id: String(p.id), name: p.name, client: p.client || '', address: p.address || '' }));
    } catch { return []; }
}

function saveBon(bon) {
    try {
        const key = 'schildersapp_werkbonnen';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(bon);
        localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
}

function getBonnen() {
    try { return JSON.parse(localStorage.getItem('schildersapp_werkbonnen') || '[]'); } catch { return []; }
}

const MONTH_NAMES_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function MedewerkerWerkbonnen() {
    const { user } = useAuth();
    const [view, setView] = useState('lijst'); // 'lijst' | 'nieuw'
    const [bonnen, setBonnen] = useState([]);
    const [projects, setProjects] = useState([]);
    const [form, setForm] = useState({
        projectId: '',
        datum: new Date().toISOString().slice(0,10),
        omschrijving: '',
        uren: '',
        materialen: [{ naam: '', hoeveelheid: '' }],
        klantAkkoord: false,
        klantHandtekening: '',
    });
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef();

    useEffect(() => {
        setProjects(getProjects());
        setBonnen(getBonnen().filter(b => b.medewerkerId === user?.id));
    }, [user]);

    const selectedProject = projects.find(p => p.id === form.projectId);

    function setField(key, val) {
        setForm(f => ({ ...f, [key]: val }));
    }

    function addMateriaal() {
        setForm(f => ({ ...f, materialen: [...f.materialen, { naam: '', hoeveelheid: '' }] }));
    }

    function updateMateriaal(i, field, val) {
        setForm(f => {
            const m = [...f.materialen];
            m[i] = { ...m[i], [field]: val };
            return { ...f, materialen: m };
        });
    }

    function removeMateriaal(i) {
        setForm(f => ({ ...f, materialen: f.materialen.filter((_, idx) => idx !== i) }));
    }

    async function handlePhotoUpload(e) {
        const files = Array.from(e.target.files);
        if (!files.length || !form.projectId) return;
        setUploading(true);
        const uploaded = [];
        for (const file of files) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('projectId', form.projectId);
                fd.append('category', 'werkbon');
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.success) uploaded.push({ name: data.filename, url: data.url, original: data.originalName });
                else uploaded.push({ name: file.name, url: null, error: data.error });
            } catch { uploaded.push({ name: file.name, url: null, error: 'Upload mislukt' }); }
        }
        setPhotos(prev => [...prev, ...uploaded]);
        setUploading(false);
    }

    function handleSubmit() {
        if (!form.projectId || !form.omschrijving) return;
        const bon = {
            id: 'wb_' + Date.now(),
            medewerkerId: user?.id,
            medewerkerNaam: user?.name,
            ...form,
            photos,
            aangemaakt: new Date().toISOString(),
            projectNaam: selectedProject?.name || '',
        };
        saveBon(bon);
        setBonnen(prev => [bon, ...prev]);
        setSaved(true);
        setForm({ projectId: '', datum: new Date().toISOString().slice(0,10), omschrijving: '', uren: '', materialen: [{ naam: '', hoeveelheid: '' }], klantAkkoord: false, klantHandtekening: '' });
        setPhotos([]);
        setTimeout(() => { setSaved(false); setView('lijst'); }, 1500);
    }

    if (view === 'nieuw') return (
        <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setView('lijst')} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Nieuwe werkbon</h2>
            </div>

            {saved ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#10b981' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', marginBottom: '12px', display: 'block' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Werkbon opgeslagen!</div>
                </div>
            ) : (<>
                {/* Project */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Project *</label>
                    <select value={form.projectId} onChange={e => setField('projectId', e.target.value)} style={inputStyle}>
                        <option value="">— Selecteer project —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {selectedProject?.address && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                            <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }} />{selectedProject.address}
                        </div>
                    )}
                </div>

                {/* Datum */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Datum *</label>
                    <input type="date" value={form.datum} onChange={e => setField('datum', e.target.value)} style={inputStyle} />
                </div>

                {/* Omschrijving */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Omschrijving uitgevoerd werk *</label>
                    <textarea value={form.omschrijving} onChange={e => setField('omschrijving', e.target.value)}
                        placeholder="Beschrijf het uitgevoerde werk..."
                        rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>

                {/* Uren */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Gewerkte uren</label>
                    <input type="number" min="0" max="24" step="0.5" value={form.uren} onChange={e => setField('uren', e.target.value)} placeholder="Bijv. 7,5" style={inputStyle} />
                </div>

                {/* Materialen */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Gebruikte materialen</label>
                    {form.materialen.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <input type="text" value={m.naam} onChange={e => updateMateriaal(i, 'naam', e.target.value)}
                                placeholder="Materiaal naam" style={{ ...inputStyle, flex: 2, marginBottom: 0 }} />
                            <input type="text" value={m.hoeveelheid} onChange={e => updateMateriaal(i, 'hoeveelheid', e.target.value)}
                                placeholder="Hoev." style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
                            {form.materialen.length > 1 && (
                                <button onClick={() => removeMateriaal(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', flexShrink: 0 }}>
                                    <i className="fa-solid fa-trash" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addMateriaal} style={{ background: 'none', border: '1.5px dashed #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem', width: '100%' }}>
                        <i className="fa-solid fa-plus" style={{ marginRight: '5px' }} />Materiaal toevoegen
                    </button>
                </div>

                {/* Foto's */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Foto's & Documenten</label>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={!form.projectId || uploading}
                        style={{ width: '100%', padding: '12px', border: '2px dashed #e2e8f0', borderRadius: '10px', background: '#f8fafc', cursor: form.projectId ? 'pointer' : 'not-allowed', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                        {uploading ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />Uploaden...</>
                            : <><i className="fa-solid fa-camera" style={{ marginRight: '6px' }} />Foto's / documenten toevoegen</>}
                    </button>
                    {!form.projectId && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Selecteer eerst een project</div>}
                    {photos.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                            {photos.map((ph, i) => (
                                <div key={i} style={{ padding: '6px 10px', background: ph.error ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', fontSize: '0.75rem', color: ph.error ? '#ef4444' : '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <i className={`fa-solid ${ph.error ? 'fa-circle-exclamation' : 'fa-check'}`} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{ph.original || ph.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Klant akkoord */}
                <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <div style={{
                            width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${form.klantAkkoord ? '#10b981' : '#e2e8f0'}`,
                            background: form.klantAkkoord ? '#10b981' : 'transparent', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                        }} onClick={() => setField('klantAkkoord', !form.klantAkkoord)}>
                            {form.klantAkkoord && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.7rem' }} />}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>Klant akkoord</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Klant heeft het werk goedgekeurd</div>
                        </div>
                    </label>
                    {form.klantAkkoord && (
                        <input type="text" value={form.klantHandtekening} onChange={e => setField('klantHandtekening', e.target.value)}
                            placeholder="Naam klant (ter bevestiging)" style={{ ...inputStyle, marginTop: '10px', marginBottom: 0 }} />
                    )}
                </div>

                {/* Opslaan */}
                <button onClick={handleSubmit} disabled={!form.projectId || !form.omschrijving} style={{
                    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                    cursor: form.projectId && form.omschrijving ? 'pointer' : 'not-allowed',
                    background: form.projectId && form.omschrijving ? 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)' : '#e2e8f0',
                    color: form.projectId && form.omschrijving ? '#fff' : '#94a3b8',
                    fontWeight: 800, fontSize: '1rem',
                    boxShadow: form.projectId && form.omschrijving ? '0 6px 20px rgba(245,133,10,0.4)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                    <i className="fa-solid fa-save" />Werkbon opslaan
                </button>
            </>)}
        </div>
    );

    // Lijst view
    return (
        <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                    <h2 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Werkbonnen</h2>
                </div>
                <button onClick={() => setView('nieuw')} style={{
                    background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', color: '#fff', border: 'none',
                    borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(245,133,10,0.35)', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    <i className="fa-solid fa-plus" />Nieuwe bon
                </button>
            </div>

            {bonnen.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0' }}>
                    <i className="fa-solid fa-file-alt" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#64748b', marginBottom: '6px' }}>Geen werkbonnen</div>
                    <div style={{ fontSize: '0.82rem' }}>Maak je eerste werkbon aan.</div>
                </div>
            ) : bonnen.slice().reverse().map(bon => (
                <div key={bon.id} style={{ background: '#fff', borderRadius: '14px', padding: '0', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', display: 'flex' }}>
                    <div style={{ width: '5px', background: '#F5850A', flexShrink: 0, opacity: 0.7 }} />
                    <div style={{ flex: 1, padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{bon.projectNaam}</div>
                            <div style={{ fontSize: '0.71rem', color: '#94a3b8', flexShrink: 0, marginLeft: '8px', background: '#f8fafc', padding: '2px 7px', borderRadius: '6px', fontWeight: 600 }}>{formatDate(bon.datum)}</div>
                        </div>
                        <div style={{ fontSize: '0.79rem', color: '#64748b', marginBottom: '9px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {bon.omschrijving}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {bon.uren && <span style={badgeStyle('#f0f9ff', '#0891b2')}><i className="fa-solid fa-clock" /> {bon.uren}u</span>}
                            {bon.photos?.length > 0 && <span style={badgeStyle('#f0fdf4', '#16a34a')}><i className="fa-solid fa-image" /> {bon.photos.length} foto{bon.photos.length !== 1 ? "'s" : ''}</span>}
                            {bon.klantAkkoord && <span style={badgeStyle('#f0fdf4', '#16a34a')}><i className="fa-solid fa-check" /> Klant akkoord</span>}
                            {bon.materialen?.some(m => m.naam) && <span style={badgeStyle('#fff8f0', '#ea580c')}><i className="fa-solid fa-box" /> Materiaal</span>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const labelStyle = {
    display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px',
};
const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '0.9rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box', marginBottom: '0',
};
function badgeStyle(bg, color) {
    return { fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: bg, color, display: 'flex', alignItems: 'center', gap: '4px' };
}
