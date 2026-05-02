'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

export default function MedewerkerWerkbon() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [werkbonTab, setWerkbonTab] = useState('kaart');
    const [previewAtt, setPreviewAtt] = useState(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [notities, setNotities] = useState([]);
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
    const [fotoUploading, setFotoUploading] = useState(false);
    const [localChecklist, setLocalChecklist] = useState([]);
    const checklistSyncRef = useRef(null);
    const selectedIdRef = useRef(null);
    const cameraInputRef = useRef(null);


    useEffect(() => {
        const userId = Number(user?.id);
        const applyProjects = (all) => {
            const mine = all.filter(p =>
                (p.tasks || []).some(t =>
                    (t.assignedTo || []).map(x => Number(typeof x === 'object' ? x.id : x)).includes(userId)
                )
            );
            setProjects(mine);
            if (!selectedIdRef.current && mine.length === 1) {
                selectedIdRef.current = mine[0].id;
                setSelectedProjectId(mine[0].id);
            }
        };
        // Op mount: server als bron van waarheid
        const loadFromServer = async () => {
            try {
                const res = await fetch('/api/projecten');
                const all = await res.json();
                localStorage.setItem('schildersapp_projecten', JSON.stringify(all));
                applyProjects(all);
            } catch {
                loadFromLocal();
            }
        };
        // Bij schilders-sync (lokale wijziging): ALLEEN localStorage — server heeft nieuwe data nog niet
        const loadFromLocal = () => {
            try {
                const all = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]');
                applyProjects(all);
            } catch {}
        };
        loadFromServer();
        window.addEventListener('schilders-sync', loadFromLocal);
        return () => window.removeEventListener('schilders-sync', loadFromLocal);
    }, [user]);

    const saveProject = (updated) => {
        try {
            const all = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]');
            const newAll = all.map(p => p.id === updated.id ? updated : p);
            localStorage.setItem('schildersapp_projecten', JSON.stringify(newAll));
            setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
            window.dispatchEvent(new Event('schilders-sync'));
        } catch {}
        // Server sync
        fetch('/api/projecten', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: updated }) }).catch(() => {});
    };

    const toggleCheckItem = (idx) => {
        const updated = localChecklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
        setLocalChecklist(updated);
        // localStorage meteen
        try {
            const all = JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]');
            localStorage.setItem('schildersapp_projecten', JSON.stringify(all.map(p => p.id === selectedProjectId ? { ...p, checklist: updated } : p)));
        } catch {}
        // Server debounced — wacht 1.2s na laatste vinkje
        if (checklistSyncRef.current) clearTimeout(checklistSyncRef.current);
        checklistSyncRef.current = setTimeout(() => {
            if (!project) return;
            fetch('/api/projecten', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: { ...project, checklist: updated } }) }).catch(() => {});
        }, 1200);
    };

    const [adminFotos, setAdminFotos] = useState([]);

    const project = projects.find(p => p.id === selectedProjectId) || null;
    const fotos = project?.fotos || [];
    const allFotos = [...adminFotos.map(f => ({ ...f, src: f.url, isAdmin: true })), ...fotos.map(f => ({ ...f, src: f.url || f.data, isAdmin: false }))];
    const allFotosCount = allFotos.length;

    useEffect(() => {
        if (!selectedProjectId) { setAdminFotos([]); return; }
        const load = () => {
            try {
                const stored = localStorage.getItem(`schildersapp_photos_${selectedProjectId}`);
                setAdminFotos(stored ? JSON.parse(stored) : []);
            } catch { setAdminFotos([]); }
        };
        load();
        const onStorage = (e) => { if (e.key === `schildersapp_photos_${selectedProjectId}`) load(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('photos-updated', load);
        return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('photos-updated', load); };
    }, [selectedProjectId]);

    // Checklist lokale state — sync vanuit project bij wisselen
    useEffect(() => {
        setLocalChecklist(project?.checklist || []);
    }, [selectedProjectId, project?.checklist?.length]);

    useEffect(() => {
        if (!selectedProjectId) { setNotities([]); return; }
        const loadFromLocal = () => {
            try {
                const stored = localStorage.getItem(`schildersapp_notes_${selectedProjectId}`);
                setNotities(stored ? JSON.parse(stored) : []);
            } catch { setNotities([]); }
        };
        const loadFromServer = async () => {
            try {
                const res = await fetch(`/api/notes?projectId=${selectedProjectId}`);
                const data = await res.json();
                if (data.success) {
                    const normalized = data.notes.map(n => ({ ...n, text: n.text || n.content || '' }));
                    setNotities(normalized);
                    localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(normalized));
                }
            } catch { loadFromLocal(); }
        };
        loadFromServer();
        const onStorage = (e) => { if (e.key === `schildersapp_notes_${selectedProjectId}`) loadFromLocal(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('schilders-sync', loadFromLocal);
        return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('schilders-sync', loadFromLocal); };
    }, [selectedProjectId]);

    // 30-seconden polling voor cross-device sync
    useEffect(() => {
        if (!user) return;
        const userId = Number(user?.id);
        const interval = setInterval(() => {
            fetch('/api/projecten').then(r => r.json()).then(all => {
                localStorage.setItem('schildersapp_projecten', JSON.stringify(all));
                const mine = all.filter(p =>
                    (p.tasks || []).some(t =>
                        (t.assignedTo || []).map(x => Number(typeof x === 'object' ? x.id : x)).includes(userId)
                    )
                );
                setProjects(mine);
            }).catch(() => {});
            if (selectedIdRef.current) {
                fetch(`/api/notes?projectId=${selectedIdRef.current}`).then(r => r.json()).then(data => {
                    if (data.success) {
                        const normalized = data.notes.map(n => ({ ...n, text: n.text || n.content || '' }));
                        setNotities(normalized);
                        localStorage.setItem(`schildersapp_notes_${selectedIdRef.current}`, JSON.stringify(normalized));
                    }
                }).catch(() => {});
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const openPreview = async (b) => {
        setPreviewAtt(b);
        setPreviewBlobUrl(null);
        const src = b.data || b.url;
        if (src && src.startsWith('/')) {
            setPreviewLoading(true);
            try {
                const res = await fetch(src);
                const rawBlob = await res.blob();
                const isPdf = b.type === 'application/pdf' || b.name?.toLowerCase().endsWith('.pdf');
                const blob = isPdf ? new Blob([rawBlob], { type: 'application/pdf' }) : rawBlob;
                setPreviewBlobUrl(URL.createObjectURL(blob));
            } catch (e) { console.error('Preview fout:', e); }
            finally { setPreviewLoading(false); }
        } else {
            setPreviewBlobUrl(src);
        }
    };

    const closePreview = () => { setPreviewAtt(null); setPreviewBlobUrl(null); setPreviewLoading(false); };

    const handleFoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !project) return;
        setFotoUploading(true);
        e.target.value = '';
        try {
            const now = new Date();
            const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
            const voornaam = user?.name ? user.name.split(' ')[0] : 'foto';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(selectedProjectId));
            formData.append('category', 'medewerker-fotos');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Upload mislukt');
            const nieuweFoto = {
                id: Date.now(),
                name: `${voornaam}_${stamp}.jpg`,
                type: file.type || 'image/jpeg',
                url: data.url,
                datum: now.toLocaleDateString('nl-NL'),
                tijd: now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
                auteur: user?.name || '',
            };
            saveProject({ ...project, fotos: [...(project.fotos || []), nieuweFoto] });
        } catch (err) {
            console.error('Foto upload mislukt:', err);
        } finally {
            setFotoUploading(false);
        }
    };

    const deleteFoto = (id) => {
        if (!project) return;
        saveProject({ ...project, fotos: (project.fotos || []).filter(f => f.id !== id) });
    };

    const deleteBestand = (idx) => {
        if (!project) return;
        const updated = (project.bestanden || []).filter((_, i) => i !== idx);
        saveProject({ ...project, bestanden: updated });
    };

    const NOTE_TYPES_MW = {
        info:     { label: 'Info',     color: '#3b82f6', bg: '#eff6ff', icon: 'fa-circle-info' },
        actie:    { label: 'Actie',    color: '#f59e0b', bg: '#fffbeb', icon: 'fa-bolt' },
        probleem: { label: 'Probleem', color: '#ef4444', bg: '#fef2f2', icon: 'fa-triangle-exclamation' },
        klant:    { label: 'Klant',    color: '#10b981', bg: '#f0fdf4', icon: 'fa-user' },
        planning: { label: 'Planning', color: '#8b5cf6', bg: '#f5f3ff', icon: 'fa-calendar-days' },
    };

    const handleNoteMedia = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPoNoteMediaUploading(true);
        e.target.value = '';
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', String(selectedProjectId));
            formData.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setPoNoteMedia({ url: data.url, mediaType: file.type.startsWith('video/') ? 'video' : 'image' });
        } catch (err) { console.error('Media upload mislukt:', err); }
        finally { setPoNoteMediaUploading(false); }
    };

    const saveNoteEdit = (noteId) => {
        if (!editingNoteText.trim()) return;
        const updated = notities.map(n => n.id === noteId ? { ...n, text: editingNoteText.trim(), content: editingNoteText.trim() } : n);
        setNotities(updated);
        localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: editingNoteText.trim() }) }).catch(() => {});
        setEditingNoteId(null);
        setEditingNoteText('');
    };

    const deleteNote = (noteId) => {
        if (!window.confirm('Notitie verwijderen?')) return;
        const updated = notities.filter(n => n.id !== noteId);
        setNotities(updated);
        localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(updated));
        fetch(`/api/notes?id=${noteId}`, { method: 'DELETE' }).catch(() => {});
    };

    const addReply = (noteId) => {
        if (!replyText.trim()) return;
        const reply = { id: Date.now(), author: user?.name || 'Medewerker', text: replyText.trim(), created_at: new Date().toISOString() };
        const updated = notities.map(n => n.id === noteId ? { ...n, replies: [...(n.replies || []), reply] } : n);
        setNotities(updated);
        localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(updated));
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
            formData.append('projectId', String(selectedProjectId));
            formData.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const updated = notities.map(n => n.id === noteId ? { ...n, photo: data.url, mediaType } : n);
            setNotities(updated);
            localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(updated));
            fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: updated.find(n => n.id === noteId)?.content || updated.find(n => n.id === noteId)?.text || '', photo: data.url, mediaType }) }).catch(() => {});
        } catch (err) { console.error('Media upload mislukt:', err); }
        finally { setAddMediaUploading(false); setAddingMediaToNoteId(null); }
    };

    const addNotitie = () => {
        if ((!poNoteText.trim() && !poNoteMedia) || !selectedProjectId) return;
        const localId = Date.now();
        const note = { id: localId, text: poNoteText.trim(), type: poNoteType, author: user?.name || 'Medewerker', date: new Date().toISOString().split('T')[0], photo: poNoteMedia?.url || null, mediaType: poNoteMedia?.mediaType || null, replies: [] };
        setNotities(prev => { const u = [note, ...prev]; localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(u)); return u; });
        window.dispatchEvent(new Event('schilders-sync'));
        fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProjectId, content: note.text || ' ', author: note.author, type: note.type, date: note.date, photo: note.photo, mediaType: note.mediaType }) })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.id) {
                    setNotities(prev => { const u = prev.map(n => n.id === localId ? { ...n, id: data.id } : n); localStorage.setItem(`schildersapp_notes_${selectedProjectId}`, JSON.stringify(u)); return u; });
                }
            }).catch(() => {});
        setPoNoteText('');
        setPoNoteMedia(null);
    };

    const cardRow = (icon, label, value, clickable) => {
        if (!value) return null;
        const handleClick = () => {
            if (clickable === 'bellen') {
                const naam = project.contactpersoon || project.client || 'de klant';
                if (window.confirm(`Wil je ${naam} bellen?\n${value}`)) {
                    window.location.href = `tel:${value.replace(/\s/g, '')}`;
                }
            } else if (clickable === 'route') {
                if (window.confirm(`Wil je de route naar dit project starten?\n${value}`)) {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}&travelmode=driving`, '_blank');
                }
            } else if (clickable === 'email') {
                window.location.href = `mailto:${value}`;
            }
        };
        return (
            <div key={label} onClick={clickable ? handleClick : undefined}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9', cursor: clickable ? 'pointer' : 'default' }}>
                <i className={`fa-solid ${icon}`} style={{ width: '16px', color: clickable ? '#F5850A' : '#94a3b8', fontSize: '0.85rem', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', color: clickable ? '#F5850A' : '#1e293b', fontWeight: clickable ? 600 : 400, marginTop: '1px', wordBreak: 'break-word', textDecoration: clickable ? 'underline' : 'none' }}>{value}</div>
                </div>
                {clickable && <i className={`fa-solid ${clickable === 'bellen' ? 'fa-phone' : clickable === 'email' ? 'fa-envelope' : 'fa-diamond-turn-right'}`} style={{ color: '#F5850A', fontSize: '0.85rem', marginTop: '2px' }} />}
            </div>
        );
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9', minHeight: '100%' }}>
            {/* Oranje header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', flexShrink: 0, boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-folder-tree" style={{ color: '#fff', fontSize: '1.1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Project Informatie</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.87rem' }}>Details van jouw projecten</div>
                    </div>
                </div>
            </div>
        <div style={{ padding: '0', background: '#f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: projects.length > 1 ? '12px' : 0, padding: '16px 16px 0' }}>
                    <div style={{ width: '3px', height: '16px', background: '#F5850A', borderRadius: '2px' }} />
                    <h2 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Project Informatie</h2>
                </div>
                {projects.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                        Geen projecten gevonden waar je aan bent toegewezen.
                    </div>
                )}
                {projects.length > 1 && (
                    <select value={selectedProjectId || ''} onChange={e => { selectedIdRef.current = Number(e.target.value); setSelectedProjectId(Number(e.target.value)); setWerkbonTab('kaart'); }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b', background: '#f8fafc', appearance: 'none' }}>
                        <option value="">Kies een project…</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}
            </div>

            {/* ── Tabbar ── */}
            {project && (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '4px 8px' }}>
                    <div className="tab-nav" style={{ marginBottom: 0 }}>
                        {[
                            ['kaart',        'fa-id-card',    'Kaart',        null],
                            ['info',         'fa-align-left', 'Omschrijving', localChecklist.length > 0 ? `${localChecklist.filter(c => c.done).length}/${localChecklist.length}` : null],
                            ['bestanden',    'fa-paperclip',  'Bestanden',    (project?.bestanden?.length || 0) + allFotosCount > 0 ? String((project?.bestanden?.length || 0) + allFotosCount) : null],
                        ].map(([key, icon, label, badge]) => (
                            <button key={key} onClick={() => setWerkbonTab(key)}
                                className={`tab-btn${werkbonTab === key ? ' active' : ''}`}>
                                <i className={`fa-solid ${icon}`} />
                                {label}
                                {badge != null && <span className="tab-badge">{badge}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {project && (
                <div style={{ padding: '16px 16px 32px' }}>

                    {/* ── Kaart ── */}
                    {werkbonTab === 'kaart' && (() => {
                        const statusLabels = { active: 'Actief', planning: 'In voorbereiding', completed: 'Afgerond', paused: 'Gepauzeerd' };
                        const statusColors = { active: '#10b981', planning: '#f59e0b', completed: '#3b82f6', paused: '#94a3b8' };
                        const st = project.status || 'active';
                        const fmt = (d) => d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
                        return (
                            <div>
                                {project.status && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: (statusColors[st] || '#94a3b8') + '18', border: `1.5px solid ${(statusColors[st] || '#94a3b8')}44`, marginBottom: '12px' }}>
                                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColors[st] || '#94a3b8' }} />
                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: statusColors[st] || '#94a3b8' }}>{statusLabels[st] || st}</span>
                                    </div>
                                )}
                                {cardRow('fa-hashtag', 'Projectnummer', project.projectnummer)}
                                {cardRow('fa-folder', 'Projectnaam', project.name)}
                                {cardRow('fa-building', 'Opdrachtgever', project.client)}
                                {cardRow('fa-briefcase', 'Bedrijfsnaam', project.bedrijfsnaam)}
                                {cardRow('fa-user', 'Contactpersoon', project.contactpersoon)}
                                {cardRow('fa-location-dot', 'Werkadres', project.werkAdres || project.address, 'route')}
                                {cardRow('fa-id-card', 'KVK Nummer', project.kvk)}
                                {cardRow('fa-file-invoice-dollar', 'BTW Nummer', project.btw)}
                                {cardRow('fa-phone', 'Telefoon', project.phone, 'bellen')}
                                {cardRow('fa-envelope', 'E-mail', project.email, 'email')}
                                {/* Startdatum — bewerkbaar */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <i className="fa-solid fa-calendar-days" style={{ width: '16px', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Startdatum</div>
                                        <input type="date" value={project.startDate || ''} onChange={e => saveProject({ ...project, startDate: e.target.value })}
                                            style={{ fontSize: '0.88rem', color: '#1e293b', border: 'none', background: 'transparent', padding: 0, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }} />
                                    </div>
                                </div>
                                {/* Opleverdatum — bewerkbaar */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <i className="fa-solid fa-flag-checkered" style={{ width: '16px', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.86rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>Opleverdatum</div>
                                        <input type="date" value={project.endDate || ''} onChange={e => saveProject({ ...project, endDate: e.target.value })}
                                            style={{ fontSize: '0.88rem', color: '#1e293b', border: 'none', background: 'transparent', padding: 0, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Bestanden & Foto's ── */}
                    {werkbonTab === 'bestanden' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Bestanden sectie */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                    <i className="fa-solid fa-paperclip" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bestanden</span>
                                    {(project.bestanden?.length || 0) > 0 &&
                                        <span style={{ fontSize: '0.86rem', color: '#64748b', background: '#f1f5f9', borderRadius: '8px', padding: '1px 7px', fontWeight: 700 }}>
                                            {project.bestanden.length}
                                        </span>}
                                </div>
                                {(project.bestanden?.length || 0) === 0
                                    ? <div style={{ textAlign: 'center', padding: '24px 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                        <i className="fa-solid fa-paperclip" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px', opacity: 0.3 }} />
                                        Geen bestanden beschikbaar.
                                      </div>
                                    : project.bestanden.map((b, idx) => {
                                        const isImg = b.type?.startsWith('image/');
                                        const isPdf = b.type === 'application/pdf' || b.name?.toLowerCase().endsWith('.pdf');
                                        const iconColor = isImg ? '#10b981' : isPdf ? '#ef4444' : '#3b82f6';
                                        const icon = isImg ? 'fa-image' : isPdf ? 'fa-file-pdf' : 'fa-file';
                                        return (
                                            <div key={b.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '6px' }}>
                                                <i className={`fa-solid ${icon}`} style={{ color: iconColor, fontSize: '1.1rem', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {b.label || b.name}
                                                    </div>
                                                    {b.label && b.name !== b.label &&
                                                        <div style={{ fontSize: '0.86rem', color: '#94a3b8' }}>{b.name}</div>}
                                                </div>
                                                <button onClick={() => openPreview(b)}
                                                    style={{ background: '#F5850A', border: 'none', borderRadius: '7px', color: '#fff', padding: '5px 10px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-eye" />
                                                </button>
                                            </div>
                                        );
                                    })
                                }
                            </div>

                            {/* Foto's sectie */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                    <i className="fa-solid fa-images" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Foto's</span>
                                    {allFotosCount > 0 &&
                                        <span style={{ fontSize: '0.86rem', color: '#64748b', background: '#f1f5f9', borderRadius: '8px', padding: '1px 7px', fontWeight: 700 }}>
                                            {allFotosCount}
                                        </span>}
                                </div>
                                {allFotosCount === 0
                                    ? <div style={{ textAlign: 'center', padding: '24px 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                        <i className="fa-solid fa-images" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px', opacity: 0.3 }} />
                                        Nog geen foto's beschikbaar.
                                      </div>
                                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                        {allFotos.map((f, idx) => (
                                            <div key={f.id || idx} onClick={() => openPreview({ ...f, type: f.type || 'image/jpeg' })}
                                                style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: '#e2e8f0' }}>
                                                <img src={f.src || f.url || f.data} alt={f.name || 'foto'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                      </div>
                                }
                            </div>

                        </div>
                    )}

                    {/* ── Omschrijving + Checklist ── */}
                    {werkbonTab === 'info' && (
                        <div>
                            {/* Werkomschrijving */}
                            {project.werkomschrijving
                                ? <p style={{ margin: '0 0 20px', fontSize: '0.92rem', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{project.werkomschrijving}</p>
                                : <div style={{ textAlign: 'center', padding: '24px 0 20px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                    <i className="fa-solid fa-align-left" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px', opacity: 0.3 }} />
                                    Nog geen werkomschrijving beschikbaar.
                                  </div>}
                            {/* Checklist */}
                            <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0', marginTop: project.werkomschrijving ? '8px' : 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: localChecklist.length > 0 ? '8px' : '10px' }}>
                                    <i className="fa-solid fa-list-check" style={{ color: '#F5850A', fontSize: '0.85rem' }} />
                                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Checklist</span>
                                    {localChecklist.length > 0 && <span style={{ fontSize: '0.86rem', color: '#64748b', background: '#f1f5f9', borderRadius: '8px', padding: '1px 7px', fontWeight: 700 }}>{localChecklist.filter(c => c.done).length}/{localChecklist.length}</span>}
                                </div>
                                {localChecklist.length > 0 && (() => {
                                    const pct = Math.round(localChecklist.filter(c => c.done).length / localChecklist.length * 100);
                                    return (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#F5850A', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                                            </div>
                                            <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '3px', textAlign: 'right' }}>{pct}%</div>
                                        </div>
                                    );
                                })()}
                                {localChecklist.length === 0
                                    ? <div style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '8px 0' }}>Geen checklistitems</div>
                                    : localChecklist.map((item, idx) => (
                                        <label key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 12px', cursor: 'pointer', borderRadius: '10px', marginBottom: '4px', background: item.done ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${item.done ? '#86efac' : '#e2e8f0'}`, transition: 'background 0.15s' }}>
                                            <input type="checkbox" checked={!!item.done}
                                                onChange={() => toggleCheckItem(idx)}
                                                style={{ width: '22px', height: '22px', accentColor: '#10b981', flexShrink: 0, cursor: 'pointer' }} />
                                            <span style={{ fontSize: '0.92rem', color: item.done ? '#86efac' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none', flex: 1, transition: 'color 0.15s' }}>{item.text || <em style={{ color: '#cbd5e1' }}>leeg item</em>}</span>
                                            {item.done && <i className="fa-solid fa-check" style={{ color: '#10b981', fontSize: '0.85rem', flexShrink: 0 }} />}
                                        </label>
                                    ))
                                }
                            </div>
                        </div>
                    )}


                </div>
            )}

            {/* ── Preview modal ── */}
            {previewAtt && (
                <div onClick={closePreview}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onKeyDown={e => { if (e.key === 'Escape') closePreview(); }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#1e293b', borderRadius: '14px', overflow: 'hidden', maxWidth: '95vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70vw' }}>{previewAtt.label || previewAtt.name}</div>
                                {previewAtt.auteur && (
                                    <div style={{ color: '#64748b', fontSize: '0.87rem', marginTop: '1px' }}>{previewAtt.auteur} · {previewAtt.datum} {previewAtt.tijd || ''}</div>
                                )}
                            </div>
                            <button onClick={closePreview} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.85rem', marginLeft: '12px', flexShrink: 0 }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {previewAtt.type?.startsWith('image/') ? (
                                <img src={previewBlobUrl || previewAtt.data || previewAtt.url} alt={previewAtt.name}
                                    style={{ width: '80vw', height: 'calc(90vh - 70px)', objectFit: 'contain', display: 'block' }} />
                            ) : previewLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 40px', textAlign: 'center' }}>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#ef4444' }} />
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Bestand laden…</div>
                                </div>
                            ) : previewBlobUrl ? (
                                <embed src={previewBlobUrl} type="application/pdf"
                                    style={{ width: '80vw', height: 'calc(90vh - 70px)', display: 'block' }} />
                            ) : (
                                <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '40px' }}>Bestand kan niet worden weergegeven.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
