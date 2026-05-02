'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';


const MONTH_NAMES_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function MedewerkerWerkbonnen() {
    const { user } = useAuth();
    const [view, setView] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('nieuw') === '1' ? 'nieuw' : 'snel';
        }
        return 'lijst';
    });
    const [bonnen, setBonnen] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [fout, setFout] = useState(null);
    const [snelNaam, setSnelNaam] = useState('');
    const [snelUren, setSnelUren] = useState('');
    const [snelDatum, setSnelDatum] = useState(new Date().toISOString().slice(0, 10));
    const [snelSaving, setSnelSaving] = useState(false);
    const [snelSaved, setSnelSaved] = useState(false);
    const [snelFout, setSnelFout] = useState(null);
    const [form, setForm] = useState({
        naam: '',
        uren: '',
        projectId: '',
    });

    useEffect(() => {
        fetch('/api/projecten')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setProjects(data.map(p => ({
                        id: String(p.id),
                        name: p.name,
                        client: p.client || '',
                        address: p.address || '',
                        phone: p.phone || '',
                        status: p.status || '',
                    })));
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        setLoading(true);
        fetch(`/api/werkbonnen?medewerker_id=${user.id}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setBonnen(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    function setField(key, val) {
        setForm(f => ({ ...f, [key]: val }));
    }

    const selectedProject = form.projectId ? projects.find(p => p.id === form.projectId) : null;
    const canSubmit = form.naam.trim();

    async function handleSubmit() {
        if (!canSubmit) return;
        setSaving(true);
        setFout(null);
        try {
            const res = await fetch('/api/werkbonnen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medewerkerId: user?.id,
                    medewerkerNaam: user?.name,
                    naam: form.naam.trim(),
                    datum: new Date().toISOString().slice(0, 10),
                    uren: form.uren ? parseFloat(form.uren) : null,
                    projectId: selectedProject?.id || null,
                    projectNaam: selectedProject?.name || null,
                    opdrachtgever: selectedProject?.client || null,
                    werkadres: selectedProject?.address || null,
                    telefoon: selectedProject?.phone || null,
                    projectActief: selectedProject ? selectedProject.status === 'active' : null,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                sessionStorage.setItem('pendingWerkbon', JSON.stringify({ id: data.id, naam: form.naam.trim() }));
                setSaved(true);
                setTimeout(() => { window.location.href = '/medewerker/planning'; }, 1000);
            } else {
                setFout(data.error || 'Opslaan mislukt');
            }
        } catch (e) {
            setFout('Verbindingsfout: ' + e.message);
        }
        setSaving(false);
    }

    async function snelOpslaan() {
        if (!snelNaam.trim()) return;
        setSnelSaving(true);
        setSnelFout(null);
        try {
            const res = await fetch('/api/werkbonnen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medewerkerId: user?.id,
                    medewerkerNaam: user?.name,
                    naam: snelNaam.trim(),
                    datum: snelDatum,
                    uren: snelUren ? parseFloat(snelUren) : null,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                setSnelSaved(true);
                setSnelNaam('');
                setSnelUren('');
                setSnelDatum(new Date().toISOString().slice(0, 10));
                setBonnen(prev => [{ id: data.id, naam: snelNaam.trim(), datum: snelDatum, uren: snelUren ? parseFloat(snelUren) : null, medewerkerNaam: user?.name }, ...prev]);
                setTimeout(() => setSnelSaved(false), 2500);
            } else {
                setSnelFout(data.error || 'Opslaan mislukt');
            }
        } catch (e) {
            setSnelFout('Verbindingsfout');
        }
        setSnelSaving(false);
    }

    if (view === 'nieuw') return (
        <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => { setView('lijst'); window.history.replaceState(null, '', '/medewerker/werkbonnen'); }} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#475569' }}>
                    <i className="fa-solid fa-chevron-left" />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Werkbon aanmaken</h2>
            </div>

            {saved ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#10b981' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', marginBottom: '12px', display: 'block' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Werkbon opgeslagen!</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>Je gaat zo naar de planning...</div>
                </div>
            ) : (<>
                {/* Naam werkbon */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Naam werkbon *</label>
                    <input
                        type="text"
                        value={form.naam}
                        onChange={e => setField('naam', e.target.value)}
                        placeholder="Bijv. Buitenschilderwerk dag 1"
                        style={inputStyle}
                        autoFocus
                    />
                </div>

                {/* Project koppelen */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>Project koppelen <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optioneel)</span></label>
                    <select value={form.projectId} onChange={e => setField('projectId', e.target.value)} style={inputStyle}>
                        <option value="">— Geen project —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    {/* Project info kaart */}
                    {selectedProject && (
                        <div style={{ marginTop: '10px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <span style={{
                                    fontSize: '0.86rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                                    background: selectedProject.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                    color: selectedProject.status === 'active' ? '#16a34a' : '#64748b',
                                }}>
                                    {selectedProject.status === 'active' ? 'Actief' : 'Inactief'}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gap: '7px' }}>
                                {selectedProject.name && (
                                    <div style={infoRow}>
                                        <span style={infoLabel}>Projectnaam</span>
                                        <span style={infoValue}>{selectedProject.name}</span>
                                    </div>
                                )}
                                {selectedProject.client && (
                                    <div style={infoRow}>
                                        <span style={infoLabel}>Opdrachtgever</span>
                                        <span style={infoValue}>{selectedProject.client}</span>
                                    </div>
                                )}
                                {selectedProject.address && (
                                    <div style={infoRow}>
                                        <span style={infoLabel}>Werkadres</span>
                                        <span style={infoValue}>{selectedProject.address}</span>
                                    </div>
                                )}
                                {selectedProject.phone && (
                                    <div style={infoRow}>
                                        <span style={infoLabel}>Telefoon</span>
                                        <span style={infoValue}>{selectedProject.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Foutmelding */}
                {fout && (
                    <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.84rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-exclamation" />
                        {fout}
                    </div>
                )}

                {/* Opslaan */}
                <button onClick={handleSubmit} disabled={!canSubmit || saving} style={{
                    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                    cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
                    background: canSubmit ? 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)' : '#e2e8f0',
                    color: canSubmit ? '#fff' : '#94a3b8',
                    fontWeight: 800, fontSize: '1rem',
                    boxShadow: canSubmit ? '0 6px 20px rgba(245,133,10,0.4)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                    {saving
                        ? <><i className="fa-solid fa-spinner fa-spin" /> Opslaan...</>
                        : <><i className="fa-solid fa-save" /> Werkbon opslaan</>}
                </button>
            </>)}
        </div>
    );

    // Lijst view
    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-file-pen" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Werkbonnen</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.87rem' }}>Maak werkbonnen aan en beheer ze</div>
                    </div>
                </div>
            </div>
        <div style={{ padding: '16px' }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '18px', background: '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
                {[
                    { key: 'snel', label: 'Snel aanmaken', icon: 'fa-bolt' },
                    { key: 'lijst', label: 'Mijn bonnen', icon: 'fa-list' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setView(tab.key)} style={{
                        flex: 1, padding: '9px 12px', border: 'none', borderRadius: '9px', cursor: 'pointer',
                        background: view === tab.key ? '#fff' : 'transparent',
                        color: view === tab.key ? '#F5850A' : '#64748b',
                        fontWeight: view === tab.key ? 800 : 600,
                        fontSize: '0.82rem',
                        boxShadow: view === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.15s',
                    }}>
                        <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '0.92rem' }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── SNEL AANMAKEN TAB ─── */}
            {view === 'snel' && (
                <div>
                    {snelSaved && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', color: '#16a34a', fontWeight: 700, fontSize: '0.88rem' }}>
                            <i className="fa-solid fa-circle-check" style={{ fontSize: '1.1rem' }} />
                            Werkbon opgeslagen! Je baas koppelt hem later aan het juiste project.
                        </div>
                    )}
                    <div style={{ background: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1.5px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                            Snel een werkbon aanmaken
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={labelStyle}>Wat heb je gedaan? *</label>
                            <input type="text" value={snelNaam} onChange={e => setSnelNaam(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && snelNaam.trim()) snelOpslaan(); }}
                                placeholder="Bijv. Spoedklus schilderen kozijnen" style={inputStyle} autoFocus />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <label style={labelStyle}>Aantal uur</label>
                                <input type="number" min="0" step="0.5" value={snelUren}
                                    onChange={e => setSnelUren(e.target.value)} placeholder="bijv. 3.5" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Datum</label>
                                <input type="date" value={snelDatum} onChange={e => setSnelDatum(e.target.value)} style={inputStyle} />
                            </div>
                        </div>
                        {snelFout && (
                            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.84rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-circle-exclamation" /> {snelFout}
                            </div>
                        )}
                        <button onClick={snelOpslaan} disabled={!snelNaam.trim() || snelSaving} style={{
                            width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                            cursor: snelNaam.trim() && !snelSaving ? 'pointer' : 'not-allowed',
                            background: snelNaam.trim() ? 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)' : '#e2e8f0',
                            color: snelNaam.trim() ? '#fff' : '#94a3b8',
                            fontWeight: 800, fontSize: '1rem',
                            boxShadow: snelNaam.trim() ? '0 6px 20px rgba(245,133,10,0.35)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}>
                            {snelSaving ? <><i className="fa-solid fa-spinner fa-spin" /> Opslaan...</> : <><i className="fa-solid fa-bolt" /> Snel opslaan</>}
                        </button>
                        <div style={{ marginTop: '12px', fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center' }}>
                            Project wordt later door je baas gekoppeld
                        </div>
                    </div>
                </div>
            )}

            {/* ─── LIJST TAB ─── */}
            {view === 'lijst' && (<>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#94a3b8' }}>{bonnen.length} werkbon{bonnen.length !== 1 ? 'nen' : ''}</span>
                    <button onClick={() => setView('nieuw')} style={{
                        background: '#fff8f0', color: '#F5850A', border: '1.5px solid #F5850A',
                        borderRadius: '10px', padding: '7px 14px', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <i className="fa-solid fa-plus" /> Uitgebreid aanmaken
                    </button>
                </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem' }} />
                </div>
            ) : bonnen.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0' }}>
                    <i className="fa-solid fa-file-pen" style={{ fontSize: '2.5rem', marginBottom: '12px', display: 'block', opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#64748b', marginBottom: '6px' }}>Geen werkbonnen</div>
                    <div style={{ fontSize: '0.82rem' }}>Maak je eerste werkbon aan.</div>
                </div>
            ) : bonnen.map(bon => (
                <div key={bon.id} style={{ background: '#fff', borderRadius: '14px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9', display: 'flex' }}>
                    <div style={{ width: '5px', background: '#F5850A', flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{bon.naam}</div>
                            <div style={{ fontSize: '0.71rem', color: '#94a3b8', flexShrink: 0, marginLeft: '8px', background: '#f8fafc', padding: '2px 7px', borderRadius: '6px', fontWeight: 600 }}>{formatDate(bon.datum)}</div>
                        </div>
                        {bon.projectNaam && (
                            <div style={{ fontSize: '0.77rem', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-folder-tree" style={{ color: '#F5850A', fontSize: '0.86rem' }} />
                                {bon.projectNaam}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {bon.uren && (
                                <span style={{ fontSize: '0.87rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: '#f0f9ff', color: '#0891b2', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-clock" /> {bon.uren}u
                                </span>
                            )}
                            {bon.opdrachtgever && (
                                <span style={{ fontSize: '0.87rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: '#f8fafc', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-building" /> {bon.opdrachtgever}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            </>)}
        </div>
        </div>
    );
}

const labelStyle = {
    display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px',
};
const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '0.9rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box',
};
const infoRow = {
    display: 'flex', gap: '8px', alignItems: 'baseline',
};
const infoLabel = {
    fontSize: '0.87rem', color: '#94a3b8', fontWeight: 600, minWidth: '90px', flexShrink: 0,
};
const infoValue = {
    fontSize: '0.82rem', color: '#1e293b', fontWeight: 500,
};
