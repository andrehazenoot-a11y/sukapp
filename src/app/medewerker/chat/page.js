'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';

function getAllProjects() {
    try { return JSON.parse(localStorage.getItem('schildersapp_projecten') || '[]'); } catch { return []; }
}

const NOTE_TYPES = {
    info:     { label: 'Info',     color: '#3b82f6', bg: '#eff6ff', icon: 'fa-circle-info' },
    actie:    { label: 'Actie',    color: '#f59e0b', bg: '#fffbeb', icon: 'fa-bolt' },
    probleem: { label: 'Probleem', color: '#ef4444', bg: '#fef2f2', icon: 'fa-triangle-exclamation' },
    klant:    { label: 'Klant',    color: '#10b981', bg: '#f0fdf4', icon: 'fa-user' },
    planning: { label: 'Planning', color: '#8b5cf6', bg: '#f5f3ff', icon: 'fa-calendar-days' },
};

export default function ChatPage() {
    const { user } = useAuth();
    const [projects, setProjects]             = useState([]);
    const [selectedId, setSelectedId]         = useState(null);
    const [chatTab, setChatTab]               = useState('berichten');
    const [projectPickerOpen, setProjectPickerOpen] = useState(false);
    const [zoekterm, setZoekterm] = useState('');
    const [vandaagProjectIds, setVandaagProjectIds] = useState([]);

    // ── Notities (berichten) ──
    const [notities, setNotities]             = useState([]);
    const [poNoteText, setPoNoteText]         = useState('');
    const [poNoteType, setPoNoteType]         = useState('info');
    const [poNoteMedia, setPoNoteMedia]       = useState(null);
    const [poNoteMediaUploading, setPoNoteMediaUploading] = useState(false);
    const [editingId, setEditingId]           = useState(null);
    const [editingText, setEditingText]       = useState('');
    const [addingMediaToId, setAddingMediaToId] = useState(null);
    const [addMediaUploading, setAddMediaUploading] = useState(false);
    const [replyingToId, setReplyingToId]     = useState(null);
    const [replyText, setReplyText]           = useState('');
    const [hoveredNoteId, setHoveredNoteId]   = useState(null);
    const [sending, setSending]               = useState(false);

    // ── Media tab ──
    const [adminFotos, setAdminFotos]         = useState([]);
    const [fotoUploading, setFotoUploading]   = useState(false);
    const [preview, setPreview]               = useState(null);
    const [previewDims, setPreviewDims]       = useState(null);

    const noteMediaRef  = useRef();
    const addMediaRef   = useRef();
    const cameraRef     = useRef();
    const selectedIdRef = useRef(null);
    const messagesEndRef = useRef(null);

    // ── Projecten laden + auto-select vandaag ──
    useEffect(() => {
        const load = () => {
            const all = getAllProjects();
            setProjects(all);
            // Alleen auto-selecteren als er nog geen project gekozen is
            if (selectedIdRef.current) return;
            const vandaag = new Date().toISOString().split('T')[0];
            const uid = Number(user?.id);
            if (!uid) return;
            const vandaagProjectIds = [];
            for (const p of all) {
                for (const t of (p.tasks || [])) {
                    const hasDayOverride = (t.assignedByDay || {})[vandaag] !== undefined;
                    const dayIds = hasDayOverride
                        ? (t.assignedByDay[vandaag] || []).map(x => typeof x === 'object' ? x.id : x).map(Number)
                        : (t.assignedTo || []).map(x => typeof x === 'object' ? x.id : x).map(Number);
                    if (!dayIds.includes(uid)) continue;
                    const inRange = t.startDate && t.endDate && vandaag >= t.startDate && vandaag <= t.endDate;
                    if (inRange || hasDayOverride) {
                        if (!vandaagProjectIds.includes(String(p.id))) vandaagProjectIds.push(String(p.id));
                    }
                }
            }
            setVandaagProjectIds(vandaagProjectIds);
            // Direct openen als er precies 1 project is vandaag
            if (vandaagProjectIds.length === 1) {
                setSelectedId(vandaagProjectIds[0]);
                setChatTab('berichten');
            }
        };
        load();
        window.addEventListener('schilders-sync', load);
        window.addEventListener('storage', load);
        return () => { window.removeEventListener('schilders-sync', load); window.removeEventListener('storage', load); };
    }, [user]);

    // ── Notities laden bij project ──
    useEffect(() => {
        if (!selectedId) { setNotities([]); return; }
        selectedIdRef.current = selectedId;
        const loadFromLocal = () => {
            try {
                const stored = localStorage.getItem(`schildersapp_notes_${selectedId}`);
                if (stored) setNotities(JSON.parse(stored));
            } catch {}
        };
        // Direct uit cache tonen voor snelle weergave
        loadFromLocal();
        // Daarna op de achtergrond vernieuwen vanuit server
        fetch(`/api/notes?projectId=${selectedId}`)
            .then(r => r.json())
            .then(data => {
                if (data.success && selectedIdRef.current === selectedId) {
                    const normalized = data.notes.map(n => ({ ...n, text: n.text || n.content || '' }));
                    setNotities(normalized);
                    localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(normalized));
                }
            }).catch(() => {});
        const onStorage = (e) => { if (e.key === `schildersapp_notes_${selectedId}`) loadFromLocal(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('schilders-sync', loadFromLocal);
        return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('schilders-sync', loadFromLocal); };
    }, [selectedId]);

    // ── Auto-scroll naar onderen ──
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [notities]);

    // ── 30s polling ──
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
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

    // ── Admin fotos ──
    useEffect(() => {
        if (!selectedId) { setAdminFotos([]); return; }
        const load = () => {
            try {
                const stored = localStorage.getItem(`schildersapp_photos_${selectedId}`);
                setAdminFotos(stored ? JSON.parse(stored) : []);
            } catch { setAdminFotos([]); }
        };
        load();
        const onStorage = (e) => { if (e.key === `schildersapp_photos_${selectedId}`) load(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('photos-updated', load);
        return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('photos-updated', load); };
    }, [selectedId]);

    const project = projects.find(p => String(p.id) === String(selectedId)) || null;
    const fotos = project?.fotos || [];
    const adminFotoIds = new Set(adminFotos.map(f => f.id));
    const notitieFotoUrls = new Set(adminFotos.map(f => f.url).filter(Boolean));
    // Foto's en video's die als bijlage aan notities zitten
    const notitieBijlagen = notities
        .filter(n => n.photo && !notitieFotoUrls.has(n.photo))
        .map(n => ({
            id: `note-${n.id}`,
            src: n.photo,
            url: n.photo,
            name: 'Notitie bijlage',
            auteur: n.author,
            tijd: n.date,
            type: n.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
            mediaType: n.mediaType,
        }));
    const allFotos = [
        ...adminFotos.map(f => ({ ...f, src: f.url })),
        ...fotos.filter(f => !adminFotoIds.has(f.id)).map(f => ({ ...f, src: f.url || f.data, canDelete: true })),
        ...notitieBijlagen,
    ];

    const saveProject = (updated) => {
        try {
            const all = getAllProjects();
            const next = all.map(p => String(p.id) === String(updated.id) ? updated : p);
            localStorage.setItem('schildersapp_projecten', JSON.stringify(next));
            setProjects(next);
            window.dispatchEvent(new Event('schilders-sync'));
        } catch {}
        fetch('/api/projecten', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: updated }) }).catch(() => {});
    };

    // ── Notitie toevoegen ──
    const addNotitie = () => {
        if ((!poNoteText.trim() && !poNoteMedia) || !selectedId) return;
        const now = new Date();
        const localId = now.getTime();
        const time = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const note = { id: localId, text: poNoteText.trim(), type: poNoteType, author: user?.name || 'Medewerker', date: now.toISOString().split('T')[0], time, photo: poNoteMedia?.url || null, mediaType: poNoteMedia?.mediaType || null, replies: [] };
        const updated = [note, ...notities];
        try { localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(updated)); } catch {}
        setNotities(updated);
        setPoNoteText(''); setPoNoteMedia(null);
        setSending(true);
        fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedId, content: note.text || ' ', author: note.author, type: note.type, date: note.date, photo: note.photo, mediaType: note.mediaType }) })
            .then(r => r.json()).then(data => {
                if (data.success && data.id) {
                    setNotities(prev => { const u = prev.map(n => n.id === localId ? { ...n, id: data.id } : n); try { localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(u)); } catch {} return u; });
                }
            }).catch(() => {}).finally(() => setSending(false));
    };

    // ── Media upload nieuw bericht ──
    const handleNoteMedia = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        setPoNoteMediaUploading(true); e.target.value = '';
        try {
            const fd = new FormData(); fd.append('file', file); fd.append('projectId', String(selectedId)); fd.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) setPoNoteMedia({ url: data.url, mediaType: file.type.startsWith('video/') ? 'video' : 'image' });
        } catch {}
        setPoNoteMediaUploading(false);
    };

    // ── Media toevoegen aan bestaand bericht ──
    const handleAddMediaToNote = async (e) => {
        const file = e.target.files?.[0]; if (!file || !addingMediaToId) return;
        e.target.value = ''; const noteId = addingMediaToId; setAddMediaUploading(true);
        try {
            const fd = new FormData(); fd.append('file', file); fd.append('projectId', String(selectedId)); fd.append('category', 'notitie-media');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                const updated = notities.map(n => n.id === noteId ? { ...n, photo: data.url, mediaType } : n);
                setNotities(updated); localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(updated));
                fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: updated.find(n => n.id === noteId)?.text || '', photo: data.url, mediaType }) }).catch(() => {});
            }
        } catch {}
        setAddMediaUploading(false); setAddingMediaToId(null);
    };

    // ── Bewerken ──
    const saveNoteEdit = (noteId) => {
        if (!editingText.trim()) return;
        const updated = notities.map(n => n.id === noteId ? { ...n, text: editingText.trim(), content: editingText.trim() } : n);
        setNotities(updated); localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: editingText.trim() }) }).catch(() => {});
        setEditingId(null); setEditingText('');
    };

    // ── Verwijderen ──
    const deleteNote = (noteId) => {
        if (!window.confirm('Bericht verwijderen?')) return;
        const updated = notities.filter(n => n.id !== noteId);
        setNotities(updated); localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(updated));
        fetch(`/api/notes?id=${noteId}`, { method: 'DELETE' }).catch(() => {});
    };

    // ── Reply ──
    const addReply = (noteId) => {
        if (!replyText.trim()) return;
        const reply = { id: Date.now(), author: user?.name || 'Medewerker', text: replyText.trim(), created_at: new Date().toISOString() };
        const updated = notities.map(n => n.id === noteId ? { ...n, replies: [...(n.replies || []), reply] } : n);
        setNotities(updated); localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(updated));
        fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, addReply: { author: reply.author, text: reply.text } }) }).catch(() => {});
        setReplyText(''); setReplyingToId(null);
    };

    // ── Foto maken (media tab) ──
    const handleFoto = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        e.target.value = ''; setFotoUploading(true);
        try {
            const now = new Date();
            const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
            const voornaam = user?.name ? user.name.split(' ')[0] : 'foto';
            const fd = new FormData(); fd.append('file', file); fd.append('projectId', String(selectedId)); fd.append('category', 'medewerker-fotos');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            const nieuweFoto = { id: Date.now(), name: `${voornaam}_${stamp}.jpg`, type: file.type || 'image/jpeg', url: data.url, datum: now.toLocaleDateString('nl-NL'), tijd: now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }), auteur: user?.name || '', canDelete: true };
            // Direct zichtbaar maken en persistent opslaan
            setAdminFotos(prev => {
                const updated = [...prev, nieuweFoto];
                try { localStorage.setItem(`schildersapp_photos_${selectedId}`, JSON.stringify(updated)); } catch {}
                return updated;
            });
        } catch (err) { console.error('Foto upload mislukt:', err); }
        finally { setFotoUploading(false); }
    };

    const deleteFoto = (id) => {
        // Foto die aan een notitie hangt (id = "note-{noteId}")
        if (String(id).startsWith('note-')) {
            const noteId = Number(String(id).replace('note-', ''));
            const updated = notities.map(n => n.id === noteId ? { ...n, photo: null, mediaType: null } : n);
            setNotities(updated);
            try { localStorage.setItem(`schildersapp_notes_${selectedId}`, JSON.stringify(updated)); } catch {}
            fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: noteId, content: notities.find(n => n.id === noteId)?.text || '', photo: null, mediaType: null }) }).catch(() => {});
            return;
        }
        // Gewone foto (adminFotos / project.fotos)
        setAdminFotos(prev => {
            const updated = prev.filter(f => f.id !== id);
            try { localStorage.setItem(`schildersapp_photos_${selectedId}`, JSON.stringify(updated)); } catch {}
            return updated;
        });
        const huidigProject = getAllProjects().find(p => String(p.id) === String(selectedId));
        if (huidigProject) saveProject({ ...huidigProject, fotos: (huidigProject.fotos || []).filter(f => f.id !== id) });
    };

    if (!user) return null;

    // ── Projectselectie ──
    if (!selectedId) {
        return (
            <div style={{ background: '#f1f5f9', minHeight: '100%' }}>
                <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '14px 20px', boxShadow: '0 2px 12px rgba(245,133,10,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-comments" style={{ color: '#fff', fontSize: '1.1rem' }} />
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>Chat</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.87rem' }}>Kies een project</div>
                        </div>
                    </div>
                </div>
                <div style={{ padding: '16px' }}>
                    {/* Vandaag ingepland */}
                    {vandaagProjectIds.length > 0 && !zoekterm && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Vandaag ingepland</div>
                            {projects.filter(p => vandaagProjectIds.includes(String(p.id))).map(p => (
                                <button key={p.id} onClick={() => { setSelectedId(String(p.id)); setChatTab('berichten'); }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff8f0', border: '1.5px solid #F5850A33', borderRadius: '14px', marginBottom: '8px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(245,133,10,0.1)' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5850A,#D96800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className="fa-solid fa-calendar-check" style={{ color: '#fff', fontSize: '0.95rem' }} />
                                    </div>
                                    <span style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</span>
                                    <i className="fa-solid fa-chevron-right" style={{ color: '#F5850A', fontSize: '0.8rem' }} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Zoekbalk */}
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.82rem' }} />
                        <input value={zoekterm} onChange={e => setZoekterm(e.target.value)}
                            placeholder="Ander project zoeken…"
                            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', background: '#fff', boxSizing: 'border-box', color: '#1e293b' }} />
                        {zoekterm && (
                            <button onClick={() => setZoekterm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', padding: 0 }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        )}
                    </div>

                    {/* Alle projecten (gefilterd, zonder vandaag-projecten als niet gezocht) */}
                    {(() => {
                        const gefilterd = projects.filter(p =>
                            p.name.toLowerCase().includes(zoekterm.toLowerCase()) &&
                            (zoekterm || !vandaagProjectIds.includes(String(p.id)))
                        );
                        if (gefilterd.length === 0 && zoekterm) return (
                            <div style={{ background: '#fff', borderRadius: '14px', padding: '32px 16px', textAlign: 'center', border: '1.5px dashed #e2e8f0' }}>
                                <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', color: '#e2e8f0', display: 'block', marginBottom: '8px' }} />
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Geen projecten gevonden</div>
                            </div>
                        );
                        if (gefilterd.length === 0) return null;
                        return (
                            <>
                                {vandaagProjectIds.length > 0 && !zoekterm && (
                                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Alle projecten</div>
                                )}
                                {gefilterd.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedId(String(p.id)); setChatTab('berichten'); setZoekterm(''); }}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '14px', marginBottom: '8px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className="fa-solid fa-hashtag" style={{ color: '#F5850A', fontSize: '1rem' }} />
                                        </div>
                                        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</span>
                                        <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
                                    </button>
                                ))}
                            </>
                        );
                    })()}
                </div>
            </div>
        );
    }

    const projectNaam = project?.name || selectedId;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f1f5f9', minHeight: '100%' }}>

            {/* Preview modal */}
            {preview && (
                <>
                    <div onClick={() => { setPreview(null); setPreviewDims(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500 }} />
                    <div style={{ position: 'fixed', inset: 0, zIndex: 510, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px 40px' }}>
                        {preview.type?.startsWith('video/') || preview.mediaType === 'video'
                            ? <video src={preview.url || preview.src} controls style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '12px' }} />
                            : <img src={preview.url || preview.src || preview.data} alt=""
                                onLoad={e => setPreviewDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '12px', objectFit: 'contain', display: 'block' }} />}
                        {previewDims && (
                            <div style={{ marginTop: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', fontWeight: 500 }}>
                                {previewDims.w} × {previewDims.h} px
                            </div>
                        )}
                        <button onClick={() => { setPreview(null); setPreviewDims(null); }} style={{ position: 'fixed', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </>
            )}

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '12px 16px', boxShadow: '0 2px 12px rgba(245,133,10,0.25)', flexShrink: 0, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => setSelectedId(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.82rem' }} />
                    </button>
                    <button onClick={() => setProjectPickerOpen(v => !v)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectNaam}</span>
                        <i className={`fa-solid fa-chevron-${projectPickerOpen ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', flexShrink: 0 }} />
                    </button>
                </div>

                {/* Project picker dropdown */}
                {projectPickerOpen && (
                    <>
                        <div onClick={() => { setProjectPickerOpen(false); setZoekterm(''); }} style={{ position: 'fixed', inset: 0, zIndex: 300 }} />
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', zIndex: 310, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', borderRadius: '0 0 16px 16px', overflow: 'hidden', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                <div style={{ position: 'relative' }}>
                                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }} />
                                    <input autoFocus value={zoekterm} onChange={e => setZoekterm(e.target.value)}
                                        placeholder="Project zoeken…"
                                        style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.83rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }} />
                                </div>
                            </div>
                            <div style={{ overflowY: 'auto' }}>
                                {projects.filter(p => p.name.toLowerCase().includes(zoekterm.toLowerCase())).map(p => (
                                    <button key={p.id} onClick={() => { setSelectedId(String(p.id)); setChatTab('berichten'); setProjectPickerOpen(false); setZoekterm(''); }}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: String(p.id) === String(selectedId) ? '#fff8f0' : '#fff', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left' }}>
                                        <i className="fa-solid fa-hashtag" style={{ color: '#F5850A', fontSize: '0.8rem', width: '16px', flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: String(p.id) === String(selectedId) ? 700 : 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                        {String(p.id) === String(selectedId) && <i className="fa-solid fa-check" style={{ color: '#F5850A', fontSize: '0.9rem' }} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Tabs — wit, onder de header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', flexShrink: 0, display: 'flex' }}>
                {[['berichten', 'fa-comments', 'Notities'], ['media', 'fa-photo-film', 'Media & bestanden']].map(([key, ic, lbl]) => (
                    <button key={key} onClick={() => setChatTab(key)}
                        style={{
                            flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', background: 'none',
                            borderBottom: chatTab === key ? '2.5px solid #F5850A' : '2.5px solid transparent',
                            color: chatTab === key ? '#F5850A' : '#94a3b8',
                            fontSize: '0.8rem', fontWeight: chatTab === key ? 700 : 500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.15s',
                        }}>
                        <i className={`fa-solid ${ic}`} style={{ fontSize: '0.9rem' }} />
                        {lbl}
                        {key === 'media' && (allFotos.length + (project?.bestanden || []).length) > 0 && (
                            <span style={{ background: '#F5850A', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.8rem', fontWeight: 700 }}>{allFotos.length + (project?.bestanden || []).length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB: NOTITIES ── */}
            {chatTab === 'berichten' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
                    {/* Lijst */}
                    {notities.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-note-sticky" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', opacity: 0.3 }} />
                            Nog geen notities
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notities.map(note => {
                            const nt = NOTE_TYPES[note.type] || NOTE_TYPES.info;
                            const isAuthor = note.author === (user?.name || 'Medewerker');
                            return (
                                <div key={note.id}
                                    onMouseEnter={() => setHoveredNoteId(note.id)}
                                    onMouseLeave={() => setHoveredNoteId(null)}
                                    onTouchStart={() => setHoveredNoteId(note.id)}
                                    style={{ background: '#fff', borderRadius: '10px', padding: '9px 11px', borderLeft: `3px solid ${nt.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', fontWeight: 700, color: nt.color }}>
                                            <i className={`fa-solid ${nt.icon}`} style={{ fontSize: '0.9rem' }} />{nt.label}
                                        </span>
                                        <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{note.author} · {note.date}{note.time ? ` · ${note.time}` : ''}</span>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                                            <button onClick={() => { setAddingMediaToId(note.id); addMediaRef.current?.click(); }}
                                                disabled={addMediaUploading && addingMediaToId === note.id}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.87rem', padding: '0 2px', opacity: 0.5 }}>
                                                {addMediaUploading && addingMediaToId === note.id ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-camera" />}
                                            </button>
                                            {isAuthor && editingId !== note.id && (
                                                <button onClick={() => { setEditingId(note.id); setEditingText(note.text); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.87rem', padding: '0 2px', opacity: 0.5 }}>
                                                    <i className="fa-solid fa-pencil" />
                                                </button>
                                            )}
                                            {isAuthor && (
                                                <button onClick={() => deleteNote(note.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.87rem', padding: '0 2px', opacity: 0.6 }}>
                                                    <i className="fa-solid fa-trash" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', minHeight: note.photo ? 64 : 'auto' }}>
                                        {/* Linker kolom: tekst */}
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: note.photo ? '8px' : 0 }}>
                                            {editingId === note.id ? (
                                                <textarea autoFocus value={editingText} onChange={e => setEditingText(e.target.value)}
                                                    onBlur={() => saveNoteEdit(note.id)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNoteEdit(note.id); } if (e.key === 'Escape') { setEditingId(null); setEditingText(''); } }}
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}`, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
                                            ) : (
                                                <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                                            )}
                                        </div>
                                        {/* Rechter kolom: miniatuur — klik opent grote preview */}
                                        {note.photo && (
                                            <div style={{ width: 72, flexShrink: 0, borderLeft: '1px solid #f1f5f9', paddingLeft: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {note.mediaType === 'video'
                                                    ? <div onClick={() => setPreview({ url: note.photo, mediaType: 'video' })}
                                                        style={{ width: 60, height: 60, borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                        <i className="fa-solid fa-play" style={{ color: '#fff', fontSize: '1rem' }} />
                                                      </div>
                                                    : <img src={note.photo} alt="" onClick={() => setPreview({ url: note.photo, mediaType: note.mediaType })}
                                                        style={{ width: 60, height: 60, borderRadius: '8px', objectFit: 'cover', cursor: 'pointer', display: 'block' }} />}
                                            </div>
                                        )}
                                    </div>
                                    {(note.replies?.length > 0 || replyingToId === note.id) && (
                                        <div style={{ marginTop: '8px', borderLeft: `2px solid ${nt.color}44`, paddingLeft: '10px' }}>
                                            {(note.replies || []).map(r => (
                                                <div key={r.id} style={{ marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#475569' }}>{r.author}</span>
                                                    <span style={{ fontSize: '0.84rem', color: '#94a3b8', marginLeft: '5px' }}>{r.created_at ? new Date(r.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                                    <div style={{ fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{r.text}</div>
                                                </div>
                                            ))}
                                            {replyingToId === note.id && (
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                    <input autoFocus value={replyText} onChange={e => setReplyText(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReply(note.id); } if (e.key === 'Escape') { setReplyingToId(null); setReplyText(''); } }}
                                                        placeholder="Typ reactie… (Enter)"
                                                        style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${nt.color}88`, fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none' }} />
                                                    <button onClick={() => addReply(note.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: nt.color, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>↵</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {replyingToId !== note.id && (hoveredNoteId === note.id || (note.replies?.length > 0)) && (
                                        <button onClick={() => { setReplyingToId(note.id); setReplyText(''); }}
                                            style={{ marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.87rem', padding: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <i className="fa-regular fa-comment" /> Reageer {note.replies?.length > 0 && `(${note.replies.length})`}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            {/* ── Invoer onderaan (alleen bij berichten tab) ── */}
            {chatTab === 'berichten' && (
                <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #f1f5f9', padding: '10px 12px', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
                    <input ref={noteMediaRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleNoteMedia} />
                    <input ref={addMediaRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleAddMediaToNote} />
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <textarea value={poNoteText} onChange={e => setPoNoteText(e.target.value)}
                            placeholder="Nieuwe notitie…" rows={3}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (poNoteText.trim() || poNoteMedia) addNotitie(); } }}
                            style={{ flex: 1, padding: '10px 12px', borderRadius: '14px', border: '1.5px solid #e2e8f0', fontSize: '0.88rem', color: '#1e293b', fontFamily: 'inherit', resize: 'none', outline: 'none', background: '#f8fafc', lineHeight: '1.5', maxHeight: '160px', overflowY: 'auto' }} />

                        {/* Rechterkolom: bijlage + verzend */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {/* Paperclip knop */}
                            <button onClick={() => noteMediaRef.current?.click()} disabled={poNoteMediaUploading}
                                style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${poNoteMedia ? '#10b981' : '#e2e8f0'}`, background: poNoteMedia ? '#f0fdf4' : '#f8fafc', color: poNoteMedia ? '#10b981' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {poNoteMediaUploading ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.8rem' }} /> : <i className="fa-solid fa-paperclip" style={{ fontSize: '0.8rem' }} />}
                            </button>
                            {/* Miniatuur onder paperclip */}
                            {poNoteMedia && (
                                <div style={{ position: 'relative', width: 36, height: 36 }}>
                                    {poNoteMedia.mediaType === 'video'
                                        ? <div onClick={() => setPreview({ url: poNoteMedia.url, mediaType: 'video' })}
                                            style={{ width: 36, height: 36, borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px solid #10b981' }}>
                                            <i className="fa-solid fa-play" style={{ color: '#fff', fontSize: '0.82rem' }} />
                                          </div>
                                        : <img src={poNoteMedia.url} alt="" onClick={() => setPreview({ url: poNoteMedia.url })}
                                            style={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid #10b981', display: 'block' }} />}
                                    <button onClick={() => setPoNoteMedia(null)}
                                        style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>
                            )}
                            {/* Verzend knop */}
                            <button onClick={addNotitie} disabled={(!poNoteText.trim() && !poNoteMedia) || sending}
                                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: (poNoteText.trim() || poNoteMedia) ? 'linear-gradient(135deg,#F5850A,#D96800)' : '#e2e8f0', color: (poNoteText.trim() || poNoteMedia) ? '#fff' : '#94a3b8', cursor: (poNoteText.trim() || poNoteMedia) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {sending ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '0.8rem' }} /> : <i className="fa-solid fa-paper-plane" style={{ fontSize: '0.8rem' }} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: MEDIA ── */}
            {chatTab === 'media' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: 'none' }} />
                    <button onClick={() => cameraRef.current?.click()} disabled={fotoUploading}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#F5850A', color: '#fff', cursor: fotoUploading ? 'default' : 'pointer', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', opacity: fotoUploading ? 0.7 : 1 }}>
                        {fotoUploading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-camera" />}
                        {fotoUploading ? 'Bezig met uploaden…' : 'Foto maken'}
                    </button>

                    {allFotos.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                <i className="fa-solid fa-camera" style={{ color: '#F5850A', fontSize: '0.82rem' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Foto's</span>
                                <span style={{ fontSize: '0.84rem', color: '#64748b', background: '#f1f5f9', borderRadius: '8px', padding: '1px 6px', fontWeight: 700 }}>{allFotos.length}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {allFotos.map((foto, idx) => {
                                    const isVideo = foto.mediaType === 'video' || foto.type?.startsWith('video/');
                                    return (
                                    <div key={foto.id || idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', cursor: 'pointer' }}
                                        onClick={() => setPreview({ src: foto.src, url: foto.src, type: foto.type || 'image/jpeg', mediaType: foto.mediaType })}>
                                        {isVideo
                                            ? <video src={foto.src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            : <img src={foto.src} alt={foto.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                                        {isVideo && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><i className="fa-solid fa-play" style={{ color: '#fff', fontSize: '0.86rem', marginLeft: '2px' }} /></div>}
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '16px 6px 4px', pointerEvents: 'none' }}>
                                            {foto.auteur && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.58rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foto.auteur}</div>}
                                            {foto.tijd && <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600 }}>{foto.tijd}</div>}
                                        </div>
                                        {user?.role === 'Beheerder' && (
                                            <button onClick={e => { e.stopPropagation(); if (window.confirm('Foto verwijderen?')) deleteFoto(foto.id); }}
                                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', cursor: 'pointer', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {allFotos.length === 0 && (project?.bestanden || []).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#cbd5e1', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-photo-film" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', opacity: 0.3 }} />
                            Nog geen foto's of bestanden
                        </div>
                    )}

                    {(project?.bestanden || []).length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                <i className="fa-solid fa-paperclip" style={{ color: '#F5850A', fontSize: '0.82rem' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bestanden</span>
                                <span style={{ fontSize: '0.84rem', color: '#64748b', background: '#f1f5f9', borderRadius: '8px', padding: '1px 6px', fontWeight: 700 }}>{(project?.bestanden || []).length}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(project?.bestanden || []).map((b, idx) => {
                                    const isImg = b.type?.startsWith('image/');
                                    const isPdf = b.type === 'application/pdf' || b.name?.toLowerCase().endsWith('.pdf');
                                    const arr = project?.bestanden || [];
                                    return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                            <i className={`fa-solid ${isImg ? 'fa-image' : isPdf ? 'fa-file-pdf' : 'fa-file'}`}
                                                style={{ color: isImg ? '#10b981' : isPdf ? '#ef4444' : '#64748b', fontSize: '1.2rem', width: '22px', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label || b.name}</div>
                                            </div>
                                            <button onClick={() => setPreview(b)}
                                                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                <i className="fa-solid fa-eye" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
