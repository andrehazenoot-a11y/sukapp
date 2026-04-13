'use client';

import { useState, useRef, useEffect } from 'react';
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
    // ── Documenten ──
    const [docs, setDocs]           = useState([]);
    const [docViewer, setDocViewer] = useState(null); // { titel, data, type }

    useEffect(() => {
        if (!user) return;
        fetch('/api/documenten').then(r => r.json()).then(data => { if (Array.isArray(data)) setDocs(data); }).catch(() => {});

        const onMsg = (e) => {
            if (e.data?.type !== 'gelezen') return;
            const { docId, userId, naam, timestamp } = e.data;
            setDocs(prev => prev.map(d => d.id !== docId ? d : {
                ...d, gelezen: [...(d.gelezen || []), { userId, naam, timestamp }]
            }));
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, [user]);

    async function bevestigGelezen(id) {
        try {
            const res = await fetch(`/api/documenten/${id}/gelezen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, naam: user.name }),
            });
            const data = await res.json();
            if (data.ok) {
                setDocs(prev => prev.map(d => d.id !== id ? d : {
                    ...d,
                    gelezen: [...(d.gelezen || []), { userId: user.id, naam: user.name, timestamp: data.timestamp }],
                }));
            }
        } catch {}
    }

    async function verwijderDoc(id) {
        await fetch(`/api/documenten/${id}`, { method: 'DELETE' }).catch(() => {});
        setDocs(prev => prev.filter(d => d.id !== id));
    }

    function bekijkDoc(doc) {
        const isPdf = doc.type === 'application/pdf';
        const gelezenDoor = (doc.gelezen || []).find(g => g.userId === user?.id);
        const viewerUrl = isPdf
            ? `/api/documenten/${doc.id}/viewer?userId=${user?.id}&naam=${encodeURIComponent(user?.name || '')}&gelezen=${gelezenDoor ? '1' : '0'}`
            : `/api/documenten/${doc.id}/bestand`;
        setDocViewer({ id: doc.id, titel: doc.titel, url: viewerUrl, type: doc.type });
    }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
                <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Formulieren & Documenten</h3>
            </div>

            {/* ── Documenten & Aanvinken ── */}
            <Section icon="fa-file-pdf" title="Documenten" color="#e11d48" defaultOpen={true}>


                {/* Lege staat */}
                {docs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 16px', color: '#94a3b8' }}>
                        <i className="fa-solid fa-file-pdf" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', opacity: 0.25 }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nog geen documenten</div>
                        {user?.role === 'Beheerder' && <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>Upload hierboven een PDF of document</div>}
                    </div>
                )}

                {/* Documentenlijst */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {docs.map(doc => {
                        const gelezenEntry = (doc.gelezen || []).find(g => g.userId === user?.id);
                        const heeftGelezen = !!gelezenEntry;
                        const isPdf = doc.type === 'application/pdf';
                        const isAfb = doc.type?.startsWith('image/');
                        return (
                            <div key={doc.id} style={{ background: heeftGelezen ? '#f0fdf4' : '#fff', border: `1.5px solid ${heeftGelezen ? '#86efac' : '#f1f5f9'}`, borderRadius: '13px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    {/* Icoon */}
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isPdf ? '#fff1f2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fa-solid ${isPdf ? 'fa-file-pdf' : isAfb ? 'fa-image' : 'fa-file-lines'}`}
                                            style={{ color: isPdf ? '#e11d48' : '#3b82f6', fontSize: '1rem' }} />
                                    </div>
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titel}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                            {doc.bestandsnaam} · {doc.geuploadDoor} · {new Date(doc.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                    {/* Beheerder: verwijder */}
                                    {user?.role === 'Beheerder' && (
                                        <button onClick={() => verwijderDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: '0.85rem', padding: '2px 4px', flexShrink: 0 }}>
                                            <i className="fa-solid fa-trash" />
                                        </button>
                                    )}
                                </div>

                                {/* Knoppen: bekijken + aanvinken */}
                                <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
                                    <button onClick={() => bekijkDoc(doc)}
                                        style={{ flex: 1, padding: '8px', borderRadius: '9px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        <i className="fa-solid fa-eye" />Bekijken
                                    </button>
                                    {heeftGelezen ? (
                                        <div style={{ flex: 1, padding: '8px 10px', borderRadius: '9px', border: '1.5px solid #86efac', background: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>
                                                <i className="fa-solid fa-circle-check" />Gelezen ✓
                                            </div>
                                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                                {gelezenEntry?.naam || user?.name} · {gelezenEntry?.timestamp ? new Date(gelezenEntry.timestamp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + ' ' + new Date(gelezenEntry.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => bevestigGelezen(doc.id)}
                                            style={{ flex: 1, padding: '8px', borderRadius: '9px', border: '1.5px solid #fde8cc', background: '#fff8f0', color: '#F5850A', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                            <i className="fa-solid fa-circle-check" />Aanvinken
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Section>

            {/* Document viewer modal */}
            {docViewer && (() => {
                const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                const isPdf = docViewer.type === 'application/pdf';
                const gelezenEntry = (docs.find(d => d.id === docViewer.id)?.gelezen || []).find(g => g.userId === user?.id);
                return (
                    <>
                        <div onClick={() => setDocViewer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400 }} />
                        <div style={{ position: 'fixed', inset: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '700px', background: '#fff', zIndex: 410, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{docViewer.titel}</span>
                                <button onClick={() => setDocViewer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: '2px 6px' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                {docViewer.type?.startsWith('image/') ? (
                                    <img src={docViewer.url} alt={docViewer.titel} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <iframe src={`${docViewer.url}#view=FitH&pagemode=none`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} title={docViewer.titel} />
                                )}
                            </div>
                        </div>
                    </>
                );
            })()}

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
