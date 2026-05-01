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


    const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' };
    const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.88rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box' };
    const btnPrimary = { width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #F5850A, #E07000)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginTop: '4px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-folder-open" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Formulieren & Documenten</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>Bekijk en download documenten</div>
                    </div>
                </div>
            </div>
        <div style={{ padding: '16px' }}>


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

        </div>
        </div>
    );
}
