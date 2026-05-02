'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

const CATEGORIEEN = ['Bouwkundig', 'Schilderwerk', 'Overig'];
const STATUS_INFO = {
    open:              { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Open' },
    'in behandeling':  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'In behandeling' },
    opgelost:          { color: '#22c55e', bg: '#f0fdf4', border: '#86efac', label: 'Opgelost' },
};
function pinKleur(status) {
    if (status === 'opgelost') return '#22c55e';
    if (status === 'in behandeling') return '#f59e0b';
    return '#ef4444';
}

export default function BouwinspectieProject() {
    const { projectId } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [tekeningen, setTekeningen] = useState([]);
    const [pins, setPins] = useState([]);
    const [activeTekening, setActiveTekening] = useState(null);
    const [tab, setTab] = useState('tekening');
    const [loading, setLoading] = useState(true);

    // Pin plaatsen
    const [placingPin, setPlacingPin] = useState(false);
    const [pendingPos, setPendingPos] = useState(null);

    // Bottom sheet
    const [selectedPin, setSelectedPin] = useState(null);
    const [sheetMode, setSheetMode] = useState(null); // null | 'view' | 'edit' | 'nieuw'
    const [pinTab, setPinTab] = useState('kenmerken'); // 'kenmerken' | 'checklist'
    const [pinForm, setPinForm] = useState({ titel: '', beschrijving: '', categorie: 'Overig', categorieOverig: '', status: 'open', prioriteit: 'normaal', toegewezen_aan: '', deadline: '' });

    // Checklist items per pin (lokale state, gesynchroniseerd via aparte API-aanroepen)
    const [checkItems, setCheckItems] = useState([]); // [{ id, tekst, gedaan }]
    const [nieuwCheckItem, setNieuwCheckItem] = useState('');

    // Foto upload
    const [uploading, setUploading] = useState(false);
    const fotoRef = useRef();

    // Tekening upload
    const [showTekeningUpload, setShowTekeningUpload] = useState(false);
    const [tekeningNaam, setTekeningNaam] = useState('');
    const [tekeningFile, setTekeningFile] = useState(null);
    const [uploadingTekening, setUploadingTekening] = useState(false);
    const tekeningRef = useRef();
    const tekeningCamRef = useRef();

    // Preview
    const [previewFoto, setPreviewFoto] = useState(null);

    // PDF page rendering
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfTotalPages, setPdfTotalPages] = useState(0);
    const [pdfLoading, setPdfLoading] = useState(false);
    const pdfDocRef = useRef(null);
    const pdfCanvasRef = useRef(null);

    // Tekening dropdown
    const [showTekeningList, setShowTekeningList] = useState(false);

    // Saving
    const [saving, setSaving] = useState(false);

    // Bevindingen filter + zoek
    const [bevFilter, setBevFilter] = useState('alle');
    const [bevZoek, setBevZoek] = useState('');

    // Zoom/pan
    const [zoom, setZoom] = useState({ scale: 1, tx: 0, ty: 0 });
    const gestureRef = useRef(null);   // actieve gesture data
    const wasPinchRef = useRef(false);  // voorkomt tap-na-pinch
    const liveZoom = useRef({ scale: 1, tx: 0, ty: 0 }); // huidige transform (geen re-render nodig)
    const transformElRef = useRef(null); // het element waarop transform wordt gezet

    const imgRef = useRef();
    const containerRef = useRef();
    const fitScaleRef = useRef(1);

    // Stabiele wrapper-functies die altijd de laatste handler aanroepen (geen stale closure)
    const _start = useRef(null);
    const _move  = useRef(null);
    const _end   = useRef(null);
    const placingPinRef = useRef(placingPin);

    useEffect(() => {
        async function load() {
            try {
                // Lees project uit sessionStorage (gezet door de lijstpagina) — geen extra fetch nodig
                const cached = sessionStorage.getItem(`bi_project_${projectId}`);
                const projectData = cached ? JSON.parse(cached) : null;

                const [tRes, piRes] = await Promise.all([
                    fetch(`/api/bouwinspectie/${projectId}/tekeningen`),
                    fetch(`/api/bouwinspectie/${projectId}/pins`),
                ]);
                const [t, pi] = await Promise.all([tRes.json(), piRes.json()]);

                // Fallback: haal project op als niet in cache (bijv. direct via URL)
                let p = projectData;
                if (!p) {
                    const all = await fetch('/api/projecten').then(r => r.json()).catch(() => []);
                    p = Array.isArray(all) ? all.find(x => String(x.id) === String(projectId)) : null;
                }
                setProject(p || null);
                setTekeningen(Array.isArray(t) ? t : []);
                setPins(Array.isArray(pi) ? pi : []);
                if (Array.isArray(t) && t.length > 0) setActiveTekening(t[0]);
            } catch {}
            setLoading(false);
        }
        load();
    }, [projectId]);

    useEffect(() => {
        fitScaleRef.current = 1;
        applyTransform({ scale: 1, tx: 0, ty: 0 }, true);
    }, [activeTekening?.id]);

    // Sync placingPin naar ref zodat handlers altijd de actuele waarde lezen
    placingPinRef.current = placingPin;

    // Initialiseer stabiele wrappers eenmalig
    if (!_start.current) {
        _start.current = (e) => handleGestureStart(e);
        _move.current  = (e) => handleGestureMove(e);
        _end.current   = (e) => handleGestureEnd(e);
    }

    function applyTransform(z, commit = false) {
        liveZoom.current = z;
        if (transformElRef.current) {
            transformElRef.current.style.transform = `translate(${z.tx}px, ${z.ty}px) scale(${z.scale})`;
        }
        if (commit) setZoom({ ...z }); // trigger React re-render voor de overlay knoppen
    }

    const PAD = 12; // padding rondom de tekening (pixels)

    function applyFitZoom() {
        const cEl = containerRef.current;
        if (!cEl) return;
        const cW = cEl.clientWidth;
        const cH = cEl.clientHeight;
        let contentW, contentH;
        if (activeTekening?.bestandstype === 'application/pdf' && pdfCanvasRef.current?.width) {
            contentW = pdfCanvasRef.current.width;
            contentH = pdfCanvasRef.current.height;
        } else if (imgRef.current?.naturalWidth) {
            contentW = imgRef.current.naturalWidth;
            contentH = imgRef.current.naturalHeight;
        } else return;
        // Beschikbare ruimte rekening houdend met padding
        const availW = cW - PAD * 2;
        const availH = cH - PAD * 2;
        const renderedH = availW * (contentH / contentW);
        const fitScale = renderedH > availH ? availH / renderedH : 1;
        fitScaleRef.current = fitScale;
        // Centreer: de transform-wrapper is cW breed, na scale is content fitScale*cW breed
        const tx = (cW - fitScale * cW) / 2;
        const ty = fitScale < 1 ? (cH - fitScale * cH) / 2 : PAD;
        applyTransform({ scale: fitScale, tx, ty }, true);
    }

    // PDF laden
    useEffect(() => {
        if (!activeTekening || activeTekening.bestandstype !== 'application/pdf') {
            pdfDocRef.current = null;
            setPdfPage(1);
            setPdfTotalPages(0);
            return;
        }
        let cancelled = false;
        setPdfLoading(true);
        import('pdfjs-dist').then(pdfjsLib => {
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
            }
            return pdfjsLib.getDocument(activeTekening.bestand_url).promise.then(pdf => {
                if (cancelled) return;
                pdfDocRef.current = pdf;
                setPdfTotalPages(pdf.numPages);
                setPdfPage(1);
            });
        }).catch(() => { if (!cancelled) setPdfLoading(false); });
        return () => { cancelled = true; };
    }, [activeTekening?.id, activeTekening?.bestandstype]);

    // PDF pagina renderen
    useEffect(() => {
        if (!pdfDocRef.current || !pdfCanvasRef.current || pdfPage < 1) return;
        let cancelled = false;
        setPdfLoading(true);
        pdfDocRef.current.getPage(pdfPage).then(page => {
            if (cancelled || !pdfCanvasRef.current) return;
            const canvas = pdfCanvasRef.current;
            const containerWidth = canvas.parentElement?.clientWidth || 800;
            const viewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / viewport.width * 2; // 2× voor scherpte
            const scaledViewport = page.getViewport({ scale });
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            const ctx = canvas.getContext('2d');
            return page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        }).then(() => { if (!cancelled) { setPdfLoading(false); applyFitZoom(); } }).catch(() => { if (!cancelled) setPdfLoading(false); });
        return () => { cancelled = true; };
    }, [pdfPage, pdfTotalPages]);

    const isPdf = activeTekening?.bestandstype === 'application/pdf';
    const pinsVoorTekening = activeTekening
        ? pins.filter(p => {
            if (String(p.tekening_id) !== String(activeTekening.id)) return false;
            if (isPdf) return (p.pdf_page ?? 1) === pdfPage;
            return true;
        })
        : [];

    const gefilterdePins = pins.filter(p => {
        if (bevFilter !== 'alle' && p.status !== bevFilter) return false;
        if (bevZoek.trim()) {
            const q = bevZoek.toLowerCase();
            return (p.titel || '').toLowerCase().includes(q) ||
                   (p.beschrijving || '').toLowerCase().includes(q) ||
                   (p.toegewezen_aan || '').toLowerCase().includes(q);
        }
        return true;
    });

    // ── Tekening klik → pin plaatsen ──
    function handleTekeningClick(e) {
        if (!placingPin) return;
        const img = imgRef.current;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        let clientX, clientY;
        const touch = e.changedTouches?.[0] ?? e.touches?.[0];
        if (touch) { clientX = touch.clientX; clientY = touch.clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        const x_pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y_pct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        setPendingPos({ x_pct, y_pct });
        setPlacingPin(false);
        setPinForm({ titel: '', beschrijving: '', categorie: 'Overig', categorieOverig: '', status: 'open', prioriteit: 'normaal', toegewezen_aan: '', deadline: '' });
        setCheckItems([]);
        setPinTab('kenmerken');
        setSheetMode('nieuw');
        setSelectedPin(null);
    }

    function openPinDetail(pin) {
        setSelectedPin(pin);
        const isVrij = pin.categorie && !CATEGORIEEN.slice(0, -1).includes(pin.categorie);
        setPinForm({
            titel: pin.titel || '',
            beschrijving: pin.beschrijving || '',
            categorie: isVrij ? 'Overig' : (pin.categorie || 'Overig'),
            categorieOverig: isVrij ? pin.categorie : '',
            status: pin.status || 'open',
            prioriteit: pin.prioriteit || 'normaal',
            toegewezen_aan: pin.toegewezen_aan || '',
            deadline: pin.deadline ? pin.deadline.slice(0, 10) : '',
        });
        setCheckItems(pin.checklist || []);
        setPinTab('kenmerken');
        setSheetMode('view');
    }

    function sluitSheet() {
        setSheetMode(null);
        setSelectedPin(null);
        setPendingPos(null);
    }

    // Geeft de werkelijke categorie-waarde terug (vrije tekst als Overig)
    function effectiefCategorie() {
        return pinForm.categorie === 'Overig' && pinForm.categorieOverig?.trim()
            ? pinForm.categorieOverig.trim()
            : pinForm.categorie;
    }

    // ── Opslaan nieuwe pin ──
    async function slaaPinOp() {
        if (!pinForm.titel.trim() || !activeTekening) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/bouwinspectie/${projectId}/pins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tekening_id: activeTekening.id, x_pct: pendingPos.x_pct, y_pct: pendingPos.y_pct, pdf_page: isPdf ? pdfPage : null, ...pinForm, categorie: effectiefCategorie(), checklist: checkItems, gemaakt_door: user?.name }),
            });
            const nieuw = await res.json();
            setPins(prev => [...prev, { ...nieuw, checklist: checkItems, fotos: [] }]);
            setPendingPos(null);
            setSheetMode(null);
        } catch {}
        setSaving(false);
    }

    // ── Bewerken bestaande pin ──
    async function updatePin() {
        if (!selectedPin || !pinForm.titel.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/bouwinspectie/pins/${selectedPin.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...pinForm, categorie: effectiefCategorie(), checklist: checkItems }),
            });
            const upd = await res.json();
            const updated = { ...selectedPin, ...upd, checklist: checkItems };
            setPins(prev => prev.map(p => p.id === upd.id ? updated : p));
            setSelectedPin(updated);
            setSheetMode('view');
        } catch {}
        setSaving(false);
    }

    // ── Status direct wisselen vanuit view ──
    async function setStatusDirect(newStatus) {
        if (!selectedPin) return;
        try {
            const res = await fetch(`/api/bouwinspectie/pins/${selectedPin.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...pinForm, categorie: effectiefCategorie(), status: newStatus, checklist: checkItems }),
            });
            const upd = await res.json();
            const updated = { ...selectedPin, ...upd, checklist: checkItems };
            setPins(prev => prev.map(p => p.id === upd.id ? updated : p));
            setSelectedPin(updated);
            setPinForm(f => ({ ...f, status: newStatus }));
        } catch {}
    }

    // ── Verwijder pin ──
    async function verwijderPin() {
        if (!selectedPin || !window.confirm('Pin verwijderen?')) return;
        try {
            await fetch(`/api/bouwinspectie/pins/${selectedPin.id}`, { method: 'DELETE' });
            setPins(prev => prev.filter(p => p.id !== selectedPin.id));
            sluitSheet();
        } catch {}
    }

    // ── Foto upload ──
    async function uploadFoto(file) {
        if (!selectedPin) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('projectId', `bouwinspectie_${projectId}`);
            fd.append('category', `pin_${selectedPin.id}`);
            const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
            const upData = await upRes.json();
            if (!upData.success) return;
            const fRes = await fetch(`/api/bouwinspectie/pins/${selectedPin.id}/fotos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bestand_url: upData.url, type: 'voor' }),
            });
            const nieuwFoto = await fRes.json();
            // API geeft bestand_url, maar render verwacht url
            const updFotos = [...(selectedPin.fotos || []), { ...nieuwFoto, url: nieuwFoto.bestand_url || nieuwFoto.url }];
            const updated = { ...selectedPin, fotos: updFotos };
            setSelectedPin(updated);
            setPins(prev => prev.map(p => p.id === selectedPin.id ? updated : p));
        } catch {}
        setUploading(false);
    }

    async function verwijderFoto(fotoId) {
        if (!selectedPin) return;
        try {
            await fetch(`/api/bouwinspectie/pins/${selectedPin.id}/fotos?fotoId=${fotoId}`, { method: 'DELETE' });
            const updFotos = (selectedPin.fotos || []).filter(f => String(f.id) !== String(fotoId));
            const updated = { ...selectedPin, fotos: updFotos };
            setSelectedPin(updated);
            setPins(prev => prev.map(p => p.id === selectedPin.id ? updated : p));
        } catch {}
    }

    // ── Tekening uploaden ──
    async function uploadTekening() {
        if (!tekeningFile || !tekeningNaam.trim()) return;
        setUploadingTekening(true);
        try {
            const fd = new FormData();
            fd.append('file', tekeningFile);
            fd.append('projectId', `bouwinspectie_${projectId}`);
            fd.append('category', 'tekeningen');
            const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
            const upData = await upRes.json();
            if (!upData.success) { setUploadingTekening(false); return; }
            const tRes = await fetch(`/api/bouwinspectie/${projectId}/tekeningen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naam: tekeningNaam.trim(), bestand_url: upData.url, bestandstype: tekeningFile.type, volgorde: tekeningen.length }),
            });
            const nieuw = await tRes.json();
            const updTek = [...tekeningen, nieuw];
            setTekeningen(updTek);
            if (!activeTekening) setActiveTekening(nieuw);
            setShowTekeningUpload(false);
            setTekeningNaam('');
            setTekeningFile(null);
        } catch {}
        setUploadingTekening(false);
    }

    async function verwijderTekening(tek) {
        if (!window.confirm(`Tekening "${tek.naam}" verwijderen? Alle pins worden ook verwijderd.`)) return;
        try {
            await fetch(`/api/bouwinspectie/tekeningen/${tek.id}`, { method: 'DELETE' });
            const rest = tekeningen.filter(t => t.id !== tek.id);
            setTekeningen(rest);
            setPins(prev => prev.filter(p => String(p.tekening_id) !== String(tek.id)));
            setActiveTekening(rest[0] || null);
        } catch {}
    }

    // ── Checklist helpers ──
    function toggleCheckItem(idx) {
        setCheckItems(prev => prev.map((it, i) => i === idx ? { ...it, gedaan: !it.gedaan } : it));
    }
    function voegCheckItemToe() {
        if (!nieuwCheckItem.trim()) return;
        setCheckItems(prev => [...prev, { id: Date.now(), tekst: nieuwCheckItem.trim(), gedaan: false }]);
        setNieuwCheckItem('');
    }
    function verwijderCheckItem(idx) {
        setCheckItems(prev => prev.filter((_, i) => i !== idx));
    }

    // ── Gesture handlers — direct DOM transform, geen React re-render tijdens move ──
    function gDist(t) { return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY); }
    function gMid(t)  { return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }; }
    function clamp(z) {
        const el = containerRef.current;
        if (!el) return z;
        const W = el.clientWidth, H = el.clientHeight;
        const p = PAD;
        return {
            scale: z.scale,
            tx: Math.min(W - p, Math.max(-(W * z.scale - p), z.tx)),
            ty: Math.min(H - p, Math.max(-(H * z.scale - p), z.ty)),
        };
    }

    function handleGestureStart(e) {
        // Touch op een pin → niet als canvas-gesture behandelen zodat pin zijn eigen handler krijgt
        if (e.touches.length === 1 && e.target.closest('[data-pin]')) return;
        const cur = liveZoom.current;
        if (e.touches.length === 2) {
            e.preventDefault();
            wasPinchRef.current = true;
            gestureRef.current = {
                type: 'pinch',
                startDist: gDist(e.touches), startMid: gMid(e.touches),
                startScale: cur.scale, startTx: cur.tx, startTy: cur.ty,
                rect: containerRef.current?.getBoundingClientRect(),
            };
        } else if (e.touches.length === 1 && cur.scale > fitScaleRef.current + 0.01 && !placingPinRef.current) {
            gestureRef.current = {
                type: 'pan',
                startX: e.touches[0].clientX, startY: e.touches[0].clientY,
                startTx: cur.tx, startTy: cur.ty,
            };
        }
    }

    function handleGestureMove(e) {
        const g = gestureRef.current;
        if (!g) return;
        e.preventDefault();
        if (g.type === 'pinch' && e.touches.length >= 2) {
            const minScale = fitScaleRef.current;
            const newScale = Math.max(minScale, Math.min(minScale * 8, g.startScale * (gDist(e.touches) / g.startDist)));
            const mid = gMid(e.touches);
            const focalX = g.startMid.x - g.rect.left;
            const focalY = g.startMid.y - g.rect.top;
            const rawTx = focalX - (focalX - g.startTx) * (newScale / g.startScale) + (mid.x - g.startMid.x);
            const rawTy = focalY - (focalY - g.startTy) * (newScale / g.startScale) + (mid.y - g.startMid.y);
            applyTransform(clamp({ scale: newScale, tx: rawTx, ty: rawTy }));
        } else if (g.type === 'pan' && e.touches.length === 1) {
            const rawTx = g.startTx + e.touches[0].clientX - g.startX;
            const rawTy = g.startTy + e.touches[0].clientY - g.startY;
            applyTransform(clamp({ scale: liveZoom.current.scale, tx: rawTx, ty: rawTy }));
        }
    }

    function handleGestureEnd(e) {
        if (e.touches.length === 0) {
            // Commit huidige waarde naar React state (zorgt dat overlays herdrawen)
            applyTransform(liveZoom.current, true);
            setTimeout(() => { wasPinchRef.current = false; }, 50);
        }
        if (e.touches.length < 2 && gestureRef.current?.type === 'pinch') {
            gestureRef.current = null;
        }
        if (e.touches.length === 0) gestureRef.current = null;
    }

    // ── Pin render helpers ──
    function TearPin({ pin, onClick }) {
        const kleur = pinKleur(pin.status);
        const touchStart = useRef(null);
        return (
            <div
                data-pin="true"
                onTouchStart={e => {
                    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }}
                onTouchEnd={e => {
                    if (wasPinchRef.current || !touchStart.current) return;
                    const dx = Math.abs(e.changedTouches[0].clientX - touchStart.current.x);
                    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
                    touchStart.current = null;
                    if (dx < 12 && dy < 12) {
                        e.preventDefault();
                        e.stopPropagation();
                        onClick(e);
                    }
                }}
                onClick={onClick}
                style={{ position: 'absolute', left: `${pin.x_pct}%`, top: `${pin.y_pct}%`,
                    transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', cursor: 'pointer', zIndex: 20,
                    filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.45))',
                    touchAction: 'none', padding: '8px',
                }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: kleur,
                    border: '3px solid #fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 800,
                    minWidth: 44, minHeight: 44, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                    {pin.volgnummer}
                </div>
                <div style={{ width: 0, height: 0,
                    borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                    borderTop: `11px solid ${kleur}`,
                }} />
            </div>
        );
    }

    function PendingPin({ pos }) {
        return (
            <div style={{ position: 'absolute', left: `${pos.x_pct}%`, top: `${pos.y_pct}%`,
                transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', zIndex: 10, animation: 'pinpulse 0.8s ease-in-out infinite',
            }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F5850A',
                    border: '2.5px solid #fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff',
                }}>
                    <i className="fa-solid fa-plus" style={{ fontSize: '0.85rem' }} />
                </div>
                <div style={{ width: 0, height: 0,
                    borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
                    borderTop: '10px solid #F5850A',
                }} />
            </div>
        );
    }

    // ── Derived stats voor dashboard ──
    const stats = {
        totaal: pins.length,
        open: pins.filter(p => p.status === 'open').length,
        bezig: pins.filter(p => p.status === 'in behandeling').length,
        opgelost: pins.filter(p => p.status === 'opgelost').length,
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                Laden…
            </div>
        </div>
    );
    if (!project) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Project niet gevonden.</div>;

    const sheetOpen = !!sheetMode;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>

            {/* ── Header ── */}
            <div style={{ background: 'linear-gradient(135deg, #F5850A 0%, #D96800 100%)', padding: '12px 16px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px' }}>
                    <button onClick={() => router.push('/medewerker/bouwinspectie')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.8rem' }} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.naam}</div>
                        {project.adres && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.84rem' }}>{project.adres}</div>}
                    </div>
                    {stats.open > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 800, padding: '2px 8px', flexShrink: 0 }}>{stats.open} open</span>}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    {[['tekening', 'fa-map', 'Tekening'], ['bevindingen', 'fa-list-check', 'Bevindingen'], ['dashboard', 'fa-chart-pie', 'Dashboard']].map(([t, ic, lb]) => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: '0.87rem',
                            background: tab === t ? 'rgba(255,255,255,0.2)' : 'transparent',
                            color: tab === t ? '#fff' : 'rgba(255,255,255,0.65)',
                            fontWeight: tab === t ? 700 : 500,
                            borderRadius: '8px 8px 0 0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                            <i className={`fa-solid ${ic}`} style={{ fontSize: '0.82rem' }} />{lb}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                TAB: TEKENING
            ══════════════════════════════════════════════ */}
            {tab === 'tekening' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>


                    {/* Tekening canvas */}
                    <div
                        ref={el => {
                            const prev = containerRef.current;
                            if (prev && prev !== el) {
                                prev.removeEventListener('touchstart', _start.current);
                                prev.removeEventListener('touchmove', _move.current);
                                prev.removeEventListener('touchend', _end.current);
                            }
                            containerRef.current = el;
                            if (el && el !== prev) {
                                el.addEventListener('touchstart', _start.current, { passive: false });
                                el.addEventListener('touchmove', _move.current, { passive: false });
                                el.addEventListener('touchend', _end.current, { passive: false });
                            }
                        }}
                        style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#0f172a', touchAction: 'none' }}
                    >
                        {!activeTekening ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', gap: '12px', padding: '20px', textAlign: 'center' }}>
                                <i className="fa-solid fa-map" style={{ fontSize: '2.5rem' }} />
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Nog geen tekening</div>
                                <div style={{ fontSize: '0.8rem' }}>Upload een bouwtekening (JPG, PNG of PDF)</div>
                                <button onClick={() => setShowTekeningUpload(true)} style={{ background: '#F5850A', border: 'none', borderRadius: '12px', padding: '10px 20px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginTop: '4px' }}>
                                    <i className="fa-solid fa-upload" style={{ marginRight: '6px' }} />Tekening uploaden
                                </button>
                            </div>
                        ) : (
                        <div ref={transformElRef} style={{
                            position: 'absolute', inset: 0,
                            transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`,
                            transformOrigin: '0 0',
                            willChange: 'transform',
                            padding: '12px',
                        }}>
                        {activeTekening.bestandstype === 'application/pdf' ? (
                            <div style={{ position: 'relative', width: '100%' }}>
                                <canvas ref={pdfCanvasRef} style={{ display: 'block', width: '100%', opacity: pdfLoading ? 0.4 : 1, transition: 'opacity 0.2s', borderRadius: '4px', boxShadow: '0 4px 32px rgba(0,0,0,0.6)' }} />
                                {pdfLoading && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                        <i className="fa-solid fa-spinner fa-spin" style={{ color: '#fff', fontSize: '2rem', opacity: 0.8 }} />
                                    </div>
                                )}

                                {/* Pins over de PDF */}
                                {pinsVoorTekening.map(pin => (
                                    <TearPin key={pin.id} pin={pin}
                                        onClick={e => { e.stopPropagation(); if (!placingPin) openPinDetail(pin); }} />
                                ))}

                                {/* Pending pin */}
                                {pendingPos && sheetMode === 'nieuw' && <PendingPin pos={pendingPos} />}

                                {/* Transparante overlay voor klik-detectie bij plaatsen */}
                                {placingPin && (
                                    <div style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 15 }}
                                        onClick={e => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x_pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                                            const y_pct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                                            setPendingPos({ x_pct, y_pct });
                                            setPlacingPin(false);
                                            setPinForm({ titel: '', beschrijving: '', categorie: 'Overig', categorieOverig: '', status: 'open', prioriteit: 'normaal', toegewezen_aan: '', deadline: '' });
                                            setCheckItems([]);
                                            setPinTab('kenmerken');
                                            setSheetMode('nieuw');
                                            setSelectedPin(null);
                                        }}
                                    />
                                )}

                            </div>
                        ) : (
                            <div style={{ position: 'relative', display: 'block', width: '100%', minHeight: '100%', cursor: placingPin ? 'crosshair' : 'default' }}
                                onClick={handleTekeningClick}
                                onTouchEnd={e => { if (placingPin && !wasPinchRef.current) { e.preventDefault(); handleTekeningClick(e); } }}>
                                <img ref={imgRef} src={activeTekening.bestand_url} alt={activeTekening.naam}
                                    onLoad={applyFitZoom}
                                    style={{ width: '100%', display: 'block', userSelect: 'none', WebkitUserSelect: 'none', borderRadius: '4px', boxShadow: '0 4px 32px rgba(0,0,0,0.6)' }} draggable={false} />

                                {/* Pins */}
                                {pinsVoorTekening.map(pin => (
                                    <TearPin key={pin.id} pin={pin}
                                        onClick={e => { e.stopPropagation(); if (!placingPin) openPinDetail(pin); }} />
                                ))}

                                {/* Pending pin */}
                                {pendingPos && sheetMode === 'nieuw' && <PendingPin pos={pendingPos} />}
                            </div>
                        )}
                        </div>
                        )}

                        {/* Frame-overlay — altijd bovenop, nooit klikbaar */}
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
                            boxShadow: 'inset 0 0 0 10px #0f172a, inset 0 0 0 12px rgba(255,255,255,0.06)',
                            borderRadius: 0,
                        }} />
                    </div>

                    {/* ── Tekening dropdown selector (top-left) ── */}
                    {!placingPin && (
                        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 30 }}>
                            <button onClick={() => setShowTekeningList(v => !v)}
                                style={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', padding: '8px 13px', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                                <i className="fa-solid fa-layer-group" style={{ color: '#F5850A', fontSize: '0.82rem' }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activeTekening?.naam || 'Selecteer tekening'}
                                </span>
                                {activeTekening && (
                                    <span style={{ fontSize: '0.9rem', background: '#f1f5f9', color: '#64748b', borderRadius: '999px', padding: '1px 6px', fontWeight: 700 }}>
                                        {pinsVoorTekening.length}
                                    </span>
                                )}
                                <i className="fa-solid fa-chevron-down" style={{ color: '#94a3b8', fontSize: '0.82rem', transition: 'transform 0.2s', transform: showTekeningList ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                            </button>

                            {showTekeningList && (
                                <>
                                    <div onClick={() => setShowTekeningList(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
                                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', borderRadius: '14px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', minWidth: '210px', zIndex: 31, overflow: 'hidden' }}>
                                        {tekeningen.map((t, idx) => {
                                            const tPinCount = pins.filter(p => String(p.tekening_id) === String(t.id)).length;
                                            const isActive = activeTekening?.id === t.id;
                                            return (
                                                <div key={t.id ?? idx} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f8fafc' }}>
                                                    <button onClick={() => { setActiveTekening(t); setShowTekeningList(false); }}
                                                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', border: 'none', cursor: 'pointer', background: isActive ? '#fff7ed' : '#fff', textAlign: 'left' }}>
                                                        <i className="fa-solid fa-map" style={{ color: isActive ? '#F5850A' : '#94a3b8', fontSize: '0.9rem', width: '14px' }} />
                                                        <span style={{ flex: 1, fontSize: '0.84rem', fontWeight: isActive ? 700 : 500, color: '#1e293b' }}>{t.naam}</span>
                                                        <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>{tPinCount}</span>
                                                    </button>
                                                    {isActive && (
                                                        <button onClick={() => { setShowTekeningList(false); verwijderTekening(t); }}
                                                            style={{ background: 'none', border: 'none', padding: '11px 12px', cursor: 'pointer', color: '#ef4444', fontSize: '0.92rem' }}>
                                                            <i className="fa-solid fa-trash" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <button onClick={() => { setShowTekeningList(false); setShowTekeningUpload(true); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', border: 'none', cursor: 'pointer', background: '#f8fafc' }}>
                                            <i className="fa-solid fa-plus" style={{ color: '#F5850A', fontSize: '0.9rem', width: '14px' }} />
                                            <span style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>Tekening uploaden</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Zoom reset (top-right) */}
                    {zoom.scale > fitScaleRef.current + 0.05 && (
                        <button onClick={applyFitZoom}
                            style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 30,
                                background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '10px',
                                color: '#fff', fontSize: '0.86rem', fontWeight: 700, padding: '7px 12px', cursor: 'pointer',
                                backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fa-solid fa-compress" />
                        </button>
                    )}

                    {/* PDF pagina-navigatie (bottom-center) */}
                    {activeTekening?.bestandstype === 'application/pdf' && pdfTotalPages > 1 && (
                        <div style={{ position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 25, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.65)', borderRadius: '20px', padding: '6px 14px', backdropFilter: 'blur(4px)' }}>
                            <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1}
                                style={{ background: 'none', border: 'none', color: pdfPage <= 1 ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.9rem', cursor: pdfPage <= 1 ? 'default' : 'pointer', padding: '2px 6px' }}>
                                <i className="fa-solid fa-chevron-left" />
                            </button>
                            <span style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 700, minWidth: '60px', textAlign: 'center' }}>
                                {pdfPage} / {pdfTotalPages}
                            </span>
                            <button onClick={() => setPdfPage(p => Math.min(pdfTotalPages, p + 1))} disabled={pdfPage >= pdfTotalPages}
                                style={{ background: 'none', border: 'none', color: pdfPage >= pdfTotalPages ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.9rem', cursor: pdfPage >= pdfTotalPages ? 'default' : 'pointer', padding: '2px 6px' }}>
                                <i className="fa-solid fa-chevron-right" />
                            </button>
                        </div>
                    )}

                    {/* Plaatsen modus banner */}
                    {placingPin && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, background: 'rgba(245,133,10,0.96)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(4px)' }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
                                <i className="fa-solid fa-crosshairs" style={{ marginRight: '8px' }} />Tik op de tekening om een pin te plaatsen
                            </span>
                            <button onClick={() => setPlacingPin(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: '#fff', padding: '5px 12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}>
                                Annuleer
                            </button>
                        </div>
                    )}

                    {/* FAB — pin toevoegen */}
                    {activeTekening && !sheetOpen && !placingPin && (
                        <button onClick={() => { setPlacingPin(true); setSheetMode(null); setSelectedPin(null); }}
                            style={{ position: 'absolute', bottom: '88px', right: '16px', zIndex: 30, width: '56px', height: '56px', borderRadius: '50%', background: '#F5850A', border: 'none', boxShadow: '0 4px 20px rgba(245,133,10,0.55)', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-plus" />
                        </button>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB: BEVINDINGEN
            ══════════════════════════════════════════════ */}
            {tab === 'bevindingen' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Filter + zoek */}
                    <div style={{ background: '#fff', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {[['alle', 'Alle', pins.length], ['open', 'Open', stats.open], ['in behandeling', 'Bezig', stats.bezig], ['opgelost', 'Opgelost', stats.opgelost]].map(([v, l, count]) => (
                                <button key={v} onClick={() => setBevFilter(v)} style={{
                                    padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                    background: bevFilter === v ? '#F5850A' : '#f1f5f9',
                                    color: bevFilter === v ? '#fff' : '#64748b',
                                    fontWeight: bevFilter === v ? 700 : 500, fontSize: '0.87rem',
                                }}>
                                    {l} {count > 0 && <span style={{ opacity: 0.8 }}>({count})</span>}
                                </button>
                            ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.92rem' }} />
                            <input value={bevZoek} onChange={e => setBevZoek(e.target.value)}
                                placeholder="Zoek op titel, beschrijving, naam..."
                                style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.82rem', boxSizing: 'border-box', outline: 'none' }} />
                        </div>
                    </div>

                    {/* Lijst */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
                        {gefilterdePins.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                <i className="fa-solid fa-list-check" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', opacity: 0.3 }} />
                                {bevZoek ? 'Geen resultaten' : 'Geen bevindingen'}
                            </div>
                        ) : gefilterdePins.map(pin => {
                            const si = STATUS_INFO[pin.status] || STATUS_INFO.open;
                            const tek = tekeningen.find(t => String(t.id) === String(pin.tekening_id));
                            return (
                                <div key={pin.id} onClick={() => { setTab('tekening'); setActiveTekening(tek || activeTekening); if (pin.pdf_page) setPdfPage(pin.pdf_page); setTimeout(() => openPinDetail(pin), 80); }}
                                    style={{ background: '#fff', borderRadius: '12px', padding: '11px 13px', marginBottom: '7px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: pinKleur(pin.status), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.84rem', fontWeight: 800, flexShrink: 0, border: '2px solid rgba(0,0,0,0.1)' }}>
                                        {pin.volgnummer}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.titel}</div>
                                        <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '1px' }}>
                                            {tek?.naam && <><i className="fa-solid fa-map" style={{ marginRight: '3px', fontSize: '0.9rem' }} />{tek.naam} · </>}
                                            {pin.categorie}
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.92rem', fontWeight: 700, background: si.bg, color: si.color, border: `1px solid ${si.border}`, borderRadius: '999px', padding: '1px 6px' }}>{si.label}</span>
                                            {pin.toegewezen_aan && <span style={{ fontSize: '0.92rem', color: '#64748b' }}><i className="fa-solid fa-user" style={{ marginRight: '2px', fontSize: '0.87rem' }} />{pin.toegewezen_aan}</span>}
                                        </div>
                                    </div>
                                    {pin.fotos?.length > 0 && (
                                        <div onClick={e => { e.stopPropagation(); setPreviewFoto(pin.fotos[0].url || pin.fotos[0].bestand_url); }}
                                            style={{ width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, cursor: 'zoom-in' }}>
                                            <img src={pin.fotos[0].url || pin.fotos[0].bestand_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB: DASHBOARD
            ══════════════════════════════════════════════ */}
            {tab === 'dashboard' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

                    {/* Projectinfo */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Projectinfo</div>
                        {[
                            ['fa-hard-hat', 'Project', project.naam],
                            project.adres && ['fa-location-dot', 'Adres', project.adres],
                            project.opdrachtgever && ['fa-building', 'Opdrachtgever', project.opdrachtgever],
                            project.startdatum && ['fa-calendar', 'Startdatum', new Date(project.startdatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })],
                        ].filter(Boolean).map(([ic, label, val]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                                <i className={`fa-solid ${ic}`} style={{ color: '#F5850A', fontSize: '0.8rem', marginTop: '2px', width: '14px', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>{val}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Status overzicht */}
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Status pins</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                            {[
                                ['Open', stats.open, '#ef4444', '#fef2f2'],
                                ['Bezig', stats.bezig, '#f59e0b', '#fffbeb'],
                                ['Opgelost', stats.opgelost, '#22c55e', '#f0fdf4'],
                            ].map(([label, count, color, bg]) => (
                                <div key={label} style={{ background: bg, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
                                    <div style={{ fontSize: '0.84rem', color, fontWeight: 600, marginTop: '2px' }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Voortgangsbalk */}
                        {stats.totaal > 0 && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.86rem', color: '#94a3b8' }}>Voortgang</span>
                                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#22c55e' }}>{Math.round((stats.opgelost / stats.totaal) * 100)}%</span>
                                </div>
                                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(stats.opgelost / stats.totaal) * 100}%`, background: '#22c55e', borderRadius: '4px', transition: 'width 0.5s' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Per tekening */}
                    {tekeningen.length > 0 && (
                        <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Pins per tekening</div>
                            {tekeningen.map(t => {
                                const tPins = pins.filter(p => String(p.tekening_id) === String(t.id));
                                const tOpen = tPins.filter(p => p.status === 'open').length;
                                const tOpl = tPins.filter(p => p.status === 'opgelost').length;
                                return (
                                    <div key={t.id} onClick={() => { setTab('tekening'); setActiveTekening(t); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-map" style={{ color: '#F5850A', fontSize: '0.8rem', width: '14px' }} />
                                        <span style={{ flex: 1, fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>{t.naam}</span>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {tOpen > 0 && <span style={{ fontSize: '0.92rem', fontWeight: 700, background: '#fef2f2', color: '#ef4444', borderRadius: '999px', padding: '1px 7px' }}>{tOpen} open</span>}
                                            {tOpl > 0 && <span style={{ fontSize: '0.92rem', fontWeight: 700, background: '#f0fdf4', color: '#22c55e', borderRadius: '999px', padding: '1px 7px' }}>{tOpl} klaar</span>}
                                            {tPins.length === 0 && <span style={{ fontSize: '0.92rem', color: '#94a3b8' }}>geen pins</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                BOTTOM SHEET
            ══════════════════════════════════════════════ */}
            {sheetOpen && (
                <>
                    <div onClick={sluitSheet} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)' }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 110, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 32px rgba(0,0,0,0.2)' }}>

                        {/* Handle */}
                        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ width: '36px', height: '4px', background: '#e2e8f0', borderRadius: '2px' }} />
                        </div>

                        {/* Sheet header */}
                        <div style={{ padding: '4px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {selectedPin && (
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: pinKleur(selectedPin.status), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                                        {selectedPin.volgnummer}
                                    </div>
                                )}
                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                                    {sheetMode === 'nieuw' ? 'Nieuwe bevinding' : sheetMode === 'edit' ? 'Bewerken' : (selectedPin?.titel || 'Bevinding')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {sheetMode === 'view' && selectedPin && <>
                                    <button onClick={() => setSheetMode('edit')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-pen" />
                                    </button>
                                    <button onClick={verwijderPin} style={{ background: '#fef2f2', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </>}
                                <button onClick={sluitSheet} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1rem', cursor: 'pointer', padding: '4px 6px' }}>
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                        </div>

                        {/* Pin tabs (view/edit mode) */}
                        {(sheetMode === 'view' || sheetMode === 'edit') && (
                            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                {[['kenmerken', 'Kenmerken'], ['checklist', `Checklist${checkItems.length > 0 ? ` (${checkItems.filter(i => i.gedaan).length}/${checkItems.length})` : ''}`], ['fotos', `Foto's${selectedPin?.fotos?.length > 0 ? ` (${selectedPin.fotos.length})` : ''}`]].map(([t, l]) => (
                                    <button key={t} onClick={() => setPinTab(t)} style={{
                                        flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: '0.87rem',
                                        background: 'transparent',
                                        color: pinTab === t ? '#F5850A' : '#94a3b8',
                                        fontWeight: pinTab === t ? 700 : 500,
                                        borderBottom: pinTab === t ? '2px solid #F5850A' : '2px solid transparent',
                                    }}>{l}</button>
                                ))}
                            </div>
                        )}

                        {/* Sheet body */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px 24px' }}>

                            {/* ── VIEW: Kenmerken ── */}
                            {sheetMode === 'view' && pinTab === 'kenmerken' && selectedPin && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Status knoppen */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {Object.entries(STATUS_INFO).map(([val, si]) => (
                                            <button key={val} onClick={() => setStatusDirect(val)} style={{
                                                flex: 1, padding: '7px 4px', borderRadius: '8px',
                                                border: `2px solid ${selectedPin.status === val ? si.color : '#e2e8f0'}`,
                                                background: selectedPin.status === val ? si.bg : '#fff',
                                                color: selectedPin.status === val ? si.color : '#94a3b8',
                                                fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                                            }}>{si.label}</button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                                        {[
                                            ['Categorie', selectedPin.categorie],
                                            selectedPin.toegewezen_aan && ['Toegewezen aan', selectedPin.toegewezen_aan],
                                        ].filter(Boolean).map(([label, val]) => (
                                            <div key={label} style={{ background: '#f8fafc', borderRadius: '9px', padding: '9px 10px' }}>
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px' }}>
                                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>Opmerkingen</div>
                                        <textarea
                                            value={pinForm.beschrijving}
                                            onChange={e => setPinForm(f => ({ ...f, beschrijving: e.target.value }))}
                                            onBlur={() => {
                                                if (!selectedPin) return;
                                                fetch(`/api/bouwinspectie/pins/${selectedPin.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ ...pinForm, beschrijving: pinForm.beschrijving, categorie: effectiefCategorie(), checklist: checkItems }),
                                                }).then(r => r.json()).then(upd => {
                                                    const updated = { ...selectedPin, beschrijving: pinForm.beschrijving };
                                                    setPins(prev => prev.map(p => p.id === selectedPin.id ? updated : p));
                                                    setSelectedPin(updated);
                                                }).catch(() => {});
                                            }}
                                            placeholder="Voeg opmerkingen toe..."
                                            rows={3}
                                            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1rem', color: '#334155', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', padding: 0 }}
                                        />
                                    </div>

                                    {selectedPin.gemaakt_door && (
                                        <div style={{ fontSize: '0.84rem', color: '#94a3b8', textAlign: 'center', paddingTop: '4px' }}>
                                            Aangemaakt door {selectedPin.gemaakt_door}
                                            {selectedPin.gemaakt_op && ` · ${new Date(selectedPin.gemaakt_op).toLocaleDateString('nl-NL')}`}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── VIEW: Checklist ── */}
                            {sheetMode === 'view' && pinTab === 'checklist' && (
                                <div>
                                    {checkItems.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                                            <i className="fa-solid fa-list-check" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', opacity: 0.3 }} />
                                            <div style={{ fontSize: '0.82rem' }}>Geen checklistitems</div>
                                            <button onClick={() => setSheetMode('edit')} style={{ marginTop: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 14px', color: '#475569', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer' }}>
                                                <i className="fa-solid fa-pen" style={{ marginRight: '5px' }} />Items toevoegen
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ marginBottom: '8px', fontSize: '0.87rem', color: '#94a3b8', fontWeight: 600 }}>
                                                {checkItems.filter(i => i.gedaan).length} / {checkItems.length} afgerond
                                            </div>
                                            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                                                <div style={{ height: '100%', width: `${checkItems.length > 0 ? (checkItems.filter(i => i.gedaan).length / checkItems.length) * 100 : 0}%`, background: '#22c55e', transition: 'width 0.3s' }} />
                                            </div>
                                            {checkItems.map((item, idx) => (
                                                <div key={item.id || idx} onClick={() => {
                                                    const upd = checkItems.map((it, i) => i === idx ? { ...it, gedaan: !it.gedaan } : it);
                                                    setCheckItems(upd);
                                                    // Auto-save checklist
                                                    fetch(`/api/bouwinspectie/pins/${selectedPin.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pinForm, checklist: upd }) }).catch(() => {});
                                                    setPins(prev => prev.map(p => p.id === selectedPin.id ? { ...p, checklist: upd } : p));
                                                }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}>
                                                    <div style={{ width: 22, height: 22, borderRadius: '6px', border: `2px solid ${item.gedaan ? '#22c55e' : '#e2e8f0'}`, background: item.gedaan ? '#22c55e' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {item.gedaan && <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '0.9rem' }} />}
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', color: item.gedaan ? '#94a3b8' : '#1e293b', textDecoration: item.gedaan ? 'line-through' : 'none' }}>{item.tekst}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── VIEW: Foto's ── */}
                            {sheetMode === 'view' && pinTab === 'fotos' && (
                                <div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {(selectedPin?.fotos || []).map(f => (
                                            <div key={f.id} style={{ position: 'relative', width: '90px', height: '90px' }}>
                                                <img src={f.url || f.bestand_url} alt="" onClick={() => setPreviewFoto(f.url || f.bestand_url)}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer' }} />
                                                <button onClick={() => verwijderFoto(f.id)}
                                                    style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#fff', fontSize: '0.87rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            </div>
                                        ))}
                                        <label style={{ width: '90px', height: '90px', borderRadius: '10px', border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', gap: '5px' }}>
                                            {uploading ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.1rem' }} /> : <>
                                                <i className="fa-solid fa-camera" style={{ fontSize: '1.1rem' }} />
                                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Foto toevoegen</span>
                                            </>}
                                            <input ref={fotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                                onChange={e => { if (e.target.files[0]) uploadFoto(e.target.files[0]); e.target.value = ''; }} />
                                        </label>
                                    </div>
                                    {(selectedPin?.fotos?.length || 0) === 0 && !uploading && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.82rem' }}>
                                            Nog geen foto's — klik op de camera knop
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── EDIT / NIEUW: Kenmerken ── */}
                            {(sheetMode === 'edit' || sheetMode === 'nieuw') && pinTab === 'kenmerken' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Titel *</label>
                                        <input value={pinForm.titel} onChange={e => setPinForm(f => ({ ...f, titel: e.target.value }))}
                                            placeholder="bijv. Scheur in dragende muur"
                                            autoFocus={sheetMode === 'nieuw'}
                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Opmerkingen</label>
                                        <textarea value={pinForm.beschrijving} onChange={e => setPinForm(f => ({ ...f, beschrijving: e.target.value }))}
                                            rows={2} placeholder="Voeg opmerkingen toe..."
                                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Categorie</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                                            {CATEGORIEEN.map(c => (
                                                <button key={c} onClick={() => setPinForm(f => ({ ...f, categorie: c === 'Overig' ? 'Overig' : c }))} style={{
                                                    padding: '5px 10px', borderRadius: '8px', border: `1.5px solid ${(c === 'Overig' ? pinForm.categorie === 'Overig' || !CATEGORIEEN.slice(0,-1).includes(pinForm.categorie) : pinForm.categorie === c) ? '#F5850A' : '#e2e8f0'}`,
                                                    background: (c === 'Overig' ? pinForm.categorie === 'Overig' || !CATEGORIEEN.slice(0,-1).includes(pinForm.categorie) : pinForm.categorie === c) ? '#fff7ed' : '#fff',
                                                    color: (c === 'Overig' ? pinForm.categorie === 'Overig' || !CATEGORIEEN.slice(0,-1).includes(pinForm.categorie) : pinForm.categorie === c) ? '#F5850A' : '#64748b',
                                                    fontWeight: (c === 'Overig' ? pinForm.categorie === 'Overig' || !CATEGORIEEN.slice(0,-1).includes(pinForm.categorie) : pinForm.categorie === c) ? 700 : 500, fontSize: '0.87rem', cursor: 'pointer',
                                                }}>{c}</button>
                                            ))}
                                            {pinForm.categorie === 'Overig' && (
                                                <input value={pinForm.categorieOverig || ''} onChange={e => setPinForm(f => ({ ...f, categorieOverig: e.target.value }))}
                                                    placeholder="Omschrijven..."
                                                    style={{ flex: 1, minWidth: '80px', padding: '5px 9px', border: '1.5px solid #F5850A', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }} />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Status</label>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {Object.entries(STATUS_INFO).map(([val, si]) => (
                                                <button key={val} onClick={() => setPinForm(f => ({ ...f, status: val }))} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', border: `2px solid ${pinForm.status === val ? si.color : '#e2e8f0'}`, background: pinForm.status === val ? si.bg : '#fff', color: pinForm.status === val ? si.color : '#94a3b8', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}>{si.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Toegewezen aan</label>
                                        <input value={pinForm.toegewezen_aan} onChange={e => setPinForm(f => ({ ...f, toegewezen_aan: e.target.value }))}
                                            placeholder="Naam"
                                            style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }} />
                                    </div>
                                </div>
                            )}

                            {/* ── EDIT / NIEUW: Checklist ── */}
                            {(sheetMode === 'edit' || sheetMode === 'nieuw') && pinTab === 'checklist' && (
                                <div>
                                    {checkItems.map((item, idx) => (
                                        <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '5px', border: '2px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.84rem', color: '#1e293b' }}>{item.tekst}</span>
                                            <button onClick={() => verwijderCheckItem(idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 4px', fontSize: '0.9rem' }}>
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        <input value={nieuwCheckItem} onChange={e => setNieuwCheckItem(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && voegCheckItemToe()}
                                            placeholder="Nieuw checkpunt..."
                                            style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', outline: 'none' }} />
                                        <button onClick={voegCheckItemToe} style={{ background: '#F5850A', border: 'none', borderRadius: '10px', padding: '0 14px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>+</button>
                                    </div>
                                </div>
                            )}

                            {/* ── Opslaan knop (edit/nieuw) ── */}
                            {(sheetMode === 'edit' || sheetMode === 'nieuw') && (
                                <div style={{ display: 'flex', gap: '10px', paddingTop: '16px' }}>
                                    <button onClick={() => { if (sheetMode === 'edit') setSheetMode('view'); else sluitSheet(); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                                        Annuleren
                                    </button>
                                    <button onClick={sheetMode === 'nieuw' ? slaaPinOp : updatePin}
                                        disabled={!pinForm.titel.trim() || saving}
                                        style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: pinForm.titel.trim() ? '#F5850A' : '#e2e8f0', color: pinForm.titel.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '0.88rem', cursor: pinForm.titel.trim() ? 'pointer' : 'default' }}>
                                        {saving ? <i className="fa-solid fa-spinner fa-spin" /> : (sheetMode === 'nieuw' ? 'Pin opslaan' : 'Opslaan')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Foto preview */}
            {previewFoto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setPreviewFoto(null)}>
                    <img src={previewFoto} alt="" style={{ maxWidth: '95vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: '4px' }} onClick={e => e.stopPropagation()} />
                    {/* Terug knop */}
                    <button onClick={() => setPreviewFoto(null)} style={{ position: 'absolute', top: '16px', left: '16px', background: '#F5850A', border: 'none', borderRadius: '12px', padding: '10px 18px', color: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(245,133,10,0.5)' }}>
                        <i className="fa-solid fa-arrow-left" />Terug
                    </button>
                    {/* Sluiten */}
                    <button onClick={() => setPreviewFoto(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
            )}

            {/* Tekening upload modal */}
            {showTekeningUpload && (
                <>
                    <div onClick={() => { setShowTekeningUpload(false); setTekeningFile(null); setTekeningNaam(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} />
                    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', zIndex: 310 }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 18px' }} />
                        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                            <i className="fa-solid fa-map" style={{ color: '#F5850A', marginRight: '8px' }} />Tekening uploaden
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Naam *</label>
                                <input value={tekeningNaam} onChange={e => setTekeningNaam(e.target.value)} placeholder="bijv. Begane grond"
                                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            {tekeningFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: '2px solid #F5850A', borderRadius: '12px', background: '#fff7ed' }}>
                                    <i className="fa-solid fa-file-check" style={{ color: '#F5850A', fontSize: '1.2rem', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', color: '#F5850A', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tekeningFile.name}</div>
                                        <div style={{ fontSize: '0.86rem', color: '#94a3b8' }}>{(tekeningFile.size / 1024 / 1024).toFixed(1)} MB</div>
                                    </div>
                                    <button onClick={() => setTekeningFile(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 10px', border: '2px dashed #e2e8f0', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', textAlign: 'center' }}>
                                        <i className="fa-solid fa-upload" style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                                        <span style={{ fontSize: '0.92rem', color: '#475569', fontWeight: 600 }}>Bestand kiezen</span>
                                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>JPG, PNG, PDF</span>
                                        <input ref={tekeningRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                                            onChange={e => { if (e.target.files[0]) { setTekeningFile(e.target.files[0]); if (!tekeningNaam) setTekeningNaam(e.target.files[0].name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')); } }} />
                                    </label>
                                    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 10px', border: '2px dashed #e2e8f0', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', textAlign: 'center' }}>
                                        <i className="fa-solid fa-camera" style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                                        <span style={{ fontSize: '0.92rem', color: '#475569', fontWeight: 600 }}>Foto maken</span>
                                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Camera</span>
                                        <input ref={tekeningCamRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                            onChange={e => { if (e.target.files[0]) { setTekeningFile(e.target.files[0]); if (!tekeningNaam) setTekeningNaam('Foto ' + new Date().toLocaleDateString('nl-NL')); } }} />
                                    </label>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                            <button onClick={() => { setShowTekeningUpload(false); setTekeningFile(null); setTekeningNaam(''); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Annuleren</button>
                            <button onClick={uploadTekening} disabled={!tekeningFile || !tekeningNaam.trim() || uploadingTekening}
                                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: (tekeningFile && tekeningNaam.trim()) ? '#F5850A' : '#e2e8f0', color: (tekeningFile && tekeningNaam.trim()) ? '#fff' : '#94a3b8', fontWeight: 700, cursor: (tekeningFile && tekeningNaam.trim()) ? 'pointer' : 'default' }}>
                                {uploadingTekening ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />Uploaden…</> : 'Uploaden'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes pinpulse {
                    0%, 100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, -100%) scale(1.15); opacity: 0.85; }
                }
            `}</style>
        </div>
    );
}
