'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

function getProjects() {
    try {
        const raw = localStorage.getItem('schildersapp_projecten');
        const arr = raw ? JSON.parse(raw) : [];
        return arr.map(p => ({ id: String(p.id), name: p.name }));
    } catch { return []; }
}

const VERLOF_TYPES = ['Vakantie', 'Bijzonder verlof', 'ADV', 'Zorgverlof', 'Onbetaald verlof'];

const OPLEVERING_ITEMS = [
    'Vloerbeschermers verwijderd',
    'Verfspetters verwijderd van ramen/kozijnen',
    'Lichtschakelaars schoongemaakt',
    'Stopcontacten schoongemaakt',
    'Alle deuren/ramen sluiten goed',
    'Kleur- en productinformatie overhandigd',
    'Restverf opgeslagen of afgevoerd',
    'Werkplek opgeruimd en bezem schoon',
    'Fotodocumentatie afgerond',
    'Klant rondleiding gedaan',
];

function Section({ icon, title, color, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ background: '#fff', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <button onClick={() => setOpen(v => !v)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1rem' }} />
                </div>
                <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{title}</span>
                <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.75rem' }} />
            </button>
            {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
        </div>
    );
}

export default function MedewerkerFormulieren() {
    const { user } = useAuth();
    const router = useRouter();
    const projects = getProjects();
    const fileInputRef = useRef();

    // Document upload state
    const [uploadProject, setUploadProject] = useState('');
    const [uploadCategory, setUploadCategory] = useState('documenten');
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState([]);

    // Verlof state
    const [verlof, setVerlof] = useState({ type: 'Vakantie', van: '', tot: '', reden: '' });
    const [verlofSaved, setVerlofSaved] = useState(false);

    // Oplevering checklist
    const [oplProject, setOplProject] = useState('');
    const [checks, setChecks] = useState({});
    const [oplSaved, setOplSaved] = useState(false);

    async function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (!files.length || !uploadProject) return;
        setUploading(true);
        setUploadResults([]);
        const results = [];
        for (const file of files) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('projectId', uploadProject);
                fd.append('category', uploadCategory);
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                const data = await res.json();
                results.push({ name: file.name, success: data.success, error: data.error });
            } catch { results.push({ name: file.name, success: false, error: 'Upload mislukt' }); }
        }
        setUploadResults(results);
        setUploading(false);
    }

    function handleVerlofSubmit() {
        if (!verlof.van || !verlof.tot) return;
        const key = `schildersapp_verlof_${user?.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ ...verlof, medewerkerId: user?.id, naam: user?.name, ingediend: new Date().toISOString(), status: 'aangevraagd' });
        localStorage.setItem(key, JSON.stringify(existing));
        setVerlofSaved(true);
        setTimeout(() => { setVerlofSaved(false); setVerlof({ type: 'Vakantie', van: '', tot: '', reden: '' }); }, 2000);
    }

    function handleOplSave() {
        if (!oplProject) return;
        const key = `schildersapp_oplevering_${oplProject}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ checks, medewerkerId: user?.id, naam: user?.name, datum: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
        setOplSaved(true);
        setTimeout(() => setOplSaved(false), 2000);
    }

    const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' };
    const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box' };
    const btnPrimary = { width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginTop: '4px' };

    return (
        <div style={{ padding: '16px' }}>
            <h2 style={{ margin: '0 0 18px', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Formulieren & Documenten</h2>

            {/* Toolbox meeting */}
            <Section icon="fa-screwdriver-wrench" title="Toolbox Meeting" color="#6366f1" defaultOpen={false}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px' }}>Vul een toolbox meeting formulier in.</p>
                <button onClick={() => router.push('/toolbox')} style={btnPrimary}>
                    <i className="fa-solid fa-arrow-right" style={{ marginRight: '8px' }} />Naar Toolbox Meeting
                </button>
            </Section>

            {/* Document & foto upload */}
            <Section icon="fa-upload" title="Bestanden uploaden" color="#0891b2" defaultOpen={true}>
                <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Project</label>
                    <select value={uploadProject} onChange={e => setUploadProject(e.target.value)} style={inputStyle}>
                        <option value="">— Selecteer project —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Categorie</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'documenten', label: 'Document', icon: 'fa-file' },
                            { id: 'fotos', label: "Foto's", icon: 'fa-camera' },
                            { id: 'wkb', label: 'WKB', icon: 'fa-clipboard-check' },
                            { id: 'werkbon', label: 'Werkbon', icon: 'fa-file-alt' },
                        ].map(c => (
                            <button key={c.id} onClick={() => setUploadCategory(c.id)} style={{
                                padding: '7px 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                border: `2px solid ${uploadCategory === c.id ? '#0891b2' : '#e2e8f0'}`,
                                background: uploadCategory === c.id ? '#e0f9ff' : '#fff',
                                color: uploadCategory === c.id ? '#0891b2' : '#94a3b8',
                            }}>
                                <i className={`fa-solid ${c.icon}`} style={{ marginRight: '4px' }} />{c.label}
                            </button>
                        ))}
                    </div>
                </div>

                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={!uploadProject || uploading}
                    style={{ ...btnPrimary, background: uploadProject ? 'linear-gradient(135deg, #0891b2, #0e7490)' : '#e2e8f0', color: uploadProject ? '#fff' : '#94a3b8', cursor: uploadProject ? 'pointer' : 'not-allowed' }}>
                    {uploading
                        ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} />Uploaden...</>
                        : <><i className="fa-solid fa-upload" style={{ marginRight: '8px' }} />Bestand(en) kiezen & uploaden</>}
                </button>

                {uploadResults.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {uploadResults.map((r, i) => (
                            <div key={i} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', background: r.success ? '#f0fdf4' : '#fef2f2', color: r.success ? '#16a34a' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className={`fa-solid ${r.success ? 'fa-check' : 'fa-exclamation-circle'}`} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                                {r.error && <span style={{ color: '#ef4444', fontWeight: 400 }}>— {r.error}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* Verlof aanvragen */}
            <Section icon="fa-umbrella-beach" title="Verlof aanvragen" color="#8b5cf6">
                {verlofSaved ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontWeight: 700 }}>
                        <i className="fa-solid fa-check-circle" style={{ display: 'block', fontSize: '2rem', marginBottom: '8px' }} />Verlofaanvraag ingediend!
                    </div>
                ) : (<>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Type verlof</label>
                        <select value={verlof.type} onChange={e => setVerlof(f => ({...f, type: e.target.value}))} style={inputStyle}>
                            {VERLOF_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Van</label>
                            <input type="date" value={verlof.van} onChange={e => setVerlof(f => ({...f, van: e.target.value}))} style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Tot en met</label>
                            <input type="date" value={verlof.tot} onChange={e => setVerlof(f => ({...f, tot: e.target.value}))} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ marginBottom: '14px' }}>
                        <label style={labelStyle}>Toelichting (optioneel)</label>
                        <input type="text" value={verlof.reden} onChange={e => setVerlof(f => ({...f, reden: e.target.value}))} placeholder="Bijv. gezinsvakantie..." style={inputStyle} />
                    </div>
                    <button onClick={handleVerlofSubmit} disabled={!verlof.van || !verlof.tot}
                        style={{ ...btnPrimary, background: verlof.van && verlof.tot ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#e2e8f0', color: verlof.van && verlof.tot ? '#fff' : '#94a3b8', cursor: verlof.van && verlof.tot ? 'pointer' : 'not-allowed' }}>
                        <i className="fa-solid fa-paper-plane" style={{ marginRight: '8px' }} />Aanvraag indienen
                    </button>
                </>)}
            </Section>

            {/* Opleveringschecklist */}
            <Section icon="fa-clipboard-check" title="Opleveringschecklist" color="#10b981">
                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Project</label>
                    <select value={oplProject} onChange={e => setOplProject(e.target.value)} style={inputStyle}>
                        <option value="">— Selecteer project —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                {OPLEVERING_ITEMS.map((item, i) => (
                    <div key={i} onClick={() => setChecks(c => ({ ...c, [i]: !c[i] }))} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0',
                        borderBottom: i < OPLEVERING_ITEMS.length - 1 ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer',
                    }}>
                        <div style={{
                            width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                            border: `2px solid ${checks[i] ? '#10b981' : '#e2e8f0'}`,
                            background: checks[i] ? '#10b981' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                        }}>
                            {checks[i] && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.6rem' }} />}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: checks[i] ? '#94a3b8' : '#1e293b', textDecoration: checks[i] ? 'line-through' : 'none' }}>{item}</span>
                    </div>
                ))}
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '10px 0 12px' }}>
                    {Object.values(checks).filter(Boolean).length}/{OPLEVERING_ITEMS.length} voltooid
                </div>
                {oplSaved ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                        <i className="fa-solid fa-check-circle" style={{ marginRight: '6px' }} />Checklist opgeslagen!
                    </div>
                ) : (
                    <button onClick={handleOplSave} disabled={!oplProject}
                        style={{ ...btnPrimary, background: oplProject ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0', color: oplProject ? '#fff' : '#94a3b8', cursor: oplProject ? 'pointer' : 'not-allowed' }}>
                        <i className="fa-solid fa-save" style={{ marginRight: '8px' }} />Checklist opslaan
                    </button>
                )}
            </Section>
        </div>
    );
}
